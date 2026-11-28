"""Pull 90 days of Search Console data for tools.devcipator.com (read-only) and write a summary.

Usage: python gsc_pull.py <out_dir>
Writes <out_dir>/gsc-queries.json (raw query/page rows) and <out_dir>/gsc-summary.md
(totals, ranking opportunities and per-tool-page groupings for the SEO automation).
Key: ~/.config/gsc/gsc-key.json, a service account with access to the
https://tools.devcipator.com/ property. If that property returns no rows, the
sc-domain:devcipator.com property is queried instead, filtered to this host.
"""
import collections
import json
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import quote

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

KEY = Path.home() / ".config/gsc/gsc-key.json"
HOST = "https://tools.devcipator.com"
PROPERTIES = [
    ("https://tools.devcipator.com/", None),
    ("sc-domain:devcipator.com", {"dimension": "page", "operator": "contains", "expression": "://tools.devcipator.com"}),
]
API = "https://searchconsole.googleapis.com/webmasters/v3"
BRAND_TERMS = ("devcipator", "developator", "devcypator")

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
creds = service_account.Credentials.from_service_account_file(
    str(KEY), scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
)
session = AuthorizedSession(creds)

end = date.today() - timedelta(days=2)  # Search Console data lags ~2 days
start = end - timedelta(days=89)


def fetch(site, page_filter):
    rows, offset = [], 0
    while True:
        body = {"startDate": str(start), "endDate": str(end), "dimensions": ["query", "page"],
                "rowLimit": 25000, "startRow": offset}
        if page_filter:
            body["dimensionFilterGroups"] = [{"filters": [page_filter]}]
        resp = session.post(f"{API}/sites/{quote(site, safe='')}/searchAnalytics/query", json=body, timeout=60)
        resp.raise_for_status()
        batch = resp.json().get("rows", [])
        rows += batch
        if len(batch) < 25000:
            return rows
        offset += 25000


site, rows = None, []
for site, page_filter in PROPERTIES:
    rows = fetch(site, page_filter)
    if rows:
        break
    print(f"GSC: no rows from {site}", file=sys.stderr)
(out / "gsc-queries.json").write_text(json.dumps({"site": site, "start": str(start), "end": str(end), "rows": rows}, indent=1))


def path_of(page):
    p = page.replace(HOST, "").split("#")[0].split("?")[0]
    return p.rstrip("/") or "/"


agg = collections.defaultdict(lambda: {"clicks": 0, "impr": 0, "pos_w": 0.0, "pages": collections.Counter()})
page_tot = collections.defaultdict(lambda: {"clicks": 0, "impr": 0, "pos_w": 0.0, "queries": 0})
for r in rows:
    query, page = r["keys"]
    p = path_of(page)
    a = agg[query]
    a["clicks"] += r["clicks"]
    a["impr"] += r["impressions"]
    a["pos_w"] += r["position"] * r["impressions"]
    a["pages"][p] += r["impressions"]
    t = page_tot[p]
    t["clicks"] += r["clicks"]
    t["impr"] += r["impressions"]
    t["pos_w"] += r["position"] * r["impressions"]
    t["queries"] += 1

queries = []
for q, a in agg.items():
    queries.append({
        "query": q, "clicks": a["clicks"], "impressions": a["impr"],
        "ctr": a["clicks"] / a["impr"] if a["impr"] else 0, "position": a["pos_w"] / a["impr"],
        "page": a["pages"].most_common(1)[0][0],
        "brand": any(t in q.lower() for t in BRAND_TERMS),
    })


def table(items):
    lines = ["| Query | Clicks | Impr. | CTR | Pos. | Page |", "|---|---|---|---|---|---|"]
    lines += [f"| {x['query']} | {x['clicks']} | {x['impressions']} | {x['ctr']:.1%} | {x['position']:.1f} | `{x['page']}` |" for x in items]
    return "\n".join(lines)


nonbrand = [x for x in queries if not x["brand"]]
striking = sorted([x for x in nonbrand if 4 <= x["position"] <= 20], key=lambda x: -x["impressions"])
# Seen often but rarely clicked: the title/description isn't winning the click for that intent.
low_ctr = sorted([x for x in nonbrand if x["position"] <= 10 and x["impressions"] >= 20 and x["ctr"] < 0.02],
                 key=lambda x: -x["impressions"])
beyond20 = sorted([x for x in nonbrand if x["position"] > 20 and x["impressions"] >= 10], key=lambda x: -x["impressions"])

# Per-page opportunity: impressions from non-brand queries in positions 4-20 plus low-CTR queries.
by_page = collections.defaultdict(list)
for x in {id(x): x for x in striking + low_ctr + beyond20}.values():
    by_page[x["page"]].append(x)
page_rank = sorted(by_page.items(), key=lambda kv: -sum(x["impressions"] for x in kv[1] if x["position"] <= 20))

md = [
    f"# Search Console: tools.devcipator.com, {start} to {end}",
    f"Property: `{site}`. {len(queries)} queries, {sum(x['clicks'] for x in queries)} clicks, "
    f"{sum(x['impressions'] for x in queries)} impressions. Position is impression-weighted; each query is "
    "attributed to the page with most of its impressions. Brand queries are excluded from the opportunity lists.",
    "\n## Page totals (by impressions)",
    "| Page | Clicks | Impr. | CTR | Avg pos. | Queries |", "|---|---|---|---|---|---|",
]
md += [f"| `{p}` | {t['clicks']} | {t['impr']} | {t['clicks'] / t['impr']:.1%} | {t['pos_w'] / t['impr']:.1f} | {t['queries']} |"
       for p, t in sorted(page_tot.items(), key=lambda kv: -kv[1]["impr"])[:40] if t["impr"]]
md += [
    "\n## Opportunities: positions 4-20 (non-brand), by impressions", table(striking[:40]) if striking else "None.",
    "\n## High impressions, low CTR (top 10, CTR < 2%, >= 20 impr.): fix title/description", table(low_ctr[:20]) if low_ctr else "None.",
    "\n## Beyond position 20 (>= 10 impr.): content gaps on the page or a missing page", table(beyond20[:25]) if beyond20 else "None.",
    "\n## Opportunity queries grouped by ranking page (best candidates first)",
]
for page, items in page_rank:
    items.sort(key=lambda x: -x["impressions"])
    md.append(f"- `{page}`: " + "; ".join(f"\"{x['query']}\" (pos {x['position']:.1f}, {x['impressions']} impr, {x['ctr']:.0%} CTR)" for x in items[:12]))
md += ["\n## Top 25 queries overall (incl. brand)", table(sorted(queries, key=lambda x: -x["impressions"])[:25])]
(out / "gsc-summary.md").write_text("\n".join(md) + "\n")
print(f"GSC ({site}): {len(rows)} rows, {len(queries)} queries, {len(striking)} in positions 4-20, "
      f"{len(low_ctr)} low-CTR -> {out / 'gsc-summary.md'}")

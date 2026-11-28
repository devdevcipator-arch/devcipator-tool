"""Local SEO audit of the prerendered pages in .next/server/app (run after `npm run build`).

Usage: python check_pages.py <repo_dir> <out.json> [--baseline <earlier out.json>]
Checks every prerendered page for: rendered <title> 15-60 chars, meta description 70-160
chars, exactly one <h1>, parseable JSON-LD, FAQPage schema on /tools/ pages, duplicate
titles/descriptions, and internal links that point to no prerendered page.
Writes <out.json> and a readable <out>.md next to it.
With --baseline, exits 1 if any violation is new compared with the baseline, so a change
can never make the site's metadata, schema or internal links worse.
"""
import collections
import html
import json
import re
import sys
from pathlib import Path

repo, out = Path(sys.argv[1]), Path(sys.argv[2])
baseline = Path(sys.argv[sys.argv.index("--baseline") + 1]) if "--baseline" in sys.argv else None
app = repo / ".next/server/app"
if not app.is_dir():
    sys.exit(f"{app} not found; run npm run build first")

SKIP = {"/_not-found", "/_global-error", "/index"}
pages = {}
for f in sorted(app.rglob("*.html")):
    rel = f.relative_to(app).with_suffix("").as_posix()
    if "[" in rel:  # fallback shells of dynamic routes
        continue
    route = "/" if rel == "index" else "/" + rel
    if route not in SKIP:
        pages[route] = f.read_text(errors="replace")

public_files = {"/" + p.relative_to(repo / "public").as_posix() for p in (repo / "public").rglob("*") if p.is_file()}
EXTRA_ROUTES = {"/sitemap.xml", "/robots.txt", "/llms.txt", "/manifest.webmanifest", "/opengraph-image", "/icon.png", "/apple-icon.png", "/favicon.ico"}

report, violations = {}, []


def v(page, rule, detail):
    violations.append({"page": page, "rule": rule, "detail": detail})


def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


for route, doc in pages.items():
    head_end = doc.find("</head>")
    head = doc[:head_end] if head_end > 0 else doc
    title_m = re.search(r"<title>(.*?)</title>", head, re.S)
    title = text(title_m.group(1)) if title_m else ""
    desc_m = re.search(r'<meta name="description" content="([^"]*)"', doc)
    desc = html.unescape(desc_m.group(1)) if desc_m else ""
    h1s = [text(h) for h in re.findall(r"<h1[^>]*>(.*?)</h1>", doc, re.S)]
    schema_types, faq_questions = [], 0
    for block in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', doc, re.S):
        try:
            data = json.loads(html.unescape(block) if "&quot;" in block else block)
        except json.JSONDecodeError as e:
            v(route, "jsonld_invalid", str(e)[:120])
            continue
        nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
        for n in nodes:
            t = n.get("@type")
            schema_types.append(t if isinstance(t, str) else ",".join(t or []))
            if t == "FAQPage":
                faq_questions = len(n.get("mainEntity", []))
    links = sorted({h.split("#")[0].split("?")[0].rstrip("/") or "/"
                    for h in re.findall(r'<a [^>]*href="(/[^"]*)"', doc)})
    report[route] = {"title": title, "title_len": len(title), "description": desc, "description_len": len(desc),
                     "h1": h1s, "schema": schema_types, "faq_questions": faq_questions, "internal_links": links}

    if not 15 <= len(title) <= 60:
        v(route, "title_length", f"{len(title)} chars: {title}")
    if not 70 <= len(desc) <= 160:
        v(route, "description_length", f"{len(desc)} chars: {desc}")
    if len(h1s) != 1:
        v(route, "h1_count", f"{len(h1s)} h1 elements")
    if route.startswith("/tools/") and not faq_questions:
        v(route, "missing_faq_schema", "no FAQPage JSON-LD")
    for link in links:
        if link.startswith(("/_next", "/vendor")) or link in pages or link in public_files or link in EXTRA_ROUTES:
            continue
        v(route, f"broken_link:{link}", f"links to {link}, which is not a prerendered page")

for field in ("title", "description"):
    seen = collections.defaultdict(list)
    for route, r in report.items():
        if r[field]:
            seen[r[field]].append(route)
    for value, routes in seen.items():
        if len(routes) > 1:
            for route in routes:
                v(route, f"duplicate_{field}", f"same {field} as {', '.join(x for x in routes if x != route)}")

inbound = collections.Counter(link for route, r in report.items() for link in r["internal_links"] if link != route)
for route, r in report.items():
    r["inbound_links"] = inbound[route]

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({"pages": report, "violations": violations}, indent=1, ensure_ascii=False))

md = [f"# Local SEO audit ({len(pages)} prerendered pages)", "",
      f"{len(violations)} violation(s). Title is the rendered <title> incl. the \" | Devcipator Tools\" suffix.", ""]
by_rule = collections.defaultdict(list)
for x in violations:
    by_rule[x["rule"].split(":")[0]].append(x)
for rule, items in sorted(by_rule.items()):
    md.append(f"## {rule} ({len(items)})")
    md += [f"- `{x['page']}`: {x['detail']}" for x in items]
    md.append("")
md += ["## Tool pages", "| Page | Title len | Desc len | FAQs | Inbound links | Title |", "|---|---|---|---|---|---|"]
md += [f"| `{p}` | {r['title_len']} | {r['description_len']} | {r['faq_questions']} | {r['inbound_links']} | {r['title']} |"
       for p, r in report.items() if p.startswith("/tools/")]
out.with_suffix(".md").write_text("\n".join(md) + "\n")
print(f"Audit: {len(pages)} pages, {len(violations)} violation(s) -> {out.with_suffix('.md')}")

if baseline:
    before = {(x["page"], x["rule"]) for x in json.loads(baseline.read_text())["violations"]}
    new = [x for x in violations if (x["page"], x["rule"]) not in before]
    for x in new:
        print(f"NEW: {x['page']} {x['rule']}: {x['detail']}")
    if new:
        sys.exit(1)
    print("No new violations compared with the baseline.")

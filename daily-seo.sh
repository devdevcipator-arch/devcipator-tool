#!/bin/bash
# =======================================================================
# Devcipator Tools SEO routine (tools.devcipator.com only; every 4 days)
#
#   1. Pulls 90 days of Search Console data (~/.config/gsc/gsc-key.json) for
#      https://tools.devcipator.com/ into seo-reports/YYYY-MM-DD/ (git-ignored).
#   2. Crawls the live site with BeyondSEO (~/tools/beyondseo) if it is installed,
#      and builds the site to audit every prerendered page locally
#      (titles, descriptions, H1s, JSON-LD, FAQ schema, internal links).
#   3. Has Claude Code optimise up to 5 tool pages for real search queries
#      (titles, meta descriptions, how-to/features/FAQ copy, internal links)
#      on a new branch seo/tools-YYYY-MM-DD.
#   4. Commits only if: Claude touched nothing outside src/config/, src/app/ and
#      src/lib/seo.ts; `npm run build` passes; and the post-build audit has no new
#      violations. Otherwise the changes are discarded and saved as a patch.
#      The branch is never pushed or merged. Always returns to the starting branch.
#
# Usage: ./daily-seo.sh               full run
#        ./daily-seo.sh --audit-only  Search Console + crawl + local audit, no changes
#        ./daily-seo.sh --scheduled   what launchd runs daily: exits unless the last
#                                     completed run was RUN_EVERY_DAYS (4)+ days ago
# =======================================================================
set -euo pipefail

SITE_URL="https://tools.devcipator.com"
BASE_BRANCH="main"
BRANCH_PREFIX="seo/tools"
MAX_PAGES=5
BEYONDSEO_DIR="$HOME/tools/beyondseo"
UV="$HOME/.local/bin/uv"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || echo "$HOME/.npm-global/bin/claude")}"
# launchd runs with a minimal PATH; make node/npm/claude/uv resolvable.
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
# Changes Claude may make. Everything else (tool components, workers, hooks, lib) is off limits,
# so the client-side tools themselves can't break.
ALLOWED_PATHS_RE='^(src/config/|src/app/|src/lib/seo\.ts$)'

AUDIT_ONLY=false
SCHEDULED=false
RUN_EVERY_DAYS=4
for arg in "$@"; do
  case "$arg" in
    --audit-only) AUDIT_ONLY=true ;;
    --scheduled) SCHEDULED=true ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# launchd fires this daily (and on wake if the Mac slept through 11:00); keep the
# every-4-days rhythm. Only completed runs count (.complete), so a failed run is
# retried at the next daily check.
if $SCHEDULED; then
  LAST_RUN="$(ls -d seo-reports/20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | while read -r d; do [[ -f "$d/.complete" ]] && basename "$d"; done | sort | tail -1 || true)"
  if [[ -n "$LAST_RUN" ]]; then
    DAYS_SINCE=$(( ( $(date -j -f %F "$(date +%F)" +%s) - $(date -j -f %F "$LAST_RUN" +%s) ) / 86400 ))
    if (( DAYS_SINCE < RUN_EVERY_DAYS )); then
      echo "[$(date '+%F %T')] Scheduled check: last run $LAST_RUN ($DAYS_SINCE day(s) ago), next due after $RUN_EVERY_DAYS days; skipping."
      exit 0
    fi
  fi
fi

DATE="$(date +%F)"
RUN_DIR="$REPO_DIR/seo-reports/$DATE"
CRAWL_DIR="$RUN_DIR/crawl"
BRANCH="$BRANCH_PREFIX-$DATE"
PAGES_LOG="$REPO_DIR/seo-reports/pages-log.tsv"
mkdir -p "$RUN_DIR"
LOG="$RUN_DIR/run.log"
exec > >(tee -a "$LOG") 2>&1

log() { echo "[$(date +%H:%M:%S)] $*"; }
die() { log "ERROR: $*"; exit 1; }
PY=("$UV" run -q --python 3.12 python -I)

log "SEO run for $SITE_URL (audit-only: $AUDIT_ONLY, scheduled: $SCHEDULED)"
# Keep the Mac from idle-sleeping until this script exits (closing the lid on battery still sleeps it).
caffeinate -i -w $$ &
CLAUDE_OK=false

# --- 1. Search Console ----------------------------------------------------
# Page work is driven by real queries, so without data there is nothing to do; fail
# (no .complete) so the scheduler retries tomorrow.
[[ -f "$HOME/.config/gsc/gsc-key.json" ]] || die "Search Console key ~/.config/gsc/gsc-key.json not found"
"$UV" run -q --python 3.12 --with google-auth --with requests \
  python -I "$REPO_DIR/scripts/seo/gsc_pull.py" "$RUN_DIR" || die "Search Console pull failed"

# --- 2. Live crawl (optional) ----------------------------------------------
CRAWL_NOTE="No BeyondSEO crawl this run (not installed or failed); rely on the local audit."
if [[ -x "$BEYONDSEO_DIR/.venv/bin/python" ]]; then
  if [[ -f "$CRAWL_DIR/report.md" ]]; then
    log "Reusing today's crawl in $CRAWL_DIR"
  else
    log "Crawling $SITE_URL with BeyondSEO"
    rm -rf "$CRAWL_DIR"
    "$BEYONDSEO_DIR/.venv/bin/python" "$BEYONDSEO_DIR/scripts/run.py" crawl "$SITE_URL" --max-pages 150 \
      --out "$CRAWL_DIR" --quiet --no-color > "$RUN_DIR/crawl-summary.json" \
      || log "WARN: crawl failed; see $RUN_DIR/crawl-summary.json"
  fi
  if [[ -s "$CRAWL_DIR/report.md" ]]; then
    CRAWL_NOTE="crawl/: BeyondSEO audit of the live site. Start with report.md and issues.csv (pages.csv and links.csv have per-page detail)."
    log "Crawl report: $CRAWL_DIR/report.md"
  fi
else
  log "BeyondSEO not installed at $BEYONDSEO_DIR; using the local audit only"
fi

audit() { "${PY[@]}" "$REPO_DIR/scripts/seo/check_pages.py" "$REPO_DIR" "$@"; }

if $AUDIT_ONLY; then
  log "Building the current checkout for the local audit"
  npm run build > "$RUN_DIR/build-baseline.log" 2>&1 || die "Build failed; see $RUN_DIR/build-baseline.log"
  audit "$RUN_DIR/audit-baseline.json"
  log "Audit-only run complete: $RUN_DIR"
  exit 0
fi

# --- 3. Branch, baseline build and audit ----------------------------------
[[ -x "$CLAUDE_BIN" ]] || die "claude CLI not found"
git diff --quiet HEAD || die "Tracked files have uncommitted changes; commit or stash them first."
git rev-parse --verify --quiet "refs/heads/$BRANCH" >/dev/null && die "Branch $BRANCH already exists."

START_BRANCH="$(git symbolic-ref --short HEAD)"
UNTRACKED_BEFORE="$(git ls-files --others --exclude-standard | sort)"
new_files() { comm -13 <(echo "$UNTRACKED_BEFORE") <(git ls-files --others --exclude-standard | sort); }
discard() {  # save Claude's changes as a patch, then drop them and the branch
  git add -N -- $(new_files) 2>/dev/null || true
  git diff > "$RUN_DIR/rejected-changes.patch"
  git reset -q
  git checkout -q -- .
  new_files | while IFS= read -r f; do [[ -n "$f" ]] && rm -f -- "$f"; done
  git checkout -q "$START_BRANCH" && git branch -q -D "$BRANCH"
}
finish() {
  local rc=$?
  git checkout -q "$START_BRANCH" 2>/dev/null || true
  if [[ $rc -eq 0 ]] && $CLAUDE_OK; then touch "$RUN_DIR/.complete"; fi
}
trap finish EXIT

git checkout -q "$BASE_BRANCH"
git pull -q --ff-only origin "$BASE_BRANCH" || log "WARN: could not update $BASE_BRANCH; using local copy"
git checkout -q -b "$BRANCH"

log "Baseline build and local audit"
npm run build > "$RUN_DIR/build-baseline.log" 2>&1 || die "Baseline build of $BASE_BRANCH failed; see $RUN_DIR/build-baseline.log"
audit "$RUN_DIR/audit-baseline.json"

RECENT="$( { [[ -f "$PAGES_LOG" ]] && tail -40 "$PAGES_LOG"; } || true)"
[[ -n "$RECENT" ]] || RECENT="(none yet)"

# --- 4. Claude ---------------------------------------------------------------
log "Running Claude Code on the Search Console and audit data"
"$CLAUDE_BIN" -p \
  --allowedTools "Read" "Grep" "Glob" "Edit" "Write" "Bash(git diff:*)" "Bash(git status:*)" "Bash(npm run build)" \
  --disallowedTools "Bash(git commit:*)" "Bash(git push:*)" "Bash(git checkout:*)" "Bash(git reset:*)" "Bash(rm:*)" "Bash(curl:*)" \
  > "$RUN_DIR/claude.md" <<PROMPT && CLAUDE_OK=true || log "WARN: Claude exited non-zero; see $RUN_DIR/claude.md"
You are doing the scheduled SEO maintenance for tools.devcipator.com: free, in-browser PDF,
image, audio and utility tools (Next.js repo, current branch $BRANCH). There is no blog or
database: all SEO content lives in this codebase. Read AGENTS.md first.

Inputs for this run, in $RUN_DIR:
- gsc-summary.md: Search Console, last 90 days (raw rows in gsc-queries.json). Each query is
  attributed to the page with most of its impressions.
- audit-baseline.md / .json: local audit of every prerendered page on this branch (rendered
  title and description lengths, H1s, JSON-LD types, FAQ count, internal and inbound links).
- $CRAWL_NOTE

Where the content lives (edit data, not components):
- src/config/tools.config.ts: one ToolConfig per tool page (/tools/<slug>). Read the
  ToolConfig interface comments: seoTitle (the <title> before " | Devcipator Tools", which the
  layout appends: at most 40 characters, so the full title is 15-60), metaDescription
  (140-160 characters), heading/intro, keywords, steps ("How to use" + HowTo schema), features,
  faqs (rendered as the FAQ section AND the FAQPage JSON-LD; the privacy/free questions are
  added by toolFaqs) and related (listed first under "Related tools").
  Conversion pages (CONVERSIONS, from ConversionSpec), "compress image to N KB" pages
  (SIZE_PAGES, from SizeSpec) and PDF size pages (PDF_SIZE_PAGES) are built by helper
  functions; to change one page's title there, add an optional override field to the spec
  rather than changing the shared template for every page.
- src/config/tool-content.ts: TOOL_DETAILS (longer copy under Features; paragraphs may contain
  [text](/tools/slug) internal links), FORMAT_INFO, SIZE_LIMITS.
- src/config/guides.ts: how-to guides under /guides (title at most 45 characters, description
  140-160, each links to its tools).
- The page template (src/app/tools/[slug]/page.tsx) already renders How-to, Features, details,
  FAQ and all JSON-LD. Do not restructure it.

Goal: grow qualified search traffic using the real queries in gsc-summary.md.
0. PAGE LIMIT: change at most $MAX_PAGES pages in total this run. Every page whose rendered
   output changes counts: pages you optimise below, audit fixes (titles, descriptions, H1s)
   and every page affected by a shared template or helper change. A related-tools or text
   link counts against the page it is added to, not the page it points to. If more pages
   need work, do the highest-impact ones and list the rest under recommendations; later
   runs will pick them up.
1. Pick at most $MAX_PAGES tool or guide pages, highest opportunity first: non-brand queries
   at positions 4-20 with the most impressions; then high-impression queries with low CTR
   (title/description not earning the click); then queries beyond position 20 that the page
   should answer but doesn't. Skip pages a recent run already changed (below) unless the data
   clearly shows they still underperform.
   Recently changed pages (date, slug):
$RECENT
   Ignore: brand queries, navigational queries for other sites (e.g. "<competitor> org"),
   and non-English queries (an English page can't target them; list notable ones as a
   recommendation instead).
2. For each picked page:
   a) seoTitle and metaDescription: lead with the main query people actually use (e.g. "mp3
      cutter" vs "audio cutter"), keep them natural and accurate, and give a reason to click
      (free, no upload, no sign-up, batch, specific formats). Respect the length limits above.
   b) On-page copy below the tool: tighten steps, features and TOOL_DETAILS so they answer the
      queries, and add 2-4 FAQs built from real related queries in the data (concise, specific
      answers). Use query phrases where they read naturally; never keyword-stuff. Add matching
      search phrases to keywords.
   c) Internal links: add genuinely related tools to related (e.g. PDF tools to each other,
      the size-specific compressor pages to their main tool and vice versa) and, where useful,
      a [text](/tools/slug) link in TOOL_DETAILS or a guide paragraph. Only link to slugs that
      exist in TOOL_PAGES or GUIDES.
3. You may also fix real issues from the audit (e.g. a rendered title over 60 characters) on
   the pages you are already changing. Fixing any other page uses up one of the $MAX_PAGES
   slots, so only do it while slots remain.
4. If you changed any tool or category copy, set SITE.updated.content in tools.config.ts to
   $DATE (it drives the sitemap lastmod); for a guide, set its updated date instead.

Hard rules:
- Never claim a feature, format, limit or behaviour the tool doesn't have: check the tool's
  implementation under src/tools/ (read only) before writing about it. No invented
  statistics, user counts, reviews or ratings.
- Only edit files under src/config/, src/app/ and src/lib/seo.ts. Do not touch src/tools/,
  src/components/, src/hooks/, src/workers/, src/lib/ (other than seo.ts), scripts/,
  next.config.ts or package files. Changes elsewhere make the whole run be discarded.
- Keep canonical URLs and slugs unchanged; never rename or remove a page.
- Run \`npm run build\` and fix anything you broke. Do not commit, push or switch branches.
- After the build passes, a script re-audits every page: any NEW violation (title outside
  15-60 rendered characters, description outside 70-160, not exactly one H1, invalid JSON-LD,
  missing FAQ schema, duplicate title/description, broken internal link) discards the run.
- Write the slugs you changed to $RUN_DIR/changed-pages.txt, one per line, prefixed with
  "tools/" or "guides/" (e.g. tools/audio-cutter). List every page that counts toward the
  limit, including audit fixes and pages affected by shared changes; at most $MAX_PAGES lines.

Finish with a short markdown summary: for each page, the target queries (with position and
impressions) and what changed (old -> new title/description, FAQs added, links added); other
audit fixes; what you checked and left alone; recommendations that need a human (e.g. new
tools or guides for query gaps, non-English demand).
PROMPT

# --- 5. Verify and commit ----------------------------------------------------
NEW_FILES="$(new_files)"
if git diff --quiet && [[ -z "$NEW_FILES" ]]; then
  log "No changes needed this run."
  git checkout -q "$START_BRANCH" && git branch -q -D "$BRANCH"
  exit 0
fi

CHANGED="$( { git diff --name-only; echo "$NEW_FILES"; } | sed '/^$/d' | sort -u)"
OUTSIDE="$(echo "$CHANGED" | grep -vE "$ALLOWED_PATHS_RE" || true)"
if [[ -n "$OUTSIDE" ]]; then
  discard
  die "Claude changed files outside the allowed paths; discarded (patch in $RUN_DIR/rejected-changes.patch):
$OUTSIDE"
fi

log "Verifying with npm run build"
if ! npm run build > "$RUN_DIR/build.log" 2>&1; then
  discard
  die "Build failed; changes discarded and saved to $RUN_DIR/rejected-changes.patch (see build.log)"
fi

log "Re-auditing prerendered pages against the baseline"
if ! audit "$RUN_DIR/audit-after.json" --baseline "$RUN_DIR/audit-baseline.json"; then
  discard
  die "Changes introduced new SEO violations (above); discarded and saved to $RUN_DIR/rejected-changes.patch"
fi

PAGES="$( { [[ -f "$RUN_DIR/changed-pages.txt" ]] && sed '/^[[:space:]]*$/d' "$RUN_DIR/changed-pages.txt"; } || true)"
PAGE_COUNT="$(echo "$PAGES" | sed '/^$/d' | wc -l | tr -d ' ')"
(( PAGE_COUNT > MAX_PAGES )) && log "WARN: Claude reports $PAGE_COUNT changed pages (limit $MAX_PAGES); review carefully"

git add -- $CHANGED
git commit -q -F - <<MSG
SEO: optimise tool pages for Search Console queries ($DATE)

Automated run against $SITE_URL. npm run build passed and the post-build
audit found no new title, description, H1, schema or link violations.
Pages: $(echo "$PAGES" | paste -sd, - | sed 's/,/, /g')
Data and Claude's summary: seo-reports/$DATE/ (local, not committed).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
[[ -n "$PAGES" ]] && echo "$PAGES" | while IFS= read -r p; do printf '%s\t%s\n' "$DATE" "$p"; done >> "$PAGES_LOG"
log "Committed to $BRANCH (not merged, not pushed). Review with: git log -p $BASE_BRANCH..$BRANCH"
log "Claude's summary: $RUN_DIR/claude.md"

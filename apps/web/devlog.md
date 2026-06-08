# DevLog — AppCrafter Web (Portfolio Hub)

## 2026-06-08
**Working on:** Initial scaffold — context.md and devlog.md created
**Decisions made:** Identified known tech debt: homepage still uses "Slate Studio" / "Tiny Tales" branding from initial scaffold.
**Left off at:** Scaffold homepage with hardcoded app grid. Standard stub pages in place (privacy, disclaimer, release-notes, admin).
**Next session:** Rebrand homepage to AppCrafter, update "Tiny Tales" card to "ZippyTales," add real deploy URLs for each app card once apps go live, improve landing page design/copy.
**Blockers:** None — app URLs are `#` placeholders until individual apps are deployed to Vercel

## 2026-06-04 (approx)
**Working on:** Initial monorepo scaffold
**Decisions made:** `vercel.json` scoped to `apps/web/` (not monorepo root) to prevent Vercel from building all apps at once. This was fixed in commit 583ec0f after build failures.
**Left off at:** Basic scaffold with placeholder homepage listing three apps.
**Next session:** N/A — focus shifted to ZippyTales MVP
**Blockers:** None

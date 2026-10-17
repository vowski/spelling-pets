# Spelling Pets

Offline spelling PWA for one Year 3 child (England). Spec and plan are kept private (they describe the child) in private/superpowers/ — not in git.

- Engine logic lives in src/engine (pure TS, no React/Dexie/window/Date.now). Test it with Vitest.
- Content (curriculum data) lives in src/content. Word ids `w-<slug>` are permanent: never rename one.
- British English everywhere. No timers, no red crosses, errorless correction.
- Never commit personal data, school documents or PDFs. The repo may be public (GitHub Pages).
- Dev machine is Windows on ARM64; use Edge (`channel: 'msedge'`) for Playwright.
- Commands: `npm test`, `npm run build`, `npm run e2e`, `npm run dev`.

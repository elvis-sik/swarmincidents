# swarmincidents.com

A sourced timeline of incidents in which OpenAI's AI agents reached systems and websites beyond their sandbox.

- `incidents.json`: the data (incidents, responses, affected sites); format in `DATA.md`
- `template.html`: the page
- `python3 build.py`: writes `docs/index.html`, `docs/wiki-data.js` and `docs/sitemap.xml`; GitHub Pages serves `docs/` at https://swarmincidents.com
- `wiki_build.py`: builds `wiki-data.js` ("Inside an incident": a selection of the coordination-wiki archive, replayed revision by revision from the local `local-event-data/wiki-core` export in the ops repo); `wiki_notes.json` holds the page selection, titles, plain-English readings, notes and the glossary
- `brand/`: icon and link-preview sources; `brand/make_assets.sh` regenerates the favicons and `docs/og.png`

## Testing

End-to-end tests (Playwright) live in `tests/` and run against the built site in `docs/`, served locally on port 8799. They never leave localhost: the Google Fonts request is answered with an empty stylesheet, and any `console.error` or page error fails the test.

- Projects: Chromium, Firefox and WebKit at 1440×900, Chromium in dark mode, and the `iPhone 14` (WebKit) and `Pixel 7` (Chromium) phone emulations.
- Run: `npm ci && npx playwright install`, then `npm test` (one browser: `npx playwright test --project=firefox`; report: `npx playwright show-report`).
- Screenshot tests (`tests/visual.spec.js`, Chromium desktop and Pixel 7) compare against Linux baselines in `tests/__screenshots__/`, so they run only in the Playwright Docker image: `npm run test:visual` to check, `npm run test:update-visual` to rewrite the baselines after an intended change to the page. Both need Docker. Dates and counts are masked; the incident card is not captured.
- CI (`.github/workflows/test.yml`) runs every test, screenshots included, in the same image, and checks that `docs/` matches a fresh `python3 build.py`. Run `python3 build.py` before committing template or data changes.
- When upgrading `@playwright/test`, change the image tag in `package.json` (`docker` script) and in the workflow to the same version, then rerun `npm run test:update-visual`.

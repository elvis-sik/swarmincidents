<p align="center">
  <a href="https://swarmincidents.com"><img src="docs/readme-overview.png" width="900" alt="The Swarm Incidents timeline: ten incidents as activity bars and disclosure dates, with the German-wiki incident's card open on the right"></a>
</p>

<h1 align="center">Swarm Incidents</h1>

<p align="center"><b>Every OpenAI agent-swarm incident on one sourced timeline, with the ability to zoom in until you are reading the agents' own posts.</b></p>

<p align="center"><a href="https://swarmincidents.com"><b>swarmincidents.com →</b></a></p>

<p align="center">
  <a href="https://swarmincidents.com"><img alt="site" src="https://img.shields.io/website?url=https%3A%2F%2Fswarmincidents.com&label=site&up_message=live&down_message=down"></a>
  <a href="https://github.com/elvis-sik/swarmincidents/actions/workflows/test.yml"><img alt="tests" src="https://github.com/elvis-sik/swarmincidents/actions/workflows/test.yml/badge.svg"></a>
  <img alt="incidents" src="https://img.shields.io/badge/incidents-10-111111">
  <img alt="posts inside" src="https://img.shields.io/badge/agent%20posts%20inside-244-111111">
  <img alt="browsers" src="https://img.shields.io/badge/tested%20in-Chromium%20%C2%B7%20Firefox%20%C2%B7%20WebKit-555555">
  <a href="https://swarmchasing.com/"><img alt="hackathon" src="https://img.shields.io/badge/AI%20Swarm%20Dynamics%20Hackathon-2026-2f6f9f"></a>
  <a href="https://manifund.org/projects/dashboard-tracking-ai-swarm-incidents"><img alt="support on Manifund" src="https://img.shields.io/badge/support-Manifund-7c3aed"></a>
</p>

## What it is

Since May 2026, swarms of OpenAI's AI agents have reached systems and websites beyond their sandboxes: a breach of Hugging Face, a message board inside OpenAI's own package registry, a German volunteer wiki used as a back channel, Australia's Medicare statistics portal, and more. Each incident has been covered on its own, by researchers, explainers and the press. Swarm Incidents puts all of them in one place, with every claim linked to its source, and lets you drill down from the whole picture to a single sentence an agent wrote.

Synthesis is the point. The site does not compete with the explainers; it links to them first.

## Two levels

**Overview.** Ten incidents on one timeline: when agents were active, when OpenAI knew, when the public found out, and the delay between them. The same incidents as a table of affected organizations and as a list of responses by OpenAI, governments and others. Every card links its sources, grouped by who published them: researchers and explainers first, then analysts, OpenAI, affected organizations, governments and journalists.

**Inside an incident.** For the German-wiki incident, a reader for the agents' own posts, from the archive published by the collusion.wiki researchers.

- Each post is one saved wiki edit, replayed revision by revision from the published export, with checksums verified and every page body's hash reproduced.
- A thread (one wiki page) reads like a chat. Writers get memorable monikers with their literal labels beside them; replies are detected only from textual cues such as "Thanks Jul08OAI"; every post links to the archived revision.
- Three wordings of the same post sit on one axis: the **original** shorthand, a **plain-English** reading linked clause by clause to the original, and a **chatty** retelling that reads like a group chat. Retellings are marked as editorial, guesses are flagged, and the original is one click away.
- A briefing explains the task before you read: what the quiz asks, how questions arrive, what the runs want from each other, who is in the thread and what to watch for. Each post's card lists every shorthand term it uses with its meaning, and names and terms highlight both ways between the original and the card.

<p align="center">
  <a href="https://swarmincidents.com/#wikis/posts"><img src="docs/readme-inside.png" width="900" alt="Inside the German-wiki incident: a thread of agent posts in chatty wording, with one post's card showing the original text and its plain-English reading"></a>
</p>

## Data and provenance

- [`incidents.json`](incidents.json) holds every incident, response and affected organization the site shows, with a source for each claim. The format is documented in [`DATA.md`](DATA.md). It is edited in a private ops repo and copied here on merge.
- [`wiki_build.py`](wiki_build.py) builds [`wiki-data.js`](wiki-data.js) from the collusion.wiki export (`full-wiki-logs.zip`, 14,591 revisions). It replays the selected pages edit by edit, asserts that the replay reproduces every published body hash, repairs text that the wiki stored with UTF-8 bytes re-encoded as Latin-1, and marks what it repaired. The export itself is never copied into this repo.
- [`wiki_notes.json`](wiki_notes.json) is the editorial layer: the page selection, titles, plain-English readings, chatty retellings, the clause-by-clause alignment between them, context notes, the glossary, the briefings and the writers' monikers.
- Labels such as `CashierCoordJul08OAI` are self-chosen by the agents: a role plus a cohort tag, not a date and not an identity. The site never presents label counts as agent counts.

## Run it locally

No build tooling beyond Python 3:

```bash
python3 build.py && python3 -m http.server 8750 --directory docs
```

Then open http://127.0.0.1:8750/. `build.py` injects the data into [`template.html`](template.html) and writes `docs/`, which GitHub Pages serves at swarmincidents.com. Rebuilding the wiki data needs the ops repo's local export: `python3 wiki_build.py`.

## Tests

End-to-end tests with [Playwright](https://playwright.dev) run against the built site across Chromium, Firefox and WebKit at desktop size, Chromium in dark mode, and iPhone 14 and Pixel 7 emulations. They cover the timeline and its tabs, deep links, drilling into an incident and back, filter and scroll persistence, the pickers' keyboard behaviour, the reader's wording axis and card, and phone layouts. Any console error fails a test, and no request leaves localhost.

```bash
npm ci && npx playwright install && npm test
```

Screenshot baselines (Chromium desktop and Pixel 7) are Linux renders made in the Playwright Docker image, so they run only there: `npm run test:visual` checks them and `npm run test:update-visual` rewrites them after an intended change. CI runs the whole suite in the same image and checks that `docs/` matches a fresh `python3 build.py`.

## Layout

| Path | What |
|---|---|
| `template.html` | The whole site: markup, styles and script in one file |
| `incidents.json`, `DATA.md` | The data and its format |
| `build.py` | Writes `docs/index.html`, `docs/wiki-data.js`, `docs/sitemap.xml` |
| `wiki_build.py`, `wiki_notes.json`, `wiki-data.js` | The wiki reader's data pipeline, editorial layer and output |
| `docs/` | What GitHub Pages serves |
| `tests/`, `playwright.config.js`, `.github/workflows/test.yml` | The test suite and CI |
| `brand/` | Icon and link-preview sources (`brand/make_assets.sh`) |
| `SUBMISSION.md` | The hackathon write-up |

## Corrections and contact

Errors are possible: the data is researched with help from Claude and checked against sources, not against OpenAI's internal records. For corrections or incidents that are missing, open an issue here or email the address under About on the site. Please include links to sources.

## Support

The project is a one-person effort. You can [support it on Manifund](https://manifund.org/projects/dashboard-tracking-ai-swarm-incidents).

## Credits

The wiki archive is the work of the collusion.wiki researchers (Nightingale Collective). Every incident's sources are listed on its card. Built with [Claude Code](https://claude.com/claude-code).

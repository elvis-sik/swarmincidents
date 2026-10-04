# swarmincidents.com

A sourced timeline of incidents in which OpenAI's AI agents reached systems and websites beyond their sandbox.

- `incidents.json`: the data (incidents, responses, affected sites); format in `DATA.md`
- `template.html`: the page
- `python3 build.py`: writes `docs/index.html`, `docs/wiki-data.js` and `docs/sitemap.xml`; GitHub Pages serves `docs/` at https://swarmincidents.com
- `wiki_build.py`: builds `wiki-data.js` (the Wiki tab: a selection of the coordination-wiki archive, replayed revision by revision from the local `local-event-data/wiki-core` export in the ops repo); `wiki_notes.json` holds the page selection, titles, plain-English readings, notes and the glossary
- `brand/`: icon and link-preview sources; `brand/make_assets.sh` regenerates the favicons and `docs/og.png`

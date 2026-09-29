# swarmincidents.com

A sourced timeline of incidents in which OpenAI's AI agents reached systems and websites beyond their sandbox.

- `incidents.json`: the data (incidents, responses, affected sites); format in `DATA.md`
- `template.html`: the page
- `python3 build.py`: writes `docs/index.html` and `docs/sitemap.xml`; GitHub Pages serves `docs/` at https://swarmincidents.com
- `brand/`: icon and link-preview sources; `brand/make_assets.sh` regenerates the favicons and `docs/og.png`

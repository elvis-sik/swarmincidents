#!/usr/bin/env python3
"""Build the agent-incident timeline: inject incidents.json into template.html, write docs/ (the GitHub Pages site)."""
import json
import shutil
from pathlib import Path
here = Path(__file__).parent
data = json.loads((here / "incidents.json").read_text(encoding="utf-8"))
updated, version = data["updated"], data["version"]
js = "const DATA = " + json.dumps(data, ensure_ascii=False) + ";"
page = (here / "template.html").read_text().replace("/*__DATA__*/", js.replace("</", "<\\/"))
page = page.replace("__UPDATED__", updated).replace("__VERSION__", version)
wiki = json.loads((here / "wiki-data.js").read_text(encoding="utf-8").split("=", 1)[1].rstrip().rstrip(";"))
page = page.replace("__WIKI_N__", str(len(wiki["posts"])))
(here / "openai-agent-swarm.html").write_text(page)
(here / "brand" / "data.js").write_text(js + "\n")  # for brand/og.html
docs = here / "docs"
docs.mkdir(exist_ok=True)
(docs / "index.html").write_text(page)
# The Wiki tab loads wiki-data.js on demand. Rebuild it with wiki_build.py when the archive selection or wiki_notes.json change.
shutil.copyfile(here / "wiki-data.js", docs / "wiki-data.js")
(docs / "sitemap.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://swarmincidents.com/</loc><lastmod>{updated}</lastmod></url>
</urlset>
""")
print(f"built openai-agent-swarm.html and docs/ ({len(page) // 1024} KB, updated {updated}, v{version})")

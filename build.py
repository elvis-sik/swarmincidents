#!/usr/bin/env python3
"""Build the agent-incident timeline: inject incidents.js into template.html, write docs/ (the GitHub Pages site)."""
import re
from pathlib import Path
here = Path(__file__).parent
data = (here / "incidents.js").read_text()
updated = re.search(r"updated: '([^']+)'", data)[1]
version = re.search(r"version: '([^']+)'", data)[1]
page = (here / "template.html").read_text().replace("/*__DATA__*/", data.replace("</", "<\\/"))
page = page.replace("__UPDATED__", updated).replace("__VERSION__", version)
(here / "openai-agent-swarm.html").write_text(page)
docs = here / "docs"
docs.mkdir(exist_ok=True)
(docs / "index.html").write_text(page)
(docs / "sitemap.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://swarmincidents.com/</loc><lastmod>{updated}</lastmod></url>
</urlset>
""")
print(f"built openai-agent-swarm.html and docs/ ({len(page) // 1024} KB, updated {updated}, v{version})")

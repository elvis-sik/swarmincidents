#!/usr/bin/env python3
"""Build the agent-incident timeline: inject incidents.js into template.html."""
from pathlib import Path
here = Path(__file__).parent
page = (here / "template.html").read_text().replace("/*__DATA__*/", (here / "incidents.js").read_text().replace("</", "<\\/"))
(here / "openai-agent-swarm.html").write_text(page)
(here / "docs").mkdir(exist_ok=True)
(here / "docs" / "index.html").write_text(page)
print(f"built openai-agent-swarm.html ({len(page) // 1024} KB)")

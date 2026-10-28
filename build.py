#!/usr/bin/env python3
"""Build the agent-incident timeline: inject incidents.json into template.html, write docs/ (the GitHub Pages site)."""
import json
import shutil
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from feed import build as build_feed
from publication import project
from catalog_metadata import catalog_additions, catalog_updates, validate_sources
from catalog_history import retired_incidents
here = Path(__file__).parent
data = json.loads((here / "incidents.json").read_text(encoding="utf-8"))
updated, version = data["updated"], data["version"]
journal = json.loads((here / "publications.json").read_text(encoding="utf-8"))
updates = project(journal, data)
# The journal is authoritative; updates.json is a generated compatibility export.
if json.loads((here / "updates.json").read_text(encoding="utf-8")) != updates:
    raise ValueError("updates.json must be the exact projection of publications.json")
# Persisted provenance is separate from the append-only editorial catalog.
metadata = json.loads((here / "catalog-metadata.json").read_text(encoding="utf-8"))
registry = validate_sources(json.loads((here / "source-registry.json").read_text(encoding="utf-8")), data)
# Keep retired permalink IDs pointing at the exact correction and before snapshot.
# Derive from journal removals, never from absent search/filter results.
site_data = dict(data, catalogAdded=catalog_additions(metadata, updates, data), catalogUpdated=catalog_updates(updates, data), publicSources=registry, retiredIncidents=retired_incidents(data, updates))
js = "const DATA = " + json.dumps(site_data, ensure_ascii=False) + ";"
page = (here / "template.html").read_text().replace("/*__DATA__*/", js.replace("</", "<\\/"))
page = page.replace("/*__UPDATES_VIEW__*/", (here / "updates-view.js").read_text())
page = page.replace("/*__CARD_HISTORY__*/", (here / "card-history.js").read_text())
page = page.replace("__UPDATED__", updated).replace("__VERSION__", version)
wiki = json.loads((here / "wiki-data.js").read_text(encoding="utf-8").split("=", 1)[1].rstrip().rstrip(";"))
page = page.replace("__WIKI_N__", str(len(wiki["posts"])))
(here / "openai-agent-swarm.html").write_text(page)
(here / "brand" / "data.js").write_text(js + "\n")  # for brand/og.html
docs = here / "docs"
docs.mkdir(exist_ok=True)
build_feed(data, here)
# Public released catalog; the ingestion runner must not depend on public GitHub access.
shutil.copyfile(here / "incidents.json", docs / "incidents.json")
shutil.copyfile(here / "catalog-metadata.json", docs / "catalog-metadata.json")
shutil.copyfile(here / "source-registry.json", docs / "source-registry.json")
(docs / "updates.json").write_text(json.dumps(updates, ensure_ascii=False, indent=2) + "\n")
# One actual shell and renderer, not a separate approximation of the dashboard.
update_data = dict(site_data)
update_data["responses"] = [dict(
    id=u["id"], title=u["title"], text=u["summary"],
    d=datetime.fromisoformat(u["published"]).astimezone(ZoneInfo("America/Los_Angeles")).date().isoformat(),
    who={"New incident":"lab", "Update":"gov", "Correction":"other"}[u["type"]],
    inc=[u["incident"]], update=u,
    src=[[r["publisher"] + " report", r["publisher"], r["url"]] for r in u.get("resources", [{"url":u["source"], "publisher":u["publisher"]}])]
) for u in updates["updates"]]
updates_page = (here / "template.html").read_text().replace("/*__DATA__*/", ("const DATA = " + json.dumps(update_data, ensure_ascii=False) + ";").replace("</", "<\\/"))
updates_page = updates_page.replace("/*__UPDATES_VIEW__*/", (here / "updates-view.js").read_text())
updates_page = updates_page.replace("/*__CARD_HISTORY__*/", (here / "card-history.js").read_text())
updates_page = updates_page.replace("const UPDATES_PAGE = false;", "const UPDATES_PAGE = true;")
updates_page = updates_page.replace("__UPDATED__", updated).replace("__VERSION__", version).replace("__WIKI_N__", str(len(wiki["posts"])))
updates_page = updates_page.replace("<title>Swarm Incidents: a timeline of AI agent incidents</title>", "<title>Updates · Swarm Incidents</title>")
updates_page = updates_page.replace('<link rel="canonical" href="https://swarmincidents.com/">', '<link rel="canonical" href="https://swarmincidents.com/updates.html">')
(docs / "updates.html").write_text(updates_page)
(docs / "index.html").write_text(page)
subscribe_page = page.replace('<title>Swarm Incidents: a timeline of AI agent incidents</title>', '<title>Email updates · Swarm Incidents</title>')
subscribe_page = subscribe_page.replace('<link rel="canonical" href="https://swarmincidents.com/">', '<meta name="robots" content="noindex"><link rel="canonical" href="https://swarmincidents.com/subscribe.html">')
(docs / "subscribe.html").write_text(subscribe_page)
shutil.copyfile(here / "newsletter.js", docs / "newsletter.js")
# The Wiki tab loads wiki-data.js on demand. Rebuild it with wiki_build.py when the archive selection or wiki_notes.json change.
shutil.copyfile(here / "wiki-data.js", docs / "wiki-data.js")
shutil.copyfile(here / "analytics.js", docs / "analytics.js")
# A small public summary for sites that show the tracker's count (swarms.wiki), so they need not
# load the full page. Same values the page shows; GitHub Pages serves it with CORS open.
(docs / "stats.json").write_text(json.dumps({"incidents": len(data["incidents"]), "updated": updated, "version": version}) + "\n")
(docs / "sitemap.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://swarmincidents.com/</loc><lastmod>{updated}</lastmod></url>
  <url><loc>https://swarmincidents.com/updates.html</loc><lastmod>{updated}</lastmod></url>
</urlset>
""")
print(f"built openai-agent-swarm.html and docs/ ({len(page) // 1024} KB, updated {updated}, v{version})")

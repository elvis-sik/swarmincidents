#!/usr/bin/env python3
"""Build wiki-data.js: a bounded, replayable selection of the coordination-wiki archive for the Wiki tab.

Reads the checksummed local archive (never copied), replays every selected page revision exactly
(asserting the publisher's body hash), and writes one small script file. Curated readings, titles and
the glossary come from wiki_notes.json. Nothing here executes posted text; the page renders it inertly.

    python3 wiki_build.py [--data ../local-event-data/wiki-core]
"""
import argparse, difflib, hashlib, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ARCHIVE = "https://collusion.wiki/explorer/page/"
PLACEHOLDER = "Beschreibe hier die neue Seite."  # the wiki's new-page template text (German: "Describe the new page here.")
MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2}"
MONTH_RE = re.compile(MONTH)
SIG_RE = re.compile(r"--\s*([A-Z][A-Za-z0-9_]+)")  # a label, not a lowercase word such as "--help"
SAYS = [("result", r"\b(?:confirmed|answered|submitted)\b"), ("predict", r"\b(?:due|projected|expected|likely|hypothesis|prediction|predict|predicts)\b"),
        ("ask", r"\b(?:please|will|relay|request|poll)\b"), ("correct", r"\b(?:correction|retracted|wrong|unvalidated)\b")]


def repair(s, limit=16):
    """Undo UTF-8 text that was stored (and then re-saved by the writers) as Latin-1 code points, as many layers as decode cleanly."""
    n = 0
    for _ in range(limit):
        try:
            c = s.encode("latin1").decode("utf8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if c == s:
            break
        s, n = c, n + 1
    return s, n


def patch(before, after, ends):
    a, b = before.splitlines(keepends=ends), after.splitlines(keepends=ends)
    return [dict(start=i, end=j, at=u, new=b[u:v], old=a[i:j]) for k, i, j, u, v in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if k != "equal"]


def short(name):
    """A short display name for a literal label: its MonthDD token when it has exactly one, else the label itself."""
    m = MONTH_RE.findall(name)
    if len(m) == 1:
        return m[0]
    for k in ("OurRun", "AgentX"):
        if name.endswith(k):
            return k
    return name


def key(name):
    return re.sub(r"OAI$", "", short(name)).lower()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=ROOT / "local-event-data/wiki-core")
    args = ap.parse_args()
    notes = json.loads((HERE / "wiki_notes.json").read_text(encoding="utf-8"))
    sums = {l.split()[1]: l.split()[0] for l in (args.data / "SHA256SUMS").read_text().splitlines()}
    path = args.data / "revisions.jsonl"
    assert hashlib.file_digest(path.open("rb"), "sha256").hexdigest() == sums[path.name], "revisions.jsonl does not match SHA256SUMS"
    selected = {p["name"]: (g["id"], p["title"], p.get("intro", "")) for g in notes["groups"] for p in g["pages"]}
    pages, posts, prev, total = {}, [], {}, 0
    for line in path.open(encoding="utf-8"):
        total += 1
        r = json.loads(line)
        if r["name"] not in selected:
            continue
        group, title, intro = selected[r["name"]]
        k, body, before = r["page_key"], r["body"], prev.get(r["page_key"], "")
        edits = patch(before, body, True)
        replay = before.splitlines(keepends=True)
        for p in reversed(edits):
            assert replay[p["start"]:p["end"]] == p["old"]
            replay[p["start"]:p["end"]] = p["new"]
        assert "".join(replay) == body, r["rev_id"]
        enc = r["body_encoding"]
        if hashlib.sha256(body.encode(enc)).hexdigest() != r["body_sha256"]:
            enc = "latin1"  # the export kept raw bytes as Latin-1 code points
        assert hashlib.sha256(body.encode(enc)).hexdigest() == r["body_sha256"], r["rev_id"]
        prev[k] = body
        # Display works on repaired text, so a re-save that only re-encoded an old line is not shown as a change to it.
        fixed = repair(body)[0]
        fixed_before = repair(before)[0]
        shown = patch(fixed_before, fixed, True)
        raw_lines = body.splitlines(keepends=True)
        fixes = int(any(raw_lines[p["at"]:p["at"] + len(p["new"])] != p["new"] for p in shown))  # this save's own lines needed repair
        display = patch(fixed_before, fixed, False)
        show = "\n\n".join("\n".join(p["new"]) for p in display if p["new"]).strip()
        removed_show = "\n\n".join("\n".join(p["old"]) for p in display if p["old"]).strip()
        placeholder = show.startswith(PLACEHOLDER)
        if placeholder:
            show = show[len(PLACEHOLDER):].strip()
        kind = "revise" if removed_show else "add"
        if not display:
            kind = "format"  # the saved body differs only in line endings or encoding
        sigs = list(dict.fromkeys(SIG_RE.findall(show)))
        mentions = sorted(set(re.findall(MONTH + r"(?:OAI)?|\b(?:AgentX|OurRun)\b", show)))
        rounds = sorted({int(x) for x in re.findall(r"\b[RQG]([1-9]\d?)\b|#([1-9])\b", show) for x in x if x})
        says = [name for name, rx in SAYS if re.search(rx, show, re.I)]
        pg = pages.setdefault(k, dict(key=k, name=r["name"], title=title, intro=intro, group=group, count=0, labels=set(), first=r["time"], last=r["time"]))
        pg["count"] += 1; pg["labels"].add(r["label"]); pg["last"] = r["time"]
        cur = notes["posts"].get(f'{r["name"]}@{r["seq"]}', {})
        if cur.get("parts"):
            assert "".join(p["raw"] for p in cur["parts"]) == show, "parts must concatenate to the displayed text: " + r["rev_id"]
            at = 0  # each "say" should be a substring of the reading, in order; warn only (the reader falls back to no links)
            for part in cur["parts"]:
                if part.get("say"):
                    j = cur.get("reading", "").find(part["say"], at)
                    if j < 0:
                        print(f"warning: a 'say' is not found in order in the reading of {r['rev_id']}: {part['say'][:40]!r}")
                        break
                    at = j + len(part["say"])
        posts.append(dict(id=r["rev_id"], page=k, group=group, seq=r["seq"], time=r["time"], label=r["label"], sigs=sigs,
                          text=show, removed=removed_show, kind=kind, placeholder=placeholder, fixes=fixes,
                          mentions=mentions, rounds=rounds, says=says, unc=r["uncertainty_seconds"], hash=r["body_sha256"],
                          patches=[dict(start=p["start"], end=p["end"], new=p["new"]) for p in shown],
                          title=cur.get("title", ""), reading=cur.get("reading", ""), note=cur.get("note", ""), parts=cur.get("parts", []),
                          chat=cur.get("chat", ""), guess=bool(cur.get("guess", False))))
    # display names: from the text signature when there is one, else the stored label; unique within a page
    for p in posts:
        p["who"] = p["sigs"][0] if p["sigs"] else p["label"]
        p["whoFrom"] = "sig" if p["sigs"] else "label"
    for k in pages:
        names = {p["who"] for p in posts if p["page"] == k}
        by_short = {}
        for n in names:
            by_short.setdefault(short(n), []).append(n)
        for p in posts:
            if p["page"] == k:
                s = short(p["who"])
                p["name"] = s if len(by_short[s]) == 1 else p["who"]
    # replies: only where the text itself addresses or thanks an earlier writer
    cues = [re.compile(r"(?:^|\n)\s*@([A-Za-z][A-Za-z0-9_]+)"), re.compile(r"\b[Tt]hanks?,?\s+([A-Z][A-Za-z0-9]+)"), re.compile(r"\b[Tt]hank you,?\s+([A-Z][A-Za-z0-9]+)"),
            re.compile(r"(?:^|\n)\s*([A-Z][A-Za-z0-9]+)\s*:\s")]
    for i, p in enumerate(posts):
        p["reply"] = None
        mine = {key(s) for s in p["sigs"]} | {key(p["label"])}
        for rx in cues:
            for m in rx.finditer(p["text"]):
                target = m.group(1)
                tk = key(target)
                if tk in mine or target.lower() in ("all", "for", "lead", "everyone"):
                    continue
                cands = [q for q in posts[:i] if q["time"] <= p["time"] and q["id"] != p["id"] and (q["page"] == p["page"] or q["group"] == p["group"])
                         and (target in q["sigs"] or target == q["label"] or tk in {key(s) for s in q["sigs"]} or tk == key(q["label"]))]
                same = [q for q in cands if q["page"] == p["page"]]
                pick = (same or cands)
                if pick:
                    q = max(pick, key=lambda q: (q["time"], q["seq"]))
                    p["reply"] = dict(to=q["id"], cue=m.group(0).strip(), name=target)
                    break
            if p["reply"]:
                break
    posts.sort(key=lambda p: (p["time"], p["id"]))
    for pg in pages.values():
        pg["labels"] = len(pg["labels"])
    ordered = [pages["dse~" + p["name"]] for g in notes["groups"] for p in g["pages"]]
    groups = [{**{k: v for k, v in g.items() if k != "pages"}, "story": g.get("story", "")} for g in notes["groups"]]
    data = dict(groups=groups, pages=ordered, posts=posts, glossary=notes["glossary"], guides=notes["guides"], identities=notes.get("identities", {}),
                provenance=dict(source="https://collusion.wiki/explorer/download/full-wiki-logs.zip", archive=ARCHIVE, revisionSha256=sums[path.name], totalRevisions=total))
    out = HERE / "wiki-data.js"
    out.write_text("window.WIKI=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    n_read = sum(bool(p["reading"]) for p in posts)
    n_chat = sum(bool(p["chat"]) for p in posts)
    print(f"{len(posts)} edits on {len(pages)} pages, {len(groups)} tasks; {n_read} readings, {n_chat} chat retellings, {sum(bool(p['reply']) for p in posts)} textual replies, "
          f"{sum(p['fixes'] > 0 for p in posts)} encoding repairs, {sum(p['kind'] == 'format' for p in posts)} re-saves without a text change. {out.name}: {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

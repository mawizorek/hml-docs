#!/usr/bin/env python3
"""Walk a repo tree, extract @id / id from YAML frontmatter in .md files,
and write .vscode/project.code-snippets for fuzzy autocomplete on @id refs.

Usage:
    python3 generate-snippets.py              # run from repo root
    python3 generate-snippets.py /path/to/repo
"""

import json, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
ID_RE = re.compile(r"^(?:@id|id)\s*:\s*[\"']?(.+?)[\"']?\s*$", re.MULTILINE)

snippets = {}
for dirpath, _, filenames in os.walk(ROOT):
    for fn in filenames:
        if not fn.endswith(".md"):
            continue
        path = os.path.join(dirpath, fn)
        rel = os.path.relpath(path, ROOT)
        try:
            head = open(path, "r", encoding="utf-8", errors="replace").read(4096)
        except OSError:
            continue
        fm = FM_RE.match(head)
        if not fm:
            continue
        m = ID_RE.search(fm.group(1))
        if not m:
            continue
        page_id = m.group(1)
        snippets[page_id] = {
            "prefix": f"@{page_id}",
            "body": f"@{page_id}",
            "description": rel,
        }

out_dir = os.path.join(ROOT, ".vscode")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "project.code-snippets")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(snippets, f, indent=2)

print(f"{len(snippets)} page IDs \u2192 {os.path.relpath(out_path, ROOT)}")

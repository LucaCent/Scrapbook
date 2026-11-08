#!/usr/bin/env python3
"""Rewrite the PRECACHE block in sw.js so the offline cache matches the site.

Run after adding/replacing images or editing any code, before pushing:
    python3 tools/update_precache.py

What it does
  1. Lists every file the site needs (pages, scripts, styles, images).
  2. Also lists each folder URL (./games/scratch/) because QR codes will point
     at folders, and GitHub Pages serves index.html for those.
  3. Hashes all file contents into CACHE_VERSION, so any change creates a new
     cache and the service worker discards the old one automatically.
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE_DIRS = ["shared", "games", "assets"]
INCLUDE_EXT = {".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".webp", ".svg", ".json", ".woff2"}

files = [ROOT / "index.html"]
for d in INCLUDE_DIRS:
    files += [p for p in sorted((ROOT / d).rglob("*")) if p.is_file() and p.suffix.lower() in INCLUDE_EXT]

urls = ["./"]
digest = hashlib.sha256()
for p in files:
    rel = "./" + p.relative_to(ROOT).as_posix()
    urls.append(rel)
    if p.name == "index.html" and p.parent != ROOT:
        urls.append(rel[: -len("index.html")])        # folder URL, e.g. ./games/scratch/
    digest.update(rel.encode())
    digest.update(p.read_bytes())

version = digest.hexdigest()[:12]
block = "// >>> PRECACHE (generated)\nconst CACHE_VERSION = '%s';\nconst PRECACHE = [\n%s\n];\n// <<< PRECACHE" % (
    version, ",\n".join("  '%s'" % u for u in urls))

sw_path = ROOT / "sw.js"
sw = sw_path.read_text()
new, n = re.subn(r"// >>> PRECACHE \(generated\).*?// <<< PRECACHE", lambda m: block, sw, flags=re.S)
if n != 1:
    raise SystemExit("Could not find the PRECACHE markers in sw.js")
sw_path.write_text(new)
print("sw.js updated: %d URLs, cache version %s" % (len(urls), version))

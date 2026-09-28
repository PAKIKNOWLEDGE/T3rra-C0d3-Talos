"""Check local handoff links and demo snapshot; no browser or engine calls."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
required = [
    'AGENTS.md', 'README.md', 'docs/status.md', 'docs/workflow.md',
    'docs/design.md', 'docs/lessons.md', 'docs/adapters/minimax-code.md',
    'docs/references/README.md', 'demo/talos.html', 'demo/talos.css',
    'demo/talos.js', 'demo/talos-check.py',
    'demo/fonts/HarmonyOS_Sans_SC_Regular.woff2',
    'demo/fonts/HarmonyOS_Sans_SC_Bold.woff2',
] + [f'docs/references/newend{i}.png' for i in range(1, 7)]
errors = []
for relative in required:
    if not (root / relative).is_file():
        errors.append(f'Missing: {relative}')

documents = [root / 'AGENTS.md', root / 'README.md', *sorted((root / 'docs').rglob('*.md'))]
links = 0
for document in documents:
    if not document.is_file():
        continue
    for target in re.findall(r'\]\(([^)]+)\)', document.read_text(encoding='utf-8')):
        if re.match(r'^(https?://|mailto:|#)', target):
            continue
        path = target.split('#', 1)[0]
        if path:
            links += 1
            if not (document.parent / path).is_file():
                errors.append(f'Broken link: {document.relative_to(root)} -> {target}')

manifest = root / 'demo/baseline.sha256.json'
if not manifest.is_file():
    errors.append('Missing: demo/baseline.sha256.json')
else:
    for relative, expected in json.loads(manifest.read_text(encoding='utf-8-sig')).items():
        path = root / 'demo' / relative
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected.lower():
            errors.append(f'Snapshot mismatch: {relative}')

if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'PASS: {len(documents)} documents, {links} local links, {len(required)} required files, demo SHA-256 snapshot')
print('NOT VERIFIED: external URLs, engine behavior, font redistribution license, browser rendering')

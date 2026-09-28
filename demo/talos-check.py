"""Talos 样张的静态结构检查；不启动浏览器、不代表视觉验收。"""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parent

class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []
        self.fragments = []
        self.labels = []
        self.controls = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag in ('button', 'select', 'textarea'):
            self.controls += 1
        for key in ('src', 'href'):
            if key in attrs:
                value = attrs[key]
                if value.startswith('#'):
                    self.fragments.append(value[1:])
                else:
                    self.assets.append(value)
        for key in ('for', 'aria-labelledby', 'aria-controls'):
            self.labels.extend(attrs.get(key, '').split())

doc = Document()
doc.feed((root / 'talos.html').read_text(encoding='utf-8'))
ids = set(doc.ids)
duplicates = [key for key, count in Counter(doc.ids).items() if count > 1]
assert not duplicates, f'Duplicate ids: {duplicates}'
js = (root / 'talos.js').read_text(encoding='utf-8')
css = (root / 'talos.css').read_text(encoding='utf-8')
refs = set(re.findall(r"\$\('([^']+)'\)", js)) | set(doc.labels) | set(doc.fragments)
refs |= {'i-' + name for name in re.findall(r"icon\('([^']+)'\)", js)}
refs |= {'i-' + name for name in re.findall(r"icon: '([^']+)'", js)}
assert not refs - ids, f'Missing element ids: {refs - ids}'
assets = set(doc.assets) | set(re.findall(r"url\('([^']+)'\)", css))
for asset in assets:
    assert (root / asset).is_file(), f'Missing asset: {asset}'
assert css.count('{') == css.count('}'), 'Unbalanced CSS blocks'
assert 'prefers-reduced-motion' in css, 'Missing reduced motion support'
assert not re.search(r'\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(', js), 'Unexpected network call'
subprocess.run(['node', '--check', str(root / 'talos.js')], check=True)
print(f'PASS: {len(ids)} unique ids, {len(refs)} element references, {len(assets)} local assets, {doc.controls} static controls')
print('PASS: JS syntax, CSS block balance, reduced-motion rule, no network calls')
print('NOT VERIFIED: browser rendering, interaction behavior, responsive layout, animation quality')

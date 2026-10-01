"""Check local handoff links and demo snapshot; no browser or engine calls."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
required = [
    'AGENTS.md', 'README.md', 'docs/status.md', 'docs/plan.md', 'docs/workflow.md',
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

def check_current_handoff(status_text, plan_text, workflow_text=""):
    """Validate the active handoff only; archived plans are not execution inputs."""
    issues = []
    if status_text.count('## 当前交接卡') != 1:
        issues.append('status must contain exactly one active handoff card')
    next_headings = [line[3:] for line in plan_text.splitlines() if line.startswith('## 下一小轮：')]
    if len(next_headings) > 1:
        issues.append('plan must contain at most one next-round section')
    card = status_text.split('## 当前交接卡', 1)[-1].split(chr(10) + '## ', 1)[0]
    for field in ['任务标识 / 修订', '阶段', '本轮角色 / 来源', '目标 / 方案入口', '允许范围', '禁止范围', '验收 / 停止点', '完成证据', '下一接手 / 就绪性']:
        if card.count('| ' + field + ' |') != 1:
            issues.append('missing or duplicate handoff field: ' + field)
    def heading_anchor(heading):
        return ''.join(char for char in heading.lower() if char.isalnum() or char in '_- ').replace(' ', '-')
    anchors = {heading_anchor(line.lstrip("# ")) for line in plan_text.splitlines() if line.startswith("#")}
    workflow_anchors = {heading_anchor(line.lstrip("# ")) for line in workflow_text.splitlines() if line.startswith("#")}
    rows = {}
    for line in card.splitlines():
        if line.startswith("| "):
            parts = [part.strip() for part in line.split("|")[1:-1]]
            if len(parts) == 2:
                rows[parts[0]] = parts[1]
    target_row = rows.get("目标 / 方案入口", "")
    target_links = re.findall(r"(?:plan|workflow)[.]md(?:#[^ )]+)?", target_row)
    if not target_links:
        issues.append("handoff must link its current target to plan or workflow")
    for target in re.findall(r"(?:plan|workflow)[.]md#[^ )]+", card):
        filename, anchor = target.split("#", 1)
        available = workflow_anchors if filename == "workflow.md" else anchors
        if anchor not in available:
            issues.append("broken active target anchor: " + target)
    next_row = rows.get("下一接手 / 就绪性", "")
    ready = next_row.startswith("已就绪：")
    if ready and (len(next_headings) != 1 or not re.search(r"plan[.]md#[^ )]+", next_row)):
        issues.append("ready next task must link to the unique next-round section")
    if ready and len(next_headings) == 1:
        expected = "plan.md#" + heading_anchor(next_headings[0])
        if expected not in next_row:
            issues.append("ready next task points outside the next-round section")
    return issues

if (root / 'docs/status.md').is_file() and (root / 'docs/plan.md').is_file():
    errors.extend(check_current_handoff(
        (root / 'docs/status.md').read_text(encoding='utf-8'),
        (root / 'docs/plan.md').read_text(encoding='utf-8'),
        (root / 'docs/workflow.md').read_text(encoding='utf-8'),
    ))
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
print(f'PASS: {len(documents)} documents, {links} local links, {len(required)} required files, demo SHA-256 snapshot, active handoff anchors')
print('NOT VERIFIED: external URLs, engine behavior, font redistribution license, browser rendering')

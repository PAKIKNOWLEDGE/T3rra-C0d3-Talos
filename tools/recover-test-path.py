"""Back up and remove only identified Talos test entries from Windows user Path."""
import argparse
import ctypes
import json
import os
from pathlib import Path
import re
import winreg

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / '.talos' / 'environment-recovery'
BACKUP = BASE / 'path-before.json'
PATTERNS = (
    r'minimax-code-smoke-[A-Za-z0-9]+\\bin',
    r'minimax-code-byok-[A-Za-z0-9]+\\data\\bin',
    r'talos-acp-state-[A-Za-z0-9]+\\data\\bin',
    r'talos-custom-provider-[A-Za-z0-9]+\\data\\bin',
    r'talos-env-repro-[A-Za-z0-9]+\\(?:inherited|reported-four)\\bin',
)
TEMP_ROOT = str(Path(os.environ['LOCALAPPDATA']) / 'Temp').rstrip('\\')
MATCH = re.compile(re.escape(TEMP_ROOT) + r'\\(?:' + '|'.join(PATTERNS) + r')', re.I)

def read_path():
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as key:
        return winreg.QueryValueEx(key, 'Path')

def write_path(value, kind):
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment', 0, winreg.KEY_SET_VALUE) as key:
        winreg.SetValueEx(key, 'Path', 0, kind, value)
    result = ctypes.c_size_t()
    ctypes.windll.user32.SendMessageTimeoutW(0xFFFF, 0x001A, 0, 'Environment', 2, 3000, ctypes.byref(result))

def save(name, payload):
    (BASE / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

parser = argparse.ArgumentParser()
parser.add_argument('--apply', action='store_true')
parser.add_argument('--restore', action='store_true')
args = parser.parse_args()
BASE.mkdir(parents=True, exist_ok=True)
current, kind = read_path()
if args.restore:
    before = json.loads(BACKUP.read_text(encoding='utf-8'))
    result = json.loads((BASE / 'path-after.json').read_text(encoding='utf-8'))
    if current != result['value'] or kind != result['type']:
        raise SystemExit('Path changed since recovery; refusing to overwrite newer edits.')
    write_path(before['value'], before['type'])
    print('Original user Path restored.')
    raise SystemExit(0)
if not BACKUP.exists():
    save('path-before.json', {'value': current, 'type': kind, 'processPath': os.environ.get('PATH', '')})
entries = current.split(';')
removed = [e for e in entries if MATCH.fullmatch(e.replace('/', '\\').strip())]
retained = [e for e in entries if not MATCH.fullmatch(e.replace('/', '\\').strip())]
cleaned = ';'.join(retained)
save('removal-review.json', {'removed': removed, 'retained': retained, 'beforeLength': len(current), 'afterLength': len(cleaned)})
print(json.dumps({'removedCount': len(removed), 'beforeLength': len(current), 'afterLength': len(cleaned), 'backup': str(BACKUP)}))
if args.apply:
    before = json.loads(BACKUP.read_text(encoding='utf-8'))
    if current != before['value'] or kind != before['type']:
        raise SystemExit('Path differs from backup; refusing to overwrite newer edits.')
    if read_path() != (current, kind):
        raise SystemExit('Concurrent Path change detected.')
    write_path(cleaned, kind)
    actual, actual_kind = read_path()
    if actual != cleaned or actual_kind != kind:
        raise SystemExit('User Path verification failed.')
    save('path-after.json', {'value': actual, 'type': actual_kind, 'removedCount': len(removed)})
    print('Applied and verified: retained entries and registry type unchanged.')

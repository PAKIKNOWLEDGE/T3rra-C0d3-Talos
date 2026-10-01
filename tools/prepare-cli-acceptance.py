"""Recreate the two launch entries for the installed local acceptance candidate."""
from pathlib import Path
import shutil
import argparse
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--directory', type=Path, default=root/'.talos/acceptance/pakiknowledge-4e9f1ba')
parser.add_argument('--ordinary-only', action='store_true')
args=parser.parse_args()
base=args.directory.resolve()
if not base.is_relative_to((root/'.talos').resolve()):
 raise SystemExit('Candidate directory must be inside this repository .talos directory.')
cli=base/"prefix/node_modules/@pakiknowledge/tal0s-code/cli.js"
if not cli.is_file():
 raise SystemExit("Install the acceptance candidate first; see README.")
for name in ["workspace","preview-workspace","preview-home","preview-data"]:
 (base/name).mkdir(parents=True,exist_ok=True)
names=["01-launch-talos.ps1"] if args.ordinary_only else ["01-launch-talos.ps1","02-preview-update.cmd","preview-registry.mjs"]
for name in names:
 shutil.copyfile(root/"tools/cli-acceptance-templates"/name,base/name)
print("Prepared: "+str(base))

"""Recreate the two launch entries for the installed local acceptance candidate."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
base=root/".talos/acceptance/pakiknowledge-3055bc5"
cli=base/"prefix/node_modules/@pakiknowledge/tal0s-code/cli.js"
if not cli.is_file():
 raise SystemExit("Install the acceptance candidate first; see README.")
for name in ["workspace","preview-workspace","preview-home","preview-data"]:
 (base/name).mkdir(parents=True,exist_ok=True)
for name in ["01-launch-talos.cmd","02-preview-update.cmd","preview-registry.mjs"]:
 shutil.copyfile(root/"tools/cli-acceptance-templates"/name,base/name)
print("Prepared: "+str(base))

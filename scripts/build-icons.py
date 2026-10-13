"""Convert editable outline and solid SVGs into Home Assistant path geometry.
Requires Inkscape 1.2+; normal npm builds use the committed generated files.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
icons = {}
with tempfile.TemporaryDirectory() as tmp:
    env = dict(os.environ, XDG_CONFIG_HOME=tmp, XDG_CACHE_HOME=tmp)
    for source in sorted((root / 'icons/source').glob('*.svg')):
        output = Path(tmp) / source.name
        operation = 'path-difference' if ET.parse(source).getroot().get('data-operation') == 'difference' else 'path-union'
        subprocess.run(['inkscape', str(source), '--export-plain-svg',
                        '--export-type=svg', f'--export-filename={output}',
                        f'--actions=select-all;object-to-path;object-stroke-to-path;select-all;selection-ungroup;select-all;{operation};export-do'],
                       env=env, check=True, capture_output=True)
        tree = ET.parse(output)
        paths = tree.findall('.//{http://www.w3.org/2000/svg}path')
        if len(paths) != 1 or paths[0].get('transform'):
            raise ValueError(f'{source.name}: expected one flattened compound path')
        path = re.sub(r'-?\d+\.\d+', lambda m: f'{float(m[0]):.4f}'.rstrip('0').rstrip('.'), paths[0].attrib['d'])
        icons[source.stem] = path
        (root / 'icons' / source.name).write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="{path}"/></svg>\n')
(root / 'src/icons').mkdir(exist_ok=True)
(root / 'src/icons/paths.json').write_text(json.dumps(icons, indent=2) + '\n')
print(f'Generated {len(icons)} Home Assistant icons')

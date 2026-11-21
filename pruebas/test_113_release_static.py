from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
pkg=json.loads((root/'package.json').read_text('utf8'));conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
assert pkg['version']=='1.13.2' and conf['version']=='1.13.2'
index=(root/'frontend/index.html').read_text('utf8')
assert 'margen-113.js' in index and 'margen-113.css' in index and 'margen-1131.js' in index and 'margen-1131.css' in index and '1.13.2' in index
js=(root/'frontend/assets/margen-113.js').read_text('utf8');css=(root/'frontend/assets/margen-113.css').read_text('utf8')
for token in ['m113HistoryMove','m113SelectedStrokeIds','m113OpenShortcuts','Space + drag','M113_WORLD_W','m113Recenter']:
    assert token in js,token
assert '20000px' in css and 'm113-stroke-hit' in css
for rel in ['index.html','assets/margen-113.js','assets/margen-113.css','assets/margen-1131.js','assets/margen-1131.css']:
    assert (root/'frontend'/rel).read_bytes()==(root/'dist'/rel).read_bytes(),rel
# Build aprobado: no se toca.
wf=(root/'.github/workflows/build-windows.yml').read_bytes()
assert b'MARGEN-1.13.2-Windows-x64' in wf
print('PASS 1.13 release static')

"""Validación estática y de integridad de MARGEN 1.13.2 (sin navegador)."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
package=json.loads((root/'package.json').read_text('utf8'))
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
cargo=(root/'src-tauri/Cargo.toml').read_text('utf8')
assert package['version']=='1.13.2' and conf['version']==package['version']
assert re.search(r'^version\s*=\s*"1\.13\.2"',cargo,re.M)
assert conf['identifier']=='com.margen.escritorio'
index=(root/'frontend/index.html').read_text('utf8')
for token in ['margen-1131.js','margen-1132.js','margen-1132.css','1.13.2']:
    assert token in index,token
script=(root/'frontend/assets/margen-1132.js').read_text('utf8')
for token in ['m1132Expand','m1132ClearSelection','m1132MoveSelection','groupBoardItems=function','ungroupBoardItems=function','m113Paste=function','m113BindStrokeHits=function','m1211BindBoardSelection=function']:
    assert token in script,token
for rel in ['index.html','assets/margen-1131.js','assets/margen-1132.js','assets/margen-1132.css']:
    assert (root/'frontend'/rel).read_bytes()==(root/'dist'/rel).read_bytes(),rel
backend=(root/'src-tauri/src/lib.rs').read_text('utf8')
for token in ['desktop_export_book','MARGEN_BOOK','formatVersion','single_book_export_payload']:
    assert token in backend,token
workflow=(root/'.github/workflows/build-windows.yml').read_text('utf8')
for token in ['run: npm install','npm run tauri build -- --bundles nsis','MARGEN-1.13.2-Windows-x64','pruebas/test_1132_release_static.py']:
    assert token in workflow,token
print('PASS MARGEN 1.13.2 package + Windows build config')

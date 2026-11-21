from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
pkg=json.loads((root/'package.json').read_text('utf8'))
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
cargo=(root/'src-tauri/Cargo.toml').read_text('utf8')
assert pkg['version']=='1.13.2'
assert conf['version']==pkg['version']
assert 'version = "1.13.2"' in cargo
index=(root/'frontend/index.html').read_text('utf8')
assert 'margen-1131.js' in index and 'margen-1131.css' in index
js=(root/'frontend/assets/margen-1131.js').read_text('utf8')
for token in ['desktop_export_book','m1131ExportDialog','Biblioteca completa','Un solo libro','Exportar este libro']:
    assert token in js,token
rust=(root/'src-tauri/src/lib.rs').read_text('utf8')
for token in ['desktop_export_book','MARGEN_BOOK','formatVersion','single_book_export_payload']:
    assert token in rust,token
assert 'desktop_export_backup,desktop_export_book,desktop_export_document' in rust
for rel in ['index.html','assets/margen-1131.js','assets/margen-1131.css']:
    assert (root/'frontend'/rel).read_bytes()==(root/'dist'/rel).read_bytes(),rel
wf=(root/'.github/workflows/build-windows.yml').read_bytes()
assert b'MARGEN-1.13.2-Windows-x64' in wf
print('PASS 1.13.1 single-book export static')

"""MARGEN 1.12.3 Beta final: comprobaciones sin navegador."""
from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[1]
read=lambda p:(root/p).read_text('utf8')
pkg=json.loads(read('package.json'));conf=json.loads(read('src-tauri/tauri.conf.json'))
assert pkg['version']=='1.12.3' and conf['version']=='1.12.3'
index=read('frontend/index.html');assert 'margen-123.js' in index and 'margen-123.css' in index and '1.12.3' in index
js=read('frontend/assets/margen-123.js');css=read('frontend/assets/margen-123.css');backend=read('src-tauri/src/lib.rs')
for token in ['desktop_list_book_trash','desktop_trash_book','desktop_restore_book','desktop_delete_trashed_book','desktop_empty_book_trash','desktop_library_info','desktop_choose_library_location','desktop_cleanup_previous_library','desktop_reset_library_location']:
    assert token in backend,token
for token in ['data-m123f-trash-open','data-m123f-library-change','data-m123f-library-clean','Mover libro a papelera','m123fReloadWorkspace']:
    assert token in js,token
assert 'CREATE TABLE IF NOT EXISTS book_trash' in backend and 'DB_SCHEMA_VERSION:i64=1123' in backend
assert 'workspace_book_refs r' in backend and 'book_trash t' in backend
assert '.m123f-library-settings' in css and '.m123f-trash-card' in css
for rel in ['index.html','assets/margen-123.js','assets/margen-123.css']:
    assert (root/'frontend'/rel).read_bytes()==(root/'dist'/rel).read_bytes(),rel
# El workflow aprobado no se toca en esta beta final.
wf=(root/'.github/workflows/build-windows.yml').read_bytes()
assert hashlib.sha256(wf).hexdigest()=='6d5d5f97d657b990c3e29ecdf2182ec0e387b96e1061fb8a57b838eca3fd9c77'
print('PASS 1.12.3 beta final static')

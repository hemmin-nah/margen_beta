"""Comprobaciones sin navegador que sí pueden ejecutarse en GitHub Actions Windows."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
package=json.loads((root/'package.json').read_text('utf8'))
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
index=(root/'frontend/index.html').read_text('utf8')
rust=(root/'src-tauri/src/lib.rs').read_text('utf8')
workflow=(root/'.github/workflows/build-windows.yml').read_text('utf8')
assert package['version']=='1.12.2'
assert conf['version']=='1.12.2' and conf['identifier']=='com.margen.escritorio'
assert 'margen-111.css' in index and 'margen-111.js' in index and 'margen-112.css' in index and 'margen-112.js' in index and '1.12.2' in index
for name in ['schema_migrations','DB_SCHEMA_VERSION','desktop_startup_health','desktop_support_info','desktop_export_diagnostics','desktop_open_data_folder','desktop_log_error','session.lock']:
    assert name in rust,name
for resource in ['english.sqlite3','spanish-synonyms.sqlite3','spanish-definitions-CC-BY-SA.sqlite3','SOURCE_MANIFEST.json']:
    assert any(resource in x for x in conf['bundle']['resources']),resource
assert 'herramientas_lexicas.py --verify' in workflow
assert 'cargo test --manifest-path src-tauri/Cargo.toml' in workflow
print('PASS static 1.11: versión, migraciones, soporte, recursos y workflow')

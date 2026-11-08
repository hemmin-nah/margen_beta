"""Verificación estática rápida. No compila Rust ni Windows."""
from pathlib import Path
import json,subprocess,re,hashlib
root=Path(__file__).resolve().parents[1]
for path in ['package.json','src-tauri/tauri.conf.json','src-tauri/capabilities/main.json']:
  json.loads((root/path).read_text(encoding='utf8'))
for path in ['frontend/assets/margen.js','dist/assets/margen.js','frontend/assets/margen-170.js','frontend/assets/margen-171.js','frontend/assets/margen-172.js','dist/assets/margen-172.js']:
  subprocess.run(['node','--check',str(root/path)],check=True)
assert (root/'frontend/assets/margen.js').read_bytes()==(root/'dist/assets/margen.js').read_bytes()
assert (root/'frontend/assets/margen.css').read_bytes()==(root/'dist/assets/margen.css').read_bytes()
assert (root/'frontend/assets/margen-172.js').read_bytes()==(root/'dist/assets/margen-172.js').read_bytes()
assert (root/'frontend/assets/margen-172.css').read_bytes()==(root/'dist/assets/margen-172.css').read_bytes()
assert b'\x00\x00\x01\x00'==(root/'src-tauri/icons/icon.ico').read_bytes()[:4]
src=(root/'frontend/assets/margen.js').read_text()
assert src.count('start();')>=1
assert 'desktop_save_records' in src and 'desktop_load_records' in src
assert 'MARGEN_CONFLICT' in src
assert 'desktop_export_backup' in src
html=(root/'frontend/index.html').read_text()
assert '<script src="./assets/margen.js" defer></script>' in html
assert '<script>' not in html
cfg=json.loads((root/'src-tauri/tauri.conf.json').read_text())
assert cfg['build']['frontendDist']=='../dist'
assert cfg['app']['withGlobalTauri'] is True
assert cfg['bundle']['targets']==['nsis']
assert (root/'.github/workflows/build-windows.yml').exists()
print('OK: JSON, JavaScript, archivos, icono, puente Tauri y workflow.')

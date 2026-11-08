"""Comprobaciones estáticas de entrega para MARGEN 1.12.1 R3.
No necesita navegador y puede ejecutarse en GitHub Actions antes de compilar.
"""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]

def read(rel): return (root/rel).read_text('utf8')

pkg=json.loads(read('package.json'))
conf=json.loads(read('src-tauri/tauri.conf.json'))
cargo=read('src-tauri/Cargo.toml')
index=read('frontend/index.html')
js=read('frontend/assets/margen-121.js')
css=read('frontend/assets/margen-121.css')
editor_js=read('frontend/assets/margen-112.js')
editor_css=read('frontend/assets/margen-112.css')
workflow=read('.github/workflows/build-windows.yml')

assert pkg['version']=='1.12.1'
assert conf['version']=='1.12.1'
assert re.search(r'^version\s*=\s*"1\.12\.1"',cargo,re.M)
assert 'margen-121.css' in index and 'margen-121.js' in index
assert '1.12.1' in index

# R3: dos filas horizontales, flecha única, nombre del libro persistente y sin Escritura amplia.
for token in ['m112-toolstack','data-m112-toolbar-toggle','m112-book-name','m1431-wide-tab']:
    assert token in (editor_js+editor_css), token
assert 'm143SwitchStudio=function(enabled){if(enabled)return' in editor_js
assert 'flex-direction:column!important' in editor_css
assert 'data-m112-toolbar="compact"' in editor_css
assert 'min-height:max(690px,calc(100vh - 190px))' in editor_css
assert 'min-width:790px!important' in editor_css

# Pizarra.
for token in ['boardType','m1211BindBoardSelection','m1211-marquee','m1211-resize','m1211-eyedropper','m1211StampOnboarding','stampInstanceId']:
    assert token in js, token
assert '.board-item.m12-locked:after' in css and 'display:none!important' in css

# Fichas / referencias.
for token in ['mainPhotoId','m1211-gallery-scroll','m1211-character-select','m1211-character-ref']:
    assert token in (js+css), token

# Genealogía / relaciones.
for token in ['m1211QuickLinkMenu','m1211-relation-avatar','m1211-family-label','Matrimonio','marriage']:
    assert token in (js+css), token

# Cronología visual.
for token in ['data-m1211-event-color','data-m1211-insert','m1211UndoChronology','m1211BindTimeline','m1211-timeline-insert-row']:
    assert token in js, token

# Corrección del "tic": geometría estable de la zona superior y filas del árbol.
for token in ['m1211-stable-sidebar','.m11-tree-search','.tree-entry']:
    assert token in (js+css), token

# Frontend probado = frontend que compila Tauri.
for rel in ['index.html','assets/margen-112.js','assets/margen-112.css','assets/margen-121.js','assets/margen-121.css','assets/margen-180.js']:
    assert (root/'frontend'/rel).read_bytes()==(root/'dist'/rel).read_bytes(), rel

# El esquema de datos sigue en 1110: 1.12.1 no necesita una migración SQLite.
backend=read('src-tauri/src/lib.rs')
assert '1110' in backend

# Workflow: recupera la receta estable de 1.12.0, sin fijar manualmente una CLI inexistente.
assert 'run: npm install' in workflow
assert '@tauri-apps/cli@2.10.4' not in workflow
assert '@tauri-apps/cli@2.12.4' not in workflow
assert '$max = 3' in workflow and 'npm run tauri build -- --bundles nsis' in workflow
assert 'MARGEN-1.12.1-Windows-x64' in workflow
assert 'python pruebas/test_1121_release_static.py' in workflow

print('PASS 1.12.1 R3 release static')

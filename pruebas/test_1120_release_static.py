"""MARGEN 1.12.0: comprobaciones estáticas de la beta antes de compilar Windows."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
package=json.loads((root/'package.json').read_text('utf8'))
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
index=(root/'frontend/index.html').read_text('utf8')
js=(root/'frontend/assets/margen-112.js').read_text('utf8')
lex=(root/'frontend/assets/margen-173.js').read_text('utf8')
base=(root/'frontend/assets/margen.js').read_text('utf8')
tour=(root/'frontend/assets/margen-171.js').read_text('utf8')
css=(root/'frontend/assets/margen-112.css').read_text('utf8')
export=(root/'frontend/assets/margen-180.js').read_text('utf8')
workflow=(root/'.github/workflows/build-windows.yml').read_text('utf8')
assert package['version']=='1.12.0'
assert conf['version']=='1.12.0' and conf['identifier']=='com.margen.escritorio'
assert 'margen-112.css' in index and 'margen-112.js' in index and '1.12.0' in index
for needle in ['documentTitle','titleLayout','m112-clear-format','m112-toolbar-toggle','m112-wide-zoom','insertHTML','m112-toolstack','m112BeginSidebarRename']:
    assert needle in js,needle
assert '--chapter-margin' in css and 'm112-toolstack' in css and 'm112-tree-rename' in css
assert 'm112-head-emptied' not in css and 'm112-internal-chapter' not in css
for needle in ['m173Replacement','m173CaptureReplacement','data-m173-replace','m173-replace-chip']:
    assert needle in lex,needle
assert 'm180-screenplay-preview' in export and 'm180-screenplay-preview' in css
assert "['#m161-sheets-button','.m161-right-tools'" in tour
# El diccionario base ya no genera el botón Escritorio; no se corrige a posteriori.
dict_start=base.index('function dictionaryHtml')
dict_end=base.index('function wireDictionary',dict_start)
assert 'data-action="desk"' not in base[dict_start:dict_end]
for needle in ['visibleTitle','m112-preview-prev','script-dialogue','script-character','titleAlign','w:color w:val="000000"']:
    assert needle in export,needle
assert 'python pruebas/test_1120_release_static.py' in workflow
assert 'MARGEN-1.12.0-Windows-x64' in workflow
assert 'herramientas_lexicas.py --verify' in workflow
assert 'cargo test --manifest-path src-tauri/Cargo.toml' in workflow
print('PASS static 1.12.0: editor, títulos, exportación, diccionario y workflow')

"""MARGEN 1.10: el instalador no puede omitir silenciosamente las bases léxicas."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
resources=conf['bundle']['resources']
required={
 'resources/lexicons/english.sqlite3',
 'resources/lexicons/spanish-synonyms.sqlite3',
 'resources/lexicons/spanish-definitions-CC-BY-SA.sqlite3',
 'resources/lexicons/SOURCE_MANIFEST.json',
}
assert required.issubset(set(resources)),(required,set(resources))
assert not any(x=='resources/lexicons/*' for x in resources),'No usar glob silencioso para las bases'
workflow=(root/'.github/workflows/build-windows.yml').read_text('utf8')
build=workflow.index('python herramientas_lexicas.py --build')
verify=workflow.index('python herramientas_lexicas.py --verify')
package=workflow.index('npm run tauri build -- --bundles nsis')
assert build<verify<package
script=(root/'herramientas_lexicas.py').read_text('utf8')
for needle in ['def run_verify()',"PRAGMA quick_check",'english.sqlite3','spanish-synonyms.sqlite3','spanish-definitions-CC-BY-SA.sqlite3']:
 assert needle in script,needle
print('PASS 1.10 lexicons: generación, verificación y recursos obligatorios antes del instalador')

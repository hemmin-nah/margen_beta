"""Regresión 1.7.2: confirmación real, cancelar, ámbito de sellos,
mensajes bilingües, cierre por Escape, foco y títulos no redundantes.
Se ejecuta con Chromium + puente Tauri simulado: NO valida el exe Windows.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text(encoding='utf8')
asset_names=['margen','margen-170','margen-171','margen-172']
css='\n'.join((r/'frontend/assets'/f'{x}.css').read_text(encoding='utf8') for x in asset_names)
js='\n'.join((r/'frontend/assets'/f'{x}.js').read_text(encoding='utf8') for x in asset_names)
mock="""
window.__mockDb={records:{}, saves:0};
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 const d=window.__mockDb;
 if(cmd==='desktop_load_records')return structuredClone(d.records);
 if(cmd==='desktop_save_records'){
  const prev=d.records['workspace-meta']?.token||null;
  if(args.expectedToken!==prev)throw Error('MARGEN_CONFLICT');
  if(d.records.workspace){d.records.recovery=structuredClone(d.records.workspace);d.records['recovery-meta']={token:prev}}
  d.records.workspace=structuredClone(args.snapshot);
  const token='t'+(++d.saves);d.records['workspace-meta']={token};
  return {token,recoveryAvailable:!!d.records.recovery};
 }
 if(cmd==='desktop_export_backup')return 'C:/Users/Test/Downloads/MARGEN.json';
 throw Error(cmd);
}}};
"""
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^\"]+">','',html)
html=re.sub(r'<script src="\./assets/[^\"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style><style>*{scroll-behavior:auto!important}</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':800})
 errors=[];native=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda e:(native.append(e.type),e.dismiss()))
 page.set_content(html,wait_until='load');page.wait_for_timeout(230)
 page.locator('[data-m170-intro-go]').click();page.locator('[data-m145-save]').click();page.wait_for_timeout(80)
 page.locator('[data-m170-not-now]').click()
 # Simplificación de títulos: Planificación > Escaletas era redundante.
 page.evaluate('''() => {const p=activeProject();if(!p.outlines.length)p.outlines.push({id:'out-test',title:'Mi escaleta',scenes:[],blocks:[]});state.activeOutlineId=p.outlines[0].id;state.view='outlines';render();}''')
 assert page.locator('.workspace-head h1').count()==0
 assert 'PLANIFICACIÓN' in page.locator('.workspace-head').inner_text().upper() or 'PLANNING' in page.locator('.workspace-head').inner_text().upper()
 page.evaluate('''() => {state.view='manuscript';const p=activeProject();if(!p.chapters.length)p.chapters=[{id:'demo',title:'Capítulo de prueba',html:'<p>Escribe aquí</p>',mode:'prose'}];state.activeChapterId=p.chapters[0].id;render()}''')
 previous=page.evaluate('activeProject().chapters.length')
 # Probar una confirmación real, disparada por la acción del programa.
 page.evaluate('''() => {const btn=document.createElement('button');btn.dataset.action='delete-chapter';btn.id='test-delete-chapter';document.body.append(btn);btn.addEventListener('click',onAction);btn.click()}''')
 assert page.locator('[data-m172-dialog]').count()==1
 assert 'Capítulo' in page.locator('#m172-dialog-message').inner_text()
 assert page.locator('.m172-dialog').get_attribute('role')=='alertdialog'
 assert page.evaluate('document.activeElement.hasAttribute("data-m172-cancel")')
 page.locator('[data-m172-cancel]').click()
 assert page.locator('[data-m172-dialog]').count()==0
 assert page.evaluate('activeProject().chapters.length')==previous
 page.locator('#test-delete-chapter').click()
 page.locator('[data-m172-accept]').click()
 page.wait_for_timeout(70)
 assert page.evaluate('activeProject().chapters.length')==previous-1
 # Escape no puede ejecutar una eliminación.
 page.evaluate('''() => {m172Confirm('¿Eliminar «Ejemplo»?').then(value=>window.__escaped=value)}''')
 page.keyboard.press('Escape');page.wait_for_timeout(50)
 assert page.evaluate('window.__escaped') is False
 # Pregunta con dos opciones: sello global o libro. Cancelar es SOLO LIBRO.
 page.evaluate("() => {m172Confirm('¿Usar este sello en todos tus libros? Aceptar = global. Cancelar = solo este libro.').then(x=>window.__scope=x)}")
 assert page.locator('[data-m172-cancel]').inner_text()=='Solo este libro'
 assert page.locator('[data-m172-accept]').inner_text()=='Todos mis libros'
 page.locator('[data-m172-cancel]').click()
 assert page.evaluate('window.__scope') is False
 # Aviso bilingüe dentro de la aplicación, no diálogo de Chromium.
 page.evaluate("() => {m172Notice('Copia guardada en:\\nC:/Descargas/archivo.json')}")
 assert 'C:/Descargas/archivo.json' in page.locator('#m172-dialog-message').inner_text()
 page.screenshot(path=str(r/'pruebas/MARGEN_172_Aviso_ES.png'))
 page.locator('[data-m172-accept]').click()
 page.evaluate("() => {m145Prefs().language='en';render();m172Confirm('¿Eliminar «Alicia»?')}")
 assert page.locator('#m172-dialog-title').inner_text()=='Confirm deletion'
 assert page.locator('#m172-dialog-message').inner_text()=='Delete “Alicia”?'
 assert page.locator('[data-m172-accept]').inner_text()=='Delete'
 page.screenshot(path=str(r/'pruebas/MARGEN_172_Delete_EN.png'))
 page.locator('[data-m172-cancel]').click()
 # Diálogo de restauración y su cancelación deben mantener libros intactos.
 before=page.evaluate('JSON.stringify(state.projects)')
 page.evaluate("() => {m172Confirm('Replace current books with this JSON backup? Export your current books first if you wish to keep them.').then(x=>window.__restore=x)}")
 page.locator('[data-m172-cancel]').click()
 assert page.evaluate('window.__restore') is False
 assert page.evaluate('JSON.stringify(state.projects)')==before
 # El título de la escapeta también se mantiene limpio en inglés.
 page.evaluate("() => {state.view='outlines';render()}")
 assert page.locator('.workspace-head h1').count()==0
 # No se deben abrir diálogos nativos.
 assert not native,native
 assert not errors,errors
 print('PASS: delete cancel/accept, ESC, stamp scope, ES/EN, notice, restore cancel, outlines heading; no native dialogues')
 b.close()

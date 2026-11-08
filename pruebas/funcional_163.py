"""MARGEN 1.6.3 — pruebas de interfaz usando WebView Chromium y puente Tauri SIMULADO.
NO sustituyen el compilador Rust ni el test del instalador Windows.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(r/'frontend/assets/margen.css').read_text()+'</style>')
fake="""window.__TAURI__={core:{invoke:async function(cmd,args={}){
if(cmd==='desktop_load_records')return {};
if(cmd==='desktop_save_records')return {token:'t1',recoveryAvailable:false};
if(cmd==='desktop_export_backup')return 'C:/Users/test/Downloads/margen.json';
throw Error(cmd)}}};"""
html=html.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+(r/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1600,'height':940});errors=[]
 page.on('pageerror',lambda e:(print('JS ERROR',str(e)),errors.append(str(e))))
 page.set_content(html,wait_until='load');page.wait_for_timeout(450)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 ev=lambda js:page.evaluate(js)
 assert ev("document.querySelector('.brand .m11-version')?.textContent")=='1.6.4 · Desktop'
 ev("() => {state.view='manuscript';state.activeChapterId=activeProject().chapters[0].id;render()}")
 assert page.locator('.m163-editor-head .m163-writing-type').count()==1
 assert page.locator('.m163-editor-head>.head-actions .screenplay-mode-switch').count()==0
 assert page.locator('.m163-editor-head .m142-view-switch button').count()==3
 assert page.locator('.m163-editor-head>.head-actions [data-action=export-text]').count()==1
 assert page.locator('#m161-sheets-button').count()==1
 page.screenshot(path=str(r/'pruebas/MARGEN_163_Editor.png'))
 print('Editor: barra izquierda + exportar derecha: OK')
 ev("() => {activeChapter().mode='screenplay';render()}")
 assert page.locator('#m161-refs-button + #m161-sheets-button').count()==1
 assert page.locator('.screenplay-area .editor-toolbar button').filter(has_text='Fichas').count()==0
 page.locator('#m161-sheets-button').click();assert page.locator('.m162-sheet-panel').count()==1
 page.locator('#m161-sheets-button').click();assert page.locator('.m162-sheet-panel').count()==0
 print('Guion: fichas al lado de referencias, sin duplicados: OK')
 ev("() => {activeChapter().mode='prose';render();m143SwitchStudio(true)}")
 assert page.locator('#m143-refs').count()==0
 assert page.locator('#m161-sheets-button').count()==1
 page.locator('#m161-sheets-button').click();assert page.locator('.m162-sheet-panel').count()==1
 ev("m143SwitchStudio(false)")
 print('Escritura amplia: un solo acceso a fichas: OK')
 ev("() => {const p=activeProject();state.view='boards';state.activeBoardId=p.boards[0].id;activeBoard().diagramMode='genealogy'; const g=activeBoard().graphs.genealogy;g.nodes=[];g.edges=[];g.dismissedSuggestions=[];render()}")
 # A = madre, B = hijo, C = nuevo esposo, D = abuela
 ev("""() => {const g=m122Graph();g.nodes=[
{id:'a',name:'Alice',x:780,y:300,characterId:''},
{id:'b',name:'Ben',x:980,y:630,characterId:''},
{id:'c',name:'Charles',x:1070,y:300,characterId:''},
{id:'d',name:'Dorothy',x:440,y:0,characterId:''}];
g.edges=[{id:'a-b',from:'a',to:'b',type:'parent'}, {id:'d-a',from:'d',to:'a',type:'parent'}, {id:'a-c',from:'a',to:'c',type:'partner'}];
m122Draw();m122Inspector();}""")
 assert ev('m163Pending(m122Graph()).length')==1
 assert ev("m163Derived(m122Graph(),'b').grandparents.has('d')")
 assert page.locator('.m163-pending-heading').count()==1
 assert page.locator('.m163-preview-line').count()==1
 ev('() => {m163FitGraph();m122Draw();m122Inspector()}')
 page.screenshot(path=str(r/'pruebas/MARGEN_163_Confirmacion.png'))
 assert page.locator('.m163-family-line').count()>0
 assert not ev("m122Graph().edges.some(e=>e.from==='c'&&e.to==='b')")
 print('Genealogía: sugerencia NO crea parentesco sin confirmar y calcula abuelos: OK')
 page.locator('[data-m163-type]').select_option('step_parent')
 page.locator('[data-m163-confirm]').click()
 assert ev("m122Graph().edges.some(e=>e.from==='c'&&e.to==='b'&&e.type==='step_parent'&&e.reviewed)")
 assert ev('m163Pending(m122Graph()).length')==0
 print('Genealogía: confirmar como padrastro: OK')
 ev("() => {const g=m122Graph();g.edges=g.edges.filter(e=>e.id!=='a-c');g.edges.push({id:'c-a',from:'c',to:'a',type:'partner'});m122Draw();m122Inspector()}")
 assert ev('m163Pending(m122Graph()).length')==0
 # Sugerencia nueva -> descartar y recordar
 ev("() => {const g=m122Graph();g.edges=g.edges.filter(e=>e.type!=='step_parent');m122Draw();m122Inspector()}")
 assert ev('m163Pending(m122Graph()).length')==1
 page.locator('[data-m163-dismiss]').click()
 assert ev('m163Pending(m122Graph()).length')==0
 assert ev('m122Graph().dismissedSuggestions.length')==1
 print('Genealogía: descartar sugerencia y mantener estado: OK')
 # Foto y organización
 ev("""() => {const p=activeProject();p.characters.push({id:'p-a',title:'Alice',gallery:[{id:'photo',src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOuhmZ0AAAAASUVORK5CYII='}]});m122Graph().nodes[0].characterId='p-a';m122Organize()}""")
 assert page.locator('#m122-nodes [data-m122-node=a] .m122-avatar img').count()==1
 assert ev("m122Graph().nodes.find(n=>n.id==='b').y>m122Graph().nodes.find(n=>n.id==='a').y")
 print('Genealogía: foto de ficha y generaciones: OK')
 # Supr NO modifica una nota; elimina tarjeta tras confirmación
 ev("() => {m122Selection={kind:'node',id:'d'};m122Draw();m122Inspector()}")
 page.once('dialog',lambda d:d.accept())
 page.keyboard.press('Delete')
 assert not ev("m122Graph().nodes.some(n=>n.id==='d')")
 print('Genealogía: Supr elimina tarjeta seleccionada con confirmación: OK')
 # Relaciones: puntos, flecha y más espacio
 ev("""() => {activeBoard().diagramMode='relations';const g=m122Graph();g.nodes=[{id:'x',name:'Xavier',x:500,y:500},{id:'y',name:'Yara',x:850,y:600},{id:'z',name:'Zoe',x:1100,y:780}];g.edges=[{id:'x-y',from:'x',to:'y',type:'mentor',direction:'forward'}];render()}""")
 assert page.locator('.m122-diagram-viewport.relations').count()==1
 assert page.locator('.m163-line').count()==1
 ev('m122Organize()')
 assert ev("Math.abs(m122Graph().nodes[0].x-m122Graph().nodes[1].x)>200")
 ev("() => {m122Selection={kind:'node',id:'z'};m122Draw();m122Inspector()}")
 page.once('dialog',lambda d:d.accept());page.keyboard.press('Delete')
 assert not ev("m122Graph().nodes.some(n=>n.id==='z')")
 page.screenshot(path=str(r/'pruebas/MARGEN_163_Relaciones.png'))
 print('Relaciones: puntos, flechas y Supr: OK')
 ev("() => {activeBoard().diagramMode='genealogy';render();m122Selection={kind:'node',id:'a'};m122Draw();m122Inspector()}")
 page.screenshot(path=str(r/'pruebas/MARGEN_163_Genealogia.png'))
 assert not errors,errors
 browser.close()
 print('PRUEBAS 1.6.3 SUPERADAS (Chromium simulado; NO compilación Windows)')

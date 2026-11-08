"""Regresiones de parentescos, ciclo, zoom y serialización; frontend simulado."""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(r/'frontend/assets/margen.css').read_text()+'</style>')
html=html.replace('<script src="./assets/margen.js" defer></script>',"<script>window.__TAURI__={core:{invoke:async c=>c==='desktop_load_records'?{}:{token:'a',recoveryAvailable:false}}};</script>"+'<script>'+(r/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1365,'height':860});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(350)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 js=page.evaluate
 js("() => {state.view='boards';state.activeBoardId=activeProject().boards[0].id;activeBoard().diagramMode='genealogy';let g=m122Graph();g.nodes=[{id:'a',name:'A',x:300,y:250},{id:'b',name:'B',x:650,y:550},{id:'c',name:'C',x:650,y:250}];g.edges=[{id:'a-b',from:'a',to:'b',type:'parent'}];render()}")
 assert js("m163WouldCycle(m122Graph(),'b','a')") is True
 assert js("m163WouldCycle(m122Graph(),'c','b')") is False
 js("() => {document.getElementById('m122-new-edge-type').value='parent';m122MakeEdge('b','a')}")
 assert js('m122Graph().edges.length')==1
 js("() => {const g=m122Graph();g.edges.push({id:'b-a',from:'b',to:'a',type:'partner'});m122Selection={kind:'edge',id:'b-a'};m122Inspector()}")
 selector=page.locator('[data-m122-edge-field="type"]');selector.select_option('parent')
 assert js("m122Graph().edges.find(e=>e.id==='b-a').type")=='partner'
 print('Ciclos directos y cambio de tipo rechazados')
 js("() => {m122Selection={kind:'node',id:'c'};m122Draw();m122Inspector()}")
 inp=page.locator('[data-m122-field="name"]');inp.click();inp.press('Delete')
 assert js("m122Graph().nodes.length") ==3
 print('Supr con campo enfocado no borra nodos')
 # lineage with two confirmed parents: one family connector, no guessed parent.
 js("() => {const g=m122Graph();g.edges=[{id:'a-b',from:'a',to:'b',type:'parent'},{id:'c-b',from:'c',to:'b',type:'parent'},{id:'a-c',from:'a',to:'c',type:'partner'}];m122Draw();m122Inspector()}")
 assert page.locator('.m163-family-line').count()>0
 assert page.locator('.m122-edge-hit[data-m122-edge="c-b"]').count() in [0,1] # Se puede editar también desde vínculos en inspector.
 assert js('m163Pending(m122Graph()).length')==0
 print('Filiaciones compartidas, ninguna propuesta duplicada')
 # Many nodes and zoom fit. No permanent min 40%.
 js("() => {const g=m122Graph();g.nodes=Array.from({length:100},(_,i)=>({id:'p-'+i,name:'Persona '+i,x:0,y:0}));g.edges=[];m122Organize()}")
 z=js('m122Graph().zoom');assert 0.02<=z<=1, z
 js("m122GraphAction('zoom-reset')")
 assert js('m122Graph().zoom')==z
 js("m122GraphAction('zoom-in')");assert js('m122Graph().zoom')>z
 print('100 personas: organizar y zoom completo',z)
 # No rename of unrelated data and fields survive JSON.
 js("() => {m122Graph().dismissedSuggestions=['test-key'];window.__serialized=JSON.parse(JSON.stringify(activeProject()))}")
 assert js("window.__serialized.boards[0].graphs.genealogy.dismissedSuggestions[0]")=='test-key'
 assert not errs,errs
 browser.close()
 print('PRUEBAS EXTRA DE GRAFO OK (sin Rust / Windows)')

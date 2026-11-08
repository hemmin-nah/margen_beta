"""Pruebas 1.6.4 con Chromium y puente desktop SIMULADO. No compila Windows."""
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
 page=browser.new_page(viewport={'width':1520,'height':960})
 errors=[]
 page.on('pageerror',lambda e:(print('ERROR',str(e)),errors.append(str(e))))
 page.set_content(html,wait_until='load');page.wait_for_timeout(550)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 ev=lambda js:page.evaluate(js)
 assert ev("document.querySelector('.brand .m11-version')?.textContent")=='1.6.5 · Desktop'
 # Genealogía: Basilio con Antonieta y Pomelo, Gunther como hermano.
 ev("""() => {const p=activeProject();state.view='boards';state.activeBoardId=p.boards[0].id;const b=activeBoard();b.diagramMode='genealogy';const g=b.graphs.genealogy;g.nodes=[
 {id:'a',name:'Antonieta',x:540,y:130},{id:'p',name:'Pomelo',x:850,y:130},
 {id:'b',name:'Basilio',x:710,y:490},{id:'g',name:'Gunther',x:1060,y:490}];
 g.edges=[{id:'a-b',from:'a',to:'b',type:'parent'},{id:'p-b',from:'p',to:'b',type:'parent'}];g.dismissedSuggestions=[];render();}""")
 assert page.locator('.m164-resize-handle').count()==1
 assert int(ev("parseInt(document.querySelector('.m122-diagram-aside').style.width)"))>=255
 # Ensanchar arrastrando realmente el separador izquierdo del inspector.
 handle=page.locator('.m164-resize-handle').bounding_box()
 original=ev("parseInt(document.querySelector('.m122-diagram-aside').style.width)")
 page.mouse.move(handle['x']+4,handle['y']+180)
 page.mouse.down()
 page.mouse.move(handle['x']-86,handle['y']+180,steps=8)
 page.mouse.up()
 wide=ev("parseInt(document.querySelector('.m122-diagram-aside').style.width)")
 assert wide>=original+70,(original,wide)
 print('Inspector redimensionable con ratón: OK', original,'→',wide)
 ev("""() => {const g=m122Graph();g.edges.push({id:'b-g',from:'b',to:'g',type:'sibling'});m122Remember();m122Draw();m122Inspector()}""")
 pending=ev("m163Pending(m122Graph()).filter(s=>s.kind==='sibling').map(s=>({key:s.key,partner:s.partner,child:s.child}))")
 assert {x['partner'] for x in pending}=={'a','p'},pending
 assert len(pending)==2,pending
 assert page.locator('.m163-suggestion[data-m163-proposal^="sib|"]').count()==2
 assert 'Gunther' in page.locator('.m163-suggestion[data-m163-proposal^="sib|"] p').first.inner_text()
 print('Genealogía: 2 progenitores sugeridos, sin enlaces automáticos: OK')
 page.screenshot(path=str(r/'pruebas/MARGEN_165_Regression_Genealogia.png'))
 # Confirmar solo Antonieta, Pomelo queda pendiente
 page.locator('[data-m163-confirm="sib|a|g"]').click()
 assert ev("m122Graph().edges.some(e=>e.from==='a'&&e.to==='g'&&e.type==='parent')")
 assert not ev("m122Graph().edges.some(e=>e.from==='p'&&e.to==='g'&&e.type==='parent')")
 assert page.locator('[data-m163-confirm="sib|p|g"]').count()==1
 # Ctrl-Z (foco fuera de textarea); desaparece la confirmación
 page.locator('.m122-diagram-bar').click(position={'x':20,'y':7},force=True)
 page.keyboard.press('Control+z')
 assert not ev("m122Graph().edges.some(e=>e.from==='a'&&e.to==='g'&&e.type==='parent')")
 page.keyboard.press('Control+y')
 assert ev("m122Graph().edges.some(e=>e.from==='a'&&e.to==='g'&&e.type==='parent')")
 print('Genealogía: confirmar individual, Ctrl+Z/Ctrl+Y: OK')
 ev("() => {m122Selection={kind:'node',id:'g'};m122Draw();m122Inspector()}")
 page.locator('#m122-viewport').click(position={'x':12,'y':12},force=True)
 ev("() => {m122Selection={kind:'node',id:'g'};m122Draw();m122Inspector()}")
 page.once('dialog',lambda d:d.accept())
 page.keyboard.press('Delete')
 assert not ev("m122Graph().nodes.some(n=>n.id==='g')")
 page.keyboard.press('Control+z')
 assert ev("m122Graph().nodes.some(n=>n.id==='g')")
 print('Eliminar nodo + Ctrl+Z recupera relaciones: OK')
 # Relaciones undo
 ev("""() => {activeBoard().diagramMode='relations';const g=m122Graph();g.nodes=[{id:'x',name:'X',x:500,y:500},{id:'y',name:'Y',x:700,y:550}];g.edges=[];render()}""")
 ev("""() => {m122Graph().edges.push({id:'x-y',from:'x',to:'y',type:'friend'});m122Remember();m122Draw();m122Inspector()}""")
 page.locator('.m122-diagram-bar').click(position={'x':20,'y':7},force=True)
 page.keyboard.press('Control+z')
 assert not ev("m122Graph().edges.some(e=>e.id==='x-y')")
 page.keyboard.press('Control+y')
 assert ev("m122Graph().edges.some(e=>e.id==='x-y')")
 print('Relaciones: Ctrl+Z/Ctrl+Y: OK')
 # Personaje vinculado, Vínculos + evolución
 ev("""() => {const p=activeProject();p.characters.push({id:'c1',title:'Antonieta',gallery:[],arc:[{id:'arc1',stage:'Cambio',change:'No confía',expanded:false}],chapterIds:[],background:'Su infancia'});p.characters.push({id:'c2',title:'Basilio',gallery:[],arc:[],chapterIds:[]});
 const g=activeBoard().graphs.relations;g.nodes[0].characterId='c1';g.nodes[1].characterId='c2';state.view='characters';state.activeCharacterId='c1';render();}""")
 assert page.locator('.m164-links-card').count()==1
 assert page.locator('.m164-link-button').filter(has_text='Basilio').count()==1
 assert page.locator('.m164-evolution').count()==1
 assert not page.locator('.m164-evolution').evaluate('(el)=>el.open')
 page.locator('.m164-evolution>summary').click()
 assert page.locator('.m164-evolution').evaluate('(el)=>el.open')
 page.screenshot(path=str(r/'pruebas/MARGEN_165_Regression_Personaje.png'))
 print('Personajes: vínculos y evolución plegable: OK')
 # Escaleta campos temporales y plegado objetivos
 ev("""() => {const p=activeProject();if(!p.outlines.length)p.outlines.push({id:'o164',title:'Trama',blocks:[],scenes:[],presentation:'list'});state.view='outlines';state.activeOutlineId=p.outlines[0].id;const o=activeOutline();o.scenes=[{id:'sc164',title:'Primera escena',description:'Una historia',blockId:'',status:'idea',characterIds:[],settingIds:[],expanded:true,goal:'Escapar',conflict:'Puerta cerrada',consequence:'Retraso'}];render()}""")
 assert page.locator('[data-m164-add-temp="temporarySettings"]').count()==1
 assert page.locator('[data-m164-add-temp="temporaryCharacters"]').count()==1
 assert page.locator('.m164-scene-planning').count()==1
 assert not page.locator('.m164-scene-planning').evaluate('(el)=>el.open')
 inp=page.locator('[data-m164-temp-input="temporarySettings"]');inp.fill('Aeropuerto');inp.press('Enter')
 assert ev("activeOutline().scenes[0].temporarySettings.includes('Aeropuerto')")
 assert page.locator('.m164-temp-tag').filter(has_text='Aeropuerto').count()==1
 page.locator('.m164-scene-planning summary').click()
 assert page.locator('.m164-scene-planning').evaluate('(el)=>el.open')
 assert ev("activeOutline().scenes[0].goal")=='Escapar'
 page.screenshot(path=str(r/'pruebas/MARGEN_165_Regression_Escaleta.png'))
 print('Escaletas: temporales, conservar campos y plegar: OK')
 # Cronología múltiple y referencias
 ev("""() => {const p=activeProject();p.chronologies=p.chronologies||[];p.chronologies.push({id:'t164',title:'Cronología',events:[{id:'e164',title:'Encuentro',date:'Día 1',description:'Se ven',characterId:'c1',expanded:true}]});state.activeChronologyId='t164';state.view='chronologies';render()}""")
 assert page.locator('[data-m164-time-person="e164"]').count()==2
 page.locator('[data-m164-time-person="e164"][value="c2"]').check()
 assert ev("activeChronology().events[0].characterIds.includes('c2')")
 assert ev("m146RefIndex(activeProject()).some(r=>r.targetId==='c2'&&r.sourceId==='e164')")
 assert page.locator('.m131-time-heading .m164-chrono-description').count()==1
 page.screenshot(path=str(r/'pruebas/MARGEN_165_Regression_Cronologia.png'))
 print('Cronología: selección múltiple, referencias y cabecera: OK')
 # DOCX: estilo negro explícito no debe ser ilegible en oscuro
 ev("""() => {state.view='manuscript';activeChapter().html='<p><span style="color: #000000"><b>Texto negro</b></span> <span style="color: #ff0000">Texto rojo</span></p>';state.theme='dark';render();}""")
 blk=page.locator('#chapter-editor span').first
 assert blk.count()==1
 color=blk.evaluate('(el)=>getComputedStyle(el).color')
 red=page.locator('#chapter-editor span').nth(1).evaluate('(el)=>getComputedStyle(el).color')
 assert color!='rgb(0, 0, 0)',color
 assert red==color, (red,color)
 print('DOCX: tinta uniforme oscuro, HTML original sin cambios: OK')
 assert not errors,errors
 browser.close()
 print('PRUEBAS 1.6.5 (regresion 164) SUPERADAS — puente Tauri simulado, sin compilación Windows')

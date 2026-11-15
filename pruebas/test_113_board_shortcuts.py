"""MARGEN 1.13: pizarra virtual, trazos movibles, historial y atajos."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text('utf8')
# Respeta exactamente el orden real del index.
css_names=re.findall(r'<link rel="stylesheet" href="\./assets/([^"]+\.css)">',html)
js_names=re.findall(r'<script src="\./assets/([^"]+\.js)" defer></script>',html)
css='\n'.join((root/'frontend/assets'/n).read_text('utf8') for n in css_names)
js='\n'.join((root/'frontend/assets'/n).read_text('utf8') for n in js_names)
book={'id':'a','name':'LAPSUS','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'Capítulo 1','documentTitle':'1. La tormenta','html':'<p>Texto.</p>','mode':'prose'}],
'characters':[],'settings':[],'outlines':[],'chronologies':[],'notes':[],
'boards':[{'id':'b1','title':'Ideas','background':'dots','zoom':1,'panX':-790,'panY':-520,'diagramMode':'free','boardType':'free','elements':[{'id':'n1','type':'note','x':920,'y':760,'w':220,'h':160,'title':'Idea','text':'Texto','color':'cream'}],'strokes':[{'id':'free1','color':'#222222','width':5,'points':[{'x':1250,'y':820},{'x':1320,'y':880}]}],'graphs':{}}]}
state={'version':1,'theme':'light','view':'boards','activeProjectId':'a','activeChapterId':'a1','activeBoardId':'b1','projects':[book],'m145':{'language':'es','theme':'light','accent':'sage','workspace':'complete','onboarded':True}}
health={'ok':True,'appVersion':'1.13.0','dbSchema':1123,'previousUnclean':False,'recoveryAvailable':False,'backupCount':1,'latestBackup':'','resources':[],'issues':[]}
support={'appVersion':'1.13.0','dataDirectory':'C:/MARGEN','databaseSize':100,'dbSchema':1123,'backupCount':1,'latestBackup':'','legalText':'Licencias'}
mock=f'''window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{
 if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}};
 if(cmd==='desktop_load_book')return structuredClone({json.dumps(book)});if(cmd==='desktop_load_cover')return null;
 if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};
 if(cmd==='desktop_startup_health')return {json.dumps(health)};if(cmd==='desktop_support_info')return {json.dumps(support)};
 if(cmd==='desktop_log_error'||cmd==='desktop_mark_clean_shutdown')return null;if(cmd==='lexical_lookup')return {{query:args.term,definitions:[],synonymGroups:[]}};return null;
}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1500,'height':900}); page.set_default_timeout(5000); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(900)
 page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-guide-backdrop,.modal-backdrop,.m111-backdrop').forEach(x=>x.remove())")
 page.evaluate("()=>{state.view='boards';state.activeProjectId='a';state.activeBoardId='b1';ensureSelections();render()}");page.wait_for_timeout(180)
 # Migración a lienzo virtual mantiene contenido pero lo sitúa lejos de los bordes.
 assert page.evaluate("activeBoard().m113Infinite") is True
 assert page.evaluate("activeBoard().elements[0].x")>5000
 assert page.locator('#board-world').evaluate("e=>getComputedStyle(e).width")=='20000px'
 # Atajos de herramienta y dibujo real dentro del historial estructural.
 page.keyboard.press('b'); assert page.evaluate('boardTool')=='pen'
 vpbox=page.locator('#board-viewport').bounding_box(); stroke_count=page.evaluate('activeBoard().strokes.length')
 page.mouse.move(vpbox['x']+360,vpbox['y']+300);page.mouse.down();page.mouse.move(vpbox['x']+430,vpbox['y']+335,steps=8);page.mouse.up();page.wait_for_timeout(60)
 assert page.evaluate('activeBoard().strokes.length')==stroke_count+1
 page.keyboard.press('Control+z');page.wait_for_timeout(70);assert page.evaluate('activeBoard().strokes.length')==stroke_count
 page.keyboard.press('Control+y');page.wait_for_timeout(70);assert page.evaluate('activeBoard().strokes.length')==stroke_count+1
 # Quitamos el trazo de prueba para seguir con el dataset conocido.
 page.keyboard.press('Control+z');page.wait_for_timeout(50)
 page.keyboard.press('v'); assert page.evaluate('boardTool')=='select'
 # Trazo normal seleccionable y movible.
 hit=page.locator('[data-m113-stroke="free1"]'); assert hit.count()==1
 before=page.evaluate("activeBoard().strokes.find(s=>s.id==='free1').points.map(p=>[p.x,p.y])")
 box=hit.bounding_box(); assert box
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']/2+70,box['y']+box['height']/2+35,steps=8);page.mouse.up();page.wait_for_timeout(80)
 moved=page.evaluate("activeBoard().strokes.find(s=>s.id==='free1').points.map(p=>[p.x,p.y])"); assert moved!=before,(before,moved)
 page.keyboard.press('Control+z');page.wait_for_timeout(80)
 restored=page.evaluate("activeBoard().strokes.find(s=>s.id==='free1').points.map(p=>[p.x,p.y])");assert restored==before,(before,moved,restored)
 page.keyboard.press('Control+y');page.wait_for_timeout(80);assert page.evaluate("activeBoard().strokes.find(s=>s.id==='free1').points.map(p=>[p.x,p.y])")!=before
 # Mover nota y deshacer; después borrar y recuperar.
 note=page.locator('.board-item[data-eid="n1"]'); nb=note.bounding_box(); old=page.evaluate("(()=>{const n=activeBoard().elements[0];return [n.x,n.y]})()")
 page.mouse.move(nb['x']+100,nb['y']+100);page.mouse.down();page.mouse.move(nb['x']+155,nb['y']+128,steps=7);page.mouse.up();page.wait_for_timeout(70)
 assert page.evaluate("(()=>{const n=activeBoard().elements[0];return [n.x,n.y]})()")!=old
 page.keyboard.press('Control+z');page.wait_for_timeout(80);assert page.evaluate("(()=>{const n=activeBoard().elements[0];return [n.x,n.y]})()")==old
 handle=page.locator('.board-item[data-eid="n1"] .item-handle'); hb=handle.bounding_box(); page.mouse.click(hb['x']+8,hb['y']+8); page.wait_for_timeout(20); page.keyboard.press('Delete');page.wait_for_timeout(60);assert page.evaluate("!activeBoard().elements.some(x=>x.id==='n1')")
 page.keyboard.press('Control+z');page.wait_for_timeout(80);assert page.evaluate("activeBoard().elements.some(x=>x.id==='n1')")
 # Espacio + arrastrar funciona incluso con lápiz activo.
 page.keyboard.press('b'); beforepan=page.evaluate('[activeBoard().panX,activeBoard().panY]')
 vp=page.locator('#board-viewport').bounding_box();page.keyboard.down('Space');page.mouse.move(vp['x']+500,vp['y']+350);page.mouse.down();page.mouse.move(vp['x']+570,vp['y']+395,steps=6);page.mouse.up();page.keyboard.up('Space');page.wait_for_timeout(60)
 afterpan=page.evaluate('[activeBoard().panX,activeBoard().panY]');assert afterpan!=beforepan,(beforepan,afterpan);assert page.evaluate('boardTool')=='pen'
 # T crea caja de texto.
 n=page.evaluate('activeBoard().elements.length');page.keyboard.press('t');page.wait_for_timeout(60);assert page.evaluate('activeBoard().elements.length')==n+1
 # Conoce MARGEN incluye atajos y abre la pantalla.
 page.locator('.m170-help-btn').click();page.wait_for_timeout(30);assert page.locator('[data-m113-shortcuts-open]').count()==1
 page.locator('[data-m113-shortcuts-open]').click();page.wait_for_timeout(30);assert page.locator('[data-m113-shortcuts]').count()==1;assert page.locator('.m113-shortcuts kbd',has_text='Space + drag').count()+page.locator('.m113-shortcuts kbd',has_text='Espacio + arrastrar').count()>=1
 assert not errors,errors
 b.close()
print('PASS 1.13 board infinite/history/shortcuts')

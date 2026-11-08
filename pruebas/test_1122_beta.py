"""MARGEN 1.12.2: cronología multicolor, historial pizarra, escaleta y libros fijados."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
assets=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101','margen-110','margen-111','margen-112','margen-121','margen-122']
html=(root/'frontend/index.html').read_text('utf8')
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.css').exists())
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.js').exists())
book={'id':'a','name':'Años Oscuros','createdAt':'2026-01-01','pinned':False,
'chapters':[{'id':'c1','title':'Capítulo 1','html':'<p>Texto</p>'}],
'boards':[{'id':'b1','title':'Pizarra','boardType':'free','diagramMode':'free','background':'dots','zoom':1,'panX':0,'panY':0,'elements':[{'id':'n1','type':'note','x':120,'y':120,'w':220,'h':150,'title':'Nota','text':'Texto','color':'#f8ebbf'}],'strokes':[]}],
'characters':[],'settings':[],'notes':[],
'outlines':[{'id':'o1','title':'Escaleta','presentation':'list','blocks':[{'id':'act1','title':'Acto I'}],'foldedBlocks':{},'scenes':[{'id':'s1','title':'Uno','blockId':'act1','description':'','status':'idea','characterIds':[],'settingIds':[],'expanded':True},{'id':'s2','title':'Dos','blockId':'act1','description':'','status':'idea','characterIds':[],'settingIds':[],'expanded':True}]}],
'chronologies':[{'id':'t1','title':'Historia','events':[{'id':'e1','title':'Uno','date':'1820','description':'','color':'#b66f62','characterIds':[]},{'id':'e2','title':'Dos','date':'1830','description':'','color':'#6c876f','characterIds':[]}]}]}
state={'version':1,'theme':'dark','view':'chronologies','activeProjectId':'a','activeChapterId':'c1','activeBoardId':'b1','activeOutlineId':'o1','activeChronologyId':'t1','projects':[book],'m145':{'language':'es','theme':'dark','accent':'sage','workspace':'complete','onboarded':True}}
mock=f'''window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}};if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};if(cmd==='desktop_load_book')return structuredClone({json.dumps(book)});if(cmd==='desktop_startup_health')return {{ok:true,appVersion:'1.12.2',dbSchema:1110,previousUnclean:false,recoveryAvailable:false,resources:[],issues:[]}};if(cmd==='desktop_support_info')return {{appVersion:'1.12.2',dataDirectory:'C:/MARGEN',databaseSize:1,dbSchema:1110,backupCount:0,legalText:''}};return null;}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1500,'height':900});page.set_default_timeout(4000);errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(700)
 page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-tour-backdrop,.modal-backdrop,.m111-backdrop').forEach(x=>x.remove())")
 # Cronología: cambiar e1 y luego seleccionar e2; el segundo picker también debe funcionar.
 page.evaluate("()=>{state.view='chronologies';state.activeChronologyId='t1';m131TimelineSelectedId='e1';render()}");page.wait_for_timeout(100)
 def color(value):
  page.locator('input[data-m1211-event-color]').evaluate("(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}",value);page.wait_for_timeout(40)
 color('#112233');assert page.evaluate("activeChronology().events.find(x=>x.id==='e1').color")=='#112233'
 page.locator('[data-m131-point="e2"] .m131-time-card').click();page.wait_for_timeout(80)
 color('#445566');assert page.evaluate("activeChronology().events.find(x=>x.id==='e2').color")=='#445566'
 assert page.evaluate("activeChronology().events.find(x=>x.id==='e1').color")=='#112233'
 # Pizarra: movimiento físico y borrado deben entrar en el mismo historial.
 page.evaluate("()=>{state.view='boards';state.activeBoardId='b1';render()}");page.wait_for_timeout(100)
 old=page.evaluate("activeBoard().elements[0].x")
 handle=page.locator('.board-item[data-eid="n1"] .item-handle');box=handle.bounding_box()
 page.mouse.move(box['x']+6,box['y']+6);page.mouse.down();page.mouse.move(box['x']+86,box['y']+25,steps=8);page.mouse.up();page.wait_for_timeout(70)
 assert page.evaluate("activeBoard().elements[0].x")!=old
 page.locator('#board-viewport').click(position={'x':15,'y':15});page.keyboard.press('Control+z');page.wait_for_timeout(80)
 assert page.evaluate("activeBoard().elements[0].x")==old
 page.locator('.board-item[data-eid="n1"] .item-handle').click();page.keyboard.press('Delete');page.wait_for_timeout(60)
 assert not page.evaluate("activeBoard().elements.some(x=>x.id==='n1')")
 page.keyboard.press('Control+z');page.wait_for_timeout(80);assert page.evaluate("activeBoard().elements.some(x=>x.id==='n1')")
 # Escaleta: mover + deshacer.
 page.evaluate("()=>{state.view='outlines';state.activeOutlineId='o1';render()}");page.wait_for_timeout(80)
 page.evaluate("m13MoveScene('s2','act1','s1')");page.wait_for_timeout(60);assert page.evaluate("activeOutline().scenes[0].id")=='s2'
 page.locator('[data-m122-outline-undo]').click();page.wait_for_timeout(60);assert page.evaluate("activeOutline().scenes[0].id")=='s1'
 # Biblioteca: fijar libro y persistencia en dato.
 page.evaluate("()=>{state.view='library';render()}");page.wait_for_timeout(100)
 assert page.locator('[data-m122-pin-book="a"]').count()==1
 page.locator('[data-m122-pin-book="a"]').click();page.wait_for_timeout(100);assert page.evaluate("state.projects.find(x=>x.id==='a').pinned") is True
 assert page.locator('.project-card.m122-book-pinned').count()==1
 assert not errs,errs
 b.close()
print('PASS 1.12.2 beta')

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
'boards':[{'id':'b1','title':'Ideas','background':'dots','zoom':1,'panX':-790,'panY':-520,'diagramMode':'free','boardType':'free','elements':[{'id':'n1','type':'note','x':920,'y':760,'w':220,'h':160,'title':'Idea','text':'Texto','color':'cream'},{'id':'n2','type':'image','x':1530,'y':760,'w':220,'h':160,'src':'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}],'strokes':[{'id':'free1','color':'#222222','width':5,'points':[{'x':1250,'y':820},{'x':1320,'y':880}]}],'graphs':{}}]}
state={'version':1,'theme':'light','view':'boards','activeProjectId':'a','activeChapterId':'a1','activeBoardId':'b1','projects':[book],'m145':{'language':'es','theme':'light','accent':'sage','workspace':'complete','onboarded':True}}
health={'ok':True,'appVersion':'1.13.2','dbSchema':1123,'previousUnclean':False,'recoveryAvailable':False,'backupCount':1,'latestBackup':'','resources':[],'issues':[]}
support={'appVersion':'1.13.2','dataDirectory':'C:/MARGEN','databaseSize':100,'dbSchema':1123,'backupCount':1,'latestBackup':'','legalText':'Licencias'}
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
 page=b.new_page(viewport={'width':1500,'height':900});page.set_default_timeout(6000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(700)
 page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-guide-backdrop,.modal-backdrop,.m111-backdrop').forEach(x=>x.remove())")
 page.evaluate("()=>{state.view='boards';state.activeProjectId='a';state.activeBoardId='b1';ensureSelections();render()}");page.wait_for_timeout(160)
 assert page.locator('#board-viewport').count()==1
 assert page.evaluate("document.querySelector('.brand .m11-version')?.textContent")=='1.13.2 · Beta'
 assert page.evaluate('activeBoard().elements.length')==2
 def snapshot():return page.evaluate("()=>({elements:activeBoard().elements.map(x=>({id:x.id,x:x.x,y:x.y,groupId:x.groupId||null})),strokes:activeBoard().strokes.map(s=>({id:s.id,p:s.points.map(p=>[p.x,p.y]),groupId:s.groupId||null}))})")
 def place(sel,x_frac=.5,y_frac=.5):
  r=page.locator(sel).bounding_box();assert r,(sel,'missing bounding')
  return r['x']+r['width']*x_frac,r['y']+r['height']*y_frac
 def drag_point(x,y,dx,dy):
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy,steps=8);page.mouse.up();page.wait_for_timeout(65)
 def click_bg():
  rect=page.locator('#board-viewport').bounding_box();page.mouse.click(rect['x']+rect['width']-75,rect['y']+rect['height']-85);page.wait_for_timeout(40)
 # 1. Al mover un trazo no debe aparecer la marquesina (ni provocar la selección del fondo).
 hit='[data-m113-stroke="free1"]';px,py=place(hit)
 before=snapshot();page.mouse.move(px,py);page.mouse.down();page.mouse.move(px+65,py+33,steps=8)
 assert page.locator('.m1132-marquee,.m1211-marquee').count()==0,'Incorrect marquee while moving a stroke'
 page.mouse.up();page.wait_for_timeout(70)
 after=snapshot();assert after['strokes'][0]['p']!=before['strokes'][0]['p'],(before,after)
 assert page.evaluate("m113SelectedStrokeIds.has('free1')")
 click_bg()
 assert page.evaluate('m113SelectedStrokeIds.size')==0,'Background click should clear selected strokes'
 assert page.locator('.m113-stroke-hit.selected').count()==0
 assert page.locator('.m1132-marquee,.m1211-marquee').count()==0
 page.keyboard.press('Control+z');page.wait_for_timeout(60)
 assert snapshot()['strokes'][0]['p']==before['strokes'][0]['p'],'Undo stroke movement'
 # 2. Agrupación real de dos elementos: mover uno debe mover ambos, y desagrupar debe separarlos.
 page.keyboard.press('Control+a')
 assert page.evaluate('boardSelectedIds.size')==2
 page.keyboard.press('Control+g');page.wait_for_timeout(50)
 group=snapshot();gids={x['groupId'] for x in group['elements']+group['strokes']}
 assert len(gids)==1 and None not in gids,group
 click_bg();page.evaluate("setSelected('n1')")
 assert page.evaluate("[boardSelectedIds.size,m113SelectedStrokeIds.size]")==[2,1]
 before=snapshot();nx,ny=place('.board-item[data-eid="n1"] .item-handle');drag_point(nx,ny,43,19)
 after=snapshot()
 assert after['elements'][0]['x']-before['elements'][0]['x']>30
 assert abs((after['elements'][1]['x']-before['elements'][1]['x'])-(after['elements'][0]['x']-before['elements'][0]['x']))<1
 assert abs((after['strokes'][0]['p'][0][0]-before['strokes'][0]['p'][0][0])-(after['elements'][0]['x']-before['elements'][0]['x']))<1
 page.keyboard.press('Control+z');page.wait_for_timeout(80)
 assert snapshot()['elements'][0]['x']==before['elements'][0]['x'],'Undo grouped movement'
 page.evaluate("setSelected('n1')")
 page.keyboard.press('Control+Shift+g');page.wait_for_timeout(60)
 assert all(x['groupId'] is None for x in snapshot()['elements']+snapshot()['strokes']),'Ungroup must remove groupId'
 click_bg();page.evaluate("setSelected('n1')")
 before=snapshot();nx,ny=place('.board-item[data-eid="n1"] .item-handle');drag_point(nx,ny,46,15)
 after=snapshot()
 assert after['elements'][0]['x']!=before['elements'][0]['x']
 assert after['elements'][1]['x']==before['elements'][1]['x'],'Ungrouped element must stay'
 assert after['strokes'][0]['p']==before['strokes'][0]['p'],'Ungrouped stroke must stay'
 # 3. Ctrl+Z restaura la desagrupación y los miembros juntos de nuevo.
 page.keyboard.press('Control+z');page.wait_for_timeout(80)
 page.keyboard.press('Control+z');page.wait_for_timeout(80)
 assert all(x['groupId'] for x in snapshot()['elements']+snapshot()['strokes']),'Undo ungroup restores groups'
 # 4. Selección rectangular sobre fondo recoge trazos y elementos.
 click_bg();page.evaluate('setSelected(null)')
 # La vista actual fue desplazada por la operación anterior, calculamos coordenadas de pantalla.
 nb=page.locator('.board-item[data-eid="n1"]').bounding_box();sb=page.locator('[data-m113-stroke="free1"]').bounding_box()
 x=min(nb['x'],sb['x'])-30;y=min(nb['y'],sb['y'])-30
 x2=max(nb['x']+nb['width'],sb['x']+sb['width'])+25;y2=max(nb['y']+nb['height'],sb['y']+sb['height'])+25
 # Coordenada dentro del viewport visible.
 vp=page.locator('#board-viewport').bounding_box();x=max(x,vp['x']+12);y=max(y,vp['y']+12)
 x2=min(x2,vp['x']+vp['width']-15);y2=min(y2,vp['y']+vp['height']-15)
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x2,y2,steps=7)
 assert page.locator('.m1132-marquee').count()==1
 page.mouse.up();page.wait_for_timeout(60)
 assert page.locator('.m1132-marquee').count()==0
 assert page.evaluate("m113SelectedStrokeIds.has('free1')")
 assert page.evaluate("boardSelectedIds.has('n1')")
 click_bg();assert page.evaluate('boardSelectedIds.size+m113SelectedStrokeIds.size')==0
 # 5. La función de copiar/pegar crea IDs de grupo nuevas, manteniendo el grupo original.
 page.evaluate("setSelected('n1')");page.keyboard.press('Control+c');page.keyboard.press('Control+v');page.wait_for_timeout(90)
 new=snapshot();assert len(new['elements'])==4 and len(new['strokes'])==2,new
 assert new['elements'][2]['groupId']==new['elements'][3]['groupId']==new['strokes'][1]['groupId']
 assert new['elements'][0]['groupId']!=new['elements'][2]['groupId'],'Copied groups must be independent'
 # 6. Guardar y recuperar mantiene groupId porque va en el JSON del libro sin migraciones.
 recovered=page.evaluate('JSON.parse(JSON.stringify(activeBoard()))')
 assert all(obj.get('groupId') for obj in recovered['elements']+recovered['strokes'])
 # 7. Selección mixta real por clic (sin Ctrl+A): trazo + elemento de otro grupo.
 click_bg()
 sx,sy=place('[data-m113-stroke="free1"]')
 page.mouse.click(sx,sy);page.wait_for_timeout(35)
 assert page.evaluate("m113SelectedStrokeIds.has('free1')")
 copied_id=page.evaluate('activeBoard().elements[2].id')
 nx,ny=place(f'.board-item[data-eid="{copied_id}"] .item-handle')
 page.keyboard.down('Control');page.mouse.click(nx,ny);page.keyboard.up('Control');page.wait_for_timeout(35)
 assert page.evaluate('m113SelectedStrokeIds.size+boardSelectedIds.size')>=3
 assert page.evaluate('document.querySelector("#board-group").disabled') is False
 page.keyboard.press('Control+g');page.wait_for_timeout(60)
 selected=page.evaluate("()=>({gids:[...m1132Elements().filter(x=>boardSelectedIds.has(x.id)),...m1132Strokes().filter(x=>m113SelectedStrokeIds.has(x.id))].map(x=>x.groupId)})")
 assert len(set(selected['gids']))==1,selected
 assert not errors,errors
 b.close()
print('PASS 1.13.2 background/marquee/groups/undo/paste')

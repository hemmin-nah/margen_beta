"""MARGEN 1.12.1: pizarra, fichas, referencias, diagramas, cronología y estabilidad lateral."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
assets=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101','margen-110','margen-111','margen-112','margen-121']
html=(root/'frontend/index.html').read_text('utf8')
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.css').exists())
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.js').exists())
png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOuhmZ0AAAAASUVORK5CYII='
book={'id':'a','name':'LAPSUS','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'Capítulo 1','documentTitle':'1. La tormenta','html':'<p>Texto triste.</p>','mode':'prose'}],
'characters':[{'id':'c1','title':'Pepe','gallery':[{'id':'p1','src':png},{'id':'p2','src':png}],'mainPhotoId':'p2','chapterIds':['a1'],'arc':[{'id':'arc1','stage':'Huida','chapterId':'a1'}]},{'id':'c2','title':'Ana','gallery':[{'id':'p3','src':png}],'chapterIds':[]}],
'settings':[{'id':'s1','title':'Elche','gallery':[{'id':'sph','src':png}],'characterIds':['c1'],'chapterIds':[]}],
'boards':[{'id':'b1','title':'Ideas','background':'dots','zoom':1,'panX':0,'panY':0,'diagramMode':'free','boardType':'free','elements':[{'id':'n1','type':'note','x':150,'y':120,'w':220,'h':160,'text':'Nota uno','color':'cream'},{'id':'n2','type':'note','x':420,'y':140,'w':210,'h':150,'text':'Nota dos','color':'mint'}],'strokes':[{'id':'st1','stampInstanceId':'stamp-a','color':'#222222','width':3,'points':[{'x':700,'y':220},{'x':760,'y':250}]}],'graphs':{}},
{'id':'b2','title':'Relaciones','background':'dots','zoom':1,'panX':0,'panY':0,'diagramMode':'relations','boardType':'relations','elements':[],'strokes':[],'graphs':{'relations':{'nodes':[{'id':'r1','name':'Pepe','x':450,'y':350,'characterId':'c1'},{'id':'r2','name':'Ana','x':800,'y':350,'characterId':'c2'}],'edges':[]},'genealogy':{'nodes':[],'edges':[]}}},
{'id':'b3','title':'Familia','background':'dots','zoom':1,'panX':0,'panY':0,'diagramMode':'genealogy','boardType':'genealogy','elements':[],'strokes':[],'graphs':{'genealogy':{'nodes':[{'id':'g1','name':'Pepe','x':450,'y':250,'characterId':'c1'},{'id':'g2','name':'Ana','x':450,'y':520,'characterId':'c2'}],'edges':[{'id':'ge1','from':'g1','to':'g2','type':'parent','color':'','label':'','direction':'forward'}]},'relations':{'nodes':[],'edges':[]}}}],
'outlines':[],'chronologies':[{'id':'t1','title':'Cronología','events':[{'id':'e1','title':'Inicio','date':'Día 1','description':'Empieza','characterId':'c1','characterIds':['c1'],'color':'#b66f62','expanded':True},{'id':'e2','title':'Después','date':'Día 2','description':'Sigue','characterId':'c2','characterIds':['c2'],'color':'#6c876f','expanded':False}]}],'notes':[]}
state={'version':1,'theme':'light','view':'manuscript','activeProjectId':'a','activeChapterId':'a1','activeCharacterId':'c1','activeSettingId':'s1','activeBoardId':'b1','activeChronologyId':'t1','projects':[book],'m145':{'language':'es','theme':'light','accent':'sage','workspace':'complete','onboarded':True}}
health={'ok':True,'appVersion':'1.12.1','dbSchema':1110,'previousUnclean':False,'recoveryAvailable':False,'backupCount':1,'latestBackup':'','resources':[],'issues':[]}
support={'appVersion':'1.12.1','dataDirectory':'C:/MARGEN','databaseSize':100,'dbSchema':1110,'backupCount':1,'latestBackup':'','legalText':'Licencias'}
mock=f'''window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{
 if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}};
 if(cmd==='desktop_load_book')return structuredClone({json.dumps(book)});if(cmd==='desktop_load_cover')return null;
 if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};
 if(cmd==='desktop_startup_health')return {json.dumps(health)};if(cmd==='desktop_support_info')return {json.dumps(support)};
 if(cmd==='desktop_log_error'||cmd==='desktop_mark_clean_shutdown')return null;
 if(cmd==='desktop_export_backup')return 'D:/backup.json'; if(cmd==='lexical_lookup')return {{query:args.term,definitions:[],synonymGroups:[]}};
 return null;
}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')

def clear(page):
 page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-tour-backdrop,.modal-backdrop,.m111-backdrop').forEach(x=>x.remove())")
 page.evaluate("()=>{state.view='manuscript';state.activeProjectId='a';state.activeChapterId='a1';ensureSelections();render()}")
 page.wait_for_timeout(120)

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1500,'height':900});page.set_default_timeout(3000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(650);clear(page)
 print('checkpoint toolbar',flush=True)
 # Barra del editor 1.12.0 queda congelada: 1.12.1 no añade ni quita filas.
 assert page.locator('.m112-toolstack').count()==1
 # El bloque superior del árbol mantiene geometría al saltar entre tipos de vista.
 search=page.locator('.m11-tree-search'); assert search.count()==1
 before=(search.bounding_box()['y'],search.bounding_box()['height'])
 cat_y=page.locator('.tree-section[data-section="manuscript"] .tree-heading').bounding_box()['y']
 page.evaluate("()=>{state.view='characters';state.activeCharacterId='c1';render()}");page.wait_for_timeout(60)
 after=(page.locator('.m11-tree-search').bounding_box()['y'],page.locator('.m11-tree-search').bounding_box()['height'])
 cat_y2=page.locator('.tree-section[data-section="manuscript"] .tree-heading').bounding_box()['y']
 assert before==after,(before,after); assert abs(cat_y2-cat_y)<1,(cat_y,cat_y2)
 print('checkpoint gallery',flush=True)
 # Galería con scroll y foto principal elegible.
 assert page.locator('.char-gallery.m1211-gallery-scroll').count()==1
 assert page.locator('.char-photo .m1211-main-photo-btn').count()==2
 assert page.evaluate("activeCharacter().mainPhotoId")=='p2'
 page.locator('[data-m1211-main-photo="p1"]').click();page.wait_for_timeout(60)
 assert page.evaluate("activeCharacter().mainPhotoId")=='p1'
 print('checkpoint tags',flush=True)
 # Escenario: personajes como tags y selector.
 page.evaluate("()=>{state.view='settings';state.activeSettingId='s1';render()}");page.wait_for_timeout(60)
 assert page.locator('.m1211-tags .m1211-tag',has_text='Pepe').count()==1
 assert page.locator('[data-m1211-character-select]').count()==1
 print('checkpoint refs',flush=True)
 # Referencias de capítulo agrupadas por personaje con capítulo + etapa.
 page.evaluate("()=>{state.view='manuscript';state.activeChapterId='a1';render()}");page.wait_for_timeout(60)
 page.locator('#m161-refs-button').click();page.wait_for_timeout(50)
 refs=page.locator('#m161-side-panel .m1211-character-ref');assert refs.count()==1
 assert refs.locator('summary',has_text='Pepe').count()==1
 assert refs.locator('.m1211-ref-detail').count()==2
 page.locator('#m161-side-close').click()
 print('checkpoint board',flush=True)
 # Pizarra libre: tipo fijo, 4 tiradores, cuentagotas, sello movible y Ctrl múltiple.
 page.evaluate("()=>{state.view='boards';state.activeBoardId='b1';render()}");page.wait_for_timeout(100)
 assert page.locator('#m121-board-mode').count()==0
 assert page.locator('.m1211-board-type',has_text='Pizarra libre').count()==1
 assert page.locator('.board-item[data-eid="n1"] .m1211-resize').count()==4
 assert page.locator('[data-m1211-eyedropper]').count()==1
 assert page.locator('[data-m1211-stamp-hit="stamp-a"]').count()==1
 # Ctrl+clic en dos notas usa la selección múltiple nueva.
 page.locator('.board-item[data-eid="n1"]').click(modifiers=['Control'],position={'x':60,'y':60});page.wait_for_timeout(20)
 page.locator('.board-item[data-eid="n2"]').click(modifiers=['Control'],position={'x':60,'y':60});page.wait_for_timeout(20)
 assert page.evaluate("boardSelectedIds.has('n1')&&boardSelectedIds.has('n2')")
 # Marco arrastrando sobre el fondo también selecciona ambas notas.
 page.evaluate("boardSelectedIds.clear();selectedElement=null;m1211SyncBoardSelection()")
 wr=page.locator('#board-world').bounding_box();vp=page.locator('#board-viewport').bounding_box()
 sx=max(vp['x']+8,wr['x']+105);sy=max(vp['y']+8,wr['y']+95);ex=min(vp['x']+vp['width']-8,wr['x']+650);ey=min(vp['y']+vp['height']-8,wr['y']+320)
 page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(ex,ey,steps=8);page.mouse.up();page.wait_for_timeout(40)
 assert page.evaluate("boardSelectedIds.has('n1')&&boardSelectedIds.has('n2')"),page.evaluate("[...boardSelectedIds]")
 # Mover un sello estampado mueve sus trazos como un único objeto.
 oldx=page.evaluate("activeBoard().strokes.find(s=>s.id==='st1').points[0].x")
 hit=page.locator('[data-m1211-stamp-hit="stamp-a"]');hb=hit.bounding_box()
 page.mouse.move(hb['x']+hb['width']/2,hb['y']+hb['height']/2);page.mouse.down();page.mouse.move(hb['x']+hb['width']/2+24,hb['y']+hb['height']/2+12,steps=5);page.mouse.up();page.wait_for_timeout(30)
 assert page.evaluate("activeBoard().strokes.find(s=>s.id==='st1').points[0].x")>oldx
 # Resize desde esquina: el tirador SE cambia tamaño sin mover el contenido accidentalmente.
 oldw=page.evaluate("activeBoard().elements.find(x=>x.id==='n1').w")
 se=page.locator('.board-item[data-eid="n1"] .m1211-resize.se');sb=se.bounding_box()
 page.mouse.move(sb['x']+5,sb['y']+5);page.mouse.down();page.mouse.move(sb['x']+28,sb['y']+22,steps=5);page.mouse.up();page.wait_for_timeout(30)
 assert page.evaluate("activeBoard().elements.find(x=>x.id==='n1').w")>oldw
 print('checkpoint relations',flush=True)
 # Relaciones: fotos también aquí y Ctrl+dos personajes abre selector de vínculo.
 page.evaluate("()=>{state.view='boards';state.activeBoardId='b2';render()}");page.wait_for_timeout(100)
 assert page.locator('#m122-nodes [data-m122-node="r1"] img').count()==1
 page.locator('#m122-nodes [data-m122-node="r1"]').dispatch_event('click',{'ctrlKey':True});page.locator('#m122-nodes [data-m122-node="r2"]').dispatch_event('click',{'ctrlKey':True});page.wait_for_timeout(40)
 assert page.locator('.m1211-quick-link').count()==1
 # Crear vínculo con el atajo conserva botones/sistema antiguo por debajo.
 page.locator('.m1211-quick-link [data-create]').click();page.wait_for_timeout(50)
 assert page.evaluate("activeBoard().graphs.relations.edges.length")>=1
 # Genealogía: los vínculos jerárquicos también muestran su nombre/tipo.
 page.evaluate("()=>{state.view='boards';state.activeBoardId='b3';render()}");page.wait_for_timeout(80)
 assert page.locator('.m1211-family-label',has_text='Progenitor').count()>=1
 print('checkpoint timeline',flush=True)
 # Cronología: color + antes/después + puntos arrastrables.
 page.evaluate("()=>{state.view='chronologies';state.activeChronologyId='t1';m131TimelineSelectedChron='t1';m131TimelineSelectedId='e1';render()}");page.wait_for_timeout(80)
 assert page.locator('[data-m1211-event-color]').count()==1
 assert page.locator('[data-m1211-insert="before"]').count()==1 and page.locator('[data-m1211-insert="after"]').count()==1
 assert page.locator('[data-m131-point="e1"]').get_attribute('draggable')=='true'
 # Arrastre manual cambia el orden y vuelve a cablear los controles de la cronología.
 page.locator('[data-m131-point="e1"]').drag_to(page.locator('[data-m131-point="e2"]'));page.wait_for_timeout(80)
 assert page.evaluate("activeChronology().events.map(x=>x.id).slice(0,2).join(',')")=='e2,e1'
 assert page.locator('[data-m1211-event-color]').count()==1
 page.locator('[data-m1211-event-color]').evaluate("e=>{e.value='#123456';e.dispatchEvent(new Event('input',{bubbles:true}))}")
 assert page.evaluate("activeChronology().events.find(x=>x.id==='e1').color")=='#123456'
 n0=page.evaluate("activeChronology().events.length");page.locator('[data-m1211-insert="after"]').click();page.wait_for_timeout(50);assert page.evaluate("activeChronology().events.length")==n0+1
 assert not errors,errors
 page.screenshot(path=str(root/'pruebas/MARGEN_1121_Cronologia.png'),full_page=False)
 b.close()
print('PASS 1.12.1: pizarra, fichas, referencias, relaciones, cronología y sidebar estable')

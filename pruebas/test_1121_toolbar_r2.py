from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
assets=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101','margen-110','margen-111','margen-112','margen-121']
html=(root/'frontend/index.html').read_text('utf8')
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.css').exists())
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.js').exists())
book={'id':'a','name':'Años Oscuros','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'Capítulo 1','documentTitle':'Cuando las ondas pasan de largo','titleLayout':{'align':'center'},'html':'<p>Piopio</p>','mode':'prose','layout':{'font':'serif','size':18,'leading':1.9,'margin':32}}],'boards':[],'notes':[],'characters':[{'id':'c1','title':'Elías'}],'settings':[],'outlines':[],'chronologies':[]}
state={'version':1,'theme':'dark','view':'manuscript','activeProjectId':'a','activeChapterId':'a1','projects':[book],'m145':{'language':'es','theme':'dark','accent':'sage','workspace':'complete','onboarded':True}}
health={'ok':True,'appVersion':'1.12.1','dbSchema':1110,'previousUnclean':False,'recoveryAvailable':False,'backupCount':1,'latestBackup':'','resources':[],'issues':[]}
support={'appVersion':'1.12.1','dataDirectory':'C:/MARGEN','databaseSize':100,'dbSchema':1110,'backupCount':1,'latestBackup':'','legalText':'Licencias'}
mock=f'''window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{ if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}}; if(cmd==='desktop_load_book')return structuredClone({json.dumps(book)});if(cmd==='desktop_load_cover')return null;if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};if(cmd==='desktop_startup_health')return {json.dumps(health)};if(cmd==='desktop_support_info')return {json.dumps(support)};if(cmd==='desktop_log_error'||cmd==='desktop_mark_clean_shutdown')return null;if(cmd==='lexical_lookup')return {{query:args.term,definitions:[],synonymGroups:[]}};return null;}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1700,'height':900}); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load'); page.wait_for_timeout(700)
 page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-tour-backdrop,.modal-backdrop,.m111-backdrop').forEach(x=>x.remove())")
 page.evaluate("()=>{state.theme='dark';state.view='manuscript';state.activeProjectId='a';state.activeChapterId='a1';ensureSelections();render()}"); page.wait_for_timeout(180)
 head=page.locator('.workspace-head.m112-unified-head'); stack=head.locator(':scope > .m112-toolstack'); toggle=head.locator(':scope > [data-m112-toolbar-toggle]')
 assert stack.is_visible(); assert toggle.is_visible(); assert page.locator('.m1431-wide-tab').count()==0
 assert page.locator('.m112-stack-primary').count()==1 and page.locator('.m112-stack-format').count()==1 and page.locator('.m112-stack-secondary').count()==0
 # Las acciones viven al final de la primera fila y consulta al final de la segunda.
 assert page.locator('.m112-stack-primary > .m112-head-actions').count()==1
 assert page.locator('.m112-stack-format #synonyms-btn').count()==1
 assert page.locator('.m112-stack-format #m161-sheets-button').count()==1
 assert page.locator('.m112-book-name',has_text='AÑOS OSCUROS').count()==1
 full_h=head.bounding_box()['height']; paper=page.locator('.editor-paper'); paper_w=paper.bounding_box()['width']; paper_x=paper.bounding_box()['x']; paper_h=paper.bounding_box()['height']; head_x=head.bounding_box()['x']; head_w=head.bounding_box()['width']
 page.screenshot(path=str(root/'pruebas/MARGEN_1121_R3_toolbar_full.png'),full_page=False)
 toggle.click(); page.wait_for_timeout(90)
 assert head.get_attribute('data-m112-toolbar')=='compact'; assert not stack.is_visible(); assert head.bounding_box()['height'] < full_h-30
 assert page.locator('.m112-book-name',has_text='AÑOS OSCUROS').count()==1
 assert paper.bounding_box()['height'] > paper_h+30,(paper_h,paper.bounding_box()['height'])
 page.screenshot(path=str(root/'pruebas/MARGEN_1121_R3_toolbar_compact.png'),full_page=False)
 toggle.click(); page.wait_for_timeout(70); assert stack.is_visible()
 sheets=page.locator('#m161-sheets-button'); assert sheets.count()==1
 sheets.click(); page.wait_for_timeout(100)
 panel=page.locator('.m162-sheet-panel');assert panel.count()==1
 assert abs(head.bounding_box()['x']-head_x)<1 and abs(head.bounding_box()['width']-head_w)<1
 assert abs(paper.bounding_box()['width']-paper_w)<1
 assert paper.bounding_box()['x'] < paper_x
 # Fichas empieza por debajo de la barra completa; nunca se superpone.
 assert panel.bounding_box()['y'] >= head.bounding_box()['y']+head.bounding_box()['height']+5,(panel.bounding_box(),head.bounding_box())
 # El selector de capítulos usa el resaltado general, no el fondo nativo del select.
 assert page.locator('#m11-jump').evaluate("e=>getComputedStyle(e).backgroundColor") != page.locator('body').evaluate("e=>getComputedStyle(e).backgroundColor")
 assert not errors,errors
 page.screenshot(path=str(root/'pruebas/MARGEN_1121_R3_toolbar_sheets.png'),full_page=False)
 b.close()
print('PASS 1.12.1 R3 toolbar: two rows, real collapse, book label, sheets move only paper')

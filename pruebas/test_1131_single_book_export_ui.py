from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text('utf8')
css_names=re.findall(r'<link rel="stylesheet" href="\./assets/([^"]+\.css)">',html)
js_names=re.findall(r'<script src="\./assets/([^"]+\.js)" defer></script>',html)
css='\n'.join((root/'frontend/assets'/n).read_text('utf8') for n in css_names)
js='\n'.join((root/'frontend/assets'/n).read_text('utf8') for n in js_names)
book1={'id':'a','name':'LAPSUS','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'Capítulo 1','html':'<p>A.</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[]}
book2={'id':'b','name':'La tormenta','createdAt':'2026-01-02','chapters':[{'id':'b1','title':'Capítulo 1','html':'<p>B.</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[]}
state={'version':1,'theme':'light','view':'library','activeProjectId':'a','activeChapterId':'a1','projects':[book1,book2],'m145':{'language':'es','theme':'light','accent':'sage','workspace':'complete','onboarded':True}}
health={'ok':True,'appVersion':'1.13.1','dbSchema':1123,'previousUnclean':False,'recoveryAvailable':False,'backupCount':1,'latestBackup':'','resources':[],'issues':[]}
support={'appVersion':'1.13.1','dataDirectory':'C:/MARGEN','databaseSize':100,'dbSchema':1123,'backupCount':1,'latestBackup':'','legalText':'Licencias'}
mock=f'''window.__exportCalls=[];window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{
 if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}};
 if(cmd==='desktop_load_book')return structuredClone(args.bookId==='b'?{json.dumps(book2)}:{json.dumps(book1)});
 if(cmd==='desktop_load_cover')return null;
 if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};
 if(cmd==='desktop_startup_health')return {json.dumps(health)};if(cmd==='desktop_support_info')return {json.dumps(support)};
 if(cmd==='desktop_library_info')return {{currentPath:'C:/MARGEN',defaultPath:'C:/MARGEN',custom:false,previousPath:null,previousCopyAvailable:false,trashCount:0}};
 if(cmd==='desktop_list_book_trash')return [];
 if(cmd==='desktop_export_book'){{window.__exportCalls.push({{cmd,args:structuredClone(args)}});return 'C:/Exports/book.json'}};
 if(cmd==='desktop_export_backup'){{window.__exportCalls.push({{cmd,args:structuredClone(args)}});return 'C:/Exports/library.json'}};
 if(cmd==='desktop_log_error'||cmd==='desktop_mark_clean_shutdown')return null;
 if(cmd==='lexical_lookup')return {{query:args.term,definitions:[],synonymGroups:[]}};
 return null;
}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1400,'height':900});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load');page.wait_for_timeout(900)
    page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-guide-backdrop,.m111-backdrop').forEach(x=>x.remove())")
    page.locator('[data-action="backup"]').click();page.wait_for_timeout(40)
    assert page.locator('[data-m1131-export]').count()==1
    select=page.locator('[data-m1131-book]');assert select.count()==1
    select.select_option('b');page.locator('[data-m1131-one]').click();page.wait_for_timeout(120)
    calls=page.evaluate('window.__exportCalls')
    assert len(calls)==1,calls
    assert calls[0]['cmd']=='desktop_export_book',calls
    assert calls[0]['args']['book']['id']=='b',calls
    assert calls[0]['args']['book']['name']=='La tormenta',calls
    assert len(calls[0]['args']['book']['chapters'])==1,calls
    # Cerramos el aviso del primer guardado y comprobamos también la copia completa.
    page.evaluate("document.querySelector('[data-m172-dialog]')?.remove()")
    page.locator('[data-action="backup"]').click();page.wait_for_timeout(40)
    page.locator('[data-m1131-all]').click();page.wait_for_timeout(140)
    calls=page.evaluate('window.__exportCalls')
    assert len(calls)==2,calls
    assert calls[1]['cmd']=='desktop_export_backup',calls
    assert len(calls[1]['args']['snapshot']['projects'])==2,calls
    assert not errors,errors
    b.close()
print('PASS 1.13.1 single-book export UI')

"""MARGEN 1.10.1: índice ligero, apertura bajo demanda y copias completas."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text('utf8')
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in ['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-110'])
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in ['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101'])
full={
 'a':{'id':'a','name':'Libro A','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'A1','html':'<p>uno dos tres</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[]},
 'b':{'id':'b','name':'Libro B','createdAt':'2026-01-02','chapters':[{'id':'b1','title':'B1','html':'<p>cuatro cinco</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[]}
}
def stub(b,words):
 return {'id':b['id'],'name':b['name'],'createdAt':b['createdAt'],'chapters':[{'id':b['chapters'][0]['id'],'title':b['chapters'][0]['title']}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[],'_margenLazy':True,'_margenSummary':{'words':words,'hasCover':False}}
index={'version':1,'theme':'light','view':'library','activeProjectId':'a','activeChapterId':'a1','projects':[stub(full['a'],3),stub(full['b'],2)]}
mock=f'''window.__m110Test={{loads:[],saves:[],exports:[],full:{json.dumps(full)},index:{json.dumps(index)}}};
window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{const d=window.__m110Test;
 if(cmd==='desktop_load_index')return {{workspace:structuredClone(d.index),'workspace-meta':{{token:'t0',time:'0'}},recoveryAvailable:false}};
 if(cmd==='desktop_load_records')return {{workspace:{{...structuredClone(d.index),projects:Object.values(structuredClone(d.full))}},'workspace-meta':{{token:'t0',time:'0'}}}};
 if(cmd==='desktop_load_book'){{d.loads.push(args.bookId);return structuredClone(d.full[args.bookId]);}}
 if(cmd==='desktop_load_cover')return null;
 if(cmd==='desktop_load_recovery')return {{}};
 if(cmd==='desktop_save_incremental'){{d.saves.push(structuredClone(args));return {{token:'t'+d.saves.length,recoveryAvailable:false,backupWarning:null}};}}
 if(cmd==='desktop_save_records')return {{token:'full',recoveryAvailable:false,backupWarning:null}};
 if(cmd==='desktop_export_backup'){{d.exports.push(structuredClone(args.snapshot));return 'D:/backup.json';}}
 if(cmd==='desktop_export_document')return 'D:/book.'+args.extension;
 if(cmd==='lexical_lookup')return {{definitions:[],synonymGroups:[]}};
 throw Error(cmd);
}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
rust=(root/'src-tauri/src/lib.rs').read_text('utf8')
for required in ['book_summaries','desktop_load_index','desktop_load_book','desktop_load_cover','book_summary']:
 assert required in rust,required
assert 'resources/lexicons/english.sqlite3' in (root/'src-tauri/tauri.conf.json').read_text('utf8')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1200,'height':720});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(450)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click()
  if page.locator('[data-m145-save]').count():page.locator('[data-m145-save]').click()
  page.wait_for_timeout(50)
  if page.locator('[data-m170-not-now]').count():page.locator('[data-m170-not-now]').click()
 assert page.evaluate("state.projects.every(p=>p._margenLazy===true)")
 assert page.evaluate("projectWords(state.projects[0])")==3
 assert page.evaluate("window.__m110Test.loads.length")==0
 assert page.locator('.brand .m11-version').text_content()=='1.10.1 · Desktop'
 # Un cambio global no envía stubs como libros modificados.
 page.evaluate("()=>{state.theme=state.theme==='light'?'dark':'light';changed()}")
 page.evaluate('()=>save()');page.wait_for_function('window.__m110Test.saves.length===1')
 assert page.evaluate('window.__m110Test.saves[0].projects.length')==0
 # Abrir A carga sólo A.
 page.locator('[data-action="open-project"][data-id="a"]').first.click();page.wait_for_function("state.view==='book' && !state.projects[0]._margenLazy")
 assert page.evaluate('window.__m110Test.loads.join(",")')=='a'
 assert page.evaluate('state.projects[1]._margenLazy') is True
 page.evaluate("()=>{state.projects[0].description='cambio';changed()}")
 page.evaluate('()=>save()');page.wait_for_function('window.__m110Test.saves.length===2')
 sent=page.evaluate('window.__m110Test.saves[1].projects')
 assert [x['id'] for x in sent]==['a'] and '_margenLazy' not in sent[0]
 # Backup completa B sólo en ese momento y nunca exporta índices ligeros.
 page.evaluate('()=>backup()');page.wait_for_function('window.__m110Test.exports.length===1')
 exported=page.evaluate('window.__m110Test.exports[0]')
 assert all('_margenLazy' not in p for p in exported['projects'])
 assert exported['projects'][1]['chapters'][0]['html']=='<p>cuatro cinco</p>'
 assert not errors,errors
 print('PASS 1.10: índice ligero, carga por libro, guardado seguro y JSON completo')
 b.close()

"""MARGEN 1.9.1: guardado incremental, recovery perezoso y scroll del exportador."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text('utf8')
names=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191']
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in names)
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in names)
workspace={
 'version':1,'theme':'light','view':'library','activeProjectId':'a','activeChapterId':'a1',
 'projects':[
  {'id':'a','name':'Libro A','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'A1','html':'<p>Uno</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[]},
  {'id':'b','name':'Libro B','createdAt':'2026-01-02','chapters':[{'id':'b1','title':'B1','html':'<p>Dos</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[]}
 ]
}
mock=f'''window.__inc=[];window.__token=0;window.__loaded={json.dumps(workspace)};
window.__TAURI__={{core:{{invoke:async(cmd,args)=>{{
 if(cmd==='desktop_load_records')return {{workspace:structuredClone(window.__loaded),'workspace-meta':{{token:'t0',time:'0'}},recoveryAvailable:true,'recovery-meta':{{token:'old',time:'0'}}}};
 if(cmd==='desktop_load_recovery')return {{recovery:structuredClone(window.__loaded),'recovery-meta':{{token:'old',time:'0'}}}};
 if(cmd==='desktop_save_incremental'){{window.__inc.push(structuredClone(args));return {{token:'t'+(++window.__token),recoveryAvailable:true,backupWarning:null}};}}
 if(cmd==='desktop_save_records')return {{token:'full'+(++window.__token),recoveryAvailable:true,backupWarning:null}};
 if(cmd==='desktop_export_backup')return 'D:/backup.json';
 if(cmd==='desktop_export_document')return 'D:/book.'+args.extension;
 if(cmd==='lexical_lookup')return {{definitions:[],synonymGroups:[]}};
 throw Error(cmd);
}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')

# Comprobaciones estáticas del backend que protegen la migración 1.9.0.
rust=(root/'src-tauri/src/lib.rs').read_text('utf8')
for required in ['workspace_heads','book_versions','workspace_book_refs','desktop_save_incremental','desktop_load_recovery','migrate_legacy_if_needed']:
 assert required in rust, required
assert 'DELETE FROM revisions' not in rust

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1100,'height':650});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(400)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click()
  if page.locator('[data-m145-save]').count(): page.locator('[data-m145-save]').click()
  page.wait_for_timeout(80)
  if page.locator('[data-m170-not-now]').count(): page.locator('[data-m170-not-now]').click()
 # Un cambio dentro de A sólo envía A; el orden completo sigue acompañando la cabecera.
 page.evaluate("()=>{state.activeProjectId='a';state.view='manuscript';activeProject().chapters[0].html='<p>Uno cambiado</p>';changed()}")
 page.evaluate('()=>save()');page.wait_for_function('window.__inc.length===1')
 first=page.evaluate('window.__inc[0]')
 assert first['projectIds']==['a','b'],first
 assert [p['id'] for p in first['projects']]==['a'],first
 assert 'projects' not in first['root'],first['root'].keys()
 # Ahora B: no vuelve a mandar A.
 page.evaluate("()=>{state.activeProjectId='b';activeProject().chapters[0].html='<p>Dos cambiado</p>';changed()}")
 page.evaluate('()=>save()');page.wait_for_function('window.__inc.length===2')
 second=page.evaluate('window.__inc[1]')
 assert [p['id'] for p in second['projects']]==['b'],second
 # Recovery está disponible sin haberse cargado su payload en el arranque.
 assert page.evaluate('m15RecoveryAvailable') is True
 # Panel del exportador: en una ventana baja, la columna izquierda debe ocupar
 # exactamente el alto disponible y desplazar su contenido dentro de sí misma.
 page.evaluate("()=>{state.activeProjectId='a';state.view='manuscript';render()}")
 page.locator('[data-m180-export]').click();page.wait_for_timeout(50)
 controls=page.locator('.m180-controls'); columns=page.locator('.m180-columns')
 overflow=controls.evaluate("e=>({oy:getComputedStyle(e).overflowY,sh:e.scrollHeight,ch:e.clientHeight})")
 assert overflow['oy']=='auto',overflow
 assert overflow['sh']>overflow['ch'],overflow
 cbox=controls.bounding_box(); xbox=columns.bounding_box()
 assert cbox and xbox and cbox['height'] <= xbox['height'] + 1,(cbox,xbox)
 controls.evaluate('e=>e.scrollTop=e.scrollHeight')
 lead=page.locator('#m180-leading').bounding_box(); cbox=controls.bounding_box()
 assert lead and cbox,(lead,cbox)
 assert lead['y'] >= cbox['y'] - 1,(lead,cbox)
 assert lead['y'] + lead['height'] <= cbox['y'] + cbox['height'] + 1,(lead,cbox)
 assert not errors,errors
 print('PASS 1.9.1: incremental por libro, recovery bajo demanda y exportador desplazable')
 b.close()

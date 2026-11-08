"""Smoke test sin Windows: simula las llamadas Tauri y verifica la interfaz. NO sustituye compilación Rust/Windows."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from html import escape

root=Path(__file__).resolve().parents[1]
source=(root/'frontend/index.html').read_text()
css=(root/'frontend/assets/margen.css').read_text()
js=(root/'frontend/assets/margen.js').read_text()
fake=r'''
window.__margenTest={records:{},saves:0,exports:0};
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 const d=window.__margenTest;
 if(cmd==='desktop_load_records')return JSON.parse(JSON.stringify(d.records));
 if(cmd==='desktop_save_records'){
  const present=d.records['workspace-meta']?.token??null;
  if(present!==args.expectedToken)throw Error('MARGEN_CONFLICT');
  if(d.records.workspace){
    d.records.recovery=JSON.parse(JSON.stringify(d.records.workspace));
    d.records['recovery-meta']={token:d.records['workspace-meta'].token};
  }
  d.records.workspace=JSON.parse(JSON.stringify(args.snapshot));
  d.records['workspace-meta']={token:'token-'+(++d.saves)};
  return {token:d.records['workspace-meta'].token,recoveryAvailable:!!d.records.recovery};
 }
 if(cmd==='desktop_export_backup'){d.exports++;return 'C:/MARGEN/copias-json/backup.json'}
 throw Error('Unknown command '+cmd)
}}};
'''
source=source.replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+css+'</style>')
source=source.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+js+'</script>')
errs=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1400,'height':900})
    page.on('pageerror',lambda exc:errs.append(str(exc)))
    page.set_content(source,wait_until='load',timeout=60000)
    page.wait_for_timeout(1700)
    result=page.evaluate('''() => ({
      title:document.title, books:state?.projects?.length,
      saves:window.__margenTest.saves,
      db:db?.desktop, hasEditor:typeof renderManuscript,
      version:document.querySelector('.brand .m11-version')?.textContent,
      backed:window.__margenTest.records.workspace?.version
    })''')
    print('Inicio:',result)
    assert result['db'] is True
    assert result['books']>=1
    assert result['saves']>=1
    assert result['backed']==1
    assert result['version']=='1.6.3 · Desktop'
    assert not errs,errs
    page.evaluate('''async()=>{
       state.projects[0].name='Prueba de persistencia MARGEN';changed();
       return await save();
    }''')
    status=page.evaluate('''() => ({
      saves:window.__margenTest.saves,
      current:window.__margenTest.records.workspace.projects[0].name,
      recovery:window.__margenTest.records.recovery.projects[0].name
    })''')
    print('Guardar y recuperar:',status)
    assert status['current']=='Prueba de persistencia MARGEN'
    assert status['current']!=status['recovery']
    # Restore path: objects with different key insertion order are treated equally.
    page.evaluate('''async()=>{
      const original=JSON.parse(JSON.stringify(state));
      original.projects[0].name='Libro restaurado';
      await m154Install(original);
    }''')
    assert page.evaluate('state.projects[0].name')=='Libro restaurado'
    assert not errs,errs
    page.screenshot(path=str(root/'pruebas/MARGEN_160_ventana.png'))
    print('Smoke Tauri frontend: PASADO (backend simulado)')
    browser.close()

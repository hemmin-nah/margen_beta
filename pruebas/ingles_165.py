from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
h=(r/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(r/'frontend/assets/margen.css').read_text()+'</style>')
fake="""window.__TAURI__={core:{invoke:async function(cmd,args={}){if(cmd==='desktop_load_records')return {};if(cmd==='desktop_save_records')return {token:'t1',recoveryAvailable:false};if(cmd==='desktop_export_backup')return 'C:/Descargas/margen.json';throw Error(cmd)}}};"""
h=h.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+(r/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1520,'height':960})
 errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content(h,wait_until='load');pg.wait_for_timeout(400)
 if pg.locator('.m145-config-backdrop [data-m145-skip]').count():pg.locator('.m145-config-backdrop [data-m145-skip]').click()
 pg.evaluate("() => {state.m145.language='en';state.m145.onboarded=true;render()}")
 pg.locator('[data-action=add-project]').first.click()
 print('NEW BOOK MODAL',pg.locator('.modal-backdrop').inner_text()[:430] if pg.locator('.modal-backdrop').count() else 'none')
 print('PLACEHOLDERS',pg.evaluate('Array.from(document.querySelectorAll(".modal-backdrop input,.modal-backdrop textarea")).map(e=>e.placeholder)'))
 pg.locator('.modal-backdrop').evaluate('(e)=>e.remove()') if pg.locator('.modal-backdrop').count() else None
 print('Library top:',pg.locator('.workspace-head').inner_text()[:260]); print('library new last',pg.evaluate("Array.from(document.querySelector('.projects-grid').children).map(x=>x.className)"))
 pg.screenshot(path=str(r/'pruebas/MARGEN_165_Biblioteca.png'))
 for view in ['manuscript','characters','settings','outlines','chronologies','boards','book']:
  pg.evaluate('(view)=>{state.view=view;render()}',view)
  print(view,'HEADER:',pg.locator('.workspace-head').first.inner_text()[:120],'SPANISH?',pg.locator('#workspace').inner_text()[:450].replace('\n',' | '))
 pg.evaluate("() => {state.view='library';render()}")
 pg.screenshot(path=str(r/'pruebas/MARGEN_165_English_Library.png'))
 print('ERRORS:',errors)
 b.close()

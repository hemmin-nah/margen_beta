"""Pruebas visuales y funcionales de bienvenida/tutorial (WebView simulado; NO compila Windows)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text()
css=(r/'frontend/assets/margen.css').read_text()+'\n'+(r/'frontend/assets/margen-170.css').read_text()
js=(r/'frontend/assets/margen.js').read_text()+'\n'+(r/'frontend/assets/margen-170.js').read_text()
mock="""
window.__testDb={records:{}, saves:0};
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 const d=window.__testDb;
 if(cmd==='desktop_load_records')return JSON.parse(JSON.stringify(d.records));
 if(cmd==='desktop_save_records'){
  const previous=d.records['workspace-meta']?.token||null;
  if(args.expectedToken!==previous)throw Error('MARGEN_CONFLICT');
  if(d.records.workspace){d.records.recovery=structuredClone(d.records.workspace);d.records['recovery-meta']={token:previous}}
  d.records.workspace=structuredClone(args.snapshot);
  const token='t'+(++d.saves);d.records['workspace-meta']={token};
  return {token,recoveryAvailable:!!d.records.recovery};
 }
 if(cmd==='desktop_export_backup')return 'C:/Users/Test/Downloads/MARGEN.json';
 throw Error(cmd);
}}};
"""
html=html.replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+css+'</style><style>*,*:before,*:after{scroll-behavior:auto!important}</style>')
html=html.replace('<link rel="stylesheet" href="./assets/margen-170.css">','')
html=html.replace('<script src="./assets/margen.js" defer></script>','')
html=html.replace('<script src="./assets/margen-170.js" defer></script>','<script>'+mock+'</script><script>'+js+'</script>')

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda exc: errors.append(str(exc)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(450)
 assert page.locator('[data-m170-intro]').count()==1,'The new intro must precede setup'
 assert page.locator('.m145-config-backdrop').count()==0,'Existing config should not appear until intro is dismissed'
 page.screenshot(path=str(r/'pruebas/MARGEN_170_Bienvenida_ES.png'))
 assert page.locator('[data-m170-intro-lang="en"]').count()==1
 page.locator('[data-m170-intro-lang="en"]').click()
 assert page.locator('#m170-intro-title').inner_text()=='Every story needs room to grow.'
 page.screenshot(path=str(r/'pruebas/MARGEN_170_Bienvenida_EN.png'))
 page.locator('[data-m170-intro-go]').click()
 assert page.locator('.m145-config-backdrop').count()==1
 assert page.locator('[data-m145-field="language"][data-value="en"]').get_attribute('aria-pressed')=='true'
 assert page.locator('[data-m170-intro]').count()==0
 page.locator('.m145-config-backdrop [data-m145-save]').click()
 page.wait_for_timeout(180)
 assert page.locator('[data-m170-tour-offer]').count()==1,'Offer tour after initial setup'
 assert page.evaluate('m145Prefs().language')=='en'
 assert page.evaluate('state.projects[0].m1452Starter')=='en','English demo should be selected'
 page.screenshot(path=str(r/'pruebas/MARGEN_170_Visita_Invitacion.png'))
 page.locator('[data-m170-start-tour]').click()
 assert page.locator('[data-m170-tour]').count()==1
 assert page.locator('.m170-tour-popover').is_visible()
 page.screenshot(path=str(r/'pruebas/MARGEN_170_Tutorial.png'))
 for index in range(8):
  assert page.evaluate('m170Tour.index')==index
  # actual target should be present for each tour step
  hit=page.evaluate('''() => {
   const e=m170StepElement(m170Tour.index),r=e?.getBoundingClientRect();
   return {target:!!e,width:r?.width,height:r?.height,view:state.view}
  }''')
  assert hit['target'] and hit['width']>0 and hit['height']>0,(index,hit)
  assert page.locator('.m170-spotlight').is_visible()
  page.locator('[data-m170-next]').click()
 assert page.locator('[data-m170-tour]').count()==0
 assert page.evaluate('state.view')=='library','Should restore initial view'
 assert page.locator('.m170-help-btn').count()==1
 page.locator('.m170-help-btn').click()
 assert page.locator('.m170-help-popover').count()==1
 page.locator('[data-m170-replay]').click()
 assert page.locator('[data-m170-tour]').count()==1
 page.keyboard.press('Escape')
 assert page.locator('[data-m170-tour]').count()==0
 page.wait_for_timeout(750)
 assert page.evaluate('window.__testDb.records.workspace.m145.onboarded')==True
 assert page.evaluate('window.__testDb.records.workspace.m170.tourOffered')==True
 assert not errors,errors
 print('New user ES/EN, setup, sample, tour 8/8, replay, Escape, persistence: PASS')
 # Existing users must not see welcome / tutorial automatically.
 snapshot=page.evaluate('structuredClone(window.__testDb.records.workspace)')
 savedBooks=snapshot['projects']
 page2=b.new_page(viewport={'width':1440,'height':900})
 page2.on('pageerror',lambda exc: errors.append(str(exc)))
 # Existing snapshot via preloaded mock state, no DB changes.
 existing=html.replace('window.__testDb={records:{}, saves:0};','window.__testDb={records:{workspace:'+__import__('json').dumps(snapshot,ensure_ascii=False)+',"workspace-meta":{"token":"t1"}}, saves:1};')
 page2.set_content(existing,wait_until='load');page2.wait_for_timeout(450)
 assert page2.locator('[data-m170-intro]').count()==0
 assert page2.locator('[data-m170-tour-offer]').count()==0
 assert page2.locator('.m145-config-backdrop').count()==0
 assert page2.evaluate('state.projects[0].name')==savedBooks[0]['name']
 # Open a chapter before replay, ensure the tour returns there without changing its content.
 page2.evaluate("""() => {state.view='manuscript';const c=activeChapter();c.html='<p>My writing stays untouched.</p>';render()}""")
 previous=page2.evaluate("""() => ({view:state.view,chapter:activeChapter().html,project:activeProject().id})""")
 page2.locator('.m170-help-btn').click();page2.locator('[data-m170-preview]').click()
 assert page2.locator('[data-m170-intro]').count()==1
 assert page2.locator('[data-m170-intro-skip]').count()==0
 page2.locator('[data-m170-intro-go]').click()
 assert page2.locator('[data-m170-intro]').count()==0
 assert page2.locator('.m145-config-backdrop').count()==0,'Preview must never open settings'
 page2.locator('.m170-help-btn').click();page2.locator('[data-m170-replay]').click()
 assert page2.locator('[data-m170-tour]').count()==1
 page2.locator('.m170-tour-skip').click()
 assert page2.locator('[data-m170-tour]').count()==0
 actual=page2.evaluate("""() => ({view:state.view,chapter:activeChapter().html,project:activeProject().id})""")
 assert previous==actual,(previous,actual)
 assert not errors,errors
 print('Existing user: no intro, no reset; manual replay: PASS')
 b.close()

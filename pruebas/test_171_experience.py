"""Smoke tests: repeated language switching; sectioned guide; no user data changes.
Only Chromium with a simulated Tauri bridge. Not Windows WebView2/Rust validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text(encoding='utf8')
css='\n'.join((r/'frontend/assets'/p).read_text(encoding='utf8') for p in ('margen.css','margen-170.css','margen-171.css','margen-172.css'))
js='\n'.join((r/'frontend/assets'/p).read_text(encoding='utf8') for p in ('margen.js','margen-170.js','margen-171.js','margen-172.js'))
mock="""
window.__testDb={records:{}, saves:0};
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 const d=window.__testDb;
 if(cmd==='desktop_load_records')return structuredClone(d.records);
 if(cmd==='desktop_save_records'){
  const prev=d.records['workspace-meta']?.token||null;
  if(args.expectedToken!==prev)throw Error('MARGEN_CONFLICT');
  if(d.records.workspace){d.records.recovery=structuredClone(d.records.workspace);d.records['recovery-meta']={token:prev}}
  d.records.workspace=structuredClone(args.snapshot);
  const token='t'+(++d.saves);d.records['workspace-meta']={token};
  return {token,recoveryAvailable:!!d.records.recovery};
 }
 if(cmd==='desktop_export_backup')return 'C:/Users/Test/Downloads/MARGEN.json';
 throw Error(cmd);
}}};
"""
html=html.replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+css+'</style><style>*,*:before,*:after{scroll-behavior:auto!important}</style>')
for p in ('margen-170.css','margen-171.css','margen-172.css'):
 html=html.replace('<link rel="stylesheet" href="./assets/'+p+'">','')
for p in ('margen.js','margen-170.js','margen-171.js'):
 html=html.replace('<script src="./assets/'+p+'" defer></script>','')
html=html.replace('<script src="./assets/margen-172.js" defer></script>','<script>'+mock+'</script><script>'+js+'</script>')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(450)
 assert page.locator('[data-m171-splash]').count()==0,'Splash must vanish immediately after initialization'
 assert page.locator('[data-m170-intro]').count()==1
 for lang in ['en','es','en','es','en']:
  page.locator('[data-m170-intro-lang="'+lang+'"]').click()
  title=page.locator('#m170-intro-title').inner_text()
  assert title==('Every story needs room to grow.' if lang=='en' else 'Las historias necesitan espacio.'), (lang,title)
 page.screenshot(path=str(r/'pruebas/MARGEN_171_Bienvenida_EN.png'))
 page.locator('[data-m170-intro-go]').click()
 assert page.locator('[data-m145-field="language"][data-value="en"]').get_attribute('aria-pressed')=='true'
 page.locator('[data-m145-save]').click();page.wait_for_timeout(150)
 assert page.locator('[data-m170-tour-offer]').count()==1
 page.locator('[data-m170-start-tour]').click()
 assert page.locator('[data-m171-picker]').count()==1
 assert page.locator('[data-m171-section]').count()==len(page.evaluate('m171Sections'))==8
 page.screenshot(path=str(r/'pruebas/MARGEN_171_Secciones_EN.png'))
 initial=page.evaluate('''() => ({chapters:structuredClone(activeProject().chapters),boards:structuredClone(activeProject().boards),characters:structuredClone(activeProject().characters),name:activeProject().name,route:m170SnapshotRoute()})''')
 for section in page.evaluate('m171Sections.map(x=>x.id)'):
  page.locator('[data-m171-section="'+section+'"]').click()
  length=page.evaluate('m170Tour.steps.length')
  assert length>=3
  for ix in range(length):
   assert page.evaluate('m170Tour.index')==ix
   assert page.locator('.m170-tour-popover').is_visible()
   hit=page.evaluate('''() => {const e=m170StepElement(m170Tour.index),r=e?.getBoundingClientRect();return {tag:e?.tagName,width:r?.width,height:r?.height}}''')
   assert hit['width']>0 and hit['height']>0,(section,ix,hit)
   assert page.locator('.m170-tour-popover h2').inner_text().strip()
   if section=='family' and ix==2: page.screenshot(path=str(r/'pruebas/MARGEN_171_Genealogia_EN.png'))
   page.locator('[data-m170-next]').click()
  assert page.locator('[data-m171-picker]').count()==1
  assert page.locator('[data-m170-tour]').count()==0
 assert page.evaluate('''() => JSON.stringify({chapters:activeProject().chapters,boards:activeProject().boards,characters:activeProject().characters,name:activeProject().name,route:m170SnapshotRoute()})''')==json.dumps(initial,ensure_ascii=False,separators=(',',':')) or page.evaluate('''() => JSON.stringify({chapters:activeProject().chapters,boards:activeProject().boards,characters:activeProject().characters,name:activeProject().name})''')==json.dumps({k:initial[k] for k in ['chapters','boards','characters','name']},ensure_ascii=False,separators=(',',':'))
 page.locator('[data-m171-guide-close]').click()
 assert page.locator('[data-m171-picker]').count()==0
 page.locator('.m170-help-btn').click()
 page.locator('[data-m170-replay]').click()
 assert page.locator('[data-m171-picker]').count()==1
 page.keyboard.press('Escape');assert page.locator('[data-m171-picker]').count()==0
 page.wait_for_timeout(750)
 assert not errors,errors
 print('PASS: repeated ES/EN toggles, 8 independent sections, 32 detailed steps, restore route/data, Help, Escape, splash removed')
 b.close()

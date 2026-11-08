from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text()
names=['margen','margen-170','margen-171','margen-172','margen-173','margen-180']
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text() for n in names)
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text() for n in names)
mock='''
window.__TAURI__={core:{invoke:async(cmd,args)=>{
 if(cmd==='desktop_load_records')return {};
 if(cmd==='desktop_save_records')return {token:'fresh',recoveryAvailable:false};
 if(cmd==='desktop_export_backup')return 'C:/Downloads/test.json';
 if(cmd==='desktop_export_document')return 'C:/Downloads/test.docx';
 if(cmd==='lexical_lookup')return {definitions:[],synonymGroups:[]};
 throw Error(cmd);
}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1400,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(420)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click();page.locator('[data-m145-save]').click();page.wait_for_timeout(70)
  if page.locator('[data-m170-not-now]').count():page.locator('[data-m170-not-now]').click()
 assert page.evaluate('state.projects.length')>0
 for view in ('library','book','manuscript','boards','characters','settings','outlines','chronologies','dictionary'):
  page.evaluate('view=>{state.view=view;render()}',view)
  if view in ('book','manuscript'):
   assert page.locator('[data-m180-export]').count()==1,(view,page.locator('.workspace-head').inner_text())
   page.locator('[data-m180-export]').click();assert page.locator('.m180-dialog').count()==1
   page.keyboard.press('Escape');assert page.locator('.m180-dialog').count()==0
  else:assert page.locator('.m180-backdrop').count()==0
 assert page.locator('.m173-dictionary').count()==1
 page.evaluate('''() => {m145Prefs().language='en';state.view='manuscript';render();}''')
 assert 'Export' in page.locator('[data-m180-export]').inner_text()
 page.locator('[data-m180-export]').click()
 assert 'Editorial export' in page.locator('#m180-title').inner_text()
 assert page.locator('#m180-layout').is_visible()
 page.locator('#m180-format').select_option('txt')
 assert not page.locator('#m180-layout').is_visible()
 page.locator('#m180-format').select_option('pdf')
 assert page.locator('#m180-layout').is_visible()
 assert not errors,errors
 print('PASS: nine views, export in book and manuscript, ES/EN, settings and all JS without runtime errors')
 b.close()

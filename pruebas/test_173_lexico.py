"""UI test in Chromium with a mocked desktop lexical command.
This is NOT a Windows installer test and does not prove the online source download."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text(encoding='utf-8')
names=['margen','margen-170','margen-171','margen-172','margen-173']
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text(encoding='utf-8') for n in names)
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text(encoding='utf-8') for n in names)
mock=r"""
window.__queries=[];
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 if(cmd==='desktop_load_records')return {};
 if(cmd==='desktop_save_records')return {token:'token',recoveryAvailable:false};
 if(cmd==='desktop_export_backup')return 'C:/Users/Test/Downloads/MARGEN.json';
 if(cmd==='lexical_lookup'){
  window.__queries.push({term:args.term,language:args.language});
  return {word:args.term,language:args.language,available:true,
   definitions:[{gloss:args.language==='es'?'Tristeza profunda.':'A state of sadness.',partOfSpeech:'noun',source:args.language==='es'?'Wikcionario':'Open English WordNet 2025',license:args.language==='es'?'CC BY-SA 4.0':'CC BY 4.0',url:'https://es.wiktionary.org/wiki/Melancolía'}],
   synonymGroups:[{synonyms:args.language==='es'?['tristeza','añoranza']:['sadness','sorrow'],source:args.language==='es'?'Spanish WordNet MCR 3.0':'Open English WordNet 2025',license:args.language==='es'?'CC BY 3.0':'CC BY 4.0'}]};
 }
 throw Error('Unknown command '+cmd);
}}};
"""
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1400,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(500)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click();page.locator('[data-m145-save]').click();page.wait_for_timeout(80)
  if page.locator('[data-m170-not-now]').count():page.locator('[data-m170-not-now]').click()
 page.evaluate("() => {state.view='dictionary';render()}")
 assert page.locator('.m173-dictionary').count()==1
 assert page.locator('.topnav .toplink').filter(has_text='Diccionario').count()<=1
 page.locator('#dictionary-query').fill('melancolía');page.wait_for_timeout(320)
 assert 'Tristeza profunda' in page.locator('#dictionary-result').inner_text()
 assert 'añoranza' in page.locator('#dictionary-result').inner_text()
 assert page.evaluate('window.__queries.at(-1).language')=='es'
 page.locator('#m173-language').select_option('en')
 page.locator('#dictionary-query').fill('melancholy');page.wait_for_timeout(300)
 assert 'A state of sadness' in page.locator('#dictionary-result').inner_text()
 assert page.evaluate('window.__queries.at(-1).language')=='en'
 page.locator('[data-m173-credits]').click()
 assert page.locator('.m173-legal-dialog').count()==1
 assert 'Princeton' in page.locator('.m173-legal-dialog').inner_text()
 assert 'CC BY-SA' in page.locator('.m173-legal-dialog').inner_text()
 page.locator('[data-m173-close]').click()
 page.locator('.m170-help-btn').click()
 assert page.locator('[data-m173-help]').count()==1
 page.locator('.m170-help-btn').click()
 page.evaluate("() => {state.view='manuscript';render();synonymPopup()}")
 assert page.locator('.m173-syn-popup').count()==1
 page.locator('#syn-search').fill('melancholy');page.wait_for_timeout(320)
 assert 'sadness' in page.locator('#syn-results').inner_text()
 assert page.evaluate('window.__queries.at(-1).language')=='en'
 page.evaluate("() => {m145Prefs().language='en';state.view='dictionary';render()}")
 assert page.locator('.m173-dictionary').count()==1
 assert 'Dictionary' in page.locator('.workspace-head').inner_text()
 assert page.locator('.m1451-dictionary-note').count()==0
 assert not errors,errors
 print('PASS: dictionary tab, ES/EN, separated senses, sources and licenses, synonyms stay in editor')
 browser.close()

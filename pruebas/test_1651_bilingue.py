from pathlib import Path
from playwright.sync_api import sync_playwright
import json
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(r/'frontend/assets/margen.css').read_text()+'</style>')
fake="""window.__TAURI__={core:{invoke:async function(cmd,args={}){if(cmd==='desktop_load_records')return {};if(cmd==='desktop_save_records')return {token:'t1',recoveryAvailable:false};if(cmd==='desktop_export_backup')return 'C:/Users/Test/Downloads/margen.json';throw Error(cmd)}}};"""
html=html.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+(r/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1500,'height':1040})
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(500)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 structures={}
 for lang in ('es','en'):
  # Data provided by test: identical content; no actual books are modified.
  page.evaluate('''lang=>{const pr=activeProject();pr.characters=[{id:'test-person',title:'Nora',gallery:[],arc:[{id:'a1',stage:'Act I',chapterId:pr.chapters[0]?.id||'',change:'Changed'}],physical:'Hair and eyes',background:'A past'}];state.activeCharacterId='test-person';state.view='characters';state.m145.language=lang;state.m145.onboarded=true;render()}''',lang)
  assert page.locator('.m165-character-triple > .char-panel').count()==3,lang
  titles=page.locator('.m165-character-triple > .char-panel h3').all_inner_texts()
  assert len(titles)==3,titles
  assert page.locator('.m165-evolution > summary').count()==1,lang
  assert page.locator('.m165-evolution').is_visible()
  assert not page.locator('.m165-evolution').evaluate('e=>e.open')
  dims=page.evaluate('''() => {
    const grid=document.querySelector('.char-grid'),e=grid.querySelector('.m165-evolution-panel'),pair=grid.querySelector('.m165-character-triple');
    const linked=[...grid.querySelectorAll('.m122-linked-panel.wide')].map(x=>x.getBoundingClientRect().width);
    return {grid:grid.getBoundingClientRect().width,evolution:e?.getBoundingClientRect().width,pair:pair?.getBoundingClientRect().width,
      panels:[...grid.children].map(c=> c.className==='m12-character-panels'?([...c.children].map(x=>x.className)):[c.className]).flat(),
      linked};}''')
  assert abs(dims['grid']-dims['evolution'])<2,(lang,dims)
  assert abs(dims['grid']-dims['pair'])<2,(lang,dims)
  structures[lang]=dims
  page.locator('.m165-evolution > summary').click()
  assert page.locator('.m165-evolution').evaluate('e=>e.open')
  assert page.locator('.m165-evolution [data-arc-field="stage"]').count()==1
  page.locator('.m165-evolution > summary').click()
  assert not page.locator('.m165-evolution').evaluate('e=>e.open')
  page.screenshot(path=str(r/f'pruebas/MARGEN_1651_Personajes_{lang.upper()}.png'))
  # Chapter creation, test default text AND manual override preserved.
  page.evaluate('''() => {state.view='manuscript';render();addChapter()}''')
  v=page.locator('.modal-backdrop #m-title').input_value()
  assert v.startswith('Chapter ') if lang=='en' else v.startswith('Capítulo '), (lang,v)
  page.locator('.modal-backdrop #m-title').fill('A writer-defined title')
  page.locator('.modal-backdrop button[type=submit]').click()
  assert page.evaluate('activeChapter().title')=='A writer-defined title'
  print(lang, 'layout',titles,'full width',dims['grid'],dims['evolution'],'creation default:',v)
  # check new book placeholders in each locale
  page.evaluate('''() => {state.view='library';render();addProject()}''')
  fields=page.locator('.modal-backdrop input,.modal-backdrop textarea')
  print(lang,'new book placeholders:',fields.evaluate_all('(els)=>els.map(e=>e.placeholder)'))
  page.evaluate('''() => document.querySelector('.modal-backdrop').remove()''')
 assert structures['es']['panels']==structures['en']['panels'],structures
 assert not errs,errs
 print('BILINGUAL UI TESTS PASSED')
 browser.close()

"""Captura visual local con backend simulado."""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1];html=(r/'frontend/index.html').read_text();css=(r/'frontend/assets/margen.css').read_text();js=(r/'frontend/assets/margen.js').read_text()
html=html.replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+css+'</style>').replace('<script src="./assets/margen.js" defer></script>',"<script>window.__TAURI__={core:{invoke:async function(cmd){return cmd==='desktop_load_records'?{}:cmd==='desktop_save_records'?{token:'test',recoveryAvailable:false}:'C:/Users/Test/Downloads/backup.json'}}};</script><script>"+js+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1570,'height':960})
 page.set_content(html,wait_until='load');page.wait_for_timeout(350)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 page.evaluate("""() => {const p=activeProject();p.characters.push({id:'test-nora',title:'Nora Whitmore',age:'29',role:'Protagonista',occupation:'Fotógrafa',personality:'Observadora, reservada y tenaz',motivation:'Descubrir el origen de las cintas misteriosas.',background:'Manhattan, 1995.'});state.view='manuscript';state.activeChapterId=p.chapters[0].id;render();}""")
 page.locator('#m161-sheets-button').click()
 assert page.locator('.m162-sheet-panel .m143-ref-name').inner_text()=='Nora Whitmore'
 page.screenshot(path=str(r/'pruebas/MARGEN_162_Fichas.png'))
 b.close()

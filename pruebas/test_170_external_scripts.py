"""Check two ordered classic scripts and DOMContentLoaded bootstrap without network navigation.
Browser policy blocks localhost/file navigation in CI, hence scripts are inserted separately inline.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text()
styles=(r/'frontend/assets/margen.css').read_text()+'\n'+(r/'frontend/assets/margen-170.css').read_text()
core=(r/'frontend/assets/margen.js').read_text()
addon=(r/'frontend/assets/margen-170.js').read_text()
mock="""window.__TAURI__={core:{invoke:async function(cmd,args={}){
 if(cmd==='desktop_load_records')return {};
 if(cmd==='desktop_save_records')return {token:'x',recoveryAvailable:false};
 if(cmd==='desktop_export_backup')return 'C:/test.json';
 throw Error(cmd);
 }}};"""
html=html.replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+styles+'</style>')
html=html.replace('<link rel="stylesheet" href="./assets/margen-170.css">','')
html=html.replace('<script src="./assets/margen.js" defer></script>','')
html=html.replace('<script src="./assets/margen-170.js" defer></script>',
 '<script>'+mock+'</script><script>'+core+'</script><script>'+addon+'</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page()
 errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(260)
 assert page.locator('[data-m170-intro]').count()==1
 assert page.locator('.m170-intro-art').is_visible()
 assert page.evaluate('typeof m170OpenHelp')=='function'
 assert page.evaluate('!!db?.desktop')
 assert not errors,errors
 print('Two separate scripts + DOMContentLoaded + desktop bridge: PASS')
 browser.close()

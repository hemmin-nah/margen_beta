from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s=(root/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(root/'frontend/assets/margen.css').read_text()+'</style>')
s=s.replace('<script src="./assets/margen.js" defer></script>',"<script>window.__TAURI__={core:{invoke:async(cmd,args)=>cmd==='desktop_load_records'?{}:cmd==='desktop_save_records'?{token:'t',recoveryAvailable:false}:'C:/Users/Test/Downloads/backup.json'}};</script><script>"+(root/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1570,'height':960});errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(s,wait_until='load');page.wait_for_timeout(300)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 page.evaluate("() => {state.view='boards';activeBoard().diagramMode='free';render()}")
 e=page.locator('.board-item.text .item-body').first
 pos=e.bounding_box();x=pos['x']+min(30,pos['width']*.2);y=pos['y']+min(20,pos['height']*.2)
 old=page.evaluate("() => activeBoard().elements.find(it=>it.type==='text').x")
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+83,y+30,steps=6);page.mouse.up()
 new=page.evaluate("() => activeBoard().elements.find(it=>it.type==='text').x")
 print('DRAG',old,new,'diff',new-old)
 assert new>old+60,(old,new)
 # Repeat stamp via actual clicks on board background, verify points count.
 page.evaluate("() => {activeBoard().strokes=[{id:'foo',color:'#123456',width:4,points:[{x:60,y:60},{x:100,y:85}]}];drawStrokes();finishStampSelection({x1:40,y1:40,x2:130,y2:100})}")
 page.locator('.modal-backdrop input').first.fill('Sello via raton')
 page.once('dialog',lambda d:d.dismiss());page.locator('.modal-backdrop button').filter(has_text='Guardar sello').first.click()
 page.evaluate('stampLibrary()');page.locator('[data-m162-stamp-use]').first.click()
 before=page.evaluate('activeBoard().strokes.length')
 # Board viewport free area right bottom.
 vp=page.locator('#board-viewport').bounding_box()
 page.mouse.click(vp['x']+vp['width']*.8,vp['y']+vp['height']*.3)
 page.mouse.click(vp['x']+vp['width']*.8,vp['y']+vp['height']*.5)
 after=page.evaluate('activeBoard().strokes.length')
 print('STAMP CLICKS',before,after)
 assert after==before+2,(before,after)
 assert not errs,errs
 b.close()
 print('PRUEBA REAL DE RATON OK')

"""Pruebas de interfaz MARGEN Desktop 1.6.2, puente Tauri SIMULADO.
No compilan Rust ni constituyen validación del instalador real.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(root/'frontend/assets/margen.css').read_text()+'</style>')
fake=r'''window.__TAURI__={core:{invoke:async function(cmd,args={}){
if(cmd==='desktop_load_records')return {};
if(cmd==='desktop_save_records')return {token:'t1',recoveryAvailable:false};
if(cmd==='desktop_export_backup')return 'C:/Users/Pruebas/Downloads/MARGEN-copia.json';
throw Error(cmd)}}};'''
html=html.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+(root/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1570,'height':960});errors=[]
 page.on('pageerror',lambda e:(print('ERROR',str(e)),errors.append(str(e))))
 page.set_content(html,wait_until='load');page.wait_for_timeout(500)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 def test(code):
  return page.evaluate(code)
 assert test("document.querySelector('.brand .m11-version')?.textContent")=='1.6.4 · Desktop'
 for icon in ['close','file','folder','link','maximize','right']:
  assert page.locator('#i-'+icon).count()==1,icon
 print('1. Iconos y versión: OK')
 test("() => {state.view='manuscript';state.activeChapterId=activeProject().chapters[0].id;render()}")
 assert page.locator('#m161-sheets-button').count()==1
 page.locator('#m161-sheets-button').click()
 assert page.locator('.m162-sheet-panel').count()==1
 assert page.locator('.m143-ref-tabs button').count()==2
 assert page.locator('.m161-sheet-link').count()==0
 assert page.locator('.workspace.m162-sheets-visible').count()==1
 print('2. Fichas unificadas en editar: OK')
 test("() => {activeChapter().mode='screenplay';render()}")
 assert page.locator('.screenplay-area .editor-toolbar').count()==1
 assert page.locator('.m162-sheet-panel').count()==1
 page.locator('#m161-refs-button + #m161-sheets-button').first.click()
 assert page.locator('.m162-sheet-panel').count()==0
 page.locator('#m161-refs-button + #m161-sheets-button').first.click()
 assert page.locator('.m162-sheet-panel').count()==1
 print('3. Fichas unificadas en guion: OK')
 test("() => {activeChapter().mode='prose';render();m143SwitchStudio(true)}")
 assert page.locator('.m143-studio-topbar').count()==1
 assert page.locator('#m143-refs').count()==0
 assert page.locator('#m161-sheets-button').count()==1
 page.locator('#m161-sheets-button').click()
 assert page.locator('.m162-sheet-panel').count()==0
 page.locator('#m161-sheets-button').click()
 assert page.locator('.m162-sheet-panel').count()==1
 print('4. Fichas unificadas en escritura amplia: OK')
 test("() => {m143SwitchStudio(false);state.view='boards';state.activeBoardId=activeProject().boards[0].id;activeBoard().diagramMode='free';render()}")
 assert page.locator('#drawing-layer').count()==1
 assert page.locator('#m162-vector-strokes').count()==1
 assert page.locator('.m162-ruled-paper').count()==1
 assert test("() => document.querySelector('#drawing-layer').getBoundingClientRect().width")>1000
 test("() => {const b=activeBoard();b.strokes.push({id:'first-vector',color:'#2a4466',width:4,points:[{x:10,y:10},{x:120,y:85}]});drawStrokes()}")
 assert page.locator('#m162-vector-strokes path').count()==1
 assert 'L120 85' in page.locator('#m162-vector-strokes path').get_attribute('d')
 print('5. Lápiz SVG independiente del raster: OK')
 page.locator('[data-m144-bg="ruled"]').click()
 assert page.locator('#board-world.bg-ruled .m162-ruled-paper path').count()==1
 print('6. Pauta rayada vectorial: OK')
 # Los recuadros de texto ya no son editables por defecto.
 nodes=page.locator('#board-items .board-item');assert nodes.count()>0
 text_node=page.locator('#board-items .board-item.text').first
 assert text_node.locator('.item-body').get_attribute('contenteditable')=='false'
 text_node.locator('.item-body').dblclick(force=True)
 assert text_node.locator('.item-body').get_attribute('contenteditable')=='true'
 text_node.locator('.item-body').evaluate('(e)=>e.blur()')
 assert text_node.locator('.item-body').get_attribute('contenteditable')=='false'
 print('7. Caja de texto (arrastre + doble clic): OK')
 test("() => {finishStampSelection({x1:0,y1:0,x2:150,y2:100})}")
 assert page.locator('.modal-backdrop .modal').count()==1
 page.locator('.modal-backdrop input').first.fill('Prueba vector')
 page.once('dialog',lambda d:d.dismiss()) # sello local al libro
 page.locator('.modal-backdrop button').filter(has_text='Guardar sello').first.click()
 assert test("activeProject().stamps.some(s=>s.title==='Prueba vector'&&s.vectorStrokes?.length>0)")
 test("stampLibrary()")
 use=page.locator('[data-m162-stamp-use]').first
 use.click()
 assert test("boardTool")=='m162-stamp'
 previous=test('activeBoard().strokes.length')
 test("m162StampHere({x:210,y:210});m162StampHere({x:310,y:310})")
 assert test('activeBoard().strokes.length')==previous+2
 assert test("activeBoard().strokes.slice(-2).every(s=>!!s.stampInstanceId)")
 page.keyboard.press('Escape')
 assert test('boardTool')=='select'
 print('8. Estampado repetido vectorial y salida ESC: OK')
 assert not errors,errors
 page.screenshot(path=str(root/'pruebas/MARGEN_162_board.png'))
 browser.close()
 print('PRUEBAS FUNCIONALES SUPERADAS - entorno simulado, NO compilacion Windows')

"""Pruebas browser de la interacción 1.6.1. Simulación Tauri; no prueba compilación Windows."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
index=(root/'frontend/index.html').read_text()
css=(root/'frontend/assets/margen.css').read_text()
js=(root/'frontend/assets/margen.js').read_text()
fake=r'''window.__margenTest={records:{},saves:0,exports:0};
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 const d=window.__margenTest;
 if(cmd==='desktop_load_records')return JSON.parse(JSON.stringify(d.records));
 if(cmd==='desktop_save_records'){
  const current=d.records['workspace-meta']?.token??null;
  if(current!==args.expectedToken)throw Error('MARGEN_CONFLICT');
  if(d.records.workspace){d.records.recovery=structuredClone(d.records.workspace);d.records['recovery-meta']={token:current};}
  d.records.workspace=structuredClone(args.snapshot);d.records['workspace-meta']={token:'token-'+(++d.saves)};
  return {token:d.records['workspace-meta'].token,recoveryAvailable:!!d.records.recovery};}
 if(cmd==='desktop_export_backup'){d.exports++;return 'C:/MARGEN/copias-json/backup.json';}
 throw Error(cmd)
}}};'''
index=index.replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+css+'</style>')
index=index.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+js+'</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1550,'height':940})
    errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('JS ERROR:',str(e),'STACK:',e.stack)))
    page.set_content(index,wait_until='load')
    page.wait_for_timeout(1000)
    if page.locator('.m145-config-backdrop [data-m145-skip]').count(): page.locator('.m145-config-backdrop [data-m145-skip]').click()
    assert page.evaluate('m161OldSources().includes("este prototipo HTML")')
    assert not page.evaluate('m14SourcesHtml().includes("este prototipo HTML")')
    print('Mensaje .doc: correcto')
    # Importer mock source: complex inline formatting, image, bold and list.
    page.evaluate('''() => {
      m14Open();m14Draft.step=2;m14Draft.issues=[];
      m14Draft.chapters=[m14ChapterFromBlocks('Chapter One',[
       {html:'<p>First <strong>bold</strong> and <em>italic</em> words</p>',text:'First bold and italic words',heading:false,level:0},
       {html:'<p>Second paragraph <img src="data:image/png;base64,abc" alt="pic"></p><ul><li>item in a list</li></ul>',text:'Second paragraph',heading:false,level:0}
      ],'Sample.docx'),m14ChapterFromBlocks('Chapter Two',[
       {html:'<p>Other chapter</p>',text:'Other chapter',heading:false,level:0}
      ],'Sample.docx')];
      m14Render();
    }''')
    assert page.locator('#m14-overlay').count()==1
    assert page.get_by_role('button',name='Deshacer').is_disabled()
    # Choose a caret inside bold text; split at char 2 of bold.
    page.evaluate('''() => {
      const preview=document.querySelector('[data-m14-chapter="0"] .m14-rich-preview');
      const text=preview.querySelector('strong').firstChild;
      const range=document.createRange();range.setStart(text,2);range.collapse(true);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
      m161CaretFromSelection(preview);
    }''')
    page.locator('[data-m14-chapter="0"] > details').evaluate('(e)=>e.open=true')
    page.locator('[data-m14-chapter="0"] [data-m161-split]').click()
    state=page.evaluate('''() => ({count:m14Draft.chapters.length,left:m14ChapterHtml(m14Draft.chapters[0]),right:m14ChapterHtml(m14Draft.chapters[1]),last:m14ChapterHtml(m14Draft.chapters[2]),undo:m161UndoStack.length})''')
    print('División precisa:',state)
    assert state['count']==3
    assert '<strong>bo</strong>' in state['left']
    assert '<strong>ld</strong>' in state['right']
    assert '<em>italic</em>' in state['right']
    assert '<img ' in state['right']
    assert '<ul><li>item in a list</li></ul>' in state['right']
    assert state['undo']>=1
    page.get_by_role('button',name='Deshacer').click()
    assert page.evaluate('m14Draft.chapters.length')==2
    assert page.evaluate('m14ChapterHtml(m14Draft.chapters[0]).includes("<strong>bold</strong>")')
    page.get_by_role('button',name='Rehacer').click()
    assert page.evaluate('m14Draft.chapters.length')==3
    print('Deshacer y rehacer división: correcto')
    page.locator('[data-m14-merge="1"]').click()
    assert page.evaluate('m14Draft.chapters.length')==2
    page.get_by_role('button',name='Deshacer').click()
    assert page.evaluate('m14Draft.chapters.length')==3
    print('Deshacer unión: correcto')
    # Close draft and visit chapter & references.
    page.locator('#m14-close').click()
    page.evaluate('''() => {state.view='manuscript';const p=activeProject();state.activeChapterId=p.chapters[0]?.id;render()}''')
    assert page.locator('#m161-refs-button').count()==1
    assert page.locator('.m146-manuscript-refs').count()==0
    page.locator('#m161-refs-button').click()
    assert page.locator('#m161-side-panel').count()==1
    assert page.locator('.workspace.m161-side-open').count()==1
    page.locator('#m161-side-close').click()
    assert page.locator('.m161-side-open').count()==0
    print('Panel lateral referencias: correcto')
    # Book search now shrinks the editor area.
    page.locator('.m142-search-open').click()
    assert page.locator('.workspace.m161-search-open').count()==1
    assert page.locator('#m142-search-panel').count()==1
    page.locator('#m142-search-close').click()
    assert page.locator('.workspace.m161-search-open').count()==0
    print('Búsqueda lateral: correcto')
    page.evaluate('''() => {activeChapter().mode='screenplay';render()}''')
    assert page.locator('.screenplay-area').count()==1
    assert page.get_by_text('Formato monoespaciado').count()==0
    assert page.locator('#m161-sheets-button').count()==1
    page.locator('#m161-sheets-button').click()
    assert page.locator('.m162-sheet-panel').count()==1
    print('Modo guion: correcto')
    # Switching back to prose with source changes intact.
    page.evaluate('''() => {activeChapter().mode='prose';render()}''')
    assert page.locator('.m11-tree-entry .tree-leaf[data-type="manuscript"]').count()>=1
    # Order 3 chapters in the actual sidebar by mouse dragging the entire row.
    page.evaluate('''() => {
      const p=activeProject();p.chapters=[
        {id:'drag-A',title:'A',html:'<p>a</p>',updatedAt:now(),mode:'prose'},
        {id:'drag-B',title:'B',html:'<p>b</p>',updatedAt:now(),mode:'prose'},
        {id:'drag-C',title:'C',html:'<p>c</p>',updatedAt:now(),mode:'prose'}
      ];state.activeChapterId='drag-A';render();
    }''')
    boxes=page.locator('.m11-tree-entry:has(.tree-leaf[data-type="manuscript"])')
    assert boxes.count()>=3,f'Tree entries: {boxes.count()}'
    assert page.evaluate("activeProject().chapters.map(c=>c.id)")==['drag-A','drag-B','drag-C']
    origin=boxes.nth(0).bounding_box();target=boxes.nth(2).bounding_box()
    page.mouse.move(origin['x']+42,origin['y']+origin['height']/2)
    page.mouse.down()
    page.mouse.move(origin['x']+42,origin['y']+origin['height']/2+15,steps=3)
    page.mouse.move(target['x']+42,target['y']+target['height']*.7,steps=10)
    page.mouse.up()
    order=page.evaluate('activeProject().chapters.map(c=>c.id)')
    print('Orden por arrastre:',order)
    assert order==['drag-B','drag-C','drag-A'],order
    assert not errors,errors
    page.screenshot(path=str(root/'pruebas/MARGEN_161_editor.png'))
    print('TESTS OK: frontend simulado, no Windows',len(errors),'errores')
    browser.close()

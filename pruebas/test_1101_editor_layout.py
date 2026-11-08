"""MARGEN 1.10.1: fichas rápidas sin truncado y cabecera alineada con editor."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
assets=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101','margen-110']
html=(root/'frontend/index.html').read_text('utf8')
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.css').exists())
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.js').exists())
long_name='Un nombre muy muy muy largo para comprobar el corte completo'
book={'id':'a','name':'Libro','description':'','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'Capítulo','html':'<p>texto</p>','mode':'prose'}],'boards':[],'notes':[],'characters':[{'id':str(i),'title':n,'gallery':[]} for i,n in enumerate(['Gael','Basilio','Pomelo','Federoncino ♥','Gunther',long_name])],'settings':[],'outlines':[],'chronologies':[]}
state={'version':1,'theme':'dark','view':'manuscript','activeProjectId':'a','activeChapterId':'a1','projects':[book],'preferences':{'language':'es'}}
mock=f'''window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}};if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};if(cmd==='desktop_load_recovery')return {{}};if(cmd==='lexical_lookup')return {{definitions:[],synonymGroups:[]}};throw Error(cmd)}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')

def clear_overlays(page):
    page.evaluate("document.querySelectorAll('.modal-backdrop,.m171-splash,.m170-intro-backdrop,.m171-tour-backdrop').forEach(x=>x.remove())")

def enter_editor(page):
    clear_overlays(page)
    page.evaluate("()=>{state.theme='dark';state.view='manuscript';state.activeProjectId='a';state.activeChapterId='a1';render();}")
    page.wait_for_timeout(80)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    # Escritorio ancho: panel lateral y cabecera deben compartir límites con el papel.
    page=browser.new_page(viewport={'width':1400,'height':800})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load');page.wait_for_timeout(600);enter_editor(page)
    page.locator('#m161-sheets-button').click();page.wait_for_timeout(100)
    target=page.locator('[data-m143-ref]').filter(has_text=long_name)
    assert target.count()==1
    assert target.evaluate("el=>getComputedStyle(el).whiteSpace")=='normal'
    assert target.evaluate("el=>el.scrollHeight<=el.clientHeight+1"), 'El nombre largo queda recortado verticalmente'
    assert target.text_content()==long_name
    modes=page.locator('.m1431-mode-center').bounding_box();paper=page.locator('.editor-paper').bounding_box()
    assert abs(modes['x']-paper['x'])<=1.5,(modes,paper)
    assert abs(modes['width']-paper['width'])<=1.5,(modes,paper)
    assert page.locator('.m163-writing-type').count()==1
    assert not errors,errors
    # Buscar en libro usa el mismo desplazamiento horizontal.
    page.locator('.m142-search-open').click();page.wait_for_timeout(100)
    assert page.locator('#m142-search-panel').count()==1
    modes=page.locator('.m1431-mode-center').bounding_box();paper=page.locator('.editor-paper').bounding_box()
    assert abs(modes['x']-paper['x'])<=1.5,(modes,paper)
    assert abs(modes['width']-paper['width'])<=1.5,(modes,paper)
    page.close()
    # Ventana estrecha: el panel se coloca abajo y la cabecera no se fuerza lateralmente.
    page=browser.new_page(viewport={'width':1100,'height':650})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load');page.wait_for_timeout(600);enter_editor(page)
    page.locator('#m161-sheets-button').click();page.wait_for_timeout(100)
    panel=page.locator('.m162-sheet-panel').bounding_box()
    assert panel['width']>800 and panel['height']<300,panel
    assert not errors,errors
    page.close();browser.close()
print('PASS 1.10.1: nombres completos y cabecera alineada con paneles del editor')

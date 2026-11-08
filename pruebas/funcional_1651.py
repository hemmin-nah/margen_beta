"""Regresión 1.6.5 en Chromium con puente Tauri simulado; no compila Windows."""
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
html=(r/'frontend/index.html').read_text().replace('<link rel="stylesheet" href="./assets/margen.css">','<style>'+(r/'frontend/assets/margen.css').read_text()+'</style>')
fake="""window.__TAURI__={core:{invoke:async function(cmd,args={}){
 if(cmd==='desktop_load_records')return {};
 if(cmd==='desktop_save_records')return {token:'t1',recoveryAvailable:false};
 if(cmd==='desktop_export_backup')return 'C:/Users/test/Downloads/margen.json';
 throw Error(cmd)}}};"""
html=html.replace('<script src="./assets/margen.js" defer></script>','<script>'+fake+'</script><script>'+(r/'frontend/assets/margen.js').read_text()+'</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1540,'height':920})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(550)
 if page.locator('.m145-config-backdrop [data-m145-skip]').count():page.locator('.m145-config-backdrop [data-m145-skip]').click()
 ev=lambda js:page.evaluate(js)
 assert ev("document.querySelector('.brand .m11-version')?.textContent")=='1.6.6 · Desktop'
 assert page.locator('.m165-library-search').count()==1
 assert page.locator('.m165-back').count()==1
 assert not page.locator('[data-action="desk"]').count()
 assert page.locator('.m165-library-review').count()==1
 # Biblioteca filtros: no alteran datos.
 ev("() => { const p=activeProject(); p.name='Prueba biblioteca';render() }")
 page.locator('#m165-search').fill('prueba')
 
 
 assert page.locator('.project-card:not(.new):visible').count()==1
 page.locator('#m165-search').fill('no-existe-jamás')
 assert page.locator('.project-card:not(.new):visible').count()==0
 # Libro -> personaje -> atrás a libro (no siempre Biblioteca).
 ev("() => { state.view='manuscript';const p=activeProject();p.characters=[{id:'ch165',title:'Test Character',gallery:[],arc:[],physical:'rasgos',background:'historia'}];render() }")
 ev("() => { state.view='characters';state.activeCharacterId='ch165';render() }")
 assert page.locator('.m165-back').is_enabled()
 assert page.locator('.m165-character-triple>.char-panel').count()==3
 assert page.locator('.m165-evolution>summary>svg').count()==2
 assert 'Rasgos' in page.locator('.m165-character-triple>.m165-physical').inner_text()
 assert page.locator('.m165-evolution>summary').evaluate("e=>e.lastElementChild.tagName")=='svg'
 page.screenshot(path=str(r/'pruebas/MARGEN_165_Fichas.png'))
 page.locator('.m165-back').click()
 assert ev('state.view')=='manuscript'
 print('Atrás capítulo ⇆ personaje, tres tarjetas, evolución: OK')
 # DOCX con colores negro, rojo, azul, verde siempre tinta del tema sin modificar HTML.
 ev('''() => {activeChapter().html='<p><span style="color:#ff0000">Rojo</span><span style="color:#000000"><strong>Negro</strong></span><font color="#0000ff">Azul</font></p>';state.theme='dark';render()}''')
 colors=ev("Array.from(document.querySelectorAll('#chapter-editor span,#chapter-editor font')).map(e=>getComputedStyle(e).color)")
 assert len(set(colors))==1,colors
 assert ev("activeChapter().html.includes('#ff0000')")
 ev("() => {state.theme='light';render()}")
 colors_light=ev("Array.from(document.querySelectorAll('#chapter-editor span,#chapter-editor font')).map(e=>getComputedStyle(e).color)")
 assert len(set(colors_light))==1 and colors_light!=colors,(colors,colors_light)
 print('Colores de Word siguen el tema sin borrar estilos en datos: OK',colors,colors_light)
 # Scroll lateral cuando se crean fichas/capítulos.
 ev("() => {const p=activeProject();for(let i=0;i<34;i++)p.chapters.push({id:'long'+i,title:'Capítulo '+i,mode:'prose',html:'<p>Texto</p>'});state.view='manuscript';render()}")
 ev("document.querySelector('.sidebar-scroll').scrollTop=450")
 prev=ev("document.querySelector('.sidebar-scroll').scrollTop")
 ev("() => {state.activeChapterId='long33';render()}")
 aft=ev("document.querySelector('.sidebar-scroll').scrollTop")
 assert abs(aft-prev)<=2,(prev,aft)
 print('Scroll lateral no salta tras crear/seleccionar capítulo: OK')
 # Escaleta: añadir localización no cambia posición de scroll.
 ev("""() => {const p=activeProject();p.outlines=[{id:'o165',title:'Prueba escenas',blocks:[],scenes:Array.from({length:20},(_,i)=>({id:'s'+i,title:'Escena '+i,description:'Texto',blockId:'',status:'idea',characterIds:[],settingIds:[],expanded:true}))}];state.view='outlines';state.activeOutlineId='o165';render()}""")
 # Abrir los detalles de un elemento avanzado que fuerza scroll abajo.
 target=page.locator('[data-m164-temp-input="temporarySettings"]').last
 target.scroll_into_view_if_needed()
 old=ev("document.querySelector('.main-scroll').scrollTop")
 target.fill('Aeropuerto');target.press('Enter')
 assert ev("activeOutline().scenes[19].temporarySettings.includes('Aeropuerto')")
 new=ev("document.querySelector('.main-scroll').scrollTop")
 assert abs(new-old)<=3,(old,new)
 print('Escaleta: añadir lugar mantiene posición: OK',old,new)
 # Cronología: sin botones redundantes y sin título superior duplicado.
 ev("""() => {const p=activeProject();p.chronologies=[{id:'t165',title:'Mi cronología',events:[{id:'e165',title:'Evento',date:'Día 1',description:'Prueba',characterId:'ch165'}]}];state.activeChronologyId='t165';state.view='chronologies';render()}""")
 assert page.locator('.m131-editor-links').count()==0
 assert page.locator('.workspace-head h1').count()==0
 assert page.locator('[data-m164-time-person]').count()==1
 page.screenshot(path=str(r/'pruebas/MARGEN_165_Cronologia.png'))
 print('Cronología limpia y personas vinculadas: OK')
 # Scrollbar visible diferente al gris predeterminado.
 scrollbar=ev("getComputedStyle(document.querySelector('.main-scroll')).scrollbarColor")
 assert scrollbar and scrollbar!='auto',scrollbar
 print('Scrollbar personalizada:',scrollbar)
 # Comprobar ausencia de errores.
 assert not errors,errors
 print('PRUEBAS 1.6.5 COMPLETADAS — backend simulado, pendiente compilar Windows')
 browser.close()

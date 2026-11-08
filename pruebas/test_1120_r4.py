"""MARGEN 1.12.0: editor, título editorial, barra fija, escritura amplia y exportación."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from docx import Document
import json,re,io,base64
root=Path(__file__).resolve().parents[1]
assets=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101','margen-110','margen-111','margen-112']
html=(root/'frontend/index.html').read_text('utf8')
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.css').exists())
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.js').exists())
book={'id':'a','name':'LAPSUS','createdAt':'2026-01-01','chapters':[
 {'id':'a1','title':'Capítulo 1','documentTitle':'1. La tormenta','titleLayout':{'align':'left'},'html':'<p>Texto <strong>triste</strong> para probar el cuerpo.</p>','mode':'prose','layout':{'font':'serif','size':17,'leading':1.6,'margin':60}},
 {'id':'a2','title':'Capítulo 2','documentTitle':'2. Después','titleLayout':{'align':'center'},'html':'<p class="sc-scene" data-script="scene">int. casa - noche</p><p class="sc-character" data-script="character">vera</p><p class="sc-dialogue" data-script="dialogue">No te vayas.</p>','mode':'screenplay'}
],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[]}
state={'version':1,'theme':'dark','view':'manuscript','activeProjectId':'a','activeChapterId':'a1','projects':[book],'m145':{'language':'es','theme':'dark','accent':'sage','workspace':'complete','onboarded':True}}
health={'ok':True,'appVersion':'1.12.0','dbSchema':1110,'previousUnclean':False,'recoveryAvailable':False,'backupCount':1,'latestBackup':'','resources':[],'issues':[]}
support={'appVersion':'1.12.0','dataDirectory':'C:/MARGEN','databaseSize':100,'dbSchema':1110,'backupCount':1,'latestBackup':'','legalText':'Licencias'}
mock=f'''window.__exports=[];window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{
 if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0'}}}};
 if(cmd==='desktop_load_book')return structuredClone({json.dumps(book)});if(cmd==='desktop_load_cover')return null;
 if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:false}};
 if(cmd==='desktop_startup_health')return {json.dumps(health)};if(cmd==='desktop_support_info')return {json.dumps(support)};
 if(cmd==='desktop_log_error'||cmd==='desktop_mark_clean_shutdown')return null;
 if(cmd==='desktop_export_document'){{window.__exports.push(args);return 'D:/test.'+args.extension}};
 if(cmd==='desktop_export_backup')return 'D:/backup.json';
 if(cmd==='lexical_lookup')return {{query:args.term,definitions:[],synonymGroups:[{{synonyms:['macabro','apenado','melancólico'],source:'Test',license:'Test'}}]}};
 throw Error(cmd)}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')

def clear(page):
 page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-tour-backdrop,.modal-backdrop,.m111-backdrop').forEach(x=>x.remove())")
 page.evaluate("()=>{state.theme='dark';state.view='manuscript';state.activeProjectId='a';state.activeChapterId='a1';ensureSelections();render()}")
 page.wait_for_timeout(120)

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':860});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(700);clear(page)
 # Nombre organizativo y título visible separados. El nombre se edita SOLO en el árbol.
 assert page.locator('#chapter-title').input_value()=='1. La tormenta'
 assert page.locator('[data-m112-rename-internal]').count()==0
 page.locator('#chapter-title').fill('1. Tormenta sobre Alicante');page.locator('#chapter-title').dispatch_event('blur')
 assert page.evaluate("activeChapter().title")=='Capítulo 1'
 assert page.evaluate("activeChapter().documentTitle")=='1. Tormenta sobre Alicante'
 # El clic sobre el capítulo ya abierto no reconstruye el editor (evita el parpadeo innecesario).
 page.evaluate("window.__m112EditorRef=document.querySelector('#chapter-editor')")
 active_leaf=page.locator('.tree-leaf[data-type="manuscript"][data-id="a1"]')
 active_leaf.click();page.wait_for_timeout(30)
 assert page.evaluate("document.querySelector('#chapter-editor')===window.__m112EditorRef")
 # Doble clic: renombrado inline en el árbol, sin tocar el título editorial.
 active_leaf.dblclick();page.wait_for_timeout(30)
 rename=page.locator('.m112-tree-rename');assert rename.count()==1
 rename.fill('Capítulo inicial');rename.press('Enter');page.wait_for_timeout(30)
 assert page.evaluate("activeChapter().title")=='Capítulo inicial'
 assert page.evaluate("activeChapter().documentTitle")=='1. Tormenta sobre Alicante'
 assert page.locator('.tree-leaf[data-type="manuscript"][data-id="a1"] .truncate').inner_text()=='Capítulo inicial'
 # También funciona al hacer doble clic sobre OTRO capítulo: el primer clic lo abre y el segundo entra a renombrar.
 page.locator('.tree-leaf[data-type="manuscript"][data-id="a2"]').dblclick();page.wait_for_timeout(50)
 rename2=page.locator('.m112-tree-rename');assert rename2.count()==1
 rename2.fill('Capítulo de guion');rename2.press('Enter');page.wait_for_timeout(30)
 assert page.evaluate("activeChapter().title")=='Capítulo de guion'
 assert page.evaluate("activeChapter().documentTitle")=='2. Después'
 # Guion usa el mismo bloque de tres filas y también responde a Completa/Compacta.
 assert page.locator('.screenplay-area').count()==1
 assert page.locator('.workspace-head.m112-unified-head > .m112-toolstack').count()==1
 page.locator('[data-m112-toolbar-toggle]').click();assert page.locator('.workspace-head.m112-unified-head').get_attribute('data-m112-toolbar')=='compact'
 page.locator('[data-m112-toolbar-toggle]').click();assert page.locator('.workspace-head.m112-unified-head').get_attribute('data-m112-toolbar')=='full'
 page.evaluate("state.activeChapterId='a1';render()");page.wait_for_timeout(50)
 # Alineación del título visible usa LOS MISMOS botones de alineación del texto.
 page.locator('#chapter-title').focus();page.locator('.m112-stack-format [data-format="justifyCenter"]').click();assert page.evaluate("activeChapter().titleLayout.align")=='center'
 assert page.locator('#chapter-title').evaluate("e=>getComputedStyle(e).textAlign")=='center'
 assert page.locator('[data-m112-title-align]').count()==0
 page.screenshot(path=str(root/'pruebas/MARGEN_1120_R4_Toolbar.png'),full_page=False)
 head=page.locator('.workspace-head.m112-unified-head');stack=head.locator(':scope > .m112-toolstack')
 assert head.locator(':scope > .m112-head-title h1').inner_text()=='Manuscrito'
 assert head.locator(':scope > .m112-head-actions').count()==1
 assert stack.locator('[data-action="export-text"], [data-m180-export], [data-action="rename-chapter"], [data-action="delete-chapter"]').count()==0
 assert stack.locator('.m11-navbox #m161-sheets-button').count()==1
 assert stack.locator('.m112-stack-primary').count()==1 and stack.locator('.m112-stack-secondary').count()==1 and stack.locator('.m112-stack-format').count()==1
 # Orden: fila 1 modos/búsqueda/tipo; fila 2 capítulo/buscar/sinónimos/referencias/fichas; fila 3 formato.
 assert stack.locator('.m112-stack-primary [data-action="m142-edit"]').count()==1
 assert stack.locator('.m112-stack-primary .m142-search-open').count()==1
 assert stack.locator('.m112-stack-primary .screenplay-mode-switch').count()==1
 assert stack.locator('.m112-stack-secondary #m11-jump').count()==1
 second=stack.locator('.m112-stack-secondary .m11-navgroup:last-child')
 labels=[x.strip() for x in second.locator('button').all_inner_texts()]
 assert labels[:4]==['Buscar','Sinónimos','Referencias','Fichas'],labels
 assert stack.locator('.m112-stack-format #chapter-font').count()==1
 assert stack.locator('.m112-stack-format #chapter-margin').count()==1
 assert stack.locator('.m112-stack-format [data-format="bold"]').count()==1
 # La cabecera/bloque queda fuera del scroll del editor: su posición no cambia al desplazarse el documento.
 y0=stack.bounding_box()['y'];page.locator('.editor-area').evaluate("e=>e.scrollTop=350");page.wait_for_timeout(30);y1=stack.bounding_box()['y'];assert abs(y1-y0)<1,(y0,y1)
 # Margen del editor gobierna el papel y el tipo de página ya NO aparece en el editor.
 assert page.locator('#m11-page-format').count()==0
 margin=page.locator('#chapter-margin');assert margin.count()==1
 margin.select_option('32');page.wait_for_timeout(30)
 pad=page.locator('.editor-paper').evaluate("e=>getComputedStyle(e).paddingLeft")
 assert pad.startswith('32'),pad
 # Barra completa/compacta, iconos distintos y Tx.
 assert page.locator('[data-m112-clear-format]').count()==1
 assert page.locator('.m112-numbered-icon').count()==1
 full_width=page.locator('.m112-stack-secondary [data-action="m11-find"]').bounding_box()['width']
 page.locator('[data-m112-toolbar-toggle]').click();assert page.locator('.workspace-head.m112-unified-head').get_attribute('data-m112-toolbar')=='compact'
 assert page.locator('.m112-toolstack .m112-stack-primary').count()==1 and page.locator('.m112-toolstack .m112-stack-secondary').count()==1 and page.locator('.m112-toolstack .m112-stack-format').count()==1
 compact_width=page.locator('.m112-stack-secondary [data-action="m11-find"]').bounding_box()['width'];assert compact_width < full_width,(full_width,compact_width)
 page.locator('[data-m112-toolbar-toggle]').click();assert page.locator('.workspace-head.m112-unified-head').get_attribute('data-m112-toolbar')=='full'
 # Tab no saca el foco del editor e inserta sangría.
 ed=page.locator('#chapter-editor');ed.click();before=ed.inner_html();ed.press('Tab');after=ed.inner_html();assert after!=before
 # Sinónimos: recorrido humano. Selección -> clic Sinónimos -> clic alternativa -> reemplazo real.
 page.evaluate("()=>{const target=document.querySelector('#chapter-editor strong').firstChild;const r=document.createRange();r.selectNodeContents(target);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r)}")
 assert page.evaluate("window.getSelection().toString()")=='triste'
 page.locator('#synonyms-btn').click();page.wait_for_timeout(180)
 assert page.locator('.m173-syn-popup [data-m173-replace="macabro"]').count()==1
 page.locator('.m173-syn-popup [data-m173-replace="macabro"]').click();page.wait_for_timeout(40)
 assert 'Texto macabro' in ed.inner_text(),ed.inner_text()
 # Escritura amplia: zoom y Editar de la fila de modos sale realmente del modo.
 page.evaluate('m143SwitchStudio(true)');page.wait_for_timeout(80)
 assert page.locator('body.m143-studio .workspace-head.m112-unified-head .m112-toolstack').is_visible()
 assert page.locator('.m143-studio-topbar').evaluate("e=>getComputedStyle(e).display")=='none'
 old=page.evaluate('m112WideZoom');page.locator('[data-m112-zoom-in]').click();assert page.evaluate('m112WideZoom')>old
 page.locator('.m112-toolstack [data-action="m142-edit"]').click();page.wait_for_timeout(60);assert not page.evaluate('m143Studio')
 # Carpetas: un solo nivel para Personajes/Escenarios, mover fichas y conservarlas al eliminar carpeta.
 page.evaluate("()=>{const p=activeProject();p.characters.push({id:'c1',title:'Pepe'});p.characters.push({id:'c2',title:'Ana'});state.view='characters';state.activeCharacterId='c1';render()}");page.wait_for_timeout(50)
 assert page.locator('.tree-section[data-section="characters"] [data-m112-folder-add]').count()==1
 page.locator('.tree-section[data-section="characters"] [data-m112-folder-add]').click();page.wait_for_timeout(20)
 page.locator('#m-title').fill('Gente de Alicante');page.locator('.modal button[type="submit"]').click();page.wait_for_timeout(50)
 assert page.evaluate("activeProject().characterFolders.length")==1
 move=page.locator('.tree-leaf[data-type="characters"][data-id="c1"]').locator('xpath=..').locator('[data-m112-folder-move]');move.click();page.wait_for_timeout(20)
 page.locator('.m112-folder-menu button',has_text='Gente de Alicante').click();page.wait_for_timeout(50)
 assert page.evaluate("activeProject().characters.find(x=>x.id==='c1').folderId===activeProject().characterFolders[0].id")
 assert page.locator('.m112-folder-group .tree-leaf[data-id="c1"]').count()==1
 assert page.locator('.m112-folder-loose .tree-leaf[data-id="c2"]').count()==1
 # No hay UI para subcarpetas dentro de una carpeta: solo el nivel de categoría.
 assert page.locator('.m112-folder-group [data-m112-folder-add]').count()==0

 # Diccionario no ofrece Escritorio.
 page.evaluate("state.view='dictionary';render()");page.wait_for_timeout(50);assert page.locator('.sidebar .sidebaritem',has_text='Escritorio').count()==0
 # Acerca legible en noche y con icono diferenciado.
 page.evaluate("state.view='manuscript';state.activeChapterId='a1';render()");page.wait_for_timeout(50)
 assert page.locator('.m111-about-btn').count()==1
 page.locator('.m111-about-btn').click();page.wait_for_timeout(50)
 bg=page.locator('.m111-card').evaluate("e=>getComputedStyle(e).backgroundColor");assert bg!='rgb(255, 255, 255)',bg
 page.locator('.m111-close').click()
 # Exportación: usa título visible, navega por capítulos y tamaño de cuerpo solicitado.
 page.locator('[data-m180-export]').click();page.wait_for_timeout(80)
 assert '1. Tormenta sobre Alicante' in page.locator('#m180-sample').inner_text()
 page.locator('#m112-preview-next').click();assert '2. Después' in page.locator('#m180-sample').inner_text()
 assert page.locator('#m180-sample .m180-screenplay-preview').count()==1
 assert page.locator('#m180-sample .m180-screenplay-preview .sc-dialogue').evaluate("e=>getComputedStyle(e).color")== 'rgb(0, 0, 0)'
 page.locator('#m112-preview-prev').click();page.locator('#m180-size').fill('14');page.locator('#m180-size').dispatch_event('input')
 assert page.locator('#m180-sample').evaluate("e=>getComputedStyle(e).fontSize")=='14px'
 page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===1')
 doc=Document(io.BytesIO(base64.b64decode(page.evaluate('window.__exports[0].dataBase64'))))
 texts=[p.text for p in doc.paragraphs];assert '1. Tormenta sobre Alicante' in texts and '2. Después' in texts
 body=next(p for p in doc.paragraphs if 'Texto macabro' in p.text)
 assert any(abs((r.font.size.pt if r.font.size else 0)-14)<.1 for r in body.runs),[(r.text,r.font.size.pt if r.font.size else None) for r in body.runs]
 # Guion: exportación mantiene escena/personaje/diálogo como estructuras diferenciadas.
 p_scene=next(p for p in doc.paragraphs if 'INT. CASA - NOCHE' in p.text);p_char=next(p for p in doc.paragraphs if p.text.strip()=='VERA');p_dial=next(p for p in doc.paragraphs if 'No te vayas.' in p.text)
 assert p_scene.runs and p_scene.runs[0].bold
 assert p_char.alignment is not None
 assert p_dial.paragraph_format.left_indent is not None
 assert all((r.font.color.rgb is None or str(r.font.color.rgb)=='000000') for p in doc.paragraphs for r in p.runs)
 assert not errors,errors
 page.screenshot(path=str(root/'pruebas/MARGEN_1120_Editor.png'),full_page=False)
 b.close()
print('PASS 1.12.0 R4: barra ordenada, compacta real, título, carpetas y exportación')

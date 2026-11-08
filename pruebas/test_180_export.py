"""MARGEN 1.8.0 — pruebas de los tres archivos generados con Chromium.
Compara DOCX real, PDF real y TXT real; NO demuestra compilación Tauri/Windows.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from docx import Document
import re,zipfile,io,base64,subprocess,hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text(encoding='utf-8')
names=['margen','margen-170','margen-171','margen-172','margen-173','margen-180']
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text(encoding='utf-8') for n in names)
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text(encoding='utf-8') for n in names)
mock='''
window.__exports=[];
window.__TAURI__={core:{invoke:async function(cmd,args={}){
 if(cmd==='desktop_load_records')return {};
 if(cmd==='desktop_save_records')return {token:'saved',recoveryAvailable:false};
 if(cmd==='desktop_export_backup')return 'C:/Users/Test/Downloads/backup.json';
 if(cmd==='desktop_export_document'){
   window.__exports.push(args);
   return 'C:/Users/Test/Downloads/'+args.filename;
 }
 if(cmd==='lexical_lookup')return {word:args.term,definitions:[],synonymGroups:[]};
 throw Error('Unknown command '+cmd);
}}};
'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
img=Image.new('RGB',(25,25),(30,120,140));buff=io.BytesIO();img.save(buff,format='PNG');png_uri='data:image/png;base64,'+base64.b64encode(buff.getvalue()).decode()
output=root/'pruebas/export_180';output.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1550,'height':900})
 errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(450)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click();page.locator('[data-m145-save]').click();page.wait_for_timeout(100)
  if page.locator('[data-m170-not-now]').count():page.locator('[data-m170-not-now]').click()
 # Mock a book with two chapters and one image, preserving HTML markup.
 page.evaluate('''img=>{
 const p=activeProject();p.name='Historia de prueba';
 p.chapters=[{id:'chap1',title:'El principio',html:'<p>La <strong>primera</strong> línea con <em>cursiva</em> y ñáéíóú.</p><p><img src="'+img+'" alt="prueba"></p><ul><li>Primer elemento</li><li>Otro elemento</li></ul><table><tr><td>Celda A</td><td>Celda B</td></tr></table>'},
 {id:'chap2',title:'El final',html:'<p>Y después vino <u>la noche</u>.</p><blockquote>Una cita breve.</blockquote>'}];
 state.activeChapterId='chap1';state.view='manuscript';render();
 }''',png_uri)
 assert page.locator('[data-m180-export]').count()==1
 page.locator('[data-m180-export]').click()
 assert page.locator('.m180-dialog').count()==1
 assert page.locator('[data-m180-chapter]').count()==2
 page.screenshot(path=str(output/'MARGEN_180_Exportacion.png'))
 assert page.locator('#m180-sample').inner_text().find('primera')>=0
 # DOCX
 page.locator('#m180-go').click()
 page.wait_for_function('window.__exports.length===1',timeout=30000)
 page.locator('[data-m172-accept]').click()
 data=page.evaluate('window.__exports[0]')
 assert data['extension']=='docx'
 docbytes=base64.b64decode(data['dataBase64']);(output/'Manuscrito.docx').write_bytes(docbytes)
 z=zipfile.ZipFile(io.BytesIO(docbytes));assert z.testzip() is None
 assert 'word/media/image1.png' in z.namelist(),z.namelist()
 doc=Document(io.BytesIO(docbytes))
 text='\n'.join(p.text for p in doc.paragraphs)
 assert 'El principio' in text and 'El final' in text and 'primera' in text and 'la noche' in text,text
 assert len(doc.inline_shapes)==1,len(doc.inline_shapes)
 bold_runs=[r for p in doc.paragraphs for r in p.runs if r.text=='primera']
 assert bold_runs and bold_runs[0].bold is True
 assert len(doc.tables)==1
 # PDF
 page.locator('[data-m180-export]').click();page.locator('#m180-format').select_option('pdf')
 page.locator('#m180-paper').select_option('book')
 page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===2',timeout=30000)
 page.locator('[data-m172-accept]').click()
 pdfbytes=base64.b64decode(page.evaluate('window.__exports[1].dataBase64'))
 (output/'Manuscrito.pdf').write_bytes(pdfbytes)
 p=subprocess.run(['pdfinfo',str(output/'Manuscrito.pdf')],capture_output=True,text=True)
 print('PDFINFO:',p.stdout[:350],p.stderr[:300]);assert p.returncode==0
 pt=subprocess.run(['pdftotext','-layout',str(output/'Manuscrito.pdf'),'-'],capture_output=True,text=True)
 print('PDFTEXT:',pt.stdout[:350],pt.stderr[:300]);assert pt.returncode==0
 assert 'El principio' in pt.stdout and 'El final' in pt.stdout
 assert 'ñáéíóú' in pt.stdout,repr(pt.stdout)
 # TXT
 page.locator('[data-m180-export]').click();page.locator('#m180-format').select_option('txt')
 page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===3',timeout=30000)
 page.locator('[data-m172-accept]').click()
 txtbytes=base64.b64decode(page.evaluate('window.__exports[2].dataBase64'));(output/'Manuscrito.txt').write_bytes(txtbytes)
 s=txtbytes.decode('utf-8-sig');assert 'ñáéíóú' in s and 'El final' in s and 'primera' in s
 # select only second chapter
 page.locator('[data-m180-export]').click()
 page.locator('[data-m180-chapter="chap1"]').uncheck()
 page.locator('#m180-format').select_option('docx')
 page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===4',timeout=30000)
 doc2=Document(io.BytesIO(base64.b64decode(page.evaluate('window.__exports[3].dataBase64'))))
 text2='\n'.join(p.text for p in doc2.paragraphs)
 assert 'El final' in text2 and 'El principio' not in text2
 assert not errors, errors
 print('PASS: DOCX fonts/runs/table/image, PDF validation/accented text, TXT UTF-8, chapter selection and preview')
 b.close()

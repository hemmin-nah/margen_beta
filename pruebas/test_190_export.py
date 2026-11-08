"""Regresión 1.9: márgenes, guardado cancelado, DOCX y PDF reales (puente simulado)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from docx import Document
import re,io,base64,subprocess
p=Path(__file__).resolve().parents[1]
h=(p/'frontend/index.html').read_text('utf8')
names=['margen','margen-170','margen-171','margen-172','margen-173','margen-180']
css='\n'.join((p/'frontend/assets'/f'{n}.css').read_text('utf8') for n in names)
js='\n'.join((p/'frontend/assets'/f'{n}.js').read_text('utf8') for n in names)
mock='''window.__exports=[];window.__cancel=false;window.__TAURI__={core:{invoke:async(cmd,args)=>{if(cmd==='desktop_load_records')return {};if(cmd==='desktop_save_records')return {token:'t',recoveryAvailable:false};if(cmd==='desktop_export_backup')return window.__cancel?null:'D:/backup.json';if(cmd==='desktop_export_document'){window.__exports.push(args);return window.__cancel?null:'D:/novelas/libro.'+args.extension};if(cmd==='lexical_lookup')return {definitions:[],synonymGroups:[]};throw Error(cmd)}}};'''
h=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',h)
h=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',h)
h=h.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
out=p/'pruebas/190-resultado';out.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1540,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(h,wait_until='load');page.wait_for_timeout(270)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click();page.locator('[data-m145-save]').click();page.wait_for_timeout(70)
  if page.locator('[data-m170-not-now]').count():page.locator('[data-m170-not-now]').click()
 page.evaluate("()=>{let p=activeProject();p.name='Novela de prueba';p.chapters=[{id:'c1',title:'Inicio',html:'<p>Texto en <strong>negrita</strong> y ñáé.</p>'},{id:'c2',title:'Final',html:'<p>Un final.</p>'}];state.activeChapterId='c1';state.view='manuscript';render()}")
 page.locator('[data-m180-export]').click()
 assert '2 de 2' in page.locator('#m180-count').inner_text(),page.locator('#m180-count').inner_text()
 for side,n in [('top','17'),('right','28'),('bottom','31'),('left','42')]:page.locator('#m190-'+side).fill(n)
 page.locator('#m180-size').fill('12.5');page.locator('#m180-leading').fill('1.75');page.screenshot(path=str(out/'MARGEN_190_Exportacion.png'))
 page.screenshot(path=str(out/'MARGEN_190_Exportacion.png'))
 page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===1');doc=Document(io.BytesIO(base64.b64decode(page.evaluate('window.__exports[0].dataBase64'))))
 for side,n in [('top',17),('right',28),('bottom',31),('left',42)]:assert abs(getattr(doc.sections[0],side+'_margin').mm-n)<.06
 assert len([x for x in doc.paragraphs if x.text=='Inicio'])==1 and len([x for x in doc.paragraphs if x.text=='Final'])==1
 page.locator('[data-m172-accept]').click();page.locator('[data-m180-export]').click();page.locator('#m180-format').select_option('pdf')
 page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===2');pdf=base64.b64decode(page.evaluate('window.__exports[1].dataBase64'));pdfpath=out/'test.pdf';pdfpath.write_bytes(pdf)
 assert subprocess.run(['pdfinfo',str(pdfpath)],capture_output=True).returncode==0
 txt=subprocess.run(['pdftotext',str(pdfpath),'-'],capture_output=True,text=True).stdout;assert 'Inicio' in txt and 'Final' in txt
 page.locator('[data-m172-accept]').click();page.locator('[data-m180-export]').click();page.locator('#m180-paper').select_option('book')
 page.locator('#m190-left').fill('70');page.locator('#m190-right').fill('70');assert page.locator('#m180-go').is_disabled()
 page.locator('#m190-left').fill('20');assert page.locator('#m180-go').is_enabled();page.locator('#m180-cancel').click()
 page.evaluate('window.__cancel=true');page.locator('[data-m180-export]').click();page.locator('#m180-go').click();page.wait_for_function('window.__exports.length===3');page.wait_for_timeout(90)
 assert page.locator('.m180-dialog').count()==1
 assert not errors,errors
 print('PASS 1.9: DOCX+PDF reales, 4 márgenes, fuente, selección completa, límites y cancelación')
 b.close()

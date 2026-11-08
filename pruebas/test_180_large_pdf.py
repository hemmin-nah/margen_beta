"""Prueba de 120 capítulos breves (120 páginas), sin instalar Tauri."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,base64,subprocess
root=Path(__file__).resolve().parents[1]
html=(root/'frontend/index.html').read_text(encoding='utf8')
names=['margen','margen-170','margen-171','margen-172','margen-173','margen-180']
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text(encoding='utf8') for n in names)
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text(encoding='utf8') for n in names)
mock="""
window.exports=[];window.__TAURI__={core:{invoke:async(cmd,args={})=>{
if(cmd==='desktop_load_records')return {};
if(cmd==='desktop_save_records')return {token:'ok',recoveryAvailable:false};
if(cmd==='desktop_export_document'){exports.push(args);return 'C:/Downloads/'+args.filename;}
if(cmd==='lexical_lookup')return {definitions:[],synonymGroups:[]};
if(cmd==='desktop_export_backup')return 'C:/Downloads/back.json';
throw Error(cmd);
}}};"""
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1400,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(400)
 if page.locator('[data-m170-intro-go]').count():
  page.locator('[data-m170-intro-go]').click();page.locator('[data-m145-save]').click();page.wait_for_timeout(70)
  if page.locator('[data-m170-not-now]').count():page.locator('[data-m170-not-now]').click()
 page.evaluate('''()=>{const p=activeProject();p.chapters=Array.from({length:120},(_,i)=>({id:'id'+i,title:'Capítulo '+(i+1),html:'<p>'+('Esta es una prueba de texto largo con ñ á y palabras variadas. '.repeat(8))+'</p><p><strong>Negrita</strong> y <em>cursiva</em>.</p>'}));state.view='manuscript';state.activeChapterId='id0';render()}''')
 page.locator('[data-m180-export]').click();page.locator('#m180-format').select_option('pdf')
 page.locator('#m180-go').click();page.wait_for_function('exports.length===1',timeout=90000)
 b64=page.evaluate('exports[0].dataBase64');target=root/'pruebas/export_180/120_capitulos.pdf';target.write_bytes(base64.b64decode(b64))
 info=subprocess.run(['pdfinfo',str(target)],capture_output=True,text=True,check=True)
 assert 'Pages:           120' in info.stdout,info.stdout
 text=subprocess.check_output(['pdftotext',str(target),'-']).decode('utf-8')
 assert 'Capítulo 120' in text and 'Capítulo 1' in text and 'ñ á' in text
 assert not errors,errors
 print('PASS: PDF de 120 capítulos, 120 páginas, texto íntegro y legible')
 b.close()

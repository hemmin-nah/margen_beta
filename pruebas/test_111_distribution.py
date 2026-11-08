"""MARGEN 1.11.0: soporte para distribución, diagnóstico y cierre inesperado."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]
assets=['margen','margen-170','margen-171','margen-172','margen-173','margen-180','margen-191','margen-1101','margen-110','margen-111','margen-112']
html=(root/'frontend/index.html').read_text('utf8')
css='\n'.join((root/'frontend/assets'/f'{n}.css').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.css').exists())
js='\n'.join((root/'frontend/assets'/f'{n}.js').read_text('utf8') for n in assets if (root/'frontend/assets'/f'{n}.js').exists())
book={'id':'a','name':'Libro','createdAt':'2026-01-01','chapters':[{'id':'a1','title':'Capítulo','html':'<p>texto privado que no debe aparecer en diagnóstico</p>'}],'boards':[],'notes':[],'characters':[],'settings':[],'outlines':[],'chronologies':[]}
state={'version':1,'theme':'light','view':'library','activeProjectId':'a','activeChapterId':'a1','projects':[book],'m145':{'language':'es','theme':'light','accent':'sage','workspace':'complete','onboarded':True}}
support={'appVersion':'1.12.0','dataDirectory':'C:/Users/Test/AppData/Roaming/com.margen.escritorio','databaseSize':123456,'dbSchema':1110,'backupCount':2,'latestBackup':'1793811600','legalText':'Open English WordNet — CC BY 4.0'}
health={'ok':True,'appVersion':'1.12.0','dbSchema':1110,'previousUnclean':False,'recoveryAvailable':True,'backupCount':2,'latestBackup':'1793811600','resources':[{'name':'english.sqlite3','available':True,'size':1,'detail':'OK'}],'issues':[]}
mock=f'''window.__m111Test={{opened:0,diagnostics:0,logs:[],health:{json.dumps(health)},support:{json.dumps(support)}}};
window.__TAURI__={{core:{{invoke:async(cmd,args={{}})=>{{const d=window.__m111Test;
 if(cmd==='desktop_load_index'||cmd==='desktop_load_records')return {{workspace:{json.dumps(state)},'workspace-meta':{{token:'t0',time:'0'}},recoveryAvailable:true}};
 if(cmd==='desktop_load_recovery')return {{recovery:{json.dumps(state)},'recovery-meta':{{token:'r0',time:'0'}}}};
 if(cmd==='desktop_save_incremental'||cmd==='desktop_save_records')return {{token:'t1',recoveryAvailable:true,backupWarning:null}};
 if(cmd==='desktop_load_cover')return null;if(cmd==='desktop_load_book')return structuredClone({json.dumps(book)});
 if(cmd==='desktop_startup_health')return structuredClone(d.health);if(cmd==='desktop_support_info')return structuredClone(d.support);
 if(cmd==='desktop_open_data_folder'){{d.opened++;return null}};if(cmd==='desktop_export_diagnostics'){{d.diagnostics++;return 'D:/MARGEN-diagnostico.txt'}};
 if(cmd==='desktop_log_error'){{d.logs.push(args.message);return null}};if(cmd==='desktop_export_backup')return 'D:/backup.json';
 if(cmd==='desktop_export_document')return 'D:/book.'+args.extension;if(cmd==='lexical_lookup')return {{definitions:[],synonymGroups:[]}};throw Error(cmd);
}}}}}};'''
html=re.sub(r'<link rel="stylesheet" href="\./assets/[^"]+">','',html)
html=re.sub(r'<script src="\./assets/[^"]+" defer></script>','',html)
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+js+'</script></body>')

def clean(page):
    page.evaluate("document.querySelectorAll('.m171-splash,.m170-intro-backdrop,.m171-tour-backdrop,.modal-backdrop').forEach(x=>x.remove())")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1300,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load');page.wait_for_timeout(650);clean(page);page.evaluate('render()');page.wait_for_timeout(80)
    assert page.locator('.brand .m11-version').text_content()=='1.12.0 · Beta'
    assert page.locator('.m111-about-btn').count()==1
    page.locator('.m111-about-btn').click();page.wait_for_timeout(80)
    assert page.locator('.m111-card').count()==1
    assert page.locator('[data-m111-version]').text_content()=='1.12.0'
    assert page.locator('[data-m111-schema]').text_content()=='1110'
    assert 'C:/Users/Test' in page.locator('[data-m111-path]').text_content()
    assert '2 copias' in page.locator('[data-m111-backups]').text_content()
    assert 'CC BY 4.0' in page.locator('[data-m111-legal]').text_content()
    page.screenshot(path=str(root/'pruebas/MARGEN_111_Acerca.png'))
    page.locator('[data-m111-open-data]').click();page.wait_for_timeout(20);assert page.evaluate('window.__m111Test.opened')==1
    page.locator('[data-m111-diagnostics]').click();page.wait_for_timeout(20);assert page.evaluate('window.__m111Test.diagnostics')==1
    page.evaluate("document.querySelector('[data-m172-dialog]')?.remove()")
    page.locator('.m111-close').click();
    # Preferencias expone soporte sin mezclarlo con herramientas creativas.
    page.evaluate('m145OpenSettings(false)');page.wait_for_timeout(50)
    assert page.locator('.m111-settings-support').count()==1
    assert page.locator('[data-m111-about]').count()==1
    page.locator('[data-m145-cancel]').click()
    assert not errors,errors
    page.close()

    # Una sesión anterior no cerrada se explica y ofrece recovery, sin restaurarlo sola.
    page=browser.new_page(viewport={'width':1200,'height':760});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    crash=html.replace('"previousUnclean": false','"previousUnclean": true')
    page.set_content(crash,wait_until='load');page.wait_for_timeout(750);clean(page);page.evaluate('()=>{m111HealthShown=false;return m111CheckHealth()}');page.wait_for_timeout(80)
    assert page.locator('.m111-card').count()==1
    assert 'no se cerró con normalidad' in page.locator('#m111-title').text_content()
    assert page.locator('[data-m111-recover]').is_visible()
    assert page.locator('[data-m111-continue]').is_visible()
    assert not errors,errors
    page.close();browser.close()

rust=(root/'src-tauri/src/lib.rs').read_text('utf8')
for required in ['DB_SCHEMA_VERSION','schema_migrations','desktop_startup_health','desktop_support_info','desktop_export_diagnostics','desktop_open_data_folder','desktop_log_error','session.lock']:
    assert required in rust,required
assert 'texto de capítulos' not in rust.lower() or 'no incluye el texto de capítulos' in rust.lower()
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text('utf8'))
assert conf['identifier']=='com.margen.escritorio' and conf['version']=='1.12.1'
assert 'margen-111.js' in (root/'herramientas_frontend.py').read_text('utf8')
print('PASS 1.11: versión/datos, copias, diagnóstico, migración formal y cierre inesperado')

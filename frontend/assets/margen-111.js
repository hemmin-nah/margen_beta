'use strict';
/* MARGEN Desktop 1.11.0 — preparación para distribución.
 * Información de versión/datos, salud de instalación, recuperación tras cierre
 * inesperado, diagnóstico local y registro de errores sin contenido de los libros.
 */
const m111Invoke=window.__TAURI__?.core?.invoke;
let m111Health=null,m111Support=null,m111HealthShown=false;
function m111T(es,en){try{return m145Prefs().language==='en'?en:es}catch(_){return es}}
function m111Bytes(n){n=Number(n||0);if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(1)} MB`}
function m111Date(epoch){if(!epoch)return m111T('Todavía no hay autocopias','No automatic backups yet');const d=new Date(Number(epoch)*1000);return Number.isNaN(d.getTime())?String(epoch):d.toLocaleString(m145Prefs?.().language==='en'?'en-GB':'es-ES')}
function m111Close(){document.querySelector('.m111-backdrop')?.remove()}
function m111Base(title,subtitle=''){
  m111Close();
  const overlay=document.createElement('div');overlay.className='m111-backdrop';
  overlay.innerHTML=`<section class="m111-card" role="dialog" aria-modal="true" aria-labelledby="m111-title"><header class="m111-head"><div><small>MARGEN</small><h2 id="m111-title"></h2><p class="m111-subtitle"></p></div><button type="button" class="iconbtn m111-close" aria-label="${m111T('Cerrar','Close')}">${ic('close')}</button></header><div class="m111-body"></div></section>`;
  overlay.querySelector('#m111-title').textContent=title;overlay.querySelector('.m111-subtitle').textContent=subtitle;
  overlay.querySelector('.m111-close').onclick=m111Close;overlay.onpointerdown=e=>{if(e.target===overlay)m111Close()};
  document.body.append(overlay);return overlay;
}
async function m111OpenDataFolder(){try{await m111Invoke?.('desktop_open_data_folder')}catch(error){console.error(error);m172Notice(m111T('No se pudo abrir la carpeta de datos.','Could not open the data folder.'))}}
async function m111ExportDiagnostics(){
  try{const path=await m111Invoke?.('desktop_export_diagnostics');if(path)m172Notice(m111T('Informe de diagnóstico guardado en:\n','Diagnostic report saved to:\n')+path)}
  catch(error){console.error(error);m172Notice(m111T('No se pudo crear el informe de diagnóstico.','Could not create the diagnostic report.'))}
}
async function m111OpenAbout(){
  const overlay=m111Base(m111T('Acerca de MARGEN','About MARGEN'),m111T('Información de la aplicación, tus datos y soporte local.','Application, data and local support information.'));
  const body=overlay.querySelector('.m111-body');
  body.innerHTML=`<div class="m111-loading">${m111T('Comprobando instalación…','Checking installation…')}</div>`;
  try{
    const info=await m111Invoke?.('desktop_support_info');m111Support=info;
    body.innerHTML=`
      <div class="m111-summary"><div><span>${m111T('Versión instalada','Installed version')}</span><strong data-m111-version></strong></div><div><span>${m111T('Esquema de datos','Data schema')}</span><strong data-m111-schema></strong></div><div><span>${m111T('Base de datos','Database')}</span><strong data-m111-dbsize></strong></div></div>
      <section class="m111-section"><h3>${m111T('Tus datos','Your data')}</h3><p>${m111T('Los libros se guardan fuera de la carpeta de instalación para que una actualización no tenga que sustituir tu biblioteca.','Books are stored outside the installation folder, so an update does not need to replace your library.')}</p><div class="m111-path" data-m111-path></div><button type="button" class="btn" data-m111-open-data>${ic('folder')} ${m111T('Abrir carpeta de datos','Open data folder')}</button></section>
      <section class="m111-section"><h3>${m111T('Copias automáticas','Automatic backups')}</h3><p><strong data-m111-backups></strong><br><span data-m111-latest></span></p></section>
      <section class="m111-section"><h3>${m111T('Diagnóstico','Diagnostics')}</h3><p>${m111T('Puedes crear un TXT con versión, estado de SQLite, recursos y errores recientes. No incluye capítulos, fichas, notas ni imágenes.','You can create a TXT with the app version, SQLite status, resources and recent errors. It does not include chapters, sheets, notes or images.')}</p><button type="button" class="btn" data-m111-diagnostics>${ic('file')} ${m111T('Crear informe de diagnóstico','Create diagnostic report')}</button></section>
      <details class="m111-legal"><summary>${m111T('Licencias y recursos de terceros','Third-party licenses and resources')}</summary><pre data-m111-legal></pre></details>`;
    body.querySelector('[data-m111-version]').textContent=info?.appVersion||'1.11.0';
    body.querySelector('[data-m111-schema]').textContent=String(info?.dbSchema??'—');
    body.querySelector('[data-m111-dbsize]').textContent=m111Bytes(info?.databaseSize);
    body.querySelector('[data-m111-path]').textContent=info?.dataDirectory||'—';
    body.querySelector('[data-m111-backups]').textContent=`${Number(info?.backupCount||0)} ${m111T('copias conservadas','backups kept')}`;
    body.querySelector('[data-m111-latest]').textContent=m111T('Última: ','Latest: ')+m111Date(info?.latestBackup);
    body.querySelector('[data-m111-legal]').textContent=info?.legalText||m111T('No se pudo leer la información legal incluida.','The bundled legal information could not be read.');
    body.querySelector('[data-m111-open-data]').onclick=()=>void m111OpenDataFolder();
    body.querySelector('[data-m111-diagnostics]').onclick=()=>void m111ExportDiagnostics();
  }catch(error){console.error('MARGEN support info:',error);body.innerHTML=`<div class="m111-problem"><strong>${m111T('No se pudo leer la información de soporte.','Support information could not be read.')}</strong><p>${String(error)}</p></div><div class="m111-actions"><button class="btn primary" data-m111-done>${m111T('Cerrar','Close')}</button></div>`;body.querySelector('[data-m111-done]').onclick=m111Close;}
}
function m111ProblemList(items){const ul=document.createElement('ul');ul.className='m111-issues';for(const item of items||[]){const li=document.createElement('li');li.textContent=item;ul.append(li)}return ul}
function m111UnexpectedDialog(health){
  const overlay=m111Base(m111T('La sesión anterior no se cerró con normalidad','The previous session did not close normally'),m111T('MARGEN ha comprobado el almacenamiento antes de continuar.','MARGEN checked local storage before continuing.'));
  const body=overlay.querySelector('.m111-body');
  body.innerHTML=`<div class="m111-status good">${ic('check')}<div><strong>${m111T('Tu biblioteca principal está accesible','Your main library is accessible')}</strong><p>${m111T('Puedes seguir trabajando con el guardado actual. Si algo no te cuadra, también puedes recuperar la versión anterior.','You can keep working with the current save. If something looks wrong, you can also recover the previous version.')}</p></div></div><div class="m111-crash-extra"></div><div class="m111-actions"><button type="button" class="btn" data-m111-diagnostic>${m111T('Diagnóstico','Diagnostics')}</button><button type="button" class="btn" data-m111-recover>${m111T('Recuperar guardado anterior','Recover previous save')}</button><button type="button" class="btn primary" data-m111-continue>${m111T('Seguir con el actual','Keep current save')}</button></div>`;
  const extra=(health?.issues||[]).filter(x=>!String(x).toLowerCase().includes('sesión anterior'));
  if(extra.length){const wrap=body.querySelector('.m111-crash-extra');wrap.innerHTML=`<p><strong>${m111T('Además se han detectado estas incidencias:','These additional issues were detected:')}</strong></p>`;wrap.append(m111ProblemList(extra));}
  const recover=body.querySelector('[data-m111-recover]');recover.hidden=!health?.recoveryAvailable;recover.onclick=()=>{m111Close();void m15RecoverPrior?.()};
  body.querySelector('[data-m111-diagnostic]').onclick=()=>void m111ExportDiagnostics();body.querySelector('[data-m111-continue]').onclick=m111Close;
}
function m111IntegrityDialog(health){
  const overlay=m111Base(m111T('MARGEN ha detectado una incidencia','MARGEN detected an issue'),m111T('La escritura sigue disponible, pero conviene revisar la instalación.','Writing remains available, but the installation should be checked.'));
  const body=overlay.querySelector('.m111-body');body.innerHTML=`<div class="m111-problem"><strong>${m111T('Comprobación de inicio','Startup check')}</strong></div><div class="m111-issue-slot"></div><p>${m111T('El informe de diagnóstico no contiene el texto de tus libros.','The diagnostic report does not contain your book text.')}</p><div class="m111-actions"><button class="btn" data-m111-diagnostic>${m111T('Crear diagnóstico','Create diagnostics')}</button><button class="btn primary" data-m111-continue>${m111T('Continuar','Continue')}</button></div>`;body.querySelector('.m111-issue-slot').append(m111ProblemList(health?.issues));body.querySelector('[data-m111-diagnostic]').onclick=()=>void m111ExportDiagnostics();body.querySelector('[data-m111-continue]').onclick=m111Close;
}
async function m111CheckHealth(){
  if(!m111Invoke||m111HealthShown)return;
  try{const health=await m111Invoke('desktop_startup_health');m111Health=health;m111HealthShown=true;if(health?.previousUnclean)m111UnexpectedDialog(health);else if(health?.ok===false)m111IntegrityDialog(health)}catch(error){console.error('MARGEN health:',error)}
}
function m111Log(kind,error){
  if(!m111Invoke)return;let message='';try{message=`${kind}: ${error?.message||error||'unknown'}`;if(error?.filename)message+=` @ ${error.filename}:${error.lineno||''}`;if(error?.stack)message+=` | ${String(error.stack).slice(0,700)}`;}catch(_){message=kind}
  void m111Invoke('desktop_log_error',{message:String(message).slice(0,1800)}).catch(()=>{});
}
window.addEventListener('error',event=>m111Log('window.error',event.error||event.message));
window.addEventListener('unhandledrejection',event=>m111Log('unhandledrejection',event.reason));

// «Acerca de» siempre accesible desde la cabecera y desde Preferencias.
const m111PreviousRender=render;
render=function(){
  m111PreviousRender();
  const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.11.0 · Desktop';
  const header=document.querySelector('.header-right');if(header&&!header.querySelector('.m111-about-btn')){
    const button=document.createElement('button');button.type='button';button.className='iconbtn m111-about-btn';button.title=m111T('Acerca de MARGEN','About MARGEN');button.setAttribute('aria-label',button.title);button.innerHTML=ic('help');button.onclick=()=>void m111OpenAbout();header.append(button);
  }
};
const m111PreviousConfigMarkup=m145ConfigMarkup;
m145ConfigMarkup=function(p,welcome){
  let html=m111PreviousConfigMarkup(p,welcome);if(welcome)return html;
  const support=`<div class="m111-settings-support"><div><strong>${m111T('Datos y soporte','Data and support')}</strong><small>${m111T('Comprueba la versión, las copias y crea diagnósticos sin incluir tus manuscritos.','Check version and backups, and create diagnostics without including your manuscripts.')}</small></div><button type="button" class="btn" data-m111-about>${m111T('Acerca de MARGEN','About MARGEN')}</button></div>`;
  return html.replace('<div class="m145-actions">',support+'<div class="m145-actions">');
};
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-m111-about]');if(button){event.preventDefault();document.querySelector('.m145-config-backdrop')?.remove();void m111OpenAbout();}});
const m111PreviousStart=start;
start=async function(){await m111PreviousStart();setTimeout(()=>void m111CheckHealth(),80)};

'use strict';
/* MARGEN 1.12.3 · Beta final
 * - Papelera de libros nativa (restaurar / eliminar definitivamente).
 * - Ubicación configurable de la biblioteca con migración verificada por Rust.
 * - La barra del editor y el workflow de build no se modifican.
 */
const m123fInvoke=window.__TAURI__?.core?.invoke;
const m123fT=(es,en)=>m145Prefs?.().language==='en'?en:es;

async function m123fReloadWorkspace(){
  const next=await readDb();
  if(!next)return false;
  state=next;ensureSelections();dirty=false;
  try{m191ProjectRevision?.clear?.();m110Loads?.clear?.();m110CoverLoads?.clear?.()}catch(_e){}
  render();return true;
}

function m123fDeletedDate(raw){
  const n=Number(raw);if(!Number.isFinite(n))return raw||'';
  try{return new Date(n*1000).toLocaleString(m145Prefs?.().language==='en'?'en':'es')}catch{return raw||''}
}
function m123fCloseModal(){document.querySelector('.m123f-backdrop')?.remove()}

async function m123fOpenBookTrash(){
  if(!m123fInvoke)return;
  let rows=[];try{rows=await m123fInvoke('desktop_list_book_trash')}catch(error){console.error(error);m172Notice(m123fT('No se pudo abrir la papelera de libros.','Could not open the book trash.'));return}
  m123fCloseModal();
  const overlay=document.createElement('div');overlay.className='m123f-backdrop';
  const cards=rows.map(row=>{
    const s=row.summary||{},words=Number(s?._margenSummary?.words||0);
    return `<article class="m123f-trash-card"><div><strong>${esc(s.name||m123fT('Libro sin título','Untitled book'))}</strong><small>${m123fT('Eliminado','Deleted')}: ${esc(m123fDeletedDate(row.deletedAt))}${words?` · ${words.toLocaleString()} ${m123fT('palabras','words')}`:''}</small></div><div class="m123f-trash-actions"><button type="button" class="btn" data-m123f-restore="${esc(row.bookId)}">${ic('back')} ${m123fT('Restaurar','Restore')}</button><button type="button" class="btn ghost" data-m123f-purge="${esc(row.bookId)}">${ic('trash')} ${m123fT('Eliminar definitivamente','Delete permanently')}</button></div></article>`;
  }).join('');
  overlay.innerHTML=`<section class="m123f-modal" role="dialog" aria-modal="true"><header><div><span class="eyebrow">${m123fT('BIBLIOTECA','LIBRARY')}</span><h2>${m123fT('Papelera de libros','Book trash')}</h2></div><button type="button" class="iconbtn" data-m123f-close title="${m123fT('Cerrar','Close')}">${ic('close')}</button></header><p>${m123fT('Los libros permanecen aquí hasta que decidas eliminarlos definitivamente. Restaurar conserva el contenido y devuelve el libro a la biblioteca.','Books stay here until you delete them permanently. Restore keeps the content and returns the book to your library.')}</p><div class="m123f-trash-list">${cards||`<div class="empty-state"><h2>${m123fT('La papelera está vacía','Trash is empty')}</h2><p>${m123fT('Los libros que apartes aparecerán aquí.','Books you remove will appear here.')}</p></div>`}</div><footer>${rows.length?`<button type="button" class="btn danger" data-m123f-empty>${m123fT('Vaciar papelera','Empty trash')}</button>`:''}<button type="button" class="btn" data-m123f-close>${m123fT('Cerrar','Close')}</button></footer></section>`;
  document.body.append(overlay);overlay.onpointerdown=e=>{if(e.target===overlay)m123fCloseModal()};
  overlay.querySelectorAll('[data-m123f-close]').forEach(b=>b.onclick=m123fCloseModal);
  overlay.querySelectorAll('[data-m123f-restore]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;try{await m123fInvoke('desktop_restore_book',{bookId:b.dataset.m123fRestore});m123fCloseModal();await m123fReloadWorkspace();showToast(m123fT('Libro restaurado','Book restored'))}catch(error){console.error(error);b.disabled=false;m172Notice(m123fT('No se pudo restaurar el libro: ','Could not restore the book: ')+error)}
  });
  overlay.querySelectorAll('[data-m123f-purge]').forEach(b=>b.onclick=async()=>{
    if(!await m172Confirm(m123fT('¿Eliminar este libro definitivamente? Esta acción ya no se puede deshacer.','Delete this book permanently? This cannot be undone.')))return;
    b.disabled=true;try{await m123fInvoke('desktop_delete_trashed_book',{bookId:b.dataset.m123fPurge});await m123fOpenBookTrash()}catch(error){console.error(error);b.disabled=false;m172Notice(m123fT('No se pudo eliminar definitivamente.','Could not delete permanently.'))}
  });
  overlay.querySelector('[data-m123f-empty]')?.addEventListener('click',async()=>{
    if(!await m172Confirm(m123fT('¿Vaciar toda la papelera de libros? Esta acción no se puede deshacer.','Empty the entire book trash? This cannot be undone.')))return;
    try{await m123fInvoke('desktop_empty_book_trash');await m123fOpenBookTrash()}catch(error){console.error(error);m172Notice(m123fT('No se pudo vaciar la papelera.','Could not empty the trash.'))}
  });
}

async function m123fTrashActiveBook(){
  const p=activeProject?.();if(!p||!m123fInvoke)return;
  if(!await m172Confirm(m123fT(`¿Mover «${p.name}» a la papelera de libros? Podrás restaurarlo después.`,`Move “${p.name}” to book trash? You can restore it later.`)))return;
  if(dirty&&!await save()){m172Notice(m123fT('No se pudo guardar el libro antes de moverlo a la papelera.','The book could not be saved before moving it to trash.'));return}
  try{await m123fInvoke('desktop_trash_book',{bookId:p.id});state.view='library';await m123fReloadWorkspace();showToast(m123fT('Libro movido a la papelera','Book moved to trash'))}
  catch(error){console.error(error);m172Notice(m123fT('No se pudo mover el libro a la papelera: ','Could not move the book to trash: ')+error)}
}

const m123fPrevOnAction=onAction;
onAction=async function(event){
  const action=event?.currentTarget?.dataset?.action;
  if(action==='delete-project'){await m123fTrashActiveBook();return}
  return m123fPrevOnAction.call(this,event);
};

function m123fDecorateLibrary(){
  if(state.view!=='library')return;
  const head=document.querySelector('.workspace-head');if(!head)return;
  let actions=head.querySelector('.head-actions');if(!actions){actions=document.createElement('div');actions.className='head-actions';head.append(actions)}
  if(!actions.querySelector('[data-m123f-trash-open]')){
    const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.m123fTrashOpen='';b.innerHTML=`${ic('trash')} ${m123fT('Papelera de libros','Book trash')}`;b.onclick=m123fOpenBookTrash;actions.prepend(b);
  }
}
function m123fDecorateDeleteLabels(){
  document.querySelectorAll('[data-action="delete-project"]').forEach(b=>{b.innerHTML=`${ic('trash')} ${m123fT('Mover libro a papelera','Move book to trash')}`;b.title=m123fT('Mover este libro a la papelera recuperable','Move this book to recoverable trash')});
}

const m123fPrevConfigMarkup=m145ConfigMarkup;
m145ConfigMarkup=function(p,welcome){
  const html=m123fPrevConfigMarkup(p,welcome);if(welcome)return html;
  const section=`<section class="m123f-library-settings"><div><strong>${m123fT('Ubicación de la biblioteca','Library location')}</strong><small>${m123fT('Tus libros, imágenes y autocopias pueden vivir en una carpeta distinta de los datos técnicos de MARGEN.','Your books, images and automatic backups can live in a folder separate from MARGEN technical data.')}</small><code data-m123f-library-path>${m123fT('Consultando ubicación…','Reading location…')}</code><p data-m123f-previous hidden></p></div><div class="m123f-library-buttons"><button type="button" class="btn" data-m123f-library-change>${ic('folder')} ${m123fT('Cambiar carpeta…','Change folder…')}</button><button type="button" class="btn ghost" data-m123f-library-default>${m123fT('Usar predeterminada','Use default')}</button><button type="button" class="btn ghost" data-m123f-library-clean hidden>${m123fT('Eliminar copia anterior','Delete previous copy')}</button></div></section>`;
  return html.replace('<div class="m145-actions">',section+'<div class="m145-actions">');
};

async function m123fRefreshLibrarySettings(){
  const box=document.querySelector('.m123f-library-settings');if(!box||!m123fInvoke)return;
  try{
    const info=await m123fInvoke('desktop_library_info');
    const path=box.querySelector('[data-m123f-library-path]');if(path)path.textContent=info.currentPath||'';
    const previous=box.querySelector('[data-m123f-previous]'),clean=box.querySelector('[data-m123f-library-clean]');
    if(previous){previous.hidden=!info.previousCopyAvailable;previous.textContent=info.previousCopyAvailable?m123fT(`Copia anterior conservada en: ${info.previousPath}`,`Previous copy kept at: ${info.previousPath}`):''}
    if(clean)clean.hidden=!info.previousCopyAvailable;
    const reset=box.querySelector('[data-m123f-library-default]');if(reset)reset.disabled=!info.custom;
  }catch(error){console.error(error);const path=box.querySelector('[data-m123f-library-path]');if(path)path.textContent=m123fT('No se pudo consultar la ubicación.','Could not read location.')}
}
const m123fPrevOpenSettings=m145OpenSettings;
m145OpenSettings=function(welcome=false){m123fPrevOpenSettings(welcome);if(!welcome)requestAnimationFrame(m123fRefreshLibrarySettings)};

document.addEventListener('click',async event=>{
  if(event.target.closest?.('[data-m145-field]'))setTimeout(m123fRefreshLibrarySettings,0);
  const change=event.target.closest?.('[data-m123f-library-change]');
  if(change){event.preventDefault();event.stopPropagation();if(dirty&&!await save())return;change.disabled=true;try{const info=await m123fInvoke('desktop_choose_library_location');if(info){await m123fReloadWorkspace();m172Notice(m123fT(`Biblioteca movida a:\n${info.currentPath}\n\nLa copia anterior se conserva hasta que elijas eliminarla.`,`Library moved to:\n${info.currentPath}\n\nThe previous copy is kept until you choose to delete it.`));m145OpenSettings(false)}}catch(error){console.error(error);m172Notice(m123fT('No se pudo cambiar la carpeta de biblioteca: ','Could not change library folder: ')+error)}finally{change.disabled=false}return}
  const reset=event.target.closest?.('[data-m123f-library-default]');
  if(reset){event.preventDefault();event.stopPropagation();if(dirty&&!await save())return;if(!await m172Confirm(m123fT('¿Mover la biblioteca de nuevo a la ubicación predeterminada de MARGEN?','Move the library back to MARGEN’s default location?')))return;reset.disabled=true;try{const info=await m123fInvoke('desktop_reset_library_location');await m123fReloadWorkspace();m172Notice(m123fT(`Biblioteca movida a:\n${info.currentPath}`,`Library moved to:\n${info.currentPath}`));m145OpenSettings(false)}catch(error){console.error(error);m172Notice(m123fT('No se pudo volver a la ubicación predeterminada: ','Could not return to the default location: ')+error)}finally{reset.disabled=false}return}
  const clean=event.target.closest?.('[data-m123f-library-clean]');
  if(clean){event.preventDefault();event.stopPropagation();if(!await m172Confirm(m123fT('¿Eliminar la copia anterior de la biblioteca? La biblioteca actual no se tocará.','Delete the previous library copy? The current library will not be changed.')))return;clean.disabled=true;try{await m123fInvoke('desktop_cleanup_previous_library');await m123fRefreshLibrarySettings();showToast(m123fT('Copia anterior eliminada','Previous copy deleted'))}catch(error){console.error(error);m172Notice(m123fT('No se pudo eliminar la copia anterior.','Could not delete the previous copy.'))}finally{clean.disabled=false}}
},true);

const m123fPrevRender=render;
render=function(){
  const result=m123fPrevRender();
  const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.12.3 · Beta final';
  m123fDecorateLibrary();m123fDecorateDeleteLabels();
  return result;
};

'use strict';
/* MARGEN 1.13.1 — exportación JSON de un solo libro.
 * La copia completa de biblioteca conserva exactamente el formato JSON v1 existente.
 * Los libros individuales usan un contenedor MARGEN_BOOK preparado para futura importación aditiva.
 */
const m1131Invoke=window.__TAURI__?.core?.invoke;
function m1131T(es,en){return m145Prefs?.().language==='en'?en:es}
function m1131Clone(value){return JSON.parse(JSON.stringify(value))}
async function m1131BookForExport(id){
  let book=(state?.projects||[]).find(x=>x.id===id);
  if(!book)throw new Error(m1131T('No se encuentra ese libro.','That book could not be found.'));
  if(book?._margenLazy&&typeof m110LoadBook==='function')book=await m110LoadBook(id);
  if(!book||book?._margenLazy)throw new Error(m1131T('No se pudo cargar el libro completo.','The complete book could not be loaded.'));
  const clean=m1131Clone(book);delete clean._margenLazy;delete clean._margenSummary;return clean;
}
async function m1131ExportBook(id){
  if(!m1131Invoke)throw new Error(m1131T('La exportación individual requiere MARGEN Desktop.','Single-book export requires MARGEN Desktop.'));
  if(dirty&&!m151Conflict){const ok=await save();if(!ok)throw new Error(m1131T('No se pudo guardar antes de exportar.','Could not save before exporting.'))}
  const book=await m1131BookForExport(id);
  const path=await m1131Invoke('desktop_export_book',{book});
  if(path)m172Notice(m1131T('Libro JSON guardado en:\n','Book JSON saved to:\n')+path);
  return path;
}
function m1131CloseExport(){document.querySelector('[data-m1131-export]')?.remove()}
function m1131ExportDialog(){
  m1131CloseExport();
  const books=state?.projects||[];
  const selected=books.some(x=>x.id===state.activeProjectId)?state.activeProjectId:(books[0]?.id||'');
  const shell=document.createElement('div');shell.className='modal-backdrop m1131-export-backdrop';shell.dataset.m1131Export='';
  shell.innerHTML=`<div class="modal m1131-export-modal" role="dialog" aria-modal="true" aria-labelledby="m1131-export-title">
    <div class="m1131-export-head"><div><span class="eyebrow">JSON</span><h2 id="m1131-export-title">${m1131T('Exportar copia','Export backup')}</h2></div><button type="button" class="iconbtn" data-m1131-close title="${m1131T('Cerrar','Close')}">${ic('close')}</button></div>
    <p class="m1131-export-intro">${m1131T('Elige si quieres guardar toda tu biblioteca o únicamente un libro.','Choose whether to save your whole library or just one book.')}</p>
    <div class="m1131-export-options">
      <section class="m1131-export-card"><div><strong>${m1131T('Biblioteca completa','Complete library')}</strong><small>${m1131T('Todos los libros en una copia de seguridad restaurable.','All books in one restorable backup.')}</small></div><button type="button" class="btn primary" data-m1131-all>${ic('download')} ${m1131T('Exportar biblioteca','Export library')}</button></section>
      <section class="m1131-export-card"><div><strong>${m1131T('Un solo libro','One book')}</strong><small>${m1131T('Guarda ese libro por separado sin incluir los demás.','Save that book separately without the others.')}</small></div>${books.length?`<label class="m1131-book-select"><span>${m1131T('Libro','Book')}</span><select data-m1131-book>${books.map(b=>`<option value="${esc(b.id)}" ${b.id===selected?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label><button type="button" class="btn" data-m1131-one>${ic('book')} ${m1131T('Exportar este libro','Export this book')}</button>`:`<p class="subtle">${m1131T('Todavía no hay libros que exportar.','There are no books to export yet.')}</p>`}</section>
    </div>
    <p class="m1131-export-note">${m1131T('El JSON individual queda identificado como MARGEN_BOOK para poder añadir más adelante la importación de un libro sin sustituir la biblioteca.','The individual JSON is identified as MARGEN_BOOK so a future single-book import can add it without replacing the library.')}</p>
  </div>`;
  document.body.appendChild(shell);
  const close=()=>m1131CloseExport();
  shell.addEventListener('mousedown',e=>{if(e.target===shell)close()});
  shell.querySelector('[data-m1131-close]')?.addEventListener('click',close);
  shell.querySelector('[data-m1131-all]')?.addEventListener('click',async e=>{const btn=e.currentTarget;btn.disabled=true;try{close();await backup()}catch(error){console.error(error);m172Notice(m1131T('No se pudo exportar la biblioteca: ','Could not export the library: ')+error)}});
  shell.querySelector('[data-m1131-one]')?.addEventListener('click',async e=>{const btn=e.currentTarget,id=shell.querySelector('[data-m1131-book]')?.value;if(!id)return;btn.disabled=true;try{await m1131ExportBook(id);close()}catch(error){console.error(error);m172Notice(m1131T('No se pudo exportar el libro: ','Could not export the book: ')+error);btn.disabled=false}});
}
const m1131PrevAction=onAction;
onAction=async function(event){
  const target=event?.currentTarget?.dataset?.action?event.currentTarget:event?.target?.closest?.('[data-action]');
  if(target?.dataset?.action==='backup'){event?.preventDefault?.();event?.stopPropagation?.();m1131ExportDialog();return}
  return m1131PrevAction.call(this,event);
};
const m1131PrevRender=render;
render=function(){const result=m1131PrevRender();const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.13.1 · Beta';const backupBtn=document.querySelector('[data-action="backup"]');if(backupBtn)backupBtn.title=m1131T('Exportar JSON','Export JSON');return result};

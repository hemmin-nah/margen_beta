'use strict';
/* MARGEN Desktop 1.10.1 — carga de biblioteca bajo demanda (sin cambios funcionales respecto a 1.10.0).
 * La biblioteca arranca con un índice ligero y materializa un libro completo
 * únicamente al abrirlo. Las copias JSON siguen siendo siempre completas.
 */
const m110Invoke=window.__TAURI__?.core?.invoke;
const m110Loads=new Map();
const m110CoverLoads=new Map();

function m110NeedsBook(view){return ['book','manuscript','boards','notes','characters','settings','outlines','chronologies'].includes(view)}
function m110Lazy(book){return !!book?._margenLazy}
function m110Find(id){return (state?.projects||[]).find(p=>p.id===id)}
function m110Replace(id,full){
  const index=(state?.projects||[]).findIndex(p=>p.id===id);
  if(index<0)return full;
  // lastOpened puede haberse actualizado al pulsar una tarjeta; no pisarlo por una lectura anterior.
  const old=state.projects[index];
  if(old?.lastOpened&&(!full.lastOpened||old.lastOpened>full.lastOpened))full.lastOpened=old.lastOpened;
  state.projects[index]=full;
  ensureSelections();
  return full;
}
async function m110LoadBook(id){
  const current=m110Find(id);if(!current||!m110Lazy(current))return current;
  if(m110Loads.has(id))return m110Loads.get(id);
  const task=(async()=>{
    const full=await m110Invoke('desktop_load_book',{bookId:id});
    if(!full||full.id!==id)throw new Error('MARGEN 1.10: respuesta de libro inválida');
    delete full._margenLazy;delete full._margenSummary;
    return m110Replace(id,full);
  })().finally(()=>m110Loads.delete(id));
  m110Loads.set(id,task);return task;
}
async function m110LoadCover(id){
  const book=m110Find(id);if(!book||!m110Lazy(book)||book.coverData||!book._margenSummary?.hasCover)return null;
  if(m110CoverLoads.has(id))return m110CoverLoads.get(id);
  const task=m110Invoke('desktop_load_cover',{bookId:id}).then(data=>{
    const target=m110Find(id);if(target&&m110Lazy(target)&&data)target.coverData=data;
    return data;
  }).catch(error=>{console.warn('MARGEN cover lazy load:',error);return null}).finally(()=>m110CoverLoads.delete(id));
  m110CoverLoads.set(id,task);return task;
}
async function m110Materialize(candidate=state){
  const full=m191Clone(candidate);
  const projects=await Promise.all((candidate?.projects||[]).map(async book=>{
    if(!m110Lazy(book))return m191Clone(book);
    const loaded=await m110Invoke('desktop_load_book',{bookId:book.id});
    return m191Clone(loaded);
  }));
  full.projects=projects;return full;
}

window.m110Materialize=m110Materialize;

if(m110Invoke){
  // Un índice ligero nunca puede guardarse como si fuera el libro completo.
  const m110OldMark=m191MarkProject;
  m191MarkProject=function(id,revision=m15Revision+1){
    const book=m110Find(id);if(book&&m110Lazy(book))return;
    return m110OldMark(id,revision);
  };
  m191ProjectsForRevision=function(revision,forceAll=false){
    const ids=new Set(m191CurrentIds());
    return (state?.projects||[]).filter(p=>!m110Lazy(p)&&ids.has(p.id)&&(forceAll||(m191ProjectRevision.has(p.id)&&(m191ProjectRevision.get(p.id)||0)<=revision))).map(m191Clone);
  };

  // El contador del Escritorio/Biblioteca usa el total precalculado sin recorrer manuscritos.
  const m110FullProjectWords=projectWords;
  projectWords=function(book){return m110Lazy(book)?Number(book?._margenSummary?.words||0):m110FullProjectWords(book)};

  // Arranque: sólo cabecera + índices. Si MARGEN se cerró dentro de un libro, se abre sólo ese.
  readDb=async function(){
    let data;
    try{data=await m110Invoke('desktop_load_index')}catch(error){console.error('MARGEN index load:',error);data=await m15RecordSet()}
    m151DiskToken=m151TokenOf(data?.['workspace-meta']);
    let main=data?.workspace,rec=data?.recovery;
    let mainOk=m15Good(main,data?.['workspace-meta']);
    let recoveryPayloadOk=m15Good(rec,data?.['recovery-meta']);
    const recoveryKnown=recoveryPayloadOk||data?.recoveryAvailable===true;m15RecoveryAvailable=recoveryKnown;
    if(mainOk){
      const id=main.activeProjectId,book=(main.projects||[]).find(p=>p.id===id);
      if(id&&m110NeedsBook(main.view)&&m110Lazy(book)){
        try{const full=await m110Invoke('desktop_load_book',{bookId:id});main.projects[main.projects.findIndex(p=>p.id===id)]=full}
        catch(error){console.error('MARGEN resume lazy book:',error);main.view='library'}
      }
      return main;
    }
    if(!recoveryPayloadOk&&recoveryKnown){
      try{const extra=await m110Invoke('desktop_load_recovery');rec=extra?.recovery;recoveryPayloadOk=m15Good(rec,extra?.['recovery-meta'])}
      catch(error){console.error('MARGEN recovery load:',error)}
    }
    if(main!==undefined&&recoveryPayloadOk){m15Recovered=true;m15LoadReason='previous';return rec}
    if(main!==undefined){m15Blocked=true;m15LoadReason='corrupt';return null}
    if(recoveryPayloadOk){m15Recovered=true;m15LoadReason='previous';return rec}
    return null;
  };

  // Acciones que van a tocar contenido: materializar ANTES de que las capas anteriores marquen cambios.
  const m110OldOnAction=onAction;
  onAction=async function(event){
    const target=event?.currentTarget?.dataset?.action?event.currentTarget:event?.target?.closest?.('[data-action]');
    const action=target?.dataset?.action;
    const id=action==='open-flagged'?target?.dataset?.project:target?.dataset?.id;
    if(id&&['open-project','choose-cover','open-flagged'].includes(action)&&m110Lazy(m110Find(id))){
      try{await m110LoadBook(id)}catch(error){console.error(error);m172Notice(m15T('No se pudo abrir el libro guardado.','The saved book could not be opened.'));return}
    }
    return m110OldOnAction.call(this,event);
  };

  // Todas las rutas menos Escritorio/Biblioteca/Diccionario requieren libro completo.
  // Esto cubre también accesos directos desde «Por revisar» que no pasan por onAction.
  const m110OldRender=render;
  render=function(){
    const p=activeProject?.();
    if(m110NeedsBook(state?.view)&&p&&m110Lazy(p)){
      if(!m110Loads.has(p.id))void m110LoadBook(p.id).then(()=>render()).catch(error=>{console.error(error);state.view='library';render()});
      return;
    }
    m110OldRender();
    const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.10.1 · Desktop';
    if(['desk','library'].includes(state?.view)){
      const ids=(state.projects||[]).filter(p=>m110Lazy(p)&&p._margenSummary?.hasCover&&!p.coverData).map(p=>p.id);
      if(ids.length)void Promise.all(ids.map(m110LoadCover)).then(values=>{if(values.some(Boolean)&&['desk','library'].includes(state?.view))render()});
    }
  };

  // Una copia JSON jamás contiene stubs. La carga completa sólo ocurre al pedir explícitamente la copia.
  const m110OldDownloadBlob=downloadBlob;
  downloadBlob=async function(body,name,type){
    if(String(type).includes('json')){
      try{
        const parsed=JSON.parse(body);
        if(parsed?.projects?.some?.(m110Lazy))body=JSON.stringify(await m110Materialize(parsed),null,2);
      }catch(error){console.error('MARGEN JSON materialization:',error);throw error}
    }
    return m110OldDownloadBlob(body,name,type);
  };
  backup=async function(){
    try{
      if(dirty&&!m151Conflict&&!await save())throw new Error(m15T('No se pudo guardar antes de crear la copia.','Could not save before creating the backup.'));
      const snapshot=await m110Materialize(state);
      if(!validateBackup(snapshot))throw new Error('Invalid workspace');
      const path=await m110Invoke('desktop_export_backup',{snapshot,kind:'manual'});
      if(path)m172Notice(m15T('Copia JSON guardada en:\n','JSON backup saved to:\n')+path);
    }catch(error){console.error(error);m172Notice(m15T('No se pudo guardar la copia JSON: ','Could not save the JSON backup: ')+error)}
  };
  m151ExportConflict=async function(){
    try{
      const snapshot=await m110Materialize(state);
      const path=await m110Invoke('desktop_export_backup',{snapshot,kind:'conflict'});
      if(path)m172Notice(m15T('Copia de conflicto guardada en:\n','Conflict backup saved to:\n')+path);
    }catch(error){console.error(error);m172Notice(m15T('No se pudo exportar el conflicto: ','Could not export conflict: ')+error)}
  };
}

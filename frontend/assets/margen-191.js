'use strict';
/* MARGEN Desktop 1.9.1 — almacenamiento y rendimiento.
 * - Guardado incremental: sólo viajan a Rust los libros modificados.
 * - La cabecera global se guarda por separado y conserva el orden de la biblioteca.
 * - La recuperación anterior se carga bajo demanda para no duplicar la biblioteca en RAM.
 * No cambia el JSON v1, las herramientas ni la organización visual de MARGEN.
 */
const m191Invoke=window.__TAURI__?.core?.invoke;
const m191ProjectRevision=new Map();
let m191ForceAll=false;

function m191MarkProject(id,revision=m15Revision+1){
  if(!id)return;
  const old=m191ProjectRevision.get(id)||0;
  if(revision>old)m191ProjectRevision.set(id,revision);
}
function m191Clone(value){return JSON.parse(JSON.stringify(value));}
function m191RootSnapshot(){
  const root={};
  for(const [key,value] of Object.entries(state||{}))if(key!=='projects')root[key]=value;
  return m191Clone(root);
}
function m191CurrentIds(){return (state?.projects||[]).map(p=>p.id);}
function m191ProjectsForRevision(revision,forceAll=false){
  const ids=new Set(m191CurrentIds());
  const selected=(state?.projects||[]).filter(p=>forceAll||((m191ProjectRevision.get(p.id)||0)<=revision&&m191ProjectRevision.has(p.id)));
  // Si algo externo marcó dirty sin pasar por changed(), el modo seguro es guardar todos.
  if(!selected.length&&dirty)return (state?.projects||[]).map(m191Clone);
  return selected.filter(p=>ids.has(p.id)).map(m191Clone);
}
function m191ApplySaveReport(result){
  m151DiskToken=result.token;
  m15RecoveryAvailable=!!result.recoveryAvailable;
  if(result.backupWarning&&!window.__margenBackupWarningShown){
    window.__margenBackupWarningShown=true;
    m172Notice(m15T('Los libros se guardaron, pero falló la copia automática: ','Books were saved, but the automatic backup failed: ')+result.backupWarning);
  }
}

if(m191Invoke){
  // Marcar el libro activo sin recorrer ni serializar toda la biblioteca en cada pulsación.
  const m191OldChanged=changed;
  changed=function(){
    const result=m191OldChanged();
    m191MarkProject(state?.activeProjectId,m15Revision);
    return result;
  };

  // Algunas acciones de Biblioteca cambian un libro que todavía no es el activo (portada,
  // apertura/lastOpened, etc.). Si el data-id es un ID de libro, se marca explícitamente.
  const m191OldOnAction=onAction;
  onAction=function(event){
    const target=event?.currentTarget?.dataset?.action?event.currentTarget:event?.target?.closest?.('[data-action]');
    const id=target?.dataset?.id;
    if(id&&state?.projects?.some(p=>p.id===id))m191MarkProject(id);
    return m191OldOnAction.call(this,event);
  };
  const m191OldProcessCover=processCover;
  processCover=async function(file){
    if(coverTargetId)m191MarkProject(coverTargetId);
    return m191OldProcessCover(file);
  };

  // El backend 1.9.1 sólo materializa recovery al arrancar si el principal falla.
  // Así un libro grande no se carga dos veces sólo para mostrar el botón Recuperar.
  readDb=async function(){
    let data=await m15RecordSet();
    m151DiskToken=m151TokenOf(data['workspace-meta']);
    let main=data.workspace,rec=data.recovery;
    let mainOk=m15Good(main,data['workspace-meta']);
    let recoveryPayloadOk=m15Good(rec,data['recovery-meta']);
    const recoveryKnown=recoveryPayloadOk||data.recoveryAvailable===true;
    m15RecoveryAvailable=recoveryKnown;
    if(mainOk)return main;
    if(!recoveryPayloadOk&&recoveryKnown){
      try{
        const extra=await m191Invoke('desktop_load_recovery');
        rec=extra?.recovery;
        recoveryPayloadOk=m15Good(rec,extra?.['recovery-meta']);
      }catch(error){console.error('MARGEN recovery load:',error)}
    }
    if(main!==undefined&&recoveryPayloadOk){m15Recovered=true;m15LoadReason='previous';return rec}
    if(main!==undefined){m15Blocked=true;m15LoadReason='corrupt';return null}
    if(recoveryPayloadOk){m15Recovered=true;m15LoadReason='previous';return rec}
    return null;
  };

  // Guardado normal incremental. Si aparece una inconsistencia de migración, se hace un único
  // reintento completo: prioriza no perder cambios antes que mantener la optimización a toda costa.
  save=async function(){
    clearTimeout(saveTimer);
    if(m15Blocked){m15Status('locked');return false}
    if(m15Saving){await m15Saving;if(!dirty)return true}
    if(!dirty)return true;
    const atRevision=m15Revision;
    const forceAll=m191ForceAll;
    let root,projects,projectIds;
    try{
      root=m191RootSnapshot();
      projectIds=m191CurrentIds();
      projects=m191ProjectsForRevision(atRevision,forceAll);
      const probe={...m191Clone(root),projects:m191Clone(state.projects||[])};
      if(!validateBackup(probe))throw new Error('Invalid workspace structure');
    }catch(error){console.error('MARGEN incremental snapshot:',error);m15Status('error');return false}
    m15Status('saving');
    const task=(async()=>{
      const send=async(list)=>m191Invoke('desktop_save_incremental',{
        root,projects:list,projectIds,expectedToken:m151DiskToken
      });
      try{
        let result;
        try{result=await send(projects)}
        catch(error){
          if(!String(error).includes('MARGEN_INCREMENTAL'))throw error;
          console.warn('MARGEN: reintento completo del guardado incremental',error);
          result=await send((window.m110Materialize? (await window.m110Materialize(state)).projects : (state.projects||[])).map(m191Clone));
        }
        m191ApplySaveReport(result);
        return true;
      }catch(error){
        if(String(error).includes('MARGEN_CONFLICT'))m151MarkConflict();
        console.error('MARGEN save error:',error);return false;
      }
    })();
    m15Saving=task;
    const ok=await task;
    if(m15Saving===task)m15Saving=null;
    m15LastSaveOk=ok;
    if(ok){
      for(const [id,revision] of [...m191ProjectRevision])if(revision<=atRevision)m191ProjectRevision.delete(id);
      if(forceAll)m191ForceAll=false;
      document.querySelectorAll('.m15-recover').forEach(b=>{b.disabled=!m15RecoveryAvailable||m15Blocked;b.style.display=b.disabled?'none':''});
      if(m15Revision===atRevision){dirty=false;m15Status('saved')}
      else{dirty=true;m15Status('pending');clearTimeout(saveTimer);saveTimer=setTimeout(()=>void save(),300)}
    }else{
      dirty=true;m15Status('error');
      showToast(m15T('Error al guardar. Exporta una copia JSON.','Save failed. Export a JSON backup.'));
    }
    return ok;
  };

  // Recuperación bajo demanda: sólo se reconstruye la instantánea anterior cuando se solicita.
  m15RecoverPrior=async function(){
    if(!await m172Confirm(m15T('¿Restaurar el guardado anterior? Sustituirá la versión actual. Exporta primero una copia JSON si quieres conservarla.','Restore the previous save? This replaces the current version. Export a JSON backup first if you wish to keep it.')))return;
    const original=state;
    try{
      const records=await m191Invoke('desktop_load_recovery');
      const previous=records?.recovery;
      if(!m15Good(previous,records?.['recovery-meta']))throw new Error('No verified previous save');
      state=previous;ensureSelections();dirty=true;m15Revision++;m191ForceAll=true;m191ProjectRevision.clear();
      const ok=await save();
      if(!ok)throw new Error('Could not store recovered data');
      render();showToast(m15T('Versión anterior recuperada','Previous save restored'));
    }catch(error){
      state=original;dirty=true;m191ForceAll=true;
      console.error(error);m172Notice(m15T('No se pudo recuperar el guardado anterior.','Could not recover the previous save.'));
    }
  };

  // Una restauración JSON completa usa el camino completo existente; al acabar se limpia el
  // seguimiento incremental para que el siguiente autoguardado parta de la nueva biblioteca.
  const m191OldInstall=m154Install;
  m154Install=async function(candidate){
    const result=await m191OldInstall(candidate);
    m191ProjectRevision.clear();m191ForceAll=false;
    return result;
  };
}

const m191PreviousRender=render;
render=function(){
  m191PreviousRender();
  const version=document.querySelector('.brand .m11-version');
  if(version)version.textContent='1.9.1 · Desktop';
};

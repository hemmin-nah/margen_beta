'use strict';
/* MARGEN 1.12.2 — beta: estabilización de cronología, historial estructural de pizarra,
 * escaleta con deshacer/reordenación robusta y libros fijados en Biblioteca.
 * La barra del editor y el workflow de build quedan deliberadamente intactos.
 */

/* ---------- Cronología: el selector de color debe sobrevivir al cambio de acontecimiento ---------- */
const m122PrevRenderTimeEditor=m131RenderTimeEditor;
m131RenderTimeEditor=function(){
  const result=m122PrevRenderTimeEditor();
  // m131RenderTimeEditor sustituye el HTML del inspector; hay que volver a enlazar
  // el picker de color de 1.12.1 cada vez que se selecciona otro acontecimiento.
  requestAnimationFrame(()=>m1211BindTimeline?.());
  return result;
};

/* ---------- Pizarra: historial único para operaciones estructurales ---------- */
const m122BoardHistory=new Map();
function m122BoardKey(){return `${state.activeProjectId||''}:${state.activeBoardId||''}`}
function m122BoardSnapshot(){
  const b=activeBoard?.();
  if(!b)return null;
  return JSON.stringify({elements:b.elements||[],strokes:b.strokes||[],background:b.background||'dots'});
}
function m122BoardStack(){
  const key=m122BoardKey();
  let h=m122BoardHistory.get(key);
  if(!h){h={undo:[],redo:[]};m122BoardHistory.set(key,h)}
  return h;
}
function m122RestoreBoardSnapshot(raw){
  const b=activeBoard?.();if(!b||!raw)return;
  const saved=JSON.parse(raw);
  b.elements=Array.isArray(saved.elements)?saved.elements:[];
  b.strokes=Array.isArray(saved.strokes)?saved.strokes:[];
  b.background=saved.background||'dots';
  try{boardSelectedIds?.clear?.()}catch(_e){}
  try{selectedElement=null}catch(_e){}
  try{m1211SelectedStamp=null}catch(_e){}
  const picker=el('board-background');if(picker)picker.value=b.background;
  const world=el('board-world');if(world)world.className='board-world bg-'+b.background;
  renderBoardElements();drawStrokes();changed();
}
// Sustituimos el motor antiguo, pero conservamos los nombres globales: todas las
// capas anteriores que ya llaman pushBoardUndo() pasan automáticamente por aquí.
pushBoardUndo=function(){
  const snap=m122BoardSnapshot();if(!snap)return;
  const h=m122BoardStack();
  if(h.undo.at(-1)!==snap)h.undo.push(snap);
  if(h.undo.length>80)h.undo.shift();
  h.redo=[];updateBoardHistoryButtons();
};
boardHistoryMove=function(reverse=false){
  const current=m122BoardSnapshot();if(!current)return;
  const h=m122BoardStack(),source=reverse?h.redo:h.undo,dest=reverse?h.undo:h.redo;
  if(!source.length)return;
  const snap=source.pop();
  if(dest.at(-1)!==current)dest.push(current);
  m122RestoreBoardSnapshot(snap);updateBoardHistoryButtons();
};
updateBoardHistoryButtons=function(){
  const h=m122BoardHistory.get(m122BoardKey());
  document.querySelector('[data-action="board-undo"]')?.toggleAttribute('disabled',!h?.undo.length);
  document.querySelector('[data-action="board-redo"]')?.toggleAttribute('disabled',!h?.redo.length);
};

/* ---------- Escaleta: deshacer y arrastre por puntero ---------- */
const m122OutlineHistory=new Map();
function m122OutlineKey(){return `${state.activeProjectId||''}:${state.activeOutlineId||''}`}
function m122OutlineSnapshot(){
  const o=activeOutline?.();if(!o)return null;
  return JSON.stringify({blocks:o.blocks||[],scenes:o.scenes||[],foldedBlocks:o.foldedBlocks||{},presentation:o.presentation||'list'});
}
function m122OutlinePush(){
  const snap=m122OutlineSnapshot();if(!snap)return;
  const key=m122OutlineKey();let h=m122OutlineHistory.get(key);if(!h){h=[];m122OutlineHistory.set(key,h)}
  if(h.at(-1)!==snap)h.push(snap);if(h.length>60)h.shift();m122OutlineUndoState();
}
function m122OutlineUndo(){
  const o=activeOutline?.(),h=m122OutlineHistory.get(m122OutlineKey());if(!o||!h?.length)return;
  const saved=JSON.parse(h.pop());o.blocks=saved.blocks||[];o.scenes=saved.scenes||[];o.foldedBlocks=saved.foldedBlocks||{};o.presentation=saved.presentation||'list';changed();render();
}
function m122OutlineUndoState(){
  const btn=document.querySelector('[data-m122-outline-undo]');if(btn)btn.disabled=!(m122OutlineHistory.get(m122OutlineKey())?.length);
}
const m122PrevMoveScene=m13MoveScene;
m13MoveScene=function(...args){m122OutlinePush();return m122PrevMoveScene(...args)};
const m122PrevM13Action=m13Action;
m13Action=async function(action,id){
  if(['delete','delete-block','up','down'].includes(action))m122OutlinePush();
  return await m122PrevM13Action(action,id);
};
function m122DecorateOutline(){
  if(state.view!=='outlines')return;
  const controls=document.querySelector('.m13-controls');if(!controls)return;
  if(!controls.querySelector('[data-m122-outline-undo]')){
    const btn=document.createElement('button');btn.type='button';btn.className='btn ghost m122-outline-undo';btn.dataset.m122OutlineUndo='';btn.innerHTML=`↶ ${m145Prefs?.().language==='en'?'Undo':'Deshacer'}`;btn.onclick=()=>m122OutlineUndo();controls.append(btn);
  }
  m122OutlineUndoState();
  // HTML5 drag era inestable con details/tarjetas. El puntero es igual en lista y tablero.
  document.querySelectorAll('[data-m13-drag]').forEach(handle=>{
    handle.draggable=false;if(handle.dataset.m122PointerDrag)return;handle.dataset.m122PointerDrag='1';
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('button,input,textarea,select,[contenteditable="true"]'))return;
      const sceneId=handle.dataset.m13Drag;if(!sceneId)return;
      const card=handle.closest('[data-m13-scene-card]');const startX=event.clientX,startY=event.clientY;let dragging=false,targetBlock='',beforeId=null;
      const move=e=>{
        if(!dragging&&Math.hypot(e.clientX-startX,e.clientY-startY)<5)return;
        if(!dragging){dragging=true;card?.classList.add('is-dragging');document.body.classList.add('m122-outline-dragging')}
        e.preventDefault();const hit=document.elementFromPoint(e.clientX,e.clientY),drop=hit?.closest?.('[data-m13-drop]');if(!drop)return;
        targetBlock=drop.dataset.m13Drop||'';const near=hit.closest?.('[data-m13-scene-card]');beforeId=null;
        document.querySelectorAll('.m13-target-before,.m13-target-after,.m13-drop-on').forEach(n=>n.classList.remove('m13-target-before','m13-target-after','m13-drop-on'));
        drop.closest('.m13-block')?.classList.add('m13-drop-on');
        if(near&&near.dataset.m13SceneCard!==sceneId){const r=near.getBoundingClientRect();if(e.clientY<r.top+r.height/2){beforeId=near.dataset.m13SceneCard;near.classList.add('m13-target-before')}else{near.classList.add('m13-target-after');const siblings=[...drop.querySelectorAll('[data-m13-scene-card]')];const at=siblings.indexOf(near);beforeId=siblings.slice(at+1).find(x=>x.dataset.m13SceneCard!==sceneId)?.dataset.m13SceneCard||null}}
      };
      const done=()=>{
        document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',done,true);document.removeEventListener('pointercancel',done,true);card?.classList.remove('is-dragging');document.body.classList.remove('m122-outline-dragging');document.querySelectorAll('.m13-target-before,.m13-target-after,.m13-drop-on').forEach(n=>n.classList.remove('m13-target-before','m13-target-after','m13-drop-on'));
        if(dragging)m13MoveScene(sceneId,targetBlock,beforeId);
      };
      document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',done,true);document.addEventListener('pointercancel',done,true);
    });
  });
}
if(!window.__m122OutlineUndoKey){window.__m122OutlineUndoKey=true;document.addEventListener('keydown',e=>{
  if(state.view!=='outlines'||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||e.shiftKey)return;
  if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;e.preventDefault();m122OutlineUndo();
},true)}

/* ---------- Biblioteca: fijar libros arriba ---------- */
function m122DecorateLibrary(){
  if(state.view!=='library')return;
  document.querySelectorAll('.projects-grid > .project-card:not(.new)').forEach(card=>{
    const open=card.querySelector('[data-action="open-project"]'),id=open?.dataset.id,p=state.projects?.find(x=>x.id===id);if(!p)return;
    card.style.order=p.pinned?'-10':'0';card.classList.toggle('m122-book-pinned',!!p.pinned);
    if(card.querySelector('[data-m122-pin-book]'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='cover-edit m122-book-pin';btn.dataset.m122PinBook=id;btn.title=p.pinned?'Desfijar libro':'Fijar libro arriba';btn.innerHTML=`${ic('pin')} ${p.pinned?'Fijado':'Fijar'}`;
    btn.onclick=async e=>{e.preventDefault();e.stopPropagation();let book=state.projects.find(x=>x.id===id);try{if(m110Lazy?.(book))book=await m110LoadBook(id)}catch(error){console.error(error);showToast('No se pudo cargar el libro');return}book.pinned=!book.pinned;changed();render()};
    card.append(btn);
  });
  const newCard=document.querySelector('.projects-grid > .project-card.new');if(newCard)newCard.style.order='20';
}

/* ---------- Papelera existente: asegurar que Pizarras/Fichas son recuperables ---------- */
function m122ArchiveRecoveryHint(){
  if(state.view!=='notes')return;
  const root=document.querySelector('.main-scroll');if(!root||root.querySelector('.m122-trash-hint'))return;
  const p=document.createElement('p');p.className='subtle m122-trash-hint';p.textContent='Las fichas, escenarios y pizarras archivadas pueden restaurarse desde Archivo y papelera.';root.prepend(p);
}

/* ---------- Render final 1.12.2 ---------- */
const m122PrevRender=render;
render=function(){
  const result=m122PrevRender();
  const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.12.2 · Beta';
  m122DecorateOutline();m122DecorateLibrary();m122ArchiveRecoveryHint();
  return result;
};

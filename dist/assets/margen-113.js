'use strict';
/* MARGEN 1.13.0 — Pizarra avanzada + atajos.
 * - historial estructural único y prioritario
 * - lienzo virtual amplio con recentrado automático
 * - trazos libres seleccionables y movibles
 * - atajos básicos y panel de consulta en Conoce MARGEN
 * La barra del editor y el workflow de build permanecen intactos.
 */

const M113_WORLD_W=20000, M113_WORLD_H=14000, M113_SHIFT_X=8000, M113_SHIFT_Y=5600;
const m113T=(es,en)=>typeof m146T==='function'?m146T(es,en):es;
let m113SelectedStrokeIds=new Set(),m113SpaceDown=false,m113Pan=null,m113Clipboard=null;
const m113History=new Map();

function m113IsFreeBoard(){return state?.view==='boards'&&activeBoard?.()?.boardType==='free'}
function m113BoardKey(){return `${state?.activeProjectId||''}:${state?.activeBoardId||''}`}
function m113Snapshot(){
 const b=activeBoard?.();if(!b)return null;
 return JSON.stringify({elements:b.elements||[],strokes:b.strokes||[],background:b.background||'dots',panX:b.panX||0,panY:b.panY||0,zoom:b.zoom||1});
}
function m113Stack(){let h=m113History.get(m113BoardKey());if(!h){h={undo:[],redo:[]};m113History.set(m113BoardKey(),h)}return h}
function m113UpdateHistoryButtons(){const h=m113History.get(m113BoardKey());document.querySelector('[data-action="board-undo"]')?.toggleAttribute('disabled',!h?.undo.length);document.querySelector('[data-action="board-redo"]')?.toggleAttribute('disabled',!h?.redo.length)}
function m113PushUndo(){const s=m113Snapshot();if(!s)return;const h=m113Stack();if(h.undo.at(-1)!==s)h.undo.push(s);if(h.undo.length>100)h.undo.shift();h.redo=[];m113UpdateHistoryButtons()}
function m113Restore(raw){
 const b=activeBoard?.();if(!b||!raw)return;const data=JSON.parse(raw);
 b.elements=Array.isArray(data.elements)?data.elements:[];b.strokes=Array.isArray(data.strokes)?data.strokes:[];b.background=data.background||'dots';b.panX=Number(data.panX)||0;b.panY=Number(data.panY)||0;b.zoom=Number(data.zoom)||1;
 selectedElement=null;try{boardSelectedIds?.clear?.()}catch(_e){}m113SelectedStrokeIds.clear();try{m1211SelectedStamp=null}catch(_e){}
 renderBoardElements();applyTransform();m113DrawStrokes();changed();m113UpdateHistoryButtons();
}
function m113HistoryMove(redo=false){const cur=m113Snapshot(),h=m113Stack(),src=redo?h.redo:h.undo,dst=redo?h.undo:h.redo;if(!cur||!src.length)return;const prev=src.pop();if(dst.at(-1)!==cur)dst.push(cur);m113Restore(prev)}

// Todas las capas anteriores que llamen a estos nombres pasan por el historial 1.13.
pushBoardUndo=m113PushUndo;
boardHistoryMove=m113HistoryMove;
updateBoardHistoryButtons=m113UpdateHistoryButtons;

function m113MigrateBoard(b){
 if(!b||b.boardType!=='free'||b.m113Infinite)return;
 const z=Number(b.zoom)||1;
 for(const item of b.elements||[]){item.x=(Number(item.x)||0)+M113_SHIFT_X;item.y=(Number(item.y)||0)+M113_SHIFT_Y}
 for(const stroke of b.strokes||[])for(const p of stroke.points||[]){p.x=(Number(p.x)||0)+M113_SHIFT_X;p.y=(Number(p.y)||0)+M113_SHIFT_Y}
 b.panX=(Number(b.panX)||0)-M113_SHIFT_X*z;b.panY=(Number(b.panY)||0)-M113_SHIFT_Y*z;
 b.m113Infinite=true;
}
const m113PrevEnsure=ensureSelections;
ensureSelections=function(){m113PrevEnsure();let migrated=false;for(const project of state?.projects||[])for(const b of project.boards||[]){const before=!!b.m113Infinite;m113MigrateBoard(b);if(!before&&b.m113Infinite)migrated=true}if(migrated)try{changed()}catch(_e){}};

function m113EnsureWorld(){
 if(!m113IsFreeBoard())return;const world=document.getElementById('board-world'),canvas=document.getElementById('drawing-layer');if(!world)return;
 world.style.width=M113_WORLD_W+'px';world.style.height=M113_WORLD_H+'px';world.style.border='0';world.style.boxShadow='none';
 if(canvas){canvas.width=1;canvas.height=1;canvas.style.width=M113_WORLD_W+'px';canvas.style.height=M113_WORLD_H+'px'}
 let svg=document.getElementById('m162-vector-strokes');if(svg){svg.setAttribute('viewBox',`0 0 ${M113_WORLD_W} ${M113_WORLD_H}`);svg.setAttribute('width',String(M113_WORLD_W));svg.setAttribute('height',String(M113_WORLD_H));svg.style.width=M113_WORLD_W+'px';svg.style.height=M113_WORLD_H+'px'}
 const paper=world.querySelector('.m162-ruled-paper');if(paper){paper.setAttribute('viewBox',`0 0 ${M113_WORLD_W} ${M113_WORLD_H}`);paper.setAttribute('width',String(M113_WORLD_W));paper.setAttribute('height',String(M113_WORLD_H));paper.style.width=M113_WORLD_W+'px';paper.style.height=M113_WORLD_H+'px'}
}
function m113ShiftWorld(dx,dy){
 const b=activeBoard();if(!b||(dx===0&&dy===0))return;
 for(const item of b.elements||[]){item.x+=dx;item.y+=dy}
 for(const stroke of b.strokes||[])for(const p of stroke.points||[]){p.x+=dx;p.y+=dy}
 b.panX-=dx*(b.zoom||1);b.panY-=dy*(b.zoom||1);
}
function m113Recenter(){
 if(!m113IsFreeBoard())return;const b=activeBoard(),vp=document.getElementById('board-viewport');if(!b||!vp)return;
 const cx=(vp.clientWidth/2-b.panX)/(b.zoom||1),cy=(vp.clientHeight/2-b.panY)/(b.zoom||1);let dx=0,dy=0;
 if(cx<2500)dx=5000;else if(cx>M113_WORLD_W-2500)dx=-5000;
 if(cy<2000)dy=4000;else if(cy>M113_WORLD_H-2000)dy=-4000;
 if(dx||dy){m113ShiftWorld(dx,dy);applyTransform();renderBoardElements();m113DrawStrokes();changed()}
}


const m113PrevUpdateCursor=updateBoardCursor;
updateBoardCursor=function(){const r=m113PrevUpdateCursor();document.getElementById('board-viewport')?.classList.toggle('m113-select-mode',boardTool==='select');return r};
// El desplazamiento de notas/imágenes ya no tiene límites perceptibles del lienzo antiguo.
startItemDrag=function(e,item,node,kind){
 if(boardTool!=='select'||item?.locked)return;e.preventDefault();e.stopPropagation();m113BlurBoardEditor();m113PushUndo();setSelected(item.id);
 const b=activeBoard(),zoom=b?.zoom||1,startX=e.clientX,startY=e.clientY,orig={x:item.x,y:item.y,w:item.w,h:item.h};
 const move=evt=>{const dx=(evt.clientX-startX)/zoom,dy=(evt.clientY-startY)/zoom;if(kind==='move'){item.x=Math.max(0,Math.min(M113_WORLD_W-80,orig.x+dx));item.y=Math.max(0,Math.min(M113_WORLD_H-60,orig.y+dy));node.style.left=item.x+'px';node.style.top=item.y+'px'}else{item.w=Math.max(80,Math.min(3200,orig.w+dx));item.h=Math.max(60,Math.min(2600,orig.h+dy));node.style.width=item.w+'px';node.style.height=item.h+'px'}};
 const done=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',done,true);window.removeEventListener('pointercancel',done,true);changed();m113Recenter()};
 window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',done,{once:true,capture:true});window.addEventListener('pointercancel',done,{once:true,capture:true});
};
function m113BlurBoardEditor(){const a=document.activeElement;if(a?.closest?.('#board-items')&&a.matches?.('input,textarea,[contenteditable="true"]'))a.blur()}

function m113StrokeD(stroke){const pts=stroke?.points||[];if(!pts.length)return '';return pts.map((p,i)=>`${i?'L':'M'} ${Number(p.x)||0} ${Number(p.y)||0}`).join(' ')}
function m113DrawStrokes(){
 if(!m113IsFreeBoard())return;const b=activeBoard(),world=document.getElementById('board-world');if(!b||!world)return;
 let svg=document.getElementById('m162-vector-strokes');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='m162-vector-strokes';svg.classList.add('m162-vector-strokes');world.append(svg)}
 svg.setAttribute('viewBox',`0 0 ${M113_WORLD_W} ${M113_WORLD_H}`);svg.setAttribute('width',String(M113_WORLD_W));svg.setAttribute('height',String(M113_WORLD_H));svg.style.width=M113_WORLD_W+'px';svg.style.height=M113_WORLD_H+'px';
 const chunks=[];
 for(const s of b.strokes||[]){if(!s.points?.length)continue;const c=safeColor(s.color,'#6c7769'),w=Math.max(.5,Number(s.width)||4),selected=m113SelectedStrokeIds.has(s.id);if(s.points.length===1){const p=s.points[0];chunks.push(`<circle cx="${p.x}" cy="${p.y}" r="${w/2}" fill="${c}"/>`);chunks.push(`<circle class="m113-stroke-hit${selected?' selected':''}" data-m113-stroke="${esc(s.id)}" cx="${p.x}" cy="${p.y}" r="${Math.max(10,w+7)}"/>`)}else{const d=m113StrokeD(s);chunks.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);chunks.push(`<path class="m113-stroke-hit${selected?' selected':''}" data-m113-stroke="${esc(s.id)}" d="${d}" fill="none" stroke-width="${Math.max(14,w+10)}"/>`)}}
 svg.innerHTML=chunks.join('');m113BindStrokeHits();
}
drawStrokes=m113DrawStrokes;

function m113BindStrokeHits(){
 if(!m113IsFreeBoard())return;const b=activeBoard(),svg=document.getElementById('m162-vector-strokes');if(!b||!svg)return;
 svg.querySelectorAll('[data-m113-stroke]').forEach(hit=>hit.onpointerdown=e=>{
  if(boardTool!=='select'||e.button!==0)return;e.preventDefault();e.stopPropagation();m113BlurBoardEditor();const id=hit.dataset.m113Stroke;
  const clicked=b.strokes.find(s=>s.id===id),groupIds=clicked?.stampInstanceId?(b.strokes||[]).filter(s=>s.stampInstanceId===clicked.stampInstanceId).map(s=>s.id):[id];
  if(e.ctrlKey||e.metaKey){const all=groupIds.every(x=>m113SelectedStrokeIds.has(x));for(const sid of groupIds){if(all)m113SelectedStrokeIds.delete(sid);else m113SelectedStrokeIds.add(sid)}}else if(!groupIds.every(x=>m113SelectedStrokeIds.has(x))){m113SelectedStrokeIds.clear();for(const sid of groupIds)m113SelectedStrokeIds.add(sid);try{boardSelectedIds?.clear?.()}catch(_e){}selectedElement=null}
  m113DrawStrokes();if(!groupIds.some(x=>m113SelectedStrokeIds.has(x)))return;
  m113PushUndo();const ids=new Set(m113SelectedStrokeIds),rows=(b.strokes||[]).filter(s=>ids.has(s.id)),orig=rows.map(s=>({s,points:(s.points||[]).map(p=>({...p}))})),start={x:e.clientX,y:e.clientY},zoom=b.zoom||1;
  const move=ev=>{const dx=(ev.clientX-start.x)/zoom,dy=(ev.clientY-start.y)/zoom;for(const row of orig)row.s.points=row.points.map(p=>({x:p.x+dx,y:p.y+dy}));m113DrawStrokes()};
  const done=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',done,true);changed();m113Recenter()};window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',done,{once:true,capture:true});
 });
}

const m113PrevSetSelected=setSelected;
setSelected=function(id){if(id)m113SelectedStrokeIds.clear();const r=m113PrevSetSelected(id);m113DrawStrokes();return r};

function m113DeleteSelection(){
 if(!m113IsFreeBoard())return;const b=activeBoard();if(!b)return;const elementIds=new Set(boardSelectedIds?.size?[...boardSelectedIds]:(selectedElement?[selectedElement]:[])),strokeIds=new Set(m113SelectedStrokeIds);if(!elementIds.size&&!strokeIds.size)return;
 m113PushUndo();if(elementIds.size)b.elements=b.elements.filter(x=>!elementIds.has(x.id));if(strokeIds.size)b.strokes=b.strokes.filter(x=>!strokeIds.has(x.id));try{boardSelectedIds?.clear?.()}catch(_e){}selectedElement=null;m113SelectedStrokeIds.clear();renderBoardElements();m113DrawStrokes();changed();m113UpdateHistoryButtons();
}
deleteSelected=m113DeleteSelection;

function m113SelectTool(tool){boardTool=tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x.dataset.tool===tool));updateBoardCursor()}
function m113Copy(){const b=activeBoard();if(!b)return;const ids=new Set(boardSelectedIds?.size?[...boardSelectedIds]:(selectedElement?[selectedElement]:[]));const strokeIds=new Set(m113SelectedStrokeIds);if(!ids.size&&!strokeIds.size)return;m113Clipboard={elements:b.elements.filter(x=>ids.has(x.id)).map(x=>structuredClone(x)),strokes:b.strokes.filter(x=>strokeIds.has(x.id)).map(x=>structuredClone(x))};showToast(m113T('Selección copiada','Selection copied'))}
function m113Paste(){const b=activeBoard();if(!b||!m113Clipboard)return;m113PushUndo();try{boardSelectedIds?.clear?.()}catch(_e){}m113SelectedStrokeIds.clear();const pasted=[];for(const src of m113Clipboard.elements||[]){const x=structuredClone(src);x.id=uid();x.x=(Number(x.x)||0)+45;x.y=(Number(x.y)||0)+45;delete x.groupId;b.elements.push(x);pasted.push(x.id)}for(const src of m113Clipboard.strokes||[]){const s=structuredClone(src);s.id=uid();delete s.stampInstanceId;s.points=(s.points||[]).map(p=>({x:p.x+45,y:p.y+45}));b.strokes.push(s);m113SelectedStrokeIds.add(s.id)}for(const id of pasted)boardSelectedIds?.add?.(id);selectedElement=pasted[0]||null;renderBoardElements();m113DrawStrokes();changed()}

function m113GlobalKeyDown(e){
 if(!m113IsFreeBoard())return;const editable=!!e.target?.closest?.('input,textarea,select,[contenteditable="true"]'),ctrl=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
 if(e.code==='Space'&&!editable){m113SpaceDown=true;document.getElementById('board-viewport')?.classList.add('m113-space-pan');e.preventDefault();return}
 if(editable)return;
 if(ctrl&&k==='z'){e.preventDefault();e.stopImmediatePropagation();m113HistoryMove(!!e.shiftKey);return}
 if(ctrl&&k==='y'){e.preventDefault();e.stopImmediatePropagation();m113HistoryMove(true);return}
 if(ctrl&&k==='a'){e.preventDefault();e.stopImmediatePropagation();const b=activeBoard();boardSelectedIds?.clear?.();for(const item of b?.elements||[])boardSelectedIds?.add?.(item.id);m113SelectedStrokeIds=new Set((b?.strokes||[]).map(s=>s.id));selectedElement=b?.elements?.[0]?.id||null;m1211SyncBoardSelection?.();m113DrawStrokes();return}
 if(ctrl&&k==='c'){e.preventDefault();e.stopImmediatePropagation();m113Copy();return}
 if(ctrl&&k==='x'){e.preventDefault();e.stopImmediatePropagation();m113Copy();m113DeleteSelection();return}
 if(ctrl&&k==='v'){e.preventDefault();e.stopImmediatePropagation();m113Paste();return}
 if((e.key==='Delete'||e.key==='Backspace')){e.preventDefault();e.stopImmediatePropagation();m113DeleteSelection();return}
 if(e.key==='Escape'){e.preventDefault();m113SelectedStrokeIds.clear();try{boardSelectedIds?.clear?.()}catch(_e){}selectedElement=null;m113SelectTool('select');renderBoardElements();m113DrawStrokes();return}
 if(k==='v'){e.preventDefault();m113SelectTool('select');return}
 if(k==='b'){e.preventDefault();m113SelectTool('pen');return}
 if(k==='t'){e.preventDefault();m113SelectTool('select');addBoardElement('text');return}
}
function m113KeyUp(e){if(e.code==='Space'){m113SpaceDown=false;document.getElementById('board-viewport')?.classList.remove('m113-space-pan')}}
if(!window.__m113Keys){window.__m113Keys=true;window.addEventListener('keydown',m113GlobalKeyDown,true);window.addEventListener('keyup',m113KeyUp,true)}

function m113BindSpacePan(){
 if(!m113IsFreeBoard())return;const vp=document.getElementById('board-viewport');if(!vp||vp.dataset.m113SpacePan)return;vp.dataset.m113SpacePan='1';
 vp.addEventListener('pointerdown',e=>{if(!m113SpaceDown||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const b=activeBoard();m113Pan={id:e.pointerId,x:e.clientX,y:e.clientY,px:b.panX,py:b.panY};vp.setPointerCapture?.(e.pointerId)},true);
 vp.addEventListener('pointermove',e=>{if(!m113Pan||m113Pan.id!==e.pointerId)return;const b=activeBoard();b.panX=m113Pan.px+(e.clientX-m113Pan.x);b.panY=m113Pan.py+(e.clientY-m113Pan.y);applyTransform()},true);
 const done=e=>{if(!m113Pan||m113Pan.id!==e.pointerId)return;m113Pan=null;try{vp.releasePointerCapture?.(e.pointerId)}catch(_e){}changed();m113Recenter()};vp.addEventListener('pointerup',done,true);vp.addEventListener('pointercancel',done,true);vp.addEventListener('pointerup',()=>{if(boardTool==='hand')requestAnimationFrame(m113Recenter)},true);
 const canvas=document.getElementById('drawing-layer');if(canvas&&!canvas.dataset.m113History){canvas.dataset.m113History='1';canvas.addEventListener('pointerdown',()=>{if(boardTool==='pen'||boardTool==='eraser')m113PushUndo()},true)}
}

function m113DecorateBoard(){
 if(!m113IsFreeBoard())return;m113EnsureWorld();m113BindSpacePan();m113DrawStrokes();m113UpdateHistoryButtons();
 const hint=document.querySelector('.board-hint');if(hint)hint.textContent=m113T('V seleccionar · B dibujar · T texto · Espacio + arrastrar mover lienzo · Ctrl+Z/Y deshacer/rehacer · Supr eliminar','V select · B draw · T text · Space + drag pans · Ctrl+Z/Y undo/redo · Delete removes');
}

function m113ShortcutsHtml(){const en=m145Prefs?.().language==='en';const rows=(title,items)=>`<section><h3>${title}</h3>${items.map(([k,d])=>`<div class="m113-shortcut-row"><kbd>${k}</kbd><span>${d}</span></div>`).join('')}</section>`;return `<div class="modal-backdrop m113-shortcuts-backdrop" data-m113-shortcuts><div class="modal m113-shortcuts" role="dialog" aria-modal="true"><div class="m113-shortcuts-head"><div><span class="eyebrow">MARGEN</span><h2>${en?'Keyboard shortcuts':'Atajos de teclado'}</h2></div><button class="iconbtn" data-close>${ic('close')}</button></div><div class="m113-shortcuts-grid">${rows(en?'General':'Generales',[[`Ctrl + S`,en?'Save changes':'Guardar cambios'],[`Esc`,en?'Cancel / close current tool':'Cancelar o salir de la herramienta actual']])}${rows(en?'Editor':'Editor',[[`Ctrl + B`,en?'Bold':'Negrita'],[`Ctrl + I`,en?'Italic':'Cursiva'],[`Ctrl + F`,en?'Find':'Buscar']])}${rows(en?'Board':'Pizarra',[[`V`,en?'Selection tool':'Herramienta Selección'],[`B`,en?'Draw tool':'Herramienta Dibujar'],[`T`,en?'Add text':'Añadir texto'],[`Space + drag`,en?'Pan the board temporarily':'Mover temporalmente la pizarra con la mano'],[`Ctrl + Z`,en?'Undo structural action':'Deshacer acción'],[`Ctrl + Y`,en?'Redo':'Rehacer'],[`Ctrl + A`,en?'Select all board objects':'Seleccionar todo'],[`Ctrl + C / V`,en?'Copy / paste selection':'Copiar / pegar selección'],[`Delete`,en?'Delete selection':'Eliminar selección'],[`Ctrl + G`,en?'Group selected objects':'Agrupar objetos seleccionados']])}</div><div class="modal-actions"><button class="btn primary" data-close>${en?'Close':'Cerrar'}</button></div></div></div>`}
function m113OpenShortcuts(){document.querySelector('[data-m113-shortcuts]')?.remove();const wrap=document.createElement('div');wrap.innerHTML=m113ShortcutsHtml();const root=wrap.firstElementChild;document.body.append(root);root.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>root.remove());root.onpointerdown=e=>{if(e.target===root)root.remove()}}
const m113PrevHelp=m170OpenHelp;
m170OpenHelp=function(){m113PrevHelp();requestAnimationFrame(()=>{const p=document.querySelector('.m170-help-popover');if(!p||p.querySelector('[data-m113-shortcuts-open]'))return;const preview=p.querySelector('[data-m170-preview]');const btn=document.createElement('button');btn.type='button';btn.className='btn m113-shortcuts-trigger';btn.dataset.m113ShortcutsOpen='';btn.innerHTML=`⌨ ${m113T('Atajos de teclado','Keyboard shortcuts')}`;btn.onclick=()=>{m170CloseHelp();m113OpenShortcuts()};preview?.before(btn)})};

const m113PrevRender=render;
render=function(){const result=m113PrevRender();const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.13.0 · Beta';requestAnimationFrame(()=>{m113DecorateBoard()});return result};

// También tras un render parcial de elementos/acciones antiguas.
const m113PrevRenderBoardElements=renderBoardElements;
renderBoardElements=function(){const r=m113PrevRenderBoardElements();requestAnimationFrame(()=>{if(m113IsFreeBoard()){m113EnsureWorld();m113DrawStrokes()}});return r};


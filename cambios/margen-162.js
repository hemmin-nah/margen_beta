/* === MARGEN Desktop 1.6.2 · Pizarras, sellos y panel único de fichas ===
   Mantener compatibilidad de datos v1 y de los sellos PNG anteriores.
   Los nuevos trazos se guardan como puntos vectoriales, sin convertirlos a imágenes.
*/
const m162T=(es,en)=>m146T(es,en);
let m162Stamp=null;

/* Un único visor de fichas para Editar, Guion y Escritura amplia.
   Reutiliza el visor detallado de 1.4.3, no crea otra versión de las fichas. */
const m162OldRefs=m143RenderReferencePanel;
m143RenderReferencePanel=function(){
  if(!m143ReferenceOpen||!m143IsEditor()){
    document.querySelector('.m143-ref-panel')?.remove();
    document.body.classList.remove('m143-ref-open');
    m162PanelLayout();return;
  }
  const wasWide=m143Studio;
  m143Studio=true; // La vista de consulta admite también el editor convencional.
  try{m162OldRefs();}finally{m143Studio=wasWide;}
  const panel=document.querySelector('.m143-ref-panel');
  if(panel){panel.classList.add('m162-sheet-panel');panel.setAttribute('aria-label',m162T('Consultar fichas','Browse sheets'));}
  m162TranslateReferences();m162PanelLayout();
};
function m162TranslateReferences(){
  const panel=document.querySelector('.m162-sheet-panel');if(!panel)return;
  const header=panel.querySelector('.m143-ref-head');
  const title=header?.querySelector('h2');if(title)title.textContent=m162T('Tus fichas','Your sheets');
  const eyebrow=header?.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent=m162T('CONSULTA RÁPIDA','QUICK REFERENCE');
}
function m162PanelLayout(){
  const workspace=document.querySelector('.workspace');if(!workspace)return;
  const opened=m143ReferenceOpen&&!!document.querySelector('.m162-sheet-panel');
  workspace.classList.toggle('m162-sheets-visible',opened&&!m143Studio);
  document.body.classList.toggle('m143-ref-open',opened);
}
function m162ToggleSheets(){
  if(m142SearchState.open)m142CloseSearch();
  m161OpenPanel=null;document.getElementById('m161-side-panel')?.remove();
  m143ReferenceOpen=!m143ReferenceOpen;
  m143ReferenceSelected='';
  m143RenderReferencePanel();
  if(m143Studio)m143BuildTopbar();
  m161SetLayout();
}
const m162OldTogglePanel=m161TogglePanel;
m161TogglePanel=function(panel){
  if(panel==='sheets')return m162ToggleSheets();
  if(m143ReferenceOpen){m143ReferenceOpen=false;m143RenderReferencePanel();}
  return m162OldTogglePanel(panel);
};
const m162OldShowSearch=m142ShowSearch;
m142ShowSearch=function(){
  if(m143ReferenceOpen){m143ReferenceOpen=false;m143RenderReferencePanel();}
  return m162OldShowSearch();
};
const m162OldTopbar=m143BuildTopbar;
m143BuildTopbar=function(){
  m162OldTopbar();
  const button=document.getElementById('m143-refs');
  if(button){button.innerHTML=ic('users')+' '+m162T('Fichas','Sheets');button.setAttribute('aria-pressed',String(m143ReferenceOpen));}
};
function m162ConnectSheetButtons(){
  document.querySelectorAll('#m161-sheets-button').forEach(button=>{
    button.onclick=m162ToggleSheets;
    button.innerHTML=ic('users')+' '+m162T('Fichas','Sheets');
    button.setAttribute('aria-pressed',String(m143ReferenceOpen));
  });
  document.querySelectorAll('.screenplay-area .editor-toolbar button').forEach(button=>{
    if(button.textContent.trim()===m162T('Fichas','Sheets')||button.textContent.trim()==='Fichas'||button.textContent.trim()==='Sheets'){
      button.onclick=m162ToggleSheets;
      button.innerHTML=ic('users')+' '+m162T('Fichas','Sheets');
    }
  });
}

/* Lienzo vectorial: la capa canvas permanece como superficie de entrada del lápiz,
   pero los trazos se dibujan en SVG, por lo que no se rasterizan al ampliar. */
function m162SvgLayer(){
  const world=document.getElementById('board-world');if(!world)return null;
  let svg=document.getElementById('m162-vector-strokes');
  if(!svg){
    svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id='m162-vector-strokes';svg.classList.add('m162-vector-strokes');
    svg.setAttribute('viewBox','0 0 4000 2800');svg.setAttribute('width','4000');svg.setAttribute('height','2800');
    world.append(svg);
  }
  return svg;
}
const m162Num=value=>Math.round(Math.max(-200,Math.min(4200,Number(value)||0))*100)/100;
function m162Path(points){
  if(!Array.isArray(points)||points.length===0)return '';
  return points.map((p,i)=>(i?'L':'M')+m162Num(p.x)+' '+m162Num(p.y)).join(' ');
}
const m162OldDrawStrokes=drawStrokes;
drawStrokes=function(){
  const svg=m162SvgLayer(),board=activeBoard();if(!svg||!board||board.diagramMode!=='free')return;
  let markup='';
  for(const stroke of board.strokes||[]){
    if(!Array.isArray(stroke.points)||!stroke.points.length)continue;
    const color=safeColor(stroke.color,'#6c7769'),width=Math.max(0.5,Math.min(45,Number(stroke.width)||4));
    if(stroke.points.length===1){const p=stroke.points[0];markup+=`<circle cx="${m162Num(p.x)}" cy="${m162Num(p.y)}" r="${width/2}" fill="${color}"/>`;}
    else markup+=`<path d="${m162Path(stroke.points)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  svg.innerHTML=markup;
};
function m162CrispLines(){
  const world=document.getElementById('board-world');if(!world)return;
  let paper=world.querySelector('.m162-ruled-paper');
  if(!paper){
    paper=document.createElementNS('http://www.w3.org/2000/svg','svg');
    paper.classList.add('m162-ruled-paper');
    paper.setAttribute('width','4000');paper.setAttribute('height','2800');paper.setAttribute('viewBox','0 0 4000 2800');
    let d='';for(let y=54;y<2800;y+=41)d+=`M 0 ${y} H 4000 `;
    paper.innerHTML=`<path d="${d}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    world.prepend(paper);
  }
}

/* Mover la CAJA entera: clic y arrastrar. Doble clic edita el texto. */
function m162MakeBoxMovable(){
  const board=activeBoard();if(!board||board.diagramMode!=='free')return;
  document.querySelectorAll('#board-items>.board-item').forEach(node=>{
    if(node.dataset.m162Movable==='1')return;
    node.dataset.m162Movable='1';
    const item=board.elements.find(it=>it.id===node.dataset.eid);if(!item)return;
    const editor=node.querySelector('.item-body');
    if(editor&&!item.locked){editor.contentEditable='false';editor.setAttribute('title',m162T('Arrastra la caja para moverla. Doble clic para editar.','Drag the box to move it. Double-click to edit.'));}
    if(editor&&item.type!=='image'){
      editor.addEventListener('dblclick',event=>{
        if(item.locked||boardTool!=='select')return;
        event.stopPropagation();node.dataset.m162Editing='1';editor.contentEditable='true';editor.focus();
      });
      editor.addEventListener('blur',()=>{
        node.dataset.m162Editing='0';editor.contentEditable='false';
      });
    }
    node.addEventListener('pointerdown',event=>{
      if(boardTool!=='select'||event.button!==0||event.shiftKey||item.locked||node.dataset.m162Editing==='1')return;
      if(event.target.closest('.resize-grip,.item-handle,.item-popmenu,.item-menu-panel,input,button,select'))return;
      event.preventDefault();event.stopImmediatePropagation();
      startItemDrag(event,item,node,'move');
    },true);
  });
}
const m162OldRenderBoardElements=renderBoardElements;
renderBoardElements=function(){m162OldRenderBoardElements();m162MakeBoxMovable()};

/* Sellos vectoriales. Una selección de trazos genera un patrón relativo;
   cada clic crea nuevas trazas independientes (no un elemento PNG). */
function m162StrokesInRect(board,x,y,w,h){
  return (board.strokes||[]).filter(s=>s.points?.some(p=>p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h));
}
finishStampSelection=function(box){
  const board=activeBoard(),project=activeProject();if(!board||!project)return;
  const x=Math.max(0,Math.min(box.x1,box.x2)),y=Math.max(0,Math.min(box.y1,box.y2));
  const w=Math.abs(box.x1-box.x2),h=Math.abs(box.y1-box.y2);
  if(w<8||h<8){showToast(m162T('Selecciona un área más grande.','Select a larger area.'));return;}
  const source=m162StrokesInRect(board,x,y,w,h);
  if(!source.length){showToast(m162T('No hay trazos en esa zona.','No strokes in that area.'));return;}
  const vectorStrokes=source.map(s=>({
    color:safeColor(s.color,'#6c7769'),width:Number(s.width)||4,
    points:s.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:Math.max(0,Math.min(w,p.x-x)),y:Math.max(0,Math.min(h,p.y-y))}))
  })).filter(s=>s.points.length);
  const src=stampFromStrokes(source,{x,y,w,h}); // Solo miniatura de la biblioteca.
  modal({
    title:m162T('Guardar sello vectorial','Save vector stamp'),
    description:m162T('Cada clic reproducirá los trazos sin perder nitidez. Los dibujos originales permanecen.','Each click will reproduce these strokes sharply. Your original drawing stays in place.'),
    fields:[{id:'title',label:m162T('Nombre del sello','Stamp name'),required:true,placeholder:m162T('Estrella, flor, símbolo…','Star, flower, symbol…')}],
    submit:m162T('Guardar sello','Save stamp'),
    onSubmit:({title})=>{
      if((project.stamps?.length||0)+(state.globalStamps?.length||0)>=70){showToast(m162T('Límite de 70 sellos alcanzado','70-stamp limit reached'));return;}
      const global=confirm(m162T('¿Usar este sello en todos tus libros? Aceptar = global. Cancelar = solo este libro.','Make this stamp available in every book? OK = global. Cancel = this book only.'));
      const stamp={id:uid(),title,src,w,h,vectorStrokes,createdAt:now()};
      if(global)state.globalStamps.push(stamp);else project.stamps.push(stamp);
      changed();showToast(m162T('Sello vectorial guardado','Vector stamp saved'));
    }
  });
};
function m162StampHere(pos){
  const board=activeBoard(),stamp=m162Stamp;if(!stamp||!board||board.diagramMode!=='free')return;
  if(!stamp.vectorStrokes?.length)return;
  pushBoardUndo();const group=uid();
  const x=pos.x-(Number(stamp.w)||80)/2,y=pos.y-(Number(stamp.h)||80)/2;
  for(const source of stamp.vectorStrokes){
    board.strokes.push({id:uid(),stampInstanceId:group,stampSourceId:stamp.id,
      color:source.color||penColor,width:Math.max(.5,Number(source.width)||4),
      points:(source.points||[]).map(p=>({x:p.x+x,y:p.y+y}))});
  }
  drawStrokes();changed();
}
const m162OldStampLibrary=stampLibrary;
stampLibrary=function(){
  const project=activeProject();if(!project)return;
  document.querySelector('.stamp-modal-overlay')?.remove();
  const entries=[...(project.stamps||[]).map(s=>({...s,scope:'book'})),...(state.globalStamps||[]).map(s=>({...s,scope:'global'}))];
  const overlay=document.createElement('div');overlay.className='modal-backdrop stamp-modal-overlay';
  overlay.innerHTML=`<div class="modal m162-stamp-modal"><h2>${m162T('Biblioteca de sellos','Stamp library')}</h2><p>${m162T('Elige un sello y haz clic tantas veces como quieras en la pizarra. Esc para terminar.','Choose a stamp and click anywhere on the board to repeat it. Press Esc to finish.')}</p><div class="stamp-library">${entries.map(s=>`<div class="stamp-tile"><img src="${esc(s.src||'')}" alt="${esc(s.title)}"><span class="stamp-name">${esc(s.title)} · ${s.vectorStrokes?.length?m162T('Vectorial','Vector'):m162T('Antiguo PNG','Legacy PNG')}</span><div class="stamp-actions"><button type="button" data-m162-stamp-use="${esc(s.id)}" data-scope="${esc(s.scope)}">${m162T('Estampar','Stamp')}</button><button type="button" data-m162-stamp-delete="${esc(s.id)}" data-scope="${esc(s.scope)}">${m162T('Eliminar','Delete')}</button></div></div>`).join('')||`<p>${m162T('Dibuja algo con el lápiz y usa «Crear sello».','Draw with the pencil and choose “Create stamp”.')}</p>`}</div><div class="modal-actions"><button class="btn" id="m162-stamp-close">${m162T('Cerrar','Close')}</button></div></div>`;
  document.body.append(overlay);
  const close=()=>overlay.remove();overlay.querySelector('#m162-stamp-close').onclick=close;
  overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});
  overlay.querySelectorAll('[data-m162-stamp-use]').forEach(button=>button.onclick=()=>{
    const list=button.dataset.scope==='global'?state.globalStamps:project.stamps;
    const stamp=list.find(s=>s.id===button.dataset.m162StampUse);if(!stamp)return;
    close();if(!stamp.vectorStrokes?.length){addBoardElement('image',stamp.src);showToast(m162T('Este sello antiguo sigue siendo una imagen. Crea uno nuevo para estampar trazos vectoriales.','This legacy stamp is still an image. Make a new one for vector stamping.'));return;}
    m162Stamp=stamp;boardTool='m162-stamp';updateBoardCursor();
    document.querySelectorAll('[data-tool]').forEach(btn=>btn.classList.remove('on'));
    document.getElementById('board-viewport')?.classList.add('m162-stamping');
    showToast(m162T('Haz clic para estampar; Esc para terminar.','Click to stamp; Esc to finish.'));
  });
  overlay.querySelectorAll('[data-m162-stamp-delete]').forEach(button=>button.onclick=()=>{
    if(!confirm(m162T('¿Eliminar el sello? Los ya estampados permanecerán.','Delete this stamp? Existing impressions remain.')))return;
    const list=button.dataset.scope==='global'?state.globalStamps:project.stamps;
    const index=list.findIndex(s=>s.id===button.dataset.m162StampDelete);
    if(index>=0)list.splice(index,1);changed();close();stampLibrary();
  });
};
function m162StopStamp(){
  if(boardTool==='m162-stamp')boardTool='select';m162Stamp=null;
  document.getElementById('board-viewport')?.classList.remove('m162-stamping');
  updateBoardCursor();document.querySelectorAll('[data-tool]').forEach(btn=>btn.classList.toggle('on',btn.dataset.tool==='select'));
}
function m162BindStampMode(){
  const vp=document.getElementById('board-viewport');if(!vp||vp.dataset.m162StampBind)return;
  vp.dataset.m162StampBind='1';
  vp.addEventListener('pointerdown',event=>{
    if(boardTool!=='m162-stamp'||event.button!==0)return;
    event.preventDefault();event.stopImmediatePropagation();m162StampHere(worldPoint(event));
  },true);
}
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&boardTool==='m162-stamp'){event.preventDefault();event.stopImmediatePropagation();m162StopStamp();}
},true);
const m162OldSetupBoard=setupBoard;
setupBoard=function(){
  m162OldSetupBoard();
  if(activeBoard()?.diagramMode!=='free')return;
  m162CrispLines();m162BindStampMode();drawStrokes();m162MakeBoxMovable();
};

/* Último paso de render: no altera el manuscrito ni los datos persistidos. */
const m162OldRender=render;
render=function(){
  m162OldRender();
  const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.6.2 · Desktop';
  if(state.view==='manuscript'&&m143IsEditor()){
    // Texto residual heredado que ya no corresponde a un modo existente.
    document.querySelectorAll('.editor-toolbar span').forEach(span=>{
      if(['Sin distracciones','Distraction free'].includes(span.textContent.trim()))span.remove();
    });
    m162ConnectSheetButtons();
    if(m143ReferenceOpen){m143RenderReferencePanel();}
  }else{document.querySelector('.m162-sheet-panel')?.remove();m162PanelLayout();}
  if(state.view==='boards'&&activeBoard()?.diagramMode==='free'){
    m162CrispLines();drawStrokes();m162MakeBoxMovable();
  }
};

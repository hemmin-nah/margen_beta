/* MARGEN 1.12.1 · Pizarra, fichas, referencias, diagramas y línea temporal.
   Capa aditiva sobre 1.12.0 R4. R2 incorpora la barra plegable aprobada en beta. */
'use strict';
const m1211T=(es,en)=>typeof m146T==='function'?m146T(es,en):es;
const m1211ValidImage=src=>typeof src==='string'&&/^(data:image\/|asset:|https?:\/\/|blob:)/i.test(src);
const m1211Palette=['#6c876f','#b66f62','#c18b55','#7c76a8','#5e86a3','#9a6f86','#78846c','#b39a62'];

/* ---------- Compatibilidad de datos ---------- */
const m1211PrevEnsure=ensureSelections;
ensureSelections=function(){
  m1211PrevEnsure();
  for(const p of state?.projects||[]){
    for(const owner of [...(p.characters||[]),...(p.settings||[])]){
      owner.gallery=Array.isArray(owner.gallery)?owner.gallery:[];
      if(!owner.gallery.some(x=>x.id===owner.mainPhotoId))owner.mainPhotoId=owner.gallery[0]?.id||'';
    }
    for(const b of p.boards||[]){
      if(!['free','genealogy','relations'].includes(b.diagramMode))b.diagramMode='free';
      // Las pizarras antiguas quedan fijadas al tipo que ya tenían.
      b.boardType=b.boardType||b.diagramMode||'free';
      if(!['free','genealogy','relations'].includes(b.boardType))b.boardType='free';
      b.diagramMode=b.boardType;
    }
    for(const t of p.chronologies||[])for(const e of t.events||[]){
      if(!/^#[0-9a-fA-F]{6}$/.test(e.color||''))e.color=m1211Palette[0];
    }
  }
};
function m1211MainPhoto(owner){return owner?.gallery?.find(x=>x.id===owner.mainPhotoId)||owner?.gallery?.[0]||null}

/* ---------- Pizarras: tipo elegido al crear y después fijo ---------- */
function m1211BoardTypeDialog(){
  const p=activeProject();if(!p)return;
  const layer=document.createElement('div');layer.className='modal-backdrop m1211-board-type-modal';
  layer.innerHTML=`<form class="modal"><h2>${m1211T('Nueva pizarra','New board')}</h2><p>${m1211T('Elige el tipo ahora. Quedará asociado a esta pizarra para que cada espacio conserve su propósito.','Choose the type now. It will stay attached to this board so each space keeps its purpose.')}</p><div class="field"><label>${m1211T('Nombre de la pizarra','Board name')}</label><input required maxlength="120" data-m1211-board-title placeholder="${m1211T('Investigación del capítulo 3','Chapter 3 research')}"></div><div class="m1211-board-types"><button type="button" data-type="free" class="active">${ic('board')}<strong>${m1211T('Pizarra libre','Free board')}</strong><small>${m1211T('Notas, imágenes, texto, dibujo y sellos.','Notes, images, text, drawing and stamps.')}</small></button><button type="button" data-type="genealogy">${ic('users')}<strong>${m1211T('Genealogía','Family tree')}</strong><small>${m1211T('Familia, parentescos y generaciones.','Family, kinship and generations.')}</small></button><button type="button" data-type="relations">${ic('link')}<strong>${m1211T('Relaciones','Relationships')}</strong><small>${m1211T('Amistad, amor, rivalidades y vínculos.','Friendship, love, rivalry and connections.')}</small></button></div><div class="modal-actions"><button type="button" class="btn" data-cancel>${m1211T('Cancelar','Cancel')}</button><button class="btn primary" type="submit">${m1211T('Crear pizarra','Create board')}</button></div></form>`;
  document.body.append(layer);let type='free';
  layer.querySelectorAll('[data-type]').forEach(btn=>btn.onclick=()=>{type=btn.dataset.type;layer.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('active',x===btn))});
  layer.querySelector('[data-cancel]').onclick=()=>layer.remove();
  layer.onmousedown=e=>{if(e.target===layer)layer.remove()};
  layer.querySelector('form').onsubmit=e=>{e.preventDefault();const title=layer.querySelector('[data-m1211-board-title]').value.trim();if(!title)return;
    const id=uid(),board={id,title,background:'dots',zoom:1,panX:-790,panY:-520,elements:[],strokes:[],diagramMode:type,boardType:type,graphs:{}};
    p.boards.push(board);state.activeBoardId=id;state.view='boards';boardTool='select';layer.remove();ensureSelections();changed();render();
  };
  layer.querySelector('[data-m1211-board-title]')?.focus();
}
addBoard=m1211BoardTypeDialog;
function m1211LockBoardTypeUi(){
  if(state.view!=='boards')return;const b=activeBoard(),select=document.getElementById('m121-board-mode');if(!b||!select)return;
  const label=select.closest('label'),text=b.boardType==='genealogy'?m1211T('Genealogía','Family tree'):b.boardType==='relations'?m1211T('Relaciones','Relationships'):m1211T('Pizarra libre','Free board');
  const badge=document.createElement('span');badge.className='m1211-board-type';badge.innerHTML=`${b.boardType==='free'?ic('board'):b.boardType==='genealogy'?ic('users'):ic('link')}<span>${text}</span>`;
  (label||select).replaceWith(badge);
}

/* ---------- Galerías con scroll + foto principal ---------- */
function m1211DecorateGallery(){
  if(!['characters','settings'].includes(state.view))return;
  const owner=state.view==='characters'?activeCharacter():activeSetting();if(!owner)return;const photos=owner.gallery||[];
  const gallery=document.querySelector('.char-gallery');if(!gallery)return;gallery.classList.add('m1211-gallery-scroll');
  const cards=[...gallery.querySelectorAll('.char-photo')];cards.forEach((card,index)=>{const photo=photos[index];if(!photo)return;
    card.classList.toggle('m1211-main-photo',photo.id===owner.mainPhotoId);
    if(!card.querySelector('[data-m1211-main-photo]')){const star=document.createElement('button');star.type='button';star.className='m1211-main-photo-btn';star.dataset.m1211MainPhoto=photo.id;star.title=m1211T('Usar como foto principal','Use as main photo');star.textContent=photo.id===owner.mainPhotoId?'★':'☆';card.append(star);
      star.onclick=e=>{e.preventDefault();e.stopPropagation();owner.mainPhotoId=photo.id;changed();render()};
    }
  });
  const photo=m1211MainPhoto(owner);if(photo?.src){const target=state.view==='characters'?document.querySelector('.char-avatar'):document.querySelector('.m12-place-thumb');if(target){target.replaceChildren();const img=document.createElement('img');img.src=photo.src;img.alt=owner.title||'';target.append(img)}}
}

/* Escenarios: personajes como selector + tags, sin lista interminable de checkboxes. */
function m1211CharacterTags(){
  if(state.view!=='settings')return;const p=activeProject(),place=activeSetting();if(!p||!place)return;
  const panel=document.querySelector('[data-m122-link-panel="personajes-vinculados"] .m122-linked-body')||[...document.querySelectorAll('.char-panel,.m122-linked-panel')].find(x=>/Personajes vinculados|Linked characters/i.test(x.textContent||''));
  const body=panel?.classList?.contains('m122-linked-body')?panel:panel?.querySelector('.m122-linked-body');if(!body)return;
  const ids=Array.isArray(place.characterIds)?place.characterIds:[];place.characterIds=ids;
  body.innerHTML=`<p class="m12-panel-intro">${m1211T('Añade personajes relacionados con este escenario. Se muestran como etiquetas y puedes abrir su ficha.','Add characters related to this setting. They appear as tags and you can open their sheet.')}</p><div class="m1211-tags">${ids.map(id=>{const ch=p.characters.find(c=>c.id===id);return ch?`<span class="m1211-tag"><button type="button" data-m1211-open-character="${esc(id)}">${esc(ch.title)}</button><button type="button" data-m1211-remove-character="${esc(id)}" aria-label="${m1211T('Quitar','Remove')}">×</button></span>`:''}).join('')||`<span class="m1211-empty-tag">${m1211T('Sin personajes vinculados','No linked characters')}</span>`}</div><div class="m1211-tag-add"><select data-m1211-character-select><option value="">${m1211T('Seleccionar personaje…','Select character…')}</option>${p.characters.filter(c=>!ids.includes(c.id)).map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}</select><button class="btn" type="button" data-m1211-character-add>${ic('plus')} ${m1211T('Añadir','Add')}</button></div>`;
  body.querySelector('[data-m1211-character-add]')?.addEventListener('click',()=>{const sel=body.querySelector('[data-m1211-character-select]'),id=sel?.value;if(!id||ids.includes(id))return;ids.push(id);changed();render()});
  body.querySelectorAll('[data-m1211-remove-character]').forEach(btn=>btn.onclick=()=>{place.characterIds=place.characterIds.filter(x=>x!==btn.dataset.m1211RemoveCharacter);changed();render()});
  body.querySelectorAll('[data-m1211-open-character]').forEach(btn=>btn.onclick=()=>m12OpenLink('character',btn.dataset.m1211OpenCharacter));
}

/* ---------- Referencias del editor: Personajes > Pepe > tipo de referencia ---------- */
const m1211PrevRefsHtml=m146RefsHtml;
m146RefsHtml=function(p,kind,id){
  if(kind!=='chapter'||!id)return m1211PrevRefsHtml(p,kind,id);
  const rows=m146RefIndex(p).filter(r=>r.targetKind===kind&&r.targetId===id);if(!rows.length)return m1211PrevRefsHtml(p,kind,id);
  const charRows=rows.filter(r=>r.sourceKind==='character'),others=rows.filter(r=>r.sourceKind!=='character');
  const charMap=new Map();for(const row of charRows){if(!charMap.has(row.sourceId))charMap.set(row.sourceId,[]);charMap.get(row.sourceId).push(row)}
  const item=row=>`<button type="button" class="m146-ref-item" data-m146-ref="${esc(row.sourceKind)}" data-m146-id="${esc(row.sourceId)}" data-m146-outline="${esc(row.outlineId||'')}" data-m146-chronology="${esc(row.chronologyId||'')}" data-m146-board="${esc(row.boardId||'')}" data-m146-mode="${esc(row.diagramMode||'')}">${ic(row.sourceKind==='scene'?'list':row.sourceKind==='event'?'clock':row.sourceKind==='diagram'?'users':row.sourceKind==='setting'?'map':'book')}<span class="m146-ref-label"><strong>${esc(row.sourceName)}</strong><small>${esc(m146Detail(row))}</small></span>${ic('chevron')}</button>`;
  let body='';if(charMap.size)body+=`<div class="m146-ref-group m1211-character-ref-group"><h4>${m1211T('Personajes','Characters')}</h4>${[...charMap.values()].map(group=>`<details class="m1211-character-ref" open><summary>${ic('users')}<strong>${esc(group[0].sourceName)}</strong><span>${group.length}</span></summary><div>${group.map(r=>`<button type="button" class="m1211-ref-detail" data-m146-ref="character" data-m146-id="${esc(r.sourceId)}"><span>${r.description==='characterArc'?m1211T('Etapa','Arc'):m1211T('Capítulo','Chapter')}</span><small>${esc(m146Detail(r))}</small></button>`).join('')}</div></details>`).join('')}</div>`;
  const groups=new Map();for(const row of others){const key=row.sourceKind==='diagram'?row.sourceKind+row.diagramMode:row.sourceKind;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
  body+=[...groups.values()].map(items=>`<div class="m146-ref-group"><h4>${esc(m146GroupTitle(items[0]))}</h4>${items.map(item).join('')}</div>`).join('');
  return `<details class="m146-references" data-m146-ref-panel="${esc(kind)}:${esc(id)}"><summary>${ic('link')} <span>${m1211T('Referencias a este capítulo','References to this chapter')}</span><span class="m146-summary-count">${rows.length}</span></summary><div class="m146-references-body">${body}</div></details>`;
};

/* ---------- Pizarra libre ---------- */
let m1211Marquee=null,m1211SelectedStamp=null;
function m1211SyncBoardSelection(){document.querySelectorAll('.board-item').forEach(elm=>elm.classList.toggle('group-selected',boardSelectedIds.has(elm.dataset.eid)));updateBoardSelectionButtons()}
function m1211BoardCoords(event){const world=document.getElementById('board-world'),b=activeBoard();if(!world||!b)return{x:0,y:0};const r=world.getBoundingClientRect();return{x:(event.clientX-r.left)/b.zoom,y:(event.clientY-r.top)/b.zoom}}
function m1211BindBoardSelection(){
  if(state.view!=='boards'||activeBoard()?.boardType!=='free')return;const items=document.getElementById('board-items'),vp=document.getElementById('board-viewport'),world=document.getElementById('board-world');if(!items||!vp||!world)return;
  items.addEventListener('pointerdown',e=>{
    const node=e.target.closest('.board-item');if(!node||boardTool!=='select')return;
    if(e.shiftKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();return}
    if(!(e.ctrlKey||e.metaKey))return;
    if(e.target.closest('input,textarea,[contenteditable="true"],button,select,.item-popmenu'))return;
    e.preventDefault();e.stopImmediatePropagation();const id=node.dataset.eid;
    if(boardSelectedIds.has(id))boardSelectedIds.delete(id);else boardSelectedIds.add(id);selectedElement=id;m1211SyncBoardSelection();
  },true);
  vp.addEventListener('pointerdown',e=>{
    if(boardTool!=='select'||e.button!==0||e.target.closest('.board-item,[data-m1211-stamp-hit],.selection-tools,.zoom-controls'))return;
    // El marco sólo nace sobre fondo vacío; no compite con mano/lápiz.
    const start=m1211BoardCoords(e),rect=document.createElement('div');rect.className='m1211-marquee';vp.append(rect);m1211Marquee={start,rect,pointer:e.pointerId};vp.setPointerCapture(e.pointerId);e.preventDefault();
  },true);
  vp.addEventListener('pointermove',e=>{if(!m1211Marquee||m1211Marquee.pointer!==e.pointerId)return;const p=m1211BoardCoords(e),x=Math.min(m1211Marquee.start.x,p.x),y=Math.min(m1211Marquee.start.y,p.y),w=Math.abs(p.x-m1211Marquee.start.x),h=Math.abs(p.y-m1211Marquee.start.y),b=activeBoard();m1211Marquee.box={x,y,w,h};m1211Marquee.rect.style.cssText=`left:${x*b.zoom+b.panX}px;top:${y*b.zoom+b.panY}px;width:${w*b.zoom}px;height:${h*b.zoom}px`});
  const finish=e=>{if(!m1211Marquee||m1211Marquee.pointer!==e.pointerId)return;const box=m1211Marquee.box;m1211Marquee.rect.remove();m1211Marquee=null;if(!box||box.w<3||box.h<3)return;boardSelectedIds.clear();for(const item of activeBoard().elements||[]){const ix=item.x||0,iy=item.y||0,iw=item.w||0,ih=item.h||0;if(ix<box.x+box.w&&ix+iw>box.x&&iy<box.y+box.h&&iy+ih>box.y)boardSelectedIds.add(item.id)}selectedElement=[...boardSelectedIds][0]||null;m1211SyncBoardSelection()};
  vp.addEventListener('pointerup',finish);vp.addEventListener('pointercancel',finish);
}
function m1211AddResizeHandles(){
  if(state.view!=='boards'||activeBoard()?.boardType!=='free')return;
  document.querySelectorAll('#board-items>.board-item').forEach(node=>{const item=activeBoard().elements.find(x=>x.id===node.dataset.eid);if(!item)return;node.querySelectorAll('.resize-grip').forEach(x=>x.remove());
    for(const corner of ['nw','ne','sw','se']){const grip=document.createElement('div');grip.className='m1211-resize resize-grip '+corner;grip.dataset.corner=corner;node.append(grip);grip.onpointerdown=e=>{if(item.locked||boardTool!=='select')return;e.preventDefault();e.stopPropagation();pushBoardUndo();setSelected(item.id);const start={x:e.clientX,y:e.clientY,ox:item.x,oy:item.y,ow:item.w,oh:item.h},zoom=activeBoard().zoom||1;
      const move=ev=>{let dx=(ev.clientX-start.x)/zoom,dy=(ev.clientY-start.y)/zoom,x=start.ox,y=start.oy,w=start.ow,h=start.oh;if(corner.includes('e'))w=Math.max(80,start.ow+dx);if(corner.includes('s'))h=Math.max(60,start.oh+dy);if(corner.includes('w')){w=Math.max(80,start.ow-dx);x=start.ox+(start.ow-w)}if(corner.includes('n')){h=Math.max(60,start.oh-dy);y=start.oy+(start.oh-h)}Object.assign(item,{x,y,w,h});node.style.left=x+'px';node.style.top=y+'px';node.style.width=w+'px';node.style.height=h+'px'};
      const done=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);changed()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',done,{once:true});};}
  });
}
function m1211DirectText(){if(state.view!=='boards'||activeBoard()?.boardType!=='free')return;document.querySelectorAll('#board-items>.board-item.text').forEach(node=>{const item=activeBoard().elements.find(x=>x.id===node.dataset.eid),body=node.querySelector('.item-body');if(!item||!body)return;if(item.m1211NewText){delete item.m1211NewText;node.dataset.m162Editing='1';body.contentEditable='true';body.focus();const range=document.createRange();range.selectNodeContents(body);const sel=getSelection();sel.removeAllRanges();sel.addRange(range)}})}
function m1211BindNoteTab(){
  if(state.view!=='boards'||activeBoard()?.boardType!=='free')return;
  document.querySelectorAll('#board-items>.board-item.note').forEach(node=>{
    const title=node.querySelector('.item-note-title'),body=node.querySelector('.item-body');if(!title||!body||title.dataset.m1211TabBound)return;title.dataset.m1211TabBound='1';
    title.addEventListener('keydown',e=>{if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(e.shiftKey)return;node.dataset.m162Editing='1';body.contentEditable='true';body.focus();const range=document.createRange();range.selectNodeContents(body);range.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(range)});
  });
}
const m1211PrevAddElement=addBoardElement;
addBoardElement=function(type,data){m1211PrevAddElement(type,data);if(type==='text'){const item=activeBoard()?.elements?.at(-1);if(item){item.m1211NewText=true;renderBoardElements();requestAnimationFrame(m1211DirectText)}}};
function m1211EyeDropper(){
  if(state.view!=='boards'||activeBoard()?.boardType!=='free')return;const color=document.getElementById('pen-color'),bar=document.querySelector('.boardbar');if(!color||!bar||bar.querySelector('[data-m1211-eyedropper]'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='tool-btn';btn.dataset.m1211Eyedropper='1';btn.title=m1211T('Cuentagotas','Eyedropper');btn.innerHTML='⌾';color.closest('label')?.after(btn);btn.onclick=async()=>{try{if(window.EyeDropper){const result=await new EyeDropper().open();color.value=result.sRGBHex;penColor=result.sRGBHex;color.dispatchEvent(new Event('input',{bubbles:true}));changed()}else color.click()}catch(_e){/* cancelar no es error */}};
}
function m1211StampBounds(group){const strokes=(activeBoard()?.strokes||[]).filter(s=>s.stampInstanceId===group),pts=strokes.flatMap(s=>s.points||[]);if(!pts.length)return null;const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(10,Math.max(...xs)-Math.min(...xs)),h:Math.max(10,Math.max(...ys)-Math.min(...ys))}}
const m1211PrevDrawStrokes=drawStrokes;
drawStrokes=function(){m1211PrevDrawStrokes();const svg=document.getElementById('m162-vector-strokes'),b=activeBoard();if(!svg||!b||b.boardType!=='free')return;const groups=[...new Set((b.strokes||[]).map(s=>s.stampInstanceId).filter(Boolean))];for(const group of groups){const q=m1211StampBounds(group);if(!q)continue;const r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.setAttribute('x',q.x-6);r.setAttribute('y',q.y-6);r.setAttribute('width',q.w+12);r.setAttribute('height',q.h+12);r.setAttribute('class','m1211-stamp-hit'+(m1211SelectedStamp===group?' selected':''));r.dataset.m1211StampHit=group;svg.append(r)}
  svg.querySelectorAll('[data-m1211-stamp-hit]').forEach(hit=>hit.onpointerdown=e=>{if(boardTool!=='select'||e.button!==0)return;e.preventDefault();e.stopPropagation();m1211SelectedStamp=hit.dataset.m1211StampHit;drawStrokes();const strokes=b.strokes.filter(s=>s.stampInstanceId===m1211SelectedStamp),start={x:e.clientX,y:e.clientY},orig=strokes.map(s=>({s,points:s.points.map(p=>({...p}))})),zoom=b.zoom||1;pushBoardUndo();
    const move=ev=>{const dx=(ev.clientX-start.x)/zoom,dy=(ev.clientY-start.y)/zoom;for(const row of orig)row.s.points=row.points.map(p=>({x:p.x+dx,y:p.y+dy}));m1211PrevDrawStrokes();};
    const done=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);changed();drawStrokes()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',done,{once:true});});
};
function m1211StampOnboarding(){const btn=document.querySelector('[data-action="stamp-create"]');if(!btn||btn.dataset.m1211Onboard)return;btn.dataset.m1211Onboard='1';btn.addEventListener('click',()=>{if(m112StorageGet('margen-1211-stamp-help'))return;m112StorageSet('margen-1211-stamp-help','1');setTimeout(()=>showToast(m1211T('Sello: encierra un trazo o varios. Al guardarlo podrás estamparlos repetidamente y mover cada impresión como conjunto.','Stamp: enclose one or several strokes. Save them to repeat the stamp and move each impression as a group.')),0)},true)}


function m1211BoardHint(){
  if(state.view!=='boards'||activeBoard()?.boardType!=='free')return;
  const hint=document.querySelector('.board-hint');if(hint)hint.textContent=m1211T('Ctrl+clic o arrastra sobre el fondo para seleccionar varios · Arrastra cualquier zona de una nota para moverla · Ctrl+G agrupa','Ctrl+click or drag on the background to select several · Drag anywhere on a note to move it · Ctrl+G groups');
}

/* ---------- Genealogía y Relaciones ---------- */
/* Pareja y Matrimonio son vínculos distintos. Los libros antiguos con `partner`
   siguen siendo Pareja; Matrimonio usa un ID nuevo y participa igualmente en el
   cálculo de uniones familiares. */
const m1211PrevRelationTypes=m122RelationTypes;
m122RelationTypes=function(mode){
  const types=m1211PrevRelationTypes(mode);if(mode!=='genealogy')return types;
  const out=[];for(const type of types){
    if(type.id==='partner'){
      out.push({...type,title:m1211T('Pareja','Partner')});
      out.push({id:'marriage',title:m1211T('Matrimonio','Marriage'),symbol:'♥',color:'#b47b61',dash:'',arrow:false});
    }else out.push(type);
  }return out;
};
try{m163UnionTypes?.add?.('marriage')}catch(_e){}
const m1211PrevMakeEdge=m122MakeEdge;
m122MakeEdge=function(from,to){
  const mode=activeBoard()?.diagramMode,type=document.getElementById('m122-new-edge-type')?.value||m122RelationTypes(mode)[0]?.id;
  if(mode==='genealogy'&&['partner','marriage'].includes(type)){
    const g=m122Graph();if(g?.edges?.some(e=>e.type===type&&((e.from===from&&e.to===to)||(e.from===to&&e.to===from)))){showToast(m1211T('Ese vínculo ya existe','That relationship already exists'));return}
  }
  return m1211PrevMakeEdge(from,to);
};
let m1211QuickNodes=[];
function m1211NodePhoto(node){const p=activeProject(),person=p?.characters?.find(c=>c.id===node?.characterId),photo=m1211MainPhoto(person);return photo?.src}
const m1211PrevDrawGraph=m122Draw;
m122Draw=function(){
  const g=m122Graph(),p=activeProject();if(g&&p)for(const node of g.nodes||[]){const person=p.characters?.find(c=>c.id===node.characterId);if(person&&!String(node.name||'').trim())node.name=person.title||node.name}
  m1211PrevDrawGraph();if(!g)return;
  document.querySelectorAll('#m122-nodes [data-m122-node]').forEach(el=>{const node=g.nodes.find(n=>n.id===el.dataset.m122Node);el.classList.toggle('m1211-quick-selected',m1211QuickNodes.includes(node?.id));const src=m1211NodePhoto(node);if(!src||!m1211ValidImage(src))return;let avatar=el.querySelector('.m122-avatar');if(!avatar){avatar=document.createElement('div');avatar.className='m122-avatar m1211-relation-avatar';el.insertBefore(avatar,el.querySelector('.m122-node-title'))}avatar.replaceChildren();const img=document.createElement('img');img.src=src;img.alt=node?.name||'';avatar.append(img)});
};
function m1211QuickLinkMenu(){
  document.querySelector('.m1211-quick-link')?.remove();if(m1211QuickNodes.length!==2)return;const g=m122Graph(),b=activeBoard(),vp=document.getElementById('m122-viewport');if(!g||!b||!vp)return;
  const [a,c]=m1211QuickNodes.map(id=>g.nodes.find(n=>n.id===id));if(!a||!c)return;const pop=document.createElement('div');pop.className='m1211-quick-link';pop.onpointerdown=e=>e.stopPropagation();pop.innerHTML=`<strong>${esc(a.name||'?')} + ${esc(c.name||'?')}</strong><select>${m122RelationTypes(b.diagramMode).map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')}</select><button class="btn primary" type="button" data-create>${m1211T('Vincular','Link')}</button><button class="iconbtn" type="button" data-close>×</button>`;vp.append(pop);
  pop.querySelector('[data-close]').onclick=()=>{m1211QuickNodes=[];pop.remove();m122Draw()};
  pop.querySelector('[data-create]').onclick=()=>{const type=pop.querySelector('select').value,selector=document.getElementById('m122-new-edge-type'),old=selector?.value;if(selector)selector.value=type;m122MakeEdge(a.id,c.id);if(selector&&old)selector.value=old;m1211QuickNodes=[];pop.remove();m122Draw()};
}
function m1211BindQuickLinks(){
  if(state.view!=='boards'||activeBoard()?.boardType==='free')return;const nodes=document.getElementById('m122-nodes');if(!nodes)return;m1211QuickNodes=[];
  nodes.addEventListener('click',e=>{const node=e.target.closest('[data-m122-node]');if(!node||!(e.ctrlKey||e.metaKey))return;e.preventDefault();e.stopImmediatePropagation();const id=node.dataset.m122Node;if(m1211QuickNodes.includes(id))m1211QuickNodes=m1211QuickNodes.filter(x=>x!==id);else{if(m1211QuickNodes.length>=2)m1211QuickNodes.shift();m1211QuickNodes.push(id)}m122Draw();m1211QuickLinkMenu()},true);
}

/* En genealogía, los vínculos jerárquicos padre/madre → hijo se dibujan con un
   tronco compartido. La implementación heredada ocultaba sus nombres. 1.12.1
   conserva ese dibujo limpio, pero añade una etiqueta por rama de descendencia. */
const m1211PrevFamilyLines=typeof m163FamilyLines==='function'?m163FamilyLines:null;
if(m1211PrevFamilyLines){
  m163FamilyLines=function(g){
    const base=m1211PrevFamilyLines(g);
    const rows=[];
    for(const child of g.nodes||[]){
      const links=(g.edges||[]).filter(e=>m163ParentTypes.has(e.type)&&e.to===child.id&&m163Node(g,e.from));
      if(!links.length)continue;
      const labels=[...new Set(links.map(e=>String(e.label||m122Type('genealogy',e.type).title||'').trim()).filter(Boolean))];
      if(!labels.length)continue;
      const x=(Number(child.x)||0)+100;
      const y=Math.max(18,(Number(child.y)||0)-12);
      const col=safeColor(links[0].color,m122Type('genealogy',links[0].type).color);
      rows.push(`<text class="m122-edge-tag m163-edge-label m1211-family-label" x="${x}" y="${y}" text-anchor="middle" fill="${col}">${esc(labels.join(' · '))}</text>`);
    }
    return base+rows.join('');
  };
}

/* ---------- Línea temporal: color visible, arrastre real y Ctrl+Z ---------- */
const m1211PrevTimePoint=m131TimePoint;
m131TimePoint=function(event,index){
  let html=m1211PrevTimePoint(event,index),color=/^#[0-9a-fA-F]{6}$/.test(event.color||'')?event.color:m1211Palette[0];
  return html.replace('class="m131-time-point ',`style="--m1211-event:${color}" class="m131-time-point `);
};
const m1211PrevTimeEditor=m131TimeEditor;
m131TimeEditor=function(p,t,event){
  let html=m1211PrevTimeEditor(p,t,event);if(!event)return html;
  const color=/^#[0-9a-fA-F]{6}$/.test(event.color||'')?event.color:m1211Palette[0];
  return html.replace('<label class="m131-label">¿Qué sucede?',`<label class="m131-label m1211-color-label">${m1211T('Color del acontecimiento','Event color')}<input type="color" data-m1211-event-color value="${color}"></label><label class="m131-label">¿Qué sucede?`);
};
const m1211ChronUndo=new Map();
function m1211CloneEvents(t){return JSON.parse(JSON.stringify(t?.events||[]))}
function m1211PushChronUndo(t){if(!t)return;const key=t.id||'active',stack=m1211ChronUndo.get(key)||[];stack.push(m1211CloneEvents(t));if(stack.length>40)stack.shift();m1211ChronUndo.set(key,stack)}
function m1211UndoChronology(){
  const t=activeChronology();if(!t)return;const key=t.id||'active',stack=m1211ChronUndo.get(key)||[];const snapshot=stack.pop();if(!snapshot){showToast(m1211T('No hay cambios de cronología que deshacer','No timeline changes to undo'));return}
  const selected=m131TimelineSelectedId;t.events=snapshot;m1211ChronUndo.set(key,stack);m131TimelineSelectedId=t.events.some(e=>e.id===selected)?selected:t.events[0]?.id||null;m131RepaintTimeline();showToast(m1211T('Cambio deshecho','Change undone'));
}
function m1211InsertEvent(where){
  const t=activeChronology(),ev=m131CurrentEvent();if(!t)return;m1211PushChronUndo(t);
  const idx=ev?t.events.indexOf(ev):t.events.length-1,pos=where==='before'?Math.max(0,idx):Math.min(t.events.length,idx+1),id=uid();
  t.events.splice(pos,0,{id,title:'',date:'',description:'',chapterId:'',characterId:'',characterIds:[],color:m1211Palette[pos%m1211Palette.length],expanded:false});m131TimelineSelectedId=id;m131RepaintTimeline(false);
  document.querySelector('#m131-time-editor [data-m131-field="title"]')?.focus();
}
function m1211EnsureTimelineInsertControls(){
  if(state.view!=='chronologies')return;const scroll=document.getElementById('m131-time-scroll');if(!scroll||document.querySelector('[data-m1211-timeline-insert-row]'))return;
  const row=document.createElement('div');row.className='m1211-timeline-insert-row';row.dataset.m1211TimelineInsertRow='';
  row.innerHTML=`<span>${m1211T('Crear junto al acontecimiento seleccionado','Create next to selected event')}</span><button class="btn ghost" type="button" data-m1211-insert="before">${ic('plus')} ${m1211T('Antes','Before')}</button><button class="btn ghost" type="button" data-m1211-insert="after">${ic('plus')} ${m1211T('Después','After')}</button>`;
  scroll.after(row);row.querySelectorAll('[data-m1211-insert]').forEach(btn=>btn.onclick=()=>m1211InsertEvent(btn.dataset.m1211Insert));
}
function m1211BindTimeline(){
  if(state.view!=='chronologies')return;const t=activeChronology();if(!t)return;m1211EnsureTimelineInsertControls();
  const editor=document.getElementById('m131-time-editor'),ev=m131CurrentEvent(),color=editor?.querySelector('[data-m1211-event-color]');
  if(color){
    let undoPushed=false;const push=()=>{if(!undoPushed){m1211PushChronUndo(t);undoPushed=true}};
    color.onpointerdown=push;color.onfocus=push;color.oninput=e=>{if(!ev)return;push();ev.color=e.target.value;changed();const point=document.querySelector(`[data-m131-point="${CSS.escape(ev.id)}"]`);if(point)point.style.setProperty('--m1211-event',e.target.value)};
    color.onchange=()=>{undoPushed=false;m131RepaintTimeline()};
  }
  document.querySelectorAll('[data-m131-point]').forEach((point,index,points)=>{
    const card=point.querySelector('.m131-time-card');if(!card||card.dataset.m1211DragBound)return;card.dataset.m1211DragBound='1';
    card.addEventListener('click',e=>{if(Number(card.dataset.m1211SuppressClick||0)>Date.now()){e.preventDefault();e.stopImmediatePropagation()}},true);
    card.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('input,button:not(.m131-time-card),select,textarea'))return;
      const startX=e.clientX,from=index,centers=[...points].map(p=>{const r=p.getBoundingClientRect();return r.left+r.width/2});let target=from,dragging=false;
      const move=ev=>{const dx=ev.clientX-startX;if(!dragging&&Math.abs(dx)<7)return;if(!dragging){dragging=true;point.classList.add('m1211-dragging');card.setPointerCapture?.(e.pointerId)}ev.preventDefault();point.style.transform=`translateX(${dx}px)`;point.style.zIndex='25';let best=0,dist=Infinity;centers.forEach((x,i)=>{const d=Math.abs(ev.clientX-x);if(d<dist){dist=d;best=i}});target=best;points.forEach((p,i)=>p.classList.toggle('m1211-drop-target',i===target&&i!==from))};
      const done=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);points.forEach(p=>p.classList.remove('m1211-drop-target'));point.classList.remove('m1211-dragging');point.style.transform='';point.style.zIndex='';if(!dragging)return;card.dataset.m1211SuppressClick=String(Date.now()+350);if(target===from)return;m1211PushChronUndo(t);const [item]=t.events.splice(from,1);t.events.splice(target,0,item);m131TimelineSelectedId=item.id;m131RepaintTimeline()};
      window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',done,{once:true});
    });
  });
}
const m1211PrevTimeAction=m131TimeAction;
m131TimeAction=async function(action){const t=activeChronology();if(t&&['add','delete','left','right'].includes(action))m1211PushChronUndo(t);return await m1211PrevTimeAction(action)};
if(!window.__m1211ChronUndoBound){window.__m1211ChronUndoBound=true;document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||e.shiftKey||state.view!=='chronologies')return;if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;e.preventDefault();m1211UndoChronology()},true)}
const m1211PrevTimelineRepaint=m131RepaintTimeline;
m131RepaintTimeline=function(...args){const result=m1211PrevTimelineRepaint(...args);requestAnimationFrame(m1211BindTimeline);return result};

/* ---------- Sidebar: geometría estable al cambiar de herramienta ---------- */
function m1211StableSidebar(){const side=document.querySelector('.sidebar');if(!side)return;side.classList.add('m1211-stable-sidebar');document.querySelectorAll('.tree-entry').forEach(row=>row.style.minHeight='34px')}

/* ---------- Formularios: evitar autocompletado / sugerencias de contraseñas ---------- */
function m1211HardenInputs(){
  document.querySelectorAll('input').forEach(input=>{const type=(input.type||'text').toLowerCase();if(!['text','search','email','url','tel'].includes(type))return;input.autocomplete='off';input.setAttribute('aria-autocomplete','none');input.setAttribute('data-lpignore','true');input.setAttribute('data-1p-ignore','true');input.setAttribute('data-bwignore','true');if(!input.dataset.m1211ContextBound){input.dataset.m1211ContextBound='1';input.addEventListener('contextmenu',e=>e.preventDefault())}});
}

/* Roadmap adelantado: "Plegar actos" también deja las escenas cerradas al volver a desplegar. */
const m1211PrevBindOutline=m13BindOutline;
m13BindOutline=function(){
  m1211PrevBindOutline();const o=activeOutline();if(state.view!=='outlines'||!o)return;
  document.querySelectorAll('[data-m131-all="fold"]').forEach(btn=>{if(btn.dataset.m1211ScenesBound)return;btn.dataset.m1211ScenesBound='1';btn.addEventListener('click',()=>{for(const scene of o.scenes||[])scene.expanded=false;document.querySelectorAll('details[data-m13-scene-card]').forEach(d=>d.open=false);changed()})});
};

/* ---------- Encadenado de render/wire ---------- */
const m1211PrevRenderBoardElements=renderBoardElements;
renderBoardElements=function(){m1211PrevRenderBoardElements();m1211AddResizeHandles();m1211DirectText();m1211BindNoteTab();m1211HardenInputs();requestAnimationFrame(()=>drawStrokes())};
const m1211PrevRender=render;
render=function(){
  m1211PrevRender();
  const v=document.querySelector('.brand .m11-version');if(v)v.textContent='1.12.1 · Beta';
  // Los controles nuevos se montan una única vez, cuando todas las capas anteriores
  // ya han terminado de reconstruir y recolocar el DOM.
  m1211StableSidebar();
  m1211LockBoardTypeUi();
  m1211DecorateGallery();
  m1211CharacterTags();
  m1211EyeDropper();
  m1211StampOnboarding();
  m1211BoardHint();
  m1211BindBoardSelection();
  if(state.view==='boards'&&activeBoard()?.boardType!=='free')m122Draw();
  m1211BindQuickLinks();
  m1211BindTimeline();
  m1211HardenInputs();
};
const m1211PrevWire=wire;
wire=function(){
  // Evitar listeners duplicados: las capas antiguas cablean aquí sus controles y
  // 1.12.1 conecta los suyos al final de render().
  m1211PrevWire();
};

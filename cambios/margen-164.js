/* MARGEN Desktop 1.6.4 — árbol reversible, fichas y planificación ligera.
 * No se reescriben manuscritos ni se transforman vínculos sugeridos en filiaciones sin confirmar.
 */
const m164T=(es,en)=>m146T(es,en);
const m164Clone=o=>JSON.parse(JSON.stringify(o));

// 1. Historial de los dos tipos de diagrama: guarda estados tras CADA cambio.
const m164GraphHistory=new Map();
let m164SilentHistory=false;
function m164GraphKey(){const b=activeBoard(),p=activeProject();return p&&b&&b.diagramMode!=='free'?`${p.id}|${b.id}|${b.diagramMode}`:'';}
function m164EnsureHistory(){const key=m164GraphKey(),g=m122Graph();if(!key||!g)return null;
  let history=m164GraphHistory.get(key);
  if(!history){history={states:[JSON.stringify(g)],index:0};m164GraphHistory.set(key,history)}
  return history;
}
const m164PreviousRemember=m122Remember;
m122Remember=function(){
  if(!m164SilentHistory){
    const h=m164EnsureHistory(),g=m122Graph();
    if(h&&g){const next=JSON.stringify(g);if(next!==h.states[h.index]){
      h.states=h.states.slice(0,h.index+1);h.states.push(next);
      if(h.states.length>70)h.states.shift();h.index=h.states.length-1;
    }}
  }
  return m164PreviousRemember();
};
function m164RestoreGraph(direction){const h=m164EnsureHistory(),g=m122Graph();if(!h||!g)return false;
 const index=h.index+direction;if(index<0||index>=h.states.length)return false;
 const value=JSON.parse(h.states[index]);h.index=index;
 m164SilentHistory=true;
 try{for(const key of Object.keys(g))delete g[key];Object.assign(g,value);
   if(m122Selection?.kind==='node'&&!g.nodes.some(n=>n.id===m122Selection.id))m122Selection=null;
   if(m122Selection?.kind==='edge'&&!g.edges.some(e=>e.id===m122Selection.id))m122Selection=null;
   m122Draw();m122Inspector();changed();
 }finally{m164SilentHistory=false}
 return true;
}
if(!window.m164UndoBound){window.m164UndoBound=true;
 window.addEventListener('keydown',e=>{
   if(state.view!=='boards'||activeBoard()?.diagramMode==='free'||!e.ctrlKey||e.altKey||e.metaKey)return;
   if(e.target?.closest?.('input,textarea,select,[contenteditable],dialog,[role="dialog"]'))return;
   const undo=e.key.toLowerCase()==='z'&&!e.shiftKey;
   const redo=e.key.toLowerCase()==='y'||(e.key.toLowerCase()==='z'&&e.shiftKey);
   if(!undo&&!redo)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(!m164RestoreGraph(undo?-1:1))showToast(m164T('No hay más cambios en el historial.','No more changes in history.'));
 },true);
}

// 2. Propuestas de filiación al enlazar hermanos. Las dos personas NO adquieren
// automáticamente los mismos progenitores (podrían ser medios hermanos).
const m164EarlierPending=m163Pending;
m163Pending=function(g){
 const result=m164EarlierPending(g);if(!g)return result;
 const known=new Set(result.map(s=>s.key));
 for(const edge of g.edges.filter(e=>e.type==='sibling'||e.type==='half_sibling')){
   for(const [knownChild,unknownChild] of [[edge.from,edge.to],[edge.to,edge.from]]){
     for(const parent of m163DirectParents(g,knownChild)){
       if(!m163Node(g,parent)||!m163Node(g,unknownChild))continue;
       const key=`sib|${parent}|${unknownChild}`;
       if(known.has(key)||g.dismissedSuggestions?.includes(key))continue;
       if(g.edges.some(e=>m163ParentTypes.has(e.type)&&e.from===parent&&e.to===unknownChild))continue;
       if(m163WouldCycle(g,parent,unknownChild))continue;
       result.push({key,kind:'sibling',partner:parent,child:unknownChild,existingParent:knownChild});known.add(key);
     }
   }
 }
 return result;
};
const m164OlderDerived=m163Derived;
m163Derived=function(g,id){const data=m164OlderDerived(g,id);
 for(const e of g.edges){if(e.from!==id&&e.to!==id)continue;
   const other=e.from===id?e.to:e.from;
   if(e.type==='sibling'){data.siblings.add(other);data.halfSiblings.delete(other)}
   if(e.type==='half_sibling'&&!data.siblings.has(other))data.halfSiblings.add(other);
 }
 return data;
};
const m164OldKinship=m163SuggestionPanel;
m163SuggestionPanel=function(){
 m164OldKinship();const g=m122Graph();if(!g||activeBoard()?.diagramMode!=='genealogy')return;
 document.querySelectorAll('.m163-suggestion[data-m163-proposal]').forEach(row=>{
  const s=m163Pending(g).find(item=>item.key===row.dataset.m163Proposal);if(s?.kind!=='sibling')return;
  const a=m163Node(g,s.existingParent)?.name||'?',other=m163Node(g,s.child)?.name||'?',parent=m163Node(g,s.partner)?.name||'?';
  const p=row.querySelector('p');if(p)p.textContent=m164T(
    `${a} y ${other} son hermanos. ¿${parent} también es progenitor/a de ${other}?`,
    `${a} and ${other} are siblings. Is ${parent} also a parent of ${other}?`);
  const dropdown=row.querySelector('[data-m163-type]');
  if(dropdown){dropdown.querySelectorAll('option').forEach(o=>{if(o.value==='step_parent'||o.value==='guardian')o.remove()});dropdown.value='parent';}
 });
};

// No dibujar una línea de hermano duplicada si ya comparten una filiación confirmada.
const m164PreviousEdges=m122DrawEdges;
m122DrawEdges=function(){m164PreviousEdges();
 if(activeBoard()?.diagramMode!=='genealogy')return;
 const g=m122Graph(),svg=document.getElementById('m122-edges');if(!g||!svg)return;
 const noDraw=new Set(g.edges.filter(e=>['sibling','half_sibling'].includes(e.type)&&
  m163DirectParents(g,e.from).some(p=>m163DirectParents(g,e.to).includes(p))).map(e=>e.id));
 for(const id of noDraw){const hit=[...svg.querySelectorAll('[data-m122-edge]')].find(el=>el.dataset.m122Edge===id);
   if(hit){
     const line=hit.previousElementSibling,label=hit.nextElementSibling;
     // La rama jerárquica ya representa a estos hermanos: fuera línea y etiqueta redundantes.
     if(line?.classList.contains('m163-line'))line.remove();
     if(label?.classList.contains('m163-edge-label'))label.remove();
     hit.remove();
   }
 }
};

// 3. Inspector redimensionable por el borde izquierdo, con anchura recordada.
function m164InspectorResize(){
 const aside=document.querySelector('.m122-diagram-aside'),vp=document.getElementById('m122-viewport');if(!aside||!vp)return;
 let width=340;try{width=Number(localStorage.getItem('margen-diagram-inspector-width'))||340}catch(_){}
 width=Math.max(255,Math.min(660,width));aside.style.width=width+'px';
 if(aside.querySelector('.m164-resize-handle'))return;
 const handle=document.createElement('div');handle.className='m164-resize-handle';handle.tabIndex=0;
 handle.role='separator';handle.setAttribute('aria-label',m164T('Cambiar anchura del panel','Resize the side panel'));
 handle.setAttribute('aria-orientation','vertical');handle.title=m164T('Arrastra para ensanchar el panel','Drag to make the panel wider');
 aside.prepend(handle);
 const update=value=>{const max=Math.max(275,Math.min(660,aside.parentElement.clientWidth-285));
   const w=Math.max(255,Math.min(max,Math.round(value)));aside.style.width=w+'px';
   handle.setAttribute('aria-valuenow',String(w));try{localStorage.setItem('margen-diagram-inspector-width',String(w))}catch(_){}
 };
 handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();
   const startX=e.clientX,start=aside.getBoundingClientRect().width;
   handle.setPointerCapture(e.pointerId);
   const move=ev=>update(start+startX-ev.clientX);
   const finish=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish)};
   handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish,{once:true});handle.addEventListener('pointercancel',finish,{once:true});
 };
 handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();update(aside.getBoundingClientRect().width+(e.key==='ArrowLeft'?24:-24))}};
 update(width);
}
const m164PreviousBindGraph=m122BindGraph;
m122BindGraph=function(){
 m164PreviousBindGraph();const history=m164EnsureHistory(),g=m122Graph();
 // Tras importar/restaurar JSON, no debe quedar un historial de otro estado.
 if(history&&g&&history.states[history.index]!==JSON.stringify(g)){
   history.states=[JSON.stringify(g)];history.index=0;
 }
 m164InspectorResize();
};

// 4. El texto negro importado de DOCX usa el color del tema, pero las negritas,
// cursivas, estructura y colores distintos (azules, rojos, etc.) siguen intactos.
// Se aplica mediante CSS: NO modifica el HTML original de los capítulos.

// 5. Personajes: relaciones automáticas resumidas junto a Trasfondo.
function m164CharacterLinks(p,characterId){const rows=[];
 for(const b of p.boards||[])for(const mode of ['genealogy','relations']){
   const g=b.graphs?.[mode];if(!g)continue;
   const ids=new Set(g.nodes.filter(n=>n.characterId===characterId).map(n=>n.id));
   for(const e of g.edges||[]){if(!ids.has(e.from)&&!ids.has(e.to))continue;
     const other=g.nodes.find(n=>n.id===(ids.has(e.from)?e.to:e.from));if(!other)continue;
     const person=p.characters.find(x=>x.id===other.characterId);
     rows.push({boardId:b.id,mode,edgeId:e.id,other:person?.title||other.name||'?',kind:e.label||m122Type(mode,e.type)?.title||e.type});
   }
 }
 return rows;
}
function m164CharacterPanels(){
 const p=activeProject(),ch=activeCharacter(),grid=document.querySelector('.char-page .char-grid');
 if(!p||!ch||!grid||state.view!=='characters')return;
 const background=[...grid.querySelectorAll(':scope > .char-panel')].find(el=>el.querySelector('[data-char-field="background"]'));
 // Detectamos la seccion por el elemento estructural y no por su traduccion.
 const evol=[...grid.querySelectorAll(':scope > .char-panel')].find(el=>
    el.querySelector('.arc-list,.arc-timeline,[data-action="arc-add"],[data-action="add-arc"]') ||
    /evoluci[oó]n|evolution/i.test(el.querySelector('h3')?.textContent||'')
 );
 if(background){
   background.classList.add('m164-half');
   const rows=m164CharacterLinks(p,ch.id);
   const card=document.createElement('section');card.className='char-panel m164-half m164-links-card';
   card.innerHTML=`<h3>${ic('link')} ${m164T('Vínculos','Connections')}</h3><p class="char-helper">${m164T('Se actualizan desde Genealogía y Relaciones.','Automatically updated from Family Tree and Relationships.')}</p>`+
   (rows.length?`<div class="m164-link-list">${rows.map(r=>`<button class="m164-link-button" type="button" data-m164-link-board="${esc(r.boardId)}" data-m164-link-mode="${esc(r.mode)}" data-m164-link-edge="${esc(r.edgeId)}"><strong>${esc(r.other)}</strong><small>${esc(r.kind)} · ${r.mode==='genealogy'?m164T('Genealogía','Family tree'):m164T('Relaciones','Relationships')}</small></button>`).join('')}</div>`:`<p class="m164-empty">${m164T('Sin vínculos registrados todavía.','No recorded connections yet.')}</p>`);
   // Trasfondo y Vínculos forman una pareja equilibrada a cualquier anchura.
   const pair=document.createElement('div');pair.className='m164-character-pair';
   background.before(pair);pair.append(background,card);
   card.querySelectorAll('[data-m164-link-edge]').forEach(btn=>btn.onclick=()=>{
     state.activeBoardId=btn.dataset.m164LinkBoard;const board=activeBoard();if(!board)return;
     board.diagramMode=btn.dataset.m164LinkMode;state.view='boards';changed();render();
     m122Selection={kind:'edge',id:btn.dataset.m164LinkEdge};m122Draw();m122Inspector();
   });
 }
 if(evol){
   const inner=[...evol.childNodes];evol.replaceChildren();
   const details=document.createElement('details');details.className='m164-evolution';details.open=ch.m164EvolutionOpen===true;
   const summary=document.createElement('summary');const heading=inner.find(n=>n.nodeType===1&&n.tagName==='H3');
   summary.innerHTML=`${ic('chevron')} ${m164T('Evolución por capítulos','Chapter-by-chapter evolution')} <small>${(ch.arc||[]).length}</small>`;
   const content=document.createElement('div');content.className='m164-evolution-body';
   inner.filter(n=>n!==heading).forEach(n=>content.append(n));details.append(summary,content);evol.append(details);
   details.addEventListener('toggle',()=>{if(ch.m164EvolutionOpen!==details.open){ch.m164EvolutionOpen=details.open;changed()}});
 }
}

// 6. Escaletas: personajes y localizaciones puntuales SIN crear fichas, y tres
// campos editoriales plegables, todos conservados en la escena.
const m164OldFields=m13Fields;
function m164TempField(scene,key,label){const values=Array.isArray(scene[key])?scene[key]:[];
 return `<div class="m164-temp" data-m164-temp-group="${key}" data-m164-scene="${esc(scene.id)}"><div class="m164-temp-tags">${values.map((name,i)=>`<span class="m164-temp-tag">${esc(name)}<button type="button" data-m164-remove-temp="${key}" data-m164-index="${i}" data-m164-scene="${esc(scene.id)}" aria-label="${m164T('Quitar','Remove')} ${esc(name)}">×</button></span>`).join('')}</div><div class="m164-temp-add"><input type="text" maxlength="100" data-m164-temp-input="${key}" data-m164-scene="${esc(scene.id)}" placeholder="${esc(label)}"><button class="btn" type="button" data-m164-add-temp="${key}" data-m164-scene="${esc(scene.id)}" title="${m164T('Añadir sin ficha','Add without a sheet')}">${ic('plus')}</button></div></div>`;
}
m13Fields=function(p,o,s){let html=m164OldFields(p,o,s);
 const character=m13Multi(p,s,'characterIds','character'),setting=m13Multi(p,s,'settingIds','setting');
 html=html.replace(character,character+m164TempField(s,'temporaryCharacters',m164T('Personaje puntual…','One-off character…')));
 html=html.replace(setting,setting+m164TempField(s,'temporarySettings',m164T('Lugar puntual (aeropuerto…)','One-off location (airport…)')));
 const start=html.indexOf('<label class="m13-field">Objetivo de la escena');
 // El último campo termina justo antes de los accesos rápidos.
 if(start>=0){
   // El recorte seguro termina en el </label> que cierra «Consecuencia / cambio».
   const consequence=html.indexOf('<label class="m13-field">Consecuencia / cambio',start);
   const closing=consequence>=0?html.indexOf('</label>',consequence)+8:-1;
   if(closing>start){const section=html.slice(start,closing);
     html=html.slice(0,start)+`<details class="m164-scene-planning" data-m164-planning="${esc(s.id)}" ${s.m164PlanningOpen?'open':''}><summary>${ic('chevron')} ${m164T('Objetivo · Conflicto · Consecuencia (opcional)','Goal · Conflict · Consequence (optional)')}</summary><div class="m164-scene-planning-fields">${section}</div></details>`+html.slice(closing);
   }
 }
 return html;
};
function m164OutlineExtras(){const o=activeOutline();if(state.view!=='outlines'||!o)return;
 const lookup=id=>o.scenes.find(s=>s.id===id);
 document.querySelectorAll('[data-m164-add-temp]').forEach(b=>{
  const add=()=>{const id=b.dataset.m164Scene,key=b.dataset.m164AddTemp,s=lookup(id);
   const input=b.parentElement?.querySelector('[data-m164-temp-input]'),name=input?.value.trim().replace(/\s+/g,' ');
   if(!s||!name)return;if(!Array.isArray(s[key]))s[key]=[];
   if(s[key].some(x=>x.toLowerCase()===name.toLowerCase())){showToast(m164T('Ya está añadido.','Already added.'));return}
   s[key].push(name);changed();render();};
  b.onclick=add;
  const field=b.parentElement?.querySelector('[data-m164-temp-input]');if(field)field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add()}};
 });
 document.querySelectorAll('[data-m164-remove-temp]').forEach(b=>b.onclick=()=>{
   const s=lookup(b.dataset.m164Scene),key=b.dataset.m164RemoveTemp,index=Number(b.dataset.m164Index);
   if(!s||!Array.isArray(s[key]))return;s[key].splice(index,1);changed();render();
 });
 document.querySelectorAll('[data-m164-planning]').forEach(details=>details.addEventListener('toggle',()=>{
   const s=lookup(details.dataset.m164Planning);if(s&&s.m164PlanningOpen!==details.open){s.m164PlanningOpen=details.open;changed()}
 }));
}

// 7. Cronología: permitir varios personajes por acontecimiento. El campo antiguo
// characterId permanece como primer elemento para seguir leyendo JSON antiguos.
const m164OriginalCard=chronologyHtmlCard;
chronologyHtmlCard=function(p,event,i,total){
 let html=m164OriginalCard(p,event,i,total);
 const selected=new Set([event.characterId,...(event.characterIds||[])].filter(Boolean));
 const boxes=`<div class="m164-chrono-people"><span class="m164-chrono-label">${m164T('Personajes relacionados','Related characters')}</span><div class="m164-chrono-chip-list">${p.characters.map(ch=>`<label><input type="checkbox" data-m164-timeline-person="${esc(event.id)}" value="${esc(ch.id)}" ${selected.has(ch.id)?'checked':''}>${esc(ch.title)}</label>`).join('')||`<span class="m164-empty">${m164T('Todavía no hay personajes en este libro.','No characters in this book yet.')}</span>`}</div></div>`;
 const rx=/<label>Personaje relacionado<select data-timeline-field="characterId"[\s\S]*?<\/select><\/label>/;
 if(rx.test(html))html=html.replace(rx,boxes);
 else html=html.replace('</div></div>',boxes+'</div></div>');
 return html;
};
function m164BindChronology(){if(state.view!=='chronologies')return;const t=activeChronology();if(!t)return;
 for(const id of new Set((t.events||[]).map(e=>e.id))){
  document.querySelectorAll(`[data-m164-timeline-person="${CSS.escape(id)}"]`).forEach(input=>input.onchange=()=>{
   const event=t.events.find(e=>e.id===id);if(!event)return;
   const values=[...document.querySelectorAll(`[data-m164-timeline-person="${CSS.escape(id)}"]:checked`)].map(el=>el.value);
   event.characterIds=values;event.characterId=values[0]||'';changed();
  });
 }
 const top=document.querySelector('.chron-panel .chronology-head'),info=document.querySelector('.chron-panel > p.char-helper');
 if(top&&info){top.querySelector('div')?.append(info);info.classList.add('m164-chrono-description')}
}
// En MARGEN Desktop la cronología usa una línea temporal visual, no las antiguas
// tarjetas verticales. Ampliamos su inspector REAL (m131), también al cambiar evento.
const m164OldTimeEditor=m131TimeEditor;
m131TimeEditor=function(p,t,event){
 let html=m164OldTimeEditor(p,t,event);if(!event)return html;
 const selected=new Set([event.characterId,...(event.characterIds||[])].filter(Boolean));
 const people=`<div class="m164-chrono-people"><span class="m164-chrono-label">${m164T('Personajes relacionados','Related characters')}</span><div class="m164-chrono-chip-list">${p.characters.map(ch=>`<label><input type="checkbox" data-m164-time-person="${esc(event.id)}" value="${esc(ch.id)}" ${selected.has(ch.id)?'checked':''}>${esc(ch.title)}</label>`).join('')||`<span class="m164-empty">${m164T('Todavía no hay personajes en el libro.','No characters in this book yet.')}</span>`}</div></div>`;
 return html.replace(/<label class="m131-label">Personaje relacionado<select data-m131-field="characterId"[\s\S]*?<\/select><\/label>/,people);
};
const m164OldBindTimeEditor=m131BindTimeEditor;
m131BindTimeEditor=function(){m164OldBindTimeEditor();
 const event=m131CurrentEvent(),area=document.getElementById('m131-time-editor');if(!event||!area)return;
 area.querySelectorAll('[data-m164-time-person]').forEach(input=>input.onchange=()=>{
   const ids=[...area.querySelectorAll('[data-m164-time-person]:checked')].map(el=>el.value);
   event.characterIds=ids;event.characterId=ids[0]||'';changed();
   const nav=area.querySelector('[data-m131-nav="character"]');if(nav)nav.disabled=!ids.length;
 });
};
const m164EarlierTimeline=m164BindChronology;
m164BindChronology=function(){m164EarlierTimeline();
 if(state.view!=='chronologies')return;
 const heading=document.querySelector('.m131-time-heading');
 const hint=heading?.querySelector(':scope>.hint');
 if(hint){heading.querySelector(':scope>div:first-child')?.append(hint);hint.classList.add('m164-chrono-description')}
};

const m164OldRefIndex=m146RefIndex;
m146RefIndex=function(p){const rows=m164OldRefIndex(p);
 for(const t of p?.chronologies||[])for(const e of t.events||[]){for(const id of e.characterIds||[]){
   if(!id||id===e.characterId)continue;
   rows.push({targetKind:'character',targetId:id,sourceKind:'event',sourceId:e.id,sourceName:e.title||m164T('Acontecimiento','Event'),description:'eventCharacter',chronologyId:t.id,chronologyTitle:t.title});
 }}return rows;};

const m164OlderCleanMissing=m146CleanMissing;
m146CleanMissing=function(p){
 let cleaned=m164OlderCleanMissing(p);
 for(const t of p?.chronologies||[])for(const event of t.events||[]){
   if(!Array.isArray(event.characterIds))continue;
   const valid=event.characterIds.filter(id=>!id||m146Exists(p,'character',id)||m146Archived(p,'character',id));
   cleaned+=event.characterIds.length-valid.length;
   event.characterIds=valid;
   if(!event.characterId&&valid.length)event.characterId=valid[0];
 }
 return cleaned;
};

// La vista de fichas de personajes también encuentra sucesos con varias personas.
const m164PrevCharacterPanel=m12AppendCharacterPanels;
m12AppendCharacterPanels=function(){m164PrevCharacterPanel();const person=activeCharacter(),p=activeProject();
 if(!person||!p||state.view!=='characters')return;
 const extra=(p.chronologies||[]).flatMap(t=>(t.events||[]).filter(e=>e.characterId!==person.id&&(e.characterIds||[]).includes(person.id)).map(e=>({t,e})));
 if(!extra.length)return;
 const grid=document.querySelector('.char-page .char-grid');if(!grid)return;
 const panel=document.createElement('section');panel.className='char-panel wide';
 panel.innerHTML=`<h3>${ic('clock')} ${m164T('Más acontecimientos relacionados','More related events')}</h3><div class="m164-link-list">${extra.map(({t,e})=>`<button class="m164-link-button" data-m164-open-chrono="${esc(t.id)}"><strong>${esc(e.title||m164T('Acontecimiento','Event'))}</strong><small>${esc(t.title)}</small></button>`).join('')}</div>`;
 grid.append(panel);
 panel.querySelectorAll('[data-m164-open-chrono]').forEach(b=>b.onclick=()=>{state.activeChronologyId=b.dataset.m164OpenChrono;state.view='chronologies';changed();render()});
};

// La capa render se aplica después de la traducción y el cableado antiguos.
const m164PreviousRender=render;
render=function(){
 m164PreviousRender();m164CharacterPanels();m164OutlineExtras();m164BindChronology();
 const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.6.4 · Desktop';
};

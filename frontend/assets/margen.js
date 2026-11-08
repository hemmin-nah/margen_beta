'use strict';
const el=id=>document.getElementById(id), ic=(name)=>`<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`, esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=> (globalThis.crypto && crypto.randomUUID)? crypto.randomUUID() : 'id'+Date.now()+Math.random().toString(36).slice(2);
const now=()=>new Date().toISOString();
const demoChapter=`<p>La radio llevaba tres días emitiendo la misma canción. Elías la escuchaba todas las mañanas mientras el pueblo, al otro lado del cristal, fingía que nada había cambiado.</p><p>Era una melodía antigua. Había sobrevivido a cosas que nadie recordaba.</p><p>Abrió su cuaderno y escribió una sola línea:</p><blockquote>Algunas historias empiezan cuando el mundo ya ha terminado.</blockquote><p>Desde aquí, la historia es tuya.</p>`;
const initial=()=>{const pid=uid(),cid=uid(),bid=uid(),nid=uid();return {version:1,theme:'light',activeProjectId:pid,activeChapterId:cid,activeBoardId:bid,activeNoteId:nid,view:'library',projects:[{id:pid,m1452Starter:'es',name:'Los días que quedaron',description:'Proyecto de ejemplo · cámbialo o crea uno nuevo',createdAt:now(),chapters:[{id:cid,title:'Capítulo 1 · La frecuencia',html:demoChapter,updatedAt:now()}],boards:[{id:bid,title:'Mapa de ideas',background:'dots',zoom:1,panX:-750,panY:-560,elements:[{id:uid(),type:'text',x:925,y:740,w:520,h:95,text:'Un lugar donde empiezan las historias'},{id:uid(),type:'note',x:920,y:885,w:270,h:195,color:'cream',text:'IDEA CENTRAL\n¿Y si el fin del mundo hubiera ocurrido hace décadas?'},{id:uid(),type:'note',x:1240,y:835,w:290,h:216,color:'mint',text:'PERSONAJES\nElías · Las voces de la radio · La gente del pueblo'},{id:uid(),type:'note',x:1570,y:930,w:290,h:193,color:'rose',text:'ATMÓSFERA\nCarreteras vacías, música antigua, lugares olvidados...'}],strokes:[]}],notes:[{id:nid,title:'Personajes y lugares',content:'Aquí puedes guardar fichas, ideas de personajes, localizaciones y la documentación del proyecto.'}]}]}};
let state,db=null,saveTimer=null,dirty=false,selectedElement=null,boardTool='select',penColor='#6c7769',penSize=4,drag=null,strokeDraft=null,activeBoardCleanup=null,toastTimer=null;
function activeProject(){return state.projects.find(p=>p.id===state.activeProjectId)||state.projects[0]||null}
function activeChapter(){const p=activeProject();return p?.chapters.find(c=>c.id===state.activeChapterId)||p?.chapters[0]||null}
function activeBoard(){const p=activeProject();return p?.boards.find(b=>b.id===state.activeBoardId)||p?.boards[0]||null}
function activeCharacter(){const p=activeProject();return p?.characters.find(x=>x.id===state.activeCharacterId)||p?.characters[0]||null}
function activeSetting(){const p=activeProject();return p?.settings.find(x=>x.id===state.activeSettingId)||p?.settings[0]||null}
function activeOutline(){const p=activeProject();return p?.outlines.find(x=>x.id===state.activeOutlineId)||p?.outlines[0]||null}
function activeNote(){const p=activeProject();return p?.notes.find(n=>n.id===state.activeNoteId)||p?.notes[0]||null}
function plain(html){const x=document.createElement('div');x.innerHTML=String(html||'').replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi,'</$1> ');return x.textContent||''}
function wordCount(s){return (String(s||'').trim().match(/\S+/g)||[]).length}
function projectWords(p){return p.chapters.reduce((n,c)=>n+wordCount(plain(c.html)),0)}
function showToast(s){const t=el('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open('margen-1452-pruebas',1);req.onupgradeneeded=()=>req.result.createObjectStore('data');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function readDb(){return new Promise((res,rej)=>{const tx=db.transaction('data','readonly');const req=tx.objectStore('data').get('workspace');req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function writeDb(data){return new Promise((res,rej)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(data,'workspace');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function save(){clearTimeout(saveTimer);if(!dirty)return;dirty=false;const status=el('save-status');if(status)status.textContent='Guardando...';try{if(db)await writeDb(state);else localStorage.setItem('margen-1452-pruebas-backup',JSON.stringify(state));if(status)status.textContent='✓ Guardado';}catch(e){dirty=true;if(status)status.textContent='Error al guardar';showToast('No se pudo guardar. Exporta una copia de seguridad.');console.error(e)}}
function changed(){dirty=true;const status=el('save-status');if(status)status.textContent='Sin guardar';clearTimeout(saveTimer);saveTimer=setTimeout(save,500)}
function changeView(view){if(!['library','book','manuscript','boards','characters','settings','outlines','chronologies','notes'].includes(view))return;state.view=view;selectedElement=null;boardTool='select';changed();render()}

function ensureSelections(){
 if(!state.projects?.length){state.activeProjectId=null;return}
 if(!state.projects.some(p=>p.id===state.activeProjectId))state.activeProjectId=state.projects[0].id;
 for(const p of state.projects){
  p.chapters=Array.isArray(p.chapters)?p.chapters:[];
  p.boards=Array.isArray(p.boards)?p.boards:[];
  p.notes=Array.isArray(p.notes)?p.notes:[];
  p.characters=Array.isArray(p.characters)?p.characters:[];
  p.settings=Array.isArray(p.settings)?p.settings:[];
  p.outlines=Array.isArray(p.outlines)?p.outlines:[];
  p.iconColor=p.iconColor||'#738675';
  for(const b of p.boards){
   b.elements=b.elements||[];b.strokes=b.strokes||[];
   for(const x of b.elements)if(x.type==='note'){
    if(!x.title){const lines=String(x.text||'').split('\n');if(lines.length>1&&lines[0].length<=48&&lines[0]===lines[0].toUpperCase()){x.title=lines.shift();x.text=lines.join('\n')}else x.title='Nueva nota'}
    if(!/^#[0-9a-f]{6}$/i.test(x.color||''))x.color=({cream:'#f8ebbf',mint:'#dcebcf',rose:'#f3dcd9',blue:'#dce7eb'})[x.color]||'#f8ebbf';
   }
  }
 }
 const p=activeProject();
 for(const [a,key,arr] of [['activeChapterId','id',p.chapters],['activeBoardId','id',p.boards],['activeNoteId','id',p.notes],['activeCharacterId','id',p.characters],['activeSettingId','id',p.settings],['activeOutlineId','id',p.outlines]]){
   if(!arr.some(x=>x[key]===state[a]))state[a]=arr[0]?.id||null;
 }
}

function render(){
 ensureSelections();document.documentElement.dataset.theme=state.theme;
 const p=activeProject();if(activeBoardCleanup){activeBoardCleanup();activeBoardCleanup=null}
 el('app').innerHTML=`<header class="header"><div class="brand" data-action="library" title="Volver a la biblioteca"><span class="brand-mark">${ic('feather')}</span><span>MARGEN</span></div>
 <nav class="topnav"><button class="toplink ${state.view==='library'?'active':''}" data-action="library">${ic('grid')}<span>Biblioteca</span></button>${state.view!=='library'&&p?`<span class="breadcrumb-arrow">›</span><button class="toplink active" data-action="book-home">${ic('book')}<span>${esc(p.name)}</span></button>`:''}</nav>
 <div class="header-right"><span class="status" id="save-status">${dirty?'Sin guardar':'✓ Guardado local'}</span><button class="iconbtn" title="Exportar copia de seguridad" data-action="backup">${ic('download')}</button><button class="iconbtn" title="Restaurar copia de seguridad" data-action="restore">${ic('upload')}</button><button class="iconbtn" title="Modo ${state.theme==='light'?'noche':'día'}" data-action="theme">${ic(state.theme==='light'?'moon':'sun')}</button></div></header>
 <div class="content"><aside class="sidebar">${sidebarHtml(p)}</aside><main class="workspace" id="workspace">${state.view==='library'?libraryHtml():state.view==='book'?bookHtml(p):state.view==='manuscript'?manuscriptHtml(p):state.view==='boards'?boardHtml(p):state.view==='characters'||state.view==='settings'?sheetHtml(p,state.view):state.view==='outlines'?outlinesHtml(p):state.view==='chronologies'?chronologiesHtml(p):notesHtml(p)}</main></div>`;
 wire();if(state.view==='boards'&&activeBoard())setupBoard();
}

function sidebarHtml(p){
 if(state.view==='library')return `<div class="project-current"><div class="project-mini-icon">${ic('grid')}</div><div class="project-current-text"><div class="project-current-name">Biblioteca</div><div class="project-current-sub">Tus libros y novelas</div></div></div><div class="sidebar-scroll"><div class="sidebar-head"><span class="eyebrow">Libros</span><button class="mini-add" data-action="add-project" title="Nuevo libro">${ic('plus')}</button></div>${state.projects.map(x=>`<button class="sidebaritem ${x.id===state.activeProjectId?'active':''}" data-action="open-project" data-id="${esc(x.id)}"><span class="tree-icon" style="color:${safeColor(x.iconColor,'#738675')}">${ic('book')}</span><span class="truncate">${esc(x.name)}</span></button>`).join('')}</div><div class="sidebar-bottom">${state.projects.length} libros en tu biblioteca</div>`;
 const categories=[
  ['manuscript','chapters','Capítulos','edit','chapter'],
  ['boards','boards','Pizarras','board','board'],
  ['characters','characters','Personajes','users','character'],
  ['settings','settings','Escenarios','map','setting'],
  ['outlines','outlines','Escaletas','list','outline']
 ];
 if(p.notes.length)categories.push(['notes','notes','Notas antiguas','note','note']);
 const sections=categories.map(([view,array,label,icon,type])=>{
  const expanded=true;const elements=p[array]||[];
  const selectedId={manuscript:state.activeChapterId,boards:state.activeBoardId,characters:state.activeCharacterId,settings:state.activeSettingId,outlines:state.activeOutlineId,chronologies:state.activeChronologyId,notes:state.activeNoteId}[view];
  return `<section class="tree-section"><div class="tree-heading"><button class="tree-category" data-action="show-category" data-view="${view}" title="Abrir ${label.toLowerCase()}"><span class="tree-icon muted-icon">${ic(icon)}</span><span>${label}</span><span class="tree-count">${elements.length}</span></button><button class="mini-add" data-action="add-${type}" title="Crear ${label.toLowerCase()}">${ic('plus')}</button></div>
  <div class="tree-children">${elements.map(x=>`<div class="tree-entry"><button class="sidebaritem tree-leaf ${state.view===view&&selectedId===x.id?'active':''}" data-action="open-entry" data-type="${view}" data-id="${esc(x.id)}" title="${esc(x.title)}"><span class="tree-icon" style="color:${safeColor(x.iconColor,defaultIconColor(view))}">${ic(icon)}</span><span class="truncate">${esc(x.title)}</span></button><label class="entry-color-label" title="Cambiar color de icono"><span class="tiny-palette">●</span><input aria-label="Color de icono de ${esc(x.title)}" type="color" data-entry-color="${view}" data-id="${esc(x.id)}" value="${safeColor(x.iconColor,defaultIconColor(view))}"></label></div>`).join('')}<button class="tree-add-text" data-action="add-${type}">${ic('plus')} Añadir ${type==='character'?'personaje':type==='setting'?'escenario':type==='outline'?'escaleta':type==='chapter'?'capítulo':type==='board'?'pizarra':'nota'}</button></div></section>`;
 }).join('');
 return `<div class="project-current"><div class="project-mini-icon" style="color:${safeColor(p.iconColor,'#738675')};background:color-mix(in srgb,${safeColor(p.iconColor,'#738675')} 16%,var(--surface))">${ic('book')}</div><div class="project-current-text"><div class="project-current-name" title="${esc(p.name)}">${esc(p.name)}</div><div class="project-current-sub">Tu libro · ${projectWords(p)} palabras</div></div><label class="book-color-label" title="Cambiar color del libro"><input type="color" id="book-icon-color" aria-label="Cambiar color de icono del libro" value="${safeColor(p.iconColor,'#738675')}"></label><button class="iconbtn" data-action="edit-project" title="Editar libro">${ic('rename')}</button></div>
 <div class="sidebar-scroll"><button class="sidebaritem ${state.view==='book'?'active':''}" data-action="book-home">${ic('grid')}<span class="truncate">Vista general</span></button>${sections}</div><div class="sidebar-bottom"><button class="btn ghost" data-action="library">${ic('back')} Volver a Biblioteca</button><button class="btn ghost" data-action="delete-project" style="color:var(--danger)">Eliminar libro</button></div>`;
}


function safeColor(value,fallback='#738675'){return /^#[a-f0-9]{6}$/i.test(value||'')?value:fallback}
function defaultIconColor(type){return ({manuscript:'#738675',boards:'#ba806e',characters:'#9575a8',settings:'#6a91ad',outlines:'#bd9460',notes:'#89928e'})[type]||'#738675'}
function bookHtml(p){return `<div class="workspace-head"><div><div class="eyebrow">Tu biblioteca / Libro</div><h1>${esc(p.name)}</h1></div><button class="btn" data-action="edit-project">${ic('rename')} Editar libro</button></div><div class="main-scroll"><p class="section-intro">${esc(p.description||'Tu lugar para escribir, imaginar y organizar cada rincón de la historia.')}</p><div class="book-dashboard">${[
 ['manuscript','Capítulos','edit',p.chapters.length,'add-chapter','Escribe tu historia en escenas o capítulos'],
 ['boards','Pizarras','board',p.boards.length,'add-board','Brainstorming, mapas y moodboards'],
 ['characters','Personajes','users',p.characters.length,'add-character','Construye tus personajes'],
 ['settings','Escenarios','map',p.settings.length,'add-setting','Lugares, escenarios y atmósferas'],
 ['outlines','Escaletas','list',p.outlines.length,'add-outline','Estructura las escenas y el argumento']
 ].map(([view,label,icon,count,add,help])=>`<div class="book-module"><div class="module-symbol">${ic(icon)}</div><h3>${label}</h3><div class="module-number">${count}</div><p>${help}</p><button class="btn" data-action="show-category" data-view="${view}">Abrir</button><button class="mini-add" data-action="${add}" title="Crear">${ic('plus')}</button></div>`).join('')}</div><p class="welcome-small">Selecciona cualquier elemento de la barra izquierda. Puedes crear tantos de cada tipo como necesites.</p></div>`}
function sheetHtml(p,type){const isChar=type==='characters';const n=isChar?activeCharacter():activeSetting(),label=isChar?'personaje':'escenario';return `<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · ${isChar?'Personajes':'Escenarios'}</div><h1>${n?esc(n.title):'Fichas de '+(isChar?'personajes':'escenarios')}</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-${isChar?'character':'setting'}" ${!n?'disabled':''} title="Eliminar ficha">${ic('trash')}</button><button class="btn primary" data-action="add-${isChar?'character':'setting'}">${ic('plus')} Nueva ficha</button></div></div>${n?`<div class="main-scroll"><div class="universe-paper fiche"><div class="fiche-label">${isChar?'FICHA DE PERSONAJE':'FICHA DE ESCENARIO'}</div><input class="note-title" id="fiche-title" placeholder="Nombre" value="${esc(n.title)}"><label class="field-mini">${isChar?'Papel en la historia':'Tipo de lugar / localización'}<input id="fiche-subtitle" placeholder="${isChar?'Protagonista, secundario…':'Ciudad, casa, paraje…'}" value="${esc(n.subtitle||'')}"></label><div class="field-mini">${isChar?'Descripción, personalidad, objetivos, relaciones...':'Descripción, atmósfera, historia, detalles importantes...'}</div><div id="fiche-body" class="note-body" contenteditable="true" spellcheck="true" data-placeholder="Escribe aquí todo lo que necesites...">${esc(n.content||'')}</div></div></div>`:`<div class="empty-state">${ic(isChar?'users':'map')}<h2>Tu primera ficha</h2><p>Crea tantos ${isChar?'personajes':'escenarios'} como necesites en este libro.</p><button class="btn primary" data-action="add-${isChar?'character':'setting'}">${ic('plus')} Nueva ficha</button></div>`}`}
function outlinesHtml(p){const o=activeOutline();return `<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Escaletas</div><h1>${esc(o?.title||'Escaletas')}</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-outline" ${!o?'disabled':''} title="Eliminar escaleta">${ic('trash')}</button><button class="btn primary" data-action="add-outline">${ic('plus')} Nueva escaleta</button></div></div>${o?`<div class="main-scroll"><div class="outline-wrap"><div class="outline-intro"><div><label class="eyebrow" for="outline-title">NOMBRE DE LA ESCALETA</label><input id="outline-title" class="note-title" value="${esc(o.title)}"></div><div class="outline-progress">${o.scenes.filter(s=>s.status==='done').length} de ${o.scenes.length} escenas terminadas</div></div><p class="section-intro">Organiza la trama por escenas. Escribe qué ocurre, cambia su estado y utiliza las flechas para reordenarlas.</p><div class="outline-list">${o.scenes.map((s,i)=>`<div class="outline-scene" data-scene="${esc(s.id)}"><div class="scene-index">${String(i+1).padStart(2,'0')}</div><div class="scene-main"><input class="scene-title" aria-label="Título de la escena ${i+1}" data-scene-field="title" data-scene-id="${esc(s.id)}" value="${esc(s.title||'')}" placeholder="Título de la escena"><textarea rows="3" data-scene-field="description" data-scene-id="${esc(s.id)}" placeholder="¿Qué sucede en esta escena?">${esc(s.description||'')}</textarea><div class="scene-foot"><label>Estado <select data-scene-field="status" data-scene-id="${esc(s.id)}"><option value="idea" ${s.status==='idea'?'selected':''}>Idea</option><option value="planned" ${s.status==='planned'?'selected':''}>Planificada</option><option value="writing" ${s.status==='writing'?'selected':''}>En escritura</option><option value="done" ${s.status==='done'?'selected':''}>Terminada</option></select></label><label>Punto de vista <input data-scene-field="pov" data-scene-id="${esc(s.id)}" value="${esc(s.pov||'')}" placeholder="Personaje..."></label></div></div><div class="scene-actions"><button class="iconbtn" data-action="scene-up" data-id="${esc(s.id)}" ${i===0?'disabled':''} title="Subir escena">${ic('up')}</button><button class="iconbtn" data-action="scene-down" data-id="${esc(s.id)}" ${i===o.scenes.length-1?'disabled':''} title="Bajar escena">${ic('down')}</button><button class="iconbtn" data-action="scene-delete" data-id="${esc(s.id)}" title="Eliminar escena">${ic('trash')}</button></div></div>`).join('')}</div><button class="btn primary outline-add" data-action="scene-add">${ic('plus')} Añadir escena</button></div></div>`:`<div class="empty-state">${ic('list')}<h2>La estructura de tu historia</h2><p>Una escaleta para cada trama, versión o línea temporal que quieras planificar.</p><button class="btn primary" data-action="add-outline">${ic('plus')} Crear escaleta</button></div>`}`}
function addSheet(type){const p=activeProject();if(!p)return;const character=type==='character';modal({title:character?'Nuevo personaje':'Nuevo escenario',fields:[{id:'title',label:'Nombre',required:true,placeholder:character?'Elías':'La estación abandonada'}],submit:'Crear ficha',onSubmit:({title})=>{const id=uid();p[character?'characters':'settings'].push({id,title,subtitle:'',content:''});state[character?'activeCharacterId':'activeSettingId']=id;state.view=character?'characters':'settings';changed();render()}})}
function addOutline(){const p=activeProject();if(!p)return;modal({title:'Nueva escaleta',description:'Puedes tener varias escaletas para un mismo libro.',fields:[{id:'title',label:'Título',required:true,placeholder:'Estructura general · Primer borrador'}],submit:'Crear escaleta',onSubmit:({title})=>{const id=uid();p.outlines.push({id,title,scenes:[]});state.activeOutlineId=id;state.view='outlines';changed();render()}})}

function libraryHtml(){return `<div class="workspace-head"><div><div class="eyebrow">Todas tus historias</div><h1>Biblioteca</h1></div><button class="btn primary" data-action="add-project">${ic('plus')} Nuevo libro</button></div><div class="main-scroll"><p class="section-intro">Cada libro contiene sus propios capítulos, pizarras, personajes, escenarios y escaletas. Abre uno para empezar.</p><div class="projects-grid">${state.projects.map(p=>`<button class="project-card" data-action="open-project" data-id="${esc(p.id)}"><div class="project-card-art" style="background:linear-gradient(125deg,color-mix(in srgb,${safeColor(p.iconColor,'#738675')} 25%,var(--surface)),var(--surface2));color:${safeColor(p.iconColor,'#738675')}">${ic('book')}</div><div class="project-card-body"><h3>${esc(p.name)}</h3><p>${esc(p.description||'Una nueva historia por escribir')}</p><div class="project-card-meta">${ic('edit')} ${p.chapters.length} capítulos · ${p.boards.length} pizarras · ${projectWords(p)} palabras</div></div></button>`).join('')}<button class="project-card new" data-action="add-project"><div class="project-card-art">${ic('plus')}</div><div class="project-card-body"><h3>Nuevo libro</h3><p>Una historia todavía por descubrir</p><div class="project-card-meta">Empezar a escribir ${ic('chevron')}</div></div></button></div></div>`}

function manuscriptHtml(p){const c=activeChapter();return `<div class="workspace-head"><div><span class="eyebrow">${esc(p?.name)}</span><h1>Manuscrito</h1></div><div class="head-actions"><button class="btn" data-action="export-text">${ic('download')} Exportar texto</button><button class="btn ghost" data-action="rename-chapter" ${!c?'disabled':''} title="Cambiar título">${ic('rename')}</button><button class="btn ghost" data-action="delete-chapter" ${!c?'disabled':''} title="Eliminar capítulo">${ic('trash')}</button></div></div>${c?`<div class="editor-area"><div class="editor-toolbar"><button class="tool-btn" data-action="format" data-format="bold" title="Negrita (Ctrl+B)">${ic('bold')}</button><button class="tool-btn" data-action="format" data-format="italic" title="Cursiva (Ctrl+I)">${ic('italic')}</button><span class="tool-divider"></span><button class="tool-btn" data-action="format" data-format="formatBlock" data-value="h2" title="Título">${ic('text')}</button><button class="tool-btn" data-action="format" data-format="insertUnorderedList" title="Lista">${ic('list')}</button><button class="tool-btn" data-action="format" data-format="formatBlock" data-value="blockquote" title="Cita">${ic('quote')}</button><span style="margin-left:auto;font-size:11px;color:var(--muted)">Escribe sin distracciones</span></div><article class="editor-paper"><input class="chapter-title" id="chapter-title" value="${esc(c.title)}" placeholder="Título del capítulo"><div class="editor-text" contenteditable="true" spellcheck="true" id="chapter-editor" data-placeholder="Había una vez...">${c.html||''}</div></article><div class="editor-stat"><span id="chapter-words">${wordCount(plain(c.html))} palabras</span><span>Autoguardado · sin conexión</span></div></div>`:`<div class="empty-state">${ic('book')}<h2>Una página en blanco</h2><p>Crea tu primer capítulo y empieza a escribir.</p><button class="btn primary" data-action="add-chapter">${ic('plus')} Añadir capítulo</button></div>`}`}
function boardHtml(p){const b=activeBoard();return `<div class="workspace-head" style="padding-bottom:14px"><div><span class="eyebrow">${esc(p?.name)}</span><h1>${esc(b?.title||'Pizarras')}</h1></div><div class="head-actions"><button class="btn ghost" data-action="rename-board" ${!b?'disabled':''} title="Renombrar pizarra">${ic('rename')}</button><button class="btn ghost" data-action="duplicate-board" ${!b?'disabled':''} title="Duplicar pizarra">${ic('copy')}</button><button class="btn ghost" data-action="delete-board" ${!b?'disabled':''} title="Eliminar pizarra">${ic('trash')}</button><button class="btn primary" data-action="add-board">${ic('plus')} Otra pizarra</button></div></div>${b?`<div class="board-shell"><div class="boardbar"><button class="tool-btn ${boardTool==='select'?'on':''}" data-action="board-tool" data-tool="select" title="Seleccionar y mover elementos">${ic('cursor')}</button><button class="tool-btn ${boardTool==='hand'?'on':''}" data-action="board-tool" data-tool="hand" title="Mover el lienzo">${ic('hand')}</button><button class="tool-btn ${boardTool==='pen'?'on':''}" data-action="board-tool" data-tool="pen" title="Dibujar a mano">${ic('pencil')}</button><button class="tool-btn ${boardTool==='eraser'?'on':''}" data-action="board-tool" data-tool="eraser" title="Borrar trazos">${ic('eraser')}</button><span class="tool-divider"></span><button class="btn" data-action="board-add-note">${ic('note')} Nota</button><button class="btn" data-action="board-add-text">${ic('text')} Texto</button><button class="btn" data-action="board-add-image">${ic('image')} Imagen</button><span class="tool-divider"></span><label>Fondo<select id="board-background" title="Tipo de papel"><option value="blank">Blanco / liso</option><option value="wide">Líneas espaciadas</option><option value="ruled">Líneas normales</option><option value="notebook">Libreta con margen</option><option value="dots">Puntos · bullet journal</option><option value="grid">Cuadrícula</option><option value="gridfine">Cuadrícula fina</option></select></label><label title="Color del lápiz">${ic('pencil')}<input id="pen-color" type="color" value="${penColor}"></label><label title="Grosor del lápiz">Grosor <select id="pen-size"><option value="2">Fino</option><option value="4">Medio</option><option value="8">Grueso</option></select></label></div><div class="board-viewport" id="board-viewport"><div class="board-world bg-${esc(b.background||'dots')}" id="board-world"><div class="board-items" id="board-items"></div><canvas class="drawing-layer" id="drawing-layer" width="4000" height="2800"></canvas></div><div class="selection-tools" id="selection-tools"><span class="subtle" style="padding:0 6px">Seleccionado</span><label class="selection-color" id="selection-color-wrap" title="Elegir color de la nota">${ic('palette')}<input id="selected-note-color" type="color" value="#f8ebbf" aria-label="Color de fondo de la nota"></label><button class="tool-btn" data-action="duplicate-item" title="Duplicar">${ic('copy')}</button><button class="tool-btn" data-action="delete-item" title="Eliminar">${ic('trash')}</button></div><div class="board-hint">Mover: arrastra el fondo con la herramienta mano · Dibuja con lápiz · Suelta imágenes aquí</div><div class="zoom-controls"><button class="tool-btn" data-action="zoom-out" title="Alejar">${ic('zoomout')}</button><span class="zoom-label" id="zoom-label">100 %</span><button class="tool-btn" data-action="zoom-in" title="Acercar">${ic('zoomin')}</button><button class="tool-btn" data-action="zoom-reset" title="Volver a 100 %">${ic('target')}</button></div></div></div>`:`<div class="empty-state">${ic('board')}<h2>Ideas sin límites</h2><p>Crea una pizarra y úsala como moodboard, cuaderno de bocetos o mapa mental.</p><button class="btn primary" data-action="add-board">${ic('plus')} Crear pizarra</button></div>`}`}
function notesHtml(p){const n=activeNote();return `<div class="workspace-head"><div><span class="eyebrow">${esc(p?.name)}</span><h1>Universo y documentación</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-note" ${!n?'disabled':''} title="Eliminar ficha">${ic('trash')}</button><button class="btn primary" data-action="add-note">${ic('plus')} Nueva ficha</button></div></div>${n?`<div class="main-scroll"><div class="universe-paper"><input class="note-title" id="note-title" value="${esc(n.title)}"><div id="note-body" class="note-body" contenteditable="true" spellcheck="true">${esc(n.content)}</div></div><p class="welcome-small">Notas, personajes, ambientaciones y documentación, independientes en cada proyecto.</p></div>`:`<div class="empty-state">${ic('note')}<h2>Un universo por descubrir</h2><p>Guarda tus personajes, lugares y cualquier detalle importante.</p><button class="btn primary" data-action="add-note">${ic('plus')} Nueva ficha</button></div>`}`}
function modal({title,description='',fields=[],submit='Guardar',onSubmit}){const shell=document.createElement('div');shell.className='modal-backdrop';shell.innerHTML=`<form class="modal"><h2>${esc(title)}</h2><p>${esc(description)}</p>${fields.map(f=>`<div class="field"><label for="m-${f.id}">${esc(f.label)}</label>${f.multiline?`<textarea rows="3" id="m-${f.id}" maxlength="2000" placeholder="${esc(f.placeholder||'')}">${esc(f.value||'')}</textarea>`:`<input id="m-${f.id}" type="text" maxlength="120" value="${esc(f.value||'')}" ${f.required?'required':''} placeholder="${esc(f.placeholder||'')}">`}</div>`).join('')}<div class="modal-actions"><button type="button" class="btn" id="modal-cancel">Cancelar</button><button type="submit" class="btn primary">${esc(submit)}</button></div></form>`;document.body.appendChild(shell);const close=()=>shell.remove();shell.addEventListener('mousedown',e=>{if(e.target===shell)close()});shell.querySelector('#modal-cancel').onclick=close;shell.querySelector('form').onsubmit=e=>{e.preventDefault();const val={};fields.forEach(f=>val[f.id]=shell.querySelector('#m-'+f.id).value.trim());if(fields.some(f=>f.required&&!val[f.id]))return;close();onSubmit(val)};shell.querySelector('input,textarea')?.focus();}
function addProject(){modal({title:'Un nuevo libro',description:'Cada libro tendrá sus propios capítulos, pizarras, fichas y escaletas.',fields:[{id:'name',label:'Título del libro',required:true,placeholder:'La ciudad de las cenizas'},{id:'description',label:'Sinopsis o descripción (opcional)',multiline:true,placeholder:'¿De qué trata tu historia?'}],submit:'Crear libro',onSubmit:({name,description})=>{const pid=uid();state.projects.push({id:pid,name,description,createdAt:now(),iconColor:'#738675',chapters:[],boards:[],notes:[],characters:[],settings:[],outlines:[]});state.activeProjectId=pid;state.activeChapterId=null;state.activeBoardId=null;state.activeCharacterId=null;state.activeSettingId=null;state.activeOutlineId=null;state.view='book';changed();render();showToast('Libro creado')}})}

function addChapter(){const p=activeProject();if(!p)return;modal({title:'Nuevo capítulo',fields:[{id:'title',label:'Título',required:true,value:`Capítulo ${p.chapters.length+1}`}],submit:'Añadir',onSubmit:({title})=>{const id=uid();p.chapters.push({id,title,html:'',updatedAt:now()});state.activeChapterId=id;state.view='manuscript';changed();render()}})}
function addBoard(){const p=activeProject();if(!p)return;modal({title:'Nueva pizarra',description:'Puedes crear tantas pizarras distintas como quieras dentro de este proyecto.',fields:[{id:'title',label:'Nombre de la pizarra',required:true,placeholder:'Moodboard de personajes'}],submit:'Crear pizarra',onSubmit:({title})=>{const id=uid();p.boards.push({id,title,background:'dots',zoom:1,panX:-790,panY:-520,elements:[],strokes:[]});state.activeBoardId=id;state.view='boards';boardTool='select';changed();render()}})}
function addNote(){const p=activeProject();if(!p)return;modal({title:'Nueva ficha o nota',fields:[{id:'title',label:'Título',required:true,placeholder:'Ficha de personaje · Elías'}],submit:'Crear ficha',onSubmit:({title})=>{const id=uid();p.notes.push({id,title,content:''});state.activeNoteId=id;state.view='notes';changed();render()}})}
function safeFilename(s){return String(s||'MARGEN').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,80)||'MARGEN'}
function downloadBlob(body,name,type){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function backup(){downloadBlob(JSON.stringify(state,null,2),'MARGEN-copia-'+new Date().toISOString().slice(0,10)+'.json','application/json');showToast('Copia de seguridad exportada')}
function exportText(){const p=activeProject();if(!p)return;const content=p.chapters.map(c=>c.title.toUpperCase()+'\r\n\r\n'+plain(c.html)).join('\r\n\r\n'+'—'.repeat(12)+'\r\n\r\n');downloadBlob(content,safeFilename(p.name)+'.txt','text/plain;charset=utf-8');showToast('Manuscrito exportado a TXT')}
function validateBackup(x){return x&&x.version===1&&Array.isArray(x.projects)&&x.projects.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.chapters)&&Array.isArray(p.boards)&&Array.isArray(p.notes))}
function wire(){document.querySelectorAll('[data-action]').forEach(btn=>{btn.addEventListener('click',onAction)});el('file-image').onchange=onImageFile;el('file-backup').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const loaded=JSON.parse(await f.text());if(!validateBackup(loaded))throw new Error('Formato incorrecto');if(!await m172Confirm('¿Sustituir TODOS los proyectos actuales por esta copia de seguridad? Exporta una copia de los actuales si quieres conservarlos.'))return;state=loaded;ensureSelections();dirty=true;await save();render();showToast('Copia restaurada correctamente')}catch(err){m172Notice('No se pudo importar la copia: '+err.message)}finally{e.target.value=''}};
if(state.view==='manuscript'){const c=activeChapter();if(c){const title=el('chapter-title');if(title){title.oninput=e=>{c.documentTitle=e.target.value;c.updatedAt=now();changed()};title.onblur=()=>changed()}el('chapter-editor').oninput=e=>{c.html=e.target.innerHTML;c.updatedAt=now();el('chapter-words').textContent=wordCount(e.target.innerText)+' palabras';changed()}}}
const bookColor=el('book-icon-color');if(bookColor)bookColor.addEventListener('input',e=>{const p=activeProject();p.iconColor=e.target.value;changed();const icon=document.querySelector('.project-mini-icon');if(icon){icon.style.color=e.target.value;icon.style.background=`color-mix(in srgb,${e.target.value} 16%,var(--surface))`}});
 document.querySelectorAll('[data-entry-color]').forEach(input=>input.addEventListener('input',e=>{const p=activeProject(),view=input.dataset.entryColor,map={manuscript:'chapters',boards:'boards',characters:'characters',settings:'settings',outlines:'outlines',notes:'notes'};const item=p?.[map[view]]?.find(x=>x.id===input.dataset.id);if(item){item.iconColor=e.target.value;const glyph=input.closest('.tree-entry')?.querySelector('.tree-icon');if(glyph)glyph.style.color=e.target.value;changed()}}));
 if(state.view==='boards'){const color=el('selected-note-color');if(color)color.addEventListener('input',e=>{const item=activeBoard()?.elements.find(x=>x.id===selectedElement);if(item?.type==='note'){item.color=e.target.value;document.querySelector(`.board-item[data-eid="${item.id}"]`)?.style.setProperty('--note-color',item.color);changed()}})}
 if(state.view==='characters'||state.view==='settings'){const record=state.view==='characters'?activeCharacter():activeSetting();if(record){el('fiche-title').oninput=e=>{record.title=e.target.value;changed()};el('fiche-title').onblur=renderSidebarOnly;el('fiche-subtitle').oninput=e=>{record.subtitle=e.target.value;changed()};el('fiche-body').oninput=e=>{record.content=e.target.innerText;changed()}}}
 if(state.view==='outlines'){const o=activeOutline();if(o){el('outline-title').oninput=e=>{o.title=e.target.value;changed()};el('outline-title').onblur=renderSidebarOnly;document.querySelectorAll('[data-scene-field]').forEach(input=>{const change=e=>{const scene=o.scenes.find(s=>s.id===input.dataset.sceneId);if(scene){scene[input.dataset.sceneField]=input.value;changed()}};input.addEventListener(input.tagName==='SELECT'?'change':'input',change)})}}
 if(state.view==='notes'){const n=activeNote();if(n){el('note-title').oninput=e=>{n.title=e.target.value;changed()};el('note-title').onblur=renderSidebarOnly;el('note-body').oninput=e=>{n.content=e.target.innerText;changed()}}}}
function renderSidebarOnly(){const p=activeProject();const sidebar=document.querySelector('.sidebar');if(sidebar){sidebar.innerHTML=sidebarHtml(p);sidebar.querySelectorAll('[data-action]').forEach(x=>x.addEventListener('click',onAction))}}
async function onAction(e){const btn=e.currentTarget,a=btn.dataset.action,p=activeProject();

if(a==='book-home'){changeView('book');return}
if(a==='show-category'){const view=btn.dataset.view;changeView(view);return}
if(a==='add-character'||a==='add-setting'){addSheet(a==='add-character'?'character':'setting');return}
if(a==='add-outline'){addOutline();return}
if(a==='open-entry'){
 const view=btn.dataset.type,id=btn.dataset.id;
 const keys={manuscript:'activeChapterId',boards:'activeBoardId',characters:'activeCharacterId',settings:'activeSettingId',outlines:'activeOutlineId',notes:'activeNoteId'};
 state[keys[view]]=id;state.view=view;selectedElement=null;boardTool='select';changed();render();return;
}
if(a==='delete-character'||a==='delete-setting'||a==='delete-outline'){
 if(!p)return;const type=a.slice(7),info={character:['characters','activeCharacterId',activeCharacter()],setting:['settings','activeSettingId',activeSetting()],outline:['outlines','activeOutlineId',activeOutline()]}[type];if(!info)return;const [arr,key,item]=info;if(item&&await m172Confirm(`¿Eliminar «${item.title}»?`)){p[arr]=p[arr].filter(x=>x.id!==item.id);state[key]=null;changed();render()}return;
}
if(a==='scene-add'){const o=activeOutline();if(!o)return;o.scenes.push({id:uid(),title:'',description:'',status:'idea',pov:''});changed();render();const inputs=Array.from(document.querySelectorAll('.scene-title'));inputs.at(-1)?.focus();return}
if(a==='scene-delete'||a==='scene-up'||a==='scene-down'){
 const o=activeOutline();if(!o)return;const i=o.scenes.findIndex(s=>s.id===btn.dataset.id);if(i<0)return;
 if(a==='scene-delete'){if(!await m172Confirm('¿Eliminar esta escena de la escaleta?'))return;o.scenes.splice(i,1)}
 if(a==='scene-up'&&i>0){[o.scenes[i-1],o.scenes[i]]=[o.scenes[i],o.scenes[i-1]]}
 if(a==='scene-down'&&i<o.scenes.length-1){[o.scenes[i+1],o.scenes[i]]=[o.scenes[i],o.scenes[i+1]]}
 changed();render();return;
}
if(a==='library'){changeView('library');return}if(a==='view'){changeView(btn.dataset.view);return}if(a==='theme'){state.theme=state.theme==='light'?'dark':'light';changed();render();return}if(a==='backup'){backup();return}if(a==='restore'){el('file-backup').click();return}if(a==='add-project'){addProject();return}if(a==='edit-project'){if(!p)return;modal({title:'Editar proyecto',fields:[{id:'name',label:'Nombre',required:true,value:p.name},{id:'description',label:'Descripción',multiline:true,value:p.description}],onSubmit:({name,description})=>{p.name=name;p.description=description;changed();render()}});return}if(a==='delete-project'){if(!p)return;if(await m172Confirm(`¿Eliminar DEFINITIVAMENTE «${p.name}» y todos sus capítulos, pizarras e imágenes? Antes, exporta una copia de seguridad si deseas conservarlo.`)){state.projects=state.projects.filter(x=>x.id!==p.id);state.activeProjectId=state.projects[0]?.id||null;state.view='library';changed();render()}return}if(a==='add-chapter'){addChapter();return}if(a==='add-board'){addBoard();return}if(a==='add-note'){addNote();return}
if(a==='open-project'){state.activeProjectId=btn.dataset.id;state.view='book';changed();render();return}if(a==='open-chapter'){state.activeChapterId=btn.dataset.id;state.view='manuscript';changed();render();return}if(a==='open-board'){state.activeBoardId=btn.dataset.id;state.view='boards';selectedElement=null;changed();render();return}if(a==='open-note'){state.activeNoteId=btn.dataset.id;state.view='notes';changed();render();return}
if(a==='rename-chapter'){const c=activeChapter();if(c)modal({title:'Renombrar capítulo',fields:[{id:'title',label:'Título',value:c.title,required:true}],onSubmit:({title})=>{c.title=title;changed();render()}});return}
if(a==='delete-chapter'){const c=activeChapter();if(c&&await m172Confirm(`¿Eliminar «${c.title}»? Esta acción no se puede deshacer.`)){p.chapters=p.chapters.filter(x=>x.id!==c.id);changed();render()}return}
if(a==='rename-board'){const b=activeBoard();if(b)modal({title:'Renombrar pizarra',fields:[{id:'title',label:'Nombre',required:true,value:b.title}],onSubmit:({title})=>{b.title=title;changed();render()}});return}
if(a==='duplicate-board'){const b=activeBoard();if(!b)return;const dupe=JSON.parse(JSON.stringify(b));dupe.id=uid();dupe.title=b.title+' · copia';dupe.elements.forEach(x=>x.id=uid());p.boards.push(dupe);state.activeBoardId=dupe.id;selectedElement=null;changed();render();showToast('Pizarra duplicada');return}
if(a==='delete-board'){const b=activeBoard();if(b&&await m172Confirm(`¿Eliminar «${b.title}» y todo su contenido?`)){p.boards=p.boards.filter(x=>x.id!==b.id);changed();render()}return}
if(a==='delete-note'){const n=activeNote();if(n&&await m172Confirm(`¿Eliminar «${n.title}»?`)){p.notes=p.notes.filter(x=>x.id!==n.id);changed();render()}return}
if(a==='format'){const editor=el('chapter-editor');editor.focus();document.execCommand(btn.dataset.format,false,btn.dataset.value||null);const c=activeChapter();c.html=editor.innerHTML;changed();return}
if(a==='export-text'){exportText();return}
if(a==='board-tool'){boardTool=btn.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x.dataset.tool===boardTool));updateBoardCursor();return}
if(a==='board-add-note'){addBoardElement('note');return}if(a==='board-add-text'){addBoardElement('text');return}if(a==='board-add-image'){el('file-image').click();return}
if(a==='zoom-in'){setZoom(activeBoard().zoom+.15);return}if(a==='zoom-out'){setZoom(activeBoard().zoom-.15);return}if(a==='zoom-reset'){setZoom(1);return}
if(a==='delete-item'){deleteSelected();return}if(a==='duplicate-item'){duplicateSelected();return}if(a==='color-item'){cycleColor();return}}
function updateBoardCursor(){const vp=el('board-viewport');if(!vp)return;vp.classList.toggle('hand',boardTool==='hand');vp.classList.toggle('pen',boardTool==='pen');vp.classList.toggle('eraser',boardTool==='eraser');el('drawing-layer').style.pointerEvents=(boardTool==='pen'||boardTool==='eraser')?'auto':'none';el('board-items').style.pointerEvents=(boardTool==='pen'||boardTool==='eraser')?'none':'none';el('drawing-layer').style.cursor=boardTool==='eraser'?'cell':'crosshair'}
function worldPoint(evt){const rect=el('board-viewport').getBoundingClientRect(),b=activeBoard();return {x:(evt.clientX-rect.left-b.panX)/b.zoom,y:(evt.clientY-rect.top-b.panY)/b.zoom}}
function applyTransform(){const b=activeBoard();const world=el('board-world');if(world)world.style.transform=`translate(${b.panX}px,${b.panY}px) scale(${b.zoom})`;const label=el('zoom-label');if(label)label.textContent=Math.round(b.zoom*100)+' %'}
function setZoom(num){const b=activeBoard(),vp=el('board-viewport');if(!b||!vp)return;const z=Math.min(2.5,Math.max(.35,Math.round(num*100)/100));const cx=vp.clientWidth/2,cy=vp.clientHeight/2,wx=(cx-b.panX)/b.zoom,wy=(cy-b.panY)/b.zoom;b.zoom=z;b.panX=cx-wx*z;b.panY=cy-wy*z;applyTransform();changed()}
function setupBoard(){const b=activeBoard(),vp=el('board-viewport'),can=el('drawing-layer'),select=el('board-background');if(!b||!vp)return;select.value=b.background||'dots';select.onchange=e=>{b.background=e.target.value;el('board-world').className='board-world bg-'+b.background;changed()};el('pen-color').value=penColor;el('pen-color').onchange=e=>penColor=e.target.value;el('pen-size').value=String(penSize);el('pen-size').onchange=e=>penSize=Number(e.target.value);applyTransform();updateBoardCursor();renderBoardElements();drawStrokes();
function pointerDown(e){if(e.button!==0&&e.button!==1)return;if(e.target.closest('.board-item'))return;if(boardTool==='hand'||e.button===1||(e.buttons===1&&e.altKey)){e.preventDefault();drag={kind:'pan',x:e.clientX,y:e.clientY,px:b.panX,py:b.panY};vp.setPointerCapture(e.pointerId);return}if(boardTool==='select'){setSelected(null)} }
function pointerMove(e){if(drag?.kind==='pan'){b.panX=drag.px+(e.clientX-drag.x);b.panY=drag.py+(e.clientY-drag.y);applyTransform()}}
function pointerUp(e){if(drag?.kind==='pan'){drag=null;changed()}if(vp.hasPointerCapture(e.pointerId))vp.releasePointerCapture(e.pointerId)}
vp.addEventListener('pointerdown',pointerDown);vp.addEventListener('pointermove',pointerMove);vp.addEventListener('pointerup',pointerUp);vp.addEventListener('pointercancel',pointerUp);
function wheeler(e){if(e.ctrlKey){e.preventDefault();setZoom(b.zoom+(e.deltaY<0?.1:-.1))}else if(boardTool==='hand'||e.shiftKey){e.preventDefault();b.panX-=e.deltaX;b.panY-=e.deltaY;applyTransform();changed()}}
vp.addEventListener('wheel',wheeler,{passive:false});
function canvasDown(e){if(boardTool!=='pen'&&boardTool!=='eraser')return;e.preventDefault();e.stopPropagation();const q=worldPoint(e);if(boardTool==='eraser'){eraseAt(q);strokeDraft={erase:true};can.setPointerCapture(e.pointerId)}else{strokeDraft={id:uid(),color:penColor,width:penSize,points:[q]};b.strokes.push(strokeDraft);can.setPointerCapture(e.pointerId);drawStrokes()}}
function canvasMove(e){if(!strokeDraft)return;const q=worldPoint(e);if(strokeDraft.erase){eraseAt(q);return}const pts=strokeDraft.points,last=pts[pts.length-1];if(Math.hypot(q.x-last.x,q.y-last.y)>1){pts.push(q);drawStrokes()}}
function canvasUp(e){if(!strokeDraft)return;strokeDraft=null;changed();if(can.hasPointerCapture(e.pointerId))can.releasePointerCapture(e.pointerId)}
can.addEventListener('pointerdown',canvasDown);can.addEventListener('pointermove',canvasMove);can.addEventListener('pointerup',canvasUp);can.addEventListener('pointercancel',canvasUp);
function onDrop(e){e.preventDefault();vp.style.outline='';const files=Array.from(e.dataTransfer?.files||[]).filter(f=>f.type.startsWith('image/'));if(files.length)loadImages(files,worldPoint(e))}function onDragOver(e){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy'}vp.addEventListener('drop',onDrop);vp.addEventListener('dragover',onDragOver);
const keyDown=e=>{if(state.view!=='boards'||!activeBoard())return;const inEditor=e.target.closest('input,textarea,[contenteditable]');if(inEditor)return;if((e.key==='Delete'||e.key==='Backspace')&&selectedElement){e.preventDefault();deleteSelected()}if(e.key==='Escape'){setSelected(null);boardTool='select';updateBoardCursor();document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x.dataset.tool==='select'))}}
window.addEventListener('keydown',keyDown);
activeBoardCleanup=()=>{window.removeEventListener('keydown',keyDown)};
}
function eraseAt(pt){const b=activeBoard(),count=b.strokes.length;b.strokes=b.strokes.filter(s=>!s.points.some(q=>Math.hypot(pt.x-q.x,pt.y-q.y)<Math.max(14,s.width+10)));if(b.strokes.length!==count){drawStrokes();changed()}}
function drawStrokes(){const can=el('drawing-layer');if(!can)return;const ctx=can.getContext('2d'),b=activeBoard();ctx.clearRect(0,0,can.width,can.height);ctx.lineCap='round';ctx.lineJoin='round';for(const s of b.strokes||[]){if(!s.points?.length)continue;ctx.beginPath();ctx.strokeStyle=s.color||'#6c7769';ctx.fillStyle=s.color||'#6c7769';ctx.lineWidth=s.width||4;ctx.moveTo(s.points[0].x,s.points[0].y);if(s.points.length===1){ctx.arc(s.points[0].x,s.points[0].y,s.width/2,0,Math.PI*2);ctx.fill()}else{for(let i=1;i<s.points.length;i++)ctx.lineTo(s.points[i].x,s.points[i].y);ctx.stroke()}}}
function boardElementHtml(item){
 const type=item.type,colors={cream:'#f8ebbf',mint:'#dcebcf',rose:'#f3dcd9',blue:'#dce7eb'};
 const col=safeColor(colors[item.color]||item.color,'#f8ebbf');
 const style=`left:${Number(item.x)||0}px;top:${Number(item.y)||0}px;width:${Number(item.w)||250}px;height:${Number(item.h)||170}px;${type==='note'?`--note-color:${col};`:''}`;
 const handle=`<div class="item-handle" title="Arrastra para mover">${ic('move')}<span>${type==='note'?'NOTA':type==='image'?'IMAGEN':'TEXTO'}</span></div>`;
 return `<div class="board-item ${type} ${selectedElement===item.id?'selected':''}" data-eid="${esc(item.id)}" style="${style}">${handle}${type==='image'?`<img src="${esc(item.src||'')}" alt="Imagen del moodboard" draggable="false">`:type==='note'?`<input class="item-note-title" data-title="${esc(item.id)}" value="${esc(item.title||'Nueva nota')}" aria-label="Título de la nota" spellcheck="true"><div class="item-body" contenteditable="true" spellcheck="true" data-body="${esc(item.id)}" data-placeholder="Escribe una idea...">${esc(item.text||'')}</div>`:`<div class="item-body" contenteditable="true" spellcheck="true" data-body="${esc(item.id)}" data-placeholder="Escribe..."><span>${esc(item.text||'')}</span></div>`}<div class="resize-grip" title="Arrastra para cambiar el tamaño"></div></div>`;
}

function renderBoardElements(){const b=activeBoard(),wrap=el('board-items');if(!b||!wrap)return;wrap.innerHTML=b.elements.map(boardElementHtml).join('');wrap.querySelectorAll('.board-item').forEach(node=>{const item=b.elements.find(x=>x.id===node.dataset.eid);if(!item)return;node.addEventListener('pointerdown',()=>{if(boardTool==='select')setSelected(item.id)});node.querySelector('.item-handle').addEventListener('pointerdown',e=>startItemDrag(e,item,node,'move'));node.querySelector('.resize-grip').addEventListener('pointerdown',e=>startItemDrag(e,item,node,'resize'));if(item.type==='image')node.querySelector('img')?.addEventListener('pointerdown',e=>startItemDrag(e,item,node,'move'));const edit=node.querySelector('.item-body');if(edit){edit.addEventListener('pointerdown',e=>e.stopPropagation());edit.addEventListener('focus',()=>setSelected(item.id));edit.addEventListener('input',e=>{item.text=e.target.innerText;changed()})}const title=node.querySelector('[data-title]');if(title){title.addEventListener('pointerdown',e=>e.stopPropagation());title.addEventListener('focus',()=>setSelected(item.id));title.addEventListener('input',e=>{item.title=e.target.value;changed()})}});
}

function setSelected(id){selectedElement=id;document.querySelectorAll('.board-item').forEach(x=>x.classList.toggle('selected',x.dataset.eid===id));const tools=el('selection-tools');if(tools)tools.classList.toggle('visible',!!id);const item=activeBoard()?.elements.find(x=>x.id===id);const colorWrap=el('selection-color-wrap'),colorInput=el('selected-note-color');if(colorWrap)colorWrap.style.display=item?.type==='note'?'flex':'none';if(colorInput&&item?.type==='note')colorInput.value=safeColor(item.color,'#f8ebbf')}

function startItemDrag(e,item,node,kind){if(boardTool!=='select')return;e.preventDefault();e.stopPropagation();setSelected(item.id);const startX=e.clientX,startY=e.clientY,orig={x:item.x,y:item.y,w:item.w,h:item.h};const move=evt=>{const dx=(evt.clientX-startX)/activeBoard().zoom,dy=(evt.clientY-startY)/activeBoard().zoom;if(kind==='move'){item.x=Math.max(0,Math.min(3800,orig.x+dx));item.y=Math.max(0,Math.min(2600,orig.y+dy));node.style.left=item.x+'px';node.style.top=item.y+'px'}else{item.w=Math.max(120,Math.min(1600,orig.w+dx));item.h=Math.max(80,Math.min(1300,orig.h+dy));node.style.width=item.w+'px';node.style.height=item.h+'px'}};const done=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);window.removeEventListener('pointercancel',done);changed()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',done,{once:true});window.addEventListener('pointercancel',done,{once:true})}
function centerNewPosition(){const b=activeBoard(),vp=el('board-viewport');const x=((vp.clientWidth/2)-b.panX)/b.zoom,y=((vp.clientHeight/2)-b.panY)/b.zoom;return {x:Math.max(20,Math.min(3750,x-135)),y:Math.max(20,Math.min(2550,y-90))}}
function addBoardElement(type,data){const b=activeBoard();if(!b)return;const p=centerNewPosition(),item={id:uid(),type,x:p.x,y:p.y,w:type==='text'?380:type==='image'?370:270,h:type==='image'?280:type==='text'?120:210};if(type==='image')item.src=data;else item.text=type==='text'?'Escribe aquí tu idea...':'';if(type==='note'){item.color='#f8ebbf';item.title='Nueva nota'}b.elements.push(item);boardTool='select';document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('on',x.dataset.tool==='select'));updateBoardCursor();renderBoardElements();setSelected(item.id);changed();if(type==='note'){const input=document.querySelector(`[data-title="${item.id}"]`);input?.focus();input?.select()}else if(type==='text'){const ed=document.querySelector(`[data-body="${item.id}"]`);ed?.focus();const range=document.createRange();range.selectNodeContents(ed);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}}

function deleteSelected(){const b=activeBoard();if(!b||!selectedElement)return;b.elements=b.elements.filter(e=>e.id!==selectedElement);setSelected(null);renderBoardElements();changed()}
function duplicateSelected(){const b=activeBoard(),src=b?.elements.find(x=>x.id===selectedElement);if(!src)return;const dupe=JSON.parse(JSON.stringify(src));dupe.id=uid();dupe.x+=34;dupe.y+=34;b.elements.push(dupe);renderBoardElements();setSelected(dupe.id);changed()}
function cycleColor(){const item=activeBoard()?.elements.find(x=>x.id===selectedElement);if(!item||item.type!=='note'){showToast('Selecciona una nota para darle color');return}const input=el('selected-note-color');if(input)input.click()}

async function compressImage(file){return new Promise((resolve,reject)=>{const im=new Image(),url=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(url);const isPng=file.type==='image/png',isWebp=file.type==='image/webp';const scale=Math.min(1,1800/Math.max(im.width,im.height)),can=document.createElement('canvas');can.width=Math.max(1,Math.round(im.width*scale));can.height=Math.max(1,Math.round(im.height*scale));const c=can.getContext('2d');c.clearRect(0,0,can.width,can.height);c.drawImage(im,0,0,can.width,can.height);resolve(can.toDataURL(isPng?'image/png':isWebp?'image/webp':'image/jpeg',.88))};im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Imagen no válida'))};im.src=url})}

async function loadImages(files,pos){if(state.view!=='boards')return;let count=0;for(const f of files.slice(0,20)){try{if(f.size>25*1024*1024){showToast('Imagen demasiado grande (máximo 25 MB)');continue}const src=await compressImage(f),b=activeBoard();if(!b)return;const p=pos||centerNewPosition();b.elements.push({id:uid(),type:'image',x:p.x+count*32,y:p.y+count*32,w:340,h:270,src});count++}catch(err){console.warn(err);showToast('No se pudo leer una de las imágenes')}}if(count){renderBoardElements();changed();showToast(count+' imagen(es) añadida(s)')}}
function onImageFile(e){const files=Array.from(e.target.files||[]);e.target.value='';if(files.length)loadImages(files)}
async function start(){try{db=await openDb();state=await readDb()}catch(err){console.warn('IndexedDB no disponible',err);try{const raw=localStorage.getItem('margen-155-refactor-pruebas-backup');const parsed=JSON.parse(raw||'null');if(raw&&!validateBackup(parsed)){const rec=JSON.parse(localStorage.getItem('margen-155-refactor-pruebas-backup-recovery')||'null');if(validateBackup(rec)){state=rec;m15Recovered=true;m15RecoveryAvailable=true}else{state=null;m15Blocked=true}}else state=parsed}catch(e){state=null;m15Blocked=true}}if(!validateBackup(state)){state=initial();dirty=true}if(!['light','dark'].includes(state.theme))state.theme='light';if(!['desk','library','book','manuscript','boards','notes','characters','settings','outlines','chronologies'].includes(state.view))state.view='library';render();if(dirty)changed();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});window.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='s'){e.preventDefault();void save().then(ok=>{if(ok)showToast('Cambios guardados')})}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='b'){e.preventDefault();backup()}})}
/* ==========================================================
   MARGEN 0.3 — Biblioteca, guiones y pizarras mejoradas
   Extensión compatible con el almacenamiento de MARGEN 0.2.
   ========================================================== */
const chapterTypes=[['scene','Escena · INT./EXT.'],['action','Acción'],['character','Personaje'],['dialogue','Diálogo'],['parenthetical','Acotación'],['transition','Transición'],['shot','Plano / indicación']];
const collections={manuscript:'chapters',boards:'boards',characters:'characters',settings:'settings',outlines:'outlines',notes:'notes'};
const categoryLabels=[['manuscript','chapters','Capítulos','edit','chapter'],['boards','boards','Pizarras','board','board'],['characters','characters','Fichas de personaje','users','character'],['settings','settings','Fichas de escenario','map','setting'],['outlines','outlines','Escaletas','list','outline']];
let coverTargetId=null, boardClipboard=null;
const boardHistory=new Map();
function histKey(){return state.activeProjectId+':'+state.activeBoardId}
function captureBoard(){const b=activeBoard();return b?JSON.stringify({elements:b.elements,strokes:b.strokes,background:b.background}):null}
function pushBoardUndo(){const snapshot=captureBoard();if(!snapshot)return;const key=histKey();let h=boardHistory.get(key);if(!h){h={undo:[],redo:[]};boardHistory.set(key,h)}if(h.undo.at(-1)!==snapshot)h.undo.push(snapshot);if(h.undo.length>55)h.undo.shift();h.redo=[];updateBoardHistoryButtons()}
function boardHistoryMove(reverse=false){const b=activeBoard(),h=boardHistory.get(histKey());if(!b||!h)return;const source=reverse?h.redo:h.undo,dest=reverse?h.undo:h.redo;if(!source.length)return;dest.push(captureBoard());const saved=JSON.parse(source.pop());b.elements=saved.elements||[];b.strokes=saved.strokes||[];b.background=saved.background||'dots';const picker=el('board-background');if(picker)picker.value=b.background;const world=el('board-world');if(world)world.className='board-world bg-'+b.background;setSelected(null);renderBoardElements();drawStrokes();changed();updateBoardHistoryButtons()}
function updateBoardHistoryButtons(){const h=boardHistory.get(histKey());document.querySelector('[data-action="board-undo"]')?.toggleAttribute('disabled',!h?.undo.length);document.querySelector('[data-action="board-redo"]')?.toggleAttribute('disabled',!h?.redo.length)}
function findTreeItem(view,id){const p=activeProject();return p?.[collections[view]]?.find(x=>x.id===id)}
function posterHtml(p,small=false){if(p.coverData)return `<img class="${small?'book-cover-hero':''}" src="${esc(p.coverData)}" alt="Portada de ${esc(p.name)}" draggable="false">`;return `<div class="cover-placeholder ${small?'small':''}" style="color:${safeColor(p.iconColor,'#738675')};background:linear-gradient(150deg,color-mix(in srgb,${safeColor(p.iconColor,'#738675')} 26%,var(--surface)),var(--surface2))">${ic('book')}<span>${esc(p.name)}</span></div>`}
function openCoverPicker(pid){const p=state.projects.find(x=>x.id===pid);if(!p)return;coverTargetId=pid;const picker=el('file-cover');if(picker){picker.value='';picker.click()}}
async function processCover(file){if(!file?.type?.startsWith('image/'))return;if(file.size>22*1024*1024){showToast('Portada demasiado grande (máximo 22 MB)');return}const id=coverTargetId;const p=state.projects.find(x=>x.id===id);if(!p)return;try{const src=await new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{const max=1100,scale=Math.min(1,max/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.87))};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo abrir la imagen'))};image.src=url});p.coverData=src;changed();render();showToast('Portada actualizada')}catch(err){showToast('No se ha podido cargar la portada');console.error(err)}}

/* Navigación global y árbol plegable */
changeView=function(view){if(!['desk','library','book','manuscript','boards','characters','settings','outlines','chronologies','notes'].includes(view))return;state.view=view;selectedElement=null;boardTool='select';changed();render()};
sidebarHtml=function(p){
 if(state.view==='desk'||state.view==='library')return `<div class="project-current"><div class="project-mini-icon">${ic(state.view==='desk'?'home':'grid')}</div><div class="project-current-text"><div class="project-current-name">${state.view==='desk'?'Escritorio':'Biblioteca'}</div><div class="project-current-sub">Tus historias a mano</div></div></div><div class="sidebar-scroll"><div class="sidebar-head"><span class="eyebrow">Libros</span><button class="mini-add" data-action="add-project" title="Nuevo libro">${ic('plus')}</button></div>${state.projects.map(x=>`<button class="sidebaritem" data-action="open-project" data-id="${esc(x.id)}"><span class="tree-icon" style="color:${safeColor(x.iconColor,'#738675')}">${ic('book')}</span><span class="truncate">${esc(x.name)}</span></button>`).join('')}</div><div class="sidebar-bottom">${state.projects.length} libros en tu biblioteca</div>`;
 const categories=categoryLabels.slice();if(p?.notes?.length)categories.push(['notes','notes','Notas antiguas','note','note']);p.collapsedCategories=p.collapsedCategories||{};
 const sections=categories.map(([view,array,label,icon,type])=>{
  const collapsed=!!p.collapsedCategories[view],elements=[...(p[array]||[])].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));
  const selectedId={manuscript:state.activeChapterId,boards:state.activeBoardId,characters:state.activeCharacterId,settings:state.activeSettingId,outlines:state.activeOutlineId,chronologies:state.activeChronologyId,notes:state.activeNoteId}[view];
  return `<section class="tree-section ${collapsed?'is-collapsed':''}" data-section="${view}"><div class="tree-heading"><button class="tree-category" data-action="toggle-category" data-view="${view}" aria-expanded="${!collapsed}" title="${collapsed?'Expandir':'Contraer'} ${label.toLowerCase()}">${ic('chevron')}<span class="tree-icon muted-icon">${ic(icon)}</span><span>${label}</span><span class="tree-count category-count">${elements.length}</span></button><button class="mini-add" data-action="add-${type}" title="Crear ${label.toLowerCase()}">${ic('plus')}</button></div><div class="tree-children">${elements.map(x=>`<div class="tree-entry"><button class="sidebaritem tree-leaf ${state.view===view&&selectedId===x.id?'active':''}" data-action="open-entry" data-type="${view}" data-id="${esc(x.id)}" title="${esc(x.title)}"><span class="tree-icon" style="color:${safeColor(x.iconColor,defaultIconColor(view))}">${ic(icon)}</span><span class="truncate">${esc(x.title)}</span>${x.pinned?`<span class="pinned-mark" title="Fijado">${ic('pin')}</span>`:''}${x.flagged?`<span class="flagged-mark" title="Pendiente de revisión">${ic('flag')}</span>`:''}</button><span class="entry-aux"><button class="entry-tool ${x.pinned?'is-pin':''}" data-action="toggle-pin" data-view="${view}" data-id="${esc(x.id)}" title="${x.pinned?'Desfijar':'Fijar arriba'}">${ic('pin')}</button><button class="entry-tool ${x.flagged?'is-flag':''}" data-action="toggle-flag" data-view="${view}" data-id="${esc(x.id)}" title="${x.flagged?'Quitar aviso':'Marcar para revisar'}">${ic('flag')}</button><label class="entry-color-label" title="Color del icono"><span class="tiny-palette">●</span><input aria-label="Color de icono de ${esc(x.title)}" type="color" data-entry-color="${view}" data-id="${esc(x.id)}" value="${safeColor(x.iconColor,defaultIconColor(view))}"></label></span></div>`).join('')}<button class="tree-add-text" data-action="add-${type}">${ic('plus')} Añadir ${type==='chapter'?'capítulo':type==='board'?'pizarra':type==='character'?'personaje':type==='setting'?'escenario':type==='outline'?'escaleta':'nota'}</button></div></section>`
 }).join('');
 return `<div class="project-current"><div class="project-mini-icon" style="color:${safeColor(p.iconColor,'#738675')};background:color-mix(in srgb,${safeColor(p.iconColor,'#738675')} 16%,var(--surface))">${ic('book')}</div><div class="project-current-text"><div class="project-current-name" title="${esc(p.name)}">${esc(p.name)}</div><div class="project-current-sub">${projectWords(p)} palabras</div></div><label class="book-color-label" title="Color del libro"><input type="color" id="book-icon-color" value="${safeColor(p.iconColor,'#738675')}"></label><button class="iconbtn" data-action="edit-project" title="Editar libro">${ic('rename')}</button></div><div class="sidebar-scroll"><button class="sidebaritem ${state.view==='book'?'active':''}" data-action="book-home">${ic('grid')}<span class="truncate">Vista general</span></button>${sections}</div><div class="sidebar-bottom"><button class="btn ghost" data-action="library">${ic('back')} Biblioteca</button><button class="btn ghost" data-action="delete-project" style="color:var(--danger)">Eliminar libro</button></div>`;
};
libraryHtml=function(){return `<div class="workspace-head"><div><div class="eyebrow">Tus historias</div><h1>Biblioteca</h1></div><button class="btn primary" data-action="add-project">${ic('plus')} Nuevo libro</button></div><div class="main-scroll"><p class="section-intro">Cada historia con su propia portada, capítulos, pizarras, fichas y escaletas. Haz clic en una cubierta para abrir el libro.</p><div class="projects-grid">${state.projects.map(p=>`<div class="project-card"><button class="book-cover-open" data-action="open-project" data-id="${esc(p.id)}" title="Abrir ${esc(p.name)}"><div class="project-card-art">${posterHtml(p)}</div><div class="project-card-body"><h3>${esc(p.name)}</h3><p>${esc(p.description||'Una historia por contar')}</p><div class="project-card-meta">${ic('edit')} ${p.chapters.length} capítulos · ${projectWords(p)} palabras</div></div></button><button class="cover-edit" data-action="choose-cover" data-id="${esc(p.id)}" title="Cambiar portada">${ic('image')} Portada</button></div>`).join('')}<div class="project-card new"><button class="book-cover-open" data-action="add-project"><div class="project-card-art">${ic('plus')}</div><div class="project-card-body"><h3>Nuevo libro</h3><p>Empieza una nueva historia</p></div></button></div></div></div>`};
function deskHtml(){const recent=[...state.projects].sort((a,b)=>(b.lastOpened||b.createdAt||'').localeCompare(a.lastOpened||a.createdAt||''));return `<div class="workspace-head"><div><div class="eyebrow">Tu estudio literario</div><h1>Escritorio</h1></div><button class="btn primary" data-action="add-project">${ic('plus')} Nuevo libro</button></div><div class="main-scroll"><p class="section-intro">Un lugar tranquilo para retomar lo que dejaste a medias. Todo el contenido sigue guardado dentro de cada libro.</p><div class="book-dashboard">${recent.slice(0,4).map(p=>`<div class="book-module"><div class="module-symbol" style="color:${safeColor(p.iconColor,'#738675')}">${ic('book')}</div><h3>${esc(p.name)}</h3><div class="module-number">${projectWords(p)} palabras</div><p>${p.chapters.length} capítulos · ${p.characters.length} personajes · ${p.boards.length} pizarras</p><button class="btn" data-action="open-project" data-id="${esc(p.id)}">Abrir libro</button></div>`).join('')||`<div class="book-module"><h3>Tu próxima historia</h3><p>Crea un libro para empezar.</p><button class="btn" data-action="add-project">Nuevo libro</button></div>`}</div><div class="welcome-small">Próximamente: objetivos de escritura y notas rápidas entre libros.</div></div>`}
const oldRender=render;
render=function(){
 ensureSelections();document.documentElement.dataset.theme=state.theme;document.documentElement.dataset.accent=state.accent||'green';
 const p=activeProject();if(activeBoardCleanup){activeBoardCleanup();activeBoardCleanup=null}
 el('app').innerHTML=`<header class="header"><div class="brand" data-action="desk" title="Abrir Escritorio"><span class="brand-mark">${ic('feather')}</span><span>MARGEN</span></div><nav class="topnav"><button class="toplink ${state.view==='desk'?'active':''}" data-action="desk">${ic('home')}<span>Escritorio</span></button><button class="toplink ${state.view==='library'?'active':''}" data-action="library">${ic('grid')}<span>Biblioteca</span></button>${!['desk','library'].includes(state.view)&&p?`<span class="breadcrumb-arrow">›</span><button class="toplink active" data-action="book-home">${ic('book')}<span>${esc(p.name)}</span></button>`:''}</nav><div class="header-right"><span class="status" id="save-status">${dirty?'Sin guardar':'✓ Guardado local'}</span><button class="iconbtn" title="Exportar copia de seguridad" data-action="backup">${ic('download')}</button><button class="iconbtn" title="Restaurar copia de seguridad" data-action="restore">${ic('upload')}</button><button class="iconbtn" title="Modo ${state.theme==='light'?'noche':'día'}" data-action="theme">${ic(state.theme==='light'?'moon':'sun')}</button></div></header><div class="content"><aside class="sidebar">${sidebarHtml(p)}</aside><main class="workspace" id="workspace">${state.view==='desk'?deskHtml():state.view==='library'?libraryHtml():state.view==='book'?bookHtml(p):state.view==='manuscript'?manuscriptHtml(p):state.view==='boards'?boardHtml(p):state.view==='characters'||state.view==='settings'?sheetHtml(p,state.view):state.view==='outlines'?outlinesHtml(p):state.view==='chronologies'?chronologiesHtml(p):notesHtml(p)}</main></div>`;
 wire();if(state.view==='boards'&&activeBoard())setupBoard();
};
const originalBookHtml=bookHtml;
bookHtml=function(p){let html=originalBookHtml(p);const marker='<div class="main-scroll">';const hero=`<div class="book-hero-row"><div class="book-cover-hero" style="border:0">${posterHtml(p,true)}</div><div><button class="btn" data-action="choose-cover" data-id="${esc(p.id)}">${ic('image')} ${p.coverData?'Cambiar':'Añadir'} portada</button>${p.coverData?` <button class="btn ghost" data-action="remove-cover" data-id="${esc(p.id)}">Quitar portada</button>`:''}<p class="subtle" style="margin-top:12px">Las portadas aparecen en tu biblioteca como libros verticales.</p></div></div>`;return html.replace(marker,marker+hero)};

/* Guion literario: tipología de párrafos y teclas de escritura. */
function scriptClass(t){return 'sc-'+(chapterTypes.some(x=>x[0]===t)?t:'action')}
function normalizeScript(html){const root=document.createElement('div');root.innerHTML=html||'';if(!root.textContent.trim()&&!root.querySelector('img'))return '<p class="sc-scene" data-script="scene"><br></p>';const out=document.createElement('div');for(const node of [...root.childNodes]){if(node.nodeType===3){if(node.textContent.trim()){const p=document.createElement('p');p.className='sc-action';p.dataset.script='action';p.textContent=node.textContent;out.append(p)}continue}if(node.nodeType!==1)continue;if(node.tagName==='P'||node.tagName==='DIV'||node.tagName.startsWith('H')){const p=document.createElement('p'),t=node.dataset.script||'action';p.dataset.script=t;p.className=scriptClass(t);p.innerHTML=node.innerHTML||'<br>';out.append(p)}else{const p=document.createElement('p');p.dataset.script='action';p.className='sc-action';p.innerHTML=node.outerHTML;out.append(p)}}return out.innerHTML||'<p class="sc-scene" data-script="scene"><br></p>'}
function currentScriptParagraph(){const editor=el('chapter-editor'),selection=window.getSelection();if(!editor||!selection?.anchorNode)return null;const anchor=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;const node=anchor?.closest('p');return node&&editor.contains(node)?node:null}
function setScriptType(type){const c=activeChapter();if(!c||c.mode!=='screenplay')return;const editor=el('chapter-editor');editor.focus();let block=currentScriptParagraph();if(!block){block=editor.querySelector('p');if(!block){block=document.createElement('p');editor.append(block)}}block.className=scriptClass(type);block.dataset.script=type;const dropdown=el('script-element-type');if(dropdown)dropdown.value=type;c.html=editor.innerHTML;changed()}
function scriptKeyDown(e){const c=activeChapter();if(c?.mode!=='screenplay')return;const hotkey=(e.ctrlKey||e.metaKey)&&!e.shiftKey&&/^[1-7]$/.test(e.key);if(hotkey){e.preventDefault();setScriptType(chapterTypes[Number(e.key)-1][0]);return}if(e.key==='Tab'&&!e.ctrlKey){e.preventDefault();const current=currentScriptParagraph()?.dataset.script||'action';const idx=chapterTypes.findIndex(x=>x[0]===current);setScriptType(chapterTypes[(idx+(e.shiftKey?-1:1)+chapterTypes.length)%chapterTypes.length][0]);return}if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey){const previous=currentScriptParagraph()?.dataset.script||'action';const next={scene:'action',action:'action',character:'dialogue',dialogue:'action',parenthetical:'dialogue',transition:'scene',shot:'action'}[previous]||'action';e.preventDefault();document.execCommand('insertParagraph',false,null);const block=currentScriptParagraph();if(block){block.className=scriptClass(next);block.dataset.script=next;}c.html=el('chapter-editor').innerHTML;changed();const dropdown=el('script-element-type');if(dropdown)dropdown.value=next}}
function exportCurrentScript(){const p=activeProject(),c=activeChapter();if(!c||!p)return;const div=document.createElement('div');div.innerHTML=c.html||'';const text=[...div.children].map(x=>x.textContent||'').join('\r\n\r\n');downloadBlob(text,safeFilename(p.name+' - '+c.title)+' - guion.txt','text/plain;charset=utf-8');showToast('Guion exportado a TXT')}
manuscriptHtml=function(p){
 const c=activeChapter(),script=c?.mode==='screenplay';
 const modePicker=c?`<label class="screenplay-mode-switch">Escritura <select id="chapter-mode" aria-label="Tipo de escritura"><option value="prose" ${!script?'selected':''}>Novela / prosa</option><option value="screenplay" ${script?'selected':''}>Guion audiovisual</option></select></label>`:'';
 const heading=`<div class="workspace-head"><div><span class="eyebrow">${esc(p?.name)}</span><h1>${script?'Guion':'Manuscrito'}</h1></div><div class="head-actions">${modePicker}<button class="btn" data-action="${script?'export-script':'export-text'}">${ic('download')} Exportar TXT</button><button class="btn ghost" data-action="rename-chapter" ${!c?'disabled':''} title="Renombrar">${ic('rename')}</button><button class="btn ghost" data-action="delete-chapter" ${!c?'disabled':''} title="Eliminar">${ic('trash')}</button></div></div>`;
 if(!c)return heading+`<div class="empty-state">${ic('book')}<h2>Una página en blanco</h2><p>Crea tu primer capítulo: podrás alternar entre prosa y guion.</p><button class="btn primary" data-action="add-chapter">${ic('plus')} Añadir capítulo</button></div>`;
 const scriptToolbar=`<span class="script-badge">GUION</span><label class="script-type-picker">Elemento<select id="script-element-type" title="Tipo de elemento">${chapterTypes.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><span class="tool-divider"></span><span class="subtle">Formato monoespaciado</span>`;
 const proseToolbar=`<button class="tool-btn" data-action="format" data-format="bold" title="Negrita (Ctrl+B)">${ic('bold')}</button><button class="tool-btn" data-action="format" data-format="italic" title="Cursiva (Ctrl+I)">${ic('italic')}</button><span class="tool-divider"></span><button class="tool-btn" data-action="format" data-format="formatBlock" data-value="h2" title="Título">${ic('text')}</button><button class="tool-btn" data-action="format" data-format="insertUnorderedList" title="Lista">${ic('list')}</button><button class="tool-btn" data-action="format" data-format="formatBlock" data-value="blockquote" title="Cita">${ic('quote')}</button><span style="margin-left:auto;font-size:11px;color:var(--muted)">Sin distracciones</span>`;
 const value=script?(c.html||'<p class="sc-scene" data-script="scene"><br></p>'):(c.html||'');
 const hint=script?`<div class="script-hint">Atajos: Ctrl+1…7 para cambiar elementos · Tab para recorrerlos · Intro crea el siguiente elemento automáticamente.<br>Formato orientativo de guion, no paginación industrial certificada.</div>`:'';
 return heading+`<div class="editor-area ${script?'screenplay-area':''}"><div class="editor-toolbar">${script?scriptToolbar:proseToolbar}</div><article class="editor-paper"><input class="chapter-title" id="chapter-title" value="${esc(c.title)}" placeholder="Título del ${script?'guion':'capítulo'}"><div class="${script?'screenplay-editor':'editor-text'}" contenteditable="true" spellcheck="true" id="chapter-editor" data-placeholder="${script?'INT. LOCALIZACIÓN - DÍA':'Había una vez...'}">${value}</div></article><div class="editor-stat"><span id="chapter-words">${wordCount(plain(c.html))} palabras</span><span>Guardado local automático</span></div>${hint}</div>`;
};
const originalBoardHtml=boardHtml;
boardHtml=function(p){let html=originalBoardHtml(p);return html.replace('<span class="tool-divider"></span><button class="btn" data-action="board-add-note">','<span class="tool-divider"></span><button class="tool-btn" data-action="board-undo" title="Deshacer (Ctrl+Z)">'+ic('back')+'</button><button class="tool-btn" data-action="board-redo" title="Rehacer (Ctrl+Y)">'+ic('redo')+'</button><span class="tool-divider"></span><button class="btn" data-action="board-add-note">').replace('<div class="board-hint">','<div class="board-hint">').replace('Mover: arrastra el fondo con la herramienta mano · Dibuja con lápiz · Suelta imágenes aquí','Ctrl+Z deshacer · Ctrl+C/V copiar y pegar · Arrastra imágenes · Pestaña ⋯ en cada nota')};

/* Pizarra: controles junto al elemento y texto limpio fuera de edición */
boardElementHtml=function(item){const type=item.type, colors={cream:'#f8ebbf',mint:'#dcebcf',rose:'#f3dcd9',blue:'#dce7eb'};const col=safeColor(colors[item.color]||item.color,'#f8ebbf');const style=`left:${Number(item.x)||0}px;top:${Number(item.y)||0}px;width:${Number(item.w)||250}px;height:${Number(item.h)||170}px;${type==='note'?`--note-color:${col};`:''}`;const handle=`<div class="item-handle" title="Arrastrar">${ic('move')}</div>`;
 const menu=`<details class="item-popmenu"><summary title="Opciones del elemento">⋯</summary><div class="item-menu-panel">${type==='note'?`<label>Color <input type="color" data-local-note-color="${esc(item.id)}" value="${col}" aria-label="Cambiar color"></label>`:''}<button type="button" data-board-command="duplicate" data-id="${esc(item.id)}">Duplicar</button><button type="button" data-board-command="delete" data-id="${esc(item.id)}">Eliminar</button></div></details>`;
 return `<div class="board-item ${type} ${selectedElement===item.id?'selected':''}" data-eid="${esc(item.id)}" style="${style}">${handle}${type==='image'?`${menu}<img src="${esc(item.src||'')}" alt="Imagen de la pizarra" draggable="false">`:type==='note'?`${menu}<input class="item-note-title" data-title="${esc(item.id)}" value="${esc(item.title||'Nueva nota')}" aria-label="Título de la nota" spellcheck="true"><div class="item-body" contenteditable="true" spellcheck="true" data-body="${esc(item.id)}" data-placeholder="Escribe una idea...">${esc(item.text||'')}</div>`:`<div class="item-body" contenteditable="true" spellcheck="true" data-body="${esc(item.id)}" data-placeholder="Escribe...">${esc(item.text||'')}</div>${menu}`}<div class="resize-grip" title="Cambiar tamaño"></div></div>`
};
const originalRenderBoardElements=renderBoardElements;
renderBoardElements=function(){originalRenderBoardElements();const wrap=el('board-items');if(!wrap)return;wrap.querySelectorAll('.board-item').forEach(node=>{
 node.querySelectorAll('input.item-note-title,.item-body').forEach(x=>x.addEventListener('focus',pushBoardUndo,{once:true}));
 const details=node.querySelector('.item-popmenu');if(details){details.addEventListener('pointerdown',e=>e.stopPropagation());details.addEventListener('click',e=>e.stopPropagation());const color=details.querySelector('[data-local-note-color]');color?.addEventListener('focus',pushBoardUndo,{once:true});color?.addEventListener('input',e=>{const item=activeBoard()?.elements.find(x=>x.id===color.dataset.localNoteColor);if(item?.type==='note'){item.color=e.target.value;node.style.setProperty('--note-color',item.color);changed()}});details.querySelectorAll('[data-board-command]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setSelected(b.dataset.id);if(b.dataset.boardCommand==='duplicate')duplicateSelected();if(b.dataset.boardCommand==='delete')deleteSelected()}))}
 });updateBoardHistoryButtons()};
const originalSetupBoard=setupBoard;
setupBoard=function(){originalSetupBoard();const can=el('drawing-layer'),bg=el('board-background');can?.addEventListener('pointerdown',e=>{if(boardTool==='pen'||boardTool==='eraser')pushBoardUndo()},true);bg?.addEventListener('change',pushBoardUndo,true);const key=e=>{
 if(state.view!=='boards')return;
 const editable=e.target?.closest?.('input,textarea,[contenteditable]');if(editable)return;
 const control=e.ctrlKey||e.metaKey;const k=e.key.toLowerCase();
 if(control&&k==='z'){e.preventDefault();boardHistoryMove(e.shiftKey);return}
 if(control&&k==='y'){e.preventDefault();boardHistoryMove(true);return}
 if(control&&k==='c'&&selectedElement){e.preventDefault();boardClipboard=JSON.parse(JSON.stringify(activeBoard().elements.find(x=>x.id===selectedElement)));showToast('Elemento copiado');return}
 if(control&&k==='x'&&selectedElement){e.preventDefault();boardClipboard=JSON.parse(JSON.stringify(activeBoard().elements.find(x=>x.id===selectedElement)));deleteSelected();showToast('Elemento cortado');return}
 if(control&&k==='v'&&boardClipboard){e.preventDefault();pushBoardUndo();const item=JSON.parse(JSON.stringify(boardClipboard));item.id=uid();item.x=Math.min(3800,item.x+45);item.y=Math.min(2600,item.y+45);activeBoard().elements.push(item);renderBoardElements();setSelected(item.id);changed();return}
 };window.addEventListener('keydown',key,{capture:true});const paste=e=>{if(state.view!=='boards'||e.target?.closest?.('input,textarea,[contenteditable]'))return;const files=Array.from(e.clipboardData?.items||[]).filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();loadImages(files);return}if(e.clipboardData?.getData('text/plain')&&!boardClipboard){e.preventDefault();pushBoardUndo();const item={id:uid(),type:'text',...centerNewPosition(),w:380,h:145,text:e.clipboardData.getData('text/plain')};activeBoard().elements.push(item);renderBoardElements();setSelected(item.id);changed()}};window.addEventListener('paste',paste);const cleanup=activeBoardCleanup;activeBoardCleanup=()=>{cleanup?.();window.removeEventListener('keydown',key,{capture:true});window.removeEventListener('paste',paste)};updateBoardHistoryButtons()};
const originalStartItemDrag=startItemDrag;startItemDrag=function(e,item,node,kind){pushBoardUndo();return originalStartItemDrag(e,item,node,kind)};
const originalAddBoardElement=addBoardElement;addBoardElement=function(...args){pushBoardUndo();return originalAddBoardElement(...args)};
const originalDeleteSelected=deleteSelected;deleteSelected=function(){if(selectedElement)pushBoardUndo();return originalDeleteSelected()};
const originalDuplicateSelected=duplicateSelected;duplicateSelected=function(){if(selectedElement)pushBoardUndo();return originalDuplicateSelected()};
const originalLoadImages=loadImages;loadImages=async function(...args){pushBoardUndo();return await originalLoadImages(...args)};

const originalOnAction=onAction;
onAction=async function(e){const btn=e.currentTarget,a=btn.dataset.action,p=activeProject();
 if(a==='desk'){changeView('desk');return}
 if(a==='choose-cover'){openCoverPicker(btn.dataset.id);return}
 if(a==='remove-cover'){const book=state.projects.find(x=>x.id===btn.dataset.id);if(book&&await m172Confirm('¿Quitar la portada de este libro?')){book.coverData=null;changed();render()}return}
 if(a==='toggle-category'){p.collapsedCategories=p.collapsedCategories||{};p.collapsedCategories[btn.dataset.view]=!p.collapsedCategories[btn.dataset.view];changed();renderSidebarOnly();return}
 if(a==='toggle-pin'||a==='toggle-flag'){const item=findTreeItem(btn.dataset.view,btn.dataset.id);if(!item)return;const key=a==='toggle-pin'?'pinned':'flagged';item[key]=!item[key];changed();renderSidebarOnly();return}
 if(a==='board-undo'){boardHistoryMove();return}
 if(a==='board-redo'){boardHistoryMove(true);return}
 if(a==='export-script'){exportCurrentScript();return}
 if(a==='board-tool'){return originalOnAction(e)}
 if(a==='open-project'){const book=state.projects.find(x=>x.id===btn.dataset.id);if(book){book.lastOpened=now();changed()}return originalOnAction(e)}
 if(a.startsWith('add-')){const map={"add-chapter":"manuscript","add-board":"boards","add-character":"characters","add-setting":"settings","add-outline":"outlines","add-note":"notes"};if(map[a]&&p){p.collapsedCategories=p.collapsedCategories||{};p.collapsedCategories[map[a]]=false}}
 return originalOnAction(e);
};
const originalWire=wire;
wire=function(){originalWire();let cover=el('file-cover');if(!cover){cover=document.createElement('input');cover.id='file-cover';cover.type='file';cover.accept='image/*';document.body.append(cover)}cover.onchange=async e=>{const file=e.target.files?.[0];if(file)await processCover(file)};
 const switcher=el('chapter-mode');if(switcher)switcher.onchange=e=>{const c=activeChapter();if(!c)return;c.mode=e.target.value;if(c.mode==='screenplay')c.html=normalizeScript(c.html);c.updatedAt=now();changed();render()};
 const picker=el('script-element-type');if(picker)picker.onchange=e=>setScriptType(e.target.value);
 if(state.view==='manuscript'&&activeChapter()?.mode==='screenplay'){const editor=el('chapter-editor');editor?.addEventListener('keydown',scriptKeyDown);editor?.addEventListener('keyup',()=>{const picker=el('script-element-type');if(picker)picker.value=currentScriptParagraph()?.dataset.script||'action'});editor?.addEventListener('click',()=>{const picker=el('script-element-type');if(picker)picker.value=currentScriptParagraph()?.dataset.script||'action'})}
};
const originalRenderSidebarOnly=renderSidebarOnly;
renderSidebarOnly=function(){originalRenderSidebarOnly();const color=el('book-icon-color');if(color)color.oninput=e=>{const p=activeProject();p.iconColor=e.target.value;changed();document.querySelector('.project-mini-icon')?.style.setProperty('color',e.target.value)};document.querySelectorAll('[data-entry-color]').forEach(input=>input.oninput=e=>{const item=findTreeItem(input.dataset.entryColor,input.dataset.id);if(item){item.iconColor=e.target.value;input.closest('.tree-entry')?.querySelector('.tree-icon')?.style.setProperty('color',e.target.value);changed()}})};

/* ==============================================================
   MARGEN 0.4 — fichas vivas, cronologías, sinonimia local y UX
   Compatible con la base de datos IndexedDB de MARGEN 0.3
   ============================================================== */
categoryLabels.splice(5,0,['chronologies','chronologies','Cronologías','clock','chronology']);
collections.chronologies='chronologies';
const m04PreviousEnsure=ensureSelections;
ensureSelections=function(){m04PreviousEnsure();for(const p of state.projects||[]){p.chronologies=Array.isArray(p.chronologies)?p.chronologies:[];for(const t of p.chronologies){t.events=Array.isArray(t.events)?t.events:[];}for(const person of p.characters||[]){person.gallery=Array.isArray(person.gallery)?person.gallery:[];person.arc=Array.isArray(person.arc)?person.arc:[];person.role=person.role??person.subtitle??'';person.background=person.background??person.content??'';person.age=person.age??'';person.birth=person.birth??'';person.birthPlace=person.birthPlace??'';person.occupation=person.occupation??'';person.physical=person.physical??'';person.personality=person.personality??'';person.motivation=person.motivation??'';person.conflict=person.conflict??'';} }const p=activeProject();if(p&&!p.chronologies.some(x=>x.id===state.activeChronologyId))state.activeChronologyId=p.chronologies[0]?.id||null;};
function activeChronology(){const p=activeProject();return p?.chronologies?.find(x=>x.id===state.activeChronologyId)||p?.chronologies?.[0]||null}
function charInput(label,key,person,placeholder='',kind='input'){const val=esc(person[key]??'');const id='char-'+key;return `<label class="char-field">${label}${kind==='textarea'?`<textarea id="${id}" data-char-field="${key}" placeholder="${esc(placeholder)}">${val}</textarea>`:`<input id="${id}" data-char-field="${key}" value="${val}" placeholder="${esc(placeholder)}">`}</label>`}
function arcHtml(p,person){return `<div class="arc-list">${person.arc.map((a,i)=>`<div class="arc-event" data-arc-id="${esc(a.id)}"><div class="arc-event-top"><label>Momento de evolución<input value="${esc(a.stage||'')}" data-arc-field="stage" data-arc-id="${esc(a.id)}" placeholder="Después de la traición..."></label><label>Capítulo<select data-arc-field="chapterId" data-arc-id="${esc(a.id)}"><option value="">Sin vincular</option>${p.chapters.map(c=>`<option value="${esc(c.id)}" ${a.chapterId===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label><button class="iconbtn" title="Eliminar momento" data-action="arc-delete" data-id="${esc(a.id)}">${ic('trash')}</button></div><label>¿Cómo cambia su personalidad, su objetivo o sus relaciones?<textarea rows="2" data-arc-field="change" data-arc-id="${esc(a.id)}" placeholder="Antes confiaba en todos; ahora...">${esc(a.change||'')}</textarea></label></div>`).join('')||'<p class="char-helper">Todavía no has añadido ninguna etapa de su evolución.</p>'}</div><button class="btn arc-add" data-action="arc-add">${ic('plus')} Añadir etapa</button>`}
const m04OldSheetHtml=sheetHtml;
sheetHtml=function(p,type){if(type!=='characters')return m04OldSheetHtml(p,type);const person=activeCharacter();const head=`<div class="workspace-head"><div><div class="eyebrow">${esc(p?.name)} · Personajes</div><h1>Ficha de personaje</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-character" ${person?'':'disabled'} title="Eliminar ficha">${ic('trash')}</button><button class="btn primary" data-action="add-character">${ic('plus')} Nuevo personaje</button></div></div>`;
if(!person)return head+`<div class="empty-state">${ic('users')}<h2>Da vida a tus personajes</h2><p>Guarda su aspecto, historia personal, imágenes de inspiración y cómo cambian a lo largo del libro.</p><button class="btn primary" data-action="add-character">${ic('plus')} Crear personaje</button></div>`;
const photos=person.gallery||[];const avatar=photos[0]?.src?`<img src="${esc(photos[0].src)}" alt="Imagen de inspiración de ${esc(person.title)}">`:esc(person.title.slice(0,1).toUpperCase());
return head+`<div class="main-scroll"><div class="char-page"><div id="fiche-body" hidden></div><div class="char-hero"><div class="char-avatar">${avatar}</div><div class="char-title-wrap"><span class="char-tag">${ic('users')} PERSONAJE</span><input class="note-title" id="fiche-title" value="${esc(person.title)}" placeholder="Nombre del personaje"><label class="field-mini">Papel en la historia<input id="fiche-subtitle" value="${esc(person.role??'')}" placeholder="Protagonista, antagonista, secundario..."></label></div></div><div class="char-grid"><section class="char-panel"><h3>${ic('users')} Datos básicos</h3><div class="char-duo">${charInput('Edad','age',person,'27')}${charInput('Nacimiento / fecha','birth',person,'1970, día 12...')}</div>${charInput('Lugar de nacimiento','birthPlace',person,'Ciudad, país o localidad')}${charInput('Ocupación / oficio','occupation',person,'Mecánico, profesora, músico...')}</section><section class="char-panel"><h3>${ic('image')} Galería de inspiración</h3><p class="char-helper">Hasta 16 imágenes por personaje. Los PNG conservan su transparencia. La primera aparecerá como imagen principal.</p><div class="char-gallery">${photos.map(photo=>`<div class="char-photo"><img alt="Referencia visual del personaje" src="${esc(photo.src)}"><button type="button" data-action="char-remove-photo" data-id="${esc(photo.id)}" title="Quitar esta imagen">✕</button></div>`).join('')}<button class="char-gallery-add" type="button" data-action="char-add-photos">${ic('plus')}<span>Más imágenes</span></button></div><input id="char-photos-input" hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple></section><section class="char-panel"><h3>${ic('feather')} Personalidad</h3>${charInput('Temperamento, virtudes, defectos, miedos','personality',person,'¿Qué lo distingue? ¿Qué lo hace enfadar o cambiar?', 'textarea')}${charInput('Deseos y motivaciones','motivation',person,'¿Qué quiere y por qué?', 'textarea')}</section><section class="char-panel"><h3>${ic('edit')} Rasgos físicos</h3>${charInput('Descripción física','physical',person,'Rostro, pelo, voz, forma de andar, gestos...', 'textarea')}${charInput('Conflicto interno o secreto','conflict',person,'¿Qué contradicción lleva consigo?', 'textarea')}</section><section class="char-panel wide"><h3>${ic('book')} Trasfondo</h3>${charInput('Historia anterior al libro','background',person,'Familia, infancia, episodios que le marcaron, relaciones...', 'textarea')}</section><section class="char-panel wide"><h3>${ic('clock')} Evolución por capítulos</h3><p class="char-helper">Añade momentos clave y, si quieres, relaciónalos con el capítulo donde ocurren. Puedes narrar su transformación sin poner fechas concretas.</p>${arcHtml(p,person)}</section></div></div></div>`;
};
function chronologyHtmlCard(p,e,i,total){const chapterOptions=`<option value="">Sin vincular</option>`+p.chapters.map(c=>`<option value="${esc(c.id)}" ${e.chapterId===c.id?'selected':''}>${esc(c.title)}</option>`).join('');const characterOptions=`<option value="">Sin vincular</option>`+p.characters.map(c=>`<option value="${esc(c.id)}" ${e.characterId===c.id?'selected':''}>${esc(c.title)}</option>`).join('');return `<div class="timeline-card" data-timeline-id="${esc(e.id)}"><div class="timeline-card-top"><span class="timeline-number">${String(i+1).padStart(2,'0')}</span><span class="subtle">Acontecimiento</span><div class="tool-actions"><button class="iconbtn" data-action="timeline-up" data-id="${esc(e.id)}" title="Mover arriba" ${i===0?'disabled':''}>${ic('up')}</button><button class="iconbtn" data-action="timeline-down" data-id="${esc(e.id)}" title="Mover abajo" ${i===total-1?'disabled':''}>${ic('down')}</button><button class="iconbtn" data-action="timeline-delete" data-id="${esc(e.id)}" title="Eliminar acontecimiento">${ic('trash')}</button></div></div><div class="two"><label>Momento o fecha<input data-timeline-field="date" data-event-id="${esc(e.id)}" placeholder="Día 1, 1983, tres meses después..." value="${esc(e.date||'')}"></label><label>Nombre del acontecimiento<input data-timeline-field="title" data-event-id="${esc(e.id)}" placeholder="Una noticia inesperada" value="${esc(e.title||'')}"></label></div><label>¿Qué sucede?<textarea rows="2" data-timeline-field="description" data-event-id="${esc(e.id)}" placeholder="Describe el evento y sus consecuencias...">${esc(e.description||'')}</textarea></label><div class="two"><label>Capítulo relacionado<select data-timeline-field="chapterId" data-event-id="${esc(e.id)}">${chapterOptions}</select></label><label>Personaje relacionado<select data-timeline-field="characterId" data-event-id="${esc(e.id)}">${characterOptions}</select></label></div></div>`}
function chronologiesHtml(p){const t=activeChronology();const head=`<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Cronologías</div><h1>Cronología</h1></div><div class="head-actions"><button class="btn ghost" data-action="timeline-delete-chronology" ${t?'':'disabled'} title="Eliminar cronología">${ic('trash')}</button><button class="btn primary" data-action="add-chronology">${ic('plus')} Nueva cronología</button></div></div>`;if(!t)return head+`<div class="empty-state">${ic('clock')}<h2>El tiempo de tu historia</h2><p>Organiza hechos antes, durante o después de tu novela. No necesitas fechas exactas; también sirven «Día 1» o «Diez años antes».</p><button class="btn primary" data-action="add-chronology">${ic('plus')} Crear cronología</button></div>`;return head+`<div class="main-scroll"><div class="chronology-page"><div class="chron-panel"><div class="chronology-head"><div><span class="eyebrow">LÍNEA DEL TIEMPO</span><input id="chron-title" class="note-title" value="${esc(t.title)}" placeholder="Nombre de la cronología"></div><span class="char-tag">${t.events.length} acontecimientos</span></div><p class="char-helper">Ordena los acontecimientos con las flechas, vincúlalos con un capítulo o personaje y utiliza fechas libres. El orden que establezcas es el que se mostrará, aunque todavía no hayas decidido cuándo ocurre cada cosa.</p><div class="timeline-list">${t.events.map((event,i)=>chronologyHtmlCard(p,event,i,t.events.length)).join('')||`<div class="chron-empty">Todavía no hay acontecimientos. Empieza con el primer gran momento de tu historia.</div>`}</div><button class="btn primary arc-add" data-action="timeline-add">${ic('plus')} Añadir acontecimiento</button></div></div></div>`}
const m04PrevChangeView=changeView;
changeView=function(view){if(view==='chronologies'){state.view=view;selectedElement=null;boardTool='select';changed();render();return}return m04PrevChangeView(view)};
const m04PrevSidebar=sidebarHtml;
sidebarHtml=function(p){const html=m04PrevSidebar(p);return html.replace(/<button class="tree-add-text"[^>]*>[\s\S]*?<\/button>/g,'')};
const m04PrevBook=bookHtml;
bookHtml=function(p){let html=m04PrevBook(p);const anchor='</div></div>';return html.replace('</div></div>',`</div></div>`).replace(/(<div class="book-dashboard">)/,`<p class="section-intro" style="font-size:12px">Incluye ${p.chronologies?.length||0} cronologías y ${p.characters.length} fichas de personaje.</p>$1`)};
const m04PrevDesk=deskHtml;
deskHtml=function(){let html=m04PrevDesk();html=html.replace('<div class="welcome-small">Próximamente: objetivos de escritura y notas rápidas entre libros.</div>','');const issues=[];for(const project of state.projects){for(const type of ['chapters','boards','characters','settings','outlines','chronologies'])for(const item of project[type]||[])if(item.flagged)issues.push({project,type,item});}if(issues.length){const viewType={chapters:'manuscript',boards:'boards',characters:'characters',settings:'settings',outlines:'outlines',chronologies:'chronologies'};html=html.replace('</div></div>',`</div></div>`);html=html.replace(/<\/div>\s*$/,`<div class="chron-panel" style="margin-top:24px"><h3>${ic('flag')} Elementos para revisar (${issues.length})</h3><div style="display:flex;flex-wrap:wrap;gap:7px">${issues.slice(0,15).map(x=>`<button class="btn" data-action="open-flagged" data-project="${esc(x.project.id)}" data-type="${esc(viewType[x.type])}" data-id="${esc(x.item.id)}">${esc(x.project.name)} · ${esc(x.item.title)}</button>`).join('')}</div></div></div>`)}return html};
const m04PrevManuscript=manuscriptHtml;
manuscriptHtml=function(p){let html=m04PrevManuscript(p);return html.replace('<div class="editor-toolbar">',`<div class="editor-toolbar"><button class="tool-btn" data-action="synonyms" id="synonyms-btn" title="Selecciona una palabra y consulta sinónimos sin internet">Sinónimos</button><span class="tool-divider"></span>`)};
const synonymStore={
 bonito:['hermoso','precioso','atractivo','bello'],hermoso:['bello','precioso','espléndido','radiante'],feo:['desagradable','deslucido','antiestético'],
 triste:['afligido','melancólico','abatido','desolado'],alegre:['jovial','contento','animado','gozoso'],feliz:['dichoso','satisfecho','radiante'],
 miedo:['temor','pavor','terror','inquietud'],temor:['miedo','recelo','aprensión'],amor:['cariño','afecto','devoción','pasión'],
 odio:['aversión','rencor','animadversión'],dolor:['sufrimiento','pesar','tormento','aflicción'],
 silencio:['quietud','mutismo','calma','sosiego'],oscuro:['sombrío','lóbrego','tenebroso','opaco'],
 luz:['claridad','resplandor','fulgor','brillo'],noche:['oscuridad','anochecer','madrugada'],día:['jornada','amanecer'],
 rápido:['veloz','ágil','ligero','presuroso'],lento:['pausado','moroso','sosegado'],
 extraño:['insólito','inusual','singular','raro'],raro:['singular','inusual','insólito'],
 grande:['enorme','vasto','inmenso','gigantesco'],pequeño:['diminuto','menudo','minúsculo'],
 viejo:['antiguo','añejo','envejecido'],nuevo:['reciente','novedoso','inédito'],
 fuerte:['robusto','firme','vigoroso','intenso'],débil:['frágil','tenue','endeble'],
 caminar:['andar','pasear','deambular','recorrer'],mirar:['observar','contemplar','examinar','atisbar'],
 decir:['expresar','afirmar','mencionar','manifestar'],hablar:['conversar','dialogar','charlar','comentar'],
 pensar:['reflexionar','meditar','considerar','cavilar'],sentir:['percibir','experimentar','notar','intuir'],
 querer:['desear','anhelar','amar','pretender'],buscar:['indagar','rastrear','explorar','procurar'],
 encontrar:['hallar','descubrir','localizar','toparse con'],recordar:['evocar','rememorar','tener presente'],
 olvidar:['omitir','relegar','dejar atrás'],esperar:['aguardar','confiar','permanecer a la espera'],
 comenzar:['empezar','iniciar','emprender','arrancar'],terminar:['finalizar','concluir','acabar','culminar'],
 voz:['tono','habla','timbre'],rostro:['cara','semblante','facciones'],ojos:['mirada','pupilas'],
 casa:['hogar','vivienda','morada'],ciudad:['urbe','metrópoli','localidad'],camino:['sendero','ruta','trayecto','senda'],
 lluvia:['llovizna','aguacero','precipitación'],viento:['brisa','vendaval','corriente de aire'],
 furioso:['iracundo','enfurecido','airado'],enfadado:['molesto','irritado','airado'],nervioso:['inquieto','tenso','agitado'],
 cansado:['agotado','exhausto','fatigado'],vacío:['deshabitado','hueco','desierto'],
 brillante:['luminoso','reluciente','resplandeciente'],suave:['delicado','tenue','sutil','aterciopelado'],
 importante:['esencial','relevante','fundamental','crucial'],misterio:['enigma','incógnita','secreto'],
 secreto:['confidencia','misterio','reserva'],pasado:['ayer','antaño','tiempo anterior'],futuro:['porvenir','mañana','destino']
};
let replacementRange=null;
function selectedWordRange(){const editor=el('chapter-editor'),sel=window.getSelection();if(!editor||!sel?.rangeCount)return null;const range=sel.getRangeAt(0).cloneRange();if(!editor.contains(range.commonAncestorContainer))return null;
if(!range.collapsed){const word=range.toString().trim();return /^\p{L}[\p{L}áéíóúüñ-]*$/u.test(word)?{range,word}:null}
const node=range.startContainer;if(node.nodeType!==3)return null;const text=node.textContent||'',at=range.startOffset;let a=at,b=at;while(a>0&&/[\p{L}áéíóúüñ]/u.test(text[a-1]))a--;while(b<text.length&&/[\p{L}áéíóúüñ]/u.test(text[b]))b++;if(a===b)return null;range.setStart(node,a);range.setEnd(node,b);return {range,word:text.slice(a,b)}}
function synonymPopup(){document.querySelector('.syn-popup')?.remove();const info=selectedWordRange();replacementRange=info?.range||null;const word=info?.word||'';const options=synonymStore[word.toLowerCase()]||[];const div=document.createElement('div');div.className='syn-popup';div.innerHTML=`<div class="syn-header"><h3 class="syn-title">Sinónimos ${word?'de «'+esc(word)+'»':''}</h3><button class="syn-close" title="Cerrar">✕</button></div>${!word?'<p class="char-helper">Selecciona una palabra en el capítulo o coloca el cursor dentro de ella.</p>':options.length?`<p class="char-helper">Pulsa una alternativa para sustituir la palabra seleccionada.</p><div class="syn-options">${options.map((x,i)=>`<button class="syn-option" data-syn-index="${i}">${esc(x)}</button>`).join('')}</div>`:`<p class="char-helper">La palabra «${esc(word)}» no figura en el pequeño diccionario incorporado.</p>`}<p class="char-helper">Diccionario local limitado: las alternativas pueden no encajar con el significado o la gramática de tu frase.</p>`;document.body.append(div);div.querySelector('.syn-close').onclick=()=>div.remove();div.querySelectorAll('[data-syn-index]').forEach(btn=>btn.onclick=()=>{if(!replacementRange)return;let syn=options[Number(btn.dataset.synIndex)];if(word[0]===word[0].toUpperCase())syn=syn[0].toUpperCase()+syn.slice(1);const editor=el('chapter-editor');editor.focus();replacementRange.deleteContents();const node=document.createTextNode(syn);replacementRange.insertNode(node);const r=document.createRange();r.setStartAfter(node);r.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);editor.dispatchEvent(new Event('input',{bubbles:true}));div.remove()})}
const m04PrevOnAction=onAction;
onAction=async function(e){const btn=e.currentTarget,a=btn.dataset.action,p=activeProject();if(a==='synonyms'){synonymPopup();return}
if(a==='open-flagged'){state.activeProjectId=btn.dataset.project;const type=btn.dataset.type;const key={manuscript:'activeChapterId',boards:'activeBoardId',characters:'activeCharacterId',settings:'activeSettingId',outlines:'activeOutlineId',chronologies:'activeChronologyId'}[type];if(key){state[key]=btn.dataset.id;changeView(type)}return}
if(a==='add-chronology'){if(!p)return;p.collapsedCategories=p.collapsedCategories||{};p.collapsedCategories.chronologies=false;modal({title:'Nueva cronología',description:'Puedes crear todas las que necesites en este libro.',fields:[{id:'title',label:'Nombre',placeholder:'Historia principal, antes del apagón...',required:true}],submit:'Crear',onSubmit:({title})=>{const id=uid();p.chronologies.push({id,title,events:[]});state.activeChronologyId=id;state.view='chronologies';changed();render()}});return}
if(a==='open-entry'&&btn.dataset.type==='chronologies'){state.activeChronologyId=btn.dataset.id;changeView('chronologies');return}
if(a==='timeline-delete-chronology'){const t=activeChronology();if(t&&await m172Confirm(`¿Eliminar «${t.title}» y sus acontecimientos?`)){p.chronologies=p.chronologies.filter(x=>x.id!==t.id);state.activeChronologyId=null;changed();render()}return}
if(a==='timeline-add'){const t=activeChronology();if(!t)return;const id=uid();t.events.push({id,title:'',date:'',description:'',chapterId:'',characterId:''});changed();render();document.querySelector(`[data-event-id="${id}"][data-timeline-field="title"]`)?.focus();return}
if(['timeline-delete','timeline-up','timeline-down'].includes(a)){const t=activeChronology();if(!t)return;const i=t.events.findIndex(x=>x.id===btn.dataset.id);if(i<0)return;if(a==='timeline-delete'){if(!await m172Confirm('¿Eliminar este acontecimiento?'))return;t.events.splice(i,1)}else if(a==='timeline-up'&&i>0){[t.events[i-1],t.events[i]]=[t.events[i],t.events[i-1]]}else if(a==='timeline-down'&&i<t.events.length-1){[t.events[i+1],t.events[i]]=[t.events[i],t.events[i+1]]}changed();render();return}
if(a==='arc-add'){const person=activeCharacter();if(!person)return;person.arc.push({id:uid(),stage:'',chapterId:'',change:''});changed();render();return}
if(a==='arc-delete'){const person=activeCharacter();if(!person||!await m172Confirm('¿Eliminar esta etapa de evolución?'))return;person.arc=person.arc.filter(x=>x.id!==btn.dataset.id);changed();render();return}
if(a==='char-add-photos'){el('char-photos-input')?.click();return}
if(a==='char-remove-photo'){const person=activeCharacter();if(person){person.gallery=person.gallery.filter(x=>x.id!==btn.dataset.id);changed();render()}return}
return m04PrevOnAction(e)};
const m04PrevWire=wire;
wire=function(){m04PrevWire();document.querySelectorAll('[data-entry-color]').forEach(input=>input.oninput=e=>{const item=findTreeItem(input.dataset.entryColor,input.dataset.id);if(item){item.iconColor=e.target.value;input.closest('.tree-entry')?.querySelector('.tree-icon')?.style.setProperty('color',e.target.value);changed()}});if(state.view==='chronologies'){const t=activeChronology();if(t){const title=el('chron-title');if(title){title.oninput=e=>{t.title=e.target.value;changed()};title.onblur=renderSidebarOnly}document.querySelectorAll('[data-timeline-field]').forEach(input=>{input.addEventListener(input.tagName==='SELECT'?'change':'input',e=>{const event=t.events.find(x=>x.id===input.dataset.eventId);if(event){event[input.dataset.timelineField]=input.value;changed()}})})}}
if(state.view==='characters'){const person=activeCharacter();if(person){const role=el('fiche-subtitle');if(role){role.oninput=e=>{person.role=e.target.value;person.subtitle=e.target.value;changed()}}document.querySelectorAll('[data-char-field]').forEach(input=>input.addEventListener('input',e=>{person[input.dataset.charField]=input.value;if(input.dataset.charField==='background')person.content=input.value;changed()}));document.querySelectorAll('[data-arc-field]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',e=>{const ev=person.arc.find(x=>x.id===input.dataset.arcId);if(ev){ev[input.dataset.arcField]=input.value;changed()}}));const file=el('char-photos-input');if(file)file.onchange=async e=>{const files=Array.from(e.target.files||[]);file.value='';if(!files.length)return;let added=0;for(const f of files){if(person.gallery.length>=16){showToast('Máximo de 16 imágenes por personaje');break}if(!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)||f.size>12*1024*1024){showToast('Utiliza imágenes de menos de 12 MB');continue}try{person.gallery.push({id:uid(),src:await compressImage(f)});added++;changed()}catch(err){console.error(err);showToast('No se ha podido importar una imagen')}}if(added){render();showToast(added+' imagen(es) incorporada(s)')}}}}
const syn=el('synonyms-btn');if(syn)syn.addEventListener('mousedown',e=>e.preventDefault());};

/* ==========================================================
  MARGEN 0.5 — edición, escenario, archivo y cronología.
  Todas las funciones son locales; sin modelos ni servicios de IA.
  La pizarra conserva su implementación de 0.4.
 ========================================================== */
const m05Ensure = ensureSelections;
ensureSelections = function(){
 m05Ensure();
 for(const p of state.projects||[]){
  p.trash = Array.isArray(p.trash)?p.trash:[];
  for(const place of p.settings||[])place.gallery=Array.isArray(place.gallery)?place.gallery:[];
  for(const ch of p.chapters||[]){ch.layout=ch.layout||{font:'Georgia',size:18,leading:'1.9',margin:60};}
  for(const timeline of p.chronologies||[])for(const event of timeline.events||[])if(typeof event.expanded!=='boolean')event.expanded=false;
 }
};

/* Árbol compacto. La papelera es recuperable, no borra los contenidos. */
const m05Views={manuscript:'chapters',boards:'boards',characters:'characters',settings:'settings',outlines:'outlines',chronologies:'chronologies'};
function archiveSectionLabel(type){return ({manuscript:'Capítulo',boards:'Pizarra',characters:'Personaje',settings:'Escenario',outlines:'Escaleta',chronologies:'Cronología',notes:'Nota antigua'})[type]||'Elemento'}
sidebarHtml = function(p){
 if(state.view==='desk'||state.view==='library')return `<div class="project-current"><div class="project-mini-icon">${ic(state.view==='desk'?'home':'grid')}</div><div class="project-current-text"><div class="project-current-name">${state.view==='desk'?'Escritorio':'Biblioteca'}</div><div class="project-current-sub">Tus historias a mano</div></div></div><div class="sidebar-scroll"><div class="sidebar-head"><span class="eyebrow">Libros</span><button class="mini-add" data-action="add-project" title="Nuevo libro">${ic('plus')}</button></div>${state.projects.map(x=>`<button class="sidebaritem" data-action="open-project" data-id="${esc(x.id)}"><span class="tree-icon">${ic('book')}</span><span class="truncate">${esc(x.name)}</span></button>`).join('')}</div><div class="sidebar-bottom">${state.projects.length} libros en tu biblioteca</div>`;
 p.collapsedCategories=p.collapsedCategories||{};p.trash=p.trash||[];
 const cats=[...categoryLabels, ['notes','notes','Archivo y papelera','trash','note']];
 const sections=cats.map(([view,array,label,icon,type])=>{
  const isArchive=view==='notes';const collapsed=!!p.collapsedCategories[view];
  const entries=isArchive?[...p.notes.map(n=>({...n,legacy:true})),...p.trash.map(r=>({id:r.item?.id||r.id,title:r.item?.title||'Sin título',archived:true}))]:[...(p[array]||[])].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));
  const selectedId={manuscript:state.activeChapterId,boards:state.activeBoardId,characters:state.activeCharacterId,settings:state.activeSettingId,outlines:state.activeOutlineId,chronologies:state.activeChronologyId,notes:state.activeNoteId}[view];
  return `<section class="tree-section ${collapsed?'is-collapsed':''}" data-section="${view}"><div class="tree-heading"><button class="tree-category" data-action="toggle-category" data-view="${view}" aria-expanded="${!collapsed}">${ic('chevron')}<span class="tree-icon muted-icon">${ic(icon)}</span><span>${label}</span><span class="tree-count category-count">${entries.length}</span></button>${isArchive?'':`<button class="mini-add" data-action="add-${type}" title="Crear ${label.toLowerCase()}">${ic('plus')}</button>`}</div><div class="tree-children">
  ${entries.map(item=>`<div class="tree-entry"><button class="sidebaritem tree-leaf ${state.view===view&&selectedId===item.id?'active':''}" data-action="${isArchive?'open-archive':'open-entry'}" data-type="${view}" data-id="${esc(item.id)}" title="${esc(item.title)}"><span class="tree-icon">${ic(item.archived?'trash':icon)}</span><span class="truncate">${esc(item.title)}</span>${item.pinned&&!isArchive?`<span class="pinned-mark" title="Fijado">${ic('pin')}</span>`:''}${item.flagged&&!isArchive?`<span class="flagged-mark" title="Para revisar">${ic('flag')}</span>`:''}</button>${isArchive?'':`<span class="entry-aux"><button class="entry-tool ${item.pinned?'is-pin':''}" data-action="toggle-pin" data-view="${view}" data-id="${esc(item.id)}" title="${item.pinned?'Desfijar':'Fijar arriba'}">${ic('pin')}</button><button class="entry-tool ${item.flagged?'is-flag':''}" data-action="toggle-flag" data-view="${view}" data-id="${esc(item.id)}" title="${item.flagged?'Desmarcar revisión':'Marcar en rojo para revisar'}">${ic('flag')}</button><button class="entry-tool" data-action="archive-item" data-view="${view}" data-id="${esc(item.id)}" title="Mover al archivo (recuperable)">${ic('trash')}</button></span>`}</div>`).join('')}</div></section>`;
 }).join('');
 return `<div class="project-current"><div class="project-mini-icon">${ic('book')}</div><div class="project-current-text"><div class="project-current-name" title="${esc(p.name)}">${esc(p.name)}</div><div class="project-current-sub">${projectWords(p)} palabras</div></div><button class="iconbtn" data-action="edit-project" title="Editar libro">${ic('rename')}</button></div><div class="sidebar-scroll"><button class="sidebaritem ${state.view==='book'?'active':''}" data-action="book-home">${ic('grid')}<span class="truncate">Vista general</span></button>${sections}</div><div class="sidebar-bottom"><button class="btn ghost" data-action="library">${ic('back')} Biblioteca</button><button class="btn ghost" data-action="delete-project" style="color:var(--danger)">Eliminar libro</button></div>`;
};

/* Página para recuperar o destruir expresamente elementos archivados. */
notesHtml = function(p){
 const originalNotes=p.notes||[];const archived=p.trash||[];const oldNote=activeNote();
 return `<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Organización</div><h1>Archivo y papelera</h1></div></div><div class="main-scroll"><div class="archive-page"><p class="archive-intro">Aquí se guardan las notas antiguas y las fichas, capítulos, pizarras y demás elementos que envíes al archivo. Los elementos archivados pueden restaurarse; nada se borra hasta que elijas <b>Eliminar definitivamente</b>.</p>
 ${originalNotes.map(x=>`<div class="archive-card"><div class="archive-info"><strong>${esc(x.title)}</strong><small>Nota antigua · conservada de versiones anteriores</small></div><div class="archive-actions"><button class="btn" data-action="open-old-note" data-id="${esc(x.id)}">Ver nota</button></div></div>`).join('')}
 ${archived.map(r=>`<div class="archive-card"><div class="archive-info"><strong>${esc(r.item?.title||'Sin título')}</strong><small>${esc(archiveSectionLabel(r.type))} · archivado ${esc((r.at||'').slice(0,10))}</small></div><div class="archive-actions"><button class="btn" data-action="restore-item" data-id="${esc(r.id)}">${ic('back')} Restaurar</button><button class="btn ghost" data-action="purge-item" data-id="${esc(r.id)}" style="color:var(--danger)">${ic('trash')} Eliminar definitivamente</button></div></div>`).join('')}
 ${!originalNotes.length&&!archived.length?'<div class="empty-state"><h2>El archivo está vacío</h2><p>Lo que apartes de un libro aparecerá aquí, listo para recuperarse.</p></div>':''}<div id="legacy-note-holder" hidden><input id="note-title" value="${esc(oldNote?.title||'')}"><div id="note-body" contenteditable="true">${esc(oldNote?.content||'')}</div></div></div></div>`;
};

const m05PrevOnAction=onAction;
onAction=async function(e){
 const b=e.currentTarget,action=b.dataset.action,p=activeProject();
 if(action==='open-archive'){state.view='notes';changed();render();return}
 if(action==='archive-item'){
  const type=b.dataset.view,arr=m05Views[type],item=p?.[arr]?.find(x=>x.id===b.dataset.id);
  if(!arr||!item)return;
  if(!await m172Confirm(`¿Mover «${item.title}» al archivo? Puedes restaurarlo después.`))return;
  p.trash=p.trash||[];p.trash.push({id:uid(),type,item:JSON.parse(JSON.stringify(item)),at:now()});p[arr]=p[arr].filter(x=>x.id!==item.id);
  p.collapsedCategories.notes=false;state.view='notes';changed();render();showToast('Elemento archivado');return;
 }
 if(action==='restore-item'){
  const r=p?.trash.find(x=>x.id===b.dataset.id);if(!r)return;
  const arr=m05Views[r.type];if(!arr)return;
  if(!p[arr].some(x=>x.id===r.item.id))p[arr].push(r.item);
  p.trash=p.trash.filter(x=>x.id!==r.id);p.collapsedCategories[r.type]=false;
  changed();render();showToast('Elemento recuperado');return;
 }
 if(action==='purge-item'){
  const r=p?.trash.find(x=>x.id===b.dataset.id);if(!r||!await m172Confirm(`¿Eliminar definitivamente «${r.item?.title}»? Esta acción no se puede deshacer.`))return;
  p.trash=p.trash.filter(x=>x.id!==r.id);changed();render();return;
 }
 if(action==='open-old-note'){
  const n=p?.notes.find(x=>x.id===b.dataset.id);if(!n)return;
  modal({title:'Nota antigua · '+n.title,description:'Puedes consultar esta nota conservada de versiones anteriores.',fields:[{id:'content',label:'Contenido',value:n.content||'',multiline:true}],submit:'Guardar cambios',onSubmit:({content})=>{n.content=content;changed();render()}});return;
 }
 if(action==='synonyms'){synonymPopup();return}
 if(action==='timeline-add'){
  const t=activeChronology();if(!t)return;
  const id=uid();t.events.push({id,title:'',date:'',description:'',chapterId:'',characterId:'',expanded:true});changed();render();document.querySelector(`[data-event-id="${id}"][data-timeline-field="title"]`)?.focus();return;
 }
 if(action==='scenario-add-photos'){el('scenario-photos-input')?.click();return}
 if(action==='scenario-remove-photo'){
  const s=activeSetting();if(!s)return;s.gallery=s.gallery.filter(x=>x.id!==b.dataset.id);changed();render();return;
 }
 if(action==='text-format'){
  const editor=el('chapter-editor');editor?.focus();document.execCommand(b.dataset.format,false,b.dataset.value||null);editor?.dispatchEvent(new Event('input',{bubbles:true}));return;
 }
 return m05PrevOnAction(e);
};

/* Cronología con resúmenes compactos, plegables y estado recordado. */
chronologyHtmlCard=function(p,event,i,total){
 const options=(items,key)=>`<option value="">Sin vincular</option>${items.map(x=>`<option value="${esc(x.id)}" ${event[key]===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}`;
 return `<details class="timeline-card compact" data-timeline-id="${esc(event.id)}" ${event.expanded?'open':''}>
 <summary><span class="timeline-caret">${ic('chevron')}</span><span class="timeline-number">${String(i+1).padStart(2,'0')}</span><span class="timeline-summary"><strong>${esc(event.title||'Acontecimiento sin título')}</strong><small>${esc(event.date||'Sin fecha')} ${event.description?'· '+esc(event.description.slice(0,75)):''}</small></span><div class="tool-actions"><button class="iconbtn" data-action="timeline-up" data-id="${esc(event.id)}" title="Subir" ${i===0?'disabled':''}>${ic('up')}</button><button class="iconbtn" data-action="timeline-down" data-id="${esc(event.id)}" title="Bajar" ${i===total-1?'disabled':''}>${ic('down')}</button><button class="iconbtn" data-action="timeline-delete" data-id="${esc(event.id)}" title="Eliminar">${ic('trash')}</button></div></summary>
 <div class="timeline-content"><div class="two"><label>Momento o fecha<input data-timeline-field="date" data-event-id="${esc(event.id)}" placeholder="Día 1, otoño, tres meses después..." value="${esc(event.date||'')}"></label><label>Nombre del acontecimiento<input data-timeline-field="title" data-event-id="${esc(event.id)}" placeholder="Una noticia inesperada" value="${esc(event.title||'')}"></label></div><label>¿Qué sucede?<textarea rows="3" data-timeline-field="description" data-event-id="${esc(event.id)}" placeholder="Describe el acontecimiento...">${esc(event.description||'')}</textarea></label><div class="two"><label>Capítulo relacionado<select data-timeline-field="chapterId" data-event-id="${esc(event.id)}">${options(p.chapters,'chapterId')}</select></label><label>Personaje relacionado<select data-timeline-field="characterId" data-event-id="${esc(event.id)}">${options(p.characters,'characterId')}</select></label></div></div></details>`;
};

/* Escenarios: galería visual independiente, sin tocar los personajes. */
const m05PreviousSheetHtml=sheetHtml;
sheetHtml=function(p,type){
 const html=m05PreviousSheetHtml(p,type);if(type!=='settings'||!activeSetting())return html;
 const s=activeSetting(),photos=s.gallery||[];
 const gallery=`<section class="gallery-scene"><h3>${ic('image')} Galería de inspiración</h3><p class="char-helper">Imágenes del lugar: exteriores, interiores, mapas y referencias visuales. Hasta 16. Los PNG mantienen su transparencia.</p><div class="char-gallery">${photos.map(photo=>`<div class="char-photo"><img alt="Inspiración para el escenario" src="${esc(photo.src)}"><button data-action="scenario-remove-photo" data-id="${esc(photo.id)}" title="Quitar imagen">✕</button></div>`).join('')}<button class="char-gallery-add" data-action="scenario-add-photos">${ic('plus')}<span>Añadir imágenes</span></button></div><input id="scenario-photos-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></section>`;
 const anchor='<div id="fiche-body"';const at=html.indexOf(anchor);if(at<0)return html;
 const close=html.indexOf('</div>',at);if(close<0)return html;
 return html.slice(0,close+6)+gallery+html.slice(close+6);
};

/* Editor literario: tipografía, tamaño, márgenes, interlineado y alineación. */
const m05PrevManuscript=manuscriptHtml;
manuscriptHtml=function(p){
 let html=m05PrevManuscript(p);const c=activeChapter();if(!c)return html;
 const l=c.layout||{font:'Georgia',size:18,leading:'1.9',margin:60};
 if(c.mode==='screenplay')return html;
 const fontOptions=[['Georgia','Georgia'],['Times New Roman','Times New Roman'],['Cambria','Cambria'],['Garamond','Garamond'],['Palatino Linotype','Palatino'],['Segoe UI','Segoe UI'],['Arial','Arial'],['Verdana','Verdana'],['Courier New','Courier New']];
 const opts=(items,v)=>items.map(([value,label])=>`<option value="${esc(value)}" ${String(v)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
 const settings=`<div class="prose-settings">
 <label>Fuente<select id="chapter-font">${opts(fontOptions,l.font||'Georgia')}</select></label>
 <label>Tamaño <input id="chapter-size" type="number" min="11" max="32" step="1" value="${Number(l.size)||18}"></label>
 <label>Interlineado<select id="chapter-leading">${opts([['1.2','1,2'],['1.5','1,5'],['1.75','1,75'],['1.9','1,9'],['2','2'],['2.3','2,3']],l.leading||'1.9')}</select></label>
 <label>Márgenes<select id="chapter-margin">${opts([['32','Estrechos'],['48','Medios'],['60','Normales'],['82','Amplios'],['100','Muy amplios']],String(l.margin||60))}</select></label>
 <span class="format-group" title="Alineación"><button class="tool-btn" data-action="text-format" data-format="justifyLeft" title="Izquierda">${ic('align-left')}</button><button class="tool-btn" data-action="text-format" data-format="justifyCenter" title="Centrar">${ic('align-center')}</button><button class="tool-btn" data-action="text-format" data-format="justifyRight" title="Derecha">${ic('align-right')}</button><button class="tool-btn" data-action="text-format" data-format="justifyFull" title="Justificar">${ic('align-justify')}</button></span>
 <span class="format-group"><button class="tool-btn" data-action="text-format" data-format="insertOrderedList" title="Lista numerada">${ic('list')}</button><button class="tool-btn" data-action="text-format" data-format="indent" title="Aumentar sangría">${ic('right')}</button><button class="tool-btn" data-action="text-format" data-format="outdent" title="Reducir sangría">${ic('back')}</button></span></div>`;
 html=html.replace('<div class="editor-toolbar">','<div class="editor-toolbar">'+settings);
 html=html.replace('<div class="editor-area ',`<div class="editor-area `); // los valores se aplican al área entera (sin sobrescribir el contenido)
 const safeFont=(l.font||'Georgia').replace(/[<>"']/g,'');const fontValue=`"${safeFont}",serif`;
 const style=`style="--chapter-font:${esc(fontValue)};--chapter-size:${Math.max(11,Math.min(32,Number(l.size)||18))}px;--chapter-leading:${Math.max(1.2,Math.min(2.3,Number(l.leading)||1.9))};--chapter-margin:${Math.max(32,Math.min(100,Number(l.margin)||60))}px"`;
 html=html.replace('class="editor-area ',`${style} class="editor-area `);
 return html;
};

/* Diccionario de uso general, independiente del contexto. */
const m05DictionaryRaw=`canción|melodía,tema,composición musical,tonada,cantiga
música|melodía,armonía,sonido,composición
melodía|tonada,aire,canción,cantilena
sonido|ruido,eco,resonancia,sonoridad
ruido|estrépito,alboroto,bullicio,fragor
silencio|mutismo,quietud,calma,sosiego
palabra|vocablo,término,expresión,voz
frase|oración,enunciado,locución
texto|escrito,documento,redacción
escribir|redactar,componer,anotar,plasmar
leer|examinar,interpretar,repasar
libro|obra,volumen,publicación,ejemplar
historia|relato,narración,crónica,cuento
cuento|relato,narración,fábula,historia
novela|relato,ficción,narración
poema|verso,composición,poesía
personaje|protagonista,figura,individuo
protagonista|personaje principal,héroe,figura central
escena|secuencia,pasaje,episodio
capítulo|apartado,sección,episodio
final|desenlace,conclusión,término,cierre
principio|inicio,comienzo,origen
inicio|principio,comienzo,arranque
momento|instante,rato,ocasión
instante|momento,segundo,breve lapso
tiempo|época,periodo,lapso,transcurso
recuerdo|memoria,reminiscencia,evocación
memoria|recuerdo,remembranza,retentiva
olvido|desmemoria,omisión,descuido
sueño|ensueño,anhelo,ilusión,descanso
pesadilla|mal sueño,angustia,visión aterradora
idea|ocurrencia,pensamiento,concepto,propuesta
pensamiento|idea,reflexión,consideración
imaginación|fantasía,inventiva,creatividad
fantasía|imaginación,quimera,ensoñación
creatividad|inventiva,imaginación,ingenio
inspiración|estímulo,impulso,iluminación
belleza|hermosura,gracia,atractivo
hermoso|bello,precioso,agraciado
bonito|bello,hermoso,precioso,lindo
feo|desagradable,antiestético,deslucido
precioso|hermoso,bello,espléndido
lindo|bonito,agraciado,encantador
triste|melancólico,afligido,abatido,desolado
tristeza|melancolía,pena,aflicción,pesar
melancolía|nostalgia,tristeza,añoranza
nostalgia|añoranza,melancolía,morriña
alegre|contento,jovial,animado
alegría|júbilo,gozo,contento,felicidad
feliz|dichoso,contento,afortunado
felicidad|dicha,bienestar,alegría
amor|afecto,cariño,ternura,pasión
amar|querer,adorar,venerar,apreciar
cariño|afecto,ternura,apego
ternura|dulzura,delicadeza,cariño
pasión|ardor,vehemencia,entusiasmo
odio|aversión,rencor,animadversión
odiar|aborrecer,detestar,repudiar
rencor|resentimiento,animadversión,aversión
miedo|temor,pavor,terror,aprensión
temor|miedo,recelo,aprensión
terror|pánico,espanto,pavor
pánico|terror,espanto,miedo
inquietud|desasosiego,preocupación,nerviosismo
ansiedad|inquietud,desazón,angustia
angustia|aflicción,congoja,desazón
pena|tristeza,pesar,aflicción
llanto|lloro,sollozo,lagrimeo
lágrima|gota de llanto,lloro
sonrisa|gesto alegre,risa leve
risa|carcajada,hilaridad,risotada
rabia|ira,furia,enojo
ira|cólera,rabia,furia
furia|rabia,ira,vehemencia
furioso|airado,iracundo,enfurecido
enfadado|molesto,irritado,airado
nervioso|inquieto,tenso,agitado
tranquilo|sereno,sosegado,calmado
calma|serenidad,quietud,sosiego
paz|tranquilidad,calma,armonía
sereno|calmado,tranquilo,ecuánime
inseguro|indeciso,dubitativo,temeroso
seguro|fiable,cierto,firme
valiente|audaz,intrépido,osado
cobarde|miedoso,pusilánime,temeroso
fuerte|robusto,vigoroso,intenso,firme
débil|frágil,endeble,tenue
frágil|delicado,quebradizo,vulnerable
suave|delicado,tenue,sutil,blando
duro|rígido,firme,resistente
áspero|rugoso,brusco,desagradable
amable|afable,cortés,cordial
cruel|despiadado,implacable,inhumano
bueno|bondadoso,positivo,adecuado
malo|perjudicial,desfavorable,negativo
mejor|superior,preferible,más adecuado
peor|inferior,más desfavorable
extraño|raro,insólito,singular,inusual
raro|extraño,inusual,insólito
común|frecuente,habitual,ordinario
normal|habitual,corriente,común
especial|singular,particular,distintivo
único|exclusivo,irrepetible,singular
importante|esencial,trascendental,relevante
necesario|imprescindible,indispensable,requerido
urgente|apremiante,inmediato,perentorio
simple|sencillo,elemental,modesto
complejo|complicado,intrincado,elaborado
difícil|complicado,arduo,complejo
fácil|sencillo,simple,asequible
claro|evidente,nítido,luminoso
oscuro|sombrío,lóbrego,tenebroso
luz|claridad,resplandor,brillo
sombra|penumbra,oscuridad,silueta
noche|oscuridad,anochecer,madrugada
día|jornada,fecha
mañana|alborada,amanecer,temprano
tarde|atardecer,ocaso,anochecer
amanecer|alba,alborada,aurora
atardecer|ocaso,crepúsculo,puesta de sol
ocaso|atardecer,crepúsculo,declive
sol|astro rey,estrella
luna|satélite,astro nocturno
estrella|astro,lucero
cielo|firmamento,bóveda celeste
nube|nubarrón,masa nubosa
lluvia|aguacero,llovizna,precipitación
llovizna|lluvia fina,orvallo,calabobos
viento|brisa,aire,vendaval
brisa|aire,ventolina,viento suave
tormenta|temporal,tempestad,borrasca
trueno|estruendo,retumbo
relámpago|destello,centella,fulgor
fuego|llama,lumbre,incendio
llama|fuego,lengua de fuego
agua|líquido,agua corriente
río|corriente,curso de agua
mar|océano,masa marina
playa|arenal,costa,orilla
bosque|arboleda,selva,monte
árbol|planta leñosa,ejemplar arbóreo
flor|brote,floración
hoja|follaje,lámina vegetal
montaña|monte,cumbre,sierra
valle|hondonada,depresión,llanura entre montes
camino|sendero,ruta,vereda
sendero|camino,senda,vereda
carretera|vía,calzada,autovía
calle|vía,calzada,paseo
ciudad|urbe,metrópoli,localidad
pueblo|villa,aldea,localidad
casa|hogar,vivienda,morada
hogar|casa,morada,domicilio
habitación|cuarto,estancia,aposento
puerta|entrada,acceso,portón
ventana|vano,abertura,ventanal
jardín|vergel,huerto,parterre
paisaje|panorama,vista,entorno
lugar|sitio,espacio,paraje
sitio|lugar,posición,paraje
viaje|trayecto,recorrido,travesía
viajar|desplazarse,recorrer,trasladarse
ir|acudir,dirigirse,marchar
venir|acudir,llegar,aproximarse
caminar|andar,pasear,deambular
andar|caminar,marchar,pasear
correr|sprintar,trotar,apresurarse
huir|escapar,escabullirse,fugarse
escapar|huir,evadirse,fugarse
llegar|arribar,alcanzar,presentarse
salir|partir,marcharse,abandonar
entrar|acceder,ingresar,penetrar
subir|ascender,elevarse,trepar
bajar|descender,caer,reducirse
caer|desplomarse,precipitarse,tropezar
levantar|alzar,elevar,incorporar
abrir|destapar,desplegar,inaugurar
cerrar|clausurar,concluir,tapar
romper|quebrar,partir,fracturar
unir|juntar,enlazar,combinar
separar|apartar,dividir,distanciar
crear|inventar,producir,elaborar
hacer|realizar,efectuar,ejecutar
construir|edificar,levantar,erigir
destruir|arruinar,demoler,devastar
cambiar|modificar,transformar,alterar
transformar|convertir,modificar,metamorfosear
crecer|aumentar,desarrollarse,expandirse
menguar|disminuir,reducirse,decrecer
aumentar|incrementar,elevar,ampliar
reducir|disminuir,acortar,limitar
buscar|indagar,rastrear,explorar
hallar|encontrar,descubrir,localizar
encontrar|hallar,descubrir,localizar
perder|extraviar,malograr,desperdiciar
guardar|conservar,almacenar,reservar
esconder|ocultar,disimular,encubrir
ocultar|esconder,encubrir,disimular
mostrar|enseñar,exhibir,revelar
mirar|observar,contemplar,atisbar
observar|mirar,contemplar,examinar
ver|mirar,divisar,observar
escuchar|oír,atender,prestar oído
oír|escuchar,percibir,enterarse
hablar|conversar,dialogar,charlar
decir|expresar,manifestar,afirmar
contar|narrar,relatar,referir
preguntar|interrogar,consultar,cuestionar
responder|contestar,replicar,reaccionar
gritar|vociferar,clamar,chillar
susurrar|murmurar,hablar bajo,bisbisear
murmurar|musitar,susurrar,mascullar
callar|silenciar,guardar silencio,enmudecer
pensar|reflexionar,meditar,cavilar
reflexionar|meditar,considerar,deliberar
sentir|percibir,experimentar,notar
saber|conocer,entender,dominar
conocer|saber,identificar,entender
creer|opinar,pensar,suponer
entender|comprender,captar,asimilar
comprender|entender,asimilar,interpretar
recordar|evocar,rememorar,traer a la memoria
olvidar|desatender,omitir,relegar
imaginar|fantasear,concebir,figurar
inventar|idear,crear,ingeniar
querer|desear,amar,anhelar
desear|anhelar,ansiar,apetecer
anhelar|desear,ansiar,suspirar por
necesitar|requerir,precisar,carecer de
esperar|aguardar,confiar,permanecer a la espera
aguardar|esperar,permanecer,confiar en
comenzar|iniciar,empezar,emprender
empezar|comenzar,iniciar,arrancar
terminar|finalizar,concluir,acabar
acabar|terminar,concluir,rematar
seguir|continuar,proseguir,perseverar
continuar|seguir,proseguir,mantenerse
parar|detener,cesar,frenar
detener|parar,interrumpir,frenar
ayudar|auxiliar,asistir,apoyar
cuidar|atender,proteger,velar por
proteger|defender,amparar,resguardar
defender|proteger,amparar,sostener
atacar|agredir,acometer,arremeter
luchar|combatir,pelear,batallar
pelear|luchar,combatir,discutir
vencer|derrotar,superar,triunfar
perder|extraviar,malograr,desaprovechar
fracasar|fallar,malograrse,errar
triunfar|vencer,prosperar,imponerse
vivir|existir,residir,subsistir
morir|fallecer,perecer,expirar
nacer|venir al mundo,surgir,originarse
respirar|inhalar,aspirar,tomar aire
sonreír|esbozar una sonrisa,sonreír levemente
llorar|sollozar,gimotear,derramar lágrimas
reír|carcajearse,soltar una carcajada
sufrir|padecer,soportar,aguantar
doler|lastimar,molestar,atormentar
curar|sanar,restablecer,remediar
sanar|curar,recuperarse,mejorar
cuerpo|organismo,figura,físico
rostro|cara,semblante,facciones
cara|rostro,semblante,faz
mirada|vistazo,observación,ojos
ojos|mirada,pupilas
mano|palma,extremidad
piel|cutis,epidermis
cabello|pelo,melena,cabellera
pelo|cabello,melena,hebras
voz|timbre,habla,tono
corazón|pecho,ánimo,centro emocional
mente|intelecto,entendimiento,pensamiento
alma|espíritu,esencia,ánimo
espíritu|alma,ánimo,aliento
vida|existencia,biografía,vivencia
muerte|fallecimiento,defunción,fin
familia|parentela,hogar,linaje
madre|progenitora,mamá
padre|progenitor,papá
hermano|familiar,hermano de sangre
amigo|compañero,camarada,confidente
amistad|camaradería,afecto,compañerismo
compañero|colega,camarada,amigo
soledad|aislamiento,desamparo,solitud
soportar|aguantar,resistir,tolerar
resistir|soportar,aguantar,oponerse
libre|independiente,emancipado,suelto
libertad|independencia,autonomía,emancipación
prisión|cárcel,encierro,penitenciaría
encierro|reclusión,aislamiento,confinamiento
secreto|misterio,confidencia,reserva
misterio|enigma,incógnita,arcano
enigma|misterio,acertijo,incógnita
verdad|certeza,realidad,autenticidad
mentira|falsedad,embuste,engaño
mentir|engañar,faltar a la verdad,embaucar
engañar|embaucar,estafar,inducir a error
confiar|creer,fiarse,depositar confianza
desconfiar|recelar,dudar,sospechar
sospechar|recelar,desconfiar,presumir
dudar|vacilar,titubear,cuestionar
señal|indicio,marca,indicación
pista|indicio,rastro,huella
rastro|huella,vestigio,marca
huella|marca,rastro,impronta
mensaje|recado,comunicación,nota
carta|misiva,epístola,escrito
noticia|información,novedad,anuncio
fotografía|foto,imagen,instantánea
foto|fotografía,instantánea,imagen
imagen|figura,representación,estampa
color|tono,matiz,tinte
rojo|escarlata,carmesí,bermejo
azul|añil,celeste,azur
verde|esmeralda,verdoso
blanco|níveo,albo,pálido
negro|oscuro,azabache,tenebroso
amarillo|dorado,amarillento,ocre
rosa|rosado,sonrosado
naranja|anaranjado,ámbar
marrón|castaño,pardo,terroso
gris|ceniciento,plomizo,apagado
luminoso|brillante,resplandeciente,radiante
brillante|reluciente,luminoso,resplandeciente
opaco|mate,apagado,turbio
pequeño|diminuto,menudo,minúsculo
grande|enorme,inmenso,vasto
gigante|coloso,enorme,titán
alto|elevado,encumbrado,esbelto
bajo|reducido,corto,inferior
ancho|amplio,extenso,holgado
estrecho|angosto,reducido,ajustado
largo|extenso,prolongado,dilatado
corto|breve,reducido,escaso
breve|corto,conciso,escueto
rápido|veloz,ágil,raudo
lento|pausado,moroso,sosegado
ligero|leve,suave,rápido
pesado|voluminoso,denso,gravoso
profundo|hondo,intenso,penetrante
superficial|somero,leve,externo
viejo|antiguo,añejo,envejecido
antiguo|viejo,remoto,arcaico
nuevo|reciente,novedoso,inédito
moderno|actual,contemporáneo,reciente
lejano|distante,remoto,apartado
cercano|próximo,contiguo,vecino
cerca|próximo,a poca distancia
lejos|distante,remoto,apartado
vacío|desocupado,hueco,desierto
lleno|repleto,colmado,ocupado
sencillo|simple,fácil,modesto
complicado|complejo,intrincado,enrevesado
herida|lesión,corte,llaga
herir|lastimar,dañar,lesionar
cicatriz|señal,marca,huella
error|fallo,equivocación,desacierto
fallo|error,defecto,equivocación
problema|dificultad,contratiempo,inconveniente
solución|respuesta,remedio,arreglo
reto|desafío,prueba,desvelo
meta|objetivo,propósito,fin
objetivo|meta,propósito,finalidad
plan|proyecto,programa,estrategia
proyecto|plan,iniciativa,empresa
orden|organización,disposición,mandato
caos|desorden,confusión,desbarajuste
cambio|transformación,modificación,alteración
avance|progreso,adelanto,mejora
retroceso|reculada,regresión,atraso
fuerza|energía,potencia,vigor
deseo|anhelo,aspiración,ansia
esperanza|ilusión,confianza,expectativa
éxito|triunfo,logro,victoria
fracaso|fiasco,derrota,reveses
peligro|riesgo,amenaza,azar
riesgo|peligro,amenaza,contingencia
amenaza|advertencia,intimidación,peligro
promesa|compromiso,juramento,palabra
juramento|promesa,voto,compromiso
sorpresa|asombro,impresión,desconcierto
asombro|sorpresa,admiración,estupefacción
perdón|disculpa,indulgencia,absolución
culpa|responsabilidad,remordimiento,causa
remordimiento|culpa,arrepentimiento,pesar
justicia|equidad,imparcialidad,legalidad
injusticia|atropello,abuso,iniquidad
búsqueda|indagación,rastreo,exploración
encuentro|reunión,hallazgo,coincidencia
despedida|adiós,separación,marcha
abrazo|achuchón,estrechamiento,acogida
beso|ósculo,caricia de labios
caricia|roce,contacto,mimo
mirar|observar,contemplar,atisbar
bailar|danzar,moverse al ritmo
cantar|entonar,interpretar,tararear
silbar|pitar,chiflar,emitir un silbido
escuchar|oír,atender,prestar oído
quieto|inmóvil,parado,estático
inmóvil|quieto,estático,impasible
movimiento|desplazamiento,acción,agitación
suceder|ocurrir,acontecer,pasar
ocurrir|suceder,acontecer,producirse
ocultar|esconder,disimular,encubrir
iluminar|alumbrar,aclarar,encender
oscurecer|entenebrecer,ensombrecer,opacar
perfume|fragancia,aroma,esencia
olor|aroma,fragancia,hedor
aroma|fragancia,perfume,olor
sabor|gusto,paladar,regusto
comida|alimento,manjar,vianda
alimento|comida,sustento,nutriente
vino|caldo,mosto fermentado
café|infusión de café,bebida de café
espejo|luna,cristal reflectante
reloj|cronómetro,medidor del tiempo
fotograma|imagen fija,cuadro de película
película|filme,cinta,largometraje
cine|cinematografía,séptimo arte
teatro|escena,arte dramático
actor|intérprete,artista
actriz|intérprete,artista
actuar|interpretar,representar,encarnar
interpretar|representar,comprender,descifrar
guion|libreto,texto dramático
escaleta|estructura,plan de escenas,esquema
escenario|decorado,localización,ambiente
localización|lugar,ubicación,emplazamiento
ambientación|atmósfera,entorno,escenografía
atmósfera|ambiente,clima,aire
clima|ambiente,tiempo atmosférico
estación|época del año,temporada,parada
época|periodo,era,tiempo
pasado|antaño,tiempo anterior,ayer
presente|actualidad,hoy,tiempo actual
futuro|porvenir,mañana,tiempo venidero`;
for(const line of m05DictionaryRaw.split('\n')){const ix=line.indexOf('|');if(ix<1)continue;synonymStore[line.slice(0,ix).trim()]=line.slice(ix+1).split(',').map(x=>x.trim()).filter(Boolean)}
function synonymPopup(){
 document.querySelector('.syn-popup')?.remove();const word=selectedWordRange()?.word||'';
 const div=document.createElement('div');div.className='syn-popup';
 div.innerHTML=`<div class="syn-header"><h3 class="syn-title">Diccionario de sinónimos</h3><button class="syn-close" title="Cerrar">✕</button></div><p class="char-helper">Escribe cualquier palabra. No se analiza el contexto ni se modifica tu texto.</p><input class="syn-search" id="syn-search" type="search" value="${esc(word)}" placeholder="Ejemplo: canción" autocomplete="off"><div class="syn-results" id="syn-results"></div><p class="syn-note">Consulta local, sin conexión, sin IA. Lista ampliada de términos frecuentes, pero no es un diccionario exhaustivo.</p>`;
 document.body.append(div);
 const update=()=>{const key=el('syn-search').value.trim().toLocaleLowerCase('es');const options=synonymStore[key]||[];el('syn-results').innerHTML=options.length?options.map(v=>`<span>${esc(v)}</span>`).join(''):`<span class="syn-empty">${key?'Sin sinónimos registrados para esa palabra.':'Escribe una palabra para consultar sus sinónimos.'}</span>`};
 div.querySelector('.syn-close').onclick=()=>div.remove();el('syn-search').oninput=update;update();el('syn-search').focus();el('syn-search').select();
}

const m05PrevWire=wire;
wire=function(){
 m05PrevWire();
 if(state.view==='chronologies'){
  document.querySelectorAll('details.timeline-card.compact').forEach(d=>{
   d.addEventListener('toggle',()=>{const t=activeChronology(),event=t?.events.find(x=>x.id===d.dataset.timelineId);if(event&&event.expanded!==d.open){event.expanded=d.open;changed()}});
   d.querySelectorAll('summary button').forEach(btn=>btn.addEventListener('click',e=>e.stopPropagation()));
   d.querySelectorAll('[data-timeline-field="title"],[data-timeline-field="date"],[data-timeline-field="description"]').forEach(input=>input.addEventListener('input',()=>{const strong=d.querySelector('.timeline-summary strong'),small=d.querySelector('.timeline-summary small');const event=activeChronology()?.events.find(x=>x.id===d.dataset.timelineId);if(event){strong.textContent=event.title||'Acontecimiento sin título';small.textContent=(event.date||'Sin fecha')+(event.description?' · '+event.description.slice(0,75):'')}}));
  });
 }
 if(state.view==='settings'){
  const scenario=activeSetting(),file=el('scenario-photos-input');
  if(file&&scenario)file.onchange=async e=>{
   const imgs=[...e.target.files||[]];file.value='';let added=0;
   for(const f of imgs){if(scenario.gallery.length>=16){showToast('Máximo de 16 imágenes');break}if(!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)||f.size>12*1024*1024){showToast('Imagen no válida o demasiado grande');continue}
    try{scenario.gallery.push({id:uid(),src:await compressImage(f)});added++;changed()}catch(err){console.error(err);showToast('No se pudo añadir la imagen')}
   }if(added){render();showToast(added+' imagen(es) añadida(s)')}
  };
 }
 if(state.view==='manuscript'){
  const chapter=activeChapter();if(chapter&&chapter.mode!=='screenplay'){
   const l=chapter.layout||{font:'Georgia',size:18,leading:'1.9',margin:60};chapter.layout=l;const area=document.querySelector('.editor-area');
   for(const [inputId,key,cssKey,transform] of [['chapter-font','font','--chapter-font',v=>`"${v}",serif`],['chapter-size','size','--chapter-size',v=>`${Number(v)}px`],['chapter-leading','leading','--chapter-leading',v=>v],['chapter-margin','margin','--chapter-margin',v=>`${Number(v)}px`]]){
    const input=el(inputId);if(input)input.onchange=()=>{l[key]=key==='size'||key==='margin'?Number(input.value):input.value;area.style.setProperty(cssKey,transform(input.value));changed()};
   }
  }
 }
};


/* MARGEN 0.6: cambios contenidos y compatibles con copias anteriores. */
let boardSelectedIds=new Set();
const m06Ensure=ensureSelections;
ensureSelections=function(){m06Ensure();state.globalStamps=Array.isArray(state.globalStamps)?state.globalStamps:[];for(const p of state.projects||[]){p.stamps=Array.isArray(p.stamps)?p.stamps:[];for(const o of p.outlines||[])for(const s of o.scenes||[])if(typeof s.expanded!=='boolean')s.expanded=false;}};

/* Perfil de libro con sinopsis editable y estadísticas de escritura. */
const m06BookHtml=bookHtml;
bookHtml=function(p){let html=m06BookHtml(p);
 const profile=`<section class="book-profile"><div><div class="book-cover-hero">${posterHtml(p,true)}</div><div class="book-profile-buttons"><button class="btn" data-action="choose-cover" data-id="${esc(p.id)}">${ic('image')} Portada</button>${p.coverData?`<button class="btn ghost" data-action="remove-cover" data-id="${esc(p.id)}">Quitar</button>`:''}</div></div><div><h2>Tu historia</h2><label class="eyebrow" for="book-synopsis">SINOPSIS</label><textarea id="book-synopsis" class="book-synopsis" placeholder="Escribe aquí de qué trata este libro...">${esc(p.description||'')}</textarea><div class="book-stats"><span class="book-stat"><strong>${projectWords(p).toLocaleString('es')}</strong> palabras</span><span class="book-stat"><strong>${p.chapters.length}</strong> capítulos</span><span class="book-stat"><strong>${p.characters.length}</strong> personajes</span><span class="book-stat"><strong>${p.settings.length}</strong> escenarios</span><span class="book-stat"><strong>${p.outlines.reduce((n,o)=>n+(o.scenes?.length||0),0)}</strong> escenas en escaletas</span></div><p class="subtle">Los datos se actualizan automáticamente según escribes y creas fichas.</p></div></section>`;
 html=html.replace(/<div class="book-hero-row">[\s\S]*?Las portadas aparecen en tu biblioteca como libros verticales\.<\/p><\/div><\/div>/,profile);
 html=html.replace(`<p class="section-intro">${esc(p.description||'Tu lugar para escribir, imaginar y organizar cada rincón de la historia.')}</p>`,'');
 return html;
};

/* Escenas plegables, conservando los campos de la escaleta original. */
outlinesHtml=function(p){const o=activeOutline();const head=`<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Escaletas</div><h1>${esc(o?.title||'Escaletas')}</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-outline" ${o?'':'disabled'} title="Eliminar escaleta">${ic('trash')}</button><button class="btn primary" data-action="add-outline">${ic('plus')} Nueva escaleta</button></div></div>`;
 if(!o)return head+`<div class="empty-state">${ic('list')}<h2>La estructura de tu historia</h2><p>Crea una escaleta para cada trama, versión o línea temporal.</p><button class="btn primary" data-action="add-outline">${ic('plus')} Crear escaleta</button></div>`;
 return head+`<div class="main-scroll"><div class="outline-wrap"><div class="outline-intro"><div><label class="eyebrow" for="outline-title">NOMBRE DE LA ESCALETA</label><input id="outline-title" class="note-title" value="${esc(o.title)}"></div><div class="outline-progress">${o.scenes.filter(s=>s.status==='done').length} de ${o.scenes.length} escenas terminadas</div></div><p class="section-intro">Pulsa una escena para desplegarla. Puedes mantener abiertas únicamente las que estés trabajando.</p><div class="outline-list">${o.scenes.map((s,i)=>`<details class="outline-scene outline-compact" data-scene="${esc(s.id)}" ${s.expanded?'open':''}><summary><span class="outline-collapse-icon">${ic('chevron')}</span><span class="scene-index">${String(i+1).padStart(2,'0')}</span><span class="outline-summary"><strong data-outline-summary-title>${esc(s.title||'Escena sin título')}</strong><small data-outline-summary-sub>${esc(({idea:'Idea',planned:'Planificada',writing:'En escritura',done:'Terminada'})[s.status]||'Idea')}${s.pov?' · POV '+esc(s.pov):''}${s.description?' · '+esc(s.description.slice(0,85)):''}</small></span><span class="scene-actions"><button class="iconbtn" data-action="scene-up" data-id="${esc(s.id)}" ${i===0?'disabled':''} title="Subir">${ic('up')}</button><button class="iconbtn" data-action="scene-down" data-id="${esc(s.id)}" ${i===o.scenes.length-1?'disabled':''} title="Bajar">${ic('down')}</button><button class="iconbtn" data-action="scene-delete" data-id="${esc(s.id)}" title="Eliminar">${ic('trash')}</button></span></summary><div class="outline-detail"><label class="field-mini">Título de la escena<input class="scene-title" data-scene-field="title" data-scene-id="${esc(s.id)}" value="${esc(s.title||'')}" placeholder="Título"></label><label class="field-mini">¿Qué sucede?<textarea rows="3" data-scene-field="description" data-scene-id="${esc(s.id)}" placeholder="Describe la escena...">${esc(s.description||'')}</textarea></label><div class="scene-foot"><label>Estado <select data-scene-field="status" data-scene-id="${esc(s.id)}"><option value="idea" ${s.status==='idea'?'selected':''}>Idea</option><option value="planned" ${s.status==='planned'?'selected':''}>Planificada</option><option value="writing" ${s.status==='writing'?'selected':''}>En escritura</option><option value="done" ${s.status==='done'?'selected':''}>Terminada</option></select></label><label>Punto de vista<input data-scene-field="pov" data-scene-id="${esc(s.id)}" value="${esc(s.pov||'')}" placeholder="Personaje..."></label></div></div></details>`).join('')}</div><button class="btn primary outline-add" data-action="scene-add">${ic('plus')} Añadir escena</button></div></div>`;
};

/* Pestaña de diccionario local. No se promete una cobertura lexicográfica exhaustiva. */
const lexicalData={
 canción:['sustantivo femenino','Composición musical destinada habitualmente a ser cantada.',[]],
 melodía:['sustantivo femenino','Sucesión de sonidos que forman una unidad musical reconocible.',[]],
 música:['sustantivo femenino','Arte de combinar sonidos y silencios con intención expresiva.',[]],
 libro:['sustantivo masculino','Obra escrita o impresa que forma un volumen; también su contenido.',[]],
 novela:['sustantivo femenino','Obra narrativa de ficción, generalmente de cierta extensión.',[]],
 guion:['sustantivo masculino','Texto que organiza escenas, acciones y diálogos de una obra audiovisual.',[]],
 historia:['sustantivo femenino','Narración de acontecimientos, reales o imaginarios.',[]],
 personaje:['sustantivo masculino o femenino','Ser que interviene en una obra narrativa, dramática o audiovisual.',[]],
 protagonista:['sustantivo','Personaje principal en torno al cual se desarrolla una historia.',[]],
 paisaje:['sustantivo masculino','Extensión de terreno o conjunto visual contemplado desde un lugar.',[]],
 casa:['sustantivo femenino','Edificio o espacio destinado a servir de vivienda.',[]],
 ciudad:['sustantivo femenino','Población extensa con organización urbana.',[]],
 cielo:['sustantivo masculino','Espacio aparente que rodea la Tierra y se observa sobre el horizonte.',[]],
 tierra:['sustantivo femenino','Suelo, terreno o planeta que habitamos, según su uso.',[]],
 árbol:['sustantivo masculino','Planta leñosa con un tronco del que nacen ramas a cierta altura.',[]],
 agua:['sustantivo femenino','Líquido transparente, incoloro e indispensable para la vida.',[]],
 viento:['sustantivo masculino','Movimiento del aire en la atmósfera.',[]],
 noche:['sustantivo femenino','Periodo comprendido entre la puesta y la salida del sol.',['día']],
 día:['sustantivo masculino','Periodo de luz solar o intervalo de veinticuatro horas.',['noche']],
 luz:['sustantivo femenino','Radiación visible que permite percibir los objetos.',['oscuridad','sombra']],
 oscuridad:['sustantivo femenino','Ausencia o escasez de luz.',['claridad','luz']],
 silencio:['sustantivo masculino','Ausencia de sonido o decisión de no hablar.',['ruido','alboroto']],
 ruido:['sustantivo masculino','Sonido, especialmente cuando resulta confuso o molesto.',['silencio']],
 frío:['adjetivo o sustantivo','Que tiene una temperatura baja; sensación de baja temperatura.',['calor','cálido']],
 calor:['sustantivo masculino','Sensación o forma de energía relacionada con una temperatura elevada.',['frío']],
 fuego:['sustantivo masculino','Fenómeno que produce luz y calor por combustión.',[]],
 triste:['adjetivo','Que siente o expresa tristeza.',['alegre','feliz','contento']],
 tristeza:['sustantivo femenino','Estado de ánimo caracterizado por la pena o la aflicción.',['alegría','felicidad']],
 alegre:['adjetivo','Que manifiesta o siente alegría.',['triste','melancólico']],
 alegría:['sustantivo femenino','Emoción de satisfacción, júbilo o bienestar.',['tristeza','pena']],
 feliz:['adjetivo','Que experimenta felicidad o satisfacción.',['infeliz','desdichado']],
 felicidad:['sustantivo femenino','Estado de satisfacción o bienestar personal.',['tristeza','desdicha']],
 amor:['sustantivo masculino','Sentimiento de profundo afecto, entrega o inclinación hacia alguien o algo.',['odio','desamor']],
 amar:['verbo','Sentir amor, afecto intenso o cariño.',['odiar','aborrecer']],
 odio:['sustantivo masculino','Sentimiento intenso de rechazo o animadversión.',['amor','afecto']],
 miedo:['sustantivo masculino','Emoción de inquietud ante un peligro real o imaginado.',['valor','confianza']],
 temor:['sustantivo masculino','Miedo, inquietud o recelo ante algo.',['confianza','seguridad']],
 valor:['sustantivo masculino','Cualidad que permite actuar pese al miedo o las dificultades.',['cobardía','temor']],
 esperanza:['sustantivo femenino','Confianza en que ocurra aquello que se desea.',['desesperanza','desánimo']],
 soledad:['sustantivo femenino','Estado o experiencia de estar sin compañía.',['compañía']],
 compañía:['sustantivo femenino','Presencia o acompañamiento de otra persona.',['soledad']],
 recuerdo:['sustantivo masculino','Representación mental de un hecho o experiencia pasada.',['olvido']],
 olvido:['sustantivo masculino','Pérdida del recuerdo de algo o falta de atención a ello.',['memoria','recuerdo']],
 memoria:['sustantivo femenino','Capacidad de recordar y conservar experiencias e información.',['olvido']],
 verdad:['sustantivo femenino','Correspondencia de una afirmación con los hechos o la realidad.',['mentira','falsedad']],
 mentira:['sustantivo femenino','Afirmación expresada a sabiendas de que no es verdadera.',['verdad']],
 libertad:['sustantivo femenino','Facultad de actuar o decidir sin coacción indebida.',['cautiverio','esclavitud']],
 prisión:['sustantivo femenino','Lugar o situación de privación de libertad.',['libertad']],
 comenzar:['verbo','Dar principio a una acción o proceso.',['terminar','finalizar']],
 terminar:['verbo','Poner fin a una acción o proceso.',['comenzar','iniciar']],
 empezar:['verbo','Dar inicio a algo.',['acabar','terminar']],
 acabar:['verbo','Concluir o poner fin a una cosa.',['comenzar','iniciar']],
 abrir:['verbo','Separar lo que cerraba una abertura o permitir el acceso.',['cerrar']],
 cerrar:['verbo','Impedir el paso o clausurar una abertura.',['abrir']],
 subir:['verbo','Ir o llevar algo hacia un lugar más alto.',['bajar']],
 bajar:['verbo','Ir o mover algo hacia un lugar inferior.',['subir']],
 ganar:['verbo','Obtener una victoria, un beneficio o algo deseado.',['perder']],
 perder:['verbo','Dejar de tener o no conseguir una cosa.',['ganar','encontrar']],
 encontrar:['verbo','Dar con lo que se buscaba o con algo inesperado.',['perder']],
 saber:['verbo','Tener conocimiento de algo.',['ignorar','desconocer']],
 ignorar:['verbo','No saber o no tener noticia de algo.',['saber','conocer']],
 recordar:['verbo','Traer algo a la memoria.',['olvidar']],
 olvidar:['verbo','Dejar de recordar algo.',['recordar']],
 creer:['verbo','Considerar verdadero algo o confiar en alguien.',['dudar','descreer']],
 confiar:['verbo','Depositar seguridad o esperanza en alguien o algo.',['desconfiar']],
 desconfiar:['verbo','Sentir recelo o falta de confianza.',['confiar']],
 mirar:['verbo','Dirigir la vista hacia algo.',['ignorar']],
 escuchar:['verbo','Prestar atención a lo que se oye.',['desatender']],
 hablar:['verbo','Expresarse con palabras.',['callar']],
 callar:['verbo','Guardar silencio o dejar de hablar.',['hablar']],
 reír:['verbo','Mostrar alegría o diversión mediante la risa.',['llorar']],
 llorar:['verbo','Derramar lágrimas por emoción, dolor u otra causa.',['reír']],
 rápido:['adjetivo','Que se mueve o sucede con velocidad.',['lento']],
 lento:['adjetivo','Que se mueve o sucede con poca velocidad.',['rápido']],
 grande:['adjetivo','De tamaño o extensión considerable.',['pequeño']],
 pequeño:['adjetivo','De tamaño inferior al habitual o al de referencia.',['grande']],
 alto:['adjetivo','De gran altura o situado a nivel elevado.',['bajo']],
 bajo:['adjetivo','De poca altura o situado a nivel inferior.',['alto']],
 largo:['adjetivo','Que tiene gran longitud o duración.',['corto']],
 corto:['adjetivo','De poca longitud o duración.',['largo']],
 fuerte:['adjetivo','Que tiene fuerza, resistencia o intensidad considerable.',['débil']],
 débil:['adjetivo','Que carece de suficiente fuerza o resistencia.',['fuerte']],
 bonito:['adjetivo','Que resulta agradable o atractivo a la vista.',['feo']],
 feo:['adjetivo','Que resulta desagradable o poco atractivo estéticamente.',['bonito','bello']],
 blanco:['adjetivo o sustantivo','Del color de la nieve; color claro sin tonalidad cromática dominante.',['negro']],
 negro:['adjetivo o sustantivo','Del color más oscuro; ausencia aparente de luz.',['blanco']],
 nuevo:['adjetivo','Recién hecho, conocido o incorporado.',['viejo','antiguo']],
 antiguo:['adjetivo','Que existe desde hace mucho tiempo.',['moderno','nuevo']],
 moderno:['adjetivo','Propio de un tiempo reciente o de la actualidad.',['antiguo']],
 claro:['adjetivo','Que se percibe o comprende con facilidad; luminoso.',['oscuro','confuso']],
 oscuro:['adjetivo','Que carece de luz o resulta difícil de comprender.',['claro','luminoso']],
 vacío:['adjetivo','Que no contiene aquello que normalmente podría contener.',['lleno']],
 lleno:['adjetivo','Que contiene tanta cantidad como puede o se espera.',['vacío']],
 cercano:['adjetivo','Que se encuentra a poca distancia o tiene relación próxima.',['lejano']],
 lejano:['adjetivo','Que se encuentra a gran distancia, en el espacio o en el tiempo.',['cercano']],
 fácil:['adjetivo','Que exige poco esfuerzo o dificultad.',['difícil']],
 difícil:['adjetivo','Que exige esfuerzo o presenta obstáculos para realizarse.',['fácil']],
 sencillo:['adjetivo','Que carece de complicaciones o artificios.',['complejo','complicado']],
 complicado:['adjetivo','Que presenta dificultad o muchas partes relacionadas.',['sencillo','simple']],
 posible:['adjetivo','Que puede suceder, existir o realizarse.',['imposible']],
 imposible:['adjetivo','Que no puede ocurrir o realizarse.',['posible']],
 primero:['adjetivo','Que ocupa el lugar inicial en una sucesión.',['último']],
 último:['adjetivo','Que ocupa el lugar final de una sucesión.',['primero']],
 antes:['adverbio','En un tiempo anterior.',['después']],
 después:['adverbio','En un tiempo posterior.',['antes']],
 dentro:['adverbio','En la parte interior de algo.',['fuera']],
 fuera:['adverbio','En el exterior de un lugar o cosa.',['dentro']],
 aquí:['adverbio','En este lugar.',['allí']],
 allí:['adverbio','En aquel lugar.',['aquí']],
 siempre:['adverbio','En todo tiempo o en cada ocasión.',['nunca']],
 nunca:['adverbio','En ningún tiempo.',['siempre']],
 todo:['pronombre o adjetivo','La totalidad de aquello de que se habla.',['nada']],
 nada:['pronombre','Ausencia de cosa alguna.',['todo']],
 mucho:['adjetivo o adverbio','En gran cantidad o grado.',['poco']],
 poco:['adjetivo o adverbio','En cantidad o grado pequeño.',['mucho']],
 paz:['sustantivo femenino','Situación de tranquilidad o ausencia de conflicto.',['guerra']],
 guerra:['sustantivo femenino','Conflicto armado entre grupos o estados.',['paz']],
 victoria:['sustantivo femenino','Resultado de vencer en un enfrentamiento o esfuerzo.',['derrota']],
 derrota:['sustantivo femenino','Resultado de ser vencido en un enfrentamiento.',['victoria']],
 vida:['sustantivo femenino','Condición de los seres vivos; existencia de una persona.',['muerte']],
 muerte:['sustantivo femenino','Fin de la vida de un ser vivo.',['vida']],
 principio:['sustantivo masculino','Inicio u origen de algo.',['final']],
 final:['sustantivo masculino o adjetivo','Última parte o conclusión de algo.',['principio','inicio']],
 unión:['sustantivo femenino','Acción o efecto de unir o estar unido.',['separación']],
 separación:['sustantivo femenino','Acción de apartar o dividir lo que estaba unido.',['unión']],
 orden:['sustantivo masculino','Disposición organizada de elementos según una regla.',['desorden','caos']],
 caos:['sustantivo masculino','Situación de gran desorden o confusión.',['orden']],
 éxito:['sustantivo masculino','Resultado favorable o logro de un propósito.',['fracaso']],
 fracaso:['sustantivo masculino','Resultado contrario al esperado o deseado.',['éxito']],
 peligro:['sustantivo masculino','Posibilidad de que ocurra un daño.',['seguridad']],
 seguridad:['sustantivo femenino','Situación libre de riesgo o sensación de confianza.',['peligro','inseguridad']],
 solución:['sustantivo femenino','Respuesta o procedimiento que resuelve un problema.',['problema']],
 problema:['sustantivo masculino','Situación o cuestión que requiere una solución.',['solución']],
 hermoso:['adjetivo','Que posee belleza o produce admiración estética.',['feo']],
 escribir:['verbo','Representar palabras o ideas mediante signos escritos.',['borrar']],
 leer:['verbo','Interpretar un texto escrito.',[]],
 dibujar:['verbo','Representar mediante líneas o trazos.',['borrar']],
 pintar:['verbo','Aplicar colores o pigmentos sobre una superficie.',['borrar']],
 crear:['verbo','Producir algo que antes no existía.',['destruir']],
 destruir:['verbo','Arruinar o deshacer algo hasta impedir su uso o existencia.',['crear','construir']]
};
const normalizeLemma=s=>String(s||'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const lexicalKey=word=>{const query=normalizeLemma(word);return Object.keys(synonymStore).find(k=>normalizeLemma(k)===query)||Object.keys(lexicalData).find(k=>normalizeLemma(k)===query)||null};
function dictionaryResult(word){const key=lexicalKey(word),entry=key?lexicalData[key]:null,similar=(word||'').trim()?Object.keys(synonymStore).filter(k=>normalizeLemma(k).startsWith(normalizeLemma(word).slice(0,4))).slice(0,9):[];
 return `<div class="dict-content">${key?`<h2 class="dict-word">${esc(key)}</h2>${entry?`<div class="dict-type">${esc(entry[0])}</div><section class="dict-section"><h3>Definición</h3><p>${esc(entry[1])}</p></section>`:`<p class="dict-empty">No hay definición incorporada para esta entrada.</p>`}<section class="dict-section"><h3>Sinónimos</h3><div class="dict-chips">${(synonymStore[key]||[]).length?(synonymStore[key]||[]).map(x=>`<span class="dict-chip">${esc(x)}</span>`).join(''):'<span class="dict-empty">Sin sinónimos registrados.</span>'}</div></section><section class="dict-section"><h3>Antónimos</h3><div class="dict-chips">${entry?.[2]?.length?entry[2].map(x=>`<span class="dict-chip">${esc(x)}</span>`).join(''):'<span class="dict-empty">Sin antónimos registrados.</span>'}</div></section>`:`<p class="dict-empty">${word?'No se encontró «'+esc(word)+'» en el vocabulario integrado.':'Escribe una palabra para consultar sus significados y alternativas.'}</p>`}${similar.length?`<div class="dict-suggest">${similar.map(x=>`<button data-dict-word="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''}</div>`;
}
function dictionaryHtml(){return `<div class="workspace-head"><div><div class="eyebrow">Herramientas de escritura</div><h1>Diccionario</h1></div></div><div class="main-scroll"><div class="dictionary-page"><p class="section-intro">Consulta palabras, definiciones, sinónimos y antónimos sin conexión y sin IA. No analiza ni modifica tus textos.</p><label class="eyebrow" for="dictionary-query">BUSCAR UNA PALABRA</label><input class="dict-search" id="dictionary-query" placeholder="Por ejemplo: canción" autocomplete="off" spellcheck="false"><div id="dictionary-result">${dictionaryResult('canción')}</div><p class="dict-notice">Este diccionario es una selección local de términos, no un diccionario académico completo. Algunas palabras solo contienen sinónimos y las definiciones son breves y orientativas.</p></div></div>`;}
function wireDictionary(){const search=el('dictionary-query');if(!search)return;const result=el('dictionary-result');const searchWord=word=>{search.value=word;result.innerHTML=dictionaryResult(word);result.querySelectorAll('[data-dict-word]').forEach(btn=>btn.onclick=()=>searchWord(btn.dataset.dictWord))};search.oninput=()=>searchWord(search.value);searchWord('canción');}
const m06Render=render;
render=function(){const dictionary=state.view==='dictionary';if(dictionary)state.view='desk';m06Render();if(dictionary){state.view='dictionary';document.querySelector('.sidebar').innerHTML=`<div class="project-current"><div class="project-mini-icon">${ic('book')}</div><div class="project-current-text"><div class="project-current-name">Diccionario</div><div class="project-current-sub">Consulta léxica local</div></div></div><div class="sidebar-scroll"><button class="sidebaritem" data-action="library">${ic('grid')} Biblioteca</button></div>`;document.querySelector('.sidebar').querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',onAction));el('workspace').innerHTML=dictionaryHtml();wireDictionary();}
 const nav=document.querySelector('.topnav');if(nav){const button=document.createElement('button');button.className='toplink '+(dictionary?'active':'');button.title='Buscar definiciones, sinónimos y antónimos sin internet';button.innerHTML=ic('book')+'<span>Diccionario</span>';button.addEventListener('click',()=>{state.view='dictionary';changed();render()});nav.append(button)}
 if(state.view==='boards')updateBoardSelectionButtons();
};
const m06ChangeView=changeView;
changeView=function(view){if(view==='dictionary'){state.view=view;selectedElement=null;changed();render();return;}boardSelectedIds.clear();return m06ChangeView(view)};

/* Selección múltiple y grupos de elementos en la pizarra. */
const m06SetSelected=setSelected;
setSelected=function(id){boardSelectedIds.clear();const b=activeBoard(),item=b?.elements.find(x=>x.id===id);if(item?.groupId)for(const x of b.elements)if(x.groupId===item.groupId)boardSelectedIds.add(x.id);if(id&&!boardSelectedIds.size)boardSelectedIds.add(id);m06SetSelected(id);updateBoardSelectionButtons()};
function updateBoardSelectionButtons(){const b=activeBoard(),count=boardSelectedIds.size;document.querySelectorAll('.board-item').forEach(elm=>elm.classList.toggle('group-selected',boardSelectedIds.has(elm.dataset.eid)));const group=el('board-group'),ungroup=el('board-ungroup');if(group)group.disabled=count<2;if(ungroup)ungroup.disabled=!b?.elements.some(x=>boardSelectedIds.has(x.id)&&x.groupId);const selected=el('board-selection-count');if(selected)selected.textContent=count>1?`${count} seleccionados · `:''}
const m06BoardHtml=boardHtml;
boardHtml=function(p){let html=m06BoardHtml(p);const tools=`<span class="tool-divider"></span><button class="board-special" id="board-group" data-action="board-group" title="Agrupar selección (Ctrl+G)" disabled>Agrupar</button><button class="board-special" id="board-ungroup" data-action="board-ungroup" title="Desagrupar (Ctrl+Mayús+G)" disabled>Desagrupar</button><button class="board-special" data-action="stamp-create" title="Selecciona una zona de trazos para guardarla como sello">${ic('pencil')} Crear sello</button><button class="board-special" data-action="stamp-library">${ic('image')} Sellos</button><span id="board-selection-count" class="subtle"></span>`;
 return html.replace('</div><div class="board-viewport"',tools+'</div><div class="board-viewport"').replace('Ctrl+Z deshacer · Ctrl+C/V copiar y pegar','Shift+clic para selección múltiple · Ctrl+G agrupar · Ctrl+Z deshacer · Ctrl+C/V copiar y pegar');};
const m06RenderBoard=renderBoardElements;
renderBoardElements=function(){m06RenderBoard();document.querySelectorAll('.board-item').forEach(node=>node.addEventListener('pointerdown',evt=>{if(evt.shiftKey&&boardTool==='select'&&!evt.target.closest('[contenteditable],input,textarea,.item-popmenu')){evt.preventDefault();evt.stopImmediatePropagation();const id=node.dataset.eid;if(boardSelectedIds.has(id))boardSelectedIds.delete(id);else boardSelectedIds.add(id);selectedElement=id;updateBoardSelectionButtons();}},true));updateBoardSelectionButtons()};
const m06StartDrag=startItemDrag;
startItemDrag=function(evt,item,node,kind){const group=item.groupId?activeBoard()?.elements.filter(x=>x.groupId===item.groupId):null;if(kind!=='move'||!group||group.length<2)return m06StartDrag(evt,item,node,kind);if(boardTool!=='select')return;evt.preventDefault();evt.stopPropagation();pushBoardUndo();setSelected(item.id);const zoom=activeBoard().zoom,x=evt.clientX,y=evt.clientY,positions=group.map(x=>({id:x.id,x:x.x,y:x.y}));const move=e=>{const dx=(e.clientX-x)/zoom,dy=(e.clientY-y)/zoom;for(const it of positions){const object=group.find(z=>z.id===it.id);object.x=Math.max(0,Math.min(3800,it.x+dx));object.y=Math.max(0,Math.min(2600,it.y+dy));const dom=document.querySelector(`.board-item[data-eid="${object.id}"]`);if(dom){dom.style.left=object.x+'px';dom.style.top=object.y+'px'}}};const done=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);window.removeEventListener('pointercancel',done);changed()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',done,{once:true});window.addEventListener('pointercancel',done,{once:true})};
function groupBoardItems(){const b=activeBoard();if(!b||boardSelectedIds.size<2)return;pushBoardUndo();const gid=uid();for(const x of b.elements)if(boardSelectedIds.has(x.id))x.groupId=gid;setSelected([...boardSelectedIds][0]||b.elements.find(x=>x.groupId===gid)?.id);changed();showToast('Elementos agrupados. Mueve uno y se moverán todos.')}
function ungroupBoardItems(){const b=activeBoard();if(!b)return;pushBoardUndo();const ids=new Set(boardSelectedIds);for(const x of b.elements)if(ids.has(x.id))delete x.groupId;const first=[...ids][0];setSelected(first||null);changed();showToast('Grupo deshecho')}

/* Sellos: selección rectangular de trazos, exportación PNG transparente y reutilización. */
function stampFromStrokes(strokes,bounds){const w=Math.min(1200,Math.max(64,Math.ceil(bounds.w))),h=Math.min(1200,Math.max(64,Math.ceil(bounds.h)));const scale=Math.min(w/bounds.w,h/bounds.h,1);const c=document.createElement('canvas');c.width=Math.max(2,Math.ceil(bounds.w*scale));c.height=Math.max(2,Math.ceil(bounds.h*scale));const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.translate(-bounds.x,-bounds.y);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.clip();for(const s of strokes){if(!s.points?.length)continue;ctx.beginPath();ctx.lineWidth=s.width||3;ctx.strokeStyle=s.color||'#414141';ctx.fillStyle=ctx.strokeStyle;ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);if(s.points.length===1){ctx.arc(s.points[0].x,s.points[0].y,Math.max(1,s.width||3)/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()}return c.toDataURL('image/png')}
function beginStampSelection(){if(!activeBoard()?.strokes?.length){showToast('Primero dibuja algo con el lápiz.');return;}boardTool='stamp-select';document.querySelectorAll('[data-tool]').forEach(x=>x.classList.remove('on'));el('board-viewport')?.classList.add('stamp-mode');showToast('Arrastra un rectángulo sobre los trazos que quieras guardar.')}
function finishStampSelection(box){const b=activeBoard();if(!b)return;const x=Math.max(0,Math.min(box.x1,box.x2)),y=Math.max(0,Math.min(box.y1,box.y2)),w=Math.abs(box.x2-box.x1),h=Math.abs(box.y2-box.y1);if(w<8||h<8){showToast('Selecciona un área más grande.');return;}const strokes=b.strokes.filter(s=>s.points?.some(p=>p.x>=x-10&&p.x<=x+w+10&&p.y>=y-10&&p.y<=y+h+10));if(!strokes.length){showToast('No hay trazos dentro del área seleccionada.');return;}const src=stampFromStrokes(strokes,{x,y,w,h});modal({title:'Guardar como sello',description:'Se guardará una copia de los trazos seleccionados con fondo transparente. Los dibujos originales no se borran.',fields:[{id:'title',label:'Nombre del sello',required:true,placeholder:'Estrella, flor, garabato...'}],submit:'Guardar sello',onSubmit:async ({title})=>{if((activeProject()?.stamps?.length||0)+(state.globalStamps?.length||0)>=70){showToast('Límite de 70 sellos alcanzado');return;}const isGlobal=await m172Confirm('¿Quieres que este sello se pueda usar en TODOS tus libros?\nAceptar: sello global. Cancelar: solo este libro.');const stamp={id:uid(),title,src,createdAt:now()};if(isGlobal)state.globalStamps.push(stamp);else activeProject().stamps.push(stamp);changed();showToast('Sello guardado. Puedes usarlo desde Sellos.')}})}
function stampLibrary(){const p=activeProject();if(!p)return;document.querySelector('.stamp-modal-overlay')?.remove();const overlay=document.createElement('div');overlay.className='modal-backdrop stamp-modal-overlay';const entries=[...(p.stamps||[]).map(s=>({...s,scope:'book'})),...(state.globalStamps||[]).map(s=>({...s,scope:'global'}))];overlay.innerHTML=`<div class="modal" style="width:min(720px,95vw);max-width:none"><h2>Mis sellos</h2><p>Selecciona uno para estamparlo como imagen PNG transparente en la pizarra. Puedes moverlo y cambiar su tamaño.</p><div class="stamp-library">${entries.map(s=>`<div class="stamp-tile"><img src="${esc(s.src)}" alt="Sello ${esc(s.title)}"><span class="stamp-name" title="${esc(s.title)}">${esc(s.title)} · ${s.scope==='global'?'Global':'Libro'}</span><div class="stamp-actions"><button data-stamp-use="${esc(s.id)}" data-scope="${s.scope}">Usar</button><button data-stamp-delete="${esc(s.id)}" data-scope="${s.scope}">Eliminar</button></div></div>`).join('')||'<p class="char-helper">Todavía no has guardado sellos. Dibuja en la pizarra y pulsa «Crear sello».</p>'}</div><div class="modal-actions"><button class="btn" id="stamp-close">Cerrar</button></div></div>`;document.body.append(overlay);const close=()=>overlay.remove();overlay.querySelector('#stamp-close').onclick=close;overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close()});overlay.querySelectorAll('[data-stamp-use]').forEach(btn=>btn.onclick=()=>{const list=btn.dataset.scope==='global'?state.globalStamps:p.stamps,s=list.find(x=>x.id===btn.dataset.stampUse);if(!s)return;close();addBoardElement('image',s.src);const item=activeBoard().elements.find(x=>x.id===selectedElement);if(item){const img=new Image();img.onload=()=>{if(!activeBoard()?.elements.includes(item))return;const ratio=Math.min(1,350/Math.max(img.width,img.height));item.w=Math.max(55,Math.round(img.width*ratio));item.h=Math.max(55,Math.round(img.height*ratio));renderBoardElements();setSelected(item.id);changed()};img.src=s.src}showToast('Sello colocado')});overlay.querySelectorAll('[data-stamp-delete]').forEach(btn=>btn.onclick=async ()=>{if(!await m172Confirm('¿Eliminar este sello de la biblioteca? Los ya estampados permanecen.'))return;const list=btn.dataset.scope==='global'?state.globalStamps:p.stamps;const pos=list.findIndex(x=>x.id===btn.dataset.stampDelete);if(pos>=0)list.splice(pos,1);changed();close();stampLibrary()})}
const m06SetupBoard=setupBoard;
setupBoard=function(){m06SetupBoard();boardSelectedIds.clear();updateBoardSelectionButtons();const viewport=el('board-viewport');if(!viewport)return;
 const selectionDown=e=>{if(boardTool!=='stamp-select'||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const startWorld=worldPoint(e),rect=viewport.getBoundingClientRect();const startClient={x:e.clientX-rect.left,y:e.clientY-rect.top};const frame=document.createElement('div');frame.className='stamp-select-frame';viewport.append(frame);const update=evt=>{const cx=evt.clientX-rect.left,cy=evt.clientY-rect.top;frame.style.left=Math.min(cx,startClient.x)+'px';frame.style.top=Math.min(cy,startClient.y)+'px';frame.style.width=Math.abs(cx-startClient.x)+'px';frame.style.height=Math.abs(cy-startClient.y)+'px'};
 const done=evt=>{window.removeEventListener('pointermove',update);window.removeEventListener('pointerup',done);window.removeEventListener('pointercancel',cancel);frame.remove();boardTool='select';viewport.classList.remove('stamp-mode');const endWorld=worldPoint(evt);finishStampSelection({x1:startWorld.x,y1:startWorld.y,x2:endWorld.x,y2:endWorld.y})};const cancel=()=>{window.removeEventListener('pointermove',update);window.removeEventListener('pointerup',done);frame.remove();boardTool='select';viewport.classList.remove('stamp-mode')};window.addEventListener('pointermove',update);window.addEventListener('pointerup',done,{once:true});window.addEventListener('pointercancel',cancel,{once:true})};
 viewport.addEventListener('pointerdown',selectionDown,true);const keyboard=e=>{if(state.view!=='boards'||e.target?.closest?.('input,textarea,[contenteditable]'))return;const ctrl=e.ctrlKey||e.metaKey;if(ctrl&&e.key.toLowerCase()==='g'){e.preventDefault();e.stopImmediatePropagation();if(e.shiftKey)ungroupBoardItems();else groupBoardItems()}};window.addEventListener('keydown',keyboard,true);const cleanup=activeBoardCleanup;activeBoardCleanup=()=>{cleanup?.();window.removeEventListener('keydown',keyboard,true);viewport.removeEventListener('pointerdown',selectionDown,true)};
};

const m06Action=onAction;
onAction=function(e){const a=e.currentTarget.dataset.action;
 if(a==='board-group'){groupBoardItems();return}
 if(a==='board-ungroup'){ungroupBoardItems();return}
 if(a==='stamp-create'){beginStampSelection();return}
 if(a==='stamp-library'){stampLibrary();return}
 if(a==='scene-add'){const o=activeOutline();if(!o)return;const id=uid();o.scenes.push({id,title:'',description:'',status:'idea',pov:'',expanded:true});changed();render();document.querySelector(`[data-scene-id="${id}"][data-scene-field="title"]`)?.focus();return}
 return m06Action(e)
};
const m06Wire=wire;
wire=function(){m06Wire();
 const synopsis=el('book-synopsis');if(synopsis)synopsis.oninput=e=>{activeProject().description=e.target.value;changed()};
 if(state.view==='outlines')document.querySelectorAll('details.outline-compact').forEach(details=>{details.addEventListener('toggle',()=>{const item=activeOutline()?.scenes.find(x=>x.id===details.dataset.scene);if(item&&item.expanded!==details.open){item.expanded=details.open;changed()}});details.querySelectorAll('summary button').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation()}));details.querySelectorAll('[data-scene-field]').forEach(input=>{const eventName=input.tagName==='SELECT'?'change':'input';input.addEventListener(eventName,()=>{const item=activeOutline()?.scenes.find(x=>x.id===input.dataset.sceneId);if(!item)return;const t=details.querySelector('[data-outline-summary-title]'),sub=details.querySelector('[data-outline-summary-sub]');if(t)t.textContent=item.title||'Escena sin título';if(sub)sub.textContent=({idea:'Idea',planned:'Planificada',writing:'En escritura',done:'Terminada'})[item.status]+(item.pov?' · POV '+item.pov:'')+(item.description?' · '+item.description.slice(0,85):'')})})});
};


/* ================= MARGEN 1.1 · PROTOTIPO A ====================
   Extensiones no destructivas sobre 0.6: los datos se siguen
   exportando en JSON version: 1, compatible con el prototipo.
*/
let m11FocusMode=false;
let m11SidebarQuery='';
let m11FindQuery='';
let m11FindIndex=-1;
let m11TreeDrag=null;

const m11OldManuscriptHtml=manuscriptHtml;
manuscriptHtml=function(p){
  let html=m11OldManuscriptHtml(p),c=activeChapter();
  if(!c)return html;
  const chapters=p.chapters||[],idx=chapters.findIndex(x=>x.id===c.id);
  const nav=`<div class="m11-navbox"><div class="m11-navgroup">
    <button class="btn" data-action="m11-prev" title="Capítulo anterior" ${idx<1?'disabled':''}>${ic('back')}</button>
    <select id="m11-jump" aria-label="Ir a capítulo">${chapters.map(x=>`<option value="${esc(x.id)}" ${x.id===c.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>
    <button class="btn" data-action="m11-next" title="Capítulo siguiente" ${idx>=chapters.length-1?'disabled':''}>${ic('chevron')}</button>
    <span class="m11-count">${idx+1} de ${chapters.length}</span></div>
    <div class="m11-navgroup"><button class="btn" data-action="m11-find" title="Buscar en el capítulo (Ctrl+F)">${ic('text')} Buscar</button><button class="btn" data-action="m11-focus" id="m11-focus-button" title="Concentración sin menús">${ic('feather')} <span id="m11-focus-label">Concentración</span></button></div>
  </div><div class="m11-findbar" id="m11-findbar" hidden>
    <input type="search" id="m11-find-input" placeholder="Buscar palabra o frase en este capítulo…" autocomplete="off" aria-label="Buscar en capítulo">
    <output id="m11-find-count" aria-live="polite">0 resultados</output>
    <button class="btn" data-action="m11-find-previous" title="Anterior coincidencia">${ic('up')}</button>
    <button class="btn" data-action="m11-find-next" title="Siguiente coincidencia">${ic('down')}</button>
    <button class="btn ghost" data-action="m11-find-close" title="Cerrar búsqueda">Cerrar</button>
  </div>`;
  return html.replace('<article class="editor-paper">',nav+'<article class="editor-paper">');
};

function m11UpdateStats(){
  const editor=el('chapter-editor'),stats=el('chapter-words');
  if(!editor||!stats)return;
  const content=editor.innerText||'';
  stats.textContent=`${wordCount(content)} palabras · ${[...content].length} caracteres`;
}
function m11FindRanges(){
  const editor=el('chapter-editor');if(!editor||!m11FindQuery.trim())return [];
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
  const nodes=[];let item,length=0;
  while((item=walker.nextNode())){nodes.push({node:item,start:length,end:length+item.textContent.length});length+=item.textContent.length}
  const full=nodes.map(x=>x.node.textContent).join('').toLocaleLowerCase('es');
  const q=m11FindQuery.toLocaleLowerCase('es');const result=[];let from=0;
  while(from<full.length&&result.length<1000){
    const at=full.indexOf(q,from);if(at<0)break;
    const start=nodes.find(x=>x.end>at),end=nodes.find(x=>x.end>=at+q.length);
    if(start&&end){const range=document.createRange();range.setStart(start.node,at-start.start);range.setEnd(end.node,at+q.length-end.start);result.push(range)}
    from=at+Math.max(q.length,1);
  }
  return result;
}
function m11FindRefresh(select=false){
  const ranges=m11FindRanges(),counter=el('m11-find-count');
  if(!ranges.length)m11FindIndex=-1;
  else if(m11FindIndex>=ranges.length)m11FindIndex=0;
  if(counter)counter.textContent=ranges.length?(m11FindIndex>=0?`${m11FindIndex+1} de ${ranges.length}`:`${ranges.length} resultados`):'Sin resultados';
  if(select&&ranges.length){
    if(m11FindIndex<0)m11FindIndex=0;
    const r=ranges[m11FindIndex],s=window.getSelection();
    if(s){s.removeAllRanges();s.addRange(r)}
    const node=r.startContainer.parentElement;
    if(node?.scrollIntoView)node.scrollIntoView({block:'center',inline:'nearest'});
    if(counter)counter.textContent=`${m11FindIndex+1} de ${ranges.length}`;
  }
  return ranges;
}
function m11FindStep(direction){const ranges=m11FindRanges();if(!ranges.length){m11FindRefresh();return}
  m11FindIndex=m11FindIndex<0?0:(m11FindIndex+direction+ranges.length)%ranges.length;m11FindRefresh(true);
}
function m11OpenSearch(){
  const row=el('m11-findbar'),input=el('m11-find-input');if(!row||!input)return;
  row.hidden=false;
  const sel=window.getSelection();if(!m11FindQuery&&sel&&!sel.isCollapsed&&el('chapter-editor')?.contains(sel.anchorNode)){
    const selected=sel.toString().trim();if(selected.length<80&&!selected.includes('\n'))m11FindQuery=selected;
  }
  input.value=m11FindQuery;
  m11FindRefresh(false);
  input.focus();input.select();
}
function m11CloseSearch(){const row=el('m11-findbar');if(row)row.hidden=true;const editor=el('chapter-editor');editor?.focus();}
function m11OpenAdjacentChapter(delta){
  const p=activeProject(),c=activeChapter();if(!p||!c)return;
  const idx=p.chapters.findIndex(x=>x.id===c.id),target=p.chapters[idx+delta];
  if(!target)return;state.activeChapterId=target.id;changed();m11FindQuery='';m11FindIndex=-1;render();
}
function m11ApplyFocus(){
  document.body.classList.toggle('m11-focus',m11FocusMode&&state.view==='manuscript');
  const label=el('m11-focus-label');if(label)label.textContent=m11FocusMode?'Salir de concentración':'Concentración';
  const button=el('m11-focus-button');if(button)button.classList.toggle('primary',m11FocusMode);
}
function m11BindEditor(){
  m11ApplyFocus();if(state.view!=='manuscript'||!activeChapter())return;
  m11UpdateStats();
  const jump=el('m11-jump');if(jump)jump.onchange=e=>{
    const p=activeProject();if(!p?.chapters.some(c=>c.id===e.target.value))return;
    state.activeChapterId=e.target.value;changed();m11FindQuery='';m11FindIndex=-1;render();
  };
  const input=el('m11-find-input');if(input)input.oninput=e=>{m11FindQuery=e.target.value;m11FindIndex=-1;m11FindRefresh(false)};
  const editor=el('chapter-editor');if(editor)editor.addEventListener('input',()=>{m11UpdateStats();if(el('m11-findbar')&&!el('m11-findbar').hidden)m11FindRefresh(false)});
  // Mantiene la seleccion al pulsar negrita, cursiva, alineacion, etc.
  document.querySelectorAll('.editor-toolbar button[data-action="format"],.editor-toolbar button[data-action="text-format"]').forEach(button=>button.addEventListener('mousedown',e=>e.preventDefault()));
}

function m11MoveTreeItem(view,id,targetId,after){
  const p=activeProject(),key=collections[view],items=p?.[key];
  if(!items||id===targetId)return false;
  const from=items.findIndex(x=>x.id===id),toItem=items.find(x=>x.id===targetId);
  if(from<0||!toItem)return false;
  const selected=items[from];
  if(!!selected.pinned!==!!toItem.pinned){showToast('Ordena fijados con fijados y normales con normales');return false;}
  items.splice(from,1);
  const targetIndex=items.findIndex(x=>x.id===targetId);
  items.splice(targetIndex+(after?1:0),0,selected);
  changed();renderSidebarOnly();showToast('Orden actualizado');return true;
}
function m11DuplicateChapter(id){
  const p=activeProject(),idx=p?.chapters.findIndex(c=>c.id===id);
  if(idx==null||idx<0)return;
  const c=p.chapters[idx];
  const duplicate=JSON.parse(JSON.stringify(c));duplicate.id=uid();duplicate.title=c.title+' · copia';duplicate.createdAt=now();duplicate.updatedAt=now();duplicate.flagged=false;duplicate.pinned=false;
  p.chapters.splice(idx+1,0,duplicate);state.activeChapterId=duplicate.id;state.view='manuscript';changed();render();showToast('Capítulo duplicado');
}
function m11ApplyTreeFilter(){
  const query=m11SidebarQuery.toLocaleLowerCase('es').trim();let visible=0;
  document.querySelectorAll('.sidebar .tree-entry').forEach(entry=>{
    const title=(entry.querySelector('.tree-leaf .truncate')?.textContent||'').toLocaleLowerCase('es');
    const found=!query||title.includes(query);entry.style.display=found?'':'none';if(found)visible++;
  });
  const empty=el('m11-tree-empty');if(empty)empty.style.display=visible===0&&!!query?'block':'none';
}
function m11BindSidebar(){
  const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
  const scroll=sidebar.querySelector('.sidebar-scroll');if(!scroll)return;
  if(state.view==='desk'||state.view==='library'){m11SidebarQuery='';return;}
  if(!scroll.querySelector('#m11-tree-search')){
    const box=document.createElement('div');box.className='m11-tree-search';
    box.innerHTML=`<input id="m11-tree-search" type="search" placeholder="Filtrar elementos del libro…" aria-label="Buscar en el árbol del libro" value="${esc(m11SidebarQuery)}"><small>Arrastra para ordenar · clic para abrir · fijados arriba</small><div class="m11-tree-empty" id="m11-tree-empty">Ningún elemento coincide.</div>`;
    scroll.prepend(box);
  }
  const input=el('m11-tree-search');if(input)input.oninput=e=>{m11SidebarQuery=e.target.value;m11ApplyTreeFilter()};
  scroll.querySelectorAll('.tree-entry').forEach(entry=>{
    const btn=entry.querySelector('.tree-leaf'),view=btn?.dataset.type,id=btn?.dataset.id;
    if(!btn||!collections[view])return;
    entry.classList.add('m11-tree-entry');entry.draggable=true;
    entry.title='Arrastra este elemento para cambiar su posición dentro de su sección';
    if(view==='manuscript'){
      const extra=document.createElement('span');extra.className='m11-extra';
      extra.innerHTML=`<button title="Duplicar capítulo" aria-label="Duplicar capítulo">${ic('copy')}</button>`;
      extra.querySelector('button').onclick=e=>{e.stopPropagation();m11DuplicateChapter(id)};
      entry.append(extra);
    }
    entry.addEventListener('dragstart',e=>{
      if(e.target.closest?.('input,label,.entry-aux,.m11-extra')){e.preventDefault();return;}
      m11TreeDrag={view,id};entry.classList.add('m11-dragging');
      if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','MARGEN-tree-item')}
    });
    entry.addEventListener('dragover',e=>{
      if(!m11TreeDrag||m11TreeDrag.view!==view||m11TreeDrag.id===id)return;
      e.preventDefault();e.stopPropagation();
      entry.classList.toggle('m11-drop-after',e.clientY>entry.getBoundingClientRect().top+entry.clientHeight/2);
      entry.classList.toggle('m11-drop-before',!entry.classList.contains('m11-drop-after'));
      if(e.dataTransfer)e.dataTransfer.dropEffect='move';
    });
    entry.addEventListener('dragleave',()=>entry.classList.remove('m11-drop-before','m11-drop-after'));
    entry.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();
      const after=entry.classList.contains('m11-drop-after');entry.classList.remove('m11-drop-before','m11-drop-after');
      if(m11TreeDrag?.view===view)m11MoveTreeItem(view,m11TreeDrag.id,id,after);m11TreeDrag=null;
    });
    entry.addEventListener('dragend',()=>{
      m11TreeDrag=null;sidebar.querySelectorAll('.m11-tree-entry').forEach(x=>x.classList.remove('m11-dragging','m11-drop-before','m11-drop-after'));
    });

  });
  m11ApplyTreeFilter();
}
const m11OldWire=wire;
wire=function(){
  m11OldWire();
  const brand=document.querySelector('.brand');
  if(brand&&!brand.querySelector('.m11-version'))brand.insertAdjacentHTML('beforeend','<span class="m11-version" title="Versión de prueba independiente">1.1 · A</span>');
  m11BindSidebar();m11BindEditor();
};
const m11OldRenderSidebar=renderSidebarOnly;
renderSidebarOnly=function(){
  const scroll=document.querySelector('.sidebar-scroll'),oldScroll=scroll?.scrollTop||0;
  m11OldRenderSidebar();m11BindSidebar();
  const updated=document.querySelector('.sidebar-scroll');if(updated)updated.scrollTop=oldScroll;
};
const m11OldAction=onAction;
onAction=function(e){
  const action=e.currentTarget.dataset.action;
  if(action==='m11-prev'){m11OpenAdjacentChapter(-1);return;}
  if(action==='m11-next'){m11OpenAdjacentChapter(1);return;}
  if(action==='m11-find'){m11OpenSearch();return;}
  if(action==='m11-find-previous'){m11FindStep(-1);return;}
  if(action==='m11-find-next'){m11FindStep(1);return;}
  if(action==='m11-find-close'){m11CloseSearch();return;}
  if(action==='m11-focus'){m11FocusMode=!m11FocusMode;m11ApplyFocus();return;}
  return m11OldAction(e);
};
window.addEventListener('keydown',e=>{
  if(state?.view!=='manuscript')return;
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='f'){
    e.preventDefault();e.stopPropagation();m11OpenSearch();return;
  }
  if(e.key==='Escape'){
    if(el('m11-findbar')&&!el('m11-findbar').hidden){e.preventDefault();m11CloseSearch();return;}
    if(m11FocusMode){e.preventDefault();m11FocusMode=false;m11ApplyFocus();}
  }
  if(e.key==='Enter'&&e.target?.id==='m11-find-input'){e.preventDefault();m11FindStep(e.shiftKey?-1:1);}
},true);


/* MARGEN 1.1 · PROTOTIPO A — opción de tamaño de página.
   Preferencia por LIBRO, compartida entre los capítulos del libro.
   Se mantiene JSON version:1 y la misma base de pruebas de 1.1 A.
   No altera el contenido HTML del capítulo ni activa una paginación de imprenta.
*/
const m11PageOldBindEditor=m11BindEditor;
m11BindEditor=function(){
  m11PageOldBindEditor();
  if(state.view!=='manuscript')return;
  const project=activeProject(),editorArea=document.querySelector('.editor-area'),nav=document.querySelector('.m11-navbox .m11-navgroup:last-child');
  if(!project||!editorArea||!nav)return;
  const format=project.pageFormat==='a4'?'a4':'book';
  editorArea.dataset.pageFormat=format;
  const label=document.createElement('label');
  label.className='m11-page-control';
  label.title='Formato visual del papel. Los capítulos siguen siendo páginas continuas, sin paginación de imprenta.';
  label.append(document.createTextNode('Página'));
  const picker=document.createElement('select');
  picker.id='m11-page-format';
  picker.setAttribute('aria-label','Tamaño de página del libro');
  for(const [value,name] of [['book','Libro · 15 × 23 cm'],['a4','A4 · 21 × 29,7 cm']]){
    const option=document.createElement('option');option.value=value;option.textContent=name;picker.append(option);
  }
  picker.value=format;
  picker.onchange=()=>{
    project.pageFormat=picker.value==='a4'?'a4':'book';
    editorArea.dataset.pageFormat=project.pageFormat;
    changed();
  };
  label.append(picker);nav.prepend(label);
};


/* ==================== MARGEN 1.2 · PROTOTIPO B ====================
   Partimos de 1.1 A + formato de página, sin reemplazar sus herramientas.
   Las propiedades nuevas son opcionales: JSON version 1 sigue siendo válido.
*/
const m12Ensure=ensureSelections;
ensureSelections=function(){
  m12Ensure();
  for(const p of state?.projects||[]){
    for(const person of p.characters||[])person.chapterIds=Array.isArray(person.chapterIds)?person.chapterIds:[];
    for(const place of p.settings||[]){
      place.gallery=Array.isArray(place.gallery)?place.gallery:[];
      place.chapterIds=Array.isArray(place.chapterIds)?place.chapterIds:[];
      place.characterIds=Array.isArray(place.characterIds)?place.characterIds:[];
      for(const name of ['atmosphere','history','sensory','details'])if(typeof place[name]!=='string')place[name]='';
    }
  }
};
function m12LinkedRows(items,linked,kind){
  return items.length?`<div class="m12-links">${items.map(x=>`<div class="m12-link-row"><label><input type="checkbox" data-m12-link="${kind}" data-m12-id="${esc(x.id)}" ${linked.includes(x.id)?'checked':''}><span title="${esc(x.title)}">${esc(x.title)}</span></label><button type="button" class="btn ghost" data-m12-open="${kind}" data-m12-id="${esc(x.id)}">Abrir</button></div>`).join('')}</div>`:'<p class="m12-panel-intro">Todavía no hay elementos de este tipo en el libro.</p>';
}
function m12Panel(title,icon,body,wide=false){return `<section class="char-panel ${wide?'wide':''}"><h3>${ic(icon)} ${title}</h3>${body}</section>`;}
const m12OldSheet=sheetHtml;
sheetHtml=function(p,type){
  if(type!=='settings')return m12OldSheet(p,type);
  const place=activeSetting(),heading=`<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Escenarios</div><h1>Ficha de escenario</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-setting" ${place?'':'disabled'} title="Eliminar ficha">${ic('trash')}</button><button class="btn primary" data-action="add-setting">${ic('plus')} Nuevo escenario</button></div></div>`;
  if(!place)return heading+`<div class="empty-state">${ic('map')}<h2>Los lugares de tu historia</h2><p>Crea un escenario y enlázalo a los capítulos y personajes de tu libro.</p><button class="btn primary" data-action="add-setting">${ic('plus')} Crear escenario</button></div>`;
  const photos=place.gallery||[];
  const avatar=photos[0]?.src?`<img src="${esc(photos[0].src)}" alt="Vista del escenario">`:ic('map');
  const field=(label,key,placeholder)=>`<label>${esc(label)}<textarea class="m12-text-area" data-m12-setting="${key}" placeholder="${esc(placeholder)}">${esc(place[key]||'')}</textarea></label>`;
  const gallery=`<p class="m12-panel-intro">Referencias visuales, planos, exteriores e interiores. Hasta 16 imágenes por escenario. Los PNG conservan su transparencia.</p><div class="char-gallery">${photos.map(x=>`<div class="char-photo"><img src="${esc(x.src)}" alt="Referencia visual de escenario"><button type="button" data-m12-photo-remove="${esc(x.id)}" aria-label="Quitar imagen">✕</button></div>`).join('')}<button class="char-gallery-add" type="button" id="m12-add-photos">${ic('plus')}<span>Añadir imágenes</span></button></div><input id="m12-photos" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>`;
  return heading+`<div class="main-scroll"><div class="char-page"><div class="m12-setting-info"><div class="m12-place-thumb">${avatar}</div><div class="m12-setting-title"><span class="char-tag">${ic('map')} ESCENARIO</span><input class="note-title" id="fiche-title" value="${esc(place.title)}" placeholder="Nombre del escenario"><label class="field-mini">Tipo de lugar / localización<input id="fiche-subtitle" value="${esc(place.subtitle||'')}" placeholder="Ciudad, edificio, habitación, paisaje..."></label></div></div><div class="m12-setting-layout">${m12Panel('Descripción del lugar','map',`<label>Descripción general<textarea class="m12-text-area" id="fiche-body" placeholder="Cómo es este lugar, dónde está, qué lo caracteriza...">${esc(place.content||'')}</textarea></label>`)}${m12Panel('Atmósfera','feather',field('Sensación y ambiente','atmosphere','¿Qué se siente al estar aquí? Luz, temperatura, ritmo...'))}${m12Panel('Detalles sensoriales','note',field('Sonidos, olores, texturas','sensory','Un zumbido de fluorescentes, olor a lluvia, suelo frío...'))}${m12Panel('Historia y secretos','clock',field('Pasado del lugar','history','¿Qué ocurrió aquí antes de que comience la novela?'))}${m12Panel('Detalles importantes','edit',field('Elementos para recordar','details','Objetos, entradas, salidas, puntos de interés...'))}${m12Panel('Galería visual','image',gallery)}${m12Panel('Capítulos vinculados','book',`<p class="m12-panel-intro">Marca los capítulos donde aparece este lugar. «Abrir» te lleva directamente a ellos.</p>${m12LinkedRows(p.chapters,place.chapterIds,'chapter')}`,true)}${m12Panel('Personajes vinculados','users',`<p class="m12-panel-intro">Marca los personajes relacionados con el escenario. Puedes entrar en sus fichas directamente.</p>${m12LinkedRows(p.characters,place.characterIds,'character')}`,true)}</div></div></div>`;
};
function m12AppendCharacterPanels(){
  const person=activeCharacter(),p=activeProject(),grid=document.querySelector('.char-page .char-grid');
  if(!person||!p||!grid)return;
  person.chapterIds=person.chapterIds||[];
  const wraps=document.createElement('div');wraps.className='m12-character-panels';wraps.style.display='contents';
  wraps.innerHTML=m12Panel('Capítulos vinculados','book',`<p class="m12-panel-intro">Relaciona manualmente este personaje con los capítulos donde aparece. Abre cualquiera desde aquí.</p>${m12LinkedRows(p.chapters,person.chapterIds,'chapter')}`,true);
  const places=p.settings.filter(s=>(s.characterIds||[]).includes(person.id));
  if(places.length)wraps.innerHTML+=m12Panel('Escenarios relacionados','map',`<div class="m12-linked-plain">${places.map(s=>`<button class="btn" data-m12-open="setting" data-m12-id="${esc(s.id)}">${ic('map')} ${esc(s.title)}</button>`).join('')}</div>`,true);
  const events=(p.chronologies||[]).flatMap(t=>(t.events||[]).filter(e=>e.characterId===person.id).map(e=>({title:e.title||'Acontecimiento',chronologyId:t.id,date:e.date})));
  if(events.length)wraps.innerHTML+=m12Panel('Acontecimientos de sus cronologías','clock',`<div class="m12-linked-plain">${events.map(e=>`<button class="btn" data-m12-open="chronology" data-m12-id="${esc(e.chronologyId)}">${ic('clock')} ${esc(e.title)}${e.date?' · '+esc(e.date):''}</button>`).join('')}</div>`,true);
  grid.append(wraps);
}
function m12OpenLink(kind,id){
  const p=activeProject();if(!p)return;
  const table={chapter:['chapters','activeChapterId','manuscript'],character:['characters','activeCharacterId','characters'],setting:['settings','activeSettingId','settings'],chronology:['chronologies','activeChronologyId','chronologies']};
  const data=table[kind];if(!data||!p[data[0]]?.some(x=>x.id===id))return;
  state[data[1]]=id;state.view=data[2];changed();render();
}
function m12BindSheets(){
  const p=activeProject(),person=state.view==='characters'?activeCharacter():null,place=state.view==='settings'?activeSetting():null;
  const current=person||place;
  if(!p||!current)return;
  if(person)m12AppendCharacterPanels();
  // El sistema anterior sigue controlando título, subtítulo y la ficha de personaje.
  if(place){
    const main=el('fiche-body');if(main)main.oninput=e=>{place.content=e.target.value;changed()};
    document.querySelectorAll('[data-m12-setting]').forEach(input=>input.oninput=e=>{place[e.target.dataset.m12Setting]=e.target.value;changed()});
    const input=el('m12-photos'),add=el('m12-add-photos');
    if(add&&input)add.onclick=()=>input.click();
    if(input)input.onchange=async e=>{
      const files=Array.from(e.target.files||[]);e.target.value='';let count=0;
      const projectId=p.id,placeId=place.id;
      for(const file of files){
        if(place.gallery.length>=16){showToast('Máximo: 16 imágenes por escenario');break}
        if(!file.type.startsWith('image/')||file.size>25*1024*1024)continue;
        try{const src=await compressImage(file);const owner=state.projects.find(x=>x.id===projectId)?.settings.find(x=>x.id===placeId);if(!owner)break;owner.gallery=owner.gallery||[];if(owner.gallery.length>=16)break;owner.gallery.push({id:uid(),src});changed();count++}catch(error){console.warn('Imagen del escenario:',error)}
      }
      if(count){showToast(count+' imagen(es) añadida(s)');if(state.activeProjectId===projectId&&state.view==='settings'&&activeSetting()?.id===placeId)render()}
    };
    document.querySelectorAll('[data-m12-photo-remove]').forEach(b=>b.onclick=()=>{const index=place.gallery.findIndex(x=>x.id===b.dataset.m12PhotoRemove);if(index<0)return;place.gallery.splice(index,1);changed();render()});
  }
  document.querySelectorAll('[data-m12-link]').forEach(input=>input.onchange=e=>{
    const target=input.dataset.m12Link,id=input.dataset.m12Id;
    const targetArr=target==='chapter'?'chapterIds':target==='character'?'characterIds':null;
    if(!targetArr)return;
    const collection=target==='chapter'?p.chapters:p.characters;
    if(!collection.some(x=>x.id===id))return;
    current[targetArr]=Array.isArray(current[targetArr])?current[targetArr]:[];
    if(e.target.checked&&!current[targetArr].includes(id))current[targetArr].push(id);
    if(!e.target.checked)current[targetArr]=current[targetArr].filter(x=>x!==id);
    changed();
  });
  document.querySelectorAll('[data-m12-open]').forEach(b=>b.onclick=()=>m12OpenLink(b.dataset.m12Open,b.dataset.m12Id));
  if(person)document.querySelectorAll('.arc-event').forEach(box=>{
    const selection=box.querySelector('[data-arc-field="chapterId"]');if(!selection)return;
    const open=document.createElement('button');open.type='button';open.className='btn ghost';open.textContent='Abrir capítulo';
    open.style.margin='-2px 0 5px';open.onclick=()=>{if(selection.value)m12OpenLink('chapter',selection.value);else showToast('Vincula primero un capítulo')};
    box.append(open);
  });
}
/* Pizarra: las capas se guardan en el orden del array. Los grupos conservan
   su estructura, aunque se muevan juntos delante o detrás. */
const m12OldBoardElement=boardElementHtml;
boardElementHtml=function(item){
  let html=m12OldBoardElement(item);
  if(!html)return html;
  if(item.locked)html=html.replace('class="board-item ','class="board-item m12-locked ');
  const opts=`<div class="m12-layer-divider"></div><button type="button" class="m12-board-menu-option" data-m12-board="front" data-id="${esc(item.id)}">Traer delante</button><button type="button" class="m12-board-menu-option" data-m12-board="back" data-id="${esc(item.id)}">Enviar detrás</button><button type="button" class="m12-board-menu-option" data-m12-board="lock" data-id="${esc(item.id)}">${item.locked?'🔓 Desbloquear':'🔒 Bloquear posición'}</button>`;
  return html.replace('<button type="button" data-board-command="duplicate"',opts+'<button type="button" data-board-command="duplicate"');
};
const m12PrevStartDrag=startItemDrag;
startItemDrag=function(e,item,node,kind){
  const group=item.groupId?activeBoard()?.elements.filter(x=>x.groupId===item.groupId):[item];
  if(group?.some(x=>x.locked)){showToast('Hay un objeto bloqueado en el grupo: desbloquéalo desde ⋯');return;}
  return m12PrevStartDrag(e,item,node,kind);
};
function m12BoardTargets(item){
  const board=activeBoard();if(!board)return[];
  if(item.groupId)return board.elements.filter(x=>x.groupId===item.groupId);
  // El botón ⋯ de un objeto seleccionado en una selección múltiple actúa sobre ese objeto.
  return[item];
}
function m12BoardCommand(id,command){
  const b=activeBoard(),item=b?.elements.find(x=>x.id===id);if(!item)return;
  const group=m12BoardTargets(item);pushBoardUndo();
  if(command==='lock'){const locked=group.every(x=>!!x.locked);group.forEach(x=>x.locked=!locked)}
  if(command==='front'||command==='back'){
    const ids=new Set(group.map(x=>x.id)),picked=b.elements.filter(x=>ids.has(x.id)),others=b.elements.filter(x=>!ids.has(x.id));
    b.elements=command==='front'?[...others,...picked]:[...picked,...others];
  }
  changed();renderBoardElements();setSelected(id);
  showToast(command==='lock'?(item.locked?'Objeto bloqueado':'Objeto desbloqueado'):command==='front'?'Traído delante':'Enviado detrás');
}
const m12PrevRenderBoard=renderBoardElements;
renderBoardElements=function(){
  m12PrevRenderBoard();
  document.querySelectorAll('[data-m12-board]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();m12BoardCommand(b.dataset.id,b.dataset.m12Board)}));
  document.querySelectorAll('.board-item.m12-locked .item-body').forEach(x=>x.contentEditable='false');
  document.querySelectorAll('.board-item.m12-locked input.item-note-title').forEach(x=>x.readOnly=true);
};
const m12PreviousBoardHtml=boardHtml;
boardHtml=function(p){
  let html=m12PreviousBoardHtml(p);
  if(activeBoard())html=html.replace('<div class="board-viewport"',`<div class="m12-board-help">Novedad 1.2: menú ⋯ → Bloquear / Desbloquear, Traer delante, Enviar detrás. Flechas para mover; Mayús + flecha, 10 px.</div><div class="board-viewport"`);
  return html;
};
function m12BindBoard(){
  if(state.view!=='boards')return;
  // Se instala una sola vez y no interfiere con los atajos dentro de notas.
  if(!window.m12BoardKeyboardBound){
    window.m12BoardKeyboardBound=true;
    window.addEventListener('keydown',e=>{
      if(state?.view!=='boards'||!activeBoard()||!selectedElement)return;
      if(e.target?.closest?.('input,textarea,[contenteditable],select'))return;
      const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(!direction||e.altKey||e.ctrlKey||e.metaKey)return;
      e.preventDefault();const b=activeBoard(),selected=b.elements.find(x=>x.id===selectedElement);if(!selected)return;
      const group=selected.groupId?b.elements.filter(x=>x.groupId===selected.groupId):[selected];
      const movable=group.filter(x=>!x.locked);if(!movable.length){showToast('Objeto bloqueado');return;}
      pushBoardUndo();const inc=e.shiftKey?10:1;
      for(const item of movable){item.x=Math.max(0,Math.min(3800,(Number(item.x)||0)+direction[0]*inc));item.y=Math.max(0,Math.min(2600,(Number(item.y)||0)+direction[1]*inc));const node=document.querySelector(`.board-item[data-eid="${CSS.escape(item.id)}"]`);if(node){node.style.left=item.x+'px';node.style.top=item.y+'px'}}
      changed();
    },true)
  }
}
const m12PrevWire=wire;
wire=function(){
  m12PrevWire();
  document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.2 · B'));
  m12BindSheets();m12BindBoard();
};



/* ==================== MARGEN 1.2.1 ==================== */
const m121Ensure=ensureSelections;
ensureSelections=function(){
  m121Ensure();
  for(const p of state?.projects||[]){
    for(const b of p.boards||[]){
      if(!Array.isArray(b.connections))b.connections=[];
      if(typeof b.diagramMode!=='string')b.diagramMode='free';
      if(typeof b.diagramRelationType!=='string')b.diagramRelationType='parent';
      if(typeof b.relationsRelationType!=='string')b.relationsRelationType='amistad';
    }
  }
};
function m121RelationOptions(mode){
  return mode==='genealogy'?
   [
    {id:'parent',label:'Progenitor/a',color:'#8a6a55',style:'solid',symbol:'◌'},
    {id:'child',label:'Descendencia',color:'#7a8f61',style:'solid',symbol:'↓'},
    {id:'partner',label:'Pareja',color:'#b56a8d',style:'dashed',symbol:'♥'},
    {id:'sibling',label:'Hermandad',color:'#667ea8',style:'soft',symbol:'≈'}
   ]:
   [
    {id:'amistad',label:'Amistad',color:'#5d89b3',style:'solid',symbol:'✦'},
    {id:'amor',label:'Amor',color:'#c56b93',style:'dashed',symbol:'♥'},
    {id:'rivalidad',label:'Rivalidad',color:'#c06555',style:'solid',symbol:'⚡'},
    {id:'familia',label:'Familia',color:'#7d9866',style:'soft',symbol:'⌂'},
    {id:'secreto',label:'Secreto',color:'#8a73b6',style:'dashed',symbol:'✶'}
   ];
}
function m121RelationMeta(mode,id){return m121RelationOptions(mode).find(x=>x.id===id)||m121RelationOptions(mode)[0]}
function m121CurrentRelationType(b){return b.diagramMode==='genealogy'?(b.diagramRelationType||'parent'):(b.relationsRelationType||'amistad')}
function m121SetCurrentRelationType(b,value){if(b.diagramMode==='genealogy')b.diagramRelationType=value;else if(b.diagramMode==='relations')b.relationsRelationType=value;changed();}
function m121LinkedRows(items,linked,kind){
  linked=Array.isArray(linked)?linked:[];
  const label=kind==='chapter'?'Capítulos':'Personajes';
  if(!items.length)return '<p class="m12-panel-intro">Todavía no hay elementos de este tipo en el libro.</p>';
  return `<details class="m121-linkbox" ${items.length<=7?'open':''}><summary><span class="caret">${ic('chevron')}</span><span>${label}</span><small>${linked.length} marcados · ${items.length} totales</small></summary><div class="m121-linkbox-body"><div class="m12-links">${items.map(x=>`<div class="m12-link-row"><label><input type="checkbox" data-m12-link="${kind}" data-m12-id="${esc(x.id)}" ${linked.includes(x.id)?'checked':''}><span title="${esc(x.title)}">${esc(x.title)}</span></label><button type="button" class="btn ghost" data-m12-open="${kind}" data-m12-id="${esc(x.id)}">Abrir</button></div>`).join('')}</div></div></details>`;
}
const m121PrevBoardElement=boardElementHtml;
boardElementHtml=function(item){
  let html=m121PrevBoardElement(item);
  if(!html)return html;
  if(item.diagramNode){
    html=html.replace('class="board-item ','class="board-item m121-node '+(item.diagramNode==='genealogy'?'genealogy ':'relation '));
  }
  return html;
};
const m121PrevBoardHtml=boardHtml;
boardHtml=function(p){
  let html=m121PrevBoardHtml(p); const b=activeBoard(); if(!b)return html;
  const typeOptions=m121RelationOptions(b.diagramMode==='genealogy'?'genealogy':'relations').map(opt=>`<option value="${opt.id}" ${m121CurrentRelationType(b)===opt.id?'selected':''}>${opt.label}</option>`).join('');
  const extra=`<span class="tool-divider"></span><div class="m121-board-extra"><label>Modo<select id="m121-board-mode"><option value="free" ${b.diagramMode==='free'?'selected':''}>Pizarra libre</option><option value="genealogy" ${b.diagramMode==='genealogy'?'selected':''}>Genealogía</option><option value="relations" ${b.diagramMode==='relations'?'selected':''}>Relaciones</option></select></label>${b.diagramMode!=='free'?`<button class="btn" data-action="m121-add-node">${ic('plus')} ${b.diagramMode==='genealogy'?'Persona / rama':'Nodo'}</button><label>Vínculo<select id="m121-relation-type">${typeOptions}</select></label><button class="btn ghost ${window.m121ConnectActive?'active':''}" data-action="m121-toggle-connect">${ic('link')} ${window.m121ConnectActive?'Cancelar vínculo':'Crear vínculo'}</button><span class="hint">${window.m121ConnectActive?(window.m121ConnectFrom?'Ahora elige el segundo nodo.':'Elige el primer nodo.'):'Añade nodos y conéctalos con líneas de colores.'}</span>`:''}</div>`;
  html=html.replace('</div><div class="m12-board-help">',extra+'</div><div class="m12-board-help">');
  html=html.replace('Novedad 1.2: menú ⋯ → Bloquear / Desbloquear, Traer delante, Enviar detrás. Flechas para mover; Mayús + flecha, 10 px.','Novedad 1.2.1: la ayuda vuelve a su sitio. Además hay modos Genealogía y Relaciones, con vínculos de color entre nodos. Menú ⋯: bloquear / traer delante / enviar detrás.');
  return html;
};
function m121AddNode(){
  const b=activeBoard(); if(!b) return;
  addBoardElement('note'); const item=b.elements.find(x=>x.id===selectedElement); if(!item) return;
  item.diagramNode=b.diagramMode==='genealogy'?'genealogy':'relations'; item.w=240; item.h=150;
  if(b.diagramMode==='genealogy'){item.title='Nombre'; item.text='Parentesco, fechas o notas'; item.color='#efe3cf';}
  else {item.title='Nodo'; item.text='Qué relación o rol tiene'; item.color='#e8ecd8';}
  changed(); renderBoardElements(); setSelected(item.id);
}
function m121MakeConnection(idA,idB){
  const b=activeBoard(); if(!b||idA===idB) return;
  const mode=b.diagramMode; if(mode==='free')return;
  const type=m121CurrentRelationType(b); const exists=(b.connections||[]).some(c=>c.mode===mode&&c.type===type&&((c.from===idA&&c.to===idB)||(c.from===idB&&c.to===idA)));
  if(exists){showToast('Ese vínculo ya existe'); return;}
  b.connections.push({id:uid(),from:idA,to:idB,mode,type}); changed(); renderBoardElements(); showToast('Vínculo creado');
}
function m121BindBoardUI(){
  if(state.view!=='boards')return; const b=activeBoard(); if(!b) return;
  const mode=el('m121-board-mode'); if(mode) mode.onchange=e=>{b.diagramMode=e.target.value; if(b.diagramMode==='free'){window.m121ConnectActive=false;window.m121ConnectFrom=null;} changed(); render();};
  const rel=el('m121-relation-type'); if(rel) rel.onchange=e=>m121SetCurrentRelationType(b,e.target.value);
  document.querySelectorAll('.board-item').forEach(node=>{
    node.addEventListener('click',evt=>{
      if(state.view!=='boards'||!window.m121ConnectActive||!activeBoard()||activeBoard().diagramMode==='free')return;
      if(evt.target.closest('.item-popmenu,.item-menu-panel'))return;
      evt.preventDefault(); evt.stopPropagation(); const id=node.dataset.eid; if(!id)return;
      if(!window.m121ConnectFrom){window.m121ConnectFrom=id; renderBoardElements(); showToast('Selecciona el segundo nodo'); return;}
      if(window.m121ConnectFrom===id){window.m121ConnectFrom=null; renderBoardElements(); showToast('Selecciona otro nodo'); return;}
      m121MakeConnection(window.m121ConnectFrom,id); window.m121ConnectFrom=null; window.m121ConnectActive=false; render();
    },true)
  });
}
function m121RenderConnections(){
  const b=activeBoard(),world=el('board-world'); if(!b||!world) return;
  let svg=world.querySelector('.board-connection-layer');
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','board-connection-layer'); world.prepend(svg);} else svg.innerHTML='';
  svg.setAttribute('viewBox','0 0 4000 2800'); svg.setAttribute('width','4000'); svg.setAttribute('height','2800');
  for(const conn of b.connections||[]){
    const a=b.elements.find(x=>x.id===conn.from), c=b.elements.find(x=>x.id===conn.to); if(!a||!c) continue;
    const ax=(Number(a.x)||0)+(Number(a.w)||0)/2, ay=(Number(a.y)||0)+(Number(a.h)||0)/2;
    const bx=(Number(c.x)||0)+(Number(c.w)||0)/2, by=(Number(c.y)||0)+(Number(c.h)||0)/2;
    const meta=m121RelationMeta(conn.mode||b.diagramMode,conn.type); const mx=(ax+bx)/2, my=(ay+by)/2;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('x1',ax); line.setAttribute('y1',ay); line.setAttribute('x2',bx); line.setAttribute('y2',by); line.setAttribute('stroke',meta.color); line.setAttribute('class','board-connection-line '+(meta.style||'')); svg.append(line);
    const text=document.createElementNS('http://www.w3.org/2000/svg','text'); text.setAttribute('x',mx); text.setAttribute('y',my-7); text.setAttribute('text-anchor','middle'); text.setAttribute('class','board-connection-label'); text.setAttribute('fill',meta.color); text.textContent=(meta.symbol?meta.symbol+' ':'')+meta.label; svg.append(text);
  }
  document.querySelectorAll('.board-item').forEach(n=>n.classList.toggle('m121-connect-source',window.m121ConnectFrom===n.dataset.eid));
}
const m121PrevRenderBoard=renderBoardElements;
renderBoardElements=function(){
  m121PrevRenderBoard();
  document.querySelectorAll('.board-item').forEach(node=>{
    node.onclick=(evt)=>{
      if(state.view!=='boards'||!window.m121ConnectActive||!activeBoard()||activeBoard().diagramMode==='free')return;
      if(evt.target.closest('.item-popmenu,.item-menu-panel'))return;
      evt.preventDefault(); evt.stopPropagation();
      const id=node.dataset.eid; if(!id)return;
      if(!window.m121ConnectFrom){window.m121ConnectFrom=id; m121RenderConnections(); showToast('Selecciona el segundo nodo'); return;}
      if(window.m121ConnectFrom===id){window.m121ConnectFrom=null; m121RenderConnections(); showToast('Selecciona otro nodo'); return;}
      m121MakeConnection(window.m121ConnectFrom,id); window.m121ConnectFrom=null; window.m121ConnectActive=false; render();
    };
  });
  m121RenderConnections();
};
const m121PrevOnAction=onAction;
onAction=function(e){
 const btn=e.target.closest('[data-action]'); const action=btn?.dataset.action;
 if(action==='timeline-add'){
   const t=activeChronology(); if(!t) return; const id=uid(); t.events.push({id,title:'',date:'',description:'',chapterId:'',characterId:'',expanded:true}); changed(); render(); requestAnimationFrame(()=>{document.querySelector(`[data-timeline-id="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest'}); document.querySelector(`[data-event-id="${CSS.escape(id)}"][data-timeline-field="title"]`)?.focus();}); return;
 }
 if(action==='arc-add'){
   const person=activeCharacter(); if(!person) return; const id=uid(); person.arc.push({id,stage:'',chapterId:'',change:''}); changed(); render(); requestAnimationFrame(()=>{document.querySelector(`[data-arc-id="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest'}); document.querySelector(`[data-arc-id="${CSS.escape(id)}"] [data-arc-field="stage"]`)?.focus();}); return;
 }
 if(action==='m121-add-node'){m121AddNode(); return;}
 if(action==='m121-toggle-connect'){
   const b=activeBoard(); if(!b||b.diagramMode==='free')return; window.m121ConnectActive=!window.m121ConnectActive; window.m121ConnectFrom=null; render(); showToast(window.m121ConnectActive?'Selecciona dos nodos para crear el vínculo':'Creación de vínculo cancelada'); return;
 }
 return m121PrevOnAction(e);
};
const m121PrevWire=wire;
wire=function(){m121PrevWire(); document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.2.1')); m121BindBoardUI();};


/* ================================================================
   MARGEN 1.2.2 — nueva arquitectura de diagramas
   La pizarra LIBRE conserva sus elementos originales. Genealogía y
   Relaciones tienen nodos, enlaces y posiciones PROPIOS por pizarra.
   ================================================================ */
const m122OriginalEnsure=ensureSelections;
ensureSelections=function(){
  m122OriginalEnsure();
  for(const p of state?.projects||[])for(const b of p.boards||[]){
    if(!b.graphs||typeof b.graphs!=='object')b.graphs={};
    for(const mode of ['genealogy','relations']){
      if(!b.graphs[mode]||typeof b.graphs[mode]!=='object')b.graphs[mode]={nodes:[],edges:[],zoom:1,panX:-550,panY:-450};
      const g=b.graphs[mode];if(!Array.isArray(g.nodes))g.nodes=[];if(!Array.isArray(g.edges))g.edges=[];
      if(!Number.isFinite(g.zoom)||g.zoom<.35||g.zoom>2.5)g.zoom=1;
      if(!Number.isFinite(g.panX))g.panX=-550;if(!Number.isFinite(g.panY))g.panY=-450;
    }
    if(!b.m122Migrated){
      // Copiar, no destruir, los nodos del prototipo anterior.
      // Los diagramas nuevos no dependen de las notas anteriores.
      for(const mode of ['genealogy','relations']){
        const nodes=(b.elements||[]).filter(x=>x.diagramNode===mode);
        const g=b.graphs[mode], ids=new Set(nodes.map(n=>n.id));
        for(const x of nodes)if(!g.nodes.some(n=>n.id===x.id))g.nodes.push({id:x.id,name:x.title||'Persona',subtitle:'',detail:x.text||'',date:'',x:x.x,y:x.y,characterId:''});
        for(const c of b.connections||[])if(c.mode===mode&&ids.has(c.from)&&ids.has(c.to)&&!g.edges.some(e=>e.id===c.id))g.edges.push({id:c.id||uid(),from:c.from,to:c.to,type:c.type||m122RelationTypes(mode)[0].id,color:'',note:'',label:'',direction:mode==='genealogy'?'forward':'both'});
      }
      b.m122Migrated=true;
    }
  }
};
function m122RelationTypes(mode){return mode==='genealogy'?
 [
  {id:'parent',title:'Progenitor/a → hijo/a',symbol:'↓',color:'#8a7052',dash:'',arrow:true},
  {id:'adoptive',title:'Adopción → hijo/a',symbol:'◇',color:'#5e9b83',dash:'7 5',arrow:true},
  {id:'partner',title:'Pareja / matrimonio',symbol:'♥',color:'#c67b95',dash:'',arrow:false},
  {id:'sibling',title:'Hermanos/as',symbol:'≈',color:'#7089b0',dash:'5 5',arrow:false}
 ]:[
  {id:'friend',title:'Amistad',symbol:'✦',color:'#6b9bce',dash:'',arrow:false},
  {id:'love',title:'Amor',symbol:'♥',color:'#cf7095',dash:'',arrow:false},
  {id:'enemy',title:'Rivalidad',symbol:'⚡',color:'#d0756c',dash:'5 5',arrow:false},
  {id:'family',title:'Familia',symbol:'⌂',color:'#89a46b',dash:'',arrow:false},
  {id:'alliance',title:'Alianza',symbol:'◆',color:'#b3945e',dash:'',arrow:false},
  {id:'secret',title:'Secreto',symbol:'✶',color:'#9981bf',dash:'3 7',arrow:false},
  {id:'mentor',title:'Mentoría →',symbol:'➜',color:'#719c9d',dash:'',arrow:true}
 ];}
function m122Graph(){const b=activeBoard();return b&&b.graphs?.[b.diagramMode]||null}
function m122Type(mode,type){return m122RelationTypes(mode).find(x=>x.id===type)||m122RelationTypes(mode)[0]}
let m122Selection=null,m122Connecting=false,m122ConnectStart=null;
function m122ResetSelection(){m122Selection=null;m122Connecting=false;m122ConnectStart=null}
/* Fichas vinculadas: el panel completo se pliega, no solo una lista secundaria. */
const m122OriginalPanel=m12Panel;
m12Panel=function(title,icon,body,wide=false){
 const collapsible=/vinculad|relacionad|acontecimientos de sus cronologías/i.test(title);
 if(!collapsible)return m122OriginalPanel(title,icon,body,wide);
 const record=state.view==='characters'?activeCharacter():activeSetting();
 const key=title.toLowerCase().replace(/\s+/g,'-');
 const open=record?.m122ExpandedLinks?.[key]===true;
 const count=(body.match(/class="m12-link-row"/g)||[]).length;
 return `<details class="m122-linked-panel ${wide?'wide':''}" data-m122-link-panel="${esc(key)}" ${open?'open':''}><summary>${ic(icon)}<span>${esc(title)} <span class="m122-linked-header-count">${count} elementos</span></span>${ic('chevron').replace('<svg ','<svg class="m122-caret" ')}</summary><div class="m122-linked-body">${body}</div></details>`;
};
function m122BindLinkedPanels(){const r=state.view==='characters'?activeCharacter():activeSetting();if(!r)return;
 document.querySelectorAll('[data-m122-link-panel]').forEach(panel=>{
   panel.addEventListener('toggle',()=>{r.m122ExpandedLinks=r.m122ExpandedLinks||{};r.m122ExpandedLinks[panel.dataset.m122LinkPanel]=panel.open;changed()});
 });
}
/* Portal del menú: permanece visible incluso sobre notas muy pequeñas. */
let m122OpenMenu=null;
function m122CloseMenu(){if(!m122OpenMenu)return;
 const {details,panel}=m122OpenMenu;m122OpenMenu=null;details.open=false;panel.classList.remove('m122-float-menu');panel.style.left='';panel.style.top='';panel.style.width='';
 if(details.isConnected)details.append(panel);else panel.remove();
}
function m122FloatPosition(details,panel){const rect=details.querySelector('summary').getBoundingClientRect();
 const width=190;panel.style.width=width+'px';
 const left=Math.min(Math.max(8,rect.right-width),innerWidth-width-8);
 const natural=panel.scrollHeight;const top=rect.bottom+6+Math.min(natural,410)>innerHeight-8?Math.max(8,rect.top-Math.min(natural,410)-5):rect.bottom+5;
 panel.style.left=left+'px';panel.style.top=top+'px';
}
function m122InstallFloatingMenus(){
 document.querySelectorAll('.board-item .item-popmenu').forEach(details=>{
  const panel=details.querySelector('.item-menu-panel');if(!panel)return;
  details.addEventListener('toggle',()=>{
    if(details.open){
      if(m122OpenMenu&&m122OpenMenu.details!==details)m122CloseMenu();
      m122OpenMenu={details,panel};document.body.append(panel);panel.classList.add('m122-float-menu');m122FloatPosition(details,panel);
    }else if(m122OpenMenu?.details===details)m122CloseMenu();
  });
 });
}
if(!window.m122OutsideBound){window.m122OutsideBound=true;
 document.addEventListener('pointerdown',e=>{if(m122OpenMenu&&!m122OpenMenu.panel.contains(e.target)&&!m122OpenMenu.details.contains(e.target))m122CloseMenu()},true);
 window.addEventListener('resize',()=>{if(m122OpenMenu)m122FloatPosition(m122OpenMenu.details,m122OpenMenu.panel)});
 window.addEventListener('wheel',()=>{if(m122OpenMenu)m122FloatPosition(m122OpenMenu.details,m122OpenMenu.panel)},{capture:true,passive:true});
}
const m122PrevRenderBoardItems=renderBoardElements;
renderBoardElements=function(){m122CloseMenu();m122PrevRenderBoardItems();m122InstallFloatingMenus();};
/* Vista propia para genealogía y relaciones, sin post-its. */
function m122DiagramHtml(p,b){
 const mode=b.diagramMode,g=m122Graph();if(!g)return '';
 const types=m122RelationTypes(mode);
 const typeSel=mode==='genealogy'?'parent':'friend';
 return `<div class="workspace-head" style="padding-bottom:13px"><div><span class="eyebrow">${esc(p.name)} · Diagramas</span><h1>${esc(b.title)} <span style="font-size:13px;color:var(--muted)">/ ${mode==='genealogy'?'Genealogía':'Relaciones'}</span></h1></div><div class="head-actions"><button class="btn ghost" data-action="rename-board">${ic('rename')}</button><button class="btn ghost" data-action="duplicate-board" title="Duplicar pizarra">${ic('copy')}</button><button class="btn primary" data-action="add-board">${ic('plus')} Otra pizarra</button></div></div>
 <div class="m122-diagram-shell"><div class="m122-diagram-bar"><label>Modo<select id="m121-board-mode" aria-label="Modo de la pizarra"><option value="free">Pizarra libre</option><option value="genealogy" ${mode==='genealogy'?'selected':''}>Genealogía</option><option value="relations" ${mode==='relations'?'selected':''}>Relaciones</option></select></label><span class="m122-sep"></span>
 <button class="btn primary" data-m122-act="add">${ic('plus')} ${mode==='genealogy'?'Añadir persona':'Añadir personaje'}</button>
 ${p.characters.length?`<label>Desde fichas<select id="m122-character-choice"><option value="">Seleccionar personaje…</option>${p.characters.map(ch=>`<option value="${esc(ch.id)}">${esc(ch.title)}</option>`).join('')}</select></label><button class="btn" data-m122-act="add-existing">Añadir ficha</button>`:''}
 <span class="m122-sep"></span><label>Tipo de vínculo<select id="m122-new-edge-type">${types.map(t=>`<option value="${t.id}" ${t.id===typeSel?'selected':''}>${esc(t.title)}</option>`).join('')}</select></label>
 <button class="btn m1442-connect" data-m122-act="connect">${m122Connecting?'Cancelar':'Vincular dos'}</button>
 <button class="btn ghost" data-m122-act="organize" title="Organizar los nodos automáticamente">${ic('grid')} Organizar</button>
 <div class="m122-diagram-zoom"><button class="iconbtn" data-m122-act="zoom-out" title="Alejar">${ic('zoomout')}</button><span id="m122-zoom-label">100 %</span><button class="iconbtn" data-m122-act="zoom-in" title="Acercar">${ic('zoomin')}</button><button class="iconbtn" data-m122-act="zoom-reset" title="Vista completa">${ic('target')}</button></div></div>
 <div class="m122-diagram-main"><div class="m122-diagram-viewport ${mode}" id="m122-viewport"><div class="m122-diagram-world" id="m122-world"><svg class="m122-edge-layer" id="m122-edges" viewBox="0 0 2600 1900"></svg><div class="m122-diagram-nodes" id="m122-nodes"></div></div><div class="m122-diagram-foot">${mode==='genealogy'?'Familias: progenitor/a → hijo/a, adopción, pareja y hermanos/as.':'Relaciones: amistad, amor, rivalidad, alianza, secretos y mentoría.'} Arrastra las tarjetas para moverlas; los vínculos se mueven con ellas.</div></div><aside class="m122-diagram-aside" id="m122-inspector"></aside></div></div>`;
}
const m122PrevBoardHtml=boardHtml;
boardHtml=function(p){const b=activeBoard();if(b&&b.diagramMode!=='free')return m122DiagramHtml(p,b);return m122PrevBoardHtml(p)};
const m122PrevSetupBoard=setupBoard;
setupBoard=function(){if(activeBoard()?.diagramMode!=='free')return;m122PrevSetupBoard()};
function m122GraphCenter(){const g=m122Graph(),vp=document.getElementById('m122-viewport');if(!g||!vp)return{x:1080,y:820};return{x:Math.min(2370,Math.max(70,(vp.clientWidth/2-g.panX)/g.zoom)),y:Math.min(1760,Math.max(55,(vp.clientHeight/2-g.panY)/g.zoom))}}
function m122Remember(){/* El diagrama se guarda con el libro en IndexedDB y en los JSON de respaldo. */changed();}
function m122NewNode(character=null){const g=m122Graph(),b=activeBoard();if(!g||!b)return;
 const c=m122GraphCenter(),index=g.nodes.length;
 const node={id:uid(),name:character?.title|| (b.diagramMode==='genealogy'?'Nueva persona':'Nuevo personaje'),subtitle:character?.role||'',date:'',detail:'',characterId:character?.id||'',x:Math.round(Math.max(30,c.x-300)+(index%3)*255),y:Math.round(Math.max(30,c.y-80)+Math.floor(index/3)*190)};
 g.nodes.push(node);m122Selection={kind:'node',id:node.id};m122Remember();m122Draw();m122Inspector();}
function m122MakeEdge(from,to){const g=m122Graph(),mode=activeBoard()?.diagramMode;if(!g||!mode||from===to)return;
 const type=document.getElementById('m122-new-edge-type')?.value||m122RelationTypes(mode)[0].id;
 if(g.edges.some(e=>e.from===from&&e.to===to&&e.type===type)){showToast('Ese vínculo ya existe');return;}
 const edge={id:uid(),from,to,type,color:'',label:'',note:'',direction:m122Type(mode,type).arrow?'forward':'both'};
 g.edges.push(edge);m122Selection={kind:'edge',id:edge.id};m122Remember();m122Draw();m122Inspector();showToast('Relación creada: ahora puedes editarla');
}
function m122Draw(){
 const b=activeBoard(),g=m122Graph(),world=document.getElementById('m122-world'),nodes=document.getElementById('m122-nodes'),svg=document.getElementById('m122-edges');if(!g||!world||!nodes||!svg)return;
 const mode=b.diagramMode;world.style.transform=`translate(${g.panX}px,${g.panY}px) scale(${g.zoom})`;
 const zoom=document.getElementById('m122-zoom-label');if(zoom)zoom.textContent=Math.round(g.zoom*100)+' %';
 nodes.innerHTML=g.nodes.map(n=>{
  const title=esc(n.name||'Sin nombre'),initial=esc((n.name||'?').trim().slice(0,1).toUpperCase());
  const active=m122Selection?.kind==='node'&&m122Selection.id===n.id,link=m122ConnectStart===n.id;
  const customBorder=/^#[0-9a-fA-F]{6}$/.test(n.borderColor||'')?`;border-color:${n.borderColor}`:'';
  const style=`left:${Number(n.x)||0}px;top:${Number(n.y)||0}px${customBorder}`;
  return mode==='genealogy'?`<div class="m122-person-node ${active?'selected':''} ${link?'link-first':''}" data-m122-node="${esc(n.id)}" style="${style}"><div class="m122-node-drag" title="Arrastra para colocar la persona">•••</div><div class="m122-avatar">${initial}</div><div class="m122-node-title">${title}</div><div class="m122-node-sub">${esc(n.date||n.subtitle||'Persona del árbol')}</div></div>`:
   `<div class="m122-relation-node ${active?'selected':''} ${link?'link-first':''}" data-m122-node="${esc(n.id)}" style="${style}"><div class="m122-node-drag" title="Arrastra para colocar el personaje">•••</div><div class="m122-node-title">${title}</div><div class="m122-node-sub">${esc(n.subtitle||'Personaje')}</div></div>`;
 }).join('');
 m122DrawEdges();
 nodes.querySelectorAll('[data-m122-node]').forEach(n=>{
  n.onclick=e=>{if(e.target.closest('input,textarea,select,button'))return;
   const id=n.dataset.m122Node;if(m122Connecting){if(m122ConnectStart){const origin=m122ConnectStart;m122ConnectStart=null;m122Connecting=false;m122MakeEdge(origin,id)}else{m122ConnectStart=id;showToast('Elige la segunda persona');m122Draw()}return;}
   m122Selection={kind:'node',id};m122Draw();m122Inspector();
  };
  n.querySelector('.m122-node-drag').onpointerdown=e=>{
   if(e.button!==0||m122Connecting)return;e.preventDefault();e.stopPropagation();
   const node=g.nodes.find(x=>x.id===n.dataset.m122Node);if(!node)return;
   m122Selection={kind:'node',id:node.id};m122Inspector();
   const x=e.clientX,y=e.clientY,fromX=node.x,fromY=node.y;let moved=false;
   const move=ev=>{const dx=(ev.clientX-x)/g.zoom,dy=(ev.clientY-y)/g.zoom;node.x=Math.max(0,Math.min(2400,fromX+dx));node.y=Math.max(0,Math.min(1750,fromY+dy));n.style.left=node.x+'px';n.style.top=node.y+'px';moved=true;m122DrawEdges()};
   const done=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);window.removeEventListener('pointercancel',done);if(moved)m122Remember()};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',done,{once:true});window.addEventListener('pointercancel',done,{once:true});
  };
 });
}
function m122DrawEdges(){const b=activeBoard(),g=m122Graph(),svg=document.getElementById('m122-edges');if(!g||!svg)return;
 const mode=b.diagramMode;let markup='';
 for(const e of g.edges){const a=g.nodes.find(n=>n.id===e.from),c=g.nodes.find(n=>n.id===e.to);if(!a||!c)continue;
  const t=m122Type(mode,e.type),color=/^#[0-9a-fA-F]{6}$/.test(e.color||'')?e.color:t.color;
  const aw=mode==='genealogy'?200:204,ah=mode==='genealogy'?110:86;
  const ax=(+a.x||0)+aw/2,ay=(+a.y||0)+ah/2,bx=(+c.x||0)+aw/2,by=(+c.y||0)+ah/2;
  const dx=bx-ax,dy=by-ay,dist=Math.hypot(dx,dy)||1;
  const sx=ax+(dx/dist)*Math.min(aw/2-12,Math.abs(dx)*.3),sy=ay+(dy/dist)*Math.min(ah/2-9,Math.abs(dy)*.3);
  const ex=bx-(dx/dist)*Math.min(aw/2-12,Math.abs(dx)*.3),ey=by-(dy/dist)*Math.min(ah/2-9,Math.abs(dy)*.3);
  const line=mode==='genealogy'&&t.arrow?`M ${sx} ${sy} L ${sx} ${(sy+ey)/2} L ${ex} ${(sy+ey)/2} L ${ex} ${ey}`:`M ${sx} ${sy} L ${ex} ${ey}`;
  const mx=(sx+ex)/2,my=(sy+ey)/2;
  const arrow=(e.direction==='forward'||(e.direction!=='backward'&&t.arrow))?'forward':e.direction==='backward'?'backward':'none';
  const markerId='m122-arrow-'+e.id.replace(/[^a-zA-Z0-9_-]/g,'');
  const selected=m122Selection?.kind==='edge'&&m122Selection.id===e.id;
  markup+=`<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 6 3 L 0 6 Z" fill="${color}"/></marker></defs><path class="m122-edge-path" d="${line}" stroke="${color}" ${t.dash?`stroke-dasharray="${t.dash}"`:''} ${arrow==='forward'?`marker-end="url(#${markerId})"`:arrow==='backward'?`marker-start="url(#${markerId})"`:''}/><path class="m122-edge-hit ${selected?'selected':''}" d="${line}" data-m122-edge="${esc(e.id)}"/><text class="m122-edge-tag" x="${mx}" y="${my-13}" text-anchor="middle" fill="${color}">${esc(t.symbol+' '+(e.label||t.title))}</text>`;
 }
 svg.innerHTML=markup;
 svg.querySelectorAll('[data-m122-edge]').forEach(path=>path.onclick=evt=>{evt.stopPropagation();m122Selection={kind:'edge',id:path.dataset.m122Edge};m122Draw();m122Inspector();});
}
function m122Inspector(){const root=document.getElementById('m122-inspector'),g=m122Graph(),b=activeBoard(),p=activeProject();if(!root||!g||!b)return;
 const n=m122Selection?.kind==='node'?g.nodes.find(x=>x.id===m122Selection.id):null;
 const e=m122Selection?.kind==='edge'?g.edges.find(x=>x.id===m122Selection.id):null;
 let html='';
 if(n){html=`<h3>${b.diagramMode==='genealogy'?'Persona del árbol':'Personaje'}</h3><p class="m122-help">Esta tarjeta es independiente de las notas. Puedes editarla y relacionarla con otras.</p><label>Nombre<input data-m122-field="name" maxlength="120" value="${esc(n.name)}"></label><label>${b.diagramMode==='genealogy'?'Parentesco / rol':'Rol en la historia'}<input data-m122-field="subtitle" maxlength="140" value="${esc(n.subtitle||'')}"></label>${b.diagramMode==='genealogy'?`<label>Fechas (nacimiento, fallecimiento…)<input data-m122-field="date" maxlength="140" value="${esc(n.date||'')}"></label>`:''}<label class="m1442-color-control">Color del borde<div class="m1442-color-row"><input type="color" data-m122-field="borderColor" aria-label="Color del borde de la persona" value="${esc(/^#[0-9a-fA-F]{6}$/.test(n.borderColor||'')?n.borderColor:'#6c876f')}"><button type="button" class="btn ghost m1442-reset-color" data-m1442-reset-color title="Volver al color original">Restablecer</button></div></label><label>Notas<textarea data-m122-field="detail" placeholder="Datos o evolución…">${esc(n.detail||'')}</textarea></label>${n.characterId?`<button class="btn" data-m122-act="open-character">${ic('users')} Abrir ficha de personaje</button>`:''}<hr><button class="btn danger" data-m122-act="remove-node">${ic('trash')} Eliminar persona y sus vínculos</button>`;}
 else if(e){const type=m122Type(b.diagramMode,e.type);const from=g.nodes.find(n=>n.id===e.from),to=g.nodes.find(n=>n.id===e.to);
 html=`<h3>Vínculo</h3><p class="m122-help"><strong>${esc(from?.name||'Origen')}</strong> — <strong>${esc(to?.name||'Destino')}</strong></p><label>Tipo de relación<select data-m122-edge-field="type">${m122RelationTypes(b.diagramMode).map(t=>`<option value="${t.id}" ${e.type===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></label><label>Etiqueta personalizada<input data-m122-edge-field="label" maxlength="90" placeholder="Opcional" value="${esc(e.label||'')}"></label><label>Color de la línea<input type="color" data-m122-edge-field="color" value="${esc(/^#[a-fA-F0-9]{6}$/.test(e.color||'')?e.color:type.color)}"></label><label>Sentido<select data-m122-edge-field="direction"><option value="both" ${e.direction==='both'?'selected':''}>Sin flechas (mutuo)</option><option value="forward" ${e.direction==='forward'?'selected':''}>Origen → Destino</option><option value="backward" ${e.direction==='backward'?'selected':''}>Destino → Origen</option></select></label><label>Descripción del vínculo<textarea data-m122-edge-field="note" placeholder="¿Cómo se conocen? ¿Qué los une?">${esc(e.note||'')}</textarea></label><hr><button class="btn danger" data-m122-act="remove-edge">${ic('trash')} Eliminar vínculo</button>`;}
 else{html=`<h3>${b.diagramMode==='genealogy'?'Árbol genealógico':'Mapa de relaciones'}</h3><p class="m122-help">${b.diagramMode==='genealogy'?'Crea personas y establece parentescos: progenitores, hijos, parejas y hermanos.':'Crea personajes y define sus relaciones: amistad, amor, rivalidad, alianza…'} Los enlaces quedan guardados y se mueven junto a las tarjetas.</p><div class="m122-selection-hint"><strong>${g.nodes.length} personas/nodos · ${g.edges.length} vínculos</strong><p style="margin:8px 0 0">1. Añade dos personas.<br>2. Elige el tipo de vínculo.<br>3. Pulsa «Vincular dos» y elige ambas tarjetas.<br>4. Haz clic en la línea para editarla.</p></div>`;}
 if(!e&&g.edges.length){
   const related=n?g.edges.filter(link=>link.from===n.id||link.to===n.id):g.edges;
   if(related.length)html+=`<hr><h3 style="font-size:17px">${n?'Sus vínculos':'Vínculos del diagrama'}</h3>${related.map(edge=>{const a=g.nodes.find(x=>x.id===edge.from),c=g.nodes.find(x=>x.id===edge.to),t=m122Type(b.diagramMode,edge.type);return `<button class="btn" type="button" data-m122-choose-edge="${esc(edge.id)}" style="text-align:left;justify-content:flex-start">${esc(t.symbol)} ${esc(a?.name||'?')} — ${esc(c?.name||'?')}</button>`}).join('')}`;
 }
 if(e)html+=`<button class="btn ghost" type="button" data-m122-show-links="true">Ver todos los vínculos</button>`;
 root.innerHTML=html;
 root.querySelectorAll('[data-m122-choose-edge]').forEach(btn=>btn.onclick=()=>{m122Selection={kind:'edge',id:btn.dataset.m122ChooseEdge};m122DrawEdges();m122Inspector()});
 root.querySelectorAll('[data-m122-show-links]').forEach(btn=>btn.onclick=()=>{m122Selection=null;m122DrawEdges();m122Inspector()});
 root.querySelectorAll('[data-m122-field]').forEach(input=>input.addEventListener(input.type==='color'?'change':'input',()=>{if(!n)return;n[input.dataset.m122Field]=input.value;m122Remember();m122Draw()}));
 root.querySelector('[data-m1442-reset-color]')?.addEventListener('click',()=>{if(!n)return;delete n.borderColor;m122Remember();m122Draw();m122Inspector();});
 root.querySelectorAll('[data-m122-edge-field]').forEach(input=>{const event=input.tagName==='SELECT'||input.type==='color'?'change':'input';input.addEventListener(event,()=>{if(!e)return;e[input.dataset.m122EdgeField]=input.value;if(input.dataset.m122EdgeField==='type'){const t=m122Type(b.diagramMode,e.type);e.direction=t.arrow?'forward':'both';e.color='';m122Inspector()}m122Remember();m122DrawEdges()})});
 root.querySelectorAll('[data-m122-act]').forEach(button=>button.onclick=()=>m122GraphAction(button.dataset.m122Act));
}
function m122Organize(){const g=m122Graph(),b=activeBoard();if(!g||!g.nodes.length)return;
 if(b.diagramMode==='genealogy'){
  const depth=new Map(g.nodes.map(x=>[x.id,0]));
  const parentEdges=g.edges.filter(e=>e.type==='parent'||e.type==='adoptive');
  for(let i=0;i<g.nodes.length;i++){let updated=false;for(const e of parentEdges){const d=(depth.get(e.from)||0)+1;if(d>(depth.get(e.to)||0)&&d<g.nodes.length){depth.set(e.to,d);updated=true;}}if(!updated)break;}
  const levels=new Map();for(const n of g.nodes){const lv=depth.get(n.id)||0;if(!levels.has(lv))levels.set(lv,[]);levels.get(lv).push(n)}
  for(const [lv,items] of [...levels].sort((a,b)=>a[0]-b[0]))items.forEach((n,i)=>{n.x=870+i*260;n.y=500+lv*230});
 }else{const n=g.nodes.length;g.nodes.forEach((x,i)=>{const angle=(i/n)*2*Math.PI-Math.PI/2;x.x=1130+Math.cos(angle)*Math.max(120,n*35)-100;x.y=820+Math.sin(angle)*Math.max(100,n*25)-50})}
 m122Remember();m122Draw();showToast('Diagrama organizado');
}
async function m122GraphAction(act){const g=m122Graph(),b=activeBoard();if(!g||!b)return;
 if(act==='add'){m122NewNode();return}
 if(act==='add-existing'){const id=document.getElementById('m122-character-choice')?.value,person=activeProject()?.characters.find(c=>c.id===id);if(!person){showToast('Selecciona una ficha de personaje');return;}m122NewNode(person);return}
 if(act==='connect'){m122Connecting=!m122Connecting;m122ConnectStart=null;document.querySelector('[data-m122-act="connect"]')?.classList.toggle('m122-is-active',m122Connecting);showToast(m122Connecting?'Haz clic en dos tarjetas':'Vínculo cancelado');return}
 if(act==='organize'){m122Organize();return}
 if(act==='zoom-in'||act==='zoom-out'||act==='zoom-reset'){const vp=document.getElementById('m122-viewport');if(!vp)return;
  const z=act==='zoom-reset'?1:Math.max(.4,Math.min(2,Math.round((g.zoom+(act==='zoom-in'?.15:-.15))*100)/100));const cx=vp.clientWidth/2,cy=vp.clientHeight/2;
  const centerX=(cx-g.panX)/g.zoom,centerY=(cy-g.panY)/g.zoom;g.zoom=z;
  g.panX=act==='zoom-reset'?-550:cx-centerX*z;g.panY=act==='zoom-reset'?-450:cy-centerY*z;m122Remember();m122Draw();return;
 }
 if(act==='remove-node'&&m122Selection?.kind==='node'){if(!await m172Confirm('¿Eliminar esta persona y todos sus vínculos del diagrama?'))return;
  const id=m122Selection.id;g.nodes=g.nodes.filter(n=>n.id!==id);g.edges=g.edges.filter(e=>e.from!==id&&e.to!==id);m122Selection=null;m122Remember();m122Draw();m122Inspector();return;
 }
 if(act==='remove-edge'&&m122Selection?.kind==='edge'){if(!await m172Confirm('¿Eliminar este vínculo?'))return;
  g.edges=g.edges.filter(e=>e.id!==m122Selection.id);m122Selection=null;m122Remember();m122Draw();m122Inspector();return;
 }
 if(act==='open-character'&&m122Selection?.kind==='node'){const node=g.nodes.find(n=>n.id===m122Selection.id);if(node?.characterId){state.activeCharacterId=node.characterId;state.view='characters';changed();render();}return;}
}
function m122BindGraph(){const b=activeBoard(),g=m122Graph(),vp=document.getElementById('m122-viewport');if(!g||!vp)return;
 m122Selection=null;m122Connecting=false;m122ConnectStart=null;
 m122Draw();m122Inspector();
 document.querySelectorAll('[data-m122-act]').forEach(button=>button.onclick=()=>m122GraphAction(button.dataset.m122Act));
 let pan=null;vp.onpointerdown=e=>{if(e.button!==0||e.target.closest('[data-m122-node],[data-m122-edge]'))return;pan={x:e.clientX,y:e.clientY,panX:g.panX,panY:g.panY};m122Selection=null;m122Inspector();vp.setPointerCapture(e.pointerId)};
 vp.onpointermove=e=>{if(!pan)return;g.panX=pan.panX+e.clientX-pan.x;g.panY=pan.panY+e.clientY-pan.y;m122Draw()};
 vp.onpointerup=e=>{if(pan){pan=null;m122Remember()}if(vp.hasPointerCapture(e.pointerId))vp.releasePointerCapture(e.pointerId)};
 vp.onpointercancel=vp.onpointerup;
 vp.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();g.zoom=Math.min(2,Math.max(.4,g.zoom+(e.deltaY<0?.08:-.08)));m122Remember();m122Draw()},{passive:false});
}
const m122PrevWire=wire;
wire=function(){m122PrevWire();document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.2.2'));
 m122BindLinkedPanels(); if(state.view==='boards')m122BindGraph();
};


/* MARGEN 1.2.3 — etapas plegables independientes y con estado guardado. */
arcHtml=function(p,person){
  const cards=(person.arc||[]).map((a,i)=>{
    const chapter=p.chapters.find(c=>c.id===a.chapterId);
    const chapterName=chapter?.title||'Sin capítulo asociado';
    const summary=a.change?.trim()?a.change.trim().replace(/\s+/g,' ').slice(0,96):'Sin descripción todavía';
    const opened=a.expanded===true;
    return `<details class="arc-event m123-arc-card" data-arc-id="${esc(a.id)}" ${opened?'open':''}>
      <summary title="${opened?'Plegar etapa':'Desplegar etapa'}"><span class="m123-arc-chevron">${ic('chevron')}</span><span class="m123-arc-index">${String(i+1).padStart(2,'0')}</span><span class="m123-arc-summary"><strong data-m123-arc-title>${esc(a.stage||'Nueva etapa de evolución')}</strong><small data-m123-arc-excerpt>${esc(summary)}</small></span><span class="m123-arc-meta" data-m123-arc-chapter>${esc(chapterName)}</span></summary>
      <div class="m123-arc-content"><div class="arc-event-top"><label>Momento de evolución<input data-arc-field="stage" data-arc-id="${esc(a.id)}" value="${esc(a.stage||'')}" placeholder="Después de la traición..."></label>
       <label>Capítulo<select data-arc-field="chapterId" data-arc-id="${esc(a.id)}"><option value="">Sin vincular</option>${p.chapters.map(c=>`<option value="${esc(c.id)}" ${c.id===a.chapterId?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>
       <button class="iconbtn" type="button" title="Eliminar etapa" data-action="arc-delete" data-id="${esc(a.id)}">${ic('trash')}</button></div>
       <label>¿Cómo cambia su personalidad, su objetivo o sus relaciones?<textarea rows="3" data-arc-field="change" data-arc-id="${esc(a.id)}" placeholder="Antes confiaba en todos; ahora...">${esc(a.change||'')}</textarea></label></div>
    </details>`;
  }).join('')||'<p class="char-helper">Todavía no has añadido ninguna etapa de su evolución.</p>';
  return `<div class="m123-arc-tools"><button type="button" class="btn ghost" data-m123-arc="expand">Desplegar todas</button><button type="button" class="btn ghost" data-m123-arc="collapse">Plegar todas</button><span class="subtle">${person.arc?.length||0} etapas</span></div><div class="arc-list">${cards}</div><button class="btn arc-add" data-action="arc-add">${ic('plus')} Añadir etapa</button>`;
};
const m123PreviousOnAction=onAction;
onAction=function(e){
  const action=e.currentTarget?.dataset?.action;
  if(action==='arc-add'){
    const person=activeCharacter();if(!person)return;
    const id=uid();
    person.arc.push({id,stage:'',chapterId:'',change:'',expanded:true});
    changed();render();
    requestAnimationFrame(()=>{
      const card=document.querySelector(`.m123-arc-card[data-arc-id="${CSS.escape(id)}"]`);
      if(!card)return;
      card.scrollIntoView({block:'nearest',behavior:'instant'});
      card.querySelector('[data-arc-field="stage"]')?.focus({preventScroll:true});
    });
    return;
  }
  return m123PreviousOnAction(e);
};
function m123BindArcCards(){
  if(state.view!=='characters')return;
  const person=activeCharacter(),p=activeProject();if(!person||!p)return;
  const cards=[...document.querySelectorAll('.m123-arc-card[data-arc-id]')];
  const updateSummary=(card,ev)=>{
    if(!card||!ev)return;
    const title=card.querySelector('[data-m123-arc-title]');
    const excerpt=card.querySelector('[data-m123-arc-excerpt]');
    const chapter=card.querySelector('[data-m123-arc-chapter]');
    if(title)title.textContent=ev.stage?.trim()||'Nueva etapa de evolución';
    if(excerpt)excerpt.textContent=ev.change?.trim().replace(/\s+/g,' ').slice(0,96)||'Sin descripción todavía';
    if(chapter)chapter.textContent=p.chapters.find(c=>c.id===ev.chapterId)?.title||'Sin capítulo asociado';
  };
  cards.forEach(card=>{
    const getEntry=()=>person.arc.find(a=>a.id===card.dataset.arcId);
    card.addEventListener('toggle',()=>{const entry=getEntry();if(entry&&entry.expanded!==card.open){entry.expanded=card.open;changed();} });
    card.querySelectorAll('[data-arc-field]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{updateSummary(card,getEntry());}));
    // El botón «Abrir capítulo» de la versión anterior se coloca dentro de la etapa abierta.
    for(const button of [...card.children].filter(x=>x.matches?.('button.btn'))){card.querySelector('.m123-arc-content')?.append(button);}
  });
  document.querySelectorAll('[data-m123-arc]').forEach(btn=>btn.addEventListener('click',()=>{
    const expand=btn.dataset.m123Arc==='expand';
    cards.forEach(card=>{const entry=person.arc.find(a=>a.id===card.dataset.arcId);if(entry)entry.expanded=expand;card.open=expand;});
    changed();
  }));
}
const m123PreviousWire=wire;
wire=function(){m123PreviousWire();document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.2.3'));m123BindArcCards();};


/* ================= MARGEN 1.2.4 =================
   Corrige la escaleta, vincula POV a personajes, personaliza los
   módulos visibles y permite zoom por rueda en las tres pizarras.
   No se eliminan datos ni cambia el JSON version:1.
*/
const m124Views=[
  ['manuscript','Capítulos','Manuscrito y escenas escritas'],
  ['boards','Pizarras','Notas visuales, diagramas y sellos'],
  ['characters','Personajes','Fichas y evolución'],
  ['settings','Escenarios','Lugares y referencias'],
  ['outlines','Escaletas','Planificación de escenas'],
  ['chronologies','Cronologías','Acontecimientos y tiempo narrativo']
];
const m124OldEnsure=ensureSelections;
ensureSelections=function(){
  m124OldEnsure();
  for(const project of state?.projects||[]){
    if(!project.hiddenSections||typeof project.hiddenSections!=='object'||Array.isArray(project.hiddenSections))project.hiddenSections={};
    for(const outline of project.outlines||[])for(const scene of outline.scenes||[]){
      if(!scene.povCharacterId&&scene.pov){
        const match=(project.characters||[]).find(ch=>ch.title.trim().toLocaleLowerCase('es')===String(scene.pov).trim().toLocaleLowerCase('es'));
        if(match)scene.povCharacterId=match.id;
      }
    }
  }
};
function m124PovOptions(project,scene){
  const chars=project.characters||[];
  const current=chars.find(ch=>ch.id===scene.povCharacterId)||chars.find(ch=>ch.title.trim().toLocaleLowerCase('es')===String(scene.pov||'').trim().toLocaleLowerCase('es'));
  const selected=current?.id||'';
  const legacy=scene.pov&&!current?`<option value="__legacy__" selected>Texto anterior: ${esc(scene.pov)}</option>`:'';
  return `<option value="" ${!selected&&!legacy?'selected':''}>Sin personaje asignado</option>${legacy}${chars.map(ch=>`<option value="${esc(ch.id)}" ${selected===ch.id?'selected':''}>${esc(ch.title)}</option>`).join('')}`;
}
/* Mantener el resto de la escaleta original, pero sustituir el campo antiguo
   por un selector basado en ID: no se rompe si dos personajes tienen nombres similares. */
const m124OldOutlinesHtml=outlinesHtml;
outlinesHtml=function(project){
  const html=m124OldOutlinesHtml(project);
  return html.replace(/<label>Punto de vista<input data-scene-field="pov" data-scene-id="([^"]+)" value="[^"]*" placeholder="Personaje\.\.\."><\/label>/g,(all,id)=>{
    const o=activeOutline(),scene=o?.scenes.find(s=>s.id===id);if(!scene)return all;
    const hasChosen=project.characters.some(ch=>ch.id===scene.povCharacterId);
    return `<label>Punto de vista <span class="m124-pov-row"><select aria-label="Punto de vista de la escena" data-scene-field="povCharacterId" data-scene-id="${esc(id)}">${m124PovOptions(project,scene)}</select><button class="btn" type="button" data-m124-open-pov="${esc(id)}" title="Abrir ficha del personaje" ${hasChosen?'':'disabled'}>${ic('users')} Ficha</button></span><span class="m124-pov-help">Selecciona una ficha existente y pulsa «Ficha» para abrirla.</span></label>`;
  });
};
function m124OpenSectionDialog(){
  const project=activeProject();if(!project||['desk','library','dictionary'].includes(state.view))return;
  document.querySelector('.m124-settings-overlay')?.remove();
  const overlay=document.createElement('div');overlay.className='modal-backdrop m124-settings-overlay';
  overlay.innerHTML=`<form class="modal m124-config-modal"><h2>Secciones del libro</h2><p>Elige las herramientas que quieres ver en «${esc(project.name)}». Ocultarlas no borra ningún contenido; puedes recuperarlas cuando quieras.</p>
    <div class="m124-section-list">${m124Views.map(([key,label,desc])=>`<label class="m124-section-option"><input type="checkbox" data-m124-section="${key}" ${!project.hiddenSections?.[key]?'checked':''}><span>${label}<small>${desc}</small></span></label>`).join('')}</div>
    <p class="subtle">Archivo y papelera se mantienen visibles para que nunca pierdas el acceso a lo archivado.</p>
    <div class="modal-actions"><button class="btn" type="button" data-m124-cancel>Cancelar</button><button class="btn primary" type="submit">Guardar secciones</button></div></form>`;
  document.body.append(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('[data-m124-cancel]').onclick=close;
  overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close()});
  overlay.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const hid={}; overlay.querySelectorAll('[data-m124-section]').forEach(input=>{if(!input.checked)hid[input.dataset.m124Section]=true;});
    project.hiddenSections=hid;
    if(hid[state.view])state.view='book';
    changed();close();render();showToast('Secciones del libro actualizadas');
  };
}
function m124ApplySectionLayout(){
  const project=activeProject();if(!project||['desk','library','dictionary'].includes(state.view))return;
  const side=document.querySelector('.sidebar');if(!side)return;
  for(const [view] of m124Views){
    const hidden=!!project.hiddenSections?.[view];
    side.querySelectorAll(`.tree-section[data-section="${view}"]`).forEach(node=>node.hidden=hidden);
    document.querySelectorAll(`.book-module [data-view="${view}"]`).forEach(button=>{const module=button.closest('.book-module');if(module)module.hidden=hidden});
  }
  // Se puede abrir incluso desde una sección que actualmente esté oculta.
  const footer=side.querySelector('.sidebar-bottom');
  if(footer&&!footer.querySelector('.m124-settings-btn')){
    const btn=document.createElement('button');btn.className='btn ghost m124-settings-btn';btn.type='button';btn.innerHTML=ic('grid')+' Configurar secciones';
    btn.title='Mostrar u ocultar capítulos, pizarras, fichas, escaletas y cronologías de este libro';
    btn.addEventListener('click',m124OpenSectionDialog);footer.prepend(btn);
  }
}
/* Rueda para zoom sin Ctrl y centrado bajo el cursor. */
function m124WheelZoom(viewport,model,min,max,draw,commit){
  if(!viewport||!model)return;
  viewport.addEventListener('wheel',e=>{
    if(e.target.closest('textarea,input,select,[contenteditable],.item-body'))return;
    if(!Number.isFinite(e.deltaY)||e.deltaY===0)return;
    e.preventDefault();e.stopImmediatePropagation();
    const box=viewport.getBoundingClientRect();
    const px=e.clientX-box.left,py=e.clientY-box.top;
    const old=Math.max(.01,Number(model.zoom)||1);
    const next=Math.min(max,Math.max(min,Math.round((old+(e.deltaY<0?.1:-.1))*100)/100));
    if(next===old)return;
    const wx=(px-(Number(model.panX)||0))/old,wy=(py-(Number(model.panY)||0))/old;
    model.zoom=next;model.panX=px-wx*next;model.panY=py-wy*next;
    draw();commit();
  },{capture:true,passive:false});
}
const m124OldSetupBoard=setupBoard;
setupBoard=function(){
  m124OldSetupBoard();
  const board=activeBoard();
  if(board?.diagramMode==='free')m124WheelZoom(el('board-viewport'),board,.35,2.5,applyTransform,changed);
};
const m124OldWire=wire;
wire=function(){
  m124OldWire();
  document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.2.4'));
  m124ApplySectionLayout();
  if(state.view==='boards'&&activeBoard()?.diagramMode!=='free'){
    const model=m122Graph();
    if(model)m124WheelZoom(el('m122-viewport'),model,.4,2,m122Draw,changed);
  }
  if(state.view==='outlines'){
    document.querySelectorAll('[data-scene-field="povCharacterId"]').forEach(select=>{
      const scene=activeOutline()?.scenes.find(s=>s.id===select.dataset.sceneId),project=activeProject();
      if(!scene||!project)return;
      select.addEventListener('change',()=>{
        const ch=project.characters.find(c=>c.id===select.value);
        scene.povCharacterId=ch?.id||'';
        scene.pov=ch?.title|| (select.value==='__legacy__'?scene.pov:'');
        const detail=select.closest('.outline-scene');
        const open=detail?.querySelector('[data-m124-open-pov]');if(open)open.disabled=!ch;
        const summary=detail?.querySelector('[data-outline-summary-sub]');
        if(summary)summary.textContent=({idea:'Idea',planned:'Planificada',writing:'En escritura',done:'Terminada'})[scene.status||'idea']+(ch?' · POV '+ch.title:scene.pov?' · POV '+scene.pov:'')+(scene.description?' · '+scene.description.slice(0,85):'');
        changed();
      });
    });
    document.querySelectorAll('[data-m124-open-pov]').forEach(button=>button.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();const scene=activeOutline()?.scenes.find(s=>s.id===button.dataset.m124OpenPov);
      if(!scene)return;
      const person=activeProject()?.characters.find(c=>c.id===scene.povCharacterId);
      if(!person){showToast('Selecciona primero un personaje');return;}
      state.activeCharacterId=person.id;state.view='characters';changed();render();
    }));
  }
};
const m124OldRenderSidebarOnly=renderSidebarOnly;
renderSidebarOnly=function(){m124OldRenderSidebarOnly();m124ApplySectionLayout()};

/* MARGEN 1.3 - Prototipo C: escaletas por actos, tabla y tarjetas */
const m13PreviousEnsure=ensureSelections;
ensureSelections=function(){
  m13PreviousEnsure();
  for(const p of state?.projects||[])for(const o of p.outlines||[]){
    if(!Array.isArray(o.blocks))o.blocks=[];
    if(!['list','cards'].includes(o.presentation))o.presentation='list';
    for(const s of o.scenes||[]){
      if(typeof s.blockId!=='string')s.blockId='';
      if(typeof s.chapterId!=='string')s.chapterId='';
      if(!Array.isArray(s.characterIds))s.characterIds=[];
      if(!Array.isArray(s.settingIds))s.settingIds=[];
      for(const f of ['goal','conflict','consequence'])if(typeof s[f]!=='string')s[f]='';
    }
  }
};
const m13OldOutline=outlinesHtml;
function m13Status(k){return ({idea:'Idea',planned:'Planificada',writing:'En escritura',done:'Terminada'})[k]||'Idea';}
function m13Name(items,id){return items.find(x=>x.id===id)?.title||'';}
function m13SceneSubtitle(project,scene){
  const pv=m13Name(project.characters,scene.povCharacterId)||scene.pov||'';
  return [m13Status(scene.status),pv?'POV '+pv:'',m13Name(project.chapters,scene.chapterId),scene.description?scene.description.slice(0,90):''].filter(Boolean).join(' · ');
}
function m13StageOptions(status){return [['idea','Idea'],['planned','Planificada'],['writing','En escritura'],['done','Terminada']].map(([k,n])=>`<option value="${k}" ${status===k?'selected':''}>${n}</option>`).join('');}
function m13Select(items,selected,placeholder){return `<option value="">${esc(placeholder)}</option>${items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.title)}</option>`).join('')}`;}
function m13Multi(project,scene,key,type){const items=type==='character'?project.characters:project.settings,selected=scene[key]||[];
  return `<div class="m13-chip-list">${items.length?items.map(x=>`<label><input type="checkbox" data-m13-multi="${key}" data-m13-scene="${esc(scene.id)}" value="${esc(x.id)}" ${selected.includes(x.id)?'checked':''}>${esc(x.title)}</label>`).join(''):'<span class="m13-chip-empty">Crea primero una ficha en el libro para vincularla.</span>'}</div>`;
}
function m13InlineLinks(p,s){
  const links=[];
  if(s.chapterId&&m13Name(p.chapters,s.chapterId))links.push(['chapter',s.chapterId,'Abrir capítulo']);
  if(s.povCharacterId&&m13Name(p.characters,s.povCharacterId))links.push(['character',s.povCharacterId,'Ficha del POV']);
  for(const id of (s.characterIds||[]))if(id!==s.povCharacterId&&m13Name(p.characters,id))links.push(['character',id,m13Name(p.characters,id)]);
  for(const id of (s.settingIds||[]))if(m13Name(p.settings,id))links.push(['setting',id,m13Name(p.settings,id)]);
  return links.length?`<div class="m13-quick-links">${links.map(([type,id,label])=>`<button type="button" data-m13-open="${type}" data-id="${esc(id)}">${esc(label)}</button>`).join('')}</div>`:'';
}
function m13Fields(p,o,s){
  const legacy=s.pov&&!p.characters.some(x=>x.id===s.povCharacterId)?`<option value="__legacy__" selected>Texto anterior: ${esc(s.pov)}</option>`:'';
  const groupOptions=`<option value="">Sin bloque</option>${o.blocks.map(b=>`<option value="${esc(b.id)}" ${s.blockId===b.id?'selected':''}>${esc(b.title)}</option>`).join('')}`;
  return `<label class="m13-field">Título de la escena<input data-m13-field="title" data-m13-scene="${esc(s.id)}" value="${esc(s.title||'')}" placeholder="Título de la escena"></label>
  <label class="m13-field m13-field--description">¿Qué sucede?<textarea data-m13-field="description" data-m13-scene="${esc(s.id)}" placeholder="Describe los hechos esenciales de la escena...">${esc(s.description||'')}</textarea></label>
  <div class="m13-fieldgrid"><label class="m13-field">Estado<select data-m13-field="status" data-m13-scene="${esc(s.id)}">${m13StageOptions(s.status)}</select></label>
  <label class="m13-field">Bloque narrativo<select data-m13-field="blockId" data-m13-scene="${esc(s.id)}">${groupOptions}</select></label></div>
  <div class="m13-fieldgrid"><label class="m13-field">Capítulo del manuscrito<div class="m13-select-row"><select data-m13-field="chapterId" data-m13-scene="${esc(s.id)}">${m13Select(p.chapters,s.chapterId,'Sin vincular')}</select><button type="button" class="btn" data-m13-open="chapter" data-from-scene="${esc(s.id)}" ${s.chapterId?'':'disabled'}>Abrir</button></div></label>
  <label class="m13-field">Punto de vista<div class="m13-select-row"><select data-m13-field="povCharacterId" data-m13-scene="${esc(s.id)}">${m13Select(p.characters,s.povCharacterId,'Sin personaje')}${legacy}</select><button type="button" class="btn" data-m13-open="character" data-from-scene="${esc(s.id)}" ${s.povCharacterId?'':'disabled'}>Ficha</button></div></label></div>
  <div class="m13-fieldgrid"><div class="m13-field">Personajes que intervienen${m13Multi(p,s,'characterIds','character')}</div><div class="m13-field">Escenarios${m13Multi(p,s,'settingIds','setting')}</div></div>
  <label class="m13-field">Objetivo de la escena<textarea data-m13-field="goal" data-m13-scene="${esc(s.id)}" placeholder="¿Qué intenta conseguir el personaje?">${esc(s.goal||'')}</textarea></label>
  <label class="m13-field">Conflicto o dificultad<textarea data-m13-field="conflict" data-m13-scene="${esc(s.id)}" placeholder="¿Qué se interpone en su camino?">${esc(s.conflict||'')}</textarea></label>
  <label class="m13-field">Consecuencia / cambio<textarea data-m13-field="consequence" data-m13-scene="${esc(s.id)}" placeholder="¿Qué ha cambiado al terminar la escena?">${esc(s.consequence||'')}</textarea></label>
  ${m13InlineLinks(p,s)}`;
}
function m13SceneList(p,o,s,i){const total=o.scenes.length;
 return `<details class="m13-scene" data-m13-scene-card="${esc(s.id)}" ${s.expanded?'open':''}>
 <summary><span class="m13-caret">${ic('chevron')}</span><span class="m13-grip" title="Arrastra para reordenar" draggable="true" data-m13-drag="${esc(s.id)}" aria-label="Arrastrar escena">⠿</span>
 <span class="m13-scene-title"><strong data-m13-summary-title="${esc(s.id)}">${esc(s.title||'Escena sin título')}</strong><small data-m13-summary-sub="${esc(s.id)}">${esc(m13SceneSubtitle(p,s))}</small></span>
 <span class="m13-stage ${esc(s.status||'idea')}" data-m13-stage="${esc(s.id)}">${m13Status(s.status)}</span>
 <span class="m13-scene-actions"><button class="iconbtn" data-m13-action="up" data-id="${esc(s.id)}" title="Subir escena">${ic('up')}</button><button class="iconbtn" data-m13-action="down" data-id="${esc(s.id)}" title="Bajar escena">${ic('down')}</button><button class="iconbtn" data-m13-action="delete" data-id="${esc(s.id)}" title="Eliminar escena">${ic('trash')}</button></span></summary>
 <div class="m13-detail">${m13Fields(p,o,s)}</div></details>`;
}
function m13SceneCard(p,s){return `<article class="m13-scene" draggable="true" data-m13-drag="${esc(s.id)}" data-m13-scene-card="${esc(s.id)}">
 <div class="m13-card-meta"><span class="m13-stage ${esc(s.status||'idea')}">${m13Status(s.status)}</span>${s.povCharacterId?`<span>POV: ${esc(m13Name(p.characters,s.povCharacterId))}</span>`:s.pov?`<span>POV: ${esc(s.pov)}</span>`:''}</div>
 <div class="m13-card-name">${esc(s.title||'Escena sin título')}</div>
 <p class="m13-card-text">${esc(s.description||'Añade una descripción para esta escena...')}</p>
 ${s.chapterId?`<div class="m13-card-meta">${ic('book')} ${esc(m13Name(p.chapters,s.chapterId))}</div>`:''}
 <div class="m13-card-actions"><button class="btn" data-m13-action="edit" data-id="${esc(s.id)}">${ic('edit')} Editar</button><button class="btn ghost" data-m13-action="delete" data-id="${esc(s.id)}" title="Eliminar">${ic('trash')}</button></div></article>`;}
function m13Block(p,o,b){const scenes=o.scenes.filter(s=>String(s.blockId||'')===(b?.id||''));const board=o.presentation==='cards',blockId=b?.id||'';
 return `<section class="m13-block" data-m13-block="${esc(blockId)}"><div class="m13-block-header"><h2>${esc(b?.title||'Sin bloque')}</h2><small>${scenes.length} escena${scenes.length===1?'':'s'}</small>${b?`<button class="iconbtn" type="button" data-m13-action="rename-block" data-id="${esc(b.id)}" title="Cambiar nombre">${ic('rename')}</button><button class="iconbtn" type="button" data-m13-action="delete-block" data-id="${esc(b.id)}" title="Eliminar bloque sin eliminar escenas">${ic('trash')}</button>`:''}</div>
 <div class="m13-block-inner" data-m13-drop="${esc(blockId)}">${scenes.map((s,i)=>board?m13SceneCard(p,s):m13SceneList(p,o,s,i)).join('')||'<div class="m13-block-empty">Arrastra aquí una escena o añádela con el botón inferior.</div>'}</div>
 <div class="m13-list-footer"><button class="m13-add-small" data-m13-action="add-scene" data-id="${esc(blockId)}">${ic('plus')} Añadir escena</button></div></section>`;}
outlinesHtml=function(p){const o=activeOutline();if(!o)return m13OldOutline(p);
 const b=o.blocks||[],statusCount=k=>o.scenes.filter(s=>s.status===k).length;
 const sections=[...b.map(x=>m13Block(p,o,x)),m13Block(p,o,null)];
 const completed=statusCount('done'),rate=o.scenes.length?Math.round(100*completed/o.scenes.length):0;
 return `<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Planificación</div><h1>Escaletas</h1></div><div class="head-actions"><button class="btn ghost" data-action="delete-outline" title="Eliminar escaleta">${ic('trash')}</button><button class="btn primary" data-action="add-outline">${ic('plus')} Nueva escaleta</button></div></div>
 <div class="main-scroll"><div class="m13-shell">
 <div class="m13-intro"><div><label class="eyebrow" for="outline-title">NOMBRE DE LA ESCALETA</label><input id="outline-title" class="note-title" value="${esc(o.title)}" placeholder="Nombre de la escaleta"></div><span class="subtle">Estructura a tu ritmo, sin fórmulas obligatorias</span></div>
 <div class="m13-summary"><div class="m13-stat"><strong>${o.scenes.length}</strong><span>Escenas</span></div><div class="m13-stat"><strong>${statusCount('idea')+statusCount('planned')}</strong><span>Por desarrollar</span></div><div class="m13-stat"><strong>${statusCount('writing')}</strong><span>En escritura</span></div><div class="m13-stat"><strong>${completed}</strong><span>Terminadas</span></div></div>
 <div class="m13-progress" title="${rate}% terminadas"><span style="width:${rate}%"></span></div>
 <div class="m13-controls"><div class="m13-controlgroup"><button type="button" data-m13-action="view-list" class="${o.presentation!=='cards'?'active':''}">${ic('list')} Lista</button><button type="button" data-m13-action="view-cards" class="${o.presentation==='cards'?'active':''}">${ic('grid')} Tarjetas</button></div>
 <button class="btn" data-m13-action="new-block">${ic('plus')} Nuevo bloque</button>${b.length?'' :`<button class="btn" data-m13-action="three-acts">Crear 3 actos</button>`}
 <button class="btn primary" data-m13-action="add-scene" data-id="">${ic('plus')} Escena</button><span class="m13-controls-note">Arrastra ⠿ (lista) o tarjetas (tablero) para ordenar</span></div>
 <div class="${o.presentation==='cards'?'m13-board':'m13-blocks-list'}">${sections.join('')}</div>
 </div></div>`;
};
function m13MoveScene(sceneId,blockId,beforeId=null){const o=activeOutline();if(!o)return;const idx=o.scenes.findIndex(s=>s.id===sceneId);if(idx<0)return;
 const [scene]=o.scenes.splice(idx,1);scene.blockId=blockId||'';let target=o.scenes.length;
 if(beforeId){const other=o.scenes.findIndex(s=>s.id===beforeId);if(other>=0)target=other;}
 else if(blockId){const last=o.scenes.reduce((acc,x,i)=>String(x.blockId||'')===blockId?i:acc,-1);if(last>=0)target=last+1;}
 o.scenes.splice(target,0,scene);changed();render();
}
function m13Open(kind,id){const p=activeProject();if(!p||!id)return;const map={chapter:['chapters','activeChapterId','manuscript'],character:['characters','activeCharacterId','characters'],setting:['settings','activeSettingId','settings']};const r=map[kind];if(!r||!p[r[0]].some(x=>x.id===id))return;document.querySelector('.m13-inspector-back')?.remove();state[r[1]]=id;state.view=r[2];changed();render();}
function m13CloseInspector(){document.querySelector('.m13-inspector-back')?.remove();render();}
function m13OpenInspector(id){const p=activeProject(),o=activeOutline(),s=o?.scenes.find(x=>x.id===id);if(!s||!p)return;
 document.querySelector('.m13-inspector-back')?.remove();const overlay=document.createElement('div');overlay.className='m13-inspector-back';overlay.innerHTML=`<aside class="m13-inspector" role="dialog" aria-modal="true" aria-label="Editar escena"><header class="m13-inspector-head"><h2>Editar escena</h2><button class="iconbtn" data-m13-close title="Cerrar">✕</button></header><div class="m13-inspector-scroll">${m13Fields(p,o,s)}</div><footer class="m13-inspector-foot"><button class="btn primary" data-m13-close>Terminar</button></footer></aside>`;document.body.append(overlay);
 overlay.addEventListener('mousedown',ev=>{if(ev.target===overlay)m13CloseInspector()});overlay.querySelectorAll('[data-m13-close]').forEach(btn=>btn.onclick=m13CloseInspector);m13BindInputs(overlay);
 overlay.querySelector('[data-m13-field="title"]')?.focus();
}
function m13AddScene(blockId=''){const o=activeOutline();if(!o)return;const id=uid();o.scenes.push({id,title:'',description:'',status:'idea',pov:'',povCharacterId:'',blockId,chapterId:'',characterIds:[],settingIds:[],goal:'',conflict:'',consequence:'',expanded:true});changed();render();if(o.presentation==='cards')m13OpenInspector(id);else {const node=document.querySelector(`[data-m13-scene-card="${CSS.escape(id)}"]`);node?.scrollIntoView({block:'nearest'});node?.querySelector('[data-m13-field="title"]')?.focus();}}
async function m13Action(action,id){const o=activeOutline();if(!o)return;
 if(action==='view-list'||action==='view-cards'){o.presentation=action==='view-list'?'list':'cards';changed();render();return}
 if(action==='add-scene'){m13AddScene(id||'');return}
 if(action==='new-block'){modal({title:'Nuevo bloque narrativo',description:'Puedes llamarlo Acto I, Primer viaje, Antes del encuentro... o como quieras.',fields:[{id:'title',label:'Nombre del bloque',required:true,placeholder:'Acto I · El comienzo'}],submit:'Añadir bloque',onSubmit:({title})=>{o.blocks.push({id:uid(),title});changed();render()}});return;}
 if(action==='three-acts'){if(o.blocks.length){showToast('Ya tienes bloques. Puedes añadir otros con Nuevo bloque.');return;}o.blocks=[{id:uid(),title:'Acto I · Planteamiento'},{id:uid(),title:'Acto II · Desarrollo'},{id:uid(),title:'Acto III · Desenlace'}];changed();render();return}
 const block=o.blocks.find(x=>x.id===id);
 if(action==='rename-block'&&block){modal({title:'Renombrar bloque',fields:[{id:'title',label:'Nombre',required:true,value:block.title}],onSubmit:({title})=>{block.title=title;changed();render()}});return}
 if(action==='delete-block'&&block){if(!await m172Confirm(`¿Quitar el bloque «${block.title}»? Sus escenas pasarán a «Sin bloque».`))return;o.blocks=o.blocks.filter(x=>x.id!==block.id);o.scenes.forEach(x=>{if(x.blockId===block.id)x.blockId=''});changed();render();return}
 const i=o.scenes.findIndex(s=>s.id===id);if(i<0)return;
 if(action==='edit'){m13OpenInspector(id);return}
 if(action==='delete'){if(!await m172Confirm('¿Eliminar esta escena de la escaleta? No borra el capítulo vinculado.'))return;o.scenes.splice(i,1);changed();render();return}
 if(action==='up'||action==='down'){const s=o.scenes[i],same=o.scenes.filter(x=>x.blockId===s.blockId),at=same.findIndex(x=>x.id===s.id),other=same[at+(action==='up'?-1:1)];if(!other){showToast('Para cambiar de bloque, arrastra la escena o elige otro bloque en sus detalles.');return}const j=o.scenes.findIndex(x=>x.id===other.id);[o.scenes[i],o.scenes[j]]=[o.scenes[j],o.scenes[i]];changed();render();return}
}
function m13BindInputs(root){
 const o=activeOutline(),p=activeProject();if(!o||!p)return;
 root.querySelectorAll('[data-m13-field]').forEach(input=>{const evt=input.tagName==='SELECT'?'change':'input';input.addEventListener(evt,()=>{const s=o.scenes.find(x=>x.id===input.dataset.m13Scene);if(!s)return;const key=input.dataset.m13Field;let v=input.value;
 if(key==='povCharacterId'){const ch=p.characters.find(x=>x.id===v);s.povCharacterId=ch?.id||'';if(ch)s.pov=ch.title;else if(v!=='__legacy__')s.pov='';}
 else{s[key]=v;}
 if(key==='blockId'){changed();const inside=!!root.closest?.('.m13-inspector-back')||root.classList.contains('m13-inspector-back');if(!inside)render();else showToast('Bloque actualizado; se colocará al cerrar');return}
 if(key==='chapterId'||key==='povCharacterId'){const row=input.closest('.m13-select-row');const btn=row?.querySelector('[data-m13-open]');if(btn)btn.disabled=!s[key];}
 changed();const strong=document.querySelector(`[data-m13-summary-title="${CSS.escape(s.id)}"]`),sub=document.querySelector(`[data-m13-summary-sub="${CSS.escape(s.id)}"]`);if(strong)strong.textContent=s.title||'Escena sin título';if(sub)sub.textContent=m13SceneSubtitle(p,s);
 if(key==='status'){const badge=document.querySelector(`[data-m13-stage="${CSS.escape(s.id)}"]`);if(badge){badge.className='m13-stage '+s.status;badge.textContent=m13Status(s.status);}const numbers=document.querySelectorAll('.m13-stat strong');if(numbers.length===4){numbers[1].textContent=o.scenes.filter(x=>['idea','planned'].includes(x.status)).length;numbers[2].textContent=o.scenes.filter(x=>x.status==='writing').length;numbers[3].textContent=o.scenes.filter(x=>x.status==='done').length;}const progress=document.querySelector('.m13-progress>span');if(progress)progress.style.width=(o.scenes.length?100*o.scenes.filter(x=>x.status==='done').length/o.scenes.length:0)+'%';}
 })});
 root.querySelectorAll('[data-m13-multi]').forEach(input=>input.addEventListener('change',()=>{const s=o.scenes.find(x=>x.id===input.dataset.m13Scene);if(!s)return;const key=input.dataset.m13Multi;const array=s[key]||[];if(input.checked&&!array.includes(input.value))array.push(input.value);else if(!input.checked)s[key]=array.filter(x=>x!==input.value);else s[key]=array;changed()}));
 root.querySelectorAll('[data-m13-open]').forEach(btn=>btn.addEventListener('click',()=>{let id=btn.dataset.id||'';const from=btn.dataset.fromScene;if(from){const s=o.scenes.find(x=>x.id===from);id=btn.dataset.m13Open==='chapter'?s?.chapterId:s?.povCharacterId;}m13Open(btn.dataset.m13Open,id)}));
}
function m13BindOutline(){if(state.view!=='outlines'||!activeOutline())return;
 document.querySelectorAll('[data-m13-action]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();m13Action(btn.dataset.m13Action,btn.dataset.id||'')}));
 m13BindInputs(document.querySelector('.m13-shell'));
 document.querySelectorAll('details[data-m13-scene-card]').forEach(d=>d.addEventListener('toggle',()=>{const s=activeOutline()?.scenes.find(x=>x.id===d.dataset.m13SceneCard);if(s&&s.expanded!==d.open){s.expanded=d.open;changed()}}));
 let dragged=null;
 document.querySelectorAll('[data-m13-drag]').forEach(d=>{
  d.addEventListener('dragstart',e=>{dragged=d.dataset.m13Drag;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragged);const card=d.closest('[data-m13-scene-card]');card?.classList.add('is-dragging')});
  d.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.m13-drop-on,.m13-target-before,.m13-target-after').forEach(n=>n.classList.remove('m13-drop-on','m13-target-before','m13-target-after'))});
 });
 document.querySelectorAll('[data-m13-drop]').forEach(drop=>{
  drop.addEventListener('dragover',e=>{if(!dragged)return;e.preventDefault();e.dataTransfer.dropEffect='move';drop.closest('.m13-block')?.classList.add('m13-drop-on')});
  drop.addEventListener('dragleave',e=>{if(!drop.contains(e.relatedTarget))drop.closest('.m13-block')?.classList.remove('m13-drop-on')});
  drop.addEventListener('drop',e=>{if(!dragged)return;e.preventDefault();e.stopPropagation();const blockId=drop.dataset.m13Drop;let near=e.target.closest('[data-m13-scene-card]');let before=null;if(near&&near.dataset.m13SceneCard!==dragged){const half=near.getBoundingClientRect().top+near.getBoundingClientRect().height/2;if(e.clientY<half)before=near.dataset.m13SceneCard;else {const siblings=[...drop.querySelectorAll('[data-m13-scene-card]')];const pos=siblings.indexOf(near);before=siblings.slice(pos+1).find(x=>x.dataset.m13SceneCard!==dragged)?.dataset.m13SceneCard||null;}}
    const id=dragged;dragged=null;m13MoveScene(id,blockId,before);
  });
 });
}
const m13PrevWire=wire;
wire=function(){m13PrevWire();document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.3 · C'));m13BindOutline()};


/* ==============================================================
   MARGEN 1.3.1 — cierre del Prototipo C.
   Conserva el esquema JSON v1 y los datos de 1.3.
   ============================================================== */
const m131PrevEnsure=ensureSelections;
ensureSelections=function(){
  m131PrevEnsure();
  for(const p of state?.projects||[])for(const o of p.outlines||[]){
    if(!o.foldedBlocks || typeof o.foldedBlocks!=='object' || Array.isArray(o.foldedBlocks))o.foldedBlocks={};
  }
};
// El ID especial es estable y distinto de los IDs de actos existentes.
function m131BlockKey(blockId){return blockId||'__sin_bloque__';}
const m131OriginalBlock=m13Block;
m13Block=function(p,o,b){
  const id=b?.id||'',folded=!!o.foldedBlocks?.[m131BlockKey(id)],count=o.scenes.filter(s=>(s.blockId||'')===id).length;
  let html=m131OriginalBlock(p,o,b);
  html=html.replace('<section class="m13-block"',`<section class="m13-block ${folded?'m131-collapsed':''}"`);
  html=html.replace('<div class="m13-block-header">',`<div class="m13-block-header" data-m131-drop-header="${esc(id)}"><button type="button" class="m131-fold-btn" data-m131-fold="${esc(id)}" aria-label="${folded?'Desplegar':'Plegar'} ${esc(b?.title||'Sin bloque')}" aria-expanded="${!folded}" title="${folded?'Desplegar':'Plegar'} bloque">${ic('chevron')}</button>`);
  return html;
};
const m131OldOutlinesHtml=outlinesHtml;
outlinesHtml=function(p){
  let html=m131OldOutlinesHtml(p);
  if(!activeOutline())return html;
  const controls=`<div class="m131-fold-all"><button class="btn" type="button" data-m131-all="fold">${ic('up')} Plegar actos</button><button class="btn" type="button" data-m131-all="expand">${ic('down')} Desplegar actos</button></div>`;
  return html.replace('<button class="btn" data-m13-action="new-block"',controls+'<button class="btn" data-m13-action="new-block"');
};
function m131RefreshFoldControls(){
  const o=activeOutline();if(!o)return;
  document.querySelectorAll('.m13-block[data-m13-block]').forEach(el=>{
    const id=el.dataset.m13Block,folded=!!o.foldedBlocks[m131BlockKey(id)];
    el.classList.toggle('m131-collapsed',folded);
    const btn=el.querySelector('[data-m131-fold]');if(btn){btn.setAttribute('aria-expanded',String(!folded));btn.setAttribute('aria-label',`${folded?'Desplegar':'Plegar'} ${o.blocks.find(b=>b.id===id)?.title||'Sin bloque'}`);btn.title=folded?'Desplegar bloque':'Plegar bloque';}
  });
}
const m131OldBindOutline=m13BindOutline;
m13BindOutline=function(){
  m131OldBindOutline();
  const o=activeOutline();if(state.view!=='outlines'||!o)return;
  document.querySelectorAll('[data-m131-fold]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();const key=m131BlockKey(btn.dataset.m131Fold);o.foldedBlocks[key]=!o.foldedBlocks[key];changed();m131RefreshFoldControls();
  }));
  document.querySelectorAll('[data-m131-all]').forEach(btn=>btn.addEventListener('click',()=>{
    for(const b of [...o.blocks,{id:''}])o.foldedBlocks[m131BlockKey(b.id)]=btn.dataset.m131All==='fold';
    changed();m131RefreshFoldControls();
  }));
  // Permitir soltar sobre un acto plegado sin tener que desplegarlo primero.
  let incoming=null;
  document.querySelectorAll('[data-m13-drag]').forEach(d=>{
    d.addEventListener('dragstart',()=>incoming=d.dataset.m13Drag);
    d.addEventListener('dragend',()=>incoming=null);
  });
  document.querySelectorAll('[data-m131-drop-header]').forEach(h=>{
    h.addEventListener('dragover',e=>{if(incoming){e.preventDefault();e.dataTransfer.dropEffect='move';h.closest('.m13-block')?.classList.add('m13-drop-on')}});
    h.addEventListener('dragleave',()=>h.closest('.m13-block')?.classList.remove('m13-drop-on'));
    h.addEventListener('drop',e=>{if(!incoming)return;e.preventDefault();e.stopPropagation();const id=incoming;incoming=null;const block=h.dataset.m131DropHeader;o.foldedBlocks[m131BlockKey(block)]=false;m13MoveScene(id,block);});
  });
};
// Si añadimos una escena a un bloque plegado, abrirlo para mostrarla.
const m131PreviousAddScene=m13AddScene;
m13AddScene=function(blockId=''){
  const o=activeOutline();if(o){o.foldedBlocks=o.foldedBlocks||{};o.foldedBlocks[m131BlockKey(blockId)]=false;}
  return m131PreviousAddScene(blockId);
};
// Vista general + botón de plegar/desplegar todo el árbol lateral.
function m131SidebarToggle(){
  const p=activeProject();if(!p)return;
  p.collapsedCategories=p.collapsedCategories||{};
  const visible=[...document.querySelectorAll('.sidebar .tree-section')].filter(node=>!node.hidden).map(node=>node.dataset.section);
  const shouldFold=visible.some(v=>!p.collapsedCategories[v]);
  for(const v of visible)p.collapsedCategories[v]=shouldFold;
  changed();renderSidebarOnly();
}
function m131InsertSidebarButton(){
  if(!state||['desk','library','dictionary'].includes(state.view))return;
  const side=document.querySelector('.sidebar'),btn=side?.querySelector('.sidebaritem[data-action="book-home"]');
  if(!btn)return;
  let row=btn.closest('.m131-overview-row');
  if(!row){row=document.createElement('div');row.className='m131-overview-row';btn.before(row);row.append(btn);}
  if(row.querySelector('.m131-collapse-all'))return;
  const p=activeProject(),sections=[...side.querySelectorAll('.tree-section')].filter(node=>!node.hidden).map(node=>node.dataset.section);
  const fullyCollapsed=sections.length>0&&sections.every(v=>p?.collapsedCategories?.[v]);
  const control=document.createElement('button');control.type='button';control.className='m131-collapse-all';
  control.title=fullyCollapsed?'Desplegar todas las categorías':'Plegar todas las categorías';
  control.setAttribute('aria-label',control.title);
  control.innerHTML=fullyCollapsed?ic('down'):ic('up');control.addEventListener('click',m131SidebarToggle);row.append(control);
}
const m131OldApplyLayout=m124ApplySectionLayout;
m124ApplySectionLayout=function(){m131OldApplyLayout();m131InsertSidebarButton();};
// Línea temporal visual: misma estructura de eventos; únicamente cambia la presentación.
let m131TimelineSelectedId=null,m131TimelineSelectedChron=null;
function m131CurrentEvent(){
  const t=activeChronology();if(!t)return null;
  if(m131TimelineSelectedChron!==t.id){m131TimelineSelectedChron=t.id;m131TimelineSelectedId=null;}
  const selected=t.events.find(x=>x.id===m131TimelineSelectedId)||t.events[0]||null;
  m131TimelineSelectedId=selected?.id||null;return selected;
}
function m131TimePoint(event,index){const active=event.id===m131TimelineSelectedId,where=index%2?'down':'up';
  const summary=event.description?.trim()||'Pulsa para completar este acontecimiento';
  return `<div class="m131-time-point ${where}" data-m131-point="${esc(event.id)}"><button class="m131-time-card ${active?'active':''}" type="button" data-m131-select="${esc(event.id)}" aria-pressed="${active}"><small>${esc(event.date||'Momento sin fecha')}</small><strong>${esc(event.title||'Acontecimiento sin título')}</strong><span title="${esc(summary)}">${esc(summary)}</span></button><span class="m131-time-dot"></span><span class="m131-time-order" style="position:absolute;left:48%;top:calc(50% + 14px)">${index+1}</span></div>`;
}
function m131TimeEditor(p,t,event){
  if(!event)return `<h3>Tu línea temporal</h3><p class="char-helper">Añade un acontecimiento para construir tu historia en el tiempo.</p><button class="btn primary" data-m131-time="add">${ic('plus')} Primer acontecimiento</button>`;
  const idx=t.events.indexOf(event),chapter=p.chapters.find(x=>x.id===event.chapterId),character=p.characters.find(x=>x.id===event.characterId);
  const options=(items,key,none)=>`<option value="">${none}</option>${items.map(x=>`<option value="${esc(x.id)}" ${x.id===event[key]?'selected':''}>${esc(x.title)}</option>`).join('')}`;
  return `<div><div class="eyebrow">ACONTECIMIENTO ${String(idx+1).padStart(2,'0')}</div><h3>Editar momento</h3></div>
  <label class="m131-label">Momento o fecha<input data-m131-field="date" placeholder="1984, Día 3, veinte años antes..." value="${esc(event.date||'')}"></label>
  <label class="m131-label">Nombre del acontecimiento<input data-m131-field="title" placeholder="Un mensaje inesperado" value="${esc(event.title||'')}"></label>
  <label class="m131-label">¿Qué sucede?<textarea data-m131-field="description" placeholder="¿Qué ocurrió en este momento y qué consecuencias tuvo?">${esc(event.description||'')}</textarea></label>
  <label class="m131-label">Capítulo relacionado<select data-m131-field="chapterId">${options(p.chapters,'chapterId','Sin vincular')}</select></label>
  <label class="m131-label">Personaje relacionado<select data-m131-field="characterId">${options(p.characters,'characterId','Sin vincular')}</select></label>
  <div class="m131-editor-links"><button class="btn ghost" type="button" data-m131-nav="chapter" ${chapter?'':'disabled'}>${ic('book')} Abrir capítulo</button><button class="btn ghost" type="button" data-m131-nav="character" ${character?'':'disabled'}>${ic('users')} Abrir personaje</button></div>
  <div class="m131-editor-actions"><button class="btn" type="button" data-m131-time="left" ${idx===0?'disabled':''} title="Anterior en la línea del tiempo">${ic('back')} Anterior</button><button class="btn" type="button" data-m131-time="right" ${idx===t.events.length-1?'disabled':''} title="Siguiente en la línea del tiempo">${ic('chevron')} Siguiente</button><button class="btn danger" type="button" data-m131-time="delete">${ic('trash')} Eliminar</button></div>
  <p class="m131-time-mini">El orden es manual: puedes usar fechas libres y mover cada acontecimiento con Anterior / Siguiente.</p>`;
}
const m131PrevChronologies=chronologiesHtml;
chronologiesHtml=function(p){
  const t=activeChronology();if(!t)return m131PrevChronologies(p);
  const chosen=m131CurrentEvent();
  return `<div class="workspace-head"><div><div class="eyebrow">${esc(p.name)} · Cronologías</div><h1>Línea temporal</h1></div><div class="head-actions"><button class="btn ghost" data-action="timeline-delete-chronology" title="Eliminar cronología">${ic('trash')}</button><button class="btn primary" data-action="add-chronology">${ic('plus')} Nueva cronología</button></div></div>
  <div class="main-scroll"><div class="m131-time-page"><div class="m131-time-heading"><div><label class="eyebrow" for="chron-title">NOMBRE DE LA CRONOLOGÍA</label><input id="chron-title" class="note-title" value="${esc(t.title||'')}" placeholder="Línea temporal principal"></div><div class="hint">Ordena hechos y épocas en una línea visual. Las fechas pueden ser aproximadas o inventadas.</div></div>
  <div class="m131-time-layout"><div class="m131-time-board"><div class="m131-time-toolbar"><span class="subtle">${t.events.length} acontecimientos</span><button class="btn" data-m131-time="start" title="Volver al primer evento">${ic('back')} Inicio</button><button class="btn" data-m131-time="end" title="Ir al último evento">Final ${ic('chevron')}</button><button class="btn primary" data-m131-time="add">${ic('plus')} Acontecimiento</button></div>
  <div class="m131-time-scroll" id="m131-time-scroll"><div class="m131-time-track">${t.events.length?t.events.map(m131TimePoint).join(''):'<div class="m131-time-empty">Todavía no hay acontecimientos: añade el primero para empezar tu línea del tiempo.</div>'}</div></div>
  <div class="m131-time-board-foot">${ic('clock')} Desliza horizontalmente para recorrer la historia. Pulsa una tarjeta para editarla.</div></div>
  <aside class="m131-time-editor" id="m131-time-editor">${m131TimeEditor(p,t,chosen)}</aside></div></div></div>`;
};
function m131RenderTimeEditor(){
 const p=activeProject(),t=activeChronology(),dest=document.getElementById('m131-time-editor');if(!p||!t||!dest)return;
 dest.innerHTML=m131TimeEditor(p,t,m131CurrentEvent());m131BindTimeEditor();
 document.querySelectorAll('.m131-time-card').forEach(node=>{const active=node.dataset.m131Select===m131TimelineSelectedId;node.classList.toggle('active',active);node.setAttribute('aria-pressed',String(active));});
}
function m131RepaintTimeline(preserve=true){
  const scroll=document.getElementById('m131-time-scroll'),left=scroll?.scrollLeft||0;
  changed();render();
  const next=document.getElementById('m131-time-scroll');if(preserve&&next)next.scrollLeft=left;
}
async function m131TimeAction(action){
 const t=activeChronology();if(!t)return;
 const evt=m131CurrentEvent(),idx=evt?t.events.findIndex(x=>x.id===evt.id):-1;
 if(action==='add'){
  const id=uid();t.events.push({id,title:'',date:'',description:'',chapterId:'',characterId:'',expanded:false});m131TimelineSelectedId=id;
  m131RepaintTimeline(false);
  const card=document.querySelector(`[data-m131-select="${CSS.escape(id)}"]`);card?.scrollIntoView({block:'nearest',inline:'nearest'});
  document.querySelector('#m131-time-editor [data-m131-field="title"]')?.focus();return;
 }
 if(action==='start'||action==='end'){
  const target=document.getElementById('m131-time-scroll');if(target)target.scrollTo({left:action==='start'?0:target.scrollWidth,behavior:'smooth'});return;
 }
 if(idx<0)return;
 if(action==='delete'){
  if(!await m172Confirm('¿Eliminar este acontecimiento de la cronología? No se eliminarán capítulos ni personajes vinculados.'))return;
  t.events.splice(idx,1);m131TimelineSelectedId=t.events[Math.min(idx,t.events.length-1)]?.id||null;m131RepaintTimeline();return;
 }
 if(action==='left'&&idx>0){[t.events[idx-1],t.events[idx]]=[t.events[idx],t.events[idx-1]];m131RepaintTimeline();return;}
 if(action==='right'&&idx<t.events.length-1){[t.events[idx+1],t.events[idx]]=[t.events[idx],t.events[idx+1]];m131RepaintTimeline();return;}
}
function m131BindTimeEditor(){
 const p=activeProject(),t=activeChronology(),area=document.getElementById('m131-time-editor'),ev=m131CurrentEvent();if(!p||!t||!area)return;
 area.querySelectorAll('[data-m131-field]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{
  if(!ev)return;const key=input.dataset.m131Field;ev[key]=input.value;changed();
  if(['title','date','description'].includes(key)){
   const card=document.querySelector(`[data-m131-select="${CSS.escape(ev.id)}"]`);
   if(card){card.querySelector('strong').textContent=ev.title||'Acontecimiento sin título';card.querySelector('small').textContent=ev.date||'Momento sin fecha';card.querySelector('span').textContent=ev.description||'Pulsa para completar este acontecimiento';}
  }
  if(['chapterId','characterId'].includes(key)){
   const nav=area.querySelector(`[data-m131-nav="${key==='chapterId'?'chapter':'character'}"]`);if(nav)nav.disabled=!input.value;
  }
 }));
 area.querySelectorAll('[data-m131-time]').forEach(btn=>btn.addEventListener('click',()=>m131TimeAction(btn.dataset.m131Time)));
 area.querySelectorAll('[data-m131-nav]').forEach(btn=>btn.addEventListener('click',()=>{if(!ev)return;const kind=btn.dataset.m131Nav,id=kind==='chapter'?ev.chapterId:ev.characterId;m13Open(kind,id)}));
}
function m131BindTimeline(){
 if(state.view!=='chronologies'||!activeChronology())return;
 document.querySelectorAll('[data-m131-select]').forEach(btn=>btn.addEventListener('click',()=>{
  m131TimelineSelectedId=btn.dataset.m131Select;m131RenderTimeEditor();
 }));
 document.querySelectorAll('.m131-time-toolbar [data-m131-time]').forEach(btn=>btn.addEventListener('click',()=>m131TimeAction(btn.dataset.m131Time)));
 m131BindTimeEditor();
 const track=document.getElementById('m131-time-scroll');
 track?.addEventListener('wheel',e=>{if(e.shiftKey){e.preventDefault();track.scrollLeft+=e.deltaY;}},{passive:false});
}
const m131PrevWire=wire;
wire=function(){m131PrevWire();document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.3.1 · C'));m131BindTimeline();};

/* === MARGEN 1.4 — D1. Importación LOCAL de DOCX/TXT, vista previa y carga masiva. === */
const m14Draft={files:[],chapters:[],issues:[],step:1,busy:false,dest:'new',bookName:'',sourceMode:'auto'};
const m14FileLabel=name=>String(name||'Documento').replace(/\.(docx|doc|txt)$/i,'').replace(/[_]+/g,' ').trim();
const m14Esc=esc;
function m14AddEntryPoint(){
  const head=document.querySelector('.workspace-head'); if(!head||document.querySelector('.m14-import-open'))return;
  if(!['library','book','manuscript'].includes(state.view))return;
  const btn=document.createElement('button');btn.type='button';btn.className='btn m14-import-open';btn.innerHTML=ic('upload')+' Importar Word / TXT';btn.title='Importar uno o varios documentos con vista previa';btn.addEventListener('click',m14Open);
  const actions=head.querySelector('.head-actions');if(actions)actions.prepend(btn);else head.append(btn);
}
const m14PrevRender=render;
render=function(){m14PrevRender();m14AddEntryPoint();};
function m14Reset(){m14Draft.files=[];m14Draft.chapters=[];m14Draft.issues=[];m14Draft.step=1;m14Draft.busy=false;m14Draft.sourceMode='auto';m14Draft.dest=(state.view==='library'||!activeProject())?'new':'existing';m14Draft.bookName='';}
function m14Open(){m14Reset();const bg=document.createElement('div');bg.className='m14-overlay';bg.id='m14-overlay';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','Importar manuscrito');document.body.append(bg);m14Render();}
function m14Close(){if(m14Draft.busy)return;document.getElementById('m14-overlay')?.remove();}
function m14Render(){
 const root=el('m14-overlay');if(!root)return;
 root.innerHTML=`<section class="m14-dialog"><div class="m14-head"><div><div class="eyebrow">MARGEN · IMPORTACIÓN DE MANUSCRITOS</div><h2>${m14Draft.step===1?'Trae tus historias a MARGEN':'Revisa los capítulos antes de importar'}</h2><p>${m14Draft.step===1?'Admite archivos de Word (.docx) y texto (.txt). Todo se procesa sin enviar documentos a internet.':'Nada se incorporará a tu biblioteca hasta confirmar esta vista previa.'}</p></div><button class="iconbtn" type="button" id="m14-close" title="Cerrar importación" ${m14Draft.busy?'disabled':''}>${ic('close')}</button></div><div class="m14-content" id="m14-content">${m14Draft.step===1?m14SourcesHtml():m14PreviewHtml()}</div><div class="m14-footer"><span class="subtle" id="m14-bottom">${m14Draft.step===1?'Tus archivos originales no se modifican.':'La importación añade capítulos; no reemplaza los existentes.'}</span><div class="m14-footer-actions">${m14Draft.step===2?'<button class="btn" id="m14-back">Volver a archivos</button>':''}<button class="btn" id="m14-cancel">Cancelar</button><button class="btn primary" id="m14-next" ${m14Draft.busy||(m14Draft.step===1&&!m14Draft.files.length)||(m14Draft.step===2&&!m14Draft.chapters.length)?'disabled':''}>${m14Draft.step===1?'Preparar vista previa':`Importar ${m14Draft.chapters.length} capítulo${m14Draft.chapters.length===1?'':'s'}`}</button></div></div></section>`;
 el('m14-close').onclick=m14Close;el('m14-cancel').onclick=m14Close;
 if(m14Draft.step===1)m14BindSources();else m14BindPreview();
 const back=el('m14-back');if(back)back.onclick=()=>{m14Draft.step=1;m14Render()};
 el('m14-next').onclick=m14Draft.step===1?m14Prepare:m14Commit;
}
function m14SourcesHtml(){
 return `<h3 class="m14-section-title">1 · Selecciona los documentos</h3><p class="m14-intro">Puedes traer <strong>una novela completa</strong>, o seleccionar <strong>muchos archivos</strong> si tienes cada capítulo en un Word diferente. MARGEN detectará los títulos y te dejará revisarlos.</p>
 <div class="m14-file-actions"><button class="btn primary" id="m14-pick">${ic('plus')} Añadir archivos</button><button class="btn" id="m14-pick-folder">${ic('folder')} Seleccionar carpeta</button><input type="file" id="m14-files" hidden multiple accept=".docx,.txt,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/msword"><input type="file" id="m14-folder" hidden multiple webkitdirectory directory></div>
 <div class="m14-choices"><label class="m14-choice"><input type="radio" name="m14-source" value="auto" ${m14Draft.sourceMode==='auto'?'checked':''}>Detectar capítulos dentro de cada documento</label><label class="m14-choice"><input type="radio" name="m14-source" value="files" ${m14Draft.sourceMode==='files'?'checked':''}>Cada archivo = un capítulo</label></div>
 <div class="m14-note">Para detectar capítulos se reconocen los títulos con estilo de Word («Título 1», «Heading 1») y encabezados como «Capítulo 1» o «Capítulo IV». Si no se detecta ninguno, el documento se importará como un único capítulo. Los capítulos se pueden dividir o unir manualmente en la vista previa.</div>
 ${m14Draft.files.length?`<div class="m14-files">${m14Draft.files.map((file,i)=>`<div class="m14-file-row">${ic('file')} <span title="${esc(file.name)}">${esc(file.name)}</span><small class="subtle">${(file.size/1024).toFixed(0)} KB</small><button type="button" class="btn ghost" data-m14-remove="${i}">Quitar</button></div>`).join('')}</div>`:'<div class="m14-note" style="margin-top:15px">Todavía no has añadido archivos. Puedes seleccionar varios DOCX o TXT a la vez.</div>'}
 <p class="m14-note warning" style="margin-top:16px"><strong>Sobre los .doc antiguos:</strong> este prototipo HTML no puede interpretar fielmente el formato binario .doc. Si incluyes alguno te indicará cómo convertirlo a .docx localmente desde Word o LibreOffice. No se importará como texto corrupto. La conversión integrada se estudiará para la aplicación de escritorio.</p>`;
}
function m14BindSources(){
 el('m14-pick').onclick=()=>el('m14-files').click();el('m14-pick-folder').onclick=()=>el('m14-folder').click();
 const add=files=>{const valid=Array.from(files).filter(f=>/\.(docx|txt|doc)$/i.test(f.name));const known=new Set(m14Draft.files.map(f=>[f.name,f.size,f.lastModified].join('|')));for(const f of valid){const sig=[f.name,f.size,f.lastModified].join('|');if(!known.has(sig)){m14Draft.files.push(f);known.add(sig)}}m14Draft.files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));m14Render();if(valid.length===0)showToast('Selecciona archivos .docx, .txt o .doc');};
 el('m14-files').onchange=e=>add(e.target.files);el('m14-folder').onchange=e=>add(e.target.files);
 document.querySelectorAll('[data-m14-remove]').forEach(b=>b.onclick=()=>{m14Draft.files.splice(Number(b.dataset.m14Remove),1);m14Render()});
 document.querySelectorAll('[name="m14-source"]').forEach(r=>r.onchange=()=>{m14Draft.sourceMode=r.value});
}
// Lector mínimo ZIP basado en el directorio central y en DecompressionStream del navegador.
// Sin enlaces externos, bibliotecas en CDN ni servicios de conversión.
function m14ReadZip(ab){
 const data=new Uint8Array(ab),view=new DataView(ab),td=new TextDecoder('utf-8');
 let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-66000);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break}}
 if(end<0)throw new Error('El archivo no parece un DOCX válido (ZIP).');
 const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true),result=new Map();
 if(count>5000)throw new Error('El DOCX contiene demasiadas entradas.');
 let pos=offset;
 for(let i=0;i<count;i++){
  if(pos+46>data.length||view.getUint32(pos,true)!==0x02014b50)throw new Error('Directorio del DOCX dañado.');
  const method=view.getUint16(pos+10,true),compressed=view.getUint32(pos+20,true),size=view.getUint32(pos+24,true),nameLen=view.getUint16(pos+28,true),extraLen=view.getUint16(pos+30,true),commentLen=view.getUint16(pos+32,true),local=view.getUint32(pos+42,true);
  const name=td.decode(data.subarray(pos+46,pos+46+nameLen));pos+=46+nameLen+extraLen+commentLen;
  if(size>60*1024*1024||compressed>50*1024*1024)throw new Error('Un elemento del DOCX es demasiado grande para esta vista de prueba.');
  if(!name.endsWith('/'))result.set(name,{method,compressed,size,local});
 }
 return {files:result,data,view};
}
async function m14ZipGet(zip,name){
 const item=zip.files.get(name);if(!item)return null;
 const {data,view}=zip,pos=item;const p=pos.local;
 if(p+30>data.length||view.getUint32(p,true)!==0x04034b50)throw new Error('Entrada dañada: '+name);
 const beg=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true);if(beg+item.compressed>data.length)throw new Error('Datos comprimidos incompletos.');
 const chunk=data.slice(beg,beg+item.compressed);
 if(item.method===0)return chunk;
 if(item.method!==8)throw new Error('Compresión DOCX no compatible: '+item.method);
 if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no admite la descompresión local. Actualiza Edge o Chrome.');
 const out=await new Response(new Blob([chunk]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
 if(out.byteLength>60*1024*1024)throw new Error('Contenido descomprimido demasiado grande.');
 return new Uint8Array(out);
}
const m14Xml=s=>{const doc=new DOMParser().parseFromString(s,'application/xml');if(doc.querySelector('parsererror'))throw new Error('XML de Word no válido.');return doc;};
const m14Kids=(node,name)=>Array.from(node?.children||[]).filter(x=>x.localName===name);
const m14Desc=(node,name)=>Array.from(node?.getElementsByTagName('*')||[]).filter(x=>x.localName===name);
const m14First=(node,name)=>m14Desc(node,name)[0]||null;
const m14Attr=(node,name)=>node?.getAttribute('w:'+name)||node?.getAttribute(name)||'';
function m14NodeText(node){return m14Desc(node,'t').map(x=>x.textContent).join('');}
function m14SafeUrl(url){return /^(https?:|mailto:)/i.test(url||'')?url:'';}
function m14ImageMime(name){const ext=(name||'').split('.').pop()?.toLowerCase();return {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp'}[ext]||'';}
function m14Base64(bytes){let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);}
async function m14Docx(file){
 if(file.size>40*1024*1024)throw new Error('Este DOCX supera el límite de prueba de 40 MB.');
 const zip=m14ReadZip(await file.arrayBuffer());
 const content=await m14ZipGet(zip,'word/document.xml');if(!content)throw new Error('No se encontró word/document.xml.');
 const doc=m14Xml(new TextDecoder('utf-8').decode(content)),body=m14First(doc,'body');if(!body)throw new Error('El DOCX no contiene un cuerpo de documento.');
 const relationships=new Map();const relBytes=await m14ZipGet(zip,'word/_rels/document.xml.rels');
 if(relBytes){const relDoc=m14Xml(new TextDecoder('utf-8').decode(relBytes));for(const node of m14Desc(relDoc,'Relationship'))relationships.set(node.getAttribute('Id'),{target:node.getAttribute('Target')||'',external:node.getAttribute('TargetMode')==='External'})}
 const styles=new Map();const styleBytes=await m14ZipGet(zip,'word/styles.xml');
 if(styleBytes){const styleDoc=m14Xml(new TextDecoder('utf-8').decode(styleBytes));for(const st of m14Desc(styleDoc,'style')){const id=m14Attr(st,'styleId');const name=m14Attr(m14First(st,'name'),'val');if(id)styles.set(id,name)}}
 const listFormats=new Map(),numbering=await m14ZipGet(zip,'word/numbering.xml');
 if(numbering){
  const nDoc=m14Xml(new TextDecoder('utf-8').decode(numbering)),types=new Map();
  for(const abs of m14Desc(nDoc,'abstractNum')){
   const id=m14Attr(abs,'abstractNumId'),lvls=new Map();
   for(const lvl of m14Kids(abs,'lvl'))lvls.set(m14Attr(lvl,'ilvl'),m14Attr(m14First(lvl,'numFmt'),'val')||'bullet');
   types.set(id,lvls);
  }
  for(const num of m14Desc(nDoc,'num')){
   const numid=m14Attr(num,'numId'),abstract=m14Attr(m14First(num,'abstractNumId'),'val');if(types.has(abstract))listFormats.set(numid,types.get(abstract));
  }
 }
 const imageCache=new Map();
 async function getImage(rid){const rel=relationships.get(rid);if(!rel||rel.external)return '';
  const raw=rel.target.replace(/\\/g,'/');const resolved=raw.startsWith('/')?raw.slice(1):'word/'+raw.replace(/^\.\//,'');const clean=resolved.split('/').reduce((a,x)=>{if(x==='..')a.pop();else if(x&&x!=='.')a.push(x);return a},[]).join('/');
  if(imageCache.has(clean))return imageCache.get(clean);
  const mime=m14ImageMime(clean);if(!mime){imageCache.set(clean,'');return ''}
  const bytes=await m14ZipGet(zip,clean);if(!bytes||bytes.byteLength>6*1024*1024){imageCache.set(clean,'');return ''}
  const url='data:'+mime+';base64,'+m14Base64(bytes);imageCache.set(clean,url);return url;
 }
 async function formatRun(r){
  const rpr=m14Kids(r,'rPr')[0],on=n=>{const v=m14Kids(rpr,n)[0];return !!v&&!['0','false','off','none'].includes(m14Attr(v,'val').toLowerCase())};
  let txt='';for(const x of r.children){if(x.localName==='t')txt+=esc(x.textContent||'');else if(x.localName==='tab')txt+='&emsp;';else if(x.localName==='br'||x.localName==='cr')txt+='<br>';else if(x.localName==='drawing'||x.localName==='pict'){
   const blip=m14First(x,'blip');const rid=blip?.getAttribute('r:embed')||blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');const url=rid?await getImage(rid):'';
   if(url)txt+=`<img src="${url}" alt="Ilustración del manuscrito" style="max-width:100%;height:auto">`;
  }}
  if(!txt)return '';
  const css=[];const color=m14Attr(m14Kids(rpr,'color')[0],'val');if(/^[0-9a-f]{6}$/i.test(color))css.push('color:#'+color);
  const hi=m14Attr(m14Kids(rpr,'highlight')[0],'val').toLowerCase();const hiMap={yellow:'#fff3a2',green:'#c4e8b7',cyan:'#bbecf1',magenta:'#eac2df',red:'#f7c7c7',blue:'#c4d6f7'};if(hiMap[hi])css.push('background-color:'+hiMap[hi]);
  const sz=Number(m14Attr(m14Kids(rpr,'sz')[0],'val'));if(sz>=14&&sz<=72)css.push('font-size:'+(sz/2)+'pt');
  if(css.length)txt=`<span style="${css.join(';')}">${txt}</span>`;
  if(on('b'))txt='<strong>'+txt+'</strong>';if(on('i'))txt='<em>'+txt+'</em>';if(on('u'))txt='<u>'+txt+'</u>';if(on('strike')||on('dstrike'))txt='<s>'+txt+'</s>';
  return txt;
 }
 async function paragraph(p){
  const ppr=m14Kids(p,'pPr')[0],sty=m14Attr(m14Kids(ppr,'pStyle')[0],'val'),name=styles.get(sty)||sty;
  const headingMatch=(name||'').match(/^(?:heading|titulo|título|überschrift|titre)\s*([1-6])$/i);
  let level=headingMatch?Number(headingMatch[1]):0;if(!level&&/^heading[1-6]$/i.test(sty))level=Number(sty.match(/\d/)[0]);
  const alignment=m14Attr(m14Kids(ppr,'jc')[0],'val'),allowed={center:'center',right:'right',both:'justify',left:'left',distribute:'justify'};
  const indent=m14Kids(ppr,'ind')[0],leftTwip=Number(m14Attr(indent,'left'))||0,first=Number(m14Attr(indent,'firstLine'))||0;
  const css=[];if(allowed[alignment])css.push('text-align:'+allowed[alignment]);if(leftTwip>0&&leftTwip<12000)css.push('margin-left:'+Math.round(leftTwip/20)+'pt');if(first>=-2000&&first<=2000&&first!==0)css.push('text-indent:'+Math.round(first/20)+'pt');
  let html='';for(const node of p.children){if(node.localName==='r')html+=await formatRun(node);else if(node.localName==='ins'||node.localName==='sdt'){for(const r of m14Desc(node,'r'))html+=await formatRun(r)}else if(node.localName==='hyperlink'){
    const rid=node.getAttribute('r:id')||node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');const link=m14SafeUrl(relationships.get(rid)?.target||'');let inner='';for(const r of m14Kids(node,'r'))inner+=await formatRun(r);html+=link?`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${inner}</a>`:inner;
   }}
  const text=m14NodeText(p).trim(),num=m14Kids(ppr,'numPr')[0];
  const listId=m14Attr(m14First(num,'numId'),'val'),ilvl=m14Attr(m14First(num,'ilvl'),'val')||'0';
  const fmt=listFormats.get(listId)?.get(ilvl)||'bullet';
  const list=num?(fmt==='bullet'?'ul':'ol'):/(?:list\s*bullet|viñetas|lista con viñetas)/i.test(name)?'ul':/(?:list\s*number|lista numerada|numeración)/i.test(name)?'ol':null;
  const tag=list?'li':level?'h'+level:'p';const style=css.length?' style="'+css.join(';')+'"':'';
  return {html:`<${tag}${style}>${html||'&nbsp;'}</${tag}>`,text,heading:level===1,style:sty,level,list};
 }
 const blocks=[];
 for(const child of body.children){
  if(child.localName==='p')blocks.push(await paragraph(child));
  if(child.localName==='tbl'){
   const rows=[];for(const tr of m14Kids(child,'tr')){
    let cells='';for(const tc of m14Kids(tr,'tc')){let txt='';for(const paragraphNode of m14Kids(tc,'p')){const block=await paragraph(paragraphNode);txt+=block.html;}cells+='<td>'+txt+'</td>';}
    rows.push('<tr>'+cells+'</tr>');
   }blocks.push({html:'<table>'+rows.join('')+'</table>',text:m14NodeText(child).trim(),heading:false,level:0});
  }
 }
 if(!blocks.length)blocks.push({html:'<p></p>',text:'',heading:false});
 return blocks;
}
function m14TxtBlocks(text){const clean=String(text||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');return clean.split(/\n\s*\n/g).map(chunk=>{const t=chunk.trim();return {html:'<p>'+esc(t).replace(/\n/g,'<br>')+'</p>',text:t,heading:false,level:0};}).filter(b=>b.text.length>0);}
function m14LooksHeading(text){return /^(?:cap[ií]tulo|chapter|chap\.?|parte|part)\s+(?:\d+|[ivxlcdm]+|primero|segundo|tercero|cuarto|quinto|uno|dos|tres)\b(?:\s*[:.\-–—·]\s*.*)?$/i.test((text||'').trim());}
function m14ChapterFromBlocks(title,blocks,source){return {title:(title||'').trim()||'Capítulo sin título',blocks,source};}
function m14SplitAutomatic(blocks,fileName,fileMode){
 const title=m14FileLabel(fileName);if(fileMode==='files')return [m14ChapterFromBlocks(title,blocks,fileName)];
 const haveHead1=blocks.some(x=>x.heading),haveRegex=blocks.some(x=>m14LooksHeading(x.text));
 if(!haveHead1&&!haveRegex)return [m14ChapterFromBlocks(title,blocks,fileName)];
 const out=[];let current=[],currentTitle='Inicio / Prólogo';
 for(const block of blocks){const isHead=haveHead1?block.heading:m14LooksHeading(block.text);
  if(isHead){if(current.some(x=>x.text)){out.push(m14ChapterFromBlocks(currentTitle,current,fileName));}current=[];currentTitle=block.text.slice(0,130)||title;continue;}
  current.push(block);
 }
 if(current.length||!out.length)out.push(m14ChapterFromBlocks(currentTitle,current,fileName));
 return out;
}
async function m14ParseFile(file){
 const ext=file.name.toLowerCase().split('.').pop();if(file.size>40*1024*1024)throw new Error('Archivo demasiado grande (máx. 40 MB por archivo).');
 if(ext==='doc')throw new Error('Word antiguo (.doc): conviértelo localmente a .docx desde Word («Guardar como») o LibreOffice. El HTML no puede conservar su estructura de forma fiable.');
 if(ext==='docx')return m14Docx(file);
 if(ext==='txt'){const bytes=await file.arrayBuffer();let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{s=new TextDecoder('windows-1252').decode(bytes)}return m14TxtBlocks(s)}
 throw new Error('Formato no reconocido.');
}
async function m14Prepare(){
 if(m14Draft.busy||!m14Draft.files.length)return;m14Draft.busy=true;const button=el('m14-next');button.disabled=true;
 m14Draft.chapters=[];m14Draft.issues=[];let bytes=0;
 for(let i=0;i<m14Draft.files.length;i++){
  const f=m14Draft.files[i];bytes+=f.size;if(bytes>110*1024*1024){m14Draft.issues.push('Límite conjunto de 110 MB superado.');break;}
  const progress=el('m14-bottom');if(progress)progress.textContent=`Leyendo ${i+1} de ${m14Draft.files.length}: ${f.name}`;
  await new Promise(r=>setTimeout(r,10));
  try{const blocks=await m14ParseFile(f);m14Draft.chapters.push(...m14SplitAutomatic(blocks,f.name,m14Draft.sourceMode))}
  catch(err){m14Draft.issues.push(f.name+': '+(err?.message||String(err)))}
 }
 m14Draft.busy=false;
 if(!m14Draft.chapters.length){m14Draft.step=1;m14Render();const note=el('m14-content');note.insertAdjacentHTML('afterbegin',`<div class="m14-errors">${m14Draft.issues.map(e=>`<div class="m14-error">${esc(e)}</div>`).join('')}</div>`);return}
 m14Draft.bookName=m14Draft.files.length===1?m14FileLabel(m14Draft.files[0].name):'Manuscrito importado';
 m14Draft.step=2;m14Render();
}
function m14ChapterHtml(c){
 let out='',list=null;
 for(const block of c.blocks){
  const kind=block.list||null;
  if(kind!==list){if(list)out+=`</${list}>`;if(kind)out+=`<${kind}>`;list=kind;}
  out+=block.html;
 }
 if(list)out+=`</${list}>`;
 return out;
}
function m14PreviewHtml(){
 const total=m14Draft.chapters.reduce((a,c)=>a+c.blocks.reduce((b,x)=>b+wordCount(x.text),0),0);
 return `<div class="m14-preview-head"><h3 class="m14-section-title" style="margin:0">2 · Ajusta el manuscrito</h3><span class="m14-summary">${m14Draft.chapters.length} capítulos · ${total.toLocaleString('es-ES')} palabras aprox.</span></div>
 ${m14Draft.issues.length?`<div class="m14-errors">${m14Draft.issues.map(e=>`<div class="m14-error">${esc(e)}</div>`).join('')}</div>`:''}
 <div class="m14-destination"><label class="m14-field">Destino<select id="m14-dest"><option value="existing" ${m14Draft.dest==='existing'?'selected':''} ${!activeProject()?'disabled':''}>Añadir al libro actual${activeProject()?' — '+esc(activeProject().name):''}</option><option value="new" ${m14Draft.dest==='new'?'selected':''}>Crear libro nuevo</option></select></label><label class="m14-field" id="m14-book-wrap">${m14Draft.dest==='new'?'Nombre del libro nuevo':'Los capítulos se añadirán al final'}<input id="m14-book-name" value="${esc(m14Draft.bookName)}" placeholder="Título de la novela" ${m14Draft.dest==='new'?'':'disabled'}></label></div>
 <div class="m14-note" style="margin-bottom:12px">Edita títulos, cambia el orden y revisa el texto con formato. «Dividir» permite elegir el párrafo donde empieza otro capítulo; «Unir» junta dos capítulos consecutivos. No se modificará ningún libro hasta confirmar.</div>
 <div class="m14-chapters">${m14Draft.chapters.map((c,i)=>`<div class="m14-chapter" data-m14-chapter="${i}"><div class="m14-chapter-top"><span class="m14-index">${String(i+1).padStart(2,'0')}</span><input class="m14-title" data-m14-title="${i}" value="${esc(c.title)}" aria-label="Título del capítulo ${i+1}"><div class="m14-mini-actions"><button data-m14-move="up" data-idx="${i}" title="Subir capítulo" ${i===0?'disabled':''}>↑</button><button data-m14-move="down" data-idx="${i}" title="Bajar capítulo" ${i===m14Draft.chapters.length-1?'disabled':''}>↓</button><button data-m14-merge="${i}" title="Unir con el capítulo anterior" ${i===0?'disabled':''}>Unir</button><button data-m14-removechapter="${i}" title="Quitar de esta importación">✕</button></div></div><div class="m14-chapter-meta"><span>Origen: ${esc(c.source)}</span><span>${c.blocks.reduce((s,b)=>s+wordCount(b.text),0)} palabras</span><span>${c.blocks.length} bloques</span></div><details><summary>Ver texto y dividir capítulo</summary><div class="m14-rich-preview">${m14ChapterHtml(c)}</div>${c.blocks.length>1?`<details><summary>Dividir antes de un párrafo…</summary><div class="m14-split-items">${c.blocks.slice(1,350).map((b,n)=>`<button type="button" data-m14-split="${i}" data-after="${n+1}" title="Crear un nuevo capítulo desde este párrafo">Dividir aquí · ${esc((b.text||'[Imagen o espacio]').slice(0,110))}</button>`).join('')}</div></details>`:''}</details></div>`).join('')}</div>`;
}
function m14BindPreview(){
 el('m14-dest').onchange=e=>{m14Draft.dest=e.target.value;m14Render()};
 el('m14-book-name').oninput=e=>{m14Draft.bookName=e.target.value};
 document.querySelectorAll('[data-m14-title]').forEach(input=>input.oninput=e=>{m14Draft.chapters[Number(input.dataset.m14Title)].title=e.target.value});
 document.querySelectorAll('[data-m14-move]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.idx),j=btn.dataset.m14Move==='up'?i-1:i+1;[m14Draft.chapters[i],m14Draft.chapters[j]]=[m14Draft.chapters[j],m14Draft.chapters[i]];m14Render()});
 document.querySelectorAll('[data-m14-merge]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.m14Merge);if(i===0)return;m14Draft.chapters[i-1].blocks.push(...m14Draft.chapters[i].blocks);m14Draft.chapters.splice(i,1);m14Render()});
 document.querySelectorAll('[data-m14-removechapter]').forEach(btn=>btn.onclick=async ()=>{const i=Number(btn.dataset.m14Removechapter);if(!await m172Confirm('Quitar este capítulo SOLO de la importación que estás preparando?'))return;m14Draft.chapters.splice(i,1);m14Render()});
 document.querySelectorAll('[data-m14-split]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.m14Split),point=Number(btn.dataset.after),c=m14Draft.chapters[i];if(point<=0||point>=c.blocks.length)return;const after=c.blocks.splice(point),name=after[0]?.text?.slice(0,70)||c.title+' · continuación';m14Draft.chapters.splice(i+1,0,m14ChapterFromBlocks(name,after,c.source));m14Render()});
}
function m14Commit(){
 if(m14Draft.busy||!m14Draft.chapters.length)return;
 // Nothing is written until all inputs have been checked.
 if(m14Draft.dest==='new'&&!m14Draft.bookName.trim()){m172Notice('Escribe el nombre del libro.');el('m14-book-name')?.focus();return;}
 const totalChars=m14Draft.chapters.reduce((s,c)=>s+m14ChapterHtml(c).length,0);
 if(totalChars>42*1024*1024){m172Notice('El contenido con imágenes supera 42 MB. Importa menos archivos por tanda.');return;}
 let p=m14Draft.dest==='existing'?activeProject():null;
 if(!p){p={id:uid(),name:m14Draft.bookName.trim(),description:'Importado desde documentos · MARGEN 1.4',createdAt:now(),iconColor:'#738675',chapters:[],boards:[],notes:[],characters:[],settings:[],outlines:[],chronologies:[]};state.projects.push(p);}
 const imported=m14Draft.chapters.map(c=>({id:uid(),title:c.title.trim()||'Capítulo sin título',html:m14ChapterHtml(c),updatedAt:now(),mode:'prose'}));
 p.chapters.push(...imported);p.collapsedCategories=p.collapsedCategories||{};p.collapsedCategories.manuscript=false;
 state.activeProjectId=p.id;state.activeChapterId=imported[0].id;state.view='manuscript';
 m14Draft.busy=false;document.getElementById('m14-overlay')?.remove();changed();render();showToast(imported.length+' capítulos importados. Exporta una copia JSON para protegerlos.');
}


/* === MARGEN 1.4.2 · D3: lectura continua y búsqueda global del manuscrito ===
   No altera el esquema de los libros ni los datos de capítulos. */
const m142ReaderBooks=new Set();
const m142ReadScroll=new Map();
let m142SearchState={open:false,query:'',limit:80,results:[]};
let m142SearchTimer=null;
const m142OldManuscriptHtml=manuscriptHtml;
function m142ChapterText(chapter){return plain(chapter?.html||'').replace(/\s+/g,' ').trim()}
function m142SafeRead(html){
  const doc=new DOMParser().parseFromString(String(html||''),'text/html');
  for(const el of [...doc.body.querySelectorAll('*')]){
    const tag=el.tagName.toLowerCase();
    if(['script','style','iframe','object','embed','form','input','button','textarea','select','video','audio','svg','math','meta','link'].includes(tag)){el.remove();continue}
    for(const a of [...el.attributes]){
      const name=a.name.toLowerCase(),value=a.value.trim();
      if(name.startsWith('on')||['contenteditable','srcdoc','formaction'].includes(name)){el.removeAttribute(a.name);continue}
      if((name==='href'||name==='src')&&!/^(?:https?:|data:image\/(?:png|jpeg|gif|webp);base64,|blob:|#)/i.test(value))el.removeAttribute(a.name);
      if(name==='style'){
        const safe=[];
        for(const part of value.split(';')){
          const i=part.indexOf(':');if(i<0)continue;
          const key=part.slice(0,i).trim().toLowerCase(),val=part.slice(i+1).trim();
          if(['text-align','text-indent','margin-left','margin-right','color','background-color','font-weight','font-style','text-decoration'].includes(key)&&!/[<>\\()]|url\s*\(/i.test(val))safe.push(key+':'+val);
        }
        if(safe.length)el.setAttribute('style',safe.join(';'));else el.removeAttribute('style');
      }
    }
  }
  return doc.body.innerHTML;
}
function m142Modes(reading){
  return `<div class="m142-view-switch" aria-label="Vista del manuscrito"><button type="button" class="m142-tab ${reading?'':'active'}" data-action="m142-edit" title="Escribir un capítulo">${ic('edit')} Editar</button><button type="button" class="m142-tab ${reading?'active':''}" data-action="m142-read" title="Leer todos los capítulos seguidos">${ic('book')} Lectura continua</button></div><button type="button" class="btn ghost m142-search-open" data-action="m142-search" title="Buscar en todos los capítulos del libro">${ic('text')} Buscar en libro</button>`;
}
function m142ReaderHtml(p){
  const chapters=p.chapters||[];
  if(!chapters.length)return `<div class="empty-state">${ic('book')}<h2>No hay capítulos todavía</h2><p>Importa un documento o crea un capítulo para empezar.</p></div>`;
  const words=projectWords(p),count=chapters.length;
  return `<div class="m142-reader"><aside class="m142-toc"><div class="m142-toc-top"><span class="eyebrow">ÍNDICE DE LECTURA</span><div class="m142-toc-title">${esc(p.name)}</div><div class="m142-toc-meta">${count} capítulo${count===1?'':'s'} · ${words.toLocaleString('es-ES')} palabras</div></div><nav class="m142-toc-list" aria-label="Índice de capítulos">${chapters.map((c,i)=>`<button type="button" data-m142-goto="${esc(c.id)}" title="Ir a ${esc(c.title)}"><span class="m142-toc-num">${String(i+1).padStart(2,'0')}</span><span>${esc(c.title)}</span></button>`).join('')}</nav></aside>
  <div class="m142-reader-scroll" id="m142-reader-scroll"><div class="m142-reader-intro"><span>Lectura sin edición: abre un capítulo si quieres modificarlo.</span><button type="button" class="btn" data-action="m142-back-to-edit">${ic('edit')} Volver a escribir</button></div>${chapters.map((c,i)=>`<section class="m142-reader-chapter" id="m142-reader-${esc(c.id)}" data-m142-reader-chapter="${esc(c.id)}"><div class="m142-reader-heading"><div><span class="eyebrow">CAPÍTULO ${i+1} DE ${count}</span><h2>${esc(c.title)}</h2></div><button class="btn ghost" type="button" data-m142-edit-id="${esc(c.id)}" title="Abrir este capítulo en el editor">${ic('edit')} Editar</button></div><div class="m142-reader-content ${c.mode==='screenplay'?'screenplay-editor':''}">${m142SafeRead(c.html||'')||'<p style="color:var(--muted)">Este capítulo todavía está vacío.</p>'}</div></section>`).join('')}<div class="m142-endmark" aria-label="Fin del manuscrito">✦</div></div></div>`;
}
manuscriptHtml=function(p){
  const reading=m142ReaderBooks.has(p?.id);
  if(reading&&p){
    return `<div class="workspace-head"><div><span class="eyebrow">${esc(p.name)} · Manuscrito</span><h1>Lectura continua</h1></div><div class="head-actions">${m142Modes(true)}</div></div>${m142ReaderHtml(p)}`;
  }
  let html=m142OldManuscriptHtml(p);
  if(p){html=html.replace('<div class="head-actions">','<div class="head-actions">'+m142Modes(false));}
  return html;
};
function m142SwitchReading(value){
  const p=activeProject();if(!p)return;
  m11FocusMode=false;
  if(value)m142ReaderBooks.add(p.id);else m142ReaderBooks.delete(p.id);
  render();
}
function m142OpenChapter(id){
  const p=activeProject();if(!p?.chapters.some(c=>c.id===id))return;
  m142ReadScroll.set(p.id,el('m142-reader-scroll')?.scrollTop||0);
  m142ReaderBooks.delete(p.id);state.activeChapterId=id;state.view='manuscript';m11FocusMode=false;m11FindQuery='';m11FindIndex=-1;changed();render();
}
function m142BindReading(){
  const p=activeProject(),scroller=el('m142-reader-scroll');if(state.view!=='manuscript'||!scroller||!p)return;
  const previous=m142ReadScroll.get(p.id)||0;if(previous>0)scroller.scrollTop=previous;
  const links=[...document.querySelectorAll('[data-m142-goto]')];
  const updateIndex=()=>{
    const anchor=scroller.getBoundingClientRect().top+120;
    let active=p.chapters[0]?.id;
    for(const chapter of p.chapters){const elmt=document.getElementById('m142-reader-'+chapter.id);if(elmt?.getBoundingClientRect().top<anchor)active=chapter.id;}
    links.forEach(btn=>btn.classList.toggle('active',btn.dataset.m142Goto===active));
  };
  links.forEach(btn=>btn.onclick=()=>document.getElementById('m142-reader-'+btn.dataset.m142Goto)?.scrollIntoView({behavior:'smooth',block:'start'}));
  document.querySelectorAll('[data-m142-edit-id]').forEach(btn=>btn.onclick=()=>m142OpenChapter(btn.dataset.m142EditId));
  scroller.addEventListener('scroll',()=>{m142ReadScroll.set(p.id,scroller.scrollTop);updateIndex()},{passive:true});
  updateIndex();
}
function m142SearchIndex(query){
  const p=activeProject(),q=String(query||'').trim().toLocaleLowerCase('es');if(!p||!q)return [];
  const results=[],maxHits=2500;
  for(const [i,c] of (p.chapters||[]).entries()){
    if(results.length>=maxHits)break;
    const title=c.title||'Capítulo sin título';
    let at=title.toLocaleLowerCase('es').indexOf(q);
    if(at>=0)results.push({id:c.id,title,number:i+1,inTitle:true,index:0,source:title,pos:at});
    const text=m142ChapterText(c),low=text.toLocaleLowerCase('es');
    let from=0,ordinal=0;
    while(from<low.length&&results.length<maxHits){
      at=low.indexOf(q,from);if(at<0)break;
      results.push({id:c.id,title,number:i+1,inTitle:false,index:ordinal++,source:text,pos:at});
      from=at+Math.max(q.length,1);
    }
  }
  return results;
}
function m142Snippet(hit,query){
 const s=hit.source,p=hit.pos,n=query.length,left=Math.max(0,p-60),right=Math.min(s.length,p+n+82);
 const before=(left?'…':'')+s.slice(left,p),after=s.slice(p+n,right)+(right<s.length?'…':'');
 return `${esc(before)}<mark>${esc(s.slice(p,p+n))}</mark>${esc(after)}`;
}
function m142DrawSearchResults(){
 const root=el('m142-search-results'),summary=el('m142-search-summary');if(!root||!summary)return;
 const query=m142SearchState.query.trim();
 if(query.length<2){summary.textContent='Busca una palabra o expresión de al menos dos caracteres.';root.innerHTML='<div class="m142-search-empty">Busca en todos los capítulos de este libro. Los resultados indican dónde aparece cada coincidencia.</div>';return;}
 const hits=m142SearchIndex(query);m142SearchState.results=hits;
 const amount=Math.min(hits.length,m142SearchState.limit),subset=hits.slice(0,amount);
 summary.textContent=hits.length?`${hits.length}${hits.length===2500?' o más':''} coincidencia${hits.length===1?'':'s'} en ${new Set(hits.map(h=>h.id)).size} capítulo(s)`:'No hay coincidencias en este libro.';
 if(!hits.length){root.innerHTML='<div class="m142-search-empty">No hay resultados. Prueba otra palabra o expresión.</div>';return;}
 let html='',lastId=null;
 for(let j=0;j<subset.length;j++){
   const h=subset[j];
   if(h.id!==lastId){if(lastId!==null)html+='</section>';html+=`<section class="m142-search-group"><h3>${ic('book')} ${esc(h.title)}</h3>`;lastId=h.id;}
   html+=`<button type="button" class="m142-result" data-m142-hit="${j}"><span class="m142-hit-info">${h.inTitle?'Coincidencia en el título':`Capítulo ${h.number} · Texto`}</span><span class="m142-hit-excerpt">${m142Snippet(h,query)}</span></button>`;
 }
 if(lastId!==null)html+='</section>';
 if(amount<hits.length)html+=`<button class="btn m142-more" type="button" id="m142-search-more">Mostrar más resultados (${hits.length-amount} pendientes)</button>`;
 root.innerHTML=html;
 root.querySelectorAll('[data-m142-hit]').forEach(btn=>btn.onclick=()=>m142OpenHit(Number(btn.dataset.m142Hit)));
 const more=el('m142-search-more');if(more)more.onclick=()=>{const previous=root.scrollTop;m142SearchState.limit+=80;m142DrawSearchResults();root.scrollTop=previous};
}
function m142OpenHit(index){
 const h=m142SearchState.results[index],p=activeProject();if(!h||!p?.chapters.some(c=>c.id===h.id))return;
 const query=m142SearchState.query.trim();m142SearchState.open=false;m142SearchState.results=[];
 m142ReaderBooks.delete(p.id);m11FocusMode=false;state.activeChapterId=h.id;state.view='manuscript';changed();
 m11FindQuery=query;m11FindIndex=h.index;render();
 if(h.inTitle){const input=el('chapter-title');input?.focus();input?.select();}
 else{m11OpenSearch();const all=m11FindRanges();if(all.length){m11FindIndex=Math.min(h.index,all.length-1);m11FindRefresh(true)}else{showToast('Capítulo abierto; busca la expresión con Ctrl+F')}}
}
function m142ShowSearch(){
 if(state.view!=='manuscript'||!activeProject())return;
 let panel=el('m142-search-panel');if(panel)return;
 panel=document.createElement('section');panel.className='m142-search-panel';panel.id='m142-search-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Buscar en todos los capítulos');
 panel.innerHTML=`<header><div><span class="eyebrow">MANUSCRITO COMPLETO</span><h2>Buscar en el libro</h2></div><button type="button" class="iconbtn" id="m142-search-close" title="Cerrar">${ic('close')}</button></header><div class="m142-search-form"><input id="m142-search-query" type="search" placeholder="Palabra o expresión…" autocomplete="off" spellcheck="false" aria-label="Buscar en todos los capítulos"><p class="m142-search-counter" id="m142-search-summary" aria-live="polite"></p></div><div class="m142-search-results" id="m142-search-results"></div>`;
 el('workspace')?.append(panel);
 const input=el('m142-search-query');input.value=m142SearchState.query;
 input.oninput=()=>{m142SearchState.query=input.value;m142SearchState.limit=80;clearTimeout(m142SearchTimer);m142SearchTimer=setTimeout(m142DrawSearchResults,140)};
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();el('m142-search-results')?.querySelector('[data-m142-hit]')?.click()}};
 el('m142-search-close').onclick=m142CloseSearch;
 m142DrawSearchResults();input.focus();
}
function m142CloseSearch(){m142SearchState.open=false;clearTimeout(m142SearchTimer);el('m142-search-panel')?.remove()}
const m142PrevOnAction=onAction;
onAction=function(e){
 const a=e.currentTarget?.dataset?.action;
 if(a==='m142-edit'||a==='m142-back-to-edit'){m142SwitchReading(false);return}
 if(a==='m142-read'){m142SwitchReading(true);return}
 if(a==='m142-search'){m142SearchState.open=!m142SearchState.open;if(m142SearchState.open)m142ShowSearch();else m142CloseSearch();return}
 if(a==='open-entry'&&e.currentTarget.dataset.type==='manuscript'){const p=activeProject();if(p)m142ReaderBooks.delete(p.id);m142SearchState.open=false;}
 return m142PrevOnAction(e);
};
const m142PrevWire=wire;
wire=function(){
  // El enlazador heredado espera los campos editables del capítulo.
  // La vista de lectura no los incluye, así que enlazamos controles generales
  // sin activar temporalmente los manejadores del editor.
  const readOnly=state.view==='manuscript'&&m142ReaderBooks.has(activeProject()?.id);
  if(readOnly){const view=state.view;state.view='book';try{m142PrevWire()}finally{state.view=view}}
  else m142PrevWire();
  document.querySelector('.brand .m11-version')?.replaceChildren(document.createTextNode('1.4.2 · D3'));
  m142BindReading();
};
const m142PrevRender=render;
render=function(){
 if(state.view!=='manuscript')m142SearchState.open=false;
 m142PrevRender();
 if(m142SearchState.open&&state.view==='manuscript')m142ShowSearch();
};
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&m142SearchState.open){e.preventDefault();e.stopImmediatePropagation();m142CloseSearch()}
},true);

/* === MARGEN 1.4.2.1: barra compacta + redimensionable, lectura despejada === */
const m1421PrefsKey='margen-1441-panel-preferencias';
let m1421Prefs={compact:false,width:252};
try{const value=JSON.parse(localStorage.getItem(m1421PrefsKey)||'null');if(value&&typeof value==='object'){m1421Prefs.compact=!!value.compact;m1421Prefs.width=Math.max(215,Math.min(470,Number(value.width)||252));}}catch{}
let m1421Flyout=null;
function m1421Remember(){try{localStorage.setItem(m1421PrefsKey,JSON.stringify(m1421Prefs));}catch{}}
function m1421CloseFlyout(){m1421Flyout?.remove();m1421Flyout=null;}
function m1421CompactNav(view,anchor){
  const project=activeProject();if(!project)return;
  m1421CloseFlyout();
  const label=categoryLabels.find(x=>x[0]===view)?.[2]||(view==='chronologies'?'Cronologías':'Archivo y papelera');
  const kind=collections[view]||(view==='chronologies'?'chronologies':'notes');
  const entries=project[kind]||[];
  const flyout=document.createElement('section');flyout.className='m1421-flyout';flyout.setAttribute('aria-label',label);
  const head=document.createElement('div');head.className='m1421-flyout-head';
  const name=document.createElement('strong');name.textContent=label;
  const open=document.createElement('button');open.textContent='Abrir sección';open.onclick=()=>{m1421CloseFlyout();changeView(view)};
  const close=document.createElement('button');close.title='Cerrar menú';close.textContent='✕';close.onclick=m1421CloseFlyout;
  head.append(name,open,close);flyout.append(head);
  const body=document.createElement('div');body.className='m1421-flyout-body';
  if(view==='notes'){
    const go=document.createElement('button');go.className='m1421-flyout-item';go.textContent='Abrir archivo y papelera';go.onclick=()=>{m1421CloseFlyout();changeView('notes')};body.append(go);
  }else if(!entries.length){const empty=document.createElement('p');empty.className='m1421-flyout-empty';empty.textContent='Todavía no hay elementos. Entra en la sección para crear el primero.';body.append(empty)}
  else for(const item of entries){
    const btn=document.createElement('button');btn.type='button';btn.className='m1421-flyout-item';btn.textContent=item.title||'Sin título';btn.title=item.title||'Sin título';
    if((view==='manuscript'&&state.activeChapterId===item.id)||(view==='boards'&&state.activeBoardId===item.id)||(view==='characters'&&state.activeCharacterId===item.id)||(view==='settings'&&state.activeSettingId===item.id)||(view==='outlines'&&state.activeOutlineId===item.id)||(view==='chronologies'&&state.activeChronologyId===item.id))btn.classList.add('active');
    btn.onclick=()=>{
      const selected={manuscript:'activeChapterId',boards:'activeBoardId',characters:'activeCharacterId',settings:'activeSettingId',outlines:'activeOutlineId',chronologies:'activeChronologyId'}[view];
      if(selected)state[selected]=item.id;
      if(view==='manuscript'&&typeof m142ReaderBooks!=='undefined')m142ReaderBooks.delete(project.id);
      m1421CloseFlyout();changeView(view);
    };
    body.append(btn);
  }
  flyout.append(body);document.body.append(flyout);m1421Flyout=flyout;
  const bounds=anchor.getBoundingClientRect();const left=Math.min(window.innerWidth-flyout.offsetWidth-10,bounds.right+10);
  flyout.style.left=Math.max(8,left)+'px';flyout.style.top=Math.max(8,Math.min(bounds.top,window.innerHeight-flyout.offsetHeight-12))+'px';
}
function m1421SidebarRefresh(){
  const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
  sidebar.style.setProperty('--m1421-sidebar-width',m1421Prefs.width+'px');
  sidebar.classList.toggle('m1421-compact',m1421Prefs.compact);
  sidebar.querySelectorAll('.tree-section').forEach(section=>{
    const button=section.querySelector('.tree-category');if(!button)return;
    const view=section.dataset.section;
    button.classList.toggle('m1421-current',view===state.view);
    const title=categoryLabels.find(x=>x[0]===view)?.[2]||(view==='chronologies'?'Cronologías':view==='notes'?'Archivo y papelera':button.textContent.trim());
    button.title=m1421Prefs.compact?title+' · abrir elementos':title+' · desplegar o plegar';
    if(!button._m1421Bound){
      button._m1421Bound=true;
      button.addEventListener('click',e=>{
        if(!m1421Prefs.compact)return;
        e.preventDefault();e.stopImmediatePropagation();
        m1421CompactNav(view,button);
      },true);
    }
  });
  const home=sidebar.querySelector('[data-action="book-home"]');if(home)home.title='Vista general';
  sidebar.querySelectorAll('[data-action="open-project"]').forEach(b=>b.title=b.textContent.trim());
  const settings=sidebar.querySelector('.sidebar-bottom .m124-settings-btn');if(settings)settings.title='Configurar secciones del libro';
  const library=sidebar.querySelector('.sidebar-bottom [data-action="library"]');if(library)library.title='Biblioteca';
  let toggle=sidebar.querySelector('.m1421-sidebar-toggle');
  if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='m1421-sidebar-toggle';sidebar.append(toggle)}
  toggle.title=m1421Prefs.compact?'Expandir barra lateral':'Compactar barra lateral';toggle.setAttribute('aria-label',toggle.title);
  toggle.innerHTML=m1421Prefs.compact?
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><path d="m13 9 3 3-3 3"/></svg>':
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><path d="m16 9-3 3 3 3"/></svg>';
  toggle.onclick=()=>{m1421Prefs.compact=!m1421Prefs.compact;m1421Remember();m1421CloseFlyout();m1421SidebarRefresh();};
  let grip=sidebar.querySelector('.m1421-resize-handle');
  if(!grip){
    grip=document.createElement('div');grip.className='m1421-resize-handle';grip.title='Arrastrar para cambiar la anchura de la barra lateral';sidebar.append(grip);
    grip.onpointerdown=e=>{
      if(m1421Prefs.compact)return;
      e.preventDefault();grip.classList.add('dragging');sidebar.classList.add('m1421-resizing');
      grip.setPointerCapture(e.pointerId);
      const move=ev=>{if(ev.pointerId!==e.pointerId)return;m1421Prefs.width=Math.round(Math.max(215,Math.min(470,ev.clientX-sidebar.getBoundingClientRect().left)));sidebar.style.setProperty('--m1421-sidebar-width',m1421Prefs.width+'px')};
      const stop=ev=>{if(ev.pointerId!==e.pointerId)return;grip.classList.remove('dragging');sidebar.classList.remove('m1421-resizing');grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',stop);grip.removeEventListener('pointercancel',stop);m1421Remember()};
      grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);
    };
  }
}
function m1421TidyManuscript(){
  if(state.view!=='manuscript')return;
  const head=document.querySelector('.workspace-head');if(!head)return;
  head.querySelectorAll('.m124-settings-btn,.m14-import-open').forEach(node=>node.remove());
}
const m1421PrevRender=render;
render=function(){m1421CloseFlyout();m1421PrevRender();m1421SidebarRefresh();m1421TidyManuscript();};
const m1421PrevSidebarOnly=renderSidebarOnly;
renderSidebarOnly=function(){m1421CloseFlyout();m1421PrevSidebarOnly();m1421SidebarRefresh();};
const m1421PrevReader=m142ReaderHtml;
m142ReaderHtml=function(project){
  return m1421PrevReader(project).replace(/<div class="m142-reader-intro"><span>Lectura sin edición: abre un capítulo si quieres modificarlo\.<\/span><button type="button" class="btn" data-action="m142-back-to-edit">[\s\S]*?<\/button><\/div>/,'<div class="m142-reader-intro"><span>Lectura sin edición · Pulsa «Editar» en el capítulo que quieras modificar.</span></div>');
};
document.addEventListener('pointerdown',e=>{if(m1421Flyout&&!m1421Flyout.contains(e.target)&&!e.target.closest('.sidebar.m1421-compact .tree-category'))m1421CloseFlyout()},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape')m1421CloseFlyout()},true);


/* ================= MARGEN 1.4.3 · D4 =================
   Zona de escritura amplia, consultas de fichas sin salir del capítulo
   y centrado consistente de la barra de herramientas.
*/
let m143Studio=false;
let m143ReferenceOpen=false;
let m143ReferenceTab='characters';
let m143ReferenceSelected='';
let m143ReferenceQuery='';
function m143IsEditor(){return state.view==='manuscript'&&!!activeChapter()&&!m142ReaderBooks.has(activeProject()?.id)}
function m143BuildTopbar(){
  const p=activeProject(),ch=activeChapter(),root=document.querySelector('.workspace');
  if(!p||!ch||!root)return;
  let top=el('m143-studio-topbar');
  if(!top){top=document.createElement('div');top.id='m143-studio-topbar';top.className='m143-studio-topbar';root.prepend(top)}
  top.innerHTML=`<div class="m143-topline"><button class="btn m143-back" id="m143-exit" title="Regresar a la vista integrada">${ic('back')} Volver a MARGEN</button><span class="m143-brand">MARGEN</span><span class="m143-chapter-name" title="${esc(ch.title)}">${esc(p.name)} · ${esc(ch.title)}</span></div><div class="m143-top-actions"><button type="button" class="btn" id="m143-refs">${ic('users')} ${m143ReferenceOpen?'Cerrar fichas':'Consultar fichas'}</button><button type="button" class="btn ghost" id="m143-search">${ic('text')} Buscar en libro</button></div>`;
  el('m143-exit').onclick=()=>m143SwitchStudio(false);
  el('m143-refs').onclick=()=>{m143ReferenceOpen=!m143ReferenceOpen;m143ReferenceSelected='';m143RenderReferencePanel();m143BuildTopbar();document.body.classList.toggle('m143-ref-open',m143ReferenceOpen)};
  el('m143-search').onclick=()=>{m142SearchState.open=true;m142ShowSearch()};
}
function m143RenderReferenceList(){
 const p=activeProject(),list=el('m143-ref-list');if(!p||!list)return;
 const items=p[m143ReferenceTab]||[],q=m143ReferenceQuery.trim().toLocaleLowerCase('es');
 const filtered=items.filter(x=>(x.title||'').toLocaleLowerCase('es').includes(q));
 if(!filtered.length){list.innerHTML='<div class="m143-ref-empty">No hay fichas que coincidan.</div>';m143RenderReferenceDetail();return;}
 if(!filtered.some(x=>x.id===m143ReferenceSelected))m143ReferenceSelected=filtered[0].id;
 list.innerHTML=filtered.map(x=>`<button class="${x.id===m143ReferenceSelected?'active':''}" data-m143-ref="${esc(x.id)}" title="${esc(x.title)}">${esc(x.title)}</button>`).join('');
 list.querySelectorAll('[data-m143-ref]').forEach(btn=>btn.onclick=()=>{m143ReferenceSelected=btn.dataset.m143Ref;m143RenderReferenceList();m143RenderReferenceDetail()});
 m143RenderReferenceDetail();
}
function m143RenderReferenceDetail(){
 const detail=el('m143-ref-detail'),foot=el('m143-ref-foot'),p=activeProject(); if(!detail||!p)return;
 const item=(p[m143ReferenceTab]||[]).find(x=>x.id===m143ReferenceSelected);
 if(!item){detail.innerHTML='<div class="m143-ref-empty">Selecciona una ficha para consultarla mientras escribes.</div>';if(foot)foot.innerHTML='';return;}
 const isChar=m143ReferenceTab==='characters';
 const data=isChar?[['Edad','age'],['Papel en la historia','role'],['Ocupación','occupation'],['Personalidad','personality'],['Motivaciones','motivation'],['Rasgos físicos','physical'],['Conflicto','conflict'],['Trasfondo','background']]:[['Tipo de lugar','subtitle'],['Descripción','content'],['Atmósfera','atmosphere'],['Detalles sensoriales','sensory'],['Historia','history'],['Detalles importantes','details']];
 const fields=data.filter(([label,key])=>item[key]&&String(item[key]).trim()).map(([label,key])=>`<div class="m143-ref-field"><strong>${label}</strong><p>${esc(String(item[key]))}</p></div>`).join('');
 const image=item.gallery?.[0]?.src;
 detail.innerHTML=`${image?`<img class="m143-ref-avatar" alt="Referencia visual de ${esc(item.title)}" src="${esc(image)}">`:''}<h3 class="m143-ref-name">${esc(item.title)}</h3>${fields||'<div class="m143-ref-empty">Esta ficha todavía no tiene datos adicionales.</div>'}`;
 if(foot){foot.innerHTML='<small>Consulta sin edición</small><button class="btn" id="m143-open-full">Abrir ficha completa</button>';el('m143-open-full').onclick=()=>{
    const key=isChar?'activeCharacterId':'activeSettingId';state[key]=item.id;
    m143Studio=false;m143ReferenceOpen=false;m143ReferenceQuery='';state.view=isChar?'characters':'settings';changed();render();
  };
 }
}
function m143RenderReferencePanel(){
 document.querySelector('.m143-ref-panel')?.remove();
 if(!m143Studio||!m143IsEditor()||!m143ReferenceOpen){document.body.classList.remove('m143-ref-open');return;}
 const root=document.querySelector('.workspace');if(!root)return;
 const panel=document.createElement('aside');panel.id='m143-reference-panel';panel.className='m143-ref-panel';panel.setAttribute('aria-label','Consultar personajes y escenarios');
 panel.innerHTML=`<div class="m143-ref-head"><div><span class="eyebrow">CONSULTA RÁPIDA</span><h2>Tu universo</h2></div><button class="iconbtn" id="m143-close-refs" aria-label="Cerrar fichas" title="Cerrar">${ic('close')}</button></div><div class="m143-ref-tabs"><button type="button" data-m143-tab="characters" class="${m143ReferenceTab==='characters'?'active':''}">${ic('users')} Personajes</button><button type="button" data-m143-tab="settings" class="${m143ReferenceTab==='settings'?'active':''}">${ic('map')} Escenarios</button></div><input class="m143-ref-query" id="m143-ref-query" type="search" aria-label="Filtrar fichas" placeholder="Buscar por nombre…" value="${esc(m143ReferenceQuery)}"><div class="m143-ref-list" id="m143-ref-list"></div><div class="m143-ref-detail" id="m143-ref-detail"></div><footer class="m143-ref-foot" id="m143-ref-foot"></footer>`;
 root.append(panel);
 el('m143-close-refs').onclick=()=>{m143ReferenceOpen=false;m143RenderReferencePanel();m143BuildTopbar()};
 panel.querySelectorAll('[data-m143-tab]').forEach(btn=>btn.onclick=()=>{m143ReferenceTab=btn.dataset.m143Tab;m143ReferenceSelected='';m143ReferenceQuery='';m143RenderReferencePanel()});
 el('m143-ref-query').oninput=e=>{m143ReferenceQuery=e.target.value;m143RenderReferenceList()};
 m143RenderReferenceList();document.body.classList.add('m143-ref-open');
}
function m143UpdateView(){
 const active=m143Studio&&m143IsEditor();
 if(!active){document.body.classList.remove('m143-studio','m143-ref-open');document.querySelector('.m143-ref-panel')?.remove();document.querySelector('.m143-studio-topbar')?.remove();return;}
 document.body.classList.add('m143-studio');
 m143BuildTopbar();m143RenderReferencePanel();
}
function m143SwitchStudio(enabled){
 if(enabled&&!m143IsEditor())return;
 m143Studio=!!enabled;
 if(enabled){m11FocusMode=false;m11ApplyFocus();}
 if(!enabled){m143ReferenceOpen=false;m143ReferenceQuery='';}
 m143UpdateView();
 if(enabled){document.querySelector('.editor-area')?.scrollTo({top:0,behavior:'instant'});}
}
const m143PrevRender=render;
render=function(){
 m143PrevRender();
 if(state.view!=='manuscript'||!m143IsEditor()){m143Studio=false;m143ReferenceOpen=false;}
 const header=document.querySelector('.workspace-head .head-actions');
 if(m143IsEditor()&&header&&!header.querySelector('.m143-entry')){
  const button=document.createElement('button');button.type='button';button.className='btn m143-entry';button.title='Abrir la vista amplia del editor sin abandonar el libro';button.innerHTML=ic('maximize')+' Escritura amplia';
  button.onclick=()=>m143SwitchStudio(true);header.insertBefore(button,header.firstChild);
 }
 m143UpdateView();
 
};
window.addEventListener('keydown',e=>{
 if(e.key!=='Escape'||!m143Studio)return;
 if(m142SearchState.open)return;
 if(m143ReferenceOpen){e.preventDefault();m143ReferenceOpen=false;m143RenderReferencePanel();m143BuildTopbar();return;}
 if(el('m11-findbar')&&!el('m11-findbar').hidden)return;
 e.preventDefault();m143SwitchStudio(false);
});


/* ===== MARGEN 1.4.3.1: sin alterar manuscritos ni fichas ===== */
function m1431ArrangeHeader(){
  if(state.view!=='manuscript')return;
  const header=document.querySelector('.workspace-head');if(!header)return;
  const actions=header.querySelector(':scope > .head-actions'),modes=actions?.querySelector('.m142-view-switch');
  if(!actions||!modes)return;
  header.classList.add('m1431-manuscript-head');
  let center=header.querySelector('.m1431-mode-center');
  if(!center){center=document.createElement('div');center.className='m1431-mode-center';header.insertBefore(center,actions)}
  center.append(modes);
  const search=actions.querySelector('.m142-search-open');if(search)center.append(search);
  // La pestaña Escritura amplia sustituye al botón flotante de la cabecera.
  const old=actions.querySelector('.m143-entry');if(old)old.remove();
  let wide=center.querySelector('.m1431-wide-tab');
  if(!wide){
    wide=document.createElement('button');wide.type='button';
    wide.className='m142-tab m1431-wide-tab';
    wide.title='Abrir el editor en un espacio de escritura amplio';
    wide.setAttribute('data-m1431-tab','studio');
    wide.innerHTML=ic('maximize')+' Escritura amplia';
    modes.append(wide);
    wide.onclick=()=>{
      const p=activeProject();if(!p)return;
      if(m142ReaderBooks.has(p.id)){m142ReaderBooks.delete(p.id);render()}
      m143SwitchStudio(true);
      m1431SyncTabs();
    };
  }
  m1431SyncTabs();
}
function m1431SyncTabs(){
  const tabs=document.querySelectorAll('.m1431-mode-center .m142-tab');
  for(const tab of tabs){
    const wide=tab.classList.contains('m1431-wide-tab');
    const isReader=tab.dataset.action==='m142-read';
    const reading=!!activeProject()&&m142ReaderBooks.has(activeProject().id);
    const selected=wide?m143Studio:(isReader?reading:!reading&&!m143Studio);
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-pressed',selected?'true':'false');
  }
}
function m1431ArrangeToolbar(){
  const toolbar=document.querySelector('.editor-area>.editor-toolbar');if(!toolbar||toolbar.classList.contains('m1431-organized'))return;
  const settings=toolbar.querySelector(':scope > .prose-settings');
  if(!settings)return; // Las opciones de guion conservan su propia barra.
  const row1=document.createElement('div');row1.className='m1431-toolbar-row settings';
  const row2=document.createElement('div');row2.className='m1431-toolbar-row actions';
  const groups=[...settings.querySelectorAll(':scope > .format-group')];
  for(const group of groups)row2.append(group);
  row1.append(settings);
  for(const child of [...toolbar.children])row2.append(child);
  toolbar.replaceChildren(row1,row2);
  toolbar.classList.add('m1431-organized');
}
const m1431OldSwitchStudio=m143SwitchStudio;
m143SwitchStudio=function(enabled){m1431OldSwitchStudio(enabled);m1431SyncTabs()};
const m1431PreviousRender=render;
render=function(){
  m1431PreviousRender();
  m1431ArrangeHeader();m1431ArrangeToolbar();
  
};


/* MARGEN 1.4.4: adaptación visual aditiva; datos y acciones heredadas intactos. */
function m144SyncPenContext(){
 const ctx=document.getElementById('m144-pen-context');
 if(ctx)ctx.classList.toggle('visible',state.view==='boards'&&boardTool==='pen');
}
function m144SyncBackdrops(){
 const bg=activeBoard()?.background;
 document.querySelectorAll('[data-m144-bg]').forEach(btn=>{
   const selected=bg===btn.dataset.m144Bg;
   btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));
 });
}
function m144ArrangeTitle(){
 const head=document.querySelector('.workspace-head');
 const mode=document.getElementById('m121-board-mode');
 const title=head?.querySelector(':scope > div:first-child h1');
 if(!head||!mode||!title||head.querySelector('.m144-title-row'))return;
 const section=title.parentElement;
 const row=document.createElement('div');row.className='m144-title-row';
 section.insertBefore(row,title);row.append(title);
 const label=mode.closest('label');
 if(label){label.classList.add('m144-mode-label');label.firstChild?.nodeType===Node.TEXT_NODE&&(label.firstChild.textContent='Vista');row.append(label)}
 // El título ya refleja la vista en el selector; evita repetición del sufijo.
 if(activeBoard()?.diagramMode!=='free'){title.querySelector('span')?.remove()}
 const diagramBar=document.querySelector('.m122-diagram-bar');
 if(diagramBar){diagramBar.querySelector(':scope > .m122-sep')?.remove();document.querySelector('.workspace')?.classList.add('m144-diagram')}
}
function m144ArrangeFreeBoard(){
 const bar=document.querySelector('.boardbar'),board=activeBoard();
 if(!bar||!board||board.diagramMode!=='free'||bar.classList.contains('m144-done'))return;
 bar.classList.add('m144-done');document.querySelector('.workspace')?.classList.add('m144-free');
 const bgSelect=document.getElementById('board-background');
 const bgLabel=bgSelect?.closest('label');if(bgLabel){bgLabel.classList.add('m144-original-background')}
 const dots=document.createElement('div');dots.className='m144-backdrop';dots.setAttribute('aria-label','Fondo de pizarra');
 dots.innerHTML=`<span class="m144-backdrop-label">Papel</span><button type="button" class="tool-btn" data-m144-bg="dots" title="Puntos, estilo bullet journal" aria-label="Fondo de puntos">${ic('grid')}</button><button type="button" class="tool-btn" data-m144-bg="ruled" title="Papel de líneas" aria-label="Fondo de líneas">${ic('list')}</button>`;
 // Icono de puntos específico, para no confundirlo con la cuadrícula.
 const dotIcon=dots.querySelector('[data-m144-bg="dots"]');
 if(dotIcon)dotIcon.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true" fill="currentColor" stroke="none"><circle cx="4" cy="4" r="1.3"/><circle cx="10" cy="4" r="1.3"/><circle cx="16" cy="4" r="1.3"/><circle cx="4" cy="10" r="1.3"/><circle cx="10" cy="10" r="1.3"/><circle cx="16" cy="10" r="1.3"/><circle cx="4" cy="16" r="1.3"/><circle cx="10" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/></svg>';
 dots.querySelectorAll('[data-m144-bg]').forEach(btn=>btn.addEventListener('click',()=>{
  const select=document.getElementById('board-background');if(!select)return;
  if(select.value===btn.dataset.m144Bg)return;
  select.value=btn.dataset.m144Bg;select.dispatchEvent(new Event('change',{bubbles:true}));
  m144SyncBackdrops();
 }));
 // Mantener los controles reales del lápiz (no duplicarlos) para conservar su persistencia.
 const penColor=document.getElementById('pen-color')?.closest('label');
 const penSize=document.getElementById('pen-size')?.closest('label');
 const ctx=document.createElement('div');ctx.id='m144-pen-context';ctx.className='m144-context';
 if(penColor)ctx.append(penColor);if(penSize)ctx.append(penSize);
 // Agrupación y sellos permanecen disponibles pero fuera de la barra principal.
 const more=document.createElement('details');more.className='m144-more';
 const summary=document.createElement('summary');summary.innerHTML='Más '+ic('chevron');more.append(summary);
 const menu=document.createElement('div');menu.className='m144-more-menu';
 const tag=document.createElement('div');tag.className='m144-menu-label';tag.textContent='Organización y dibujo';menu.append(tag);
 for(const selector of ['#board-group','#board-ungroup','[data-action="stamp-create"]','[data-action="stamp-library"]','#board-selection-count']){
   const item=bar.querySelector(selector);if(item)menu.append(item);
 }
 more.append(menu);
 // Lápiz, fondo y menú secundario, agrupados en un extremo sin romper los atajos.
 bar.append(ctx,dots,more);
 // Eliminar separadores que quedaban huérfanos después de compactar las opciones.
 [...bar.querySelectorAll(':scope > .tool-divider')].slice(2).forEach(div=>div.remove());
 m144SyncPenContext();m144SyncBackdrops();
 // Mantener el menú abierto cuando se usan acciones de organización; cerrarlo en acciones modales.
 menu.querySelectorAll('[data-action="stamp-create"],[data-action="stamp-library"]').forEach(button=>button.addEventListener('click',()=>more.open=false));
 document.addEventListener('pointerdown',function closeMore(event){if(!more.isConnected){document.removeEventListener('pointerdown',closeMore);return}if(!more.contains(event.target))more.open=false});
}
function m144PolishBoard(){
 if(state.view!=='boards'||!activeBoard())return;
 m144ArrangeTitle();
 if(activeBoard().diagramMode==='free')m144ArrangeFreeBoard();
}
const m144PrevHistoryMove=boardHistoryMove;
boardHistoryMove=function(reverse=false){const result=m144PrevHistoryMove(reverse);m144SyncBackdrops();return result;};
const m144PrevUpdateCursor=updateBoardCursor;
updateBoardCursor=function(){m144PrevUpdateCursor();m144SyncPenContext();};
const m144PrevRender=render;
render=function(){m144PrevRender();m144PolishBoard();};

/* MARGEN 1.4.4.1 — Vinculación desde el inspector y controles visibles. */
function m1441MoveGrouping(){
 const bar=document.querySelector('.m144-free .boardbar');
 const dots=bar?.querySelector('.m144-backdrop');
 const more=bar?.querySelector('.m144-more');
 const group=bar?.querySelector('#board-group');
 const ungroup=bar?.querySelector('#board-ungroup');
 if(!bar||!dots||!more||!group||!ungroup||bar.querySelector('.m1441-arrange'))return;
 const wrap=document.createElement('div');wrap.className='m1441-arrange';wrap.setAttribute('aria-label','Agrupación de objetos');
 wrap.append(group,ungroup);
 const count=bar.querySelector('#board-selection-count');if(count)wrap.append(count);
 dots.after(wrap);
 const tag=more.querySelector('.m144-menu-label');if(tag)tag.textContent='Sellos';
 updateBoardSelectionButtons();
}
function m1441CurrentNode(){
 const g=m122Graph();
 if(m122Selection?.kind!=='node'||!g)return null;
 return g.nodes.find(n=>n.id===m122Selection.id)||null;
}
function m1441AvailableCharacter(node){const p=activeProject();return p?.characters?.find(c=>c.id===node?.characterId)||null;}
function m1441RefreshNode(node){
 const person=m1441AvailableCharacter(node);
 if(!person)return;
 node.name=person.title||node.name;
 // Los atributos narrativos propios del diagrama se conservan.
}
function m1441LinkNode(node,person){
 const graph=m122Graph(); if(!node||!graph||!person)return;
 if(graph.nodes.some(other=>other!==node&&other.characterId===person.id)){
   showToast('Ese personaje ya tiene una tarjeta en este diagrama');return;
 }
 node.characterId=person.id;
 node.name=person.title;
 if(!node.subtitle||/^(Nueva persona|Nuevo personaje|Personaje|Persona del árbol)$/i.test(node.subtitle))node.subtitle=person.role||person.subtitle||'';
 m122Remember();m122Draw();m122Inspector();showToast('Ficha vinculada: '+person.title);
}
function m1441CreateCharacter(node){
 const p=activeProject();if(!p||!node)return;
 if(node.characterId&&m1441AvailableCharacter(node)){showToast('Ya hay una ficha vinculada');return;}
 const suggestion=/^(Nueva persona|Nuevo personaje|Nodo|Nombre|Sin nombre)$/i.test(node.name?.trim()||'')?'':(node.name?.trim()||'');
 const targetProjectId=p.id, targetBoardId=activeBoard()?.id, targetMode=activeBoard()?.diagramMode, targetNodeId=node.id;
 modal({title:'Crear ficha de personaje',description:'La ficha se guardará en este libro y quedará enlazada a la persona del diagrama.',fields:[
  {id:'name',label:'Nombre del personaje',value:suggestion,placeholder:'Nombre',required:true},
  {id:'role',label:'Papel / rol (opcional)',value:node.subtitle||'',placeholder:'Protagonista, secundario…'}
 ],submit:'Crear y vincular',onSubmit:({name,role})=>{
  const project=state.projects.find(x=>x.id===targetProjectId);
  const board=project?.boards?.find(x=>x.id===targetBoardId);
  const current=board?.graphs?.[targetMode]?.nodes?.find(x=>x.id===targetNodeId);
  if(!project||!current){showToast('La tarjeta ya no está disponible');return;}
  if(current.characterId&&project.characters.some(x=>x.id===current.characterId)){
   showToast('Esta tarjeta ya tiene una ficha vinculada');return;
  }
  const person={id:uid(),title:name,subtitle:role||'',role:role||'',content:'',background:'',gallery:[],arc:[],chapterIds:[]};
  project.characters.push(person);
  m1441LinkNode(current,person);
  showToast('Ficha «'+name+'» creada y vinculada');
 }});
}
function m1441InspectorPanel(){
 const root=document.getElementById('m122-inspector'),node=m1441CurrentNode(),p=activeProject();
 if(!root||!node||!p)return;
 const linked=m1441AvailableCharacter(node);
 const panel=document.createElement('section');panel.className='m1441-character-section';
 panel.innerHTML=`<h4>${ic('users')} Ficha de personaje</h4><p class="m1441-hint">Utiliza una ficha existente o crea una nueva. La persona y sus vínculos del diagrama se conservarán.</p>
 <label for="m1441-ficha">Ficha existente</label>
 <select id="m1441-ficha" aria-label="Seleccionar ficha de personaje"><option value="">${linked?'— Desvincular —':'— Sin ficha —'}</option>${p.characters.map(ch=>`<option value="${esc(ch.id)}" ${node.characterId===ch.id?'selected':''}>${esc(ch.title)}</option>`).join('')}</select>
 ${linked?`<span class="m1441-linked">Vinculada a: ${esc(linked.title)}</span>`:''}
 <div class="m1441-buttons"><button class="btn" type="button" id="m1441-link">${ic('link')} ${linked?'Cambiar / desvincular':'Vincular ficha'}</button><button class="btn" type="button" id="m1441-new-ficha">${ic('plus')} Crear ficha</button>${linked?`<button class="btn ghost" type="button" id="m1441-open-ficha">${ic('users')} Abrir ficha</button>`:''}</div>`;
 const intro=root.querySelector('.m122-help');
 if(intro)intro.after(panel);else root.prepend(panel);
 // Evitar duplicar el acceso original: ahora está en el bloque de fichas.
 root.querySelector('[data-m122-act="open-character"]')?.remove();
 const name=root.querySelector('[data-m122-field="name"]');
 if(linked&&name){name.readOnly=true;name.classList.add('m1441-linked-name');name.title='El nombre se edita desde la ficha vinculada';}
 panel.querySelector('#m1441-link').onclick=()=>{
   const id=panel.querySelector('#m1441-ficha').value;
   if(!id){
     if(node.characterId){node.characterId='';m122Remember();m122Inspector();showToast('Ficha desvinculada; los vínculos del diagrama se conservan');}
     else showToast('Selecciona una ficha de personaje');
     return;
   }
   const person=p.characters.find(ch=>ch.id===id);if(person)m1441LinkNode(node,person);
 };
 panel.querySelector('#m1441-new-ficha').onclick=()=>m1441CreateCharacter(node);
 const open=panel.querySelector('#m1441-open-ficha');if(open)open.onclick=()=>{state.activeCharacterId=linked.id;state.view='characters';changed();render();};
}
// Un nodo vinculado conserva un único identificador; su nombre se muestra desde la ficha.
const m1441PreviousDraw=m122Draw;
m122Draw=function(){const graph=m122Graph();for(const n of graph?.nodes||[])m1441RefreshNode(n);return m1441PreviousDraw();};
const m1441PreviousInspector=m122Inspector;
m122Inspector=function(){m1441PreviousInspector();m1441InspectorPanel();};
const m1441PreviousRender=render;
render=function(){m1441PreviousRender();m1441MoveGrouping();};


/* ================= MARGEN 1.4.5 · BIENVENIDA Y PERSONALIZACIÓN ================= */
/* La traducción de interfaz no modifica manuscritos, fichas, nombres ni notas. */
const m145En={"Un nuevo libro":"A new book","Cada libro tendrá sus propios capítulos, pizarras, fichas y escaletas.":"Each book has its own chapters, boards, sheets and outlines.","Crear libro":"Create book","Copia de seguridad exportada":"Backup exported","Libro creado":"Book created","Cambios guardados":"Changes saved","Bienvenida":"Welcome","Preferencias":"Preferences","Ajustes":"Settings","Fichas de personaje":"Character sheets","Fichas de escenario":"Setting sheets","Papel de líneas":"Ruled paper","Papel de puntos":"Dotted paper","Guardar cambios":"Save changes","Configuración inicial":"Initial setup","Biblioteca":"Library","Escritorio":"Desk","Vista general":"Overview","Capítulos":"Chapters","Pizarras":"Boards","Personajes":"Characters","Escenarios":"Settings","Escaletas":"Outlines","Cronologías":"Timelines","Archivo y papelera":"Archive and trash","Diccionario":"Dictionary","Tus libros y novelas":"Your books and novels","Tus historias a mano":"Your stories at hand","Tus historias":"Your stories","Libros":"Books","Todas tus historias":"All your stories","Tu estudio literario":"Your writing studio","Tu biblioteca / Libro":"Your library / Book","Libro":"Book","Nuevo libro":"New book","Editar libro":"Edit book","Eliminar libro":"Delete book","Abrir libro":"Open book","Abrir":"Open","Crear":"Create","Guardar":"Save","Cancelar":"Cancel","Continuar":"Continue","Eliminar":"Delete","Borrar":"Delete","Duplicar":"Duplicate","Renombrar":"Rename","Mover arriba":"Move up","Mover abajo":"Move down","Añadir":"Add","Nueva ficha":"New sheet","Nuevo personaje":"New character","Nuevo escenario":"New setting","Nueva escaleta":"New outline","Nueva cronología":"New timeline","Otra pizarra":"Another board","Nueva pizarra":"New board","Nuevo capítulo":"New chapter","Manuscrito":"Manuscript","Editar":"Edit","Lectura continua":"Continuous reading","Escritura amplia":"Wide writing","Buscar en libro":"Search book","Buscar":"Search","Buscar en capítulo":"Search chapter","Concentración":"Focus","Sin distracciones":"Distraction free","Consultar fichas":"Browse sheets","Volver a MARGEN":"Back to MARGEN","Volver a escribir":"Back to writing","Exportar TXT":"Export TXT","Importar Word / TXT":"Import Word / TXT","Importar Word / TXT · capítulos":"Import Word / TXT · chapters","Formato":"Format","Escritura":"Writing","Novela / prosa":"Novel / prose","Guion":"Screenplay","Página":"Page","Fuente":"Font","Tamaño":"Size","Interlineado":"Line spacing","Márgenes":"Margins","Normal":"Normal","Normales":"Normal","Sinónimos":"Synonyms","Negrita":"Bold","Cursiva":"Italic","Subrayado":"Underline","Alineación":"Alignment","Punto de vista":"Point of view","Ficha":"Sheet","Libro · 15 × 23 cm":"Book · 15 × 23 cm","A4 · 21 × 29,7 cm":"A4 · 21 × 29.7 cm","Nueva nota":"New note","Nota":"Note","Texto":"Text","Imagen":"Image","Seleccionar":"Select","Mano":"Hand","Lápiz":"Pencil","Borrador":"Eraser","Agrupar":"Group","Desagrupar":"Ungroup","Más":"More","Sellos":"Stamps","Crear sello":"Create stamp","Mi selección":"My selection","Color":"Color","Grosor":"Thickness","Fondo":"Background","Puntos":"Dots","Líneas":"Lines","Pizarra libre":"Free board","Genealogía":"Family tree","Relaciones":"Relationships","Organizar":"Arrange","Vincular dos":"Link two","Vincular ficha":"Link sheet","Crear ficha":"Create sheet","Abrir ficha":"Open sheet","Ficha de personaje":"Character sheet","Ficha existente":"Existing sheet","Desvincular":"Unlink","Restablecer":"Reset","Color del borde":"Border color","Nombre":"Name","Descripción":"Description","Personaje":"Character","Capítulos vinculados":"Linked chapters","Personajes vinculados":"Linked characters","Escenarios relacionados":"Related settings","Acontecimientos de sus cronologías":"Timeline events","Nueva etapa":"New stage","Añadir etapa":"Add stage","Plegar todas":"Collapse all","Desplegar todas":"Expand all","Plegar actos":"Collapse acts","Desplegar actos":"Expand acts","Sin bloque":"Unassigned","Acto I":"Act I","Acto II":"Act II","Acto III":"Act III","Vista de lista":"List view","Vista de tarjetas":"Card view","Lista":"List","Tarjetas":"Cards","Objetivo":"Goal","Conflicto":"Conflict","Consecuencia":"Consequence","Estado":"Status","Idea":"Idea","Planificada":"Planned","En escritura":"Drafting","Escrita":"Written","Terminada":"Finished","Descripción del lugar":"Setting description","Atmósfera":"Atmosphere","Detalles sensoriales":"Sensory details","Historia y secretos":"History and secrets","Detalles importantes":"Important details","Galería visual":"Visual gallery","Añadir imágenes":"Add images","Añadir acontecimiento":"Add event","Fecha":"Date","Acontecimiento":"Event","Línea temporal":"Timeline","Cronología":"Timeline","Nombre de la cronología":"Timeline name","Secciones del libro":"Book sections","Configurar secciones":"Configure sections","Secciones":"Sections","Guardar secciones":"Save sections","Capítulos y escritura":"Chapters and writing","Pizarras y diagramas":"Boards and diagrams","Personajes y fichas":"Characters and sheets","Escenarios y lugares":"Settings and places","Escaletas y planificación":"Outlines and planning","Cronologías y acontecimientos":"Timelines and events","Selecciona cualquier elemento de la barra izquierda. Puedes crear tantos de cada tipo como necesites.":"Choose any element on the left sidebar. Create as many of each type as you need.","Sin guardar":"Unsaved","Guardando...":"Saving…","✓ Guardado":"✓ Saved","✓ Guardado local":"✓ Saved locally","Error al guardar":"Save error","Exportar copia de seguridad":"Export backup","Restaurar copia de seguridad":"Restore backup","Modo noche":"Dark mode","Modo día":"Light mode","Título":"Title","Título de la escena":"Scene title","¿Qué sucede?":"What happens?","Personaje...":"Character…","Describe la escena...":"Describe the scene…","Título del libro":"Book title","Sinopsis o descripción (opcional)":"Synopsis or description (optional)","Volver a la biblioteca":"Back to library","Eliminar capítulo":"Delete chapter","Eliminar ficha":"Delete sheet","Eliminar pizarra":"Delete board","Eliminar escaleta":"Delete outline","Eliminar cronología":"Delete timeline","Escribe tu historia en escenas o capítulos":"Write your story in scenes or chapters","Brainstorming, mapas y moodboards":"Brainstorming, maps and moodboards","Construye tus personajes":"Build your characters","Lugares, escenarios y atmósferas":"Places, settings and atmosphere","Estructura las escenas y el argumento":"Structure your scenes and plot","Tus ideas y referencias visuales":"Ideas and visual references","Importar":"Import","Vista previa":"Preview","Elegir archivos":"Choose files","Elegir carpeta":"Choose folder","Seleccionar archivos":"Select files","Unir con siguiente":"Merge with next","Dividir":"Split","Confirmar importación":"Confirm import","Cada archivo = un capítulo":"One file = one chapter","Orden de capítulos":"Chapter order","Fuente de importación":"Import source","Archivo DOC antiguo":"Legacy DOC file","Abrir capítulo":"Open chapter","Volver":"Back","Siguiente":"Next","Anterior":"Previous","Enlaces":"Links","Abrir personaje":"Open character","Abrir escenario":"Open setting","Editar personaje":"Edit character","Nota de personaje":"Character note","Títulos":"Titles","Modo":"Mode","Ayuda":"Help","Cerrar":"Close","Editar capítulo":"Edit chapter","Escena sin título":"Untitled scene","Acontecimiento sin título":"Untitled event","Capítulo sin título":"Untitled chapter","Sin fecha":"No date","Sin vincular":"Unlinked","Ninguno":"None","Plegar":"Collapse","Desplegar":"Expand","Cada historia con su propia portada, capítulos, pizarras, fichas y escaletas. Haz clic en una cubierta para abrir el libro.":"Each story has its own cover, chapters, boards, sheets and outlines. Click a cover to open it.","Proyecto de ejemplo · cámbialo o crea uno nuevo":"Sample project · edit it or create a new one","Portada":"Cover","Empieza una nueva historia":"Start a new story","Tu historia":"Your story","SINOPSIS":"SYNOPSIS","Vista":"View","Papel":"Background","palabras":"words","capítulos":"chapters","personajes":"characters","escenarios":"settings","escenas en escaletas":"outline scenes","1 libros en tu biblioteca":"1 book in your library","Los datos se actualizan automáticamente según escribes y creas fichas.":"Stats update automatically as you write and create sheets.","Arrastra para ordenar · clic para abrir · fijados arriba":"Drag to sort · click to open · pinned items on top","Guardado local automático":"Automatic local saving","Tu biblioteca":"Your library","Guion audiovisual":"Screenplay","Estrechos":"Narrow","Medios":"Medium","Amplios":"Wide","Muy amplios":"Extra wide","Sinopsis":"Synopsis","Al lado de":"Next to","Colores":"Colors","Azul":"Blue","Salvia":"Sage","Terracota":"Terracotta","Ámbar":"Amber","Rosa":"Rose","Lavanda":"Lavender","Escritura sencilla":"Simple writing","Estudio completo":"Full studio","Guion y planificación":"Screenplay and planning","Punto de vista de la escena":"Scene point of view","Color de icono del libro":"Book icon color","Cambiar color del libro":"Change book color","Crear escaleta":"Create outline","Crear cronología":"Create timeline","Crear personaje":"Create character","Crear escenario":"Create setting","Colores del libro":"Book colors","Configuración":"Settings","Volver a Biblioteca":"Back to Library","Sin título":"Untitled","Tu primer libro":"Your first book","Selecciona un libro":"Select a book","Tus novelas":"Your novels","Escritura libre":"Free writing","Abrir el editor":"Open editor","1 de 1":"1 of 1","Esta ficha todavía no tiene datos adicionales.":"This sheet does not have additional details yet.","Consulta sin edición":"Read-only reference","Abrir ficha completa":"Open full sheet","CONSULTA RÁPIDA":"QUICK REFERENCE","Tu universo":"Your universe","Cerrar fichas":"Close sheets","Notas, personajes, ambientaciones y documentación, independientes en cada proyecto.":"Notes, characters, settings and research stay separate for each book.","Mi biblioteca":"My library","Búsqueda en todo el libro":"Search the entire book","Acceso rápido":"Quick access","Más opciones":"More options","Más herramientas":"More tools","Organización y dibujo":"Organization and drawing","Sin descripción todavía":"No description yet","Sin capítulo asociado":"No linked chapter","Nueva etapa de evolución":"New development stage","Nueva persona":"New person","Nombre del personaje":"Character name","Papel / rol (opcional)":"Role (optional)","Crear y vincular":"Create and link","Vinculada a:":"Linked to:","Secciones del libro actualizadas":"Book sections updated","Sin resultados":"No results","No hay coincidencias":"No matches","Resultados":"Results","No hay capítulos":"No chapters","Leer":"Read","Capítulo siguiente":"Next chapter","Capítulo anterior":"Previous chapter","Crear una nueva ficha":"Create a new sheet","Elige las herramientas que quieres ver":"Choose which tools to show","Color de la nota":"Note color","Color de los bordes":"Border colors","Tamaño del papel":"Paper size","Margen":"Margin","Fuente del manuscrito":"Manuscript font","Párrafo":"Paragraph","Sin seleccionar":"None selected","Título del capítulo":"Chapter title","Capítulo":"Chapter","Cambiar color de icono":"Change icon color","Escribe aquí todo lo que necesites...":"Write anything you need here…","¿Qué sucede en esta escena?":"What happens in this scene?","Cambiar título":"Rename","Había una vez...":"Once upon a time…","Tipo de papel":"Paper background","Color del lápiz":"Pen color","Grosor del lápiz":"Pen width","Elegir color de la nota":"Choose note color","Color de fondo de la nota":"Note background color","Arrastra para mover":"Drag to move","Escribe una idea...":"Write an idea…","Arrastra para cambiar el tamaño":"Drag to resize","Pendiente de revisión":"Needs review","Color del icono":"Icon color","Color del libro":"Book color","Elegir paleta":"Choose color scheme","Tipo de elemento":"Element type","Para revisar":"Needs review","Aumentar sangría":"Increase indent","Reducir sangría":"Decrease indent","Ejemplo: canción":"Example: song","Escribe aquí de qué trata este libro...":"Write what your book is about…","Por ejemplo: canción":"For example: song","Buscar definiciones, sinónimos y antónimos sin internet":"Look up definitions, synonyms and antonyms offline","Agrupar selección (Ctrl+G)":"Group selection (Ctrl+G)","Desagrupar (Ctrl+Mayús+G)":"Ungroup (Ctrl+Shift+G)","Selecciona una zona de trazos para guardarla como sello":"Select a drawn area to save as a stamp","Ir a capítulo":"Go to chapter","Buscar en el capítulo (Ctrl+F)":"Find in chapter (Ctrl+F)","Concentración sin menús":"Focus without menus","Buscar palabra o frase en este capítulo…":"Find a word or phrase in this chapter…","Cerrar búsqueda":"Close search","Filtrar elementos del libro…":"Filter book items…","Buscar en el árbol del libro":"Search the book tree","Arrastra este elemento para cambiar su posición dentro de su sección":"Drag to reorder within this section","Duplicar capítulo":"Duplicate chapter","Versión de prueba independiente":"Standalone test version","Formato visual del papel. Los capítulos siguen siendo páginas continuas, sin paginación de imprenta.":"Visual page format only. Chapters remain continuous, without print pagination.","Nombre del escenario":"Setting name","Ciudad, edificio, habitación, paisaje...":"City, building, room, landscape…","Cómo es este lugar, dónde está, qué lo caracteriza...":"What is this place like? Where is it? What makes it unique?","Modo de la pizarra":"Board mode","Organizar los nodos automáticamente":"Arrange nodes automatically","Arrastra para colocar la persona":"Drag to position this person","Arrastra para colocar el personaje":"Drag to position this character","Color del borde de la persona":"Person card border color","Datos o evolución…":"Details or development…","¿Cómo se conocen? ¿Qué los une?":"How did they meet? What connects them?","Abrir ficha del personaje":"Open character sheet","Mostrar u ocultar capítulos, pizarras, fichas, escaletas y cronologías de este libro":"Show or hide this book’s chapters, boards, sheets, outlines and timelines","Describe los hechos esenciales de la escena...":"Describe what happens in this scene…","¿Qué intenta conseguir el personaje?":"What is the character trying to achieve?","¿Qué se interpone en su camino?":"What stands in their way?","¿Qué ha cambiado al terminar la escena?":"What has changed by the end of the scene?","Arrastra para reordenar":"Drag to reorder","Eliminar bloque sin eliminar escenas":"Delete block without deleting its scenes","Nombre de la escaleta":"Outline name","1984, Día 3, veinte años antes...":"1984, Day 3, twenty years earlier…","¿Qué ocurrió en este momento y qué consecuencias tuvo?":"What happened here, and what were the consequences?","Anterior en la línea del tiempo":"Previous timeline event","Siguiente en la línea del tiempo":"Next timeline event","Línea temporal principal":"Main timeline","Ir al último evento":"Go to last event","Importar uno o varios documentos con vista previa":"Import one or more documents with a preview","Cerrar importación":"Close import","Título de la novela":"Novel title","Subir capítulo":"Move chapter up","Bajar capítulo":"Move chapter down","Unir con el capítulo anterior":"Merge with previous chapter","Quitar de esta importación":"Remove from this import","Crear un nuevo capítulo desde este párrafo":"Create a new chapter starting at this paragraph","Vista del manuscrito":"Manuscript view","Escribir un capítulo":"Write a chapter","Leer todos los capítulos seguidos":"Read all chapters in sequence","Buscar en todos los capítulos del libro":"Search across all chapters in this book","Índice de capítulos":"Chapter index","Abrir este capítulo en el editor":"Open this chapter in the editor","Fin del manuscrito":"End of manuscript","Palabra o expresión…":"Word or phrase…","Buscar en todos los capítulos":"Search all chapters","Cerrar menú":"Close menu","Configurar secciones del libro":"Configure book sections","Arrastrar para cambiar la anchura de la barra lateral":"Drag to resize the sidebar","Abrir la vista amplia del editor sin abandonar el libro":"Open the spacious editor without leaving your book","Abrir el editor en un espacio de escritura amplio":"Open the editor in a spacious writing view","Fondo de puntos":"Dotted background","Fondo de líneas":"Ruled background","Seleccionar ficha de personaje":"Select a character sheet","Abrir Escritorio":"Open Desk","Agrupación de objetos":"Object grouping","Capítulos · desplegar o plegar":"Chapters · expand or collapse","Cronologías · desplegar o plegar":"Timelines · expand or collapse","Fichas de escenario · desplegar o plegar":"Setting sheets · expand or collapse","Fichas de personaje · desplegar o plegar":"Character sheets · expand or collapse","Escaletas · desplegar o plegar":"Outlines · expand or collapse","Pizarras · desplegar o plegar":"Boards · expand or collapse","Marcar en rojo para revisar":"Flag red for review","Mover al archivo (recuperable)":"Move to archive (recoverable)","Mover el lienzo":"Pan canvas","Opciones del elemento":"Item options","Plegar todas las categorías":"Collapse all sections","Desplegar todas las categorías":"Expand all sections","Título de la nota":"Note title","No se pudo guardar. Exporta una copia de seguridad.":"Could not save. Export a backup.","Crear capítulos":"Create chapters","Crear pizarras":"Create boards","Crear fichas de personaje":"Create character sheets","Crear fichas de escenario":"Create setting sheets","Crear escaletas":"Create outlines","Crear cronologías":"Create timelines","Enviar detrás":"Send to back","Traer delante":"Bring to front","🔒 Bloquear posición":"🔒 Lock position","🔓 Desbloquear":"🔓 Unlock","NOMBRE DE LA ESCALETA":"OUTLINE TITLE","Organiza la trama por escenas. Escribe qué ocurre, cambia su estado y utiliza las flechas para reordenarlas.":"Plan your plot scene by scene. Describe what happens, update the status and use the arrows to reorder.","La estructura de tu historia":"Your story structure","Una escaleta para cada trama, versión o línea temporal que quieras planificar.":"Create an outline for each plotline, draft or timeline you want to plan.","Cada libro contiene sus propios capítulos, pizarras, personajes, escenarios y escaletas. Abre uno para empezar.":"Every book has its own chapters, boards, characters, settings and outlines. Open one to begin.","Una historia todavía por descubrir":"A story yet to be discovered","Escribe sin distracciones":"Write without distractions","Autoguardado · sin conexión":"Autosave · offline","Una página en blanco":"A blank page","Crea tu primer capítulo y empieza a escribir.":"Create your first chapter and start writing.","Líneas espaciadas":"Wide-ruled paper","Líneas normales":"Ruled paper","Libreta con margen":"Notebook with margin","Cuadrícula":"Grid","Cuadrícula fina":"Fine grid","Mover: arrastra el fondo con la herramienta mano · Dibuja con lápiz · Suelta imágenes aquí":"Move: drag the background with the hand tool · Draw with the pencil · Drop images here","Ideas sin límites":"Ideas without limits","Crea una pizarra y úsala como moodboard, cuaderno de bocetos o mapa mental.":"Create a board for moodboards, sketches or mind maps.","Universo y documentación":"Worldbuilding and notes","Un lugar tranquilo para retomar lo que dejaste a medias. Todo el contenido sigue guardado dentro de cada libro.":"A quiet place to pick up where you left off. Each book keeps its own content.","Tu próxima historia":"Your next story","Crea un libro para empezar.":"Create a book to get started.","Próximamente: objetivos de escritura y notas rápidas entre libros.":"A space for your stories and ideas.","Las portadas aparecen en tu biblioteca como libros verticales.":"Covers appear in your library as upright books.","Crea tu primer capítulo: podrás alternar entre prosa y guion.":"Create your first chapter: you can switch between prose and screenplay.","Atajos: Ctrl+1…7 para cambiar elementos · Tab para recorrerlos · Intro crea el siguiente elemento automáticamente.":"Shortcuts: Ctrl+1…7 to switch elements · Tab to cycle through them · Enter to add the next element.","Formato orientativo de guion, no paginación industrial certificada.":"Screenplay formatting is approximate, not certified industry-standard pagination.","Momento de evolución":"Development stage","¿Cómo cambia su personalidad, su objetivo o sus relaciones?":"How do their personality, goals or relationships change?","Todavía no has añadido ninguna etapa de su evolución.":"You have not added any character development stages yet.","Guarda su aspecto, historia personal, imágenes de inspiración y cómo cambian a lo largo del libro.":"Record their appearance, backstory, inspiration images and development throughout the book.","Papel en la historia":"Role in the story","Hasta 16 imágenes por personaje. Los PNG conservan su transparencia. La primera aparecerá como imagen principal.":"Up to 16 images per character. PNG transparency is preserved. The first image becomes the main portrait.","Más imágenes":"More images","Añade momentos clave y, si quieres, relaciónalos con el capítulo donde ocurren. Puedes narrar su transformación sin poner fechas concretas.":"Add key moments and optionally link them to chapters. You can describe their transformation without specific dates.","Nombre del acontecimiento":"Event name","Capítulo relacionado":"Linked chapter","El tiempo de tu historia":"Your story timeline","Organiza hechos antes, durante o después de tu novela. No necesitas fechas exactas; también sirven «Día 1» o «Diez años antes».":"Organize events before, during or after your novel. You can use approximate dates such as “Day 1” or “Ten years earlier”.","LÍNEA DEL TIEMPO":"TIMELINE","Ordena los acontecimientos con las flechas, vincúlalos con un capítulo o personaje y utiliza fechas libres. El orden que establezcas es el que se mostrará, aunque todavía no hayas decidido cuándo ocurre cada cosa.":"Use the arrows to order events, link them to chapters or characters and enter free-form dates. Your chosen order is preserved.","Todavía no hay acontecimientos. Empieza con el primer gran momento de tu historia.":"No events yet. Add the first important moment of your story.","Selecciona una palabra en el capítulo o coloca el cursor dentro de ella.":"Select a word in the chapter or place the cursor inside it.","Pulsa una alternativa para sustituir la palabra seleccionada.":"Choose an alternative to replace the selected word.","Diccionario local limitado: las alternativas pueden no encajar con el significado o la gramática de tu frase.":"Limited offline dictionary: suggestions may not match the meaning or grammar of your sentence.","Aquí se guardan las notas antiguas y las fichas, capítulos, pizarras y demás elementos que envíes al archivo. Los elementos archivados pueden restaurarse; nada se borra hasta que elijas":"Old notes, sheets, chapters, boards and other archived items are kept here. Archived items can be restored; nothing is deleted until you choose","Nota antigua · conservada de versiones anteriores":"Old note · kept from an earlier version","El archivo está vacío":"The archive is empty","Lo que apartes de un libro aparecerá aquí, listo para recuperarse.":"Anything you archive will appear here and can be restored.","Imágenes del lugar: exteriores, interiores, mapas y referencias visuales. Hasta 16. Los PNG mantienen su transparencia.":"Setting images: exteriors, interiors, maps and references. Up to 16. PNG transparency is preserved.","Diccionario de sinónimos":"Synonym dictionary","Consulta local, sin conexión, sin IA. Lista ampliada de términos frecuentes, pero no es un diccionario exhaustivo.":"Offline, AI-free lookup. Covers many common words but is not a comprehensive dictionary.","Crea una escaleta para cada trama, versión o línea temporal.":"Create an outline for each plotline, draft or timeline.","Pulsa una escena para desplegarla. Puedes mantener abiertas únicamente las que estés trabajando.":"Click a scene to expand it. Keep only the scenes you are working on open.","Definición":"Definition","No hay definición incorporada para esta entrada.":"No definition is available for this entry.","Sin sinónimos registrados.":"No synonyms available.","Antónimos":"Antonyms","Sin antónimos registrados.":"No antonyms available.","Herramientas de escritura":"Writing tools","Consulta palabras, definiciones, sinónimos y antónimos sin conexión y sin IA. No analiza ni modifica tus textos.":"Look up words, definitions, synonyms and antonyms offline without AI. Your writing is not analyzed or modified.","BUSCAR UNA PALABRA":"LOOK UP A WORD","Este diccionario es una selección local de términos, no un diccionario académico completo. Algunas palabras solo contienen sinónimos y las definiciones son breves y orientativas.":"This is a small offline selection, not a complete academic dictionary. Some entries only have synonyms and definitions are brief.","Consulta léxica local":"Offline word lookup","Selecciona uno para estamparlo como imagen PNG transparente en la pizarra. Puedes moverlo y cambiar su tamaño.":"Choose a stamp to place as a transparent PNG on your board. You can move and resize it.","Todavía no has guardado sellos. Dibuja en la pizarra y pulsa «Crear sello».":"You have no saved stamps yet. Draw on a board and select “Create stamp”.","Ningún elemento coincide.":"No matching items.","Todavía no hay elementos de este tipo en el libro.":"There are no items of this type in this book yet.","Ficha de escenario":"Setting sheet","Los lugares de tu historia":"Places in your story","Crea un escenario y enlázalo a los capítulos y personajes de tu libro.":"Create a setting and link it to chapters and characters.","Referencias visuales, planos, exteriores e interiores. Hasta 16 imágenes por escenario. Los PNG conservan su transparencia.":"Visual references, plans, exteriors and interiors. Up to 16 images per setting. PNG transparency is preserved.","Tipo de lugar / localización":"Place type / location","Descripción general":"General description","Marca los capítulos donde aparece este lugar. «Abrir» te lleva directamente a ellos.":"Select the chapters where this place appears. “Open” takes you straight there.","Marca los personajes relacionados con el escenario. Puedes entrar en sus fichas directamente.":"Select characters associated with this setting. You can open their sheets directly.","Relaciona manualmente este personaje con los capítulos donde aparece. Abre cualquiera desde aquí.":"Link this character to the chapters they appear in. Open any chapter from here.","Novedad 1.2: menú ⋯ → Bloquear / Desbloquear, Traer delante, Enviar detrás. Flechas para mover; Mayús + flecha, 10 px.":"Tip: use ⋯ to lock/unlock, bring forward or send backward. Arrow keys move objects; Shift+arrow moves 10 px.","Vínculo":"Link","Añadir ficha":"Add sheet","Tipo de vínculo":"Link type","Esta tarjeta es independiente de las notas. Puedes editarla y relacionarla con otras.":"This card is separate from board notes. You can edit it and connect it to others.","Tipo de relación":"Relationship type","Color de la línea":"Line color","Sin flechas (mutuo)":"No arrows (mutual)","Descripción del vínculo":"Link description","1. Añade dos personas.":"1. Add two people.","2. Elige el tipo de vínculo.":"2. Choose a relationship type.","4. Haz clic en la línea para editarla.":"4. Click the line to edit it.","Ver todos los vínculos":"Show all links","Sin personaje asignado":"No linked character","Selecciona una ficha existente y pulsa «Ficha» para abrirla.":"Select an existing sheet and click “Sheet” to open it.","Archivo y papelera se mantienen visibles para que nunca pierdas el acceso a lo archivado.":"Archive and trash remain visible so you can always access archived items.","Crea primero una ficha en el libro para vincularla.":"Create a character sheet in the book before linking it.","Capítulo del manuscrito":"Manuscript chapter","Objetivo de la escena":"Scene goal","Arrastra aquí una escena o añádela con el botón inferior.":"Drag a scene here or add one using the button below.","Estructura a tu ritmo, sin fórmulas obligatorias":"Plan at your own pace, without mandatory formulas","Arrastra ⠿ (lista) o tarjetas (tablero) para ordenar":"Drag ⠿ in list view or cards in board view to reorder","Tu línea temporal":"Your timeline","Añade un acontecimiento para construir tu historia en el tiempo.":"Add an event to build your story timeline.","El orden es manual: puedes usar fechas libres y mover cada acontecimiento con Anterior / Siguiente.":"Order is manual: use flexible dates and move events with Previous / Next.","NOMBRE DE LA CRONOLOGÍA":"TIMELINE NAME","Ordena hechos y épocas en una línea visual. Las fechas pueden ser aproximadas o inventadas.":"Arrange events and eras along a visual timeline. Dates can be approximate or fictional.","Todavía no hay acontecimientos: añade el primero para empezar tu línea del tiempo.":"No events yet: add the first one to start your timeline.","MARGEN · IMPORTACIÓN DE MANUSCRITOS":"MARGEN · MANUSCRIPT IMPORT","1 · Selecciona los documentos":"1 · Choose documents","Puedes traer":"You can import","una novela completa":"a complete novel","si tienes cada capítulo en un Word diferente. MARGEN detectará los títulos y te dejará revisarlos.":"if each chapter is a separate Word document. MARGEN will detect titles and let you review them.","Detectar capítulos dentro de cada documento":"Detect chapters inside each document","Todavía no has añadido archivos. Puedes seleccionar varios DOCX o TXT a la vez.":"No files selected yet. You can select multiple DOCX or TXT files.","Sobre los .doc antiguos:":"About legacy .doc files:","Edita títulos, cambia el orden y revisa el texto con formato. «Dividir» permite elegir el párrafo donde empieza otro capítulo; «Unir» junta dos capítulos consecutivos. No se modificará ningún libro hasta confirmar.":"Edit titles, change the order and review formatted text. “Split” chooses where a new chapter begins; “Merge” joins consecutive chapters. No book is changed before confirmation.","Ver texto y dividir capítulo":"Show text and split chapter","Dividir antes de un párrafo…":"Split before a paragraph…","No hay capítulos todavía":"No chapters yet","Importa un documento o crea un capítulo para empezar.":"Import a document or create a chapter to begin.","ÍNDICE DE LECTURA":"READING INDEX","Lectura sin edición: abre un capítulo si quieres modificarlo.":"Read-only view: open a chapter to edit it.","Este capítulo todavía está vacío.":"This chapter is still empty.","Busca en todos los capítulos de este libro. Los resultados indican dónde aparece cada coincidencia.":"Search every chapter in this book. Results show where each match appears.","No hay resultados. Prueba otra palabra o expresión.":"No results. Try another word or phrase.","Buscar en el libro":"Search the book","Lectura sin edición · Pulsa «Editar» en el capítulo que quieras modificar.":"Read-only view · Click “Edit” on a chapter to change it.","No hay fichas que coincidan.":"No matching sheets.","Selecciona una ficha para consultarla mientras escribes.":"Select a sheet to view while writing.","Utiliza una ficha existente o crea una nueva. La persona y sus vínculos del diagrama se conservarán.":"Use an existing sheet or create a new one. The person and diagram links will be preserved.","Escritura amplia · Consulta rápida":"Wide writing · Quick reference","Crear y vincular personaje":"Create and link character","Vínculos existentes":"Existing links","Sin vínculos":"No links","NUEVO BLOQUE":"NEW BLOCK","Crear bloque":"Create block","Añadir bloque":"Add block","Nuevo bloque":"New block","Tres actos":"Three acts","Añadir escena":"Add scene","Nueva escena":"New scene","Escena":"Scene","Bloque":"Block","Escaleta":"Outline","Línea de tiempo":"Timeline","Papel protagonista":"Lead role","Sin capítulo":"No chapter","Sin personaje":"No character","Sin escenario":"No setting","Eliminar definitivamente":"Delete permanently","Recuperar":"Restore","Fijar arriba":"Pin to top","Desfijar":"Unpin","Destacar":"Highlight","Copiar":"Copy","Pegar":"Paste","Deshacer":"Undo","Rehacer":"Redo","Dibujar":"Draw","Sin datos":"No data","Sin nombre":"Unnamed","Detalles":"Details","Notas":"Notes","Resumen":"Summary","Organización":"Organization","Elementos del libro":"Book items","Cargando...":"Loading…","Volver al escritorio":"Back to Desk","Descripción de la escena":"Scene description","Personaje relacionado":"Related character","Escenario relacionado":"Related setting","Crear nuevo libro":"Create new book","Añadir a un libro existente":"Add to an existing book","Libro nuevo":"New book","Libro existente":"Existing book","Mantener capítulos actuales":"Keep existing chapters","Añadir capítulos":"Add chapters","Documento completo":"Complete document","Archivos independientes":"Separate files","Añadir documentos":"Add documents","Documento":"Document","Documentos":"Documents","Seleccionar carpeta":"Select folder","Procesar archivos":"Process files","Revisar capítulos":"Review chapters","Confirmar":"Confirm","Ir a":"Go to","Omitir":"Skip","Crea":"Create","Guardando":"Saving","0 personas/nodos · 0 vínculos":"0 people/nodes · 0 links","1970, día 12...":"1970, day 12…","Antes confiaba en todos; ahora...":"They used to trust everyone; now…","Añadir persona":"Add person","Añadir personaje":"Add character","Cambiar tamaño":"Resize","Ciudad, país o localidad":"City, country or town","Crea personajes y define sus relaciones: amistad, amor, rivalidad, alianza… Los enlaces quedan guardados y se mueven junto a las tarjetas.":"Create characters and define relationships such as friendship, love, rivalry or alliance. Links are saved and follow the cards.","Crea personas y establece parentescos: progenitores, hijos, parejas y hermanos. Los enlaces quedan guardados y se mueven junto a las tarjetas.":"Create people and family ties such as parents, children, partners and siblings. Links are saved and follow the cards.","Crear 3 actos":"Create 3 acts","Datos básicos":"Basic information","Descripción física":"Physical description","Desliza horizontalmente para recorrer la historia. Pulsa una tarjeta para editarla.":"Scroll horizontally through the timeline. Click a card to edit it.","Elementos para recordar":"Important features and objects","Escribe...":"Write…","Evolución por capítulos":"Character development by chapter","Familia, infancia, episodios que le marcaron, relaciones...":"Family, childhood, formative experiences, relationships…","Fondo de pizarra":"Board background","Galería de inspiración":"Inspiration gallery","Historia anterior al libro":"Backstory","Lugar de nacimiento":"Place of birth","Mapa de relaciones":"Relationship map","Mecánico, profesora, músico...":"Mechanic, teacher, musician…","Objetos, entradas, salidas, puntos de interés...":"Objects, entrances, exits, points of interest…","Ocupación / oficio":"Occupation","Paleta de colores":"Color palette","Pasado del lugar":"History of the place","Personajes que intervienen":"Characters involved","Por desarrollar":"To develop","Rasgos físicos":"Physical features","Rostro, pelo, voz, forma de andar, gestos...":"Face, hair, voice, gait, gestures…","Sensación y ambiente":"Mood and atmosphere","Selecciona una palabra y consulta sinónimos sin internet":"Select a word and look up synonyms offline","Tamaño de página del libro":"Book page size","Tipo de escritura":"Writing style","Un mensaje inesperado":"An unexpected message","Un zumbido de fluorescentes, olor a lluvia, suelo frío...":"Humming fluorescent lights, the smell of rain, cold floors…","Volver al primer evento":"Go to first event","¿Qué contradicción lleva consigo?":"What inner conflict do they have?","¿Qué lo distingue? ¿Qué lo hace enfadar o cambiar?":"What makes them unique? What upsets or changes them?","¿Qué ocurrió aquí antes de que comience la novela?":"What happened here before the novel begins?","¿Qué quiere y por qué?":"What do they want, and why?","¿Qué se siente al estar aquí? Luz, temperatura, ritmo...":"What does it feel like here? Light, temperature, pace…","Árbol genealógico":"Family tree","Relación familiar":"Family relationship","Opciones":"Options","Ninguna":"None","Muy fino":"Very thin","Fino":"Thin","Medio":"Medium","Grueso":"Thick","Muy grueso":"Very thick","Centrado":"Centered","Izquierda":"Left","Derecha":"Right","Justificado":"Justified","De":"From","A":"To","Vínculos":"Links","Personas":"People","Seleccionar persona":"Select person","Añadir relación":"Add relationship","Editar relación":"Edit relationship","Desconocido":"Unknown","Padre / madre":"Parent","Hijo / hija":"Child","Pareja":"Partner","Hermano / hermana":"Sibling","Adopción":"Adoption","Amistad":"Friendship","Amor":"Romance","Rivalidad":"Rivalry","Alianza":"Alliance","Secreto":"Secret","Mentoría":"Mentorship","Otro":"Other","Eliminar vínculo":"Delete link","Nueva relación":"New relationship","Ajustes del programa":"App settings","Nombre de la persona":"Person name","Nuevo personaje de genealogía":"New family member","Duración":"Duration","Sucesos":"Events","Más información":"More information","Actualizar":"Update","Escena sin nombre":"Untitled scene","Sin escenas":"No scenes","Actos":"Acts","Agregar acto":"Add act","Capítulo vinculado":"Linked chapter","Mostrar":"Show","Ocultar":"Hide","Búsqueda":"Search","Coincidencias":"Matches","Sin coincidencias":"No matches","Copia de seguridad":"Backup","Archivo":"Archive","Papelera":"Trash","Restaurar":"Restore","Elementos":"Items","Dato":"Data","Herramientas":"Tools","Seleccionados":"Selected","Usar":"Use","Después de la traición...":"After the betrayal…","Importar manuscrito":"Import manuscript","Trae tus historias a MARGEN":"Bring your stories into MARGEN","Revisa los capítulos antes de importar":"Review chapters before importing","Admite archivos de Word (.docx) y texto (.txt). Todo se procesa sin enviar documentos a internet.":"Accepts Word (.docx) and plain text (.txt) files. Everything is processed locally, without uploading your documents.","Nada se incorporará a tu biblioteca hasta confirmar esta vista previa.":"Nothing is added to your library until you confirm this preview.","Tus archivos originales no se modifican.":"Your original files are never modified.","La importación añade capítulos; no reemplaza los existentes.":"Importing adds chapters; it does not replace existing ones.","Volver a archivos":"Back to files","Preparar vista previa":"Prepare preview","Añadir archivos":"Add files","Añadir al libro actual":"Add to current book","Destino":"Destination","Nombre del libro nuevo":"New book name","Los capítulos se añadirán al final":"Chapters will be added at the end","2 · Ajusta el manuscrito":"2 · Review your manuscript","Quitar":"Remove","Unir":"Merge","Para detectar capítulos se reconocen los títulos con estilo de Word («Título 1», «Heading 1») y encabezados como «Capítulo 1» o «Capítulo IV». Si no se detecta ninguno, el documento se importará como un único capítulo. Los capítulos se pueden dividir o unir manualmente en la vista previa.":"Chapter headings are detected using Word styles (“Heading 1”) and titles such as “Chapter 1” or “Chapter IV”. If none are found, the file becomes a single chapter. You can split or merge chapters manually in the preview.","este prototipo HTML no puede interpretar fielmente el formato binario .doc. Si incluyes alguno te indicará cómo convertirlo a .docx localmente desde Word o LibreOffice. No se importará como texto corrupto. La conversión integrada se estudiará para la aplicación de escritorio.":"this HTML prototype cannot reliably read the legacy binary .doc format. If you select one, it will explain how to convert it locally to .docx using Word or LibreOffice. It will not import corrupted text. Built-in conversion may be added to the desktop version.","muchos archivos":"multiple files","Origen:":"Source:","bloques":"blocks","palabras aprox.":"approx. words","Sin archivos":"No files","Dividir aquí ·":"Split here ·","Selecciona...":"Choose…","Parentesco / rol":"Family relationship / role","Rol en la historia":"Role in the story","Fechas (nacimiento, fallecimiento…)":"Dates (birth, death…)","Persona del árbol":"Family tree person","Conexiones":"Connections","Dirección":"Direction","No hay ninguna ficha":"No sheets yet","Buscar por nombre…":"Search by name…","Filtrar fichas":"Filter sheets","Coincidencia en el título":"Match in title","CAPÍTULO":"CHAPTER","Fecha de nacimiento":"Date of birth","Nacido en":"Born in","Ocupación":"Occupation","Edad":"Age","Sin escenarios":"No settings","Sin capítulos":"No chapters","Manuscrito exportado a TXT":"Manuscript exported as TXT","Selecciona una nota para darle color":"Select a note to change its color","Imagen demasiado grande (máximo 25 MB)":"Image is too large (maximum 25 MB)","No se pudo leer una de las imágenes":"Could not read one of the images","Portada demasiado grande (máximo 22 MB)":"Cover is too large (maximum 22 MB)","Guion exportado a TXT":"Screenplay exported as TXT","Máximo de 16 imágenes por personaje":"Maximum of 16 images per character","Utiliza imágenes de menos de 12 MB":"Use images smaller than 12 MB","No se ha podido importar una imagen":"An image could not be imported","Máximo de 16 imágenes":"Maximum of 16 images","Imagen no válida o demasiado grande":"Invalid or oversized image","No se pudo añadir la imagen":"Could not add image","Elementos agrupados. Mueve uno y se moverán todos.":"Items grouped. Moving one will move the entire group.","Primero dibuja algo con el lápiz.":"Draw something with the pencil first.","Arrastra un rectángulo sobre los trazos que quieras guardar.":"Drag a rectangle over the strokes you want to save.","Selecciona un área más grande.":"Select a larger area.","No hay trazos dentro del área seleccionada.":"No strokes inside the selected area.","Límite de 70 sellos alcanzado":"Limit of 70 stamps reached","Ordena fijados con fijados y normales con normales":"Reorder pinned items with pinned items and unpinned items with unpinned ones","Capítulo duplicado":"Chapter duplicated","Máximo: 16 imágenes por escenario":"Maximum: 16 images per setting","Vincula primero un capítulo":"Link a chapter first","Hay un objeto bloqueado en el grupo: desbloquéalo desde ⋯":"There is a locked item in this group. Unlock it from ⋯","Ese vínculo ya existe":"That link already exists","Vínculo creado":"Link created","Selecciona el segundo nodo":"Select the second node","Relación creada: ahora puedes editarla":"Relationship created. You can now edit it","Selecciona una ficha de personaje":"Select a character sheet","Ya tienes bloques. Puedes añadir otros con Nuevo bloque.":"You already have blocks. Use New block to add more.","Para cambiar de bloque, arrastra la escena o elige otro bloque en sus detalles.":"Drag the scene into another block, or choose a block in its details.","Bloque actualizado; se colocará al cerrar":"Block updated. It will be positioned when you close.","Capítulo abierto; busca la expresión con Ctrl+F":"Chapter opened. Find the phrase with Ctrl+F.","Ese personaje ya tiene una tarjeta en este diagrama":"This character already has a card in this diagram","Ya hay una ficha vinculada":"A sheet is already linked","La tarjeta ya no está disponible":"That card is no longer available","Esta tarjeta ya tiene una ficha vinculada":"This card already has a linked sheet","Ficha desvinculada; los vínculos del diagrama se conservan":"Sheet unlinked. Diagram connections are preserved.","¿Sustituir TODOS los proyectos actuales por esta copia de seguridad? Exporta una copia de los actuales si quieres conservarlos.":"Replace ALL current projects with this backup? Export your current projects first if you want to keep them.","¿Eliminar esta escena de la escaleta?":"Delete this outline scene?","¿Quitar la portada de este libro?":"Remove this book’s cover?","¿Eliminar este acontecimiento?":"Delete this event?","¿Eliminar esta etapa de evolución?":"Delete this development stage?","¿Quieres que este sello se pueda usar en TODOS tus libros?\nAceptar: sello global. Cancelar: solo este libro.":"Make this stamp available to ALL your books?\nOK: global stamp. Cancel: only this book.","¿Eliminar este sello de la biblioteca? Los ya estampados permanecen.":"Delete this stamp from the library? Existing placements will remain.","¿Eliminar esta persona y todos sus vínculos del diagrama?":"Delete this person and all their diagram links?","¿Eliminar este vínculo?":"Delete this link?","¿Eliminar esta escena de la escaleta? No borra el capítulo vinculado.":"Delete this outline scene? The linked chapter will not be deleted.","¿Eliminar este acontecimiento de la cronología? No se eliminarán capítulos ni personajes vinculados.":"Delete this timeline event? Linked chapters and characters will be kept.","Quitar este capítulo SOLO de la importación que estás preparando?":"Remove this chapter ONLY from the import you are preparing?","Escribe el nombre del libro.":"Enter a book name.","El contenido con imágenes supera 42 MB. Importa menos archivos por tanda.":"The content including images exceeds 42 MB. Import fewer files at a time.","Selecciona archivos .docx, .txt o .doc":"Select .docx, .txt or .doc files","Cambiar color de icono del libro":"Change book icon color","Día 1, 1983, tres meses después...":"Day 1, 1983, three months later…","Una noticia inesperada":"Unexpected news","Día 1, otoño, tres meses después...":"Day 1, autumn, three months later…","Verde salvia":"Sage green","Rojo":"Red","Naranja":"Orange","Morado":"Purple","Enlace":"Link","Libre":"Free","Temporal":"Temporary","Puntos, estilo bullet journal":"Dots · bullet journal style","Buscando...":"Searching…","Mostrar más":"Show more","Recorrer":"Navigate","Marcar":"Mark","Quitar marca":"Remove flag","Fijar":"Pin","Mover a papelera":"Move to trash","Planificación":"Planning","Diagramas":"Diagrams","Paleta":"Palette","PERSONAJE":"CHARACTER","Personalidad":"Personality","Temperamento, virtudes, defectos, miedos":"Temperament, strengths, weaknesses, fears","Deseos y motivaciones":"Desires and motivations","Conflicto interno o secreto":"Inner conflict or secret","Trasfondo":"Backstory","Nacimiento / fecha":"Birth / date","Protagonista, antagonista, secundario...":"Protagonist, antagonist, supporting character…","Imagen de inspiración":"Inspiration image","Referencia visual del personaje":"Character visual reference","Quitar esta imagen":"Remove this image","Eliminar momento":"Delete stage","Describe el evento y sus consecuencias...":"Describe the event and its consequences…","Año":"Year","Protagonista":"Protagonist","Antagonista":"Antagonist","Secundario":"Supporting character","Elenco":"Cast","Selecciona un personaje":"Select a character","Contenido":"Content","Escribe aquí":"Write here","Escribe una historia":"Write a story","Fuente de letra":"Font family","Fecha o momento":"Date or moment","Momento o fecha":"Date or moment","Etapas":"Stages","Plegar etapas":"Collapse stages","Desplegar etapas":"Expand stages","Vínculo nuevo":"New link","Origen":"Source","Etiqueta personalizada":"Custom label","Sentido":"Direction","Origen → Destino":"Source → Target","Destino → Origen":"Target → Source","Sus vínculos":"Their links","Vínculos del diagrama":"Diagram links","Eliminar persona y sus vínculos":"Delete person and their links","Volver al color original":"Reset to original color","Opcional":"Optional","Añadir escenas":"Add scenes","Etiqueta":"Label","Abrir en el editor":"Open in editor","Por revisar":"Needs review","¿Qué ocurre?":"What happens?","Tinta":"Ink","Crear capítulo":"Create chapter","Continuar importación":"Continue import","caracteres":"characters","Menú":"Menu","Ocultar barra":"Hide sidebar","Mostrar barra":"Show sidebar"};
const m145Es=Object.fromEntries(Object.entries(m145En).map(([key,value])=>[value,key]));
const m145Colors={
 sage:{name:'Salvia',hex:'#738b77',strong:'#4e6851',soft:'#e7eee4',dark:'#a3b59a',darkStrong:'#c0d3b3',darkSoft:'#35453a'},
 blue:{name:'Azul',hex:'#7692b7',strong:'#436d9c',soft:'#e8eff7',dark:'#92aed2',darkStrong:'#b8d2ef',darkSoft:'#31465b'},
 terracotta:{name:'Terracota',hex:'#b47c71',strong:'#956055',soft:'#f5e8e2',dark:'#ce998c',darkStrong:'#e8b9ab',darkSoft:'#543c38'},
 amber:{name:'Ámbar',hex:'#b49164',strong:'#88693f',soft:'#f3ecdd',dark:'#c9aa7a',darkStrong:'#e0c59b',darkSoft:'#534732'},
 rose:{name:'Rosa',hex:'#bc89a0',strong:'#945f77',soft:'#f5e7ee',dark:'#d0a1bb',darkStrong:'#ecc0d5',darkSoft:'#543b4b'},
 lavender:{name:'Lavanda',hex:'#9887bb',strong:'#76629d',soft:'#eeeaf5',dark:'#b8a7d6',darkStrong:'#d0c4ea',darkSoft:'#463c59'}
};
const m145Default={language:'es',theme:'light',accent:'sage',workspace:'complete',onboarded:false};
let m145KnownProjects=null,m145KnownChapters=null,m145CurrentPrefs=null,m145ConfigDraft=null,m145Observer=null,m145Translating=false;
function m145Prefs(){return state?.m145||m145Default}
function m145CleanPrefs(obj){
 return {language:obj?.language==='en'?'en':'es',theme:obj?.theme==='dark'?'dark':'light',
 accent:m145Colors[obj?.accent]?obj.accent:'sage',workspace:['simple','complete','script'].includes(obj?.workspace)?obj.workspace:'complete',onboarded:!!obj?.onboarded};
}
function m145ApplyPalette(prefs){
 const chosen=m145Colors[prefs.accent]||m145Colors.sage,dark=prefs.theme==='dark';
 const root=document.documentElement;
 root.style.setProperty('--accent',dark?chosen.dark:chosen.hex);
 root.style.setProperty('--accent-strong',dark?chosen.darkStrong:chosen.strong);
 root.style.setProperty('--accent-soft',dark?chosen.darkSoft:chosen.soft);
 root.dataset.theme=dark?'dark':'light';
 root.lang=prefs.language==='en'?'en':'es';
}
function m145HiddenForWorkspace(choice){
 if(choice==='simple')return {boards:true,settings:true,outlines:true,chronologies:true};
 if(choice==='script')return {chronologies:true};
 return {};
}
function m145TextFor(key,language){
 if(language!=='en')return m145Es[key]||key;
 return m145En[key]||key;
}
function m145Dynamic(text){
 if(m145Prefs().language!=='en')return text;
 const match=text.trim();
 if(/^\d+\s+(?:palabras|capítulos|pizarras|personajes|escenas|acontecimientos)$/.test(match)){
  return text.replace(/palabras/g,'words').replace(/capítulos/g,'chapters').replace(/pizarras/g,'boards').replace(/personajes/g,'characters').replace(/escenas/g,'scenes').replace(/acontecimientos/g,'events');
 }
 if(/^Tu libro · \d+ palabras$/.test(match))return text.replace('Tu libro · ','Your book · ').replace(' palabras',' words');
 if(/^\d+ capítulos · \d+ palabras$/.test(match))return text.replace(' capítulos · ',' chapters · ').replace(' palabras',' words');
 if(/^\d+ palabras · \d+ caracteres$/.test(match))return text.replace(' palabras · ',' words · ').replace(' caracteres',' characters');
 if(/^\d+ de \d+$/.test(match))return text.replace(' de ',' of ');
 if(/^Incluye \d+ cronologías y \d+ fichas de personaje\.$/.test(match))return text.replace('Incluye ','Includes ').replace(' cronologías y ',' timelines and ').replace(' fichas de personaje.',' character sheets.');
 const importStats=match.match(/^(\d+) capítulos · (\d+) palabras aprox\.$/);
 if(importStats)return `${importStats[1]} ${Number(importStats[1])===1?'chapter':'chapters'} · ${importStats[2]} ${Number(importStats[2])===1?'word':'words'} approx.`;
 const readingStats=match.match(/^(\d+) capítulos? · ([\d.,]+) palabras$/);
 if(readingStats)return `${readingStats[1]} ${Number(readingStats[1])===1?'chapter':'chapters'} · ${readingStats[2]} words`;
 const bookName=activeProject()?.name||'';
 if(bookName&&match.startsWith(bookName+' · ')){
   const trailing=match.slice((bookName+' · ').length);
   const translated=m145En[trailing]||({'Planificación':'Planning','Diagramas':'Diagrams','Organización':'Organization'}[trailing]);
   if(translated)return text.replace(bookName+' · '+trailing,bookName+' · '+translated);
 }
 if(/^CAPÍTULO \d+ DE \d+$/.test(match))return text.replace('CAPÍTULO ','CHAPTER ').replace(' DE ',' OF ');
 if(/^Título del capítulo \d+$/.test(match))return text.replace('Título del capítulo','Chapter title');
 if(/^Título de la escena \d+$/.test(match))return text.replace('Título de la escena','Scene title');
 const owned=(state?.projects||[]).flatMap(p=>[p,...(p.chapters||[]),...(p.boards||[]),...(p.characters||[]),...(p.settings||[]),...(p.outlines||[])]);
 if(/^Abrir /i.test(match)&&owned.some(x=>'Abrir '+(x.title||x.name)===match))return text.replace(/^Abrir /,'Open ');
 if(/^Color de icono de /.test(match)&&owned.some(x=>'Color de icono de '+(x.title||x.name)===match))return text.replace(/^Color de icono de /,'Icon color for ');

 if(/^\d+ personas\/nodos · \d+ vínculos$/.test(match))return text.replace(' personas/nodos',' people/nodes').replace(' vínculos',' links');
 if(/^\d+ palabras aprox\.$/.test(match))return text.replace(' palabras aprox.',' approx. words');
 if(/^\d+ bloques$/.test(match))return text.replace(' bloques',' blocks');
 if(/^Importar \d+ capítulos?$/.test(match))return text.replace('Importar ','Import ').replace(' capítulos',' chapters').replace(' capítulo',' chapter');
 if(/^Añadir al libro actual(?: — .*)?$/.test(match))return text.replace(/^Añadir al libro actual/,'Add to current book');
 if(/^Origen: /.test(match))return text.replace(/^Origen: /,'Source: ');
 if(/^\d+ palabras?$/.test(match))return text.replace(/ palabras?$/,' '+(match.startsWith('1 ')?'word':'words'));
 if(/^\d+ bloques$/.test(match))return text.replace(' bloques',match.startsWith('1 ')?' block':' blocks');
 if(/^\d+ capítulos$/.test(match))return text.replace(' capítulos',match.startsWith('1 ')?' chapter':' chapters');


 if(/^\d+ (?:de|of) \d+ (?:escenas|etapas|capítulos|personajes|acontecimientos|resultados|coincidencias)$/.test(match))return text.replace(' de ',' of ').replace('escenas','scenes').replace('etapas','stages').replace('capítulos','chapters').replace('personajes','characters').replace('acontecimientos','events').replace('resultados','results').replace('coincidencias','matches');
 if(/^\d+ (?:libros?|books?) en tu biblioteca$/.test(match))return text.replace(/^1 libro(?:s)? en tu biblioteca$/,'1 book in your library').replace(/^(\d+) libros? en tu biblioteca$/, '$1 books in your library');
 if(/^\d+ (?:palabras|caracteres|escenas|capítulos|personajes|escenarios|eventos|bloques|vínculos)\b/.test(match))return text.replace(/\bpalabras\b/g,'words').replace(/\bcaracteres\b/g,'characters').replace(/\bescenas\b/g,'scenes').replace(/\bcapítulos\b/g,'chapters').replace(/\bpersonajes\b/g,'characters').replace(/\bescenarios\b/g,'settings').replace(/\beventos\b/g,'events').replace(/\bbloques\b/g,'blocks').replace(/\bvínculos\b/g,'links');

 return text;
}
const m145NoTranslate='.editor-text,.editor-paper .chapter-title,.m142-reader-content,.m122-person-node,.m122-relation-node,.note-body,[contenteditable],textarea,.project-card:not(.new) h3,.tree-leaf .truncate,.m13-scene-title,.m142-toc-list .m142-toc-item,.m145-config-backdrop,.board-item .item-body,.board-item .item-note-title,.board-item .item-text,.m122-diagram,.m131-time-card strong,.m131-time-card span,.m13-card strong,.m14-rich-preview,.m146-ref-label strong';
function m145TranslateNode(target){
 if(!target||m145Translating)return;
 const language=m145Prefs().language;
 if(language!=='en')return;
 const eligible=(el)=>{
   if(el.closest(m145NoTranslate))return false;
   const opt=el.closest('option');
   if(opt){const items=(state?.projects||[]).flatMap(p=>[p,...(p.chapters||[]),...(p.characters||[]),...(p.settings||[]),...(p.outlines||[]),...(p.chronologies||[])]);
    if(items.some(x=>x.id===opt.value))return false;}
   return true;
  };
 m145Translating=true;
 try{
  const translate=(text)=>{
   const trimmed=text.trim();if(!trimmed)return text;
   const userNames=(state?.projects||[]).flatMap(p=>[p.name,...(p.chapters||[]).map(x=>x.title),...(p.boards||[]).map(x=>x.title),...(p.characters||[]).map(x=>x.title),...(p.settings||[]).map(x=>x.title),...(p.outlines||[]).map(x=>x.title),...(p.chronologies||[]).map(x=>x.title)]).filter(Boolean);
   if(userNames.includes(trimmed))return text;
   const mapped=m145En[trimmed];
   return mapped?text.replace(trimmed,mapped):m145Dynamic(text);
  };
  const root=target.nodeType===1?target:target.parentElement;
  if(!root)return;
  if(target.nodeType===3&&eligible(root)){
   const n=translate(target.nodeValue);if(n!==target.nodeValue)target.nodeValue=n;
  }
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const n=walker.currentNode;
   if(!n.parentElement||!eligible(n.parentElement)||n.parentElement.closest('script,style'))continue;
   const result=translate(n.nodeValue);if(result!==n.nodeValue)n.nodeValue=result;
  }
  if(root.nodeType===1){
   const attrs=[root,...root.querySelectorAll('[title],[placeholder],[aria-label],[data-placeholder]')];
   for(const el of attrs){if(!eligible(el)&&!el.matches('textarea,input'))continue;
    for(const attr of ['title','placeholder','aria-label','data-placeholder'])if(el.hasAttribute(attr)){
      const original=el.getAttribute(attr),translated=m145En[original];if(translated)el.setAttribute(attr,translated);
    }
   }
  }
 }finally{m145Translating=false;}
}
function m145WatchDialogs(){
 if(m145Observer)return;
 m145Observer=new MutationObserver(records=>{
  if(m145Prefs().language!=='en'||m145Translating)return;
  for(const record of records)for(const n of record.addedNodes){
   if(n.nodeType===1&&!n.closest('.m145-config-backdrop'))m145TranslateNode(n);
  }
 });
 m145Observer.observe(document.body,{childList:true,subtree:true});
}
function m145ConfigMarkup(p,duringWelcome){
 const en=p.language==='en',tr=(es,english)=>en?english:es;
 const options=[
 {id:'simple',icon:'edit',title:tr('Escritura sencilla','Simple writing'),desc:tr('Capítulos, personajes y notas. Las demás herramientas siguen disponibles.','Chapters, characters and notes. Other tools remain available.')},
 {id:'complete',icon:'grid',title:tr('Estudio completo','Full creative studio'),desc:tr('Todas las herramientas visibles para crear, organizar y escribir.','All tools visible for planning, creating and writing.')},
 {id:'script',icon:'book',title:tr('Guion y planificación','Script and planning'),desc:tr('Un punto de partida orientado a escenas, fichas y tableros.','A starting point focused on scenes, sheets and boards.')}
 ];
 return `<section class="m145-config-card" role="dialog" aria-modal="true" aria-labelledby="m145-dialog-title">
  <div class="m145-hero"><div class="m145-hero-mark">${ic('feather')}</div><div><small>${duringWelcome?tr('Tu espacio creativo','Your creative space'):tr('Preferencias del programa','Application preferences')}</small><h2 id="m145-dialog-title">${duringWelcome?tr('Bienvenido a MARGEN','Welcome to MARGEN'):tr('Personaliza MARGEN','Customize MARGEN')}</h2><p>${duringWelcome?tr('Un lugar para imaginar, organizar y escribir a tu manera.','One place to imagine, organize and write your way.'):tr('Puedes modificar estas preferencias siempre que quieras.','Change these preferences whenever you like.')}</p></div></div>
  <div class="m145-config-grid">
  <div class="m145-field"><div class="m145-field-heading">${tr('Idioma de la interfaz','Interface language')}</div><div class="m145-pills" role="group" aria-label="Language"><button type="button" class="m145-pill" data-m145-field="language" data-value="es" aria-pressed="${p.language==='es'}">Español</button><button type="button" class="m145-pill" data-m145-field="language" data-value="en" aria-pressed="${p.language==='en'}">English</button></div></div>
  <div class="m145-field"><div class="m145-field-heading">${tr('Apariencia','Appearance')}</div><div class="m145-pills" role="group" aria-label="Theme"><button type="button" class="m145-pill" data-m145-field="theme" data-value="light" aria-pressed="${p.theme==='light'}">${ic('sun')} ${tr('Claro','Light')}</button><button type="button" class="m145-pill" data-m145-field="theme" data-value="dark" aria-pressed="${p.theme==='dark'}">${ic('moon')} ${tr('Oscuro','Dark')}</button></div></div>
  <div class="m145-field" style="grid-column:1/-1"><div class="m145-field-heading">${tr('Color de MARGEN','MARGEN accent color')}</div><div class="m145-palette" role="group" aria-label="Color">
  ${Object.entries(m145Colors).map(([id,info])=>`<button type="button" class="m145-swatch" data-m145-field="accent" data-value="${id}" aria-pressed="${p.accent===id}" title="${esc(en?({'Salvia':'Sage','Azul':'Blue','Terracota':'Terracotta','Ámbar':'Amber','Rosa':'Rose','Lavanda':'Lavender'}[info.name]||info.name):info.name)}"><span style="background:${info.hex}">${p.accent===id?ic('check'):''}</span></button>`).join('')}</div></div>
  <div class="m145-field" style="grid-column:1/-1"><div class="m145-field-heading">${tr('Espacio de trabajo inicial','Default workspace for new books')}</div><div class="m145-workspaces" role="group" aria-label="Workspace">${options.map(item=>`<button type="button" class="m145-choice" data-m145-field="workspace" data-value="${item.id}" aria-pressed="${p.workspace===item.id}">${ic(item.icon)}<strong>${item.title}</strong><small>${item.desc}</small></button>`).join('')}</div></div>
  </div>
  <div class="m145-note">${tr('Esta elección solo determina qué secciones aparecen inicialmente en los libros nuevos. Puedes mostrarlas u ocultarlas por libro desde «Configurar secciones». Tus manuscritos nunca se traducen ni se eliminan.','This only controls which sections appear in new books. You can change them for each book under “Configure sections”. Your writing is never translated or deleted.')}</div>
  <div class="m145-actions">${duringWelcome?`<button type="button" class="btn ghost m145-skip" data-m145-skip>${tr('Omitir por ahora','Skip for now')}</button>`:`<span class="m145-save-note">${tr('Ajustes generales','General settings')}</span><button type="button" class="btn" data-m145-cancel>${tr('Cancelar','Cancel')}</button>`}<button type="button" class="btn primary" data-m145-save>${duringWelcome?tr('Empezar a crear','Start creating'):tr('Guardar cambios','Save changes')}</button></div>
 </section>`;
}
function m145OpenSettings(welcome=false){
 document.querySelector('.m145-config-backdrop')?.remove();
 m145ConfigDraft=m145CleanPrefs(state?.m145||m145Default);
 const overlay=document.createElement('div');overlay.className='m145-config-backdrop';
 const draw=()=>{
   overlay.innerHTML=m145ConfigMarkup(m145ConfigDraft,welcome);
   overlay.querySelectorAll('[data-m145-field]').forEach(button=>button.addEventListener('click',()=>{
     const field=button.dataset.m145Field; m145ConfigDraft[field]=button.dataset.value;
     m145ApplyPalette(m145ConfigDraft); draw();
   }));
   const close=()=>{overlay.remove();m145ConfigDraft=null;m145ApplyPalette(m145Prefs());};
   const commit=()=>{
     const newPrefs=m145CleanPrefs({...m145ConfigDraft,onboarded:true});
     state.m145=newPrefs; m145CurrentPrefs={...newPrefs};state.theme=newPrefs.theme;
     if(welcome&&newPrefs.language==='en')m1452ChooseEnglishSample();
     changed();overlay.remove();m145ConfigDraft=null;render();
     if(!welcome)showToast(newPrefs.language==='en'?'Preferences saved':'Preferencias guardadas');
   };
   overlay.querySelector('[data-m145-save]').onclick=commit;
   overlay.querySelector('[data-m145-skip]')?.addEventListener('click',()=>{
      state.m145={...m145Default,onboarded:true};m145CurrentPrefs={...state.m145};state.theme='light';changed();overlay.remove();m145ConfigDraft=null;render();
   });
   overlay.querySelector('[data-m145-cancel]')?.addEventListener('click',close);
   if(!welcome)overlay.onpointerdown=e=>{if(e.target===overlay)close()};
 };
 document.body.append(overlay);draw();m145ApplyPalette(m145ConfigDraft);
}
const m145PrevRender=render;
render=function(){
 if(state){
  if(!state.m145){state.m145=m145CleanPrefs(m145CurrentPrefs||m145Default);if(m145CurrentPrefs)state.theme=state.m145.theme;}
  state.m145=m145CleanPrefs(state.m145);
  // El tema también puede cambiarse desde la barra superior existente.
  if(state.theme!==state.m145.theme)state.m145.theme=state.theme;
  if(!m145KnownProjects){m145KnownProjects=new Set((state.projects||[]).map(x=>x.id));m145KnownChapters=new Set((state.projects||[]).flatMap(p=>(p.chapters||[]).map(c=>c.id)));}
  else for(const p of state.projects||[])if(!m145KnownProjects.has(p.id)){
    if(!p.hiddenSections && state.view==='book' && !p.chapters?.length && !p.boards?.length && !p.characters?.length && !p.settings?.length && !p.outlines?.length){
      p.hiddenSections=m145HiddenForWorkspace(state.m145.workspace);
      if(state.m145.workspace==='script')p.m145DefaultChapterMode='screenplay';
    }
    m145KnownProjects.add(p.id);
  }
  // Los nuevos capítulos vacíos de libros tipo guion empiezan en formato de guion.
  for(const p of state.projects||[])for(const ch of p.chapters||[])if(!m145KnownChapters.has(ch.id)){
    if(p.m145DefaultChapterMode==='screenplay'&&!ch.mode&&!ch.html){ch.mode='screenplay';ch.html=normalizeScript(ch.html||'');}
    m145KnownChapters.add(ch.id);
  }
  m145CurrentPrefs={...state.m145};
 }
 m145PrevRender();
 m145ApplyPalette(m145Prefs());
 const top=document.querySelector('.header-right');
 if(top&&!top.querySelector('.m145-config-btn')){
   const button=document.createElement('button');button.className='iconbtn m145-config-btn';button.type='button';
   button.title=m145Prefs().language==='en'?'Preferences':'Preferencias';
   button.setAttribute('aria-label',button.title);button.innerHTML=ic('palette');
   button.onclick=()=>m145OpenSettings(false);top.append(button);
 }
 
 m145TranslateNode(document.getElementById('app'));
 if(state.view==='dictionary'&&m145Prefs().language==='en'){
   const dictionary=document.querySelector('.dictionary-page');
   if(dictionary&&!dictionary.querySelector('.m1451-dictionary-note')){
     const note=document.createElement('p');note.className='dict-notice m1451-dictionary-note';
     note.textContent='Vocabulary entries and definitions are currently in Spanish. Switching the interface to English does not translate this reference content.';
     dictionary.prepend(note);
   }
 }

};
const m145PreviousToast=showToast;
showToast=function(message){
  if(m145Prefs().language!=='en')return m145PreviousToast(message);
  let translated=m145En[message]||m145Dynamic(message);
  if(typeof translated==='string'&&translated.startsWith('Ficha «')&&translated.includes('vinculada'))translated=translated.replace(/^Ficha «/,'Sheet «').replace('» vinculada','» linked');
  return m145PreviousToast(translated);
};
const m145PrevStart=start;
start=async function(){
 await m145PrevStart();
 m145WatchDialogs();
 if(!m145Prefs().onboarded)m145OpenSettings(true);
};


/* Confirmations and alerts are interface text, never stored prose. */
const m1451NativeConfirm=window.confirm.bind(window);
const m1451NativeAlert=window.alert.bind(window);
function m1451DialogText(message){
 const original=String(message??'');
 if(m145Prefs().language!=='en')return original;
 if(m145En[original])return m145En[original];
 const patterns=[
  [/^¿Eliminar «(.+)»\? Esta acción no se puede deshacer\.$/, (m,n)=>`Delete “${n}”? This cannot be undone.`],
  [/^¿Eliminar «(.+)» y todo su contenido\?$/, (m,n)=>`Delete “${n}” and all its content?`],
  [/^¿Eliminar «(.+)» y sus acontecimientos\?$/, (m,n)=>`Delete “${n}” and all its events?`],
  [/^¿Eliminar «(.+)»\?$/, (m,n)=>`Delete “${n}”?`],
  [/^¿Eliminar DEFINITIVAMENTE «(.+)» y todos sus capítulos, pizarras e imágenes\? Antes, exporta una copia de seguridad si deseas conservarlo\.$/, (m,n)=>`Permanently delete “${n}” and all its chapters, boards and images? Export a backup first if you want to keep them.`],
  [/^¿Mover «(.+)» al archivo\? Puedes restaurarlo después\.$/, (m,n)=>`Move “${n}” to the archive? You can restore it later.`],
  [/^¿Eliminar definitivamente «(.+)»\? Esta acción no se puede deshacer\.$/, (m,n)=>`Permanently delete “${n}”? This cannot be undone.`],
  [/^¿Quitar el bloque «(.+)»\? Sus escenas pasarán a «Sin bloque»\.$/, (m,n)=>`Remove block “${n}”? Its scenes will become unassigned.`],
 ];
 for(const [test,format] of patterns){const match=original.match(test);if(match)return format(...match);}
 return original;
}
window.confirm=(message)=>m1451NativeConfirm(m1451DialogText(message));
window.alert=(message)=>m1451NativeAlert(m1451DialogText(message));


/* Also cover the uppercase static label on setting-sheet cards. */
m145En['ESCENARIO']='SETTING';
/* MARGEN 1.4.5.2 — Example stories follow initial language, not subsequent preferences.
   Never rewrite a previously saved book or user-authored prose when changing language.
   The English example is a different original 1995 New York mystery, not a machine translation.
*/
function m1452ChooseEnglishSample(){
  const current=state?.projects?.[0];
  if(!current||state.projects.length!==1||current.m1452Starter!=='es'||
     current.name!=='Los días que quedaron'||current.chapters?.length!==1||
     current.chapters[0]?.html!==demoChapter)return false;

  const ids={chapter1:uid(),chapter2:uid(),board:uid(),note:uid(),nora:uid(),elliot:uid(),setting:uid(),outline:uid(),scene1:uid(),scene2:uid(),timeline:uid(),event:uid()};
  const chapterOne=`
<p>The rain had been falling on Manhattan for three days when <strong>Nora Whitmore</strong> found the letter beneath her apartment door.</p>
<p>There was no stamp, no return address, and no explanation for the name written across the envelope in blue ink. The building had been half-empty since September. Nobody was meant to be living in apartment 4B.</p>
<p>Inside she found a photograph of a window lit against the dark, and one sentence:</p>
<blockquote><em>Some rooms remember the people who leave them.</em></blockquote>
<p>Nora glanced across the narrow courtyard. On the fourth floor, a lamp clicked on.</p>
<p>She had watched that apartment sit dark for <strong>eleven months</strong>.</p>`;
  const chapterTwo=`
<p>On Thursday evening, the cassette player began to turn by itself.</p>
<p>Nora stood motionless in the hallway, her coat still wet, while a voice drifted from the kitchen. It was soft and indistinct, almost swallowed by the hiss of the tape.</p>
<p>She pressed <em>stop</em>. The voice stopped.</p>
<p>From the stairwell came three measured knocks. It was <strong>Elliot Price</strong>, the neighbor who had spent the summer insisting that apartment 4B was empty.</p>
<p>“Where did you get that?” he asked, staring at the cassette in her hand.</p>
<p>There was fear in his expression, but also something stranger: recognition.</p>`;
  const project={
    id:current.id,
    m1452Starter:'en',
    name:'The Last Light on Waverly Street',
    description:'Sample novel · An autumn mystery in 1995 Manhattan',
    iconColor:'#768da8',
    createdAt:current.createdAt||now(),
    chapters:[
      {id:ids.chapter1,title:'Chapter 1 · The Unclaimed Letter',html:chapterOne,updatedAt:now()},
      {id:ids.chapter2,title:'Chapter 2 · The Other Side of the Tape',html:chapterTwo,updatedAt:now()}
    ],
    boards:[{
      id:ids.board,title:'Idea Board',background:'dots',zoom:1,panX:-750,panY:-560,
      elements:[
        {id:uid(),type:'text',x:925,y:740,w:550,h:95,text:'A city of windows. One light that should be off.'},
        {id:uid(),type:'note',x:920,y:880,w:275,h:190,color:'#f8ebbf',title:'THE MYSTERY',text:'Who is leaving letters at Nora’s door—and why now?'},
        {id:uid(),type:'note',x:1240,y:835,w:295,h:207,color:'#dcebcf',title:'CHARACTERS',text:'Nora Whitmore · Elliot Price · The missing tenant'},
        {id:uid(),type:'note',x:1570,y:925,w:290,h:195,color:'#dce7eb',title:'ATMOSPHERE',text:'October rain · Fire escapes · Cassette hiss · City lights'}
      ],strokes:[],diagramMode:'free',connections:[]
    }],
    notes:[{id:ids.note,title:'Research and loose ends',content:'A quiet 1990s mystery: analogue messages, lost apartments, and the things a city keeps.'}],
    characters:[
      {id:ids.nora,title:'Nora Whitmore',subtitle:'Protagonist',role:'Protagonist',age:'29',occupation:'Archive assistant',background:'Moved to New York to begin again, but keeps collecting other people’s unfinished stories.',physical:'Dark hair, ink-stained fingers, always carries a battered notebook.',personality:'Observant, stubborn, quietly compassionate.',motivation:'Find out who sent the letter.',conflict:'She is afraid that discovering the truth will force her to confront her own past.',gallery:[],arc:[],chapterIds:[ids.chapter1,ids.chapter2]},
      {id:ids.elliot,title:'Elliot Price',subtitle:'Neighbor',role:'Supporting character',age:'34',occupation:'Bookshop owner',background:'Has lived in the building for years. Knows more about apartment 4B than he admits.',personality:'Reserved, warm when caught off guard.',motivation:'Protect a promise he made years ago.',gallery:[],arc:[],chapterIds:[ids.chapter2]}
    ],
    settings:[{id:ids.setting,title:'The Waverly Street Building',subtitle:'Greenwich Village, Manhattan',content:'A narrow brick building with aging wooden stairs, an enclosed courtyard, and a fourth-floor window that has been dark for months.',atmosphere:'Autumn light, quiet hallways, rain after midnight.',sensory:'Distant traffic, wet concrete, a radiator ticking against the wall.',history:'Apartment 4B has been empty since a tenant vanished last winter.',details:'The old mailboxes. A fire escape opposite Nora’s kitchen. A cassette recorder.',chapterIds:[ids.chapter1,ids.chapter2],characterIds:[ids.nora,ids.elliot],gallery:[]}],
    outlines:[{id:ids.outline,title:'Mystery Outline',scenes:[
      {id:ids.scene1,title:'An unexpected letter',description:'Nora receives a letter from an empty apartment.',status:'done',povCharacterId:ids.nora,chapterId:ids.chapter1,characterIds:[ids.nora],settingIds:[ids.setting]},
      {id:ids.scene2,title:'A voice on the tape',description:'Elliot recognises the mysterious cassette.',status:'planned',povCharacterId:ids.nora,chapterId:ids.chapter2,characterIds:[ids.nora,ids.elliot],settingIds:[ids.setting]}
    ]}],
    chronologies:[{id:ids.timeline,title:'The Missing Week',events:[
      {id:ids.event,title:'The letter arrives',date:'October 1995 · Wednesday',description:'Nora finds a letter addressed to the former tenant of 4B.',chapterId:ids.chapter1,characterId:ids.nora,expanded:false}
    ]}]
  };
  Object.keys(current).forEach(key=>delete current[key]);
  Object.assign(current,project);
  state.activeProjectId=current.id;
  state.activeChapterId=ids.chapter1;
  state.activeBoardId=ids.board;
  state.activeNoteId=ids.note;
  state.activeCharacterId=ids.nora;
  state.activeSettingId=ids.setting;
  state.activeOutlineId=ids.outline;
  state.activeChronologyId=ids.timeline;
  return true;
}


/* MARGEN 1.4.6 — REFERENCIAS INTELIGENTES
   La fuente de verdad son identificadores, nunca los nombres visibles.
   No escanea ni modifica el cuerpo del manuscrito ni su HTML.
   Lo heredado sin ID se conserva como texto, sin vinculaciones inventadas.
*/
const m146T=(es,en)=>m145Prefs()?.language==='en'?en:es;
const m146Kinds={character:'characters',setting:'settings',chapter:'chapters'};
function m146Exists(p,kind,id){return !!id&&!!p?.[m146Kinds[kind]]?.some(x=>x.id===id)}
function m146Name(p,kind,id){return p?.[m146Kinds[kind]]?.find(x=>x.id===id)?.title||''}
function m146RefIndex(p){
 const rows=[];
 if(!p)return rows;
 const add=(targetKind,targetId,sourceKind,sourceId,sourceName,description,context={})=>{
  if(!targetId)return;
  rows.push({targetKind,targetId,sourceKind,sourceId,sourceName,description,...context});
 };
 for(const c of p.characters||[]){
   for(const chapterId of c.chapterIds||[])add('chapter',chapterId,'character',c.id,c.title,'characterAppear');
   for(const arc of c.arc||[])if(arc.chapterId)add('chapter',arc.chapterId,'character',c.id,c.title,'characterArc',{arcId:arc.id});
 }
 for(const loc of p.settings||[]){
   for(const chapterId of loc.chapterIds||[])add('chapter',chapterId,'setting',loc.id,loc.title,'settingChapter');
   for(const characterId of loc.characterIds||[])add('character',characterId,'setting',loc.id,loc.title,'settingCharacter');
 }
 for(const outline of p.outlines||[])for(const scene of outline.scenes||[]){
   const context={outlineId:outline.id,outlineTitle:outline.title};
   if(scene.chapterId)add('chapter',scene.chapterId,'scene',scene.id,scene.title||m146T('Escena sin título','Untitled scene'),'sceneChapter',context);
   if(scene.povCharacterId)add('character',scene.povCharacterId,'scene',scene.id,scene.title||m146T('Escena sin título','Untitled scene'),'scenePov',context);
   for(const id of new Set(scene.characterIds||[]))if(id!==scene.povCharacterId)add('character',id,'scene',scene.id,scene.title||m146T('Escena sin título','Untitled scene'),'sceneCharacter',context);
   for(const id of new Set(scene.settingIds||[]))add('setting',id,'scene',scene.id,scene.title||m146T('Escena sin título','Untitled scene'),'sceneSetting',context);
 }
 for(const chronology of p.chronologies||[])for(const event of chronology.events||[]){
   const info={chronologyId:chronology.id,chronologyTitle:chronology.title};
   if(event.chapterId)add('chapter',event.chapterId,'event',event.id,event.title||m146T('Acontecimiento','Event'),'eventChapter',info);
   if(event.characterId)add('character',event.characterId,'event',event.id,event.title||m146T('Acontecimiento','Event'),'eventCharacter',info);
 }
 for(const board of p.boards||[])for(const mode of ['genealogy','relations'])for(const node of board.graphs?.[mode]?.nodes||[]){
   if(node.characterId)add('character',node.characterId,'diagram',node.id,board.title,'diagramNode',{boardId:board.id,diagramMode:mode});
 }
 return rows;
}
function m146GroupTitle(row){
 switch(row.sourceKind){
 case 'character':return m146T('Personajes','Characters');
 case 'setting':return m146T('Escenarios','Settings');
 case 'scene':return m146T('Escaletas','Outlines');
 case 'event':return m146T('Cronologías','Timelines');
 case 'diagram':return row.diagramMode==='genealogy'?m146T('Genealogía','Family tree'):m146T('Relaciones','Relationships');
 }
 return '';
}
function m146Detail(row){
 const descriptions={characterAppear:['Aparece en este capítulo','Appears in this chapter'],characterArc:['Etapa de evolución','Character arc stage'],settingChapter:['Lugar de este capítulo','Location linked to this chapter'],settingCharacter:['Personaje vinculado al lugar','Character linked to this setting'],sceneChapter:['Escena vinculada al capítulo','Scene linked to the chapter'],scenePov:['Punto de vista de la escena','Scene point of view'],sceneCharacter:['Interviene en esta escena','Appears in this scene'],sceneSetting:['Escenario de esta escena','Setting used by this scene'],eventChapter:['Acontecimiento del capítulo','Event linked to the chapter'],eventCharacter:['Personaje del acontecimiento','Character linked to this event'],diagramNode:['Tarjeta del diagrama','Diagram card']};
 const d=descriptions[row.description]||['Referencia','Reference'];
 const info=m146T(...d);
 return (row.outlineTitle?row.outlineTitle+' · ':row.chronologyTitle?row.chronologyTitle+' · ':'')+info;
}
function m146RefsHtml(p,kind,id){
 if(!id)return '';
 const rows=m146RefIndex(p).filter(r=>r.targetKind===kind&&r.targetId===id);
 const grouped=new Map();for(const row of rows){const key=row.sourceKind==='diagram'?row.sourceKind+row.diagramMode:row.sourceKind;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row)}
 const body=[...grouped].map(([key,items])=>`<div class="m146-ref-group"><h4>${esc(m146GroupTitle(items[0]))}</h4>${items.map(row=>`<button type="button" class="m146-ref-item" data-m146-ref="${esc(row.sourceKind)}" data-m146-id="${esc(row.sourceId)}" data-m146-outline="${esc(row.outlineId||'')}" data-m146-chronology="${esc(row.chronologyId||'')}" data-m146-board="${esc(row.boardId||'')}" data-m146-mode="${esc(row.diagramMode||'')}">${ic(row.sourceKind==='scene'?'list':row.sourceKind==='event'?'clock':row.sourceKind==='diagram'?'users':row.sourceKind==='setting'?'map':'book')}<span class="m146-ref-label"><strong>${esc(row.sourceName)}</strong><small>${esc(m146Detail(row))}</small></span>${ic('chevron')}</button>`).join('')}</div>`).join('');
 const empty=m146T('Aún no hay referencias desde otras herramientas. Las conexiones se crean desde las fichas, escenas, cronologías y diagramas.','No references from other tools yet. Create links in sheets, scenes, timelines and diagrams.');
 return `<details class="m146-references" data-m146-ref-panel="${esc(kind)}:${esc(id)}"><summary>${ic('link')} <span>${m146T('Referencias a esta ficha','References to this item')}</span><span class="m146-summary-count">${rows.length}</span></summary><div class="m146-references-body">${rows.length?body:`<p class="m146-help">${empty}</p>`}<p class="m146-help">${m146T('Los nombres se leen desde las fichas originales. Renombrar un personaje, escenario o capítulo actualiza sus referencias, pero nunca el texto escrito en el manuscrito.','Names come from their original records. Renaming a character, setting or chapter updates references, but never rewrites your manuscript.')}</p></div></details>`;
}
function m146Go(row){
 const p=activeProject();if(!p)return;
 const type=row.dataset.m146Ref, id=row.dataset.m146Id;
 const route={character:['characters','activeCharacterId','characters'],setting:['settings','activeSettingId','settings'],chapter:['chapters','activeChapterId','manuscript']};
 if(route[type]){
   const [collection,key,view]=route[type];if(!p[collection]?.some(x=>x.id===id))return;
   state[key]=id;state.view=view;if(view==='manuscript')m142ReaderBooks.delete(p.id);changed();render();return;
 }
 if(type==='scene'){
   const o=p.outlines?.find(x=>x.id===row.dataset.m146Outline),s=o?.scenes?.find(x=>x.id===id);if(!o||!s)return;
   state.activeOutlineId=o.id;state.view='outlines';changed();render();
   if(typeof m13OpenInspector==='function')m13OpenInspector(s.id);
   return;
 }
 if(type==='event'){
   const t=p.chronologies?.find(x=>x.id===row.dataset.m146Chronology);if(!t?.events?.some(x=>x.id===id))return;
   state.activeChronologyId=t.id;state.view='chronologies';m131TimelineSelectedChron=t.id;m131TimelineSelectedId=id;changed();render();return;
 }
 if(type==='diagram'){
   const b=p.boards?.find(x=>x.id===row.dataset.m146Board),mode=row.dataset.m146Mode;
   if(!b?.graphs?.[mode]?.nodes?.some(x=>x.id===id))return;
   state.activeBoardId=b.id;b.diagramMode=mode;state.view='boards';changed();render();m122Selection={kind:'node',id};m122Draw();m122Inspector();return;
 }
}
function m146BindButtons(root=document){
 root.querySelectorAll('[data-m146-ref]').forEach(button=>button.addEventListener('click',()=>m146Go(button)));
 root.querySelectorAll('[data-m146-ref-panel]').forEach(details=>{
  const p=activeProject(),key=details.dataset.m146RefPanel,stored=p?.m146OpenRefs||{};
  details.open=!!stored[key];
  details.addEventListener('toggle',()=>{const current=activeProject();if(!current)return;current.m146OpenRefs=current.m146OpenRefs||{};if(current.m146OpenRefs[key]!==details.open){current.m146OpenRefs[key]=details.open;changed()}});
 });
}
function m146Broken(p){const idx=m146RefIndex(p);return idx.filter(row=>!m146Exists(p,row.targetKind,row.targetId));}
function m146Archived(p,kind,id){
 const map={chapter:['manuscript','chapters','chapter'],character:['characters','character'],setting:['settings','setting']};
 return !!(p.trash||[]).find(t=>(t.item?.id===id)&&(map[kind]||[]).includes(t.type));
}
function m146CleanMissing(p){
 const exists=(kind,id)=>!id||m146Exists(p,kind,id)||m146Archived(p,kind,id);
 let fixed=0;
 const clear=(owner,key,kind)=>{if(owner[key]&&!exists(kind,owner[key])){owner[key]='';fixed++}};
 const filter=(owner,key,kind)=>{if(!Array.isArray(owner[key]))return;const before=owner[key].length;owner[key]=owner[key].filter(id=>exists(kind,id));fixed+=before-owner[key].length};
 for(const c of p.characters||[]){filter(c,'chapterIds','chapter');for(const a of c.arc||[])clear(a,'chapterId','chapter')}
 for(const s of p.settings||[]){filter(s,'chapterIds','chapter');filter(s,'characterIds','character')}
 for(const o of p.outlines||[])for(const scene of o.scenes||[]){clear(scene,'chapterId','chapter');clear(scene,'povCharacterId','character');filter(scene,'characterIds','character');filter(scene,'settingIds','setting')}
 for(const t of p.chronologies||[])for(const e of t.events||[]){clear(e,'chapterId','chapter');clear(e,'characterId','character')}
 for(const b of p.boards||[])for(const mode of ['genealogy','relations'])for(const n of b.graphs?.[mode]?.nodes||[])clear(n,'characterId','character');
 return fixed;
}
function m146BookAudit(p){
 const broken=m146Broken(p);const pending=broken.filter(x=>!m146Archived(p,x.targetKind,x.targetId));
 const archived=broken.length-pending.length;
 return `<details class="m146-references m146-book-audit"><summary>${ic('link')} ${m146T('Comprobar referencias del libro','Check book references')}<span class="m146-summary-count">${pending.length?m146T(pending.length+' por revisar',pending.length+' to review'):m146T('Sin errores','No broken links')}</span></summary><div class="m146-references-body"><p class="m146-help">${m146T('Las referencias utilizan identificadores internos. Renombrar fichas no rompe los enlaces. Esta revisión detecta enlaces a fichas o capítulos que ya no están en el libro.','References use stable internal IDs. Renaming a record does not break links. This checks for links to records no longer in the book.')}</p>${pending.length?`<div class="m146-audit-warnings">${pending.slice(0,22).map(r=>`<div>⚠ <strong>${esc(r.sourceName)}</strong> — ${esc(m146GroupTitle(r))}: ${esc(r.targetKind)} · ${esc(r.targetId)}</div>`).join('')}</div>`:`<span class="m146-chip">${ic('check')} ${m146T('Referencias activas correctas','Active references look good')}</span>`}${archived?`<p class="m146-help">${m146T(archived+' enlaces apuntan a elementos archivados; no se eliminan porque podrías restaurarlos.',archived+' links point to archived items. They are kept in case you restore them.')}</p>`:''}<div class="m146-audit-row"><p class="m146-help">${m146T('No se cambia ningún dato sin confirmación. Exporta una copia antes de limpiar.','Nothing changes without confirmation. Export a backup before cleaning.')}</p>${pending.length?`<button type="button" class="btn" data-m146-clean>${m146T('Limpiar enlaces rotos','Clean broken references')}</button>`:''}</div></div></details>`;
}
function m146AddUI(){
 const p=activeProject();if(!p)return;
 const target=state.view==='characters'?activeCharacter():state.view==='settings'?activeSetting():state.view==='manuscript'?activeChapter():null;
 const kind=state.view==='characters'?'character':state.view==='settings'?'setting':state.view==='manuscript'?'chapter':null;
 if(target&&kind){
  let container=state.view==='characters'?document.querySelector('.char-page .char-grid'):state.view==='settings'?document.querySelector('.m12-setting-layout'):document.querySelector('.editor-area');
  if(container&&!(state.view==='manuscript'&&m142ReaderBooks.has(p.id))){
    const wrap=document.createElement('div');wrap.className=kind==='chapter'?'m146-manuscript-refs':'m146-sheet-wrapper';wrap.innerHTML=m146RefsHtml(p,kind,target.id);
    if(kind==='chapter'){const nav=container.querySelector('.m11-navbox');if(nav)nav.after(wrap);else container.prepend(wrap)}
    else container.append(wrap);
    m146BindButtons(wrap);
  }
 }
 if(state.view==='book'){
  const root=document.querySelector('.main-scroll');
  if(root){const panel=document.createElement('div');panel.innerHTML=m146BookAudit(p);root.append(panel);m146BindButtons(panel);
   panel.querySelector('[data-m146-clean]')?.addEventListener('click',async ()=>{
     if(!await m172Confirm(m146T('¿Limpiar las referencias a fichas y capítulos eliminados? Exporta primero una copia JSON. Los enlaces a elementos archivados se conservarán.','Clean links to deleted records? Export a JSON backup first. Archived links will be preserved.')))return;
     const n=m146CleanMissing(p);changed();render();showToast(m146T(n+' referencias limpiadas',n+' references cleaned'));
   });
  }
 }
}
function m146NormalizeAliases(p){
 // Solo nombres auxiliares de escenas con ID existente: nunca el manuscrito ni textos libres.
 for(const o of p?.outlines||[])for(const scene of o.scenes||[]){
   const person=p.characters?.find(x=>x.id===scene.povCharacterId);
   if(person&&scene.pov!==person.title)scene.pov=person.title;
 }
}
const m146PrevRender=render;
render=function(){
 const p=activeProject();if(p)m146NormalizeAliases(p);
 m146PrevRender();
 m146AddUI();
 
};
// La edición de un título conserva el mismo ID. Al salir del campo se renuevan las etiquetas visibles.
const m146PrevWire=wire;
wire=function(){
 m146PrevWire();
 for(const fieldId of ['fiche-title','chapter-title']){
   const input=document.getElementById(fieldId);if(!input)continue;
   input.addEventListener('blur',()=>{
     if(state.view==='characters'||state.view==='settings'||state.view==='manuscript'){
       const p=activeProject();if(p)m146NormalizeAliases(p);
     }
   });
 }
};


/* ================= MARGEN 1.5 — ESTABILIDAD I =================
   No altera datos de manuscritos, pizarras o fichas. No depende de red.
   Las pruebas viven en una base propia (no sobrescriben 1.4.6).
   Se conserva el JSON versión 1 para copias anteriores.
*/
const M15_DB='margen-155-refactor-pruebas';
const M15_LOCAL='margen-155-refactor-pruebas-backup';
let m15Revision=0,m15Saving=null,m15Blocked=false,m15Recovered=false;
let m15RecoveryAvailable=false,m15LoadReason='',m15LastSaveOk=true;
function m15English(){return typeof m145Prefs==='function'&&m145Prefs().language==='en'}
function m15T(es,en){return m15English()?en:es}
function m15Hash(input){
  // FNV-1a: comprobación de errores accidentales, no firma criptográfica.
  let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16).padStart(8,'0');
}
function m15Good(x,meta){
  if(!validateBackup(x))return false;
  if(meta?.hash && m15Hash(JSON.stringify(x))!==meta.hash)return false;
  return true;
}
const m15LegacyValidate=validateBackup;
validateBackup=function(x){
 if(!m15LegacyValidate(x))return false;
 return x.projects.every(p=>{
  if(!p||!['characters','settings','outlines','chronologies'].every(k=>p[k]===undefined||Array.isArray(p[k])))return false;
  if(!p.chapters.every(c=>c&&typeof c.id==='string'&&typeof c.title==='string'&&(c.html===undefined||typeof c.html==='string')))return false;
  if(!p.boards.every(b=>b&&typeof b.id==='string'&&Array.isArray(b.elements||[])&&Array.isArray(b.strokes||[])&&(!b.connections||Array.isArray(b.connections))))return false;
  if(!p.notes.every(n=>n&&typeof n.id==='string'))return false;
  return true;
 });
};
openDb=function(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(M15_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('data'))req.result.createObjectStore('data')};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB unavailable'));
 });
};
function m15RecordSet(){
 return new Promise((resolve,reject)=>{
  const names=['workspace','workspace-meta','recovery','recovery-meta'];
  const results={};const tx=db.transaction('data','readonly');const store=tx.objectStore('data');
  for(const name of names){const req=store.get(name);req.onsuccess=()=>{results[name]=req.result}}
  tx.oncomplete=()=>resolve(results);tx.onerror=()=>reject(tx.error||new Error('Read failed'));
  tx.onabort=()=>reject(tx.error||new Error('Read aborted'));
 });
}
readDb=async function(){
 const data=await m15RecordSet();
 const main=data.workspace,rec=data.recovery;
 const mainOk=m15Good(main,data['workspace-meta']);
 const recoveryOk=m15Good(rec,data['recovery-meta']);
 m15RecoveryAvailable=recoveryOk;
 if(mainOk)return main;
 if(main!==undefined&&recoveryOk){m15Recovered=true;m15LoadReason='previous';return rec}
 if(main!==undefined){m15Blocked=true;m15LoadReason='corrupt';return null}
 if(recoveryOk){m15Recovered=true;m15LoadReason='previous';return rec}
 return null;
};
writeDb=function(snapshot){
 return new Promise((resolve,reject)=>{
  let tx;try{tx=db.transaction('data','readwrite')}catch(e){reject(e);return}
  const store=tx.objectStore('data'),req=store.get('workspace'),metaReq=store.get('workspace-meta');
  let before,meta;
  req.onsuccess=()=>{before=req.result};metaReq.onsuccess=()=>{meta=metaReq.result};
  // Los registros se escriben en una transacción: o todos o ninguno.
  let written=false;
  const stage=()=>{
   if(written||req.readyState!=='done'||metaReq.readyState!=='done')return;written=true;
   if(m15Good(before,meta)){
    store.put(before,'recovery');store.put({hash:m15Hash(JSON.stringify(before)),time:new Date().toISOString()},'recovery-meta');
   }
   store.put(snapshot,'workspace');store.put({hash:m15Hash(JSON.stringify(snapshot)),time:new Date().toISOString()},'workspace-meta');
  };
  req.addEventListener('success',stage);metaReq.addEventListener('success',stage);
  tx.oncomplete=()=>{if(m15Good(before,meta))m15RecoveryAvailable=true;resolve()};
  tx.onerror=()=>reject(tx.error||new Error('Save failed'));
  tx.onabort=()=>reject(tx.error||new Error('Save aborted'));
 });
};
function m15LocalWrite(snapshot){
 // No se fía del guardado local sin comprobarlo. Es sólo un recurso de emergencia.
 const previous=localStorage.getItem(M15_LOCAL);
 if(previous){
  try{const old=JSON.parse(previous);if(validateBackup(old))localStorage.setItem(M15_LOCAL+'-recovery',previous)}catch{}
 }
 const payload=JSON.stringify(snapshot);
 localStorage.setItem(M15_LOCAL,payload);
 if(localStorage.getItem(M15_LOCAL)!==payload)throw new Error('Local write verification failed');
 m15RecoveryAvailable=!!localStorage.getItem(M15_LOCAL+'-recovery');
}
function m15Status(which){
 const status=el('save-status');if(!status)return;
 status.dataset.saveState=which;
 const values={pending:m15T('Sin guardar','Unsaved'),saving:m15T('Guardando…','Saving…'),saved:m15T('✓ Guardado local','✓ Saved locally'),error:m15T('⚠ No guardado','⚠ Not saved'),locked:m15T('⚠ Revisar datos','⚠ Check data')};
 status.textContent=values[which]||values.pending;
}
changed=function(){
 dirty=true;m15Revision++;
 m15Status(m15Blocked?'locked':'pending');clearTimeout(saveTimer);
 if(!m15Blocked)saveTimer=setTimeout(()=>void save(),650);
};
save=async function(){
 clearTimeout(saveTimer);
 if(m15Blocked){m15Status('locked');return false}
 if(m15Saving){await m15Saving;if(!dirty)return true}
 if(!dirty)return true;
 const atRevision=m15Revision;
 let snapshot;
 try{
  snapshot=JSON.parse(JSON.stringify(state));
  if(!validateBackup(snapshot))throw new Error('Invalid workspace structure');
 }catch(err){console.error('MARGEN snapshot:',err);m15Status('error');return false}
 m15Status('saving');
 const task=(async()=>{
  try{
   if(db)await writeDb(snapshot);else m15LocalWrite(snapshot);
   return true;
  }catch(err){console.error('MARGEN save error:',err);return false}
 })();
 m15Saving=task;
 const ok=await task;
 if(m15Saving===task)m15Saving=null;
 m15LastSaveOk=ok;
 if(ok){
  document.querySelectorAll('.m15-recover').forEach(b=>{b.disabled=!m15RecoveryAvailable||m15Blocked;b.style.display=b.disabled?'none':''});
  if(m15Revision===atRevision){dirty=false;m15Status('saved')}
  else{dirty=true;m15Status('pending');clearTimeout(saveTimer);saveTimer=setTimeout(()=>void save(),300)}
 }else{
  dirty=true;m15Status('error');
  showToast(m15T('Error al guardar. Exporta una copia JSON.','Save failed. Export a JSON backup.'));
 }
 return ok;
};
const m15PreviousBackup=backup;
backup=function(){
 if(!validateBackup(state)){showToast(m15T('Los datos no son válidos para exportar','The data are not valid for export'));return}
 const filename='MARGEN-copia-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.json';
 downloadBlob(JSON.stringify(state,null,2),filename,'application/json');
 showToast(m15T('Copia JSON exportada','JSON backup exported'));
};
async function m15RecoverPrior(){
 if(!await m172Confirm(m15T('¿Restaurar el guardado anterior? Sustituirá la versión actual. Exporta primero una copia JSON si quieres conservarla.','Restore the previous save? This replaces your current version. Export a JSON backup first if you wish to keep it.')))return;
 let previous=null;
 try{
  if(db){const records=await m15RecordSet();if(m15Good(records.recovery,records['recovery-meta']))previous=records.recovery}
  else{const raw=localStorage.getItem(M15_LOCAL+'-recovery');if(raw)previous=JSON.parse(raw)}
  if(!validateBackup(previous))throw new Error('No verified previous save');
  const original=state;state=previous;ensureSelections();dirty=true;m15Revision++;
  const ok=await save();
  if(!ok){state=original;dirty=true;throw new Error('Could not store recovered data')}
  render();showToast(m15T('Versión anterior recuperada','Previous save restored'));
 }catch(err){console.error(err);m172Notice(m15T('No se pudo recuperar el guardado anterior.','Could not recover the previous save.'))}
}
const m15EarlierRender=render;
render=function(){
 m15EarlierRender();
 
 const header=document.querySelector('.header-right');
 if(header){
  const btn=document.createElement('button');btn.type='button';btn.className='btn m15-recover';
  btn.title=m15T('Recuperar la última versión guardada anterior','Recover the previous saved version');
  btn.textContent=m15T('↶ Recuperar','↶ Recover');
  btn.disabled=!m15RecoveryAvailable||m15Blocked;btn.style.display=btn.disabled?'none':'';
  btn.onclick=()=>void m15RecoverPrior();
  const status=header.querySelector('#save-status');if(status)status.after(btn);else header.prepend(btn);
 }
 m15Status(m15Blocked?'locked':dirty?'pending':m15LastSaveOk?'saved':'error');
};
const m15EarlierWire=wire;
wire=function(){
 m15EarlierWire();
 const file=el('file-backup');
 if(file)file.onchange=async event=>{
  const input=event.target,blob=input.files?.[0];if(!blob)return;
  const prior=state;
  try{
   if(blob.size>180*1024*1024)throw new Error(m15T('La copia es demasiado grande','Backup is too large'));
   const raw=await blob.text(),loaded=JSON.parse(raw);
   if(!validateBackup(loaded))throw new Error(m15T('Estructura JSON no válida','Invalid JSON structure'));
   if(!await m172Confirm(m15T('¿Sustituir los libros actuales por esta copia JSON? Exporta primero la copia actual si quieres conservarla.','Replace current books with this JSON backup? Export your current books first if you wish to keep them.')))return;
   state=loaded;ensureSelections();dirty=true;m15Revision++;
   const ok=await save();
   if(!ok)throw new Error(m15T('No se pudo guardar la copia restaurada','Could not save the restored backup'));
   render();showToast(m15T('Copia restaurada y guardada','Backup restored and saved'));
  }catch(err){state=prior;dirty=true;m15Status('error');m172Notice(m15T('No se pudo importar: ','Import failed: ')+err.message)}
  finally{input.value=''}
 };
};
const m15EarlierStart=start;
start=async function(){
 await m15EarlierStart();
 if(m15Recovered){
  window.setTimeout(()=>m172Notice(m15T('El guardado principal estaba dañado. MARGEN ha abierto la copia anterior recuperable. Exporta ahora un JSON y comprueba el contenido.','The main save was damaged. MARGEN opened the previous recoverable save. Export a JSON backup now and check its contents.')),100);
 }else if(m15Blocked){
  window.setTimeout(()=>m172Notice(m15T('Se ha detectado una base de datos dañada. El guardado automático está BLOQUEADO para no sobrescribirla. No trabajes aquí hasta recuperarla.','A damaged database was detected. Autosave is BLOCKED to protect it. Do not work here until the data is recovered.')),100);
 }
 window.addEventListener('pagehide',()=>{if(dirty&&!m15Blocked)void save()});
};


/* =================== MARGEN 1.5.1 ===================
   Segundo bloque de estabilidad: impedir sobrescrituras entre pestañas.
   Cada escritura en IndexedDB comprueba el identificador de la última
   versión DENTRO de la misma transacción que guarda los datos.
   No modifica la estructura de proyectos ni el formato de copia JSON.
   Si IndexedDB no está disponible y se usa localStorage, esa protección
   no puede garantizarse: esta ruta sigue siendo de emergencia.
*/
let m151DiskToken=null;
let m151Conflict=false;
function m151TokenOf(meta){
 if(!meta||typeof meta!=='object')return null;
 if(typeof meta.token==='string')return meta.token;
 if(typeof meta.hash==='string')return 'legacy:'+meta.hash+':'+(meta.time||'');
 return null;
}
function m151FreshToken(){
 return (typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Math.random().toString(36).slice(2)+'-'+Date.now());
}
function m151ConflictMessage(){return m15T('Otro MARGEN ha guardado cambios desde que abriste esta ventana. Para evitar perder trabajo, se ha detenido el guardado aquí. Descarga una copia JSON de lo que tienes antes de recargar.','Another MARGEN window saved changes after this one was opened. Saving has stopped here to prevent data loss. Download a JSON backup of your current work before reloading.');}
function m151ExportConflict(){
 let snapshot,payload;
 try{
  snapshot=JSON.parse(JSON.stringify(state));
  if(!validateBackup(snapshot))throw new Error(m15T('El proyecto no tiene una estructura JSON válida','The project has an invalid JSON structure'));
  payload=JSON.stringify(snapshot,null,2);
 }catch(error){
  console.error('MARGEN conflict export error:',error);
  m172Notice(m15T('No se ha podido preparar la copia JSON: ','Could not prepare the JSON backup: ')+error.message);
  return;
 }
 const name='MARGEN-conflicto-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.json';
 try{
  downloadBlob(payload,name,'application/json');
  const hint=document.querySelector('.m151-download-hint');
  if(hint)hint.textContent=m15T('Descarga solicitada. Comprueba que el archivo aparece en Descargas antes de recargar.','Download requested. Check that the file is in Downloads before reloading.');
 }catch(error){
  console.error('MARGEN conflict download error:',error);
  m172Notice(m15T('No se ha podido iniciar la descarga. No cierres esta ventana.','Could not start the download. Do not close this window.'));
 }
}
function m151ShowBanner(){
 document.querySelector('.m151-conflict')?.remove();
 if(!m151Conflict)return;
 const shade=document.createElement('div');shade.className='m151-conflict';shade.setAttribute('role','alertdialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-labelledby','m151-conflict-title');shade.setAttribute('aria-describedby','m151-conflict-message');
 const card=document.createElement('section');card.className='m151-conflict-card';
 const title=document.createElement('h2');title.id='m151-conflict-title';title.textContent=m15T('⚠ Cambios en otra ventana','⚠ Changes in another window');
 const description=document.createElement('p');description.id='m151-conflict-message';description.textContent=m151ConflictMessage();
 const tip=document.createElement('p');tip.className='m151-download-hint';tip.textContent=m15T('Los cambios de ESTA ventana aún no están en disco. Descarga su JSON antes de recargar.','Changes from THIS window are not saved on disk. Download its JSON before reloading.');
 const actions=document.createElement('div');actions.className='m151-actions';
 const download=document.createElement('button');download.type='button';download.className='btn primary m151-export';download.textContent=m15T('↓ Descargar mis cambios (JSON)','↓ Download my changes (JSON)');download.addEventListener('click',m151ExportConflict);
 const reload=document.createElement('button');reload.type='button';reload.className='btn m151-reload';reload.textContent=m15T('Recargar datos guardados','Reload saved data');reload.addEventListener('click',async ()=>{
   if(await m172Confirm(m15T('¿Recargar? Se perderán los cambios de esta ventana que no hayas exportado. Asegúrate de tener el JSON descargado.','Reload? Changes from this window that you have not exported will be lost. Make sure you have downloaded the JSON.')))location.reload();
 });
 actions.append(download,reload);card.append(title,description,tip,actions);shade.append(card);document.body.append(shade);
}
function m151MarkConflict(){
 if(m151Conflict)return;
 m151Conflict=true;m15Blocked=true;m15LastSaveOk=false;clearTimeout(saveTimer);
 m15Status('conflict');m151ShowBanner();
}
// El mismo conjunto de registros que ya se utilizaba, sin alterar el esquema.
readDb=async function(){
 const data=await m15RecordSet();
 m151DiskToken=m151TokenOf(data['workspace-meta']);
 const main=data.workspace,rec=data.recovery;
 const mainOk=m15Good(main,data['workspace-meta']);
 const recoveryOk=m15Good(rec,data['recovery-meta']);
 m15RecoveryAvailable=recoveryOk;
 if(mainOk)return main;
 if(main!==undefined&&recoveryOk){m15Recovered=true;m15LoadReason='previous';return rec}
 if(main!==undefined){m15Blocked=true;m15LoadReason='corrupt';return null}
 if(recoveryOk){m15Recovered=true;m15LoadReason='previous';return rec}
 return null;
};
writeDb=function(snapshot){
 return new Promise((resolve,reject)=>{
  let tx;
  try{tx=db.transaction('data','readwrite')}catch(err){reject(err);return}
  const store=tx.objectStore('data');
  const oldReq=store.get('workspace'),metaReq=store.get('workspace-meta');
  let previous,oldMeta,attempted=false;
  const nextMeta={hash:m15Hash(JSON.stringify(snapshot)),time:new Date().toISOString(),token:m151FreshToken()};
  const stage=()=>{
   if(attempted||oldReq.readyState!=='done'||metaReq.readyState!=='done')return;
   attempted=true;
   const actual=m151TokenOf(oldMeta);
   if(actual!==m151DiskToken){
    m151MarkConflict();
    try{tx.abort()}catch{}
    return;
   }
   if(m15Good(previous,oldMeta)){
    store.put(previous,'recovery');
    store.put({hash:m15Hash(JSON.stringify(previous)),time:new Date().toISOString()},'recovery-meta');
   }
   store.put(snapshot,'workspace');store.put(nextMeta,'workspace-meta');
  };
  oldReq.onsuccess=()=>{previous=oldReq.result;stage()};
  metaReq.onsuccess=()=>{oldMeta=metaReq.result;stage()};
  tx.oncomplete=()=>{
   m151DiskToken=nextMeta.token;
   if(m15Good(previous,oldMeta))m15RecoveryAvailable=true;
   resolve();
  };
  tx.onerror=()=>reject(tx.error||new Error('Error de escritura'));
  tx.onabort=()=>reject(m151Conflict?new Error('Concurrent update detected'):tx.error||new Error('Transacción cancelada'));
 });
};
const m151OldStatus=m15Status;
m15Status=function(which){
 if(m151Conflict){
   const indicator=el('save-status');
   if(indicator){indicator.dataset.saveState='conflict';indicator.textContent=m15T('⚠ Conflicto entre ventanas','⚠ Window conflict')}
   return;
 }
 return m151OldStatus(which);
};
const m151OldRender=render;
render=function(){m151OldRender();m151ShowBanner();};
// El navegador no permite garantizar que una escritura asíncrona termine
// después de cerrar una pestaña. Avisamos cuando aún hay trabajo pendiente.
window.addEventListener('beforeunload',event=>{
 if((dirty||m15Saving)&&!m15Blocked){event.preventDefault();event.returnValue='';}
});
const m151OldStart=start;
start=async function(){
 await m151OldStart();
 if(m15Blocked&&!m151Conflict){
  // Nunca mostrar el ejemplo como si fuera el manuscrito recuperado.
  // La base posiblemente dañada sigue intacta y no se guarda nada.
  state.projects=[];state.view='library';dirty=false;render();
 }
};


/* ================= MARGEN 1.5.3 — ESTABILIDAD III =================
   Ajustes focalizados; conserva esquema JSON v1 y BD de la 1.5.2.
   Sin migración ni sustitución de los manuscritos.
*/
// 1) El botón «Editar libro» no queda suelto entre el título y «Importar».
const m153PreviousRender=render;
render=function(){
 m153PreviousRender();
 if(state.view!=='book')return;
 const head=document.querySelector('.workspace-head');
 const edit=head?.querySelector(':scope > [data-action="edit-project"]');
 if(!head||!edit)return;
 let group=head.querySelector(':scope > .m153-book-actions');
 if(!group){group=document.createElement('div');group.className='m153-book-actions';head.append(group)}
 const importer=head.querySelector(':scope > .m14-import-open');
 if(importer)group.append(importer);
 group.append(edit);
};
// 2) Evitar tener que procesar todo el HTML de todos los capítulos en cada
//    render de un libro grande. Se invalida por identidad del HTML editado.
const m153WordCache=new WeakMap();
projectWords=function(book){
 if(!book?.chapters)return 0;
 let total=0;
 for(const chapter of book.chapters){
  if(!chapter||typeof chapter!=='object')continue;
  const html=typeof chapter.html==='string'?chapter.html:'';
  let cached=m153WordCache.get(chapter);
  if(!cached||cached.html!==html){
   cached={html,count:wordCount(plain(html))};m153WordCache.set(chapter,cached);
  }
  total+=cached.count;
 }
 return total;
};
// 3) El lector DOCX no debe materializar sin límite un ZIP descomprimido.
//    Comprueba tamaño declarado, tamaño real y las entradas en conjunto.
const m153PreviousZipRead=m14ReadZip;
m14ReadZip=function(ab){
 const zip=m153PreviousZipRead(ab);
 let declared=0;
 for(const [name,item] of zip.files){
  declared+=item.size;
  if(declared>180*1024*1024){
   throw new Error(m15T('El DOCX contiene demasiados datos internos.','The DOCX contains too much internal data.'));
  }
  if(!Number.isFinite(item.local)||item.local<0||item.local+30>zip.data.length){
   throw new Error(m15T('Índice de DOCX dañado.','Damaged DOCX index.'));
  }
 }
 return zip;
};
m14ZipGet=async function(zip,name){
 const item=zip.files.get(name);if(!item)return null;
 const {data,view}=zip;
 const p=item.local;
 if(p+30>data.length||view.getUint32(p,true)!==0x04034b50)
  throw new Error(m15T('Entrada de DOCX dañada: ','Damaged DOCX entry: ')+name);
 const start=p+30+view.getUint16(p+26,true)+view.getUint16(p+28,true);
 if(start>data.length||start+item.compressed>data.length)
  throw new Error(m15T('Datos comprimidos incompletos.','Incomplete compressed data.'));
 const bytes=data.subarray(start,start+item.compressed);
 const max=60*1024*1024;
 if(item.size>max)throw new Error(m15T('Un archivo interno del DOCX es demasiado grande.','A DOCX internal file is too large.'));
 if(item.method===0){
  if(bytes.byteLength!==item.size)throw new Error(m15T('Tamaño incorrecto en el DOCX.','Incorrect DOCX entry size.'));
  return bytes.slice();
 }
 if(item.method!==8)throw new Error(m15T('Compresión DOCX no compatible.','Unsupported DOCX compression.'));
 if(typeof DecompressionStream==='undefined')throw new Error(m15T('Actualiza Edge o Chrome para importar DOCX.','Update Edge or Chrome to import DOCX.'));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
 const chunks=[];let size=0;
 try{
  while(true){
   const {value,done}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>max||size>item.size){
    await reader.cancel().catch(()=>{});
    throw new Error(m15T('El DOCX declara un tamaño incorrecto o excesivo.','DOCX entry has an invalid or excessive declared size.'));
   }
   chunks.push(value);
  }
  if(size!==item.size)throw new Error(m15T('DOCX incompleto o dañado.','Incomplete or corrupted DOCX.'));
  const output=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength}
  return output;
 }finally{reader.releaseLock()}
};
// 4) Si en una importación múltiple fallan archivos, exigir una confirmación
//    específica antes de incorporar SOLO los capítulos que sí se leyeron.
const m153PreviousImportCommit=m14Commit;
m14Commit=async function(){
 if(m14Draft.busy||!m14Draft.chapters.length)return;
 if(m14Draft.issues.length){
  const message=m15T(
   `Hay ${m14Draft.issues.length} aviso(s) de importación. Si continúas, solo se añadirán los ${m14Draft.chapters.length} capítulos preparados. ¿Importar únicamente esos capítulos?`,
   `There are ${m14Draft.issues.length} import warning(s). Only the ${m14Draft.chapters.length} prepared chapters will be added. Import just these chapters?`
  );
  if(!await m172Confirm(message))return;
 }
 return m153PreviousImportCommit();
};
// 5) Fijar libro y pizarra de destino al iniciar la carga asíncrona.
//    Cambiar de vista durante una imagen ya no la envía a otra pizarra.
loadImages=async function(files,pos){
 if(state.view!=='boards')return;
 const project=activeProject(),board=activeBoard();
 if(!project||!board)return;
 const destinationProjectId=project.id,destinationBoardId=board.id;
 const anchor=pos||centerNewPosition();let count=0;
 for(const file of Array.from(files).slice(0,20)){
  try{
   if(!file.type.startsWith('image/')||file.size>25*1024*1024){
    showToast(m15T('Imagen no válida o de más de 25 MB.','Invalid image or over 25 MB.'));continue;
   }
   const image=await compressImage(file);
   const liveBook=state.projects.find(x=>x.id===destinationProjectId);
   const liveBoard=liveBook?.boards?.find(x=>x.id===destinationBoardId);
   if(!liveBoard){showToast(m15T('La pizarra original ya no existe; se cancela la carga.','Original board no longer exists; import cancelled.'));break}
   liveBoard.elements.push({id:uid(),type:'image',x:anchor.x+count*32,y:anchor.y+count*32,w:340,h:270,src:image});
   count++;
  }catch(error){console.warn('MARGEN image import:',error);showToast(m15T('No se pudo leer una imagen.','Could not read an image.'))}
 }
 if(count){
  if(state.view==='boards'&&activeProject()?.id===destinationProjectId&&activeBoard()?.id===destinationBoardId)renderBoardElements();
  changed();showToast(m15T(`${count} imagen(es) añadida(s).`,`${count} image(s) added.`));
 }
};



/* ================= MARGEN 1.5.4 — COMPATIBILIDAD Y RECUPERACIÓN =================
   - Acepta copias v1 de versiones antiguas sin rehacer IDs ni contenidos.
   - Revisión visible y copia de seguridad antes de una restauración destructiva.
   - Guarda el candidato SIN sustituir state; confirma con lectura real del disco.
   - Mantiene el control de conflictos del 1.5.1 y la copia recuperable del 1.5.
   - JSON de salida conserva formato version:1; no reescribe el texto del usuario.
*/
const m154MaxImportBytes=180*1024*1024;
function m154Lang(es,en){return m15T(es,en)}
function m154Clone(value){return JSON.parse(JSON.stringify(value))}
function m154IsObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function m154FormatSize(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB'}
function m154ReadFile(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||''));
  reader.onerror=()=>reject(reader.error||new Error('File read failed'));
  reader.readAsText(blob);
 });
}
function m154Prepare(input){
 // NOTA: función sin efectos secundarios. Nunca modifica el objeto recibido.
 if(!m154IsObject(input)||input.version!==1||!Array.isArray(input.projects))throw new Error(m154Lang('No es una copia JSON v1 de MARGEN.','This is not a MARGEN v1 JSON backup.'));
 const data=m154Clone(input),warnings=[],changes=[];
 const checkIds=(items,scope)=>{
  const seen=new Set();
  for(const x of items){
   if(!m154IsObject(x)||typeof x.id!=='string'||!x.id.trim())throw new Error(m154Lang('Falta un identificador en ','Missing an identifier in ')+scope);
   if(seen.has(x.id))throw new Error(m154Lang('Identificador repetido en ','Duplicate identifier in ')+scope);
   seen.add(x.id);
  }
 };
 checkIds(data.projects,'projects');
 for(const p of data.projects){
  if(typeof p.name!=='string'||!p.name.trim())throw new Error(m154Lang('Un libro no tiene nombre válido.','A book has an invalid name.'));
  // Capítulos, pizarras y notas están en las primeras copias y siguen siendo
  // obligatorios; si faltan, podrían haberse perdido por corrupción.
  for(const field of ['chapters','boards','notes']){
   if(!Array.isArray(p[field]))throw new Error(m154Lang('Al libro «','Book “')+p.name+m154Lang('» le falta una sección básica: ','” is missing a core section: ')+field);
  }
  // Estas secciones fueron añadidas en revisiones posteriores.
  for(const field of ['characters','settings','outlines','chronologies']){
   if(p[field]===undefined){p[field]=[];changes.push(field)}
   else if(!Array.isArray(p[field]))throw new Error(m154Lang('Sección dañada: ','Damaged section: ')+field);
  }
  for(const field of ['chapters','boards','notes','characters','settings','outlines','chronologies'])checkIds(p[field],p.name+' / '+field);
  for(const c of p.chapters){
   if(typeof c.title!=='string'||(c.html!==undefined&&typeof c.html!=='string'))throw new Error(m154Lang('Capítulo dañado en ','Damaged chapter in ')+p.name);
   if(c.html===undefined){c.html='';changes.push('chapter.html')}
  }
  for(const b of p.boards){
   for(const field of ['elements','strokes']){
    if(b[field]===undefined){b[field]=[];changes.push('board.'+field)}
    else if(!Array.isArray(b[field]))throw new Error(m154Lang('Pizarra dañada: ','Damaged board: ')+p.name);
   }
   if(b.connections!==undefined&&!Array.isArray(b.connections))throw new Error(m154Lang('Conexiones dañadas: ','Damaged connections: ')+p.name);
   checkIds(b.elements,p.name+' / board.elements');
   // Los trazos antiguos podían no tener ID, no se les inventa uno.
  }
 }
 if(!validateBackup(data))throw new Error(m154Lang('La copia no supera la validación interna.','The backup did not pass internal validation.'));
 let chapters=0,boards=0,images=0,externalImages=0,references=0,broken=0;
 for(const p of data.projects){
  chapters+=p.chapters.length;boards+=p.boards.length;
  // Imágenes que Word dejó embebidas directamente en el HTML de los capítulos.
  for(const chapter of p.chapters){images+=(chapter.html?.match(/<img\b/gi)||[]).length;}
  // Se contabilizan imágenes de pizarras y galerías de fichas sin tocar su src.
  const sources=[];
  function collectImages(node,key,depth){
   if(depth>35||!node||typeof node!=='object')return;
   if(Array.isArray(node)){for(const child of node)collectImages(child,key,depth+1);return}
   for(const [k,v] of Object.entries(node)){
    if(typeof v==='string'&&((k==='src'||k==='image'||k==='imageSrc'||k==='cover'||k==='photo'||k==='url')&&/^(data:image\/|https?:\/\/|file:|blob:)/i.test(v))){sources.push(v)}
    else if(v&&typeof v==='object')collectImages(v,k,depth+1);
   }
  }
  collectImages(p,'',0);
  images+=sources.length;externalImages+=sources.filter(v=>!v.startsWith('data:image/')).length;
  if(typeof m146RefIndex==='function'&&typeof m146Exists==='function'){
   try{
    const rows=m146RefIndex(p);references+=rows.length;
    for(const row of rows){if(row.targetKind&&row.targetId&&!m146Exists(p,row.targetKind,row.targetId))broken++}
   }catch(err){warnings.push(m154Lang('No se pudieron revisar todos los vínculos.','Some links could not be checked.'))}
  }
 }
 if(changes.length)warnings.push(m154Lang('Se completarán las secciones opcionales que no existían en versiones antiguas.','Optional sections absent from older versions will be added.'));
 if(externalImages)warnings.push(m154Lang(`${externalImages} imagen(es) usan enlaces externos; el JSON no incorpora esos archivos.`,`${externalImages} image(s) use external links; those files are not embedded in the JSON.`));
 if(broken)warnings.push(m154Lang(`${broken} vínculo(s) apuntan a fichas o capítulos no encontrados. Se conservarán para revisarlos.`,`${broken} link(s) point to missing sheets or chapters. They will be preserved for review.`));
 return {data,stats:{books:data.projects.length,chapters,boards,images,references,broken},warnings,changes:[...new Set(changes)]};
}
function m154SnapshotText(){return JSON.stringify(state,null,2)}
function m154Dismiss(){document.querySelector('.m154-backdrop')?.remove()}
function m154Review(prepared,fileName){
 m154Dismiss();
 const en=m15English(),{stats,warnings,changes}=prepared;
 const backdrop=document.createElement('div');backdrop.className='m154-backdrop';backdrop.setAttribute('role','dialog');backdrop.setAttribute('aria-modal','true');backdrop.setAttribute('aria-labelledby','m154-title');
 const panel=document.createElement('section');panel.className='m154-review';
 const h=document.createElement('h2');h.id='m154-title';h.textContent=m154Lang('Revisar copia antes de restaurar','Review backup before restoring');
 const desc=document.createElement('p');desc.textContent=m154Lang('Archivo: ','File: ')+fileName;
 const summary=document.createElement('div');summary.className='m154-summary';
 for(const [num,esLabel,enLabel] of [[stats.books,'Libros','Books'],[stats.chapters,'Capítulos','Chapters'],[stats.images,'Imágenes aprox.','Approx. images']]){
  const box=document.createElement('div'),strong=document.createElement('strong'),label=document.createElement('span');strong.textContent=String(num);label.textContent=en?enLabel:esLabel;box.append(strong,label);summary.append(box);
 }
 const more=document.createElement('p');more.textContent=m154Lang(`${stats.boards} pizarras · ${stats.references} referencias detectadas.`,`${stats.boards} boards · ${stats.references} references detected.`);
 const result=document.createElement('div');result.className='m154-note good';result.textContent=changes.length?
  m154Lang('Copia antigua compatible: se completarán únicamente los campos opcionales que falten.','Compatible older backup: only missing optional fields will be initialized.'):
  m154Lang('Estructura de la copia compatible con MARGEN 1.5.4.','Backup structure is compatible with MARGEN 1.5.4.');
 panel.append(h,desc,summary,more,result);
 for(const w of warnings){const line=document.createElement('div');line.className='m154-note warn';line.textContent='⚠ '+w;panel.append(line)}
 const safety=document.createElement('p');safety.textContent=m154Lang('La restauración SUSTITUYE toda la biblioteca actual. Descarga antes una copia de tus libros si quieres conservarlos. El guardado anterior también quedará como copia recuperable en MARGEN.','Restoring REPLACES your entire current library. Download a copy of your books first if you wish to keep them. The previous save will also remain recoverable in MARGEN.');panel.append(safety);
 const buttons=document.createElement('div');buttons.className='m154-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent=m154Lang('Cancelar','Cancel');cancel.onclick=m154Dismiss;
 const download=document.createElement('button');download.type='button';download.className='btn';download.textContent=m154Lang('↓ Guardar biblioteca actual','↓ Save current library');
 const restore=document.createElement('button');restore.type='button';restore.className='btn primary';restore.textContent=m154Lang('Restaurar esta copia','Restore this backup');
 const feedback=document.createElement('div');feedback.className='m154-download-state';feedback.setAttribute('aria-live','polite');
 download.onclick=async()=>{
  try{
   const payload=m154SnapshotText();
   const path=await downloadBlob(payload,'MARGEN-antes-de-restaurar-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.json','application/json');
   feedback.textContent=path?m154Lang('Copia guardada en: ','Backup saved to: ')+path:m154Lang('Guardado cancelado.','Save cancelled.');
  }catch(err){feedback.textContent=m154Lang('No se pudo preparar la copia actual: ','Could not prepare current backup: ')+err.message}
 };
 restore.onclick=async()=>{
  if(!await m172Confirm(m154Lang('¿Sustituir definitivamente tu biblioteca actual por la copia revisada?','Replace your current library with the reviewed backup?')))return;
  cancel.disabled=download.disabled=restore.disabled=true;restore.textContent=m154Lang('Restaurando…','Restoring…');
  try{
   await m154Install(prepared.data);
   m154Dismiss();render();showToast(m154Lang('Copia restaurada, guardada y verificada.','Backup restored, saved and verified.'));
  }catch(err){console.error('MARGEN restore:',err);feedback.textContent=m154Lang('No se restauró: ','Restore failed: ')+err.message;cancel.disabled=download.disabled=restore.disabled=false;restore.textContent=m154Lang('Restaurar esta copia','Restore this backup')}
 };
 buttons.append(cancel,download,restore);panel.append(buttons,feedback);backdrop.append(panel);document.body.append(backdrop);
 cancel.focus();
}
async function m154Readback(){
 if(db){const records=await m15RecordSet();return {snapshot:records.workspace,meta:records['workspace-meta']}}
 const raw=localStorage.getItem(M15_LOCAL);return {snapshot:raw?JSON.parse(raw):null,meta:null};
}
async function m154Install(candidate){
 if(m15Blocked||m151Conflict)throw new Error(m154Lang('El guardado está bloqueado o hay un conflicto entre ventanas. Exporta tus datos antes de continuar.','Saving is blocked or there is a window conflict. Export your data before continuing.'));
 // Finaliza primero cualquier edición pendiente, para que la copia de recuperación
 // represente realmente el estado más reciente de la biblioteca saliente.
 clearTimeout(saveTimer);
 if(m15Saving)await m15Saving;
 if(dirty){const ok=await save();if(!ok)throw new Error(m154Lang('No se pudo guardar primero la biblioteca actual.','Current library could not be saved first.'))}
 if(m15Blocked||m151Conflict)throw new Error(m154Lang('Se detectó un conflicto de guardado.','A save conflict was detected.'));
 const clean=m154Clone(candidate);
 if(!validateBackup(clean))throw new Error(m154Lang('La copia no supera la última comprobación.','The backup failed the final validation.'));
 const expected=m15Hash(JSON.stringify(clean));
 if(db)await writeDb(clean);else m15LocalWrite(clean);
 const check=await m154Readback();
 if(!m15Good(check.snapshot,check.meta)||m15Hash(JSON.stringify(check.snapshot))!==expected){
  // No sobrescribimos el estado inesperado: puede haber sido modificado por
  // otra ventana desde la primera escritura.
  m151MarkConflict();
  throw new Error(m154Lang('La comprobación posterior al guardado no coincide. Conserva esta ventana y exporta el JSON.','Readback verification did not match. Keep this window open and export its JSON.'));
 }
 state=clean;m15Revision++;dirty=false;m15LastSaveOk=true;
 m15RecoveryAvailable=true;m15Status('saved');
 // Evitar que los temporizadores de la interfaz antigua vuelvan a guardar.
 clearTimeout(saveTimer);
 ensureSelections();
}
const m154PriorWire=wire;
wire=function(){
 m154PriorWire();
 const picker=el('file-backup');
 if(!picker)return;
 picker.onchange=async event=>{
  const input=event.target,blob=input.files?.[0];if(!blob)return;
  try{
   if(blob.size>m154MaxImportBytes)throw new Error(m154Lang('El archivo supera los 180 MB admitidos por este importador.','File exceeds this importer’s 180 MB limit.'));
   const raw=await m154ReadFile(blob);
   const prepared=m154Prepare(JSON.parse(raw));
   m154Review(prepared,blob.name);
  }catch(err){console.error('MARGEN backup inspection:',err);m172Notice(m154Lang('No se puede abrir esta copia: ','Could not open this backup: ')+err.message)}
  finally{input.value=''}
 };
};


// Único pintado de versión, después de completar las capas de render.
const m155RenderOriginal = render;
render = function(){
  m155RenderOriginal();
  const version = document.querySelector('.brand .m11-version');
  if(version) version.textContent = '1.5.5 · Pruebas';
};


/* ================= MARGEN 1.6.0 — Tauri Desktop =================
   Storage bridge: no usa IndexedDB ni localStorage para libros.
   Los cambios se escriben con transacciones SQLite y control de revisión.
   Se carga este script antes de start(), manteniendo el scope lexical original.
*/
const margenInvoke = window.__TAURI__?.core?.invoke;
if (margenInvoke) {
  openDb = async function(){ return {desktop:true}; };
  m15RecordSet = async function(){
    try {
      return await margenInvoke('desktop_load_records');
    } catch (e) {
      // CRÍTICO: prohibido volver silenciosamente al almacén del navegador.
      console.error('MARGEN: No se ha podido leer SQLite',e);
      m15Blocked=true; m15LoadReason='corrupt';
      return {workspace:{version:-1,projects:[]}};
    }
  };
  writeDb = async function(snapshot){
    try {
      const result=await margenInvoke('desktop_save_records',{
        snapshot, expectedToken:m151DiskToken
      });
      m151DiskToken=result.token;
      m15RecoveryAvailable=!!result.recoveryAvailable;
      if(result.backupWarning&&!window.__margenBackupWarningShown){window.__margenBackupWarningShown=true;m172Notice(m15T('Los libros se guardaron, pero falló la copia automática: ','Books were saved, but the automatic backup failed: ')+result.backupWarning);}
    }catch(e){
      if(String(e).includes('MARGEN_CONFLICT'))m151MarkConflict();
      throw e;
    }
  };
  function margenCanonical(value){
    if(Array.isArray(value))return value.map(margenCanonical);
    if(value&&typeof value==='object')return Object.fromEntries(
      Object.keys(value).sort().map(key=>[key,margenCanonical(value[key])])
    );
    return value;
  }
  // La comparación de restauración no debe depender del orden de claves que
  // adopte serde_json al leer SQLite.
  m154Install = async function(candidate){
    if(m15Blocked||m151Conflict)throw Error('El guardado está bloqueado. Exporta tus datos.');
    clearTimeout(saveTimer);
    if(m15Saving)await m15Saving;
    if(dirty && !(await save()))throw Error('No se pudo guardar primero la biblioteca actual.');
    const clean=JSON.parse(JSON.stringify(candidate));
    if(!validateBackup(clean))throw Error('La copia es inválida.');
    await writeDb(clean);
    const records=await m154Readback();
    if(!m15Good(records.snapshot,records.meta)
       ||JSON.stringify(margenCanonical(clean))!==JSON.stringify(margenCanonical(records.snapshot))){
      m151MarkConflict();throw Error('La comprobación en SQLite no coincide: exporta tus datos.');
    }
    state=clean;m15Revision++;dirty=false;m15LastSaveOk=true;
    m15Status('saved');clearTimeout(saveTimer);ensureSelections();
  };
  const margenPrevDownload=downloadBlob;
  downloadBlob=function(body,name,type){
    if(String(type).includes('json')){
      // Usa una copia nativa verificable, no una descarga WebView2 de éxito incierto.
      let parsed;
      try{parsed=JSON.parse(body)}catch(e){console.error(e);return Promise.reject(e)}
      return margenInvoke('desktop_export_backup',{snapshot:parsed,kind:'manual'})
       .then(path=>{if(path)m172Notice(m15T('Copia guardada en:\n','Backup saved to:\n')+path);return path})
       .catch(e=>{m172Notice(m15T('Error al guardar copia: ','Backup save error: ')+e);throw e});
    }
    return margenPrevDownload(body,name,type);
  };
  const margenPreviousExport=backup;
  backup = async function(){
    if(!validateBackup(state)){
      showToast(m15T('Los datos no son válidos para exportar','Data cannot be exported'));return;
    }
    try {
      const path=await margenInvoke('desktop_export_backup',{snapshot:state,kind:'manual'});
      if(path)m172Notice(m15T('Copia JSON guardada en:\n','JSON backup saved to:\n')+path);
    }catch(e){console.error(e);m172Notice(m15T('No se pudo guardar la copia JSON: ','Could not save the JSON backup: ')+e)}
  };
  m151ExportConflict = async function(){
    try {
      const path=await margenInvoke('desktop_export_backup',{snapshot:state,kind:'conflict'});
      if(path)m172Notice(m15T('Copia de conflicto guardada en:\n','Conflict backup saved to:\n')+path);
    }catch(e){console.error(e);m172Notice(m15T('No se pudo exportar el conflicto: ','Could not export conflict: ')+e)}
  };
  const margenPreviousConflictBanner=m151ShowBanner;
  m151ShowBanner=function(){
    margenPreviousConflictBanner();
    const btn=document.querySelector('.m151-conflict .m151-export');
    if(btn&&btn.textContent.includes('Descargar'))btn.textContent='↓ Guardar mis cambios (JSON)';
    if(btn&&btn.textContent.includes('Download'))btn.textContent='↓ Save my changes (JSON)';
  };
  // El primer uso de MARGEN en Windows muestra los datos de ejemplo SOLO
  // cuando no existe ninguna biblioteca SQLite previa.
  const margenPrevRender=render;
  render=function(){
    margenPrevRender();
    const version=document.querySelector('.brand .m11-version');
    if(version)version.textContent='1.6.0 · Desktop';
  };
}
/* === MARGEN 1.6.1 · Importación revisable y editor de paneles ===
   Parche acotado para la aplicación de escritorio. Se concatena antes de start().
   Las instantáneas de Deshacer preservan el HTML enriquecido original sin aplanarlo.
*/
const m161T=(es,en)=>m146T(es,en);
let m161UndoStack=[],m161RedoStack=[],m161Caret=null,m161ActivePanel=null;
const m161HistoryMaxBytes=90*1024*1024;
function m161Snapshot(){return JSON.stringify({chapters:m14Draft.chapters,bookName:m14Draft.bookName,dest:m14Draft.dest});}
function m161Restore(serialized){
  const value=JSON.parse(serialized);m14Draft.chapters=value.chapters;m14Draft.bookName=value.bookName;m14Draft.dest=value.dest;
  m161Caret=null;m14Render();
}
function m161RefreshHistoryButtons(){
  const undo=document.getElementById('m161-undo'),redo=document.getElementById('m161-redo');
  if(undo)undo.disabled=!m161UndoStack.length;if(redo)redo.disabled=!m161RedoStack.length;
}
function m161PushHistory(){
  const snap=m161Snapshot();
  m161UndoStack.push(snap);m161RedoStack=[];
  let size=m161UndoStack.reduce((n,s)=>n+s.length,0);
  while(m161UndoStack.length>1&&(size>m161HistoryMaxBytes||m161UndoStack.length>30))size-=m161UndoStack.shift().length;
  m161RefreshHistoryButtons();
}
function m161HistoryAction(direction){
  const from=direction==='undo'?m161UndoStack:m161RedoStack,to=direction==='undo'?m161RedoStack:m161UndoStack;
  if(!from.length)return;to.push(m161Snapshot());m161Restore(from.pop());
}
const m161OldReset=m14Reset;
m14Reset=function(){m161UndoStack=[];m161RedoStack=[];m161Caret=null;return m161OldReset()};
const m161OldPrepare=m14Prepare;
m14Prepare=async function(){m161UndoStack=[];m161RedoStack=[];m161Caret=null;return await m161OldPrepare()};
function m161CaretFromSelection(container){
  const selection=window.getSelection();if(!selection?.rangeCount)return;
  const r=selection.getRangeAt(0);
  if(!container.contains(r.startContainer))return;
  const row=container.closest('[data-m14-chapter]');if(!row)return;
  m161Caret={index:Number(row.dataset.m14Chapter),range:r.cloneRange(),container};
}
function m161BlockHtml(html){
  const host=document.createElement('div');host.innerHTML=html;
  return {html:host.innerHTML,text:host.textContent||'',heading:false,level:0};
}
function m161ValidFragment(fragment){
  const host=document.createElement('div');host.append(fragment.cloneNode(true));
  return !!(host.textContent?.trim()||host.querySelector('img,svg,table,hr,video,canvas'));
}
function m161SplitAtCaret(index){
  const saved=m161Caret,chapter=m14Draft.chapters[index];
  if(!chapter||!saved||saved.index!==index||!saved.container.isConnected){
    showToast(m161T('Haz clic dentro del texto, justo donde quieras dividir.','Click inside the text at the point where you want to split.'));return;
  }
  const root=saved.container,range=saved.range;
  if(!root.contains(range.startContainer))return;
  const before=document.createRange(),after=document.createRange();
  before.selectNodeContents(root);before.setEnd(range.startContainer,range.startOffset);
  after.selectNodeContents(root);after.setStart(range.startContainer,range.startOffset);
  const first=before.cloneContents(),second=after.cloneContents();
  if(!m161ValidFragment(first)||!m161ValidFragment(second)){
    showToast(m161T('Elige un punto que deje contenido a ambos lados.','Choose a point with content on both sides.'));return;
  }
  const left=document.createElement('div'),right=document.createElement('div');left.append(first);right.append(second);
  m161PushHistory();
  chapter.blocks=[m161BlockHtml(left.innerHTML)];
  m14Draft.chapters.splice(index+1,0,m14ChapterFromBlocks(
    chapter.title+m161T(' · continuación',' · continued'),[m161BlockHtml(right.innerHTML)],chapter.source));
  m161Caret=null;m14Render();
}
const m161OldBindPreview=m14BindPreview;
m14BindPreview=function(){
  m161OldBindPreview();
  const head=document.querySelector('.m14-preview-head');
  if(head){
    const controls=document.createElement('div');controls.className='m161-history';
    controls.innerHTML=`<button type="button" class="btn" id="m161-undo" ${m161UndoStack.length?'':'disabled'}>${ic('back')} ${m161T('Deshacer','Undo')}</button><button type="button" class="btn" id="m161-redo" ${m161RedoStack.length?'':'disabled'}>${ic('redo')} ${m161T('Rehacer','Redo')}</button>`;
    head.append(controls);controls.querySelector('#m161-undo').onclick=()=>m161HistoryAction('undo');
    controls.querySelector('#m161-redo').onclick=()=>m161HistoryAction('redo');
  }
  document.querySelectorAll('[data-m14-title]').forEach(input=>{
    let recorded=false;const original=input.oninput;
    input.oninput=e=>{if(!recorded){m161PushHistory();recorded=true;}original?.call(input,e)};
    input.onblur=()=>{recorded=false};
  });
  document.querySelectorAll('[data-m14-move],[data-m14-merge]').forEach(button=>{
    const original=button.onclick;button.onclick=e=>{if(button.disabled)return;m161PushHistory();original?.call(button,e)};
  });
  document.querySelectorAll('[data-m14-removechapter]').forEach(button=>{
    button.onclick=async ()=>{
      const i=Number(button.dataset.m14Removechapter);
      if(!await m172Confirm(m161T('¿Quitar este capítulo de la importación? Podrás deshacerlo.','Remove this chapter from the import? You can undo this.')))return;
      m161PushHistory();m14Draft.chapters.splice(i,1);m14Render();
    };
  });
  // El divisor antiguo por párrafo queda sustituido por selección precisa de caret.
  document.querySelectorAll('.m14-chapter').forEach(row=>{
    const idx=Number(row.dataset.m14Chapter),preview=row.querySelector('.m14-rich-preview');
    if(!preview)return;
    const originalList=preview.parentElement?.querySelector('.m14-split-items');
    originalList?.closest('details')?.remove();
    preview.contentEditable='true';preview.spellcheck=false;preview.setAttribute('aria-readonly','true');
    preview.setAttribute('aria-label',m161T('Vista previa: coloca el cursor donde quieras dividir','Preview: place the cursor where you want to split'));
    preview.addEventListener('beforeinput',e=>e.preventDefault());
    preview.addEventListener('paste',e=>e.preventDefault());
    preview.addEventListener('drop',e=>e.preventDefault());
    for(const ev of ['pointerup','keyup','focus'])preview.addEventListener(ev,()=>m161CaretFromSelection(preview));
    const actions=document.createElement('div');actions.className='m161-split-actions';
    actions.innerHTML=`<span>${m161T('Haz clic en un punto del texto. Se respetarán negritas, cursivas, listas e imágenes.','Place the cursor in the text. Bold, italic, lists and images will be preserved.')}</span><button type="button" class="btn" data-m161-split>${ic('edit')} ${m161T('Dividir aquí','Split here')}</button>`;
    preview.after(actions);actions.querySelector('[data-m161-split]').addEventListener('mousedown',e=>e.preventDefault());
    actions.querySelector('[data-m161-split]').onclick=()=>m161SplitAtCaret(idx);
    const summary=row.querySelector('details > summary');if(summary)summary.textContent=m161T('Ver texto y dividir con el cursor','Preview and split at cursor');
  });
};
window.addEventListener('keydown',e=>{
  if(!document.getElementById('m14-overlay')||m14Draft.step!==2||!(e.ctrlKey||e.metaKey)||e.altKey)return;
  const t=e.target;
  if(t?.matches?.('input,textarea,[contenteditable]'))return;
  const key=e.key.toLowerCase();
  if(key==='z'){e.preventDefault();e.stopImmediatePropagation();m161HistoryAction(e.shiftKey?'redo':'undo')}
  else if(key==='y'){e.preventDefault();e.stopImmediatePropagation();m161HistoryAction('redo')}
},true);
// Los arrastres para reordenar no necesitan asa. Se diferencia clic de gesto de arrastre.
function m161BindChapterReordering(){
  const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
  sidebar.querySelectorAll('.m11-tree-entry').forEach(row=>{
    if(row.dataset.m161Drag==='true')return;
    const leaf=row.querySelector('.tree-leaf');if(!leaf||leaf.dataset.type!=='manuscript')return;
    row.dataset.m161Drag='true';row.draggable=false;
    const id=leaf.dataset.id;
    row.addEventListener('pointerdown',down=>{
      if(!down.isPrimary||down.button!==0||down.target.closest('input,select,textarea,.m11-extra,.entry-aux'))return;
      const x=down.clientX,y=down.clientY,pid=down.pointerId;let dragging=false,target=null,after=false;
      function cleanup(){
        document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);
        sidebar.querySelectorAll('.m11-tree-entry').forEach(e=>e.classList.remove('m11-drop-before','m11-drop-after','m161-pointer-moving'));
      }
      function move(e){
        if(e.pointerId!==pid)return;
        if(!dragging&&Math.hypot(e.clientX-x,e.clientY-y)<9)return;
        dragging=true;row.classList.add('m161-pointer-moving');
        const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.m11-tree-entry');
        sidebar.querySelectorAll('.m11-tree-entry').forEach(n=>n.classList.remove('m11-drop-before','m11-drop-after'));
        const hitLeaf=hit?.querySelector('.tree-leaf');target=hitLeaf?.dataset.type==='manuscript'&&hitLeaf.dataset.id!==id?hit:null;
        if(target){after=e.clientY>target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;target.classList.add(after?'m11-drop-after':'m11-drop-before')}
      }
      function up(e){
        if(e.pointerId!==pid)return;
        const to=target?.querySelector('.tree-leaf')?.dataset.id;cleanup();
        if(dragging){
          // Evita que soltar después del arrastre abra accidentalmente el capítulo.
          const swallow=ev=>{ev.stopImmediatePropagation();ev.preventDefault();sidebar.removeEventListener('click',swallow,true)};
          sidebar.addEventListener('click',swallow,true);
          setTimeout(()=>sidebar.removeEventListener('click',swallow,true),160);
          if(to)m11MoveTreeItem('manuscript',id,to,after);
        }
      }
      function cancel(e){if(e.pointerId===pid)cleanup()}
      document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancel,true);
    });
    row.addEventListener('keydown',e=>{
      if(!(e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')))return;
      const entries=[...sidebar.querySelectorAll('.m11-tree-entry')].filter(n=>n.querySelector('.tree-leaf')?.dataset.type==='manuscript');
      const index=entries.indexOf(row),adjacent=entries[index+(e.key==='ArrowUp'?-1:1)];
      const targetId=adjacent?.querySelector('.tree-leaf')?.dataset.id;
      if(targetId){e.preventDefault();m11MoveTreeItem('manuscript',id,targetId,e.key==='ArrowDown')}
    });
  });
}
let m161OpenPanel=null; // refs / sheets
function m161ClosePanel(){m161OpenPanel=null;document.getElementById('m161-side-panel')?.remove();m161SetLayout()}
function m161SetLayout(){
  const workspace=document.querySelector('.workspace');if(!workspace)return;
  workspace.classList.toggle('m161-side-open',!!document.querySelector('#m161-side-panel'));
  workspace.classList.toggle('m161-search-open',!!document.querySelector('#m142-search-panel'));
}
function m161ReferenceContent(){
  const p=activeProject(),ch=activeChapter();
  return p&&ch?m146RefsHtml(p,'chapter',ch.id):'';
}
function m161SheetContent(){
  const p=activeProject();if(!p)return '';
  const sections=[['characters',m161T('Personajes','Characters'),'users'],['settings',m161T('Escenarios','Settings'),'map']];
  return sections.map(([kind,label,icon])=>`<section class="m161-sheet-group"><h3>${ic(icon)} ${label}</h3>${(p[kind]||[]).length?(p[kind]||[]).map(x=>`<button class="m161-sheet-link" type="button" data-m161-open-sheet="${kind}" data-id="${esc(x.id)}"><strong>${esc(x.title||'')}</strong><span>${ic('chevron')}</span></button>`).join(''):`<p>${m161T('Todavía no hay fichas.','No sheets yet.')}</p>`}</section>`).join('');
}
function m161DrawPanel(){
  document.getElementById('m161-side-panel')?.remove();
  if(!m161OpenPanel||state.view!=='manuscript'||!activeChapter()||m142ReaderBooks.has(activeProject()?.id)){m161SetLayout();return}
  const workspace=document.querySelector('.workspace');if(!workspace)return;
  const panel=document.createElement('aside');panel.id='m161-side-panel';panel.className='m161-side-panel';
  const label=m161OpenPanel==='refs'?m161T('Referencias del capítulo','Chapter references'):m161T('Consultar fichas','Browse sheets');
  panel.setAttribute('aria-label',label);
  panel.innerHTML=`<header><h2>${label}</h2><button type="button" class="iconbtn" id="m161-side-close" title="${m161T('Cerrar','Close')}">${ic('close')}</button></header><div class="m161-side-content">${m161OpenPanel==='refs'?m161ReferenceContent():m161SheetContent()}</div>`;
  workspace.append(panel);panel.querySelector('#m161-side-close').onclick=m161ClosePanel;
  panel.querySelectorAll('[data-m146-ref]').forEach(button=>button.onclick=()=>m146Go(button));
  panel.querySelector('.m146-references')?.setAttribute('open','');
  panel.querySelectorAll('[data-m161-open-sheet]').forEach(button=>button.onclick=()=>{
    const p=activeProject(),kind=button.dataset.m161OpenSheet,id=button.dataset.id;
    if(!p?.[kind]?.some(x=>x.id===id))return;
    m161ClosePanel();m143Studio=false;
    state[kind==='characters'?'activeCharacterId':'activeSettingId']=id;state.view=kind==='characters'?'characters':'settings';changed();render();
  });
  m161SetLayout();
}
function m161TogglePanel(panel){
  if(m142SearchState.open)m142CloseSearch();
  m161OpenPanel=m161OpenPanel===panel?null:panel;m161DrawPanel();
}
const m161OldSearchShow=m142ShowSearch;
m142ShowSearch=function(){if(m161OpenPanel){m161OpenPanel=null;document.getElementById('m161-side-panel')?.remove()}m161OldSearchShow();m161SetLayout()};
const m161OldSearchClose=m142CloseSearch;
m142CloseSearch=function(){m161OldSearchClose();m161SetLayout()};
function m161ArrangeEditor(){
  if(state.view!=='manuscript')return;
  // Las referencias dejan de ocupar una franja antes del papel: ahora viven en el margen derecho.
  document.querySelector('.m146-manuscript-refs')?.remove();
  const nav=document.querySelector('.m11-navbox .m11-navgroup:last-child');
  if(nav){
    const focus=nav.querySelector('[data-action="m11-focus"]');
    if(focus){
      // Sustituir el nodo elimina el antiguo onAction enlazado por la barra.
      const newButton=focus.cloneNode(true);focus.replaceWith(newButton);
      newButton.removeAttribute('data-action');newButton.id='m161-refs-button';
      newButton.title=m161T('Ver referencias del capítulo','View chapter references');
      newButton.innerHTML=ic('link')+' '+m161T('Referencias','References');
      newButton.onclick=()=>m161TogglePanel('refs');
    }
    if(activeChapter()?.mode!=='screenplay'&&!nav.querySelector('#m161-sheets-button')){
      const button=document.createElement('button');button.type='button';button.className='btn';button.id='m161-sheets-button';
      button.innerHTML=ic('users')+' '+m161T('Fichas','Sheets');button.onclick=()=>m161TogglePanel('sheets');nav.append(button);
    }
  }
  const scriptTool=document.querySelector('.screenplay-area .editor-toolbar');
  if(scriptTool){
    [...scriptTool.querySelectorAll('span')].filter(s=>s.textContent.trim()==='Formato monoespaciado').forEach(span=>{
      const button=document.createElement('button');button.className='btn';button.type='button';button.innerHTML=ic('users')+' '+m161T('Fichas','Sheets');
      button.onclick=()=>m161TogglePanel('sheets');span.replaceWith(button);
    });
  }
  m161DrawPanel();m161SetLayout();
}
// Retirar referencias a prototipos del texto destinado al usuario.
// Se conserva el mensaje informativo sobre .doc porque el formato aún no se soporta.
const m161OldSources=m14SourcesHtml;
m14SourcesHtml=function(){
  return m161OldSources().replace(
    'este prototipo HTML no puede interpretar fielmente el formato binario .doc. Si incluyes alguno te indicará cómo convertirlo a .docx localmente desde Word o LibreOffice. No se importará como texto corrupto. La conversión integrada se estudiará para la aplicación de escritorio.',
    m161T('MARGEN todavía no admite documentos Word antiguos (.doc). Para importarlos, ábrelos en Word o LibreOffice y guárdalos como .docx. El archivo original no se modificará.',
      'MARGEN does not yet support legacy Word (.doc) files. Open them in Word or LibreOffice and save as .docx before importing. Your original file will not be changed.')
  );
};
const m161OldParseFile=m14ParseFile;
m14ParseFile=async function(file){
  if(file?.name?.toLowerCase().endsWith('.doc'))throw Error(m161T('Documento .doc antiguo: conviértelo a .docx antes de importarlo.','Legacy .doc file: convert it to .docx before importing.'));
  return m161OldParseFile(file);
};
const m161OldCommit=m14Commit;
m14Commit=function(){
  if(m14Draft.busy||!m14Draft.chapters.length)return;
  // Se sustituye el rótulo heredado en la vista previa, no en fichas existentes.
  const original=m14Draft.dest;const before=state.projects.length;
  const result=m161OldCommit();
  if(original==='new'&&state.projects.length>before){
    const created=activeProject();if(created?.description==='Importado desde documentos · MARGEN 1.4')
      {created.description=m161T('Importado desde documentos','Imported from documents');changed()}
  }
  return result;
};
const m161OldRender=render;
render=function(){
  m161OldRender();
  const badge=document.querySelector('.brand .m11-version');if(badge)badge.textContent='1.6.1 · Desktop';
  m161ArrangeEditor();m161BindChapterReordering();
};
const m161OldRenderSidebar=renderSidebarOnly;
renderSidebarOnly=function(){m161OldRenderSidebar();m161BindChapterReordering()};
const m161OldWire=wire;
wire=function(){m161OldWire();m161BindChapterReordering()};

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
    onSubmit:async ({title})=>{
      if((project.stamps?.length||0)+(state.globalStamps?.length||0)>=70){showToast(m162T('Límite de 70 sellos alcanzado','70-stamp limit reached'));return;}
      const global=await m172Confirm(m162T('¿Usar este sello en todos tus libros? Aceptar = global. Cancelar = solo este libro.','Make this stamp available in every book? OK = global. Cancel = this book only.'));
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
  overlay.querySelectorAll('[data-m162-stamp-delete]').forEach(button=>button.onclick=async ()=>{
    if(!await m172Confirm(m162T('¿Eliminar el sello? Los ya estampados permanecerán.','Delete this stamp? Existing impressions remain.')))return;
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

/* MARGEN Desktop 1.6.3 — editor ordenado + genealogía verificable.
   Datos: se respetan los IDs y aristas existentes. Sugerencias sin confirmar NO son relaciones.
*/
const m163T=(es,en)=>m146T(es,en);

/* Cabecera alineada con el área real de escritura. Exportar permanece a la derecha. */
function m163ArrangeEditor(){
  if(state.view!=='manuscript')return;
  const head=document.querySelector('.workspace-head.m1431-manuscript-head');
  if(head){
    head.classList.add('m163-editor-head');
    const modes=head.querySelector('.m1431-mode-center'),actions=head.querySelector(':scope>.head-actions');
    const selector=actions?.querySelector('.screenplay-mode-switch');
    if(modes&&selector){modes.append(selector);selector.classList.add('m163-writing-type');}
  }
  // En Guion, Fichas va junto a Referencias, no en la barra de formato.
  const screenplay=!!document.querySelector('.screenplay-area');
  const nav=document.querySelector('.m11-navbox .m11-navgroup:last-child');
  if(screenplay&&nav){
    let sheets=nav.querySelector('#m161-sheets-button');
    if(!sheets){
      sheets=document.createElement('button');sheets.className='btn';sheets.type='button';
      sheets.id='m161-sheets-button';nav.append(sheets);
    }
    sheets.innerHTML=ic('users')+' '+m163T('Fichas','Sheets');
    sheets.onclick=m162ToggleSheets;
    sheets.setAttribute('aria-pressed',String(m143ReferenceOpen));
    document.querySelectorAll('.screenplay-area .editor-toolbar button').forEach(b=>{
      if(['Fichas','Sheets'].includes(b.textContent.trim()))b.remove();
    });
  }
}
// El panel está disponible también desde la barra de navegación en Escritura amplia.
const m163PreviousTopbar=m143BuildTopbar;
m143BuildTopbar=function(){
  m163PreviousTopbar();
  document.getElementById('m143-refs')?.remove();
};

/* Parentescos explícitos; los indirectos se consultan como deducciones, sin aristas extra. */
const m163PreviousRelationTypes=m122RelationTypes;
m122RelationTypes=function(mode){
  if(mode!=='genealogy')return m163PreviousRelationTypes(mode);
  return [
    {id:'parent',title:m163T('Progenitor/a → hijo/a','Parent → child'),symbol:'↓',color:'#8a7052',dash:'',arrow:true},
    {id:'adoptive',title:m163T('Adopción → hijo/a','Adoptive parent → child'),symbol:'◇',color:'#5e9b83',dash:'7 5',arrow:true},
    {id:'step_parent',title:m163T('Padrastro / madrastra → hijastro/a','Step-parent → stepchild'),symbol:'⌂',color:'#b88465',dash:'5 6',arrow:true},
    {id:'guardian',title:m163T('Tutor/a legal → menor','Guardian → ward'),symbol:'✧',color:'#8b8fba',dash:'6 4',arrow:true},
    {id:'partner',title:m163T('Pareja / matrimonio','Partners / marriage'),symbol:'♥',color:'#c67b95',dash:'',arrow:false},
    {id:'former_partner',title:m163T('Expareja / divorcio','Former partners / divorce'),symbol:'♡',color:'#bf8c9e',dash:'5 6',arrow:false},
    {id:'sibling',title:m163T('Hermanos/as (directo)','Siblings (explicit)'),symbol:'≈',color:'#7089b0',dash:'5 5',arrow:false},
    {id:'half_sibling',title:m163T('Medio hermanos/as','Half-siblings'),symbol:'≈',color:'#8d95c0',dash:'5 5',arrow:false},
    {id:'grandparent',title:m163T('Abuelo/a → nieto/a (directo)','Grandparent → grandchild (explicit)'),symbol:'♧',color:'#88a081',dash:'3 7',arrow:true},
    {id:'uncle',title:m163T('Tío/a → sobrino/a (directo)','Aunt / uncle → nibling (explicit)'),symbol:'⌁',color:'#a18d69',dash:'3 7',arrow:true},
    {id:'cousin',title:m163T('Primos/as (directo)','Cousins (explicit)'),symbol:'◇',color:'#8e9b9c',dash:'4 7',arrow:false},
    {id:'inlaw',title:m163T('Cuñados/as / afinidad','In-laws / family by marriage'),symbol:'◇',color:'#a68b7c',dash:'4 7',arrow:false}
  ];
};
const m163ParentTypes=new Set(['parent','adoptive']);
const m163UnionTypes=new Set(['partner']);
const m163AllDirectParentTypes=new Set(['parent','adoptive','step_parent','guardian']);
const m163Node=(g,id)=>g.nodes.find(n=>n.id===id);
function m163DirectParents(g,id){return g.edges.filter(e=>m163ParentTypes.has(e.type)&&e.to===id).map(e=>e.from).filter(x=>!!m163Node(g,x));}
function m163Children(g,id){return g.edges.filter(e=>m163ParentTypes.has(e.type)&&e.from===id).map(e=>e.to).filter(x=>!!m163Node(g,x));}
function m163WouldCycle(g,from,to,ignore=''){
  if(from===to)return true;
  const visited=new Set(),stack=[to];
  while(stack.length){const at=stack.pop();if(at===from)return true;if(visited.has(at))continue;visited.add(at);
    for(const e of g.edges)if(e.id!==ignore&&m163ParentTypes.has(e.type)&&e.from===at)stack.push(e.to);
  }
  return false;
}
function m163Pair(g,a,b){return g.edges.some(e=>m163UnionTypes.has(e.type)&&((e.from===a&&e.to===b)||(e.from===b&&e.to===a)));}
function m163Pending(g){
  if(!g)return [];
  const result=[],known=new Set();
  for(const couple of g.edges.filter(e=>m163UnionTypes.has(e.type))){
    for(const [from,other] of [[couple.from,couple.to],[couple.to,couple.from]]){
      for(const child of m163Children(g,from)){
        if(child===other)continue;
        const key=[other,child,from].join('|');
        if(known.has(key)||g.dismissedSuggestions?.includes(key))continue;
        known.add(key);
        if(g.edges.some(e=>e.from===other&&e.to===child&&m163AllDirectParentTypes.has(e.type)))continue;
        if(m163WouldCycle(g,other,child))continue;
        result.push({key,partner:other,child,existingParent:from});
      }
    }
  }
  return result;
}
// Al crear o convertir un vínculo de filiación, rechazar ciclos y duplicados simétricos.
const m163PreviousMakeEdge=m122MakeEdge;
m122MakeEdge=function(from,to){
  const g=m122Graph(),b=activeBoard(),type=document.getElementById('m122-new-edge-type')?.value;
  if(b?.diagramMode==='genealogy'&&g){
    if(m163ParentTypes.has(type)&&m163WouldCycle(g,from,to)){showToast(m163T('Ese parentesco crearía un ciclo entre generaciones.','That parentage would create a cycle.'));return;}
    if(['partner','former_partner','sibling','half_sibling','cousin','inlaw'].includes(type)&&g.edges.some(e=>e.type===type&&e.from===to&&e.to===from)){
      showToast(m163T('Ese vínculo ya existe.','That link already exists.'));return;
    }
  }
  m163PreviousMakeEdge(from,to);
};

function m163Derived(g,id){
  const parents=new Set(m163DirectParents(g,id)),children=new Set(m163Children(g,id));
  const mates=new Set(g.edges.filter(e=>m163UnionTypes.has(e.type)&&(e.from===id||e.to===id)).map(e=>e.from===id?e.to:e.from));
  const stepParents=new Set(g.edges.filter(e=>e.type==='step_parent'&&e.to===id).map(e=>e.from));
  const guardians=new Set(g.edges.filter(e=>e.type==='guardian'&&e.to===id).map(e=>e.from));
  const siblings=new Set(),halfSiblings=new Set();
  for(const p of parents)for(const s of m163Children(g,p))if(s!==id){
    const shared=m163DirectParents(g,s).filter(x=>parents.has(x)).length;
    if(parents.size>1&&shared>=2)siblings.add(s);else halfSiblings.add(s);
  }
  const grandparents=new Set();for(const p of parents)for(const gp of m163DirectParents(g,p))if(gp!==id)grandparents.add(gp);
  const grandchildren=new Set();for(const ch of children)for(const gc of m163Children(g,ch))if(gc!==id)grandchildren.add(gc);
  const uncles=new Set();for(const parent of parents){const gps=m163DirectParents(g,parent);for(const gp of gps)for(const sibling of m163Children(g,gp))if(sibling!==parent&&sibling!==id)uncles.add(sibling)}
  const nephews=new Set();for(const s of siblings)for(const k of m163Children(g,s))if(k!==id)nephews.add(k);
  const cousins=new Set();for(const u of uncles)for(const c of m163Children(g,u))if(c!==id)cousins.add(c);
  return {parents,children,stepParents,guardians,mates,siblings,halfSiblings,grandparents,grandchildren,uncles,nephews,cousins};
}
function m163RelatedHtml(g,id){
  const sections=m163Derived(g,id),labels={
    parents:m163T('Progenitores','Parents'),children:m163T('Hijos/as','Children'),stepParents:m163T('Padrastros / madrastras','Step-parents'),guardians:m163T('Tutores/as legales','Legal guardians'),mates:m163T('Pareja','Partner'),
    siblings:m163T('Hermanos/as','Siblings'),halfSiblings:m163T('Medio hermanos/as (o parentesco por confirmar)','Half-siblings (or unverified)'),grandparents:m163T('Abuelos/as','Grandparents'),grandchildren:m163T('Nietos/as','Grandchildren'),
    uncles:m163T('Tíos/as','Aunts / uncles'),nephews:m163T('Sobrinos/as','Niblings'),cousins:m163T('Primos/as','Cousins')};
  return Object.entries(sections).filter(([,ids])=>ids.size).map(([key,ids])=>`<div class="m163-relative-row"><strong>${labels[key]}</strong><div>${[...ids].map(x=>`<button type="button" data-m163-jump="${esc(x)}">${esc(m163Node(g,x)?.name||'?')}</button>`).join('')}</div></div>`).join('')||`<p class="m163-empty">${m163T('Todavía no hay parentescos deducibles.','No derived relatives yet.')}</p>`;
}
function m163SuggestionPanel(){
  const g=m122Graph(),root=document.getElementById('m122-inspector'),b=activeBoard();
  if(!g||!root||b?.diagramMode!=='genealogy')return;
  const n=m122Selection?.kind==='node'?m163Node(g,m122Selection.id):null;
  const filtered=m163Pending(g).sort((a,b)=>Number(!!n&&[b.partner,b.child,b.existingParent].includes(n.id))-Number(!!n&&[a.partner,a.child,a.existingParent].includes(n.id))); // Las relevantes primero, ninguna oculta.
  const allCount=m163Pending(g).length;
  const panel=document.createElement('section');panel.className='m163-kinship-panel';
  panel.innerHTML=`<div class="m163-relation-heading">${ic('users')} <strong>${m163T('Familia y parentescos','Family and kinship')}</strong></div>`+
   (n?`<details class="m163-derived" open><summary>${m163T('Parentescos calculados','Derived relatives')}</summary>${m163RelatedHtml(g,n.id)}</details>`:'')+
   (allCount?`<div class="m163-pending-heading">${ic('link')} ${m163T('Confirmar relaciones','Confirm relationships')} <span>${allCount}</span></div><p class="m163-pending-explain">${m163T('Son sugerencias, NO vínculos confirmados. Puedes descartarlas.','Suggestions only, NOT confirmed links. You can dismiss them.')}</p>`:'')+
   (filtered.length?filtered.slice(0,20).map((s,i)=>`<div class="m163-suggestion" data-m163-proposal="${esc(s.key)}"><p><strong>${esc(m163Node(g,s.partner)?.name||'?')}</strong> + ${esc(m163Node(g,s.existingParent)?.name||'?')} → <strong>${esc(m163Node(g,s.child)?.name||'?')}</strong></p><label>${m163T('Relación propuesta','Suggested relation')}<select data-m163-type><option value="step_parent">${m163T('Padrastro / madrastra','Step-parent')}</option><option value="parent">${m163T('Progenitor/a','Parent')}</option><option value="adoptive">${m163T('Progenitor/a adoptivo/a','Adoptive parent')}</option><option value="guardian">${m163T('Tutor/a legal','Legal guardian')}</option></select></label><div class="m163-suggestion-actions"><button class="btn primary" type="button" data-m163-confirm="${esc(s.key)}">${m163T('Confirmar','Confirm')}</button><button class="btn ghost" type="button" data-m163-dismiss="${esc(s.key)}">${m163T('Descartar','Dismiss')}</button></div></div>`).join(''):
      allCount?`<p class="m163-empty">${m163T('Selecciona otras personas para revisar sus propuestas.','Select another person to review their suggestions.')}</p>`:'');
  if(!n&&!allCount)return;
  root.prepend(panel);
  panel.querySelectorAll('[data-m163-jump]').forEach(button=>button.onclick=()=>{m122Selection={kind:'node',id:button.dataset.m163Jump};m122Draw();m122Inspector()});
  panel.querySelectorAll('[data-m163-confirm]').forEach(button=>button.onclick=()=>{
    const s=m163Pending(g).find(x=>x.key===button.dataset.m163Confirm);if(!s)return;
    const row=button.closest('[data-m163-proposal]'),type=row.querySelector('[data-m163-type]').value;
    if(m163ParentTypes.has(type)&&m163WouldCycle(g,s.partner,s.child)){showToast(m163T('Parentesco incompatible.','Incompatible relationship.'));return}
    if(!g.edges.some(e=>e.from===s.partner&&e.to===s.child&&e.type===type))
      g.edges.push({id:uid(),from:s.partner,to:s.child,type,direction:'forward',color:'',label:'',note:'',reviewed:true});
    m122Remember();m122Draw();m122Inspector();showToast(m163T('Parentesco confirmado.','Kinship confirmed.'));
  });
  panel.querySelectorAll('[data-m163-dismiss]').forEach(button=>button.onclick=()=>{
    g.dismissedSuggestions=Array.isArray(g.dismissedSuggestions)?g.dismissedSuggestions:[];
    if(!g.dismissedSuggestions.includes(button.dataset.m163Dismiss))g.dismissedSuggestions.push(button.dataset.m163Dismiss);
    m122Remember();m122Draw();m122Inspector();
  });
}
function m163ProtectEdgeType(){
  // No permitir que editar el tipo de una arista introduzca un ciclo ancestral.
  const root=document.getElementById('m122-inspector'),g=m122Graph();
  if(!root||!g||activeBoard()?.diagramMode!=='genealogy')return;
  const edgeType=root.querySelector('[data-m122-edge-field="type"]');
  if(edgeType)edgeType.addEventListener('change',ev=>{
    const selected=m122Selection?.kind==='edge'?g.edges.find(e=>e.id===m122Selection.id):null;
    if(selected&&m163ParentTypes.has(edgeType.value)&&m163WouldCycle(g,selected.from,selected.to,selected.id)){
      ev.stopImmediatePropagation();ev.preventDefault();edgeType.value=selected.type;
      showToast(m163T('Ese vínculo crearía un ciclo genealógico.','That link would create a cycle in the family tree.'));
    }
  },true);
}
const m163PreviousInspector=m122Inspector;
m122Inspector=function(){m163PreviousInspector();m163ProtectEdgeType();m163SuggestionPanel()};

/* Foto pequeña: siempre usa la misma imagen principal de la ficha de personaje. */
const m163PreviousDraw=m122Draw;
m122Draw=function(){
  m163PreviousDraw();
  const g=m122Graph(),p=activeProject(),mode=activeBoard()?.diagramMode;
  if(mode!=='genealogy'||!g||!p)return;
  document.querySelectorAll('#m122-nodes [data-m122-node]').forEach(el=>{
    const node=m163Node(g,el.dataset.m122Node),person=p.characters?.find(c=>c.id===node?.characterId),src=person?.gallery?.[0]?.src;
    const avatar=el.querySelector('.m122-avatar');
    if(avatar&&typeof src==='string'&&(/^(data:image\/|asset:|https?:\/\/)/i.test(src))){
      avatar.replaceChildren();const img=document.createElement('img');img.src=src;img.alt=m163T('Retrato de ','Portrait of ')+(person.title||'');img.loading='lazy';avatar.append(img);
    }
  });
};

function m163PathEndpoints(a,c,mode){
  const aw=mode==='genealogy'?200:204,ah=mode==='genealogy'?110:86;
  const ax=(Number(a.x)||0)+aw/2,ay=(Number(a.y)||0)+ah/2,bx=(Number(c.x)||0)+aw/2,by=(Number(c.y)||0)+ah/2;
  const dx=bx-ax,dy=by-ay;
  const k=Math.max(Math.abs(dx)/(aw/2+12),Math.abs(dy)/(ah/2+12),.001);
  const ux=dx/k,uy=dy/k;
  return {sx:ax+ux,sy:ay+uy,ex:bx-ux,ey:by-uy,midX:(ax+bx)/2,midY:(ay+by)/2};
}
function m163GeneralEdge(g,e,mode){
  const from=m163Node(g,e.from),to=m163Node(g,e.to);if(!from||!to)return '';
  const t=m122Type(mode,e.type),col=safeColor(e.color,t.color),v=m163PathEndpoints(from,to,mode),
    d=`M ${v.sx} ${v.sy} L ${v.ex} ${v.ey}`;
  const markid='m163-marker-'+e.id.replace(/[^a-zA-Z0-9_-]/g,'');
  const direction=e.direction|| (t.arrow?'forward':'both');
  const arrow=direction==='forward'?'end':direction==='backward'?'start':'';
  const selected=m122Selection?.kind==='edge'&&m122Selection.id===e.id;
  return `<defs><marker id="${markid}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L5 3 L0 6 Z" fill="${col}"/></marker></defs><path class="m122-edge-path m163-line" d="${d}" stroke="${col}" ${t.dash?`stroke-dasharray="${t.dash}"`:''} ${arrow?`marker-${arrow}="url(#${markid})"`:''}/><path class="m122-edge-hit ${selected?'selected':''}" d="${d}" data-m122-edge="${esc(e.id)}"/><text class="m122-edge-tag m163-edge-label" x="${v.midX}" y="${v.midY-15}" text-anchor="middle" fill="${col}">${esc(e.label||t.title)}</text>`;
}
function m163FamilyLines(g){
  const edges=g.edges.filter(e=>m163ParentTypes.has(e.type)&&m163Node(g,e.from)&&m163Node(g,e.to));
  const groups=new Map();
  const byChild=new Map();
  for(const e of edges){if(!byChild.has(e.to))byChild.set(e.to,[]);byChild.get(e.to).push(e)}
  for(const [child,links] of byChild){
    const parents=links.map(e=>e.from);
    // Compartir con dos padres confirmados solo cuando realmente existen las dos filiaciones.
    const union=parents.length===2&&m163Pair(g,parents[0],parents[1])?parents.slice().sort():null;
    const keys=union?[{key:'pair:'+union.join('|'),parents:union,links}]:links.map(e=>({key:'single:'+e.from,parents:[e.from],links:[e]}));
    for(const entry of keys){
      if(!groups.has(entry.key))groups.set(entry.key,{parents:entry.parents,children:[],links:[]});
      groups.get(entry.key).children.push(child);groups.get(entry.key).links.push(...entry.links);
    }
  }
  let markup='';
  for(const group of groups.values()){
    const parents=group.parents.map(id=>m163Node(g,id)).filter(Boolean),kids=group.children.map(id=>m163Node(g,id)).filter(Boolean);
    if(!parents.length||!kids.length)continue;
    const center=a=>(Number(a.x)||0)+100;
    const fromX=parents.reduce((sum,n)=>sum+center(n),0)/parents.length;
    const fromY=Math.max(...parents.map(n=>(Number(n.y)||0)+111));
    const cxs=kids.map(center),top=Math.min(...kids.map(n=>Number(n.y)||0));
    const junction=Math.min(fromY+105,Math.max(fromY+28,top-90));
    // Líneas limpias de jerarquía: tronco, barra de hermanos, ramas hasta los hijos.
    const minX=Math.min(...cxs),maxX=Math.max(...cxs);
    markup+=`<path class="m163-family-line" d="M${fromX} ${fromY} V${junction} H${minX} M${fromX} ${junction} H${maxX}"/>`;
    for(const child of kids){
      const d=`M${center(child)} ${junction} V${Number(child.y)||0}`;
      markup+=`<path class="m163-family-line" d="${d}"/>`;
      const edge=group.links.find(e=>e.to===child.id);
      if(edge)markup+=`<path class="m122-edge-hit" d="${d}" data-m122-edge="${esc(edge.id)}"/>`;
    }
  }
  return markup;
}
const m163PreviousEdges=m122DrawEdges;
m122DrawEdges=function(){
  const b=activeBoard(),g=m122Graph(),svg=document.getElementById('m122-edges');if(!g||!svg)return;
  // Las relaciones conservan vínculos normales; su punta queda FUERA de la tarjeta.
  const mode=b.diagramMode;
  let markup='';
  if(mode==='genealogy'){
    markup+=m163FamilyLines(g);
    for(const e of g.edges){if(m163ParentTypes.has(e.type))continue;markup+=m163GeneralEdge(g,e,mode)}
    for(const s of m163Pending(g)){
      const a=m163Node(g,s.partner),c=m163Node(g,s.child);if(!a||!c)continue;
      const v=m163PathEndpoints(a,c,'genealogy');
      markup+=`<path class="m163-preview-line" d="M${v.sx} ${v.sy} L${v.ex} ${v.ey}"/>`;
    }
  }else{
    for(const e of g.edges)markup+=m163GeneralEdge(g,e,mode);
  }
  svg.innerHTML=markup;
  // Permitir diagramas mayores que el tablero fijo heredado.
  const maxX=Math.max(2600,...g.nodes.map(n=>(Number(n.x)||0)+420)),maxY=Math.max(1900,...g.nodes.map(n=>(Number(n.y)||0)+350));
  const world=document.getElementById('m122-world'),nodes=document.getElementById('m122-nodes');
  if(world){world.style.width=maxX+'px';world.style.height=maxY+'px'}
  if(nodes){nodes.style.width=maxX+'px';nodes.style.height=maxY+'px'}
  svg.setAttribute('viewBox',`0 0 ${maxX} ${maxY}`);svg.style.width=maxX+'px';svg.style.height=maxY+'px';
  svg.querySelectorAll('[data-m122-edge]').forEach(path=>path.onclick=e=>{
    e.stopPropagation();m122Selection={kind:'edge',id:path.dataset.m122Edge};m122Draw();m122Inspector();
  });
};

/* Organizador de generaciones: une parejas en un mismo nivel, respeta ascendencia,
   mantiene parientes próximos y deja márgenes amplios para etiquetas. */
const m163PreviousOrganize=m122Organize;
m122Organize=function(){
  const g=m122Graph(),b=activeBoard();if(!g?.nodes?.length)return;
  if(b.diagramMode!=='genealogy'){
    // Mayor separación para que las etiquetas de relaciones no se pisen.
    const nodes=g.nodes,n=nodes.length,radius=Math.max(250,n*47);
    nodes.forEach((p,i)=>{const angle=i*2*Math.PI/n-Math.PI/2;p.x=Math.round(1200+Math.cos(angle)*radius-102);p.y=Math.round(900+Math.sin(angle)*radius-43)});
    m163FitGraph();
    m122Remember();m122Draw();showToast(m163T('Relaciones organizadas','Relationships arranged'));return;
  }
  const depth=new Map(g.nodes.map(n=>[n.id,0]));
  // Solo ascensos confirmados (parent/adoptive); padrastros y tutores no
  // definen filiación biológica pero quedan cerca de las parejas.
  for(let pass=0;pass<g.nodes.length;pass++){
    let change=false;
    for(const edge of g.edges.filter(e=>m163ParentTypes.has(e.type))){
      if(!depth.has(edge.from)||!depth.has(edge.to))continue;
      const desired=Math.min(g.nodes.length,(depth.get(edge.from)||0)+1);
      if(desired>depth.get(edge.to)){depth.set(edge.to,desired);change=true}
    }
    // Parejas conectadas se dibujan en la misma generación.
    for(const edge of g.edges.filter(e=>m163UnionTypes.has(e.type))){
      if(!depth.has(edge.from)||!depth.has(edge.to))continue;
      const lv=Math.max(depth.get(edge.from),depth.get(edge.to));
      if(depth.get(edge.from)!==lv){depth.set(edge.from,lv);change=true}
      if(depth.get(edge.to)!==lv){depth.set(edge.to,lv);change=true}
    }
    if(!change)break;
  }
  const rows=new Map();for(const node of g.nodes){const lv=Math.min(depth.get(node.id)||0,g.nodes.length);if(!rows.has(lv))rows.set(lv,[]);rows.get(lv).push(node)}
  const placed=new Map();
  for(const [lv,items] of [...rows].sort((a,b)=>a[0]-b[0])){
    // Mantener parejas contiguas; ordenar descendientes por el centro de sus padres.
    const visited=new Set(),units=[];
    for(const node of items){if(visited.has(node.id))continue;
      const mates=items.filter(other=>!visited.has(other.id)&&other.id!==node.id&&m163Pair(g,node.id,other.id));
      const unit=[node,...mates];unit.forEach(x=>visited.add(x.id));
      const ancestors=unit.flatMap(x=>m163DirectParents(g,x.id)).map(id=>placed.get(id)).filter(Number.isFinite);
      units.push({members:unit,weight:ancestors.length?ancestors.reduce((a,b)=>a+b,0)/ancestors.length:Infinity});
    }
    units.sort((a,b)=>a.weight-b.weight);
    const total=items.length,gap=350,start=Math.max(240,1350-((total-1)*gap)/2);
    let index=0;
    for(const unit of units)for(const node of unit.members){node.x=Math.round(start+(index++)*gap);node.y=245+lv*315;placed.set(node.id,node.x+100)}
  }
  // Tras Organizar, centrar las personas visibles dentro de la zona útil, sin
  // taparlas con el inspector. La rueda permite seguir acercando o alejando.
  m163FitGraph();
  m122Remember();m122Draw();m122Inspector();showToast(m163T('Árbol organizado por generaciones','Tree arranged by generations'));
};

/* Navegación de árboles grandes: zoom sin mínimo rígido y Vista completa real. */
function m163FitGraph(){
  const g=m122Graph(),vp=document.getElementById('m122-viewport');if(!g?.nodes?.length||!vp)return false;
  const xs=g.nodes.map(n=>Number(n.x)||0),ys=g.nodes.map(n=>Number(n.y)||0);
  const minX=Math.min(...xs),maxX=Math.max(...xs)+(activeBoard()?.diagramMode==='genealogy'?200:204);
  const minY=Math.min(...ys),maxY=Math.max(...ys)+(activeBoard()?.diagramMode==='genealogy'?115:90);
  g.zoom=Math.max(.02,Math.min(1,(vp.clientWidth-72)/Math.max(200,maxX-minX),(vp.clientHeight-72)/Math.max(100,maxY-minY)));
  g.panX=(vp.clientWidth-(minX+maxX)*g.zoom)/2;
  g.panY=(vp.clientHeight-(minY+maxY)*g.zoom)/2;
  return true;
}
function m163ZoomAt(newZoom,atX,atY){
  const g=m122Graph(),vp=document.getElementById('m122-viewport');if(!g||!vp)return;
  const zoom=Math.min(2.5,Math.max(.02,newZoom)),x=(atX-g.panX)/g.zoom,y=(atY-g.panY)/g.zoom;
  g.panX=atX-x*zoom;g.panY=atY-y*zoom;g.zoom=zoom;
  m122Remember();m122Draw();
}
const m163PreviousGraphAction=m122GraphAction;
m122GraphAction=function(action){
  if(['zoom-in','zoom-out','zoom-reset'].includes(action)){
    const g=m122Graph(),vp=document.getElementById('m122-viewport');if(!g||!vp)return;
    if(action==='zoom-reset'){if(m163FitGraph()){m122Remember();m122Draw()}return}
    m163ZoomAt(g.zoom*(action==='zoom-in'?1.2:1/1.2),vp.clientWidth/2,vp.clientHeight/2);return;
  }
  return m163PreviousGraphAction(action);
};
const m163PreviousBindGraph=m122BindGraph;
m122BindGraph=function(){
  m163PreviousBindGraph();
  const vp=document.getElementById('m122-viewport');if(!vp)return;
  vp.addEventListener('wheel',event=>{
    if(!event.ctrlKey)return;
    event.preventDefault();event.stopImmediatePropagation();
    const r=vp.getBoundingClientRect();m163ZoomAt(m122Graph().zoom*(event.deltaY<0?1.12:1/1.12),event.clientX-r.left,event.clientY-r.top);
  },{capture:true,passive:false});
};

// Suprimir: sólo sobre tarjeta o relación seleccionada, nunca dentro de campos editables.
if(!window.m163DeleteBound){
  window.m163DeleteBound=true;
  window.addEventListener('keydown',event=>{
    if(!['Delete','Backspace'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
    if(state.view!=='boards'||activeBoard()?.diagramMode==='free'||!m122Selection)return;
    if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],.modal-backdrop,[role="dialog"]'))return;
    if(document.querySelector('.modal-backdrop'))return;
    event.preventDefault();event.stopImmediatePropagation();
    m122GraphAction(m122Selection.kind==='node'?'remove-node':'remove-edge');
  },true);
}

const m163PreviousRender=render;
render=function(){
  m163PreviousRender();
  m163ArrangeEditor();
  const v=document.querySelector('.brand .m11-version');if(v)v.textContent='1.6.3 · Desktop';
};

// Bootstrap after ALL deferred scripts (including onboarding hooks) have loaded.
window.addEventListener('DOMContentLoaded',()=>{void start();},{once:true});


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


/* MARGEN Desktop 1.6.5 — navegación y usabilidad.
 * Esta capa no transforma manuscritos ni cambia el formato de almacenamiento.
 */
const m165T=(es,en)=>m164T(es,en);

// La cronología mantiene sus campos editables y sus vínculos; solo retiramos dos accesos redundantes.
const m165PreviousTimeEditor=m131TimeEditor;
m131TimeEditor=function(p,t,event){
  return m165PreviousTimeEditor(p,t,event)
    .replace(/<div class="m131-editor-links">[\s\S]*?<\/div>/,'');
};

// El escritorio repetía la Biblioteca. Centralizamos en la Biblioteca la navegación.
const m165PreviousChangeView=changeView;
changeView=function(view){return m165PreviousChangeView(view==='desk'?'library':view)};

const m165RouteFields=['view','activeProjectId','activeChapterId','activeCharacterId','activeSettingId','activeBoardId','activeNoteId','activeOutlineId','activeChronologyId'];
const m165History=[];
let m165LastRoute=null,m165NavigatingBack=false,m165BackScroll=null;
function m165Route(){const r={};for(const key of m165RouteFields)r[key]=state?.[key]??null;return r;}
function m165RouteKey(r){return r?JSON.stringify(r):'';}
function m165SaveScroll(){
 const side=document.querySelector('.sidebar-scroll'),main=document.querySelector('.main-scroll');
 const scrolls={sidebar:side?.scrollTop??0,main:main?.scrollTop??0,view:state?.view,projectId:state?.activeProjectId};
 // También conservar el scroll de paneles interiores con nombre estable.
 scrolls.extra={};
 for(const s of ['.m13-shell','.m13-scene-list','.m131-time-scroll','.m142-reader-scroll','.m143-wide-writing','.m142-search-results']){
   const e=document.querySelector(s);if(e)scrolls.extra[s]=e.scrollTop;
 }
 return scrolls;
}
function m165RestoreScroll(scrolls,view,projectId,always=false){
 if(!scrolls)return;
 const side=document.querySelector('.sidebar-scroll');
 if(side&&(always||scrolls.projectId===projectId))side.scrollTop=scrolls.sidebar;
 if(always||(scrolls.view===view&&scrolls.projectId===projectId)){
   const main=document.querySelector('.main-scroll');if(main)main.scrollTop=scrolls.main;
   for(const [s,v] of Object.entries(scrolls.extra||{})){const e=document.querySelector(s);if(e)e.scrollTop=v}
 }
}
function m165Back(){
 if(!m165History.length)return;
 const saved=m165History.pop();m165NavigatingBack=true;
 try{
   m165BackScroll=saved.scroll||null;
   for(const field of m165RouteFields)state[field]=saved.route[field]??null;
   changed();render();
 }finally{m165NavigatingBack=false;m165BackScroll=null}
}
function m165BackButton(){
 const nav=document.querySelector('.topnav');if(!nav)return;
 if(!nav.querySelector('.m165-back')){
  const btn=document.createElement('button');btn.type='button';btn.className='toplink m165-back';
  btn.title=m165T('Volver a la página anterior','Go back to the previous page');btn.setAttribute('aria-label',btn.title);
  btn.innerHTML=ic('back');btn.onclick=m165Back;nav.prepend(btn);
 }
 const btn=nav.querySelector('.m165-back');btn.disabled=!m165History.length;
}

// Fichas: una segunda fila con Rasgos físicos | Trasfondo | Vínculos.
function m165CharacterLayout(){
 if(state.view!=='characters')return;
 const grid=document.querySelector('.char-page .char-grid');
 if(!grid)return;
 const pair=grid.querySelector(':scope > .m164-character-pair');
 // Los campos tienen el mismo ID en español e ingles. No dependemos de los encabezados.
 const physical=[...grid.querySelectorAll(':scope > .char-panel')].find(el=>el.querySelector('[data-char-field="physical"]'));
 if(pair&&physical){
   pair.prepend(physical);
   pair.classList.add('m165-character-triple');
   physical.classList.add('m165-physical');
 }
 const evolution=grid.querySelector('.m164-evolution');
 if(evolution){
   evolution.classList.add('m165-evolution');
   const container=evolution.closest('.char-panel');
   if(container)container.classList.add('m165-evolution-panel');
   const summary=evolution.querySelector(':scope > summary');
   if(summary){
     const person=activeCharacter(),count=(person?.arc||[]).length;
     summary.innerHTML=`${ic('clock')} <span>${m165T('Evolución por capítulos','Chapter-by-chapter evolution')}</span><small>${count}</small>${ic('chevron')}`;
   }
 }
}

// Biblioteca: búsqueda, ordenación de tarjetas y elementos marcados para revisar.
function m165Library(){
 if(state.view!=='library')return;
 const root=document.querySelector('.main-scroll'),grid=root?.querySelector('.projects-grid'),head=document.querySelector('.workspace-head');
 if(!root||!grid||!head)return;
 root.querySelector(':scope>.section-intro')?.remove();
 const actions=head.querySelector('.head-actions')||document.createElement('div');
 if(!actions.parentElement){actions.className='head-actions m165-library-actions';head.append(actions)}
 // La importación de Word es añadida por el código existente. Conservamos su evento.
 const importButton=head.querySelector('.m14-import-open');if(importButton)actions.append(importButton);
 const create=head.querySelector('[data-action="add-project"]');if(create)actions.append(create);
 const cards=[...grid.querySelectorAll(':scope > .project-card:not(.new)')];
 const tools=document.createElement('div');tools.className='m165-library-tools';
 tools.innerHTML=`<label class="m165-library-search">${ic('text')}<input id="m165-search" type="search" autocomplete="off" placeholder="${m165T('Buscar entre tus libros…','Search your books…')}" aria-label="${m165T('Buscar libros','Search books')}"></label><label class="m165-library-sort"><span>${m165T('Ordenar por','Sort by')}</span><select id="m165-sort"><option value="name">${m165T('Título (A–Z)','Title (A–Z)')}</option><option value="created">${m165T('Más recientes','Newest first')}</option><option value="chapters">${m165T('Más capítulos','Most chapters')}</option></select></label>`;
 grid.before(tools);
 const query=tools.querySelector('#m165-search'),sort=tools.querySelector('#m165-sort');
 const apply=()=>{
  const q=query.value.toLocaleLowerCase().trim();
  cards.forEach(card=>{const p=state.projects.find(x=>x.id===card.querySelector('[data-action="open-project"]')?.dataset.id);card.hidden=!!q&&!`${p?.name||''} ${p?.description||''}`.toLocaleLowerCase().includes(q)});
  const ordered=[...cards].sort((a,b)=>{
   const p=state.projects.find(x=>x.id===a.querySelector('[data-action="open-project"]')?.dataset.id),r=state.projects.find(x=>x.id===b.querySelector('[data-action="open-project"]')?.dataset.id);
   if(sort.value==='chapters')return (r?.chapters.length||0)-(p?.chapters.length||0);
   if(sort.value==='created')return String(r?.createdAt||'').localeCompare(p?.createdAt||'');
   return String(p?.name||'').localeCompare(String(r?.name||''),m145Prefs().language==='en'?'en':'es');
  });
  const newCard=grid.querySelector(':scope > .project-card.new');
  for(const c of ordered){if(newCard)newCard.before(c);else grid.append(c)}
 };
 query.oninput=apply;sort.onchange=apply;apply();
 const marked=[];
 const map={chapters:'manuscript',boards:'boards',characters:'characters',settings:'settings',outlines:'outlines',chronologies:'chronologies'};
 for(const p of state.projects)for(const [key,view] of Object.entries(map))for(const item of p[key]||[])if(item.flagged)marked.push({p,item,view});
 const block=document.createElement('details');block.className='m165-library-review';
 block.innerHTML=`<summary>${ic('flag')} <span>${m165T('Elementos por revisar','Items to review')}</span><strong>${marked.length}</strong>${ic('chevron')}</summary><div class="m165-library-review-items">${marked.length?marked.slice(0,50).map((o,i)=>`<button type="button" class="btn" data-m165-review="${i}">${esc(o.p.name)} · ${esc(o.item.title||m165T('Sin título','Untitled'))}</button>`).join(''):`<p>${m165T('No hay elementos marcados para revisar.','No items are marked for review.')}</p>`}</div>`;
 grid.before(block);
 block.querySelectorAll('[data-m165-review]').forEach(btn=>btn.onclick=()=>{
   const {p,item,view}=marked[Number(btn.dataset.m165Review)];
   state.activeProjectId=p.id;const idKey=({manuscript:'activeChapterId',boards:'activeBoardId',characters:'activeCharacterId',settings:'activeSettingId',outlines:'activeOutlineId',chronologies:'activeChronologyId'})[view];
   state[idKey]=item.id;state.view=view;changed();render();
 });
}

function m165ChronologyHeader(){
 if(state.view!=='chronologies')return;
 const title=document.querySelector('.workspace-head h1');
 if(title&&/^Línea temporal$|^Timeline$/i.test(title.textContent.trim()))title.remove();
}
function m165SimplifyPreferences(){
 const root=document.querySelector('.m145-config-backdrop');if(!root)return;
 for(const el of root.querySelectorAll('p,small,span,h2,h3')){
  const text=el.textContent.trim();if(['Puedes modificar estas preferencias siempre que quieras.','Ajustes generales.','You can change these preferences whenever you want.','General settings.'].includes(text))el.remove();
 }
}
const m165EarlierConfig=m145ConfigMarkup;
m145ConfigMarkup=function(p,welcome){
 return m165EarlierConfig(p,welcome)
   .replace('<p>Puedes modificar estas preferencias siempre que quieras.</p>','')
   .replace('<p>Change these preferences whenever you like.</p>','')
   .replace('<span class="m145-save-note">Ajustes generales</span>','')
   .replace('<span class="m145-save-note">General settings</span>','');
};

// Traducción de textos de ejemplo y etiquetas en formularios que estaban pendientes.
Object.assign(m145En,{
  'Rasgos físicos':'Physical traits','Evolución por capítulos':'Chapter-by-chapter evolution',
  'Capítulos vinculados':'Linked chapters','Acontecimientos de sus cronologías':'Timeline events',
  'Línea temporal':'Timeline','Cronologías':'Timelines','Abrir capítulo':'Open chapter',
  'Abrir personaje':'Open character','Añadir escenario':'Add setting',
  'Lugar puntual (aeropuerto…)':'One-off location (airport…)',
  'Personaje puntual…':'One-off character…','Primer acontecimiento':'First event',
  'Inicio':'Start','Final':'End','Ordenar por':'Sort by',
  'La ciudad de las cenizas':'The Ashes of Northbridge',
  '¿De qué trata tu historia?':'What is your story about?',
  'Da vida a tus personajes':'Bring your characters to life',
  'Manuscrito y escenas escritas':'Manuscript and written scenes',
  'Notas visuales, diagramas y sellos':'Visual notes, diagrams and stamps',
  'Fichas y evolución':'Character sheets and development',
  'Lugares y referencias':'Locations and references',
  'Planificación de escenas':'Scene planning',
  'Acontecimientos y tiempo narrativo':'Events and narrative time',
  'Archivo y papelera se mantienen visibles para que nunca pierdas el acceso a lo archivado.':'Archive and trash stay visible so you can always recover archived items.',
  'Buscar entre tus libros…':'Search your books…','Ajustes generales.':'General settings.',
  'Puedes modificar estas preferencias siempre que quieras.':'You can change these preferences any time.'
});

// Contadores de las secciones vinculadas: idioma del sistema, no del contenido.
// La traduccion de texto dinamico se mantiene independiente de los nombres escritos por el usuario.
const m165PreviousDynamic=m145Dynamic;
m145Dynamic=function(text){
 if(m145Prefs().language==='en'){
   const match=text.trim().match(/^(\d+) elementos?$/i);
   if(match)return text.replace(match[0],`${match[1]} ${Number(match[1])===1?'item':'items'}`);
 }
 return m165PreviousDynamic(text);
};

// Los valores por defecto escritos en inputs no pasan por el traductor del DOM.
// Traducimos el título inicial de capítulos nuevos sin tocar capítulos guardados.
const m165PreviousAddChapter=addChapter;
addChapter=function(){
 // El cuadro de creación se monta inmediatamente; por eso adaptamos solo el valor
 // predeterminado en el input y NUNCA cambiamos títulos de capítulos existentes.
 m165PreviousAddChapter();
 if(m145Prefs().language!=='en')return;
 const input=document.querySelector('.modal-backdrop #m-title');
 if(input&&/^Capítulo \d+$/.test(input.value))input.value=input.value.replace(/^Capítulo /,'Chapter ');
};

// Evita perder la posición de la barra lateral al crear fichas/capítulos,
// y del panel principal al añadir personas o lugares puntuales a una escaleta.
const m165PreviousRender=render;
render=function(){
 if(state?.view==='desk')state.view='library';
 const oldRoute=m165LastRoute,now=m165Route(),oldView=oldRoute?.view;
 const previous=m165SaveScroll();
 if(oldRoute&&m165RouteKey(oldRoute)!==m165RouteKey(now)&&!m165NavigatingBack){
   m165History.push({route:oldRoute,scroll:previous});
   if(m165History.length>70)m165History.shift();
 }
 m165PreviousRender();
 // La vista de Escritorio está fusionada con Biblioteca; también enlaces antiguos.
 document.querySelectorAll('[data-action="desk"]').forEach(btn=>{btn.dataset.action='library';if(btn.classList.contains('toplink'))btn.remove()});
 m165CharacterLayout();m165ChronologyHeader();m165Library();m165SimplifyPreferences();
 m165BackButton();
 m165RestoreScroll(m165BackScroll||previous,state.view,state.activeProjectId,!!m165BackScroll);
 m165LastRoute=m165Route();
 const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.6.6 · Desktop';
};

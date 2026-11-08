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
 const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.6.5 · Desktop';
};

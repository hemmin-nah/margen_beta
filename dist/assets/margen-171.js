/* MARGEN 1.7.1 · Lanzamiento y tutorial por secciones.
   La visita es informativa: NO modifica vínculos, fichas ni textos del usuario. */
'use strict';
const m171Sections=[
 {id:'library',icon:'book',view:'library',es:['Biblioteca y proyectos','Crear, encontrar, organizar y proteger tus libros.'],en:['Library and projects','Create, find, organize and protect your books.'],steps:[
  {view:'library',targets:['.workspace-head h1','.workspace-head'],es:['Tu Biblioteca','Cada libro es un proyecto separado. Puedes buscar por título o sinopsis y ordenar la biblioteca sin mover ni renombrar sus archivos.'],en:['Your Library','Each book is a separate project. Search titles or synopses, and sort your library without changing the original books.']},
  {view:'library',targets:['[data-action="add-project"]','.m165-library-actions','.workspace-head'],es:['Crear un libro','Nuevo libro crea un espacio independiente: capítulos, personajes, escenarios, pizarras, escaletas y cronología. Configura sus secciones en la barra lateral.'],en:['Create a book','New book creates an independent workspace with chapters, characters, locations, boards, outlines and timelines. Configure its sections in the sidebar.']},
  {view:'book',targets:['.sidebar-scroll','.sidebar','.workspace-head'],es:['La organización del libro','El árbol lateral no es solo un menú: puedes reordenar los capítulos arrastrándolos, archivar elementos y ocultar secciones que no uses.'],en:['Organizing a book','The sidebar is more than navigation: drag chapters to reorder them, archive items and hide sections you do not use.']},
  {view:'library',targets:['[data-action="backup"]','.header-right'],es:['Copias de seguridad','El botón de descarga de la barra superior genera un JSON de toda la biblioteca. Guárdalo fuera de MARGEN antes de actualizar o mover de ordenador.'],en:['Backups','Use the download button in the top bar to export a JSON backup of your library. Keep an external copy before updating or changing computers.']}
 ]},
 {id:'writing',icon:'edit',view:'manuscript',es:['Editor e importación','Tres vistas, importación de Word y consultas mientras escribes.'],en:['Writing and importing','Three views, Word import and reference panels while writing.'],steps:[
  {view:'manuscript',targets:['.m1431-mode-center','.m142-view-switch','.workspace-head'],es:['Dos maneras de trabajar','Editar permite escribir y dar formato; Lectura continua reúne los capítulos para leerlos seguidos. La flecha recoge las herramientas cuando quieras más espacio.'],en:['Two ways to work','Edit lets you write and format; Continuous reading joins chapters for uninterrupted reading. Use the arrow to hide tools when you want more space.']},
  {view:'manuscript',targets:['#m161-sheets-button','.m161-right-tools','.m1431-mode-center','.workspace-head'],es:['Consultar fichas sin salir','Abre Fichas o Referencias para consultar personajes, escenarios y vínculos en un panel lateral, sin abandonar el capítulo. Buscar en libro también utiliza un panel.'],en:['Refer to sheets as you write','Open Sheets or References to browse characters, locations and links in a side panel without leaving the chapter. Search in book also uses a side panel.']},
  {view:'book',targets:['.sidebar-scroll','.workspace-head'],es:['Orden y modos de capítulo','Arrastra capítulos en el árbol lateral para cambiar su orden. Cada capítulo puede escribirse como novela o guion sin crear un libro diferente.'],en:['Chapter order and modes','Drag chapters in the sidebar to reorder them. A chapter can use prose or screenplay formatting without needing a different book.']},
  {view:'book',targets:['[data-action="import-manuscript"]','.workspace-head'],es:['Importar Word con control','El asistente de importación permite revisar, unir, dividir en el cursor, ordenar y deshacer pasos antes de incorporar capítulos. Conserva el formato compatible de DOCX.'],en:['Import Word with control','Review, merge, split at the cursor, reorder and undo steps in the import wizard before adding chapters. Compatible DOCX formatting is retained.']}
 ]},
 {id:'boards',icon:'board',view:'boards',es:['Pizarras libres','Notas, imágenes, cajas de texto y dibujo vectorial.'],en:['Freeform boards','Notes, pictures, text boxes and vector drawing.'],steps:[
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Un lienzo sin páginas','Las pizarras son espacios visuales independientes. Puedes crear notas, cajas de texto, imágenes y fondos de puntos o rayas, además de organizar objetos en capas.'],en:['A canvas without pages','Each board is its own visual space for notes, text boxes, images, dotted or lined backgrounds, and layered objects.']},
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Mover frente a editar','Arrastra la CAJA de texto completa para moverla. Haz doble clic cuando quieras modificar sus palabras; las imágenes y notas también se pueden desplazar.'],en:['Move versus edit','Drag the entire text BOX to reposition it. Double-click when you want to edit its words. Images and notes can be moved too.']},
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Lápiz y zoom','Dibuja trazos vectoriales para que se mantengan nítidos al ampliar. La rueda controla el zoom; también puedes desplazarte por el lienzo.'],en:['Pen and zoom','Draw vector strokes that stay crisp when zoomed in. The wheel controls zoom and you can pan around the canvas.']},
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Sellos que se estampan','Elige un sello y pulsa tantas veces como quieras sobre la pizarra para repetirlo. Esc sale de la herramienta; los sellos antiguos en PNG siguen admitidos.'],en:['Repeatable stamps','Select a stamp, then click repeatedly on the board to print it again. Escape exits the tool; older PNG stamps remain supported.']}
 ]},
 {id:'family',icon:'users',view:'boards',es:['Genealogía','Árboles por generaciones y parentescos confirmados o sugeridos.'],en:['Family trees','Generational trees with confirmed and suggested family ties.'],steps:[
  {view:'boards',targets:['.m144-mode-label','.boardbar','.workspace-head'],es:['Modo Genealogía','Dentro de una pizarra elige Genealogía. Crea tarjetas para cada persona o enlázalas a fichas de personaje existentes.'],en:['Family tree mode','Choose Family tree within a board. Create a person card or connect it to an existing character sheet.']},
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Parentescos reales','Vincula personas como progenitores, hijos, hermanos o parejas. Organizar coloca generaciones en niveles; los abuelos o primos derivados no necesitan una línea extra por cada parentesco.'],en:['Real family relationships','Connect parents, children, siblings and partners. Arrange places generations in levels; derived grandparents and cousins do not require another line for every relationship.']},
  {view:'boards',targets:['.m122-diagram-aside','.boardbar','.workspace-head'],es:['Confirmar relaciones sugeridas','Al añadir un cónyuge o hermano, MARGEN puede sugerir progenitores compartidos. La sugerencia queda pendiente a la derecha: confirma cada progenitor, márcalo como adoptivo o padrastro, o descártalo.'],en:['Confirm suggested relationships','Adding a spouse or sibling may suggest shared parents. Suggestions wait in the right panel: confirm each parent, select adoption or stepparent, or dismiss them.']},
  {view:'boards',targets:['.m122-diagram-aside','.boardbar','.workspace-head'],es:['Corregir sin perder el árbol','Puedes mover tarjetas, ensanchar el panel derecho, eliminar con Supr y usar Ctrl+Z/Ctrl+Y para deshacer y rehacer cambios del diagrama.'],en:['Edit without losing the tree','Move cards, resize the right panel, delete with Delete and undo/redo diagram changes with Ctrl+Z/Ctrl+Y.']}
 ]},
 {id:'relations',icon:'link',view:'boards',es:['Relaciones entre personajes','Vínculos narrativos, direcciones y conexión con fichas.'],en:['Character relationships','Narrative connections, directions and linked sheets.'],steps:[
  {view:'boards',targets:['.m144-mode-label','.boardbar','.workspace-head'],es:['Modo Relaciones','Selecciona Relaciones dentro de una pizarra para representar amistades, rivalidades, secretos u otros vínculos narrativos; no tiene que ser parentesco.'],en:['Relationships mode','Choose Relationships within a board to map friendships, rivalries, secrets and other narrative connections, not only family ties.']},
  {view:'boards',targets:['.m122-diagram-aside','.boardbar','.workspace-head'],es:['Origen y destino','Las conexiones pueden tener sentido y etiqueta: quién conoce, protege, engaña o persigue a quién. Ajusta la relación desde su panel de detalles.'],en:['Source and target','A connection can have a direction and label: who knows, protects, deceives or pursues whom. Edit the link in its details panel.']},
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Vínculos reutilizables','Cuando una tarjeta está asociada a una ficha, sus conexiones pueden aparecer automáticamente en la sección Vínculos del personaje. No hace falta escribirlas otra vez.'],en:['Reusable connections','When a card is linked to a character sheet, its connections can appear in that character’s Connections section automatically. No double entry.']},
  {view:'boards',targets:['.boardbar','.workspace-head'],es:['Organizar y deshacer','Organizar separa las tarjetas para leer los nombres de las conexiones. Utiliza Supr para borrar y Ctrl+Z/Ctrl+Y para recuperar cambios.'],en:['Arrange and undo','Arrange spreads cards out so link labels remain readable. Delete removes items; Ctrl+Z/Ctrl+Y restores changes.']}
 ]},
 {id:'characters',icon:'users',view:'characters',es:['Personajes y escenarios','Fichas completas, evolución, galerías y referencias.'],en:['Characters and locations','Full sheets, evolution, galleries and references.'],steps:[
  {view:'characters',targets:['.workspace-head','.sidebar-scroll'],es:['Las fichas no son obligatorias','Crea personajes con datos, personalidad, rasgos físicos, trasfondo y fotografías. También puedes escribir personajes menores sin completar todos los campos.'],en:['Sheets are optional tools','Build characters with details, personality, physical traits, backstory and photos. Minor characters do not need every field completed.']},
  {view:'characters',targets:['.workspace-head','.sidebar-scroll'],es:['Evolución por capítulos','Despliega Evolución cuando necesites reflejar cómo cambia un personaje a lo largo de la historia. Cada etapa tiene su propio contenido plegable.'],en:['Chapter-by-chapter evolution','Open Evolution when you need to track how a character changes throughout the story. Each stage has its own collapsible content.']},
  {view:'characters',targets:['.workspace-head','.sidebar-scroll'],es:['Vínculos sin duplicar información','La tarjeta Vínculos resume las relaciones de Genealogía y Relaciones vinculadas a ese personaje. Se consultan desde la ficha y se modifican en los diagramas.'],en:['Connections without repetition','The Connections card summarizes family and relationship links for this character. Read them from the sheet and edit them in the diagrams.']},
  {view:'settings',targets:['.workspace-head','.sidebar-scroll'],es:['Escenarios detallados o puntuales','Puedes crear fichas de lugares con imágenes, atmósfera e historia. Si un lugar solo aparece una vez, también puedes mencionarlo en una escena de escaleta sin ficha completa.'],en:['Full or one-off locations','Location sheets can hold images, atmosphere and history. A one-off place can instead be named in an outline scene without creating a full sheet.']}
 ]},
 {id:'planning',icon:'clock',view:'outlines',es:['Escaletas y cronología','Ordena escenas y sigue los acontecimientos de tu historia.'],en:['Outlines and timelines','Plan scenes and follow events in your story.'],steps:[
  {view:'outlines',targets:['.workspace-head','.sidebar-scroll'],es:['Escaletas por bloques','Organiza escenas en actos o bloques, alterna entre lista y tarjetas y arrastra escenas entre bloques. Puedes plegar partes para trabajar sin saturarte.'],en:['Outlines in sections','Organize scenes in acts or sections, switch between list and cards and drag scenes across sections. Collapse parts to reduce clutter.']},
  {view:'outlines',targets:['.workspace-head','.sidebar-scroll'],es:['Lo opcional de cada escena','Objetivo, Conflicto y Consecuencia viven juntos dentro de un bloque plegable. No es obligatorio completarlos para poder escribir la escena.'],en:['Optional scene structure','Goal, Conflict and Consequence live together in a collapsible group. You do not have to complete them to write the scene.']},
  {view:'outlines',targets:['.workspace-head','.sidebar-scroll'],es:['Personajes y lugares puntuales','Puedes vincular fichas existentes o escribir personas y lugares que solo intervienen en una escena, sin crear fichas permanentes.'],en:['People and one-off places','Link existing character/location sheets or type a person or place used in a single scene without creating a permanent sheet.']},
  {view:'chronologies',targets:['.workspace-head','.sidebar-scroll'],es:['Cronología visual','Coloca acontecimientos en la línea temporal y relaciónalos con varios personajes o capítulos. La cronología y la escaleta son herramientas distintas.'],en:['Visual timeline','Place events on the timeline and link each one to several characters or chapters. The timeline and the outline are separate tools.']}
 ]},
 {id:'references',icon:'link',view:'book',es:['Referencias y seguridad','Dónde aparece cada ficha y cómo proteger tus proyectos.'],en:['References and safety','Where sheets are used and how to protect your projects.'],steps:[
  {view:'characters',targets:['.workspace-head','.sidebar-scroll'],es:['Referencias a una ficha','En la ficha puedes consultar capítulos, escenas y diagramas donde se utiliza ese personaje o lugar y saltar directamente a ellos.'],en:['References to a sheet','From a sheet you can see the chapters, scenes and diagrams using a character or location and jump directly to them.']},
  {view:'manuscript',targets:['.m1431-mode-center','.workspace-head'],es:['Referencias en el editor','El panel Referencias del capítulo permite acceder a sus personajes, escenarios, escenas y acontecimientos relacionados sin abandonar la escritura.'],en:['References in the editor','The chapter References panel lets you reach associated characters, locations, scenes and events without leaving your writing.']},
  {view:'book',targets:['.workspace-head','.sidebar-scroll'],es:['Comprobar enlaces','La Vista general puede detectar referencias a fichas que ya no existen. MARGEN te avisa antes de limpiar vínculos: no borra información automáticamente.'],en:['Check for broken links','Book overview can detect references to missing sheets. MARGEN warns you before cleaning links and does not automatically delete information.']},
  {view:'library',targets:['[data-action="backup"]','.header-right'],es:['Recuperación y copias','Una copia JSON externa protege todos tus libros. Guarda copias antes de actualizar, exportar datos o probar cambios importantes.'],en:['Recovery and backups','An external JSON backup protects your library. Save copies before updates, data transfers or major experiments.']}
 ]}
];
const m171Lang=()=>m145Prefs().language==='en'?'en':'es';
const m171T=(es,en)=>m171Lang()==='en'?en:es;
const m171Label=section=>section[m171Lang()];
const m171Title=section=>m171Label(section)[0];
const m171Safe=s=>esc(s);
let m171Picker=null;
function m171PickerHtml(){
 const en=m171Lang()==='en';
 return `<section class="m171-guide-picker" role="dialog" aria-modal="true" aria-labelledby="m171-guide-title">
  <div class="m171-guide-heading"><span class="m171-guide-eyebrow">MARGEN · ${en?'LEARN THE TOOLS':'CONOCE LAS HERRAMIENTAS'}</span><h2 id="m171-guide-title">${en?'What would you like to explore?':'¿Qué te gustaría explorar?'}</h2><p>${en?'Choose a section. Each short tour explains specific tools and can be skipped at any time. Nothing in your books will be changed.':'Elige una sección. Cada recorrido explica herramientas concretas, puedes saltarlo cuando quieras y no modifica tus libros.'}</p></div>
  <div class="m171-guide-grid">${m171Sections.map(sec=>`<button type="button" class="m171-guide-topic" data-m171-section="${sec.id}">${ic(sec.icon)}<span><strong>${m171Safe(m171Title(sec))}</strong><small>${m171Safe(m171Label(sec)[1])}</small><em>${sec.steps.length} ${en?'steps':'pasos'}</em></span></button>`).join('')}</div>
  <div class="m171-guide-bottom"><span>${en?'You can reopen this guide from Help.':'Puedes volver desde Ayuda cuando quieras.'}</span><button type="button" class="btn ghost" data-m171-guide-close>${en?'Close':'Cerrar'}</button></div>
 </section>`;
}
function m171OpenPicker(){
 m170CloseHelp();document.querySelector('[data-m170-tour-offer]')?.remove();
 if(m170Tour)m171StopTour(false,false);
 m171Picker?.remove();
 const root=document.createElement('div');root.className='m171-guide-backdrop';root.dataset.m171Picker='';root.innerHTML=m171PickerHtml();document.body.append(root);m171Picker=root;
 root.querySelectorAll('[data-m171-section]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.m171Section;m171ClosePicker();m171StartSection(id);}));
 root.querySelector('[data-m171-guide-close]').onclick=()=>m171ClosePicker();
 root.querySelector('[data-m171-section]')?.focus();
}
function m171ClosePicker(){m171Picker?.remove();m171Picker=null;}
// Existing first-run invitation now opens the section chooser, not a generic eight-step tour.
m170OfferTour=function(){
 if(document.querySelector('[data-m170-tour-offer]'))return;
 const en=m171Lang();const layer=document.createElement('div');layer.className='m170-tour-offer-backdrop';layer.dataset.m170TourOffer='';
 layer.innerHTML=`<section class="m170-tour-offer" role="dialog" aria-modal="true" aria-labelledby="m171-invite-title"><div class="m170-offer-symbol">${ic('book')}</div><span class="m170-eyebrow">MARGEN · ${en==='en'?'GUIDED TOUR':'VISITA GUIADA'}</span><h2 id="m171-invite-title">${en==='en'?'Discover what makes MARGEN different':'Descubre las herramientas de MARGEN'}</h2><p>${en==='en'?'Explore writing, boards, family trees, relationships, outlines and references. Pick only the sections you are interested in.':'Conoce cómo funcionan las pizarras, genealogías, relaciones, escaletas y referencias. Elige solo las secciones que te interesen.'}</p><div class="m170-tour-offer-actions"><button type="button" class="btn ghost" data-m170-not-now>${en==='en'?'Not now':'Ahora no'}</button><button type="button" class="btn primary" data-m170-start-tour>${en==='en'?'Choose a section':'Elegir sección'} ${ic('right')}</button></div></section>`;
 document.body.append(layer);
 layer.querySelector('[data-m170-not-now]').onclick=()=>{layer.remove();m170PersistTourSeen();};
 layer.querySelector('[data-m170-start-tour]').onclick=()=>{layer.remove();m170PersistTourSeen();m171OpenPicker();};
 layer.querySelector('[data-m170-start-tour]').focus();
};
// The existing Help menu keeps its welcome preview and now opens the section index.
m170StartTour=function(){m171OpenPicker();};
function m171StartSection(id){
 const section=m171Sections.find(s=>s.id===id);if(!section)return;
 if(m170Tour)m171StopTour(false,false);
 m170CloseHelp();m171ClosePicker();
 m170PriorFocus=document.activeElement;
 const previewBoard=(id==='family'||id==='relations')?activeBoard():null;
 m170Tour={sectionId:id,section,steps:section.steps,index:0,route:m170SnapshotRoute(),
  boardId:previewBoard?.id||null,boardSnapshot:previewBoard?structuredClone(previewBoard):null,
  mainScroll:document.querySelector('.main-scroll')?.scrollTop||0,sidebarScroll:document.querySelector('.sidebar-scroll')?.scrollTop||0};
 const shell=document.createElement('div');shell.className='m170-tour-root';shell.dataset.m170Tour='';
 shell.innerHTML='<div class="m170-tour-blocker"></div><div class="m170-spotlight" aria-hidden="true"></div><section class="m170-tour-popover m171-tour-popover" role="dialog" aria-modal="true" aria-live="polite"></section>';
 document.body.append(shell);m171ShowStep(0);
}
function m171StopTour(markSeen=true,reopen=false){
 const tour=m170Tour;if(!tour)return;
 m170Tour=null;document.querySelector('[data-m170-tour]')?.remove();
 if(tour.route&&state){
  // Restore the exact board state after temporary mode previews. Never persist tutorial data.
  if(tour.boardSnapshot){
   const p=activeProject(),index=p?.boards?.findIndex(b=>b.id===tour.boardId);
   if(index>=0)p.boards[index]=tour.boardSnapshot;
  }
  const prior=m165NavigatingBack;m165NavigatingBack=true;
  try{Object.assign(state,tour.route);render();}finally{m165NavigatingBack=prior;}
  const main=document.querySelector('.main-scroll'),sidebar=document.querySelector('.sidebar-scroll');
  if(main)main.scrollTop=tour.mainScroll;if(sidebar)sidebar.scrollTop=tour.sidebarScroll;
 }
 if(markSeen)m170PersistTourSeen();
 if(reopen)m171OpenPicker();else if(m170PriorFocus?.isConnected)m170PriorFocus.focus();
}
m170StopTour=function(markSeen=true){m171StopTour(markSeen,false);};
m170StepElement=function(index){
 const tour=m170Tour;if(!tour)return null;
 const step=tour.steps[index];if(!step)return null;
 for(const selector of step.targets||[]){const node=document.querySelector(selector);if(node&&node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0)return node;}
 return document.querySelector('.workspace-head')||document.querySelector('.header')||document.querySelector('.shell');
};
function m171ShowStep(index){
 if(!m170Tour)return;
 const tour=m170Tour;index=Math.max(0,Math.min(tour.steps.length-1,index));tour.index=index;
 const step=tour.steps[index];
 // Preview the correct board mode without saving: keep a snapshot for restoration.
 const previewMode=tour.sectionId==='family'?'genealogy':tour.sectionId==='relations'?'relations':null;
 const board=previewMode?activeBoard():null;
 if(board&&board.diagramMode!==previewMode)board.diagramMode=previewMode;
 const wasAlreadyOnView=state?.view===step.view;
 m170NavigateForTour(step);
 if(wasAlreadyOnView&&previewMode)render();
 const [title,description]=step[m171Lang()];
 const t=m170Text();const pop=document.querySelector('.m170-tour-popover');if(!pop)return;
 pop.innerHTML=`<div class="m170-tour-kicker"><button type="button" class="m171-tour-section-back" data-m171-index>‹ ${m171Safe(m171Title(tour.section))}</button><span>${index+1} ${t.stepOf} ${tour.steps.length}</span></div><div class="m170-tour-progress">${tour.steps.map((_,i)=>`<span class="${i<=index?'done':''}"></span>`).join('')}</div><h2>${m171Safe(title)}</h2><p>${m171Safe(description)}</p><div class="m170-tour-actions"><button type="button" class="btn ghost m170-tour-skip">${t.skip}</button><div class="m170-tour-controls"><button type="button" class="btn" data-m170-prev ${index===0?'disabled':''}>${t.back}</button><button type="button" class="btn primary" data-m170-next>${index===tour.steps.length-1?m171T('Más secciones','Other sections'):t.next} ${ic('right')}</button></div></div>`;
 pop.querySelector('.m170-tour-skip').onclick=()=>m171StopTour(true,false);
 pop.querySelector('[data-m171-index]').onclick=()=>m171StopTour(true,true);
 pop.querySelector('[data-m170-prev]').onclick=()=>m171ShowStep(tour.index-1);
 pop.querySelector('[data-m170-next]').onclick=()=>index===tour.steps.length-1?m171StopTour(true,true):m171ShowStep(tour.index+1);
 const target=m170StepElement(index);
 if(target)target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 requestAnimationFrame(()=>{m170PositionSpotlight();pop.querySelector('[data-m170-next]')?.focus({preventScroll:true});});
}
m170ShowStep=function(index){m171ShowStep(index);};
// Allow Escape in the topic index. The existing Escape handler covers a running tour.
window.addEventListener('keydown',e=>{if(m171Picker&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();m171ClosePicker();}},true);
// Startup art: visible while the actual application initializes, with no artificial waiting.
const m171PriorStart=start;
start=async function(){
 try{await m171PriorStart();}
 finally{
  const splash=document.querySelector('[data-m171-splash]');
  if(splash)requestAnimationFrame(()=>splash.remove());
 }
};
const m171PriorRender=render;
render=function(){m171PriorRender();const v=document.querySelector('.brand .m11-version');if(v)v.textContent='1.7.1 · Desktop';};

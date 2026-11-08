/* MARGEN 1.7.0 · Primera experiencia y visita guiada.
   Esta capa no modifica el esquema de los libros ni el almacenamiento SQLite.
   Se carga después del núcleo y ANTES de start(). */
'use strict';

const m170Strings = {
 es: {
  lang:'Idioma / Language', kicker:'UN LUGAR PARA TUS HISTORIAS',
  hero:'Las historias necesitan espacio.',
  description:'MARGEN es tu estudio para escribir, reunir ideas y dar forma a mundos propios. Sin distracciones, a tu manera.',
  start:'Preparar mi espacio', skipIntro:'Ir a la configuración', closePreview:'Cerrar presentación',preview:'Ver presentación inicial',
  points:[['01','Escribe','Un manuscrito para cada historia.'],['02','Imagina','Pizarras, personajes y escenarios.'],['03','Conecta','Todo lo que inventas, en un mismo lugar.']],
  tourTitle:'¿Te enseñamos MARGEN?',
  tourSubtitle:'Una visita breve a las herramientas principales. Puedes saltarla y volver a verla cuando quieras desde Ayuda.',
  startTour:'Empezar visita', later:'Ahora no',
  tour:'VISITA GUIADA', next:'Siguiente', back:'Anterior', finish:'Terminar', skip:'Saltar tutorial',
  help:'Ayuda',helpMenu:'Ayuda y tutorial',helpTitle:'Conoce MARGEN',
  replay:'Repetir visita guiada',helpHint:'Puedes explorar las herramientas a tu ritmo.',
  stepOf:'de', projectUnavailable:'Abre o crea un libro para explorar sus herramientas.',
  steps:[
   ['Tu Biblioteca','Aquí están todas tus historias. Desde aquí puedes buscarlas, ordenarlas y entrar en cualquier libro.'],
   ['Una historia nueva','Crea un libro independiente con sus propios capítulos, fichas y pizarras. También puedes importar textos que ya hayas escrito.'],
   ['Todo a mano','La barra lateral es tu índice: capítulos, personajes, lugares, pizarras, planificación y más. Puedes ocultar las secciones que no necesites.'],
   ['Escribir a tu manera','En el editor puedes cambiar de vista, buscar en el libro y consultar las fichas sin abandonar el capítulo.'],
   ['Pensar en imágenes','Las pizarras permiten añadir notas, cajas de texto, imágenes, trazos y sellos. También albergan Genealogía y Relaciones.'],
   ['Crear personajes','Las fichas guardan datos, imágenes, trasfondo y vínculos. Cada libro conserva sus propios personajes.'],
   ['Tus libros, a salvo','Aquí puedes exportar una copia JSON de seguridad. Hazlo periódicamente, especialmente antes de actualizar el programa.'],
   ['Siempre disponible','Desde Ayuda puedes repetir este recorrido cuando te apetezca, sin volver a configurar nada.']
  ]
 },
 en: {
  lang:'Language / Idioma', kicker:'A HOME FOR YOUR STORIES',
  hero:'Every story needs room to grow.',
  description:'MARGEN is your creative studio for writing, collecting ideas and building worlds. A quiet space, on your terms.',
  start:'Set up my workspace', skipIntro:'Go to settings',closePreview:'Close introduction',preview:'View the welcome screen',
  points:[['01','Write','A manuscript for every story.'],['02','Imagine','Boards, characters and locations.'],['03','Connect','Everything you create, in one place.']],
  tourTitle:'Take a look around?',
  tourSubtitle:'A short introduction to the main tools. Skip it now and take it again whenever you like from Help.',
  startTour:'Start the tour', later:'Not now',
  tour:'GUIDED TOUR', next:'Next', back:'Previous', finish:'Finish', skip:'Skip tour',
  help:'Help',helpMenu:'Help and tutorial',helpTitle:'Explore MARGEN',
  replay:'Replay guided tour',helpHint:'Explore the tools at your own pace.',
  stepOf:'of', projectUnavailable:'Open or create a book to explore its tools.',
  steps:[
   ['Your Library','All your stories live here. Search, sort and open any of your books.'],
   ['A new story','Create a separate book with its own chapters, sheets and boards. You can also import manuscripts you already have.'],
   ['Everything close at hand','The sidebar is your index: chapters, characters, places, boards, planning and more. Hide any sections you do not need.'],
   ['Write your way','Switch between writing views, search the book and browse sheets without leaving the chapter.'],
   ['Think visually','Boards hold notes, text boxes, pictures, vector strokes and stamps, plus family trees and relationship diagrams.'],
   ['Create characters','Character sheets keep details, pictures, backstory and relationships together. Each book has its own cast.'],
   ['Keep your stories safe','Export a JSON backup here. Make one regularly, especially before installing an update.'],
   ['Always here','You can replay this tour from Help at any time, without changing your settings.']
  ]
 }
};
let m170IntroLanguage='es',m170IntroWasShown=false,m170OfferWasShown=false,m170IntroPreview=false;
let m170Tour=null,m170HelpOpen=false,m170PriorFocus=null;
const m170Lang=()=>m145Prefs().language==='en'?'en':'es';
const m170Text=()=>m170Strings[m170Lang()];
const m170Safe=(s)=>esc(s);

function m170IntroMarkup(lang,preview=false){
 const t=m170Strings[lang];
 return `<div class="m170-intro-backdrop" data-m170-intro>
  <section class="m170-intro" role="dialog" aria-modal="true" aria-labelledby="m170-intro-title">
   <div class="m170-intro-copy">
    <div class="m170-intro-top"><div class="m170-intro-logo">${ic('feather')} <span>MARGEN</span></div><div class="m170-intro-language" role="group" aria-label="${t.lang}"><button type="button" data-m170-intro-lang="es" aria-pressed="${lang==='es'}">ES</button><span>·</span><button type="button" data-m170-intro-lang="en" aria-pressed="${lang==='en'}">EN</button></div></div>
    <div class="m170-intro-body"><div class="m170-intro-kicker">${t.kicker}</div><h1 id="m170-intro-title">${t.hero}</h1><p>${t.description}</p>
     <div class="m170-intro-features">${t.points.map(([n,label,desc])=>`<div class="m170-intro-feature"><span>${n}</span><div><strong>${label}</strong><small>${desc}</small></div></div>`).join('')}</div>
    </div>
    <div class="m170-intro-actions"><button class="btn primary m170-primary" type="button" data-m170-intro-go>${preview?t.closePreview:t.start} ${preview?'':ic('right')}</button>${preview?'':`<button class="btn ghost" type="button" data-m170-intro-skip>${t.skipIntro}</button>`}</div>
    <div class="m170-intro-foot">MARGEN <span>·</span> ${lang==='es'?'Estudio de escritura':'Writing studio'}</div>
   </div>
   <div class="m170-intro-art" aria-hidden="true"><div class="m170-art-topline"></div><div class="m170-art-page m170-art-back"></div><div class="m170-art-page m170-art-middle"></div><div class="m170-art-page m170-art-front"><span class="m170-art-chapter">I.</span><div class="m170-art-title"></div><div class="m170-art-ornament">✳</div>${Array.from({length:11},(_,i)=>`<i class="m170-art-line l${i}"></i>`).join('')}<span class="m170-art-bottom">M.</span></div><div class="m170-art-ink"></div><div class="m170-art-caption">A SPACE BETWEEN IDEAS & WORDS</div></div>
  </section>
 </div>`;
}
function m170OpenIntro(preview=false){
 if(document.querySelector('[data-m170-intro]'))return;
 if(!preview)m170IntroWasShown=true;
 m170IntroPreview=!!preview;m170IntroLanguage=m170Lang();
 m170PriorFocus=document.activeElement;
 const layer=document.createElement('div');layer.innerHTML=m170IntroMarkup(m170IntroLanguage,m170IntroPreview);
 const intro=layer.firstElementChild;
 document.body.append(intro);
 function draw(){intro.outerHTML=m170IntroMarkup(m170IntroLanguage,m170IntroPreview);bind(document.querySelector('[data-m170-intro]'));}
 function bind(root){
  root.querySelectorAll('[data-m170-intro-lang]').forEach(btn=>btn.onclick=()=>{m170IntroLanguage=btn.dataset.m170IntroLang;draw()});
  const finish=()=>{
   document.querySelector('[data-m170-intro]')?.remove();
   if(m170IntroPreview){m170IntroPreview=false;if(m170PriorFocus?.isConnected)m170PriorFocus.focus();return;}
   m170OpenSettingsOriginal(true);
   if(m170IntroLanguage==='en')document.querySelector('.m145-config-backdrop [data-m145-field="language"][data-value="en"]')?.click();
   m170WatchInitialSetup();
  };
  root.querySelector('[data-m170-intro-go]').onclick=finish;
  root.querySelector('[data-m170-intro-skip]')?.addEventListener('click',finish);
  root.querySelector('[data-m170-intro-go]')?.focus();
 }
 bind(intro);
}

function m170WatchInitialSetup(){
 // El formulario original cambia su contenido cada vez que se elige idioma/tema.
 // Observamos su CIERRE real en lugar de reemplazar los botones de guardado.
 const config=document.querySelector('.m145-config-backdrop');if(!config)return;
 const observer=new MutationObserver(()=>{
  if(config.isConnected)return;
  observer.disconnect();
  if(m145Prefs().onboarded&&!m170OfferWasShown){
   m170OfferWasShown=true;m170OfferTour();
  }
 });
 observer.observe(document.body,{childList:true});
}

const m170OpenSettingsOriginal=m145OpenSettings;
m145OpenSettings=function(welcome=false){
 if(welcome&&!m145Prefs().onboarded&&!m170IntroWasShown){m170OpenIntro();return;}
 m170OpenSettingsOriginal(welcome);
 if(welcome)m170WatchInitialSetup();
};

function m170OfferTour(){
 document.querySelector('[data-m170-tour-offer]')?.remove();
 const t=m170Text(),layer=document.createElement('div');
 layer.className='m170-tour-offer-backdrop';layer.dataset.m170TourOffer='';
 layer.innerHTML=`<section class="m170-tour-offer" role="dialog" aria-modal="true" aria-labelledby="m170-tour-offer-title">
  <div class="m170-offer-symbol">${ic('book')}</div><span class="m170-eyebrow">MARGEN · ${t.tour}</span><h2 id="m170-tour-offer-title">${t.tourTitle}</h2><p>${t.tourSubtitle}</p>
  <div class="m170-tour-offer-actions"><button type="button" class="btn ghost" data-m170-not-now>${t.later}</button><button type="button" class="btn primary" data-m170-start-tour>${t.startTour} ${ic('right')}</button></div></section>`;
 document.body.append(layer);
 layer.querySelector('[data-m170-not-now]').onclick=()=>{layer.remove();m170PersistTourSeen();};
 layer.querySelector('[data-m170-start-tour]').onclick=()=>{layer.remove();m170StartTour();};
 layer.querySelector('[data-m170-start-tour]').focus();
}
function m170PersistTourSeen(){
 if(!state)return;
 state.m170={...(state.m170||{}),tourOffered:true};changed();
}

const m170Steps=[
 {view:'library',target:'.workspace-head h1'},
 {view:'library',target:'.m165-library-actions [data-action="add-project"]'},
 {view:'book',target:'.sidebar-scroll'},
 {view:'manuscript',target:'.m1431-mode-center'},
 {view:'boards',target:'.boardbar'},
 {view:'characters',target:'.workspace-head [data-action="add-character"]'},
 {view:'library',target:'.header-right [data-action="backup"]'},
 {view:'library',target:'.m170-help-btn'}
];
function m170SnapshotRoute(){
 if(!state)return null;
 const keys=['view','activeProjectId','activeChapterId','activeBoardId','activeCharacterId','activeSettingId','activeOutlineId','activeChronologyId'];
 return Object.fromEntries(keys.map(k=>[k,state[k]]));
}
function m170NavigateForTour(step){
 if(!state||state.view===step.view)return;
 // Help should not write view history or overwrite the user's last book.
 const prior=m165NavigatingBack;m165NavigatingBack=true;
 try{state.view=step.view;render();}finally{m165NavigatingBack=prior;}
}
function m170CloseHelp(){document.querySelector('.m170-help-popover')?.remove();m170HelpOpen=false;}
function m170StartTour(){
 m170CloseHelp();document.querySelector('[data-m170-tour-offer]')?.remove();
 if(m170Tour)m170StopTour(false);
 m170PriorFocus=document.activeElement;
 m170Tour={index:0,route:m170SnapshotRoute(),mainScroll:document.querySelector('.main-scroll')?.scrollTop||0,sidebarScroll:document.querySelector('.sidebar-scroll')?.scrollTop||0};
 const shell=document.createElement('div');shell.className='m170-tour-root';shell.dataset.m170Tour='';
 shell.innerHTML='<div class="m170-tour-blocker"></div><div class="m170-spotlight" aria-hidden="true"></div><section class="m170-tour-popover" role="dialog" aria-modal="true" aria-live="polite" aria-label="Guided tour"></section>';
 document.body.append(shell);m170ShowStep(0);
}
function m170StopTour(markSeen=true){
 const tour=m170Tour;if(!tour)return;
 m170Tour=null;document.querySelector('[data-m170-tour]')?.remove();
 if(tour.route&&state){
  const prior=m165NavigatingBack;m165NavigatingBack=true;
  try{Object.assign(state,tour.route);render();}finally{m165NavigatingBack=prior;}
  const main=document.querySelector('.main-scroll'),sidebar=document.querySelector('.sidebar-scroll');
  if(main)main.scrollTop=tour.mainScroll;
  if(sidebar)sidebar.scrollTop=tour.sidebarScroll;
 }
 if(markSeen)m170PersistTourSeen();
 if(m170PriorFocus?.isConnected)m170PriorFocus.focus();
}
function m170StepElement(index){
 const target=m170Steps[index];if(!target)return null;
 return document.querySelector(target.target)||document.querySelector('.workspace-head')||document.querySelector('.header');
}
function m170PositionSpotlight(){
 if(!m170Tour)return;
 const {index}=m170Tour,spot=document.querySelector('.m170-spotlight'),pop=document.querySelector('.m170-tour-popover'),node=m170StepElement(index);
 if(!spot||!pop||!node)return;
 const rect=node.getBoundingClientRect(),padding=9;
 const left=Math.max(9,rect.left-padding),top=Math.max(9,rect.top-padding);
 const width=Math.min(innerWidth-left-9,Math.max(70,rect.width+padding*2));
 const height=Math.min(innerHeight-top-9,Math.max(38,rect.height+padding*2));
 Object.assign(spot.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
 const popWidth=Math.min(360,innerWidth-26);
 let px=rect.right+24,py=rect.top;
 if(px+popWidth>innerWidth-12){px=rect.left-popWidth-24;}
 if(px<12){px=Math.max(12,Math.min(innerWidth-popWidth-12,rect.left));py=rect.bottom+22;}
 const popHeight=pop.getBoundingClientRect().height||245;
 if(py+popHeight>innerHeight-12)py=rect.top-popHeight-20;
 py=Math.max(12,Math.min(innerHeight-popHeight-12,py));
 Object.assign(pop.style,{left:Math.max(12,px)+'px',top:py+'px',width:popWidth+'px'});
}
function m170ShowStep(index){
 if(!m170Tour)return;
 index=Math.max(0,Math.min(m170Steps.length-1,index));m170Tour.index=index;
 const step=m170Steps[index];m170NavigateForTour(step);
 const t=m170Text(),[title,description]=t.steps[index];
 const pop=document.querySelector('.m170-tour-popover');if(!pop)return;
 pop.innerHTML=`<div class="m170-tour-kicker">${t.tour} <span>${String(index+1).padStart(2,'0')} ${t.stepOf} ${String(m170Steps.length).padStart(2,'0')}</span></div>
  <div class="m170-tour-progress" aria-hidden="true">${m170Steps.map((_,i)=>`<span class="${i<=index?'done':''}"></span>`).join('')}</div>
  <h2>${m170Safe(title)}</h2><p>${m170Safe(description)}</p>
  <div class="m170-tour-actions"><button type="button" class="btn ghost m170-tour-skip">${t.skip}</button><div class="m170-tour-controls"><button type="button" class="btn" data-m170-prev ${index===0?'disabled':''}>${t.back}</button><button type="button" class="btn primary" data-m170-next>${index===m170Steps.length-1?t.finish:t.next} ${ic('right')}</button></div></div>`;
 pop.querySelector('.m170-tour-skip').onclick=()=>m170StopTour();
 pop.querySelector('[data-m170-prev]').onclick=()=>m170ShowStep(m170Tour.index-1);
 pop.querySelector('[data-m170-next]').onclick=()=>index===m170Steps.length-1?m170StopTour():m170ShowStep(m170Tour.index+1);
 const target=m170StepElement(index);
 if(target){target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 requestAnimationFrame(()=>{m170PositionSpotlight();pop.querySelector('[data-m170-next]')?.focus({preventScroll:true});});
}
function m170OpenHelp(){
 const anchor=document.querySelector('.m170-help-btn');if(!anchor)return;
 if(m170HelpOpen){m170CloseHelp();return;}
 m170CloseHelp();const t=m170Text();
 const p=document.createElement('section');p.className='m170-help-popover';p.setAttribute('role','dialog');p.setAttribute('aria-label',t.helpMenu);
 p.innerHTML=`<div class="m170-help-header"><strong>${t.helpTitle}</strong><button type="button" class="iconbtn" data-m170-help-close aria-label="${m170Safe(t.later)}">${ic('close')}</button></div><p>${t.helpHint}</p><button type="button" class="btn m170-preview-trigger" data-m170-preview>${ic('feather')} ${t.preview}</button><button type="button" class="btn primary" data-m170-replay>${ic('book')} ${t.replay}</button>`;
 document.body.append(p);m170HelpOpen=true;
 const rect=anchor.getBoundingClientRect();p.style.top=(rect.bottom+10)+'px';p.style.left=Math.max(10,Math.min(innerWidth-304,rect.right-294))+'px';
 p.querySelector('[data-m170-help-close]').onclick=m170CloseHelp;
 p.querySelector('[data-m170-replay]').onclick=m170StartTour;
 p.querySelector('[data-m170-preview]').onclick=()=>{m170CloseHelp();m170OpenIntro(true);};
 p.querySelector('[data-m170-replay]').focus();
}
function m170AddHelpButton(){
 const header=document.querySelector('.header-right');if(!header)return;
 const t=m170Text();
 let button=header.querySelector('.m170-help-btn');
 if(!button){button=document.createElement('button');button.type='button';button.className='iconbtn m170-help-btn';button.innerHTML=ic('help');header.append(button);button.onclick=m170OpenHelp;}
 button.title=t.helpMenu;button.setAttribute('aria-label',t.helpMenu);
}
const m170PriorRender=render;
render=function(){
 m170PriorRender();m170AddHelpButton();
 const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.7.0 · Desktop';
};
window.addEventListener('resize',()=>{if(m170Tour)requestAnimationFrame(m170PositionSpotlight);if(m170HelpOpen)m170CloseHelp();});
document.addEventListener('scroll',()=>{if(m170Tour)requestAnimationFrame(m170PositionSpotlight);},true);
document.addEventListener('pointerdown',event=>{
 if(m170HelpOpen&&!event.target.closest('.m170-help-popover,.m170-help-btn'))m170CloseHelp();
},true);
window.addEventListener('keydown',event=>{
 if(m170IntroPreview&&document.querySelector('[data-m170-intro]')&&event.key==='Escape'){
  event.preventDefault();event.stopImmediatePropagation();
  document.querySelector('[data-m170-intro]')?.remove();m170IntroPreview=false;
  if(m170PriorFocus?.isConnected)m170PriorFocus.focus();return;
 }
 if(m170Tour){
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();m170StopTour();}
  else if(event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();m170ShowStep(m170Tour.index+1);}
  else if(event.key==='ArrowLeft'){event.preventDefault();event.stopImmediatePropagation();m170ShowStep(m170Tour.index-1);}
  return;
 }
 if(m170HelpOpen&&event.key==='Escape'){event.preventDefault();m170CloseHelp();}
},true);

// Bootstrap is called by the core on DOMContentLoaded after this file is loaded.

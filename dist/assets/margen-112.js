/* MARGEN 1.12.0 · Beta R4 — estabilización final del editor + carpetas de fichas.
   1.12 mantiene una sola capa: título editorial, bloque de herramientas, navegación estable
   y organización de Personajes/Escenarios en carpetas de un único nivel. */
'use strict';
const m112T=(es,en)=>typeof m146T==='function'?m146T(es,en):es;
const m112ToolbarKey='margen-112-toolbar-mode';
const m112ZoomKey='margen-112-wide-zoom';
function m112StorageGet(key){try{return localStorage.getItem(key)}catch(_e){return null}}
function m112StorageSet(key,value){try{localStorage.setItem(key,value)}catch(_e){}}
let m112ToolbarMode=m112StorageGet(m112ToolbarKey)==='compact'?'compact':'full';
let m112WideZoom=Math.max(.75,Math.min(1.5,Number(m112StorageGet(m112ZoomKey))||1));
let m112SidebarScroll=null;
function m112DecodeEntities(value){const t=document.createElement('textarea');t.innerHTML=String(value??'');return t.value.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()}
function m112DocTitle(ch){return String(ch?.documentTitle??ch?.title??'')}
function m112TitleAlign(ch){return ['left','center','right'].includes(ch?.titleLayout?.align)?ch.titleLayout.align:'left'}

function m112FolderInfo(view){
  if(view==='characters')return {array:'characters',folders:'characterFolders',label:m112T('Personajes','Characters')};
  if(view==='settings')return {array:'settings',folders:'settingFolders',label:m112T('Escenarios','Settings')};
  return null;
}

/* Compatibilidad: libros anteriores reciben título editorial y contenedores de carpetas sin tocar datos existentes. */
const m112PrevEnsure=ensureSelections;
ensureSelections=function(){
  m112PrevEnsure();
  for(const p of state?.projects||[]){
    p.characterFolders=Array.isArray(p.characterFolders)?p.characterFolders:[];
    p.settingFolders=Array.isArray(p.settingFolders)?p.settingFolders:[];
    for(const [arrKey,folderKey] of [['characters','characterFolders'],['settings','settingFolders']]){
      const valid=new Set((p[folderKey]||[]).map(f=>f.id));
      for(const item of p[arrKey]||[])if(item.folderId&&!valid.has(item.folderId))delete item.folderId;
      for(const folder of p[folderKey]||[]){
        if(typeof folder.title!=='string'||!folder.title.trim())folder.title=m112T('Carpeta','Folder');
        folder.collapsed=!!folder.collapsed;
      }
    }
    for(const c of p.chapters||[]){
      const cleaned=m112DecodeEntities(c.title||'');if(cleaned&&cleaned!==c.title)c.title=cleaned;
      if(typeof c.documentTitle!=='string')c.documentTitle=c.title||'';
      else c.documentTitle=m112DecodeEntities(c.documentTitle);
      c.titleLayout=c.titleLayout&&typeof c.titleLayout==='object'?c.titleLayout:{};
      if(!['left','center','right'].includes(c.titleLayout.align))c.titleLayout.align='left';
    }
  }
};

/* El input grande es SIEMPRE el título editorial; el nombre organizativo vive en el árbol. */
const m112PrevManuscript=manuscriptHtml;
manuscriptHtml=function(p){
  let html=m112PrevManuscript(p),c=activeChapter();
  if(!c||m142ReaderBooks?.has?.(p?.id))return html;
  const value=esc(m112DocTitle(c));
  return html.replace(/<input class="chapter-title" id="chapter-title"[^>]*>/,
    `<input class="chapter-title m112-document-title" id="chapter-title" value="${value}" placeholder="${m112T('Título visible del capítulo','Visible chapter title')}" style="text-align:${m112TitleAlign(c)}" data-m112-document-title>`);
};

function m112BindTitle(){
  const c=activeChapter(),input=el('chapter-title');
  if(state.view!=='manuscript'||!c||!input||m142ReaderBooks?.has?.(activeProject()?.id))return;
  input.value=m112DocTitle(c);input.style.textAlign=m112TitleAlign(c);
  input.oninput=e=>{c.documentTitle=e.currentTarget.value;c.updatedAt=now();changed()};
  input.onblur=()=>changed();
}
function m112ApplyReaderTitles(){
  if(state.view!=='manuscript')return;const p=activeProject();if(!p||!m142ReaderBooks?.has?.(p.id))return;
  document.querySelectorAll('.m142-reader-chapter').forEach((section,i)=>{const c=p.chapters[i],h=section.querySelector('.m142-reader-heading h2');if(c&&h)h.textContent=m112DocTitle(c)||c.title;});
}

function m112SetWideZoom(value,persist=true){
  m112WideZoom=Math.max(.75,Math.min(1.5,Math.round(value*10)/10));
  if(persist)m112StorageSet(m112ZoomKey,String(m112WideZoom));
  document.body.style.setProperty('--m112-wide-zoom',String(m112WideZoom));
  const label=document.querySelector('[data-m112-zoom-label]');if(label)label.textContent=Math.round(m112WideZoom*100)+' %';
}
function m112BuildZoomControls(){
  const wrap=document.createElement('div');wrap.className='m112-wide-zoom';wrap.dataset.m112WideZoom='';
  wrap.innerHTML=`<button type="button" class="iconbtn" data-m112-zoom-out title="${m112T('Alejar página','Zoom out')}">${ic('zoomout')}</button><span data-m112-zoom-label></span><button type="button" class="iconbtn" data-m112-zoom-in title="${m112T('Acercar página','Zoom in')}">${ic('zoomin')}</button><button type="button" class="iconbtn" data-m112-zoom-reset title="100 %">${ic('target')}</button>`;
  wrap.querySelector('[data-m112-zoom-out]').onclick=()=>m112SetWideZoom(m112WideZoom-.1);
  wrap.querySelector('[data-m112-zoom-in]').onclick=()=>m112SetWideZoom(m112WideZoom+.1);
  wrap.querySelector('[data-m112-zoom-reset]').onclick=()=>m112SetWideZoom(1);
  m112SetWideZoom(m112WideZoom,false);return wrap;
}
function m112SyncToolbarMode(){
  const head=document.querySelector('.workspace-head.m112-unified-head');
  if(head)head.dataset.m112Toolbar=m112ToolbarMode;
  const b=document.querySelector('[data-m112-toolbar-toggle]');if(!b)return;
  const full=m112ToolbarMode==='full';
  b.innerHTML=ic(full?'up':'down');
  b.title=full?m112T('Ocultar herramientas','Hide tools'):m112T('Mostrar herramientas','Show tools');
  b.setAttribute('aria-label',b.title);b.setAttribute('aria-expanded',String(full));
}
function m112CreateToolbarToggle(){
  const b=document.createElement('button');b.type='button';b.className='iconbtn m112-toolbar-toggle';b.dataset.m112ToolbarToggle='';
  b.onclick=()=>{m112ToolbarMode=m112ToolbarMode==='full'?'compact':'full';m112StorageSet(m112ToolbarKey,m112ToolbarMode);m112SyncToolbarMode()};return b;
}

/* Nada de un control de tamaño de papel dentro del editor: eso pertenece a Exportar. */
function m112RemoveEditorPageFormat(){
  document.getElementById('m11-page-format')?.closest('.m11-page-control')?.remove();
  document.querySelector('.editor-area')?.removeAttribute('data-page-format');
}

function m112EnhanceFormatToolbar(){
  const c=activeChapter(),area=document.querySelector('.editor-area'),toolbar=area?.querySelector(':scope > .editor-toolbar');
  if(!c||!area||!toolbar)return;
  const row=toolbar.querySelector('.m1431-toolbar-row.actions')||toolbar;
  if(!area.classList.contains('screenplay-area')){
    const heading=row.querySelector('[data-action="format"][data-format="formatBlock"][data-value="h2"]');if(heading)heading.title=m112T('Encabezado dentro del texto','Heading in body text');
    const bullet=row.querySelector('[data-action="format"][data-format="insertUnorderedList"]');if(bullet)bullet.title=m112T('Lista con viñetas','Bulleted list');
    const ordered=toolbar.querySelector('[data-action="text-format"][data-format="insertOrderedList"]');
    if(ordered&&!ordered.querySelector('.m112-numbered-icon')){ordered.classList.add('m112-ordered-list');ordered.innerHTML='<span aria-hidden="true" class="m112-numbered-icon"><b>1.</b><i></i><i></i><i></i></span>';ordered.title=m112T('Lista numerada','Numbered list')}
    if(!row.querySelector('[data-m112-clear-format]')){
      const clear=document.createElement('button');clear.type='button';clear.className='tool-btn m112-clear-format';clear.dataset.m112ClearFormat='';clear.title=m112T('Eliminar formato de la selección','Clear formatting');clear.innerHTML='<span class="m112-tx">Tx</span>';
      clear.addEventListener('mousedown',e=>e.preventDefault());clear.onclick=()=>{const editor=el('chapter-editor');if(!editor)return;editor.focus();document.execCommand('removeFormat',false,null);document.execCommand('unlink',false,null);editor.dispatchEvent(new Event('input',{bubbles:true}))};row.append(clear);
    }
  }
  const synonyms=toolbar.querySelector('#synonyms-btn');
  if(synonyms&&!synonyms.querySelector('svg'))synonyms.innerHTML=ic('book')+`<span>${m112T('Sinónimos','Synonyms')}</span>`;
}

function m112FormatControlById(id){return document.getElementById(id)?.closest('label')||null}
function m112ArrangeFormatLine(row3,toolbar,area){
  if(area.classList.contains('screenplay-area')){
    const children=[...toolbar.children];
    row3.replaceChildren(...children);toolbar.remove();return;
  }
  const settings=toolbar.querySelector('.prose-settings');
  const actions=toolbar.querySelector('.m1431-toolbar-row.actions')||toolbar;
  if(!settings)return;
  const font=m112FormatControlById('chapter-font'),size=m112FormatControlById('chapter-size'),leading=m112FormatControlById('chapter-leading'),margin=m112FormatControlById('chapter-margin');
  [font,size,leading,margin].forEach(x=>x?.classList.add('m112-setting-label'));
  const align=toolbar.querySelector('[data-format="justifyLeft"]')?.closest('.format-group');if(align)align.classList.add('m112-align-group');
  const ordered=toolbar.querySelector('[data-format="insertOrderedList"]');
  const indent=toolbar.querySelector('[data-format="indent"]'),outdent=toolbar.querySelector('[data-format="outdent"]');
  const indentGroup=document.createElement('span');indentGroup.className='format-group m112-indent-group';
  if(outdent)indentGroup.append(outdent);if(indent)indentGroup.append(indent);
  const bold=actions.querySelector('[data-format="bold"]'),italic=actions.querySelector('[data-format="italic"]');
  const heading=actions.querySelector('[data-format="formatBlock"][data-value="h2"]');
  const bullet=actions.querySelector('[data-format="insertUnorderedList"]');
  const quote=actions.querySelector('[data-format="formatBlock"][data-value="blockquote"]');
  const clear=actions.querySelector('[data-m112-clear-format]');
  const controls=[font,size,leading,margin,align,indentGroup,bold,italic,heading,ordered,bullet,quote,clear].filter(Boolean);
  row3.replaceChildren(...controls);toolbar.remove();
}

/*
 * Barra definitiva de escritura: dos filas como una sola pieza visual.
 * Fila 1: modo / búsqueda global / tipo de escritura / capítulo / acciones.
 * Fila 2: formato / sinónimos / referencias / fichas.
 * La flecha inferior recoge o muestra TODO el bloque sin cambiar tamaños.
 */
function m112EnsureBookName(area){
  if(!area)return;
  let label=area.querySelector(':scope > .m112-book-name');
  if(!label){label=document.createElement('div');label.className='m112-book-name';const paper=area.querySelector(':scope > .editor-paper');if(paper)area.insertBefore(label,paper);else area.prepend(label)}
  label.textContent=String(activeProject()?.name||'').toUpperCase();
}
function m112ArrangeUnifiedHead(){
  if(state.view!=='manuscript'||m142ReaderBooks?.has?.(activeProject()?.id))return;
  const head=document.querySelector('.workspace-head.m1431-manuscript-head'),area=document.querySelector('.editor-area');
  const toolbar=area?.querySelector(':scope > .editor-toolbar'),nav=area?.querySelector(':scope > .m11-navbox'),modes=head?.querySelector(':scope > .m1431-mode-center');
  if(!head||!area||!toolbar||!nav||!modes)return;

  /* Escritura amplia desaparece: plegar la barra ya ofrece el espacio extra. */
  modes.querySelector('.m1431-wide-tab')?.remove();head.querySelector('.m143-entry')?.remove();
  if(m143Studio){m143Studio=false;document.body.classList.remove('m143-studio');document.querySelector('.m143-studio-topbar')?.remove()}

  head.classList.add('m112-unified-head');
  head.querySelector(':scope > div:first-child')?.classList.add('m112-head-title');
  const actions=head.querySelector(':scope > .head-actions');if(actions)actions.classList.add('m112-head-actions');

  let stack=head.querySelector(':scope > .m112-toolstack');
  if(!stack){
    stack=document.createElement('section');stack.className='m112-toolstack';stack.dataset.m112Toolstack='';
    stack.innerHTML='<div class="m112-stack-row m112-stack-primary"></div><div class="m112-stack-row m112-stack-format"></div>';
    head.prepend(stack);
    stack.addEventListener('click',event=>{
      const btn=event.target.closest('[data-action="m142-edit"],[data-action="m142-read"]');if(!btn)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(btn.dataset.action==='m142-read')m142SwitchReading(true);else m142SwitchReading(false);
    },true);
  }
  const row1=stack.querySelector('.m112-stack-primary'),row2=stack.querySelector('.m112-stack-format');

  /* Fila 1 exactamente en el orden de trabajo aprobado. */
  row1.replaceChildren();row1.append(modes);
  const firstNav=nav.querySelector('.m11-navgroup:first-child');if(firstNav)row1.append(firstNav);
  if(actions)row1.append(actions);

  /* Fila 2: formato seguido de consulta. Buscar-en-capítulo queda por atajo Ctrl+F. */
  const lastNav=nav.querySelector('.m11-navgroup:last-child');
  lastNav?.querySelector('[data-action="m11-focus"]')?.remove();
  lastNav?.querySelector('[data-action="m11-find"]')?.remove();
  const synonyms=toolbar.querySelector('#synonyms-btn');
  const refs=lastNav?.querySelector('[data-action="m161-panel"][data-panel="refs"], [data-m161-panel="refs"], [data-action="m161-refs"]')||lastNav?.querySelector('button[title*="refer" i]');
  const sheets=lastNav?.querySelector('#m161-sheets-button');
  m112ArrangeFormatLine(row2,toolbar,area);
  for(const control of [synonyms,refs,sheets])if(control)row2.append(control);
  if(synonyms)synonyms.classList.add('m112-query-start');
  nav.remove();

  /* Acciones ya viven dentro de la primera fila. */
  head.querySelector(':scope > .m112-head-actions')?.remove();
  let toggle=head.querySelector(':scope > [data-m112-toolbar-toggle]');
  if(!toggle){toggle=m112CreateToolbarToggle();head.append(toggle)}
  m112EnsureBookName(area);
  m112SyncToolbarMode();
}

/* Los botones de alineación normales también gobiernan el título si el foco estaba en él. */
function m112BindTitleAlignment(){
  const input=el('chapter-title'),c=activeChapter();if(!input||!c)return;
  document.querySelectorAll('.m112-stack-format [data-format="justifyLeft"],.m112-stack-format [data-format="justifyCenter"],.m112-stack-format [data-format="justifyRight"]').forEach(btn=>{
    if(btn.dataset.m112TitleAlignBound)return;btn.dataset.m112TitleAlignBound='1';
    btn.addEventListener('mousedown',e=>{if(document.activeElement===input){btn.dataset.m112TitleTarget='1';e.preventDefault()}else delete btn.dataset.m112TitleTarget},true);
    btn.addEventListener('click',e=>{
      if(btn.dataset.m112TitleTarget!=='1')return;delete btn.dataset.m112TitleTarget;e.preventDefault();e.stopImmediatePropagation();
      const map={justifyLeft:'left',justifyCenter:'center',justifyRight:'right'},align=map[btn.dataset.format];if(!align)return;
      c.titleLayout=c.titleLayout&&typeof c.titleLayout==='object'?c.titleLayout:{};c.titleLayout.align=align;input.style.textAlign=align;c.updatedAt=now();changed();input.focus();
    },true);
  });
}

function m112BindProseTab(){
  const editor=el('chapter-editor'),c=activeChapter();if(!editor||!c||c.mode==='screenplay'||editor.dataset.m112TabBound)return;editor.dataset.m112TabBound='1';
  editor.addEventListener('keydown',e=>{if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();const sel=window.getSelection(),node=sel?.anchorNode?.nodeType===1?sel.anchorNode:sel?.anchorNode?.parentElement;const li=node?.closest?.('li');if(li&&editor.contains(li)){document.execCommand(e.shiftKey?'outdent':'indent',false,null)}else if(!e.shiftKey)document.execCommand('insertHTML',false,'&emsp;');else document.execCommand('outdent',false,null);editor.dispatchEvent(new Event('input',{bubbles:true}))});
}
function m112BindCenteredLists(){
  const editor=el('chapter-editor');if(!editor||editor.dataset.m112ListBound)return;editor.dataset.m112ListBound='1';
  const sync=()=>editor.querySelectorAll('li').forEach(li=>{const a=(li.style.textAlign||getComputedStyle(li).textAlign);li.classList.toggle('m112-centered-list',a==='center')});
  editor.addEventListener('input',sync);document.querySelectorAll('[data-action="text-format"][data-format^="justify"]').forEach(b=>b.addEventListener('click',()=>setTimeout(sync,0)));sync();
}

/* Renombrar el NOMBRE ORGANIZATIVO directamente en el árbol, sin reconstruir todo el editor. */
function m112ChapterById(id){return activeProject()?.chapters?.find(x=>x.id===id)||null}
function m112UpdateChapterLabels(id,title){
  document.querySelectorAll(`.tree-leaf[data-type="manuscript"][data-id="${CSS.escape(id)}"]`).forEach(leaf=>{const span=leaf.querySelector('.truncate');if(span)span.textContent=title;leaf.title=title});
  const option=document.querySelector(`#m11-jump option[value="${CSS.escape(id)}"]`);if(option)option.textContent=title;
  const studio=document.querySelector('.m143-chapter-name'),p=activeProject();if(studio&&id===activeChapter()?.id)studio.textContent=`${p?.name||''} · ${title}`;
}
function m112BeginSidebarRename(id){
  const c=m112ChapterById(id);if(!c)return;
  const leaf=document.querySelector(`.tree-leaf[data-type="manuscript"][data-id="${CSS.escape(id)}"]`),row=leaf?.closest('.tree-entry');if(!leaf||!row||row.querySelector('.m112-tree-rename'))return;
  const input=document.createElement('input');input.type='text';input.className='m112-tree-rename';input.value=c.title||'';input.maxLength=120;input.setAttribute('aria-label',m112T('Nombre del capítulo en el árbol','Chapter name in sidebar'));
  leaf.hidden=true;row.insertBefore(input,leaf);let cancelled=false,done=false;
  const finish=save=>{if(done)return;done=true;const value=m112DecodeEntities(input.value);if(save&&value){c.title=value;c.updatedAt=now();changed();m112UpdateChapterLabels(c.id,value)}input.remove();leaf.hidden=false;leaf.focus()};
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();cancelled=true;finish(false)}});
  input.addEventListener('blur',()=>finish(!cancelled));input.focus();input.select();
}
function m112BindSidebarRename(){
  document.querySelectorAll('.tree-leaf[data-type="manuscript"]').forEach(leaf=>{
    if(leaf.dataset.m112RenameBound)return;leaf.dataset.m112RenameBound='1';
    leaf.addEventListener('click',e=>{if(e.detail<2)return;e.preventDefault();e.stopImmediatePropagation();m112BeginSidebarRename(leaf.dataset.id)},true);
    leaf.addEventListener('dblclick',e=>{e.preventDefault();e.stopImmediatePropagation();m112BeginSidebarRename(leaf.dataset.id)},true);
  });
}

/* Carpetas de un único nivel para Personajes y Escenarios. */
function m112CreateFolder(view){
  const p=activeProject(),info=m112FolderInfo(view);if(!p||!info)return;
  modal({title:m112T('Nueva carpeta','New folder'),description:m112T(`Organiza ${info.label.toLowerCase()} sin crear niveles infinitos.`,`Organize ${info.label.toLowerCase()} without nested folders.`),fields:[{id:'title',label:m112T('Nombre','Name'),required:true,placeholder:view==='characters'?m112T('Gente de Alicante','People from Alicante'):m112T('Lugares de Alicante','Places in Alicante')}],submit:m112T('Crear carpeta','Create folder'),onSubmit:({title})=>{p[info.folders].push({id:uid(),title:m112DecodeEntities(title),collapsed:false});changed();renderSidebarOnly()}});
}
function m112RenameFolder(view,id){
  const p=activeProject(),info=m112FolderInfo(view),folder=p?.[info?.folders||'']?.find(x=>x.id===id);if(!p||!info||!folder)return;
  modal({title:m112T('Renombrar carpeta','Rename folder'),fields:[{id:'title',label:m112T('Nombre','Name'),required:true,value:folder.title}],submit:m112T('Guardar','Save'),onSubmit:({title})=>{folder.title=m112DecodeEntities(title);changed();renderSidebarOnly()}});
}
async function m112DeleteFolder(view,id){
  const p=activeProject(),info=m112FolderInfo(view);if(!p||!info)return;const folder=p[info.folders].find(x=>x.id===id);if(!folder)return;
  if(!await m172Confirm(m112T(`¿Eliminar la carpeta «${folder.title}»? Las fichas volverán a «Sin carpeta»; no se borrará ninguna.`,`Delete folder “${folder.title}”? Its sheets will return to “No folder”; none will be deleted.`)))return;
  for(const item of p[info.array])if(item.folderId===id)delete item.folderId;p[info.folders]=p[info.folders].filter(x=>x.id!==id);changed();renderSidebarOnly();
}
function m112CloseFolderMenu(){document.querySelector('.m112-folder-menu')?.remove()}
function m112ShowFolderMenu(button,view,id){
  m112CloseFolderMenu();const p=activeProject(),info=m112FolderInfo(view),item=p?.[info?.array||'']?.find(x=>x.id===id);if(!p||!info||!item)return;
  const menu=document.createElement('div');menu.className='m112-folder-menu';
  const folders=p[info.folders]||[];
  menu.innerHTML=`<div class="m112-folder-menu-title">${m112T('Mover a carpeta','Move to folder')}</div><button type="button" data-folder="" class="${item.folderId?'':'active'}">${ic('folder')} ${m112T('Sin carpeta','No folder')}</button>${folders.map(f=>`<button type="button" data-folder="${esc(f.id)}" class="${item.folderId===f.id?'active':''}">${ic('folder')} ${esc(f.title)}</button>`).join('')}<button type="button" data-folder-new>${ic('plus')} ${m112T('Nueva carpeta…','New folder…')}</button>`;
  document.body.append(menu);const rect=button.getBoundingClientRect(),mw=230;menu.style.left=Math.max(8,Math.min(window.innerWidth-mw-8,rect.right-mw))+'px';menu.style.top=Math.min(window.innerHeight-menu.offsetHeight-8,rect.bottom+5)+'px';
  menu.querySelectorAll('[data-folder]').forEach(choice=>choice.onclick=()=>{const folderId=choice.dataset.folder;if(folderId)item.folderId=folderId;else delete item.folderId;changed();m112CloseFolderMenu();renderSidebarOnly()});
  menu.querySelector('[data-folder-new]').onclick=()=>{m112CloseFolderMenu();m112CreateFolder(view)};
  setTimeout(()=>document.addEventListener('pointerdown',m112FolderOutside,{once:true,capture:true}),0);
}
function m112FolderOutside(e){if(!e.target.closest('.m112-folder-menu,[data-m112-folder-move]'))m112CloseFolderMenu()}
function m112FolderGroup(view,folder,entries){
  const group=document.createElement('div');group.className='m112-folder-group'+(folder.collapsed?' is-collapsed':'');group.dataset.m112FolderGroup=folder.id;
  const header=document.createElement('div');header.className='m112-folder-head';
  header.innerHTML=`<button type="button" class="m112-folder-toggle" data-m112-folder-toggle="${esc(folder.id)}" title="${m112T('Plegar o desplegar','Collapse or expand')}">${ic('chevron')}${ic('folder')}<span class="truncate">${esc(folder.title)}</span><span class="tree-count">${entries.length}</span></button><button type="button" class="entry-tool" data-m112-folder-rename="${esc(folder.id)}" title="${m112T('Renombrar carpeta','Rename folder')}">${ic('rename')}</button><button type="button" class="entry-tool" data-m112-folder-delete="${esc(folder.id)}" title="${m112T('Eliminar carpeta','Delete folder')}">${ic('trash')}</button>`;
  const body=document.createElement('div');body.className='m112-folder-body';entries.forEach(entry=>body.append(entry));group.append(header,body);return group;
}
function m112ApplyFolderSidebar(){
  const p=activeProject();if(!p||state.view==='library')return;
  for(const view of ['characters','settings']){
    const info=m112FolderInfo(view),section=document.querySelector(`.tree-section[data-section="${view}"]`);if(!section)continue;
    const heading=section.querySelector('.tree-heading');
    if(heading&&!heading.querySelector('[data-m112-folder-add]')){
      const add=document.createElement('button');add.type='button';add.className='mini-add m112-folder-add';add.dataset.m112FolderAdd=view;add.title=m112T('Nueva carpeta','New folder');add.innerHTML=ic('folder');
      const normal=heading.querySelector('.mini-add');heading.insertBefore(add,normal||null);
    }
    const children=section.querySelector('.tree-children');if(!children)continue;
    const entries=[...children.querySelectorAll(':scope > .tree-entry')];
    for(const entry of entries){
      const leaf=entry.querySelector(`.tree-leaf[data-type="${view}"]`),aux=entry.querySelector('.entry-aux');if(!leaf||!aux)continue;
      if(!aux.querySelector('[data-m112-folder-move]')){const btn=document.createElement('button');btn.type='button';btn.className='entry-tool m112-folder-move';btn.dataset.m112FolderMove=leaf.dataset.id;btn.dataset.m112FolderView=view;btn.title=m112T('Mover a carpeta','Move to folder');btn.innerHTML=ic('folder');aux.prepend(btn)}
    }
    const folders=p[info.folders]||[];if(!folders.length)continue;
    const map=new Map(entries.map(entry=>[entry.querySelector(`.tree-leaf[data-type="${view}"]`)?.dataset.id,entry]));
    children.replaceChildren();
    for(const folder of folders){const grouped=p[info.array].filter(x=>x.folderId===folder.id).map(x=>map.get(x.id)).filter(Boolean);children.append(m112FolderGroup(view,folder,grouped))}
    const loose=p[info.array].filter(x=>!x.folderId).map(x=>map.get(x.id)).filter(Boolean);
    if(loose.length){const block=document.createElement('div');block.className='m112-folder-loose';block.innerHTML=`<div class="m112-folder-loose-label">${m112T('Sin carpeta','No folder')} <span>${loose.length}</span></div>`;loose.forEach(entry=>block.append(entry));children.append(block)}
  }
  document.querySelectorAll('[data-m112-folder-add]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();m112CreateFolder(btn.dataset.m112FolderAdd)});
  document.querySelectorAll('[data-m112-folder-move]').forEach(btn=>btn.onclick=e=>{e.preventDefault();e.stopPropagation();m112ShowFolderMenu(btn,btn.dataset.m112FolderView,btn.dataset.m112FolderMove)});
  document.querySelectorAll('[data-m112-folder-toggle]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const view=btn.closest('.tree-section')?.dataset.section,info=m112FolderInfo(view),folder=activeProject()?.[info?.folders||'']?.find(x=>x.id===btn.dataset.m112FolderToggle);if(!folder)return;folder.collapsed=!folder.collapsed;btn.closest('.m112-folder-group')?.classList.toggle('is-collapsed',folder.collapsed);changed()});
  document.querySelectorAll('[data-m112-folder-rename]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const view=btn.closest('.tree-section')?.dataset.section;m112RenameFolder(view,btn.dataset.m112FolderRename)});
  document.querySelectorAll('[data-m112-folder-delete]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const view=btn.closest('.tree-section')?.dataset.section;void m112DeleteFolder(view,btn.dataset.m112FolderDelete)});
}

function m112RememberSidebarScroll(){const side=document.querySelector('.sidebar-scroll');if(side)m112SidebarScroll=side.scrollTop}
function m112RestoreSidebarScroll(){
  if(m112SidebarScroll==null)return;const value=m112SidebarScroll;
  const apply=()=>{const side=document.querySelector('.sidebar-scroll');if(side)side.scrollTop=value};apply();requestAnimationFrame(()=>{apply();requestAnimationFrame(apply)});
}
function m112CurrentIdForView(view){return ({manuscript:state.activeChapterId,boards:state.activeBoardId,characters:state.activeCharacterId,settings:state.activeSettingId,outlines:state.activeOutlineId,chronologies:state.activeChronologyId,notes:state.activeNoteId})[view]||null}

/* Evitar reconstrucciones y saltos de scroll cuando el usuario pulsa lo que ya está abierto. */
const m112PrevAction=onAction;
onAction=function(e){
  const btn=e.currentTarget,a=btn?.dataset?.action;
  if(btn?.closest?.('.sidebar'))m112RememberSidebarScroll();
  if(a==='rename-chapter'){m112BeginSidebarRename(activeChapter()?.id);return}
  if(a==='open-entry'){
    const view=btn.dataset.type,id=btn.dataset.id;
    if(state.view===view&&id===m112CurrentIdForView(view)&&!(view==='manuscript'&&m142ReaderBooks?.has?.(activeProject()?.id)))return;
  }
  return m112PrevAction(e);
};

function m112PolishUi(){
  const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.12.0 · Beta';
  const about=document.querySelector('.m111-about-btn');if(about)about.innerHTML=ic('file');
}

const m112PrevRender=render;
render=function(){
  m112PrevRender();
  m112RemoveEditorPageFormat();m112BindTitle();m112ApplyReaderTitles();m112EnhanceFormatToolbar();m112ArrangeUnifiedHead();m112BindTitleAlignment();m112BindSidebarRename();m112BindProseTab();m112BindCenteredLists();m112ApplyFolderSidebar();m112PolishUi();m112RestoreSidebarScroll();
};
const m112PrevWire=wire;
wire=function(){m112PrevWire();m112RemoveEditorPageFormat();m112BindTitle();m112BindProseTab();m112BindCenteredLists()};
const m112PrevSidebar=renderSidebarOnly;
renderSidebarOnly=function(){m112RememberSidebarScroll();m112PrevSidebar();m112BindSidebarRename();m112ApplyFolderSidebar();m112RestoreSidebarScroll()};
const m112PrevSwitchStudio=m143SwitchStudio;
m143SwitchStudio=function(enabled){if(enabled)return;return m112PrevSwitchStudio(false)};

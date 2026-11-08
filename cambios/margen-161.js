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
    button.onclick=()=>{
      const i=Number(button.dataset.m14Removechapter);
      if(!confirm(m161T('¿Quitar este capítulo de la importación? Podrás deshacerlo.','Remove this chapter from the import? You can undo this.')))return;
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

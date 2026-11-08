'use strict';
/* MARGEN 1.7.2: diálogos de la aplicación. No sustituyen ventanas del sistema operativo.
   Los confirm() antiguos se convierten en await m172Confirm() en el archivo base.
   Este archivo debe cargarse después de margen.js, margen-170.js y margen-171.js. */
let m172DialogActive = false;
const m172DialogQueue = [];
const m172English = () => typeof m145Prefs === 'function' && m145Prefs().language === 'en';
const m172Text = (es, en) => m172English() ? en : es;

function m172TranslateMessage(message) {
  const raw = String(message ?? '');
  if (!m172English()) return raw;
  // Los mensajes ya construidos con m15T, m146T, etc., ya vienen traducidos.
  if (typeof m145En !== 'undefined' && m145En[raw]) return m145En[raw];
  const dynamic = [
    [/^¿Eliminar DEFINITIVAMENTE «(.+?)» y todos sus capítulos, pizarras e imágenes\? Antes, exporta una copia de seguridad si deseas conservarlo\.$/s,
      m => `Permanently delete “${m[1]}” and all its chapters, boards and images? Export a backup first if you wish to keep them.`],
    [/^¿Eliminar definitivamente «(.+?)»\? Esta acción no se puede deshacer\.$/s,
      m => `Permanently delete “${m[1]}”? This action cannot be undone.`],
    [/^¿Eliminar «(.+?)»\? Esta acción no se puede deshacer\.$/s,
      m => `Delete “${m[1]}”? This cannot be undone.`],
    [/^¿Eliminar «(.+?)» y todo su contenido\?$/s,
      m => `Delete “${m[1]}” and all its contents?`],
    [/^¿Eliminar «(.+?)» y sus acontecimientos\?$/s,
      m => `Delete “${m[1]}” and all its events?`],
    [/^¿Eliminar «(.+?)»\?$/s, m => `Delete “${m[1]}”?`],
    [/^¿Mover «(.+?)» al archivo\? Puedes restaurarlo después\.$/s,
      m => `Move “${m[1]}” to the archive? You can restore it later.`],
    [/^¿Quitar el bloque «(.+?)»\? Sus escenas pasarán a «Sin bloque»\.$/s,
      m => `Remove the block “${m[1]}”? Its scenes will move to “No block”.`],
    [/^No se pudo importar la copia: (.+)$/s,m=>`Could not import the backup: ${m[1]}`],
    [/^No se pudo importar: (.+)$/s,m=>`Import failed: ${m[1]}`],
    [/^No se puede abrir esta copia: (.+)$/s,m=>`Could not open this backup: ${m[1]}`],
    [/^Copia guardada en:\n(.+)$/s,m=>`Backup saved to:\n${m[1]}`],
    [/^Copia JSON guardada en:\n(.+)$/s,m=>`JSON backup saved to:\n${m[1]}`],
    [/^Copia de conflicto guardada en:\n(.+)$/s,m=>`Conflict backup saved to:\n${m[1]}`],
    [/^Error al guardar copia: (.+)$/s,m=>`Backup save error: ${m[1]}`],
    [/^No se pudo guardar la copia JSON: (.+)$/s,m=>`Could not save the JSON backup: ${m[1]}`],
    [/^No se pudo exportar el conflicto: (.+)$/s,m=>`Could not export the conflict: ${m[1]}`]
  ];
  for (const [pattern, format] of dynamic) {
    const match = raw.match(pattern);
    if (match) return format(match);
  }
  return raw;
}

function m172DialogKind(message, isNotice) {
  const value = String(message ?? '').toLowerCase();
  if (/este sello.*todos tus libros|stamp.*every book|sello global|global stamp/.test(value)) return 'scope';
  if (isNotice) {
    return /error|fall|dañad|bloquead|no se pud|could not|failed|damaged|blocked|invalid/.test(value) ? 'error' : 'info';
  }
  if (/recarg|reload/.test(value)) return 'reload';
  if (/restaur|reemplaz|sustituir|replace|restore|overwrite/.test(value)) return 'restore';
  if (/mover.*archivo|move.*archive/.test(value)) return 'archive';
  if (/eliminar|borrar|delete|remove|quitar|permanent|limpiar las referencias|clean links/.test(value)) return 'danger';
  return 'question';
}
function m172DialogCopy(kind, isNotice) {
  const texts = {
    scope: ['¿Dónde quieres guardar el sello?','Where should this stamp be available?',
      'Solo este libro','Only this book','Todos mis libros','All my books'],
    archive: ['Archivar elemento','Archive item','Cancelar','Cancel','Archivar','Archive'],
    danger: ['Confirmar eliminación','Confirm deletion','Cancelar','Cancel','Eliminar','Delete'],
    restore: ['Confirmar sustitución','Confirm replacement','Cancelar','Cancel','Continuar','Continue'],
    reload: ['Recargar los datos','Reload data','Conservar cambios','Keep changes','Recargar','Reload'],
    question: ['Confirmar acción','Confirm action','Cancelar','Cancel','Confirmar','Confirm'],
    error: ['No se ha podido completar','Could not complete the action','Cerrar','Close','Entendido','OK'],
    info: ['MARGEN','MARGEN','Cerrar','Close','Entendido','OK']
  };
  const parts = texts[kind] || texts.question;
  return [m172Text(parts[0],parts[1]),m172Text(parts[2],parts[3]),m172Text(parts[4],parts[5])];
}

function m172ShowNextDialog() {
  if (m172DialogActive || !m172DialogQueue.length) return;
  m172DialogActive = true;
  const entry=m172DialogQueue.shift();
  const kind = m172DialogKind(entry.message, entry.notice);
  const [title,cancelText,actionText]=m172DialogCopy(kind,entry.notice);
  const previous=document.activeElement;
  const root=document.createElement('div');
  root.className='m172-dialog-backdrop';root.dataset.m172Dialog='';
  root.innerHTML=`<section class="m172-dialog m172-${kind}" role="alertdialog" aria-modal="true" aria-labelledby="m172-dialog-title" aria-describedby="m172-dialog-message" tabindex="-1">
    <div class="m172-dialog-top"><div class="m172-dialog-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg></div><div class="m172-dialog-caption">MARGEN</div></div>
    <h2 id="m172-dialog-title"></h2><p id="m172-dialog-message"></p>
    <div class="m172-dialog-actions"><button type="button" class="btn m172-dialog-cancel" data-m172-cancel></button><button type="button" class="btn m172-dialog-primary" data-m172-accept></button></div>
  </section>`;
  const panel=root.firstElementChild;
  root.querySelector('#m172-dialog-title').textContent=title;
  root.querySelector('#m172-dialog-message').textContent=m172TranslateMessage(entry.message);
  const cancel=root.querySelector('[data-m172-cancel]');
  const accept=root.querySelector('[data-m172-accept]');
  cancel.textContent=cancelText;accept.textContent=actionText;
  if(entry.notice) cancel.remove();
  if(kind==='danger'||kind==='reload')accept.classList.add('m172-danger-action');
  let settled=false;
  function finish(value){
    if(settled)return;settled=true;
    root.removeEventListener('keydown',onKey);
    root.remove();m172DialogActive=false;
    if(previous?.isConnected && typeof previous.focus === 'function')previous.focus({preventScroll:true});
    entry.resolve(value);
    // La siguiente confirmación no debe robar el foco antes de cerrar esta.
    queueMicrotask(m172ShowNextDialog);
  }
  const onKey=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);}
    if(e.key!=='Tab')return;
    const controls=[cancel,accept].filter(e=>e.isConnected&&!e.disabled);
    const current=controls.indexOf(document.activeElement);
    if(e.shiftKey && (current<=0)){e.preventDefault();controls[controls.length-1]?.focus();}
    else if(!e.shiftKey&&(current===controls.length-1||current<0)){e.preventDefault();controls[0]?.focus();}
  };
  root.addEventListener('keydown',onKey);
  cancel.addEventListener('click',()=>finish(false));
  accept.addEventListener('click',()=>finish(true));
  // Pulsar fuera equivale a cancelar; nunca confirma una acción peligrosa.
  root.addEventListener('mousedown',e=>{if(e.target===root)finish(false)});
  document.body.append(root);
  // No desplazar el manuscrito ni la barra lateral al abrir/cerrar el diálogo.
  (entry.notice ? accept : cancel).focus({preventScroll:true});
}
function m172Confirm(message){
  return new Promise(resolve=>{m172DialogQueue.push({message:String(message??''),notice:false,resolve});m172ShowNextDialog()});
}
function m172Notice(message){
  return new Promise(resolve=>{m172DialogQueue.push({message:String(message??''),notice:true,resolve});m172ShowNextDialog()});
}

// La cabecera de Escaletas repetía el apartado en dos niveles. La escaleta
// concreta conserva su nombre y su editor; quitamos únicamente el H1 repetido.
function m172CleanHeadings(){
  if(state?.view!=='outlines')return;
  const header=document.querySelector('.workspace-head');
  const h1=header?.querySelector('h1');
  if(h1 && /^(Escaletas|Outlines)$/i.test(h1.textContent.trim())){
    h1.remove();
    header.classList.add('m172-compact-head');
  }
}
const m172PreviousRender=render;
render=function(){m172PreviousRender();m172CleanHeadings();const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.7.3 · Desktop';};

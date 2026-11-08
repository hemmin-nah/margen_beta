/* MARGEN 1.7.3 · Recursos léxicos offline. Conserva Diccionario y Sinónimos en sus ubicaciones originales.
   No envía consultas a la red; solo modifica el manuscrito cuando el usuario pulsa expresamente un sinónimo para sustituir una selección. */
'use strict';
let m173Language=null;
let m173Sequence=0;
let m173Replacement=null;
const m173Lang=()=>m173Language||(m145Prefs().language==='en'?'en':'es');
const m173Ui=()=>m145Prefs().language==='en'?'en':'es';
const m173T=(es,en)=>m173Ui()==='en'?en:es;
const m173Safe=(value)=>esc(String(value??''));
const m173Terms={
 es:{title:'Diccionario',heading:'Recursos lingüísticos sin conexión',entry:'Buscar una palabra',example:'Por ejemplo: melancolía',source:'Fuente',synonyms:'Sinónimos por significado',definitions:'Definiciones',notfound:'No se encontraron entradas para esta palabra.',ready:'Escribe una palabra para consultar el diccionario.',missing:'Las bases léxicas todavía no están instaladas en este ejecutable. Necesitas compilar el proyecto con los recursos lingüísticos.',loading:'Consultando…',licenses:'Fuentes y licencias',independent:'El idioma de consulta es independiente del idioma de la interfaz.',error:'No se pudo consultar el recurso local.',noSyn:'No se encontraron sinónimos para ese término.',synInfo:'Los sinónimos se agrupan por acepción y no siempre sirven para sustituir palabras en una frase.',welcome:'Selecciona una palabra en el manuscrito. Si pulsas uno de sus sinónimos, sustituirá esa selección; una búsqueda escrita aquí solo consulta.',close:'Cerrar',es:'Español',en:'Inglés'},
 en:{title:'Dictionary',heading:'Offline lexical resources',entry:'Search for a word',example:'For example: melancholy',source:'Source',synonyms:'Synonyms by meaning',definitions:'Definitions',notfound:'No entries found for this word.',ready:'Type a word to search.',missing:'Lexical databases are not installed in this executable yet. Build the desktop project with the lexical resources.',loading:'Looking up…',licenses:'Sources and licenses',independent:'Search language is independent of the interface language.',error:'Could not read the local lexical resource.',noSyn:'No synonyms found for this term.',synInfo:'Synonyms are grouped by sense and may not fit every sentence.',welcome:'Select a word in the manuscript. Clicking one of its synonyms replaces that selection; typing a search here only looks it up.',close:'Close',es:'Spanish',en:'English'}
};
const m173Text=()=>m173Terms[m173Ui()];
const m173Lookup=(term,language)=>{
 const invoke=window.__TAURI__?.core?.invoke;
 if(typeof invoke!=='function')return Promise.reject(new Error('MARGEN_LEXICON_MISSING: desktop bridge unavailable'));
 return invoke('lexical_lookup',{term,language});
};
const m173SourceText=(item)=>[item.source,item.license].filter(Boolean).join(' · ');
function m173ReplacementInfo(){
 const info=m173Replacement;if(!info?.range||!info.word)return null;
 const editor=document.getElementById('chapter-editor');if(!editor)return null;
 try{
  const range=info.range;
  if(!range.startContainer?.isConnected||!range.endContainer?.isConnected||!editor.contains(range.commonAncestorContainer))return null;
  if(range.toString().trim().toLocaleLowerCase('es')!==info.word.trim().toLocaleLowerCase('es'))return null;
  return info;
 }catch(_e){return null}
}
function m173CaptureReplacement(){
 let info=null;try{info=selectedWordRange()}catch(_e){}
 m173Replacement=info?.range&&info?.word?{range:info.range.cloneRange(),word:info.word}:null;
 return m173Replacement;
}
function m173ReplaceSelection(word){
 const info=m173ReplacementInfo(),editor=document.getElementById('chapter-editor');if(!info||!editor)return false;
 let value=String(word||'').trim();if(!value)return false;
 if(info.word[0]&&info.word[0]===info.word[0].toUpperCase())value=value.charAt(0).toUpperCase()+value.slice(1);
 try{
  const range=info.range;range.deleteContents();const text=document.createTextNode(value);range.insertNode(text);
  const caret=document.createRange();caret.setStartAfter(text);caret.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(caret);
  editor.dispatchEvent(new Event('input',{bubbles:true}));editor.focus();m173Replacement=null;return true;
 }catch(_e){m173Replacement=null;return false}
}
document.addEventListener('pointerdown',event=>{
 const button=event.target.closest?.('#synonyms-btn,[data-action="synonyms"]');if(!button)return;
 m173CaptureReplacement();
},true);
function m173WriteResults(node,term,language,data,onlySyn=false){
 if(!node)return;
 const t=m173Text();const defs=Array.isArray(data.definitions)?data.definitions:[],groups=Array.isArray(data.synonymGroups)?data.synonymGroups:[];
 const canReplace=!!(onlySyn&&m173ReplacementInfo()&&String(term||'').trim().toLocaleLowerCase('es')===m173Replacement.word.trim().toLocaleLowerCase('es'));
 const definitionMarkup=onlySyn?'':`<h3 class="m173-result-label">${t.definitions}</h3>${defs.length?defs.slice(0,9).map(x=>`<section class="m173-sense"><div class="m173-part">${m173Safe(x.partOfSpeech)}</div><p>${m173Safe(x.gloss)}</p><small>${m173Safe(m173SourceText(x))}</small>${x.url?`<button type="button" class="m173-copy-source" data-m173-copy="${m173Safe(x.url)}" title="${m173Safe(t.source)}">${m173Safe(t.source)} ↗</button>`:''}</section>`).join(''):`<p class="dict-empty">${t.notfound}</p>`}`;
 const synonymMarkup=`<h3 class="m173-result-label">${t.synonyms}</h3>${groups.length?groups.slice(0,12).map(group=>`<section class="m173-sense"><div class="m173-chips">${(group.synonyms||[]).map(w=>canReplace?`<button type="button" class="dict-chip m173-replace-chip" data-m173-replace="${m173Safe(w)}" title="${m173Safe(m173T('Sustituir la palabra seleccionada','Replace selected word'))}">${m173Safe(w)}</button>`:`<span class="dict-chip">${m173Safe(w)}</span>`).join('')}</div><small>${m173Safe(m173SourceText(group))}</small></section>`).join(''):`<p class="dict-empty">${t.noSyn}</p>`}`;
 node.innerHTML=`<div class="m173-result-word">${m173Safe(term)}</div>${definitionMarkup}${synonymMarkup}<p class="m173-subtle">${m173Safe(t.synInfo)}</p>`;
 node.querySelectorAll('[data-m173-copy]').forEach(btn=>btn.onclick=()=>{
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(btn.dataset.m173Copy).then(()=>showToast(m173T('Fuente copiada','Source copied'))).catch(()=>showToast(btn.dataset.m173Copy));
  else showToast(btn.dataset.m173Copy);
 });
 node.querySelectorAll('[data-m173-replace]').forEach(btn=>btn.onclick=()=>{
  if(m173ReplaceSelection(btn.dataset.m173Replace))document.querySelector('.m173-syn-popup')?.remove();
  else showToast(m173T('La selección ya no está disponible','The selection is no longer available'));
 });
}
async function m173PerformLookup(node,term,onlySyn=false){
 const token=++m173Sequence;
 const t=m173Text();const word=term.trim();
 if(!word){node.textContent=t.ready;return}
 node.textContent=t.loading;
 try{
  const data=await m173Lookup(word,m173Lang());if(token!==m173Sequence||!node.isConnected)return;
  m173WriteResults(node,word,m173Lang(),data,onlySyn);
 }catch(err){if(token!==m173Sequence||!node.isConnected)return;
  const missing=String(err).includes('MARGEN_LEXICON_MISSING');node.textContent=missing?t.missing:t.error;
 }
}
function m173LanguageSelect(){const t=m173Text(),sel=m173Lang();return `<select id="m173-language" class="m173-language" aria-label="${m173Safe(m173T('Idioma de consulta','Lookup language'))}"><option value="es" ${sel==='es'?'selected':''}>${m173Safe(t.es)}</option><option value="en" ${sel==='en'?'selected':''}>${m173Safe(t.en)}</option></select>`}
// Replace ONLY the contents of the existing Dictionary tab, never create an extra tab.
dictionaryHtml=function(){const t=m173Text();return `<div class="workspace-head"><div><div class="eyebrow">${m173Safe(t.heading)}</div><h1>${m173Safe(t.title)}</h1></div><button type="button" class="btn ghost" data-m173-credits>${m173Safe(t.licenses)}</button></div><div class="main-scroll"><div class="dictionary-page m173-dictionary"><div class="m173-lookup-bar"><label for="dictionary-query" class="eyebrow">${m173Safe(t.entry)}</label>${m173LanguageSelect()}</div><input class="dict-search" id="dictionary-query" placeholder="${m173Safe(t.example)}" autocomplete="off" spellcheck="false"/><p class="m173-subtle">${m173Safe(t.independent)}</p><div id="dictionary-result" class="m173-lex-results" aria-live="polite"></div></div></div>`};
wireDictionary=function(){
 const input=document.getElementById('dictionary-query');if(!input)return;
 const output=document.getElementById('dictionary-result');let timeout=0;
 const lookup=()=>{clearTimeout(timeout);timeout=setTimeout(()=>m173PerformLookup(output,input.value,false),130)};
 input.addEventListener('input',lookup);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();clearTimeout(timeout);m173PerformLookup(output,input.value,false)}});
 document.getElementById('m173-language')?.addEventListener('change',event=>{m173Language=event.target.value;lookup()});
 document.querySelector('[data-m173-credits]')?.addEventListener('click',m173OpenCredits);
 input.value='';output.textContent=m173Text().ready;
};
// Reuse the existing "Sinónimos" tool IN the editor; no extra navigation item.
synonymPopup=function(){
 document.querySelector('.syn-popup')?.remove();const t=m173Text();
 const replacement=m173ReplacementInfo()||m173CaptureReplacement();const selected=replacement?.word||'';
 const div=document.createElement('section');div.className='syn-popup m173-syn-popup';div.innerHTML=`<div class="syn-header"><h3 class="syn-title">${m173Safe(t.synonyms)}</h3><button class="syn-close" aria-label="${m173Safe(t.close)}">✕</button></div><p class="char-helper">${m173Safe(t.welcome)}</p><div class="m173-syn-controls">${m173LanguageSelect()}<input class="syn-search" id="syn-search" type="search" value="${m173Safe(selected)}" placeholder="${m173Safe(t.example)}" autocomplete="off"/></div><div class="syn-results m173-lex-results" id="syn-results" aria-live="polite"></div><p class="m173-subtle"><button type="button" class="btn ghost m173-credits-inline" data-m173-credits>${m173Safe(t.licenses)}</button></p>`;
 document.body.append(div);const input=div.querySelector('#syn-search'),out=div.querySelector('#syn-results');let timeout;
 const lookup=()=>{clearTimeout(timeout);timeout=setTimeout(()=>m173PerformLookup(out,input.value,true),130)};
 input.addEventListener('input',lookup);div.querySelector('#m173-language').addEventListener('change',e=>{m173Language=e.target.value;lookup()});
 div.querySelector('.syn-close').onclick=()=>{++m173Sequence;m173Replacement=null;div.remove()};
 div.querySelector('[data-m173-credits]').onclick=m173OpenCredits;
 if(input.value)m173PerformLookup(out,input.value,true);else out.textContent=t.ready;
 input.focus();input.select();
};
function m173OpenCredits(){
 document.querySelector('.m173-legal-backdrop')?.remove();const en=m173Ui()==='en';
 const block=document.createElement('div');block.className='m173-legal-backdrop';
 block.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="m173-license-title" class="m173-legal-dialog"><header><h2 id="m173-license-title">${en?'Sources and licenses':'Fuentes y licencias'}</h2><button type="button" class="btn ghost" data-m173-close>${en?'Close':'Cerrar'}</button></header><p>${en?'The lexical datasets below are separate from MARGEN and your books. They are converted at build time and kept as independent, read-only SQLite files.':'Las bases léxicas son independientes de MARGEN y de tus libros. Se convierten al compilar y se conservan como archivos SQLite independientes de solo lectura.'}</p>
 <article><h3>Open English WordNet 2025</h3><p>© Open English WordNet Team · CC BY 4.0. ${en?'Derived from Princeton WordNet under the Princeton WordNet License.':'Derivado de Princeton WordNet, sujeto también a la licencia WordNet de Princeton.'}</p><code>https://en-word.net/</code><code>https://github.com/globalwordnet/english-wordnet/blob/main/LICENSE.md</code></article>
 <article><h3>Spanish WordNet · MCR 3.0</h3><p>Multilingual Central Repository · CC BY 3.0. ${en?'Spanish lemmas and synsets from the MCR resource.':'Lemas y conjuntos de sinónimos del recurso MCR.'}</p><code>https://nlp.lsi.upc.edu/esWN/licenseWN.php</code><code>https://github.com/omwn/omw-data/tree/main/wns/mcr</code></article>
 <article><h3>Wikcionario (español)</h3><p>${en?'Wikimedia contributors · CC BY-SA 4.0; extracted definitions redistributed with the same license.':'Colaboradores de Wikimedia · CC BY-SA 4.0; definiciones extraídas y redistribuidas bajo la misma licencia.'}</p><p>${en?'Attribution and editing history can be consulted from each entry at es.wiktionary.org.':'La autoría y el historial de cada entrada se pueden consultar en es.wiktionary.org.'}</p><code>https://es.wiktionary.org/</code><code>https://creativecommons.org/licenses/by-sa/4.0/</code></article>
 <p class="m173-subtle">${en?'The installer includes a license and provenance manifest with the exact downloaded source hashes. No source endorses MARGEN.':'El instalador incorpora las licencias y un registro de procedencia con las huellas de los archivos de origen. Ninguna fuente patrocina MARGEN.'}</p></section>`;
 document.body.append(block);block.querySelector('[data-m173-close]').onclick=()=>block.remove();block.addEventListener('click',e=>{if(e.target===block)block.remove()});
 block.querySelector('[data-m173-close]').focus();
}
// Help menu: insert a license entry next to the existing guided tour entries.
document.addEventListener('click',event=>{
 if(event.target.closest('.m170-help-btn')){
  const menu=document.querySelector('.m170-help-popover');if(menu&&!menu.querySelector('[data-m173-help]')){
   const btn=document.createElement('button');btn.className='btn';btn.type='button';btn.dataset.m173Help='';btn.textContent=m173Text().licenses;btn.onclick=()=>{m170CloseHelp();m173OpenCredits()};menu.append(btn);
  }
 }
 if(event.key==='Escape')document.querySelector('.m173-legal-backdrop')?.remove();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.m173-legal-backdrop')?.remove()});
// La ayuda antigua que afirmaba que el diccionario solo contenía español ya no es válida.
const m173RenderPrevious=render;
render=function(){m173RenderPrevious();document.querySelector('.m1451-dictionary-note')?.remove();};

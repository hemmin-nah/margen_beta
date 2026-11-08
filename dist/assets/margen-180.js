'use strict';
/* MARGEN Desktop 1.12.0 — Exportación editorial configurable.
 * No edita libros. DOCX: OOXML sin compresión (ZIP STORE); PDF: texto seleccionable
 * con fuentes PDF estándar, imágenes raster y paginado sencillo; TXT: UTF-8.
 * Sin recursos externos, sin red ni scripts de terceros. GALERADA conservará
 * composición editorial avanzada, cubiertas, imprenta y EPUB.
 */
const m180 = (() => {
  const T=(es,en)=>typeof m146T==='function'?m146T(es,en):es;
  const XML=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
  const E=s=>typeof esc==='function'?esc(s):XML(s);
  const encoder=new TextEncoder();
  const PAGE={a4:[210,297],book:[150,230],letter:[215.9,279.4]};
  const settings={format:'docx',paper:'a4',margins:{top:20,right:20,bottom:20,left:20},font:'Georgia',size:11,leading:1.5,breaks:true};
  const SIDES=['top','right','bottom','left'];
  function validLayout(){const [w,h]=PAGE[settings.paper],m=settings.margins;return SIDES.every(k=>Number.isFinite(m[k])&&m[k]>=0&&m[k]<=80)&&w-m.left-m.right>=30&&h-m.top-m.bottom>=40&&Number.isFinite(settings.size)&&settings.size>=7&&settings.size<=36&&Number.isFinite(settings.leading)&&settings.leading>=1&&settings.leading<=3;}
  function layoutError(){return T('Revisa los márgenes y los valores: deja al menos 30 mm de ancho y 40 mm de alto útiles.','Check margins and values: at least 30 mm usable width and 40 mm usable height are required.')}

  let selected=new Set(),projectId='',working=false,previewIndex=0;
  let warningSet=new Set();
  function warn(s){warningSet.add(s)}
  function optionsHtml(){return [['a4','A4 (210 × 297 mm)'],['book','15 × 23 cm'],['letter','US Letter']].map(([k,v])=>`<option value="${k}" ${settings.paper===k?'selected':''}>${v}</option>`).join('')}
  function wordText(s){const div=document.createElement('div');div.innerHTML=s||'';return div.textContent||''}
  const visibleTitle=c=>String(c?.documentTitle??c?.title??'');
  function chapters(){return (activeProject()?.chapters||[]).filter(c=>selected.has(c.id))}
  function reset(){const p=activeProject();if(!p)return;projectId=p.id;selected=new Set((p.chapters||[]).map(c=>c.id));warningSet=new Set();previewIndex=0;}
  function previewContent(ch){
    const clone=document.createElement('div');clone.innerHTML=ch.html||'';
    clone.querySelectorAll('script,iframe,object,embed,form,video,audio,svg,style,link,meta').forEach(x=>x.remove());
    clone.querySelectorAll('*').forEach(node=>{
      for(const attr of [...node.attributes]){
        if(/^on/i.test(attr.name)||(['src','href'].includes(attr.name)&&!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(attr.value)) || attr.name==='contenteditable')node.removeAttribute(attr.name);
        if(attr.name==='style')node.setAttribute('style',attr.value.replace(/(?:^|;)\s*(?:color|background(?:-color)?|font-family|font-size|line-height)[^;]*/ig,''));
      }
    });return clone.innerHTML;
  }
  function redrawPreview(){
    const screen=document.querySelector('#m180-sample');if(!screen)return;
    const [w,h]=PAGE[settings.paper],m=settings.margins,list=chapters();
    previewIndex=Math.max(0,Math.min(previewIndex,Math.max(0,list.length-1)));
    const current=list[previewIndex];
    screen.style.width=`min(100%,${Math.round(w*3.1)}px)`;screen.style.aspectRatio='auto';screen.style.minHeight=`${Math.round(h*3.1)}px`;
    screen.style.padding=`${m.top/w*100}% ${m.right/w*100}% ${m.bottom/w*100}% ${m.left/w*100}%`;
    screen.style.fontFamily=settings.font+', serif';screen.style.fontSize=`${settings.size}px`;screen.style.lineHeight=String(settings.leading);screen.style.overflow='visible';
    const align=current?.titleLayout?.align||'left';
    screen.innerHTML=current?`<h2 style="text-align:${['center','right'].includes(align)?align:'left'}">${E(visibleTitle(current)||T('Sin título','Untitled'))}</h2><div class="m180-preview-rich ${current.mode==='screenplay'?'m180-screenplay-preview':''}">${previewContent(current)}</div>`:`<p>${T('Selecciona al menos un capítulo.','Select at least one chapter.')}</p>`;
    document.querySelector('#m180-count').textContent=list.length?T(`${previewIndex+1} / ${list.length} · ${list.length} de ${activeProject()?.chapters?.length||0} capítulos`,`${previewIndex+1} / ${list.length} · ${list.length} of ${activeProject()?.chapters?.length||0} chapters`):T('0 capítulos','0 chapters');
    const prev=document.querySelector('#m112-preview-prev'),next=document.querySelector('#m112-preview-next');if(prev)prev.disabled=!list.length||previewIndex<=0;if(next)next.disabled=!list.length||previewIndex>=list.length-1;
    const go=document.querySelector('#m180-go');if(go)go.disabled=!list.length||working||!validLayout();const warning=document.querySelector('#m190-error');if(warning){warning.textContent=validLayout()?'':layoutError();warning.hidden=validLayout();}
  }
  function open(onlyCurrent=false){
    const p=activeProject();if(!p)return;
    document.querySelector('.m180-backdrop')?.remove();reset();
    if(onlyCurrent===true&&activeChapter()?.id)selected=new Set([activeChapter().id]);
    const root=document.createElement('div');root.className='m180-backdrop';root.dataset.m180='';
    root.innerHTML=`<section class="m180-dialog" role="dialog" aria-modal="true" aria-labelledby="m180-title">
      <header class="m180-top"><div><span class="eyebrow">MARGEN · 1.12.1</span><h2 id="m180-title">${T('Exportación editorial','Editorial export')}</h2><p>${E(p.name)}</p></div><button type="button" class="iconbtn" id="m180-close" aria-label="${T('Cerrar','Close')}">${ic('close')}</button></header>
      <div class="m180-columns"><div class="m180-controls">
        <h3>${T('Documento','Document')}</h3>
        <label class="m180-label" for="m180-format">${T('Formato de archivo','File format')}</label><select id="m180-format"><option value="docx">Word (.docx)</option><option value="pdf">PDF (.pdf)</option><option value="txt">${T('Texto sin formato','Plain text')} (.txt)</option></select>
        <div class="m180-chapter-head"><h3>${T('Capítulos','Chapters')}</h3><div><button type="button" id="m180-all">${T('Todos','All')}</button><button type="button" id="m180-none">${T('Ninguno','None')}</button></div></div>
        <div class="m180-chapters" id="m180-chapters">${(p.chapters||[]).map((c,i)=>`<label><input type="checkbox" data-m180-chapter="${E(c.id)}" checked><span class="m180-seq">${i+1}.</span><span><strong>${E(c.title||T('Sin título','Untitled'))}</strong>${visibleTitle(c)!==c.title?`<small class="m112-export-visible-title">${E(visibleTitle(c))}</small>`:''}</span></label>`).join('')}</div>
        <div class="m180-layout" id="m180-layout"><h3>${T('Presentación','Page setup')}</h3>
          <div class="m180-fields"><label>${T('Página','Paper size')}<select id="m180-paper">${optionsHtml()}</select></label>
          <div class="m190-margins"><span class="m190-field-title">${T('Márgenes independientes (mm)','Individual margins (mm)')}</span><div class="m190-four-margins">${[['top',T('Superior','Top')],['right',T('Derecho','Right')],['bottom',T('Inferior','Bottom')],['left',T('Izquierdo','Left')]].map(([key,label])=>`<label>${label}<input id="m190-${key}" type="number" min="0" max="80" step="0.5" value="${settings.margins[key]}"></label>`).join('')}</div></div>
          <label>${T('Tipografía','Typeface')}<select id="m180-font">${['Georgia','Times New Roman','Arial','Courier New'].map(x=>`<option ${x===settings.font?'selected':''}>${x}</option>`).join('')}</select></label>
          <label>${T('Tamaño (pt)','Font size (pt)')}<input id="m180-size" type="number" min="7" max="36" step="0.5" value="${settings.size}"></label>
          <label>${T('Interlineado','Line spacing')}<input id="m180-leading" type="number" min="1" max="3" step="0.05" value="${settings.leading}"></label></div><p class="m190-error" id="m190-error" role="alert" hidden></p>
          <label class="m180-check"><input type="checkbox" id="m180-breaks" ${settings.breaks?'checked':''}>${T('Cada capítulo comienza en una página nueva','Start each chapter on a new page')}</label>
        </div>
      </div><div class="m180-preview"><div class="m180-preview-top"><h3>${T('Vista previa','Preview')}</h3><div class="m112-preview-nav"><button type="button" class="iconbtn" id="m112-preview-prev" title="${T('Capítulo anterior','Previous chapter')}">${ic('back')}</button><span id="m180-count"></span><button type="button" class="iconbtn" id="m112-preview-next" title="${T('Capítulo siguiente','Next chapter')}">${ic('chevron')}</button></div></div><div class="m180-preview-space"><div class="m180-paper" id="m180-sample"></div></div><p class="m180-note">${T('Vista previa orientativa. Los saltos de página dependen del formato elegido. TXT no conserva estilos ni imágenes.','Illustrative preview. Page breaks depend on the exported format. TXT does not preserve styles or images.')}</p></div></div>
      <footer class="m180-bottom"><span id="m180-status" aria-live="polite"></span><button type="button" class="btn ghost" id="m180-cancel">${T('Cancelar','Cancel')}</button><button type="button" class="btn primary" id="m180-go">${ic('download')} ${T('Exportar archivo','Export file')}</button></footer>
    </section>`;
    document.body.append(root);
    const close=()=>{if(!working)root.remove()};
    root.querySelector('#m180-close').onclick=close;root.querySelector('#m180-cancel').onclick=close;
    root.addEventListener('pointerdown',e=>{if(e.target===root)close()});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
    root.querySelectorAll('[data-m180-chapter]').forEach(ch=>ch.onchange=()=>{if(ch.checked)selected.add(ch.dataset.m180Chapter);else selected.delete(ch.dataset.m180Chapter);previewIndex=0;redrawPreview()});
    root.querySelector('#m180-all').onclick=()=>{root.querySelectorAll('[data-m180-chapter]').forEach(ch=>{ch.checked=true;selected.add(ch.dataset.m180Chapter)});redrawPreview()};
    root.querySelector('#m180-none').onclick=()=>{root.querySelectorAll('[data-m180-chapter]').forEach(ch=>{ch.checked=false;selected.delete(ch.dataset.m180Chapter)});previewIndex=0;redrawPreview()};
    root.querySelector('#m112-preview-prev').onclick=()=>{previewIndex=Math.max(0,previewIndex-1);redrawPreview();root.querySelector('.m180-preview-space').scrollTop=0};
    root.querySelector('#m112-preview-next').onclick=()=>{previewIndex=Math.min(chapters().length-1,previewIndex+1);redrawPreview();root.querySelector('.m180-preview-space').scrollTop=0};
    for(const [id,prop,convert] of [['format','format',String],['paper','paper',String],['font','font',String],['size','size',Number],['leading','leading',Number]])root.querySelector('#m180-'+id).onchange=e=>{settings[prop]=convert(e.target.value);syncLayout();redrawPreview()};
    for(const key of SIDES){const input=root.querySelector('#m190-'+key);input.addEventListener('input',()=>{settings.margins[key]=input.value===''?NaN:Number(input.value);redrawPreview()})};
    for(const id of ['size','leading'])root.querySelector('#m180-'+id).addEventListener('input',e=>{settings[id]=e.target.value===''?NaN:Number(e.target.value);redrawPreview()});
    root.querySelector('#m180-breaks').onchange=e=>{settings.breaks=e.target.checked;redrawPreview()};
    function syncLayout(){root.querySelector('#m180-layout').hidden=settings.format==='txt';root.querySelector('#m180-sample').classList.toggle('m180-txt-preview',settings.format==='txt')}
    root.querySelector('#m180-go').onclick=go;
    syncLayout();redrawPreview();root.querySelector('#m180-format').focus();
  }
  function normalText(html){const d=new DOMParser().parseFromString(html||'','text/html');
    d.querySelectorAll('script,style,iframe,object').forEach(n=>n.remove());
    const out=[];
    const blocks=d.body.querySelectorAll('p,blockquote,h1,h2,h3,h4,h5,h6,li,div,tr,img');
    if(!blocks.length)return (d.body.textContent||'').trim();
    blocks.forEach(node=>{
      if(node.matches('div')&&node.querySelector('p,li,h1,h2,h3,h4,h5,h6,div,tr'))return;
      if(node.matches('img')){out.push('[Imagen]');return}
      if(node.matches('tr')){out.push([...node.querySelectorAll('th,td')].map(c=>c.textContent.trim()).join(' | '));return}
      if(node.closest('tr')||node.matches('p')&&node.parentElement?.matches('blockquote'))return;
      out.push((node.textContent||'').trim());
    });return out.filter(Boolean).join('\r\n\r\n');
  }
  function makeTxt(list){return '\ufeff'+list.map(c=>[visibleTitle(c)||c.title||'',normalText(c.html)].join('\r\n\r\n')).join('\r\n\r\n\r\n');}
  // Intermedio entre HTML del editor y los dos formatos enriquecidos.
  function parseBlocks(html){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html'),out=[];
    doc.querySelectorAll('script,style,iframe,object,embed,video,form').forEach(node=>node.remove());
    function inline(node,state={}){
      if(node.nodeType===3)return [{text:node.nodeValue||'',...state}];
      if(node.nodeType!==1)return [];
      const tag=node.tagName.toLowerCase();
      if(tag==='br')return [{text:'\n',...state}];
      if(tag==='img')return [{image:node.getAttribute('src')||'',width:Number(node.getAttribute('width'))||undefined,height:Number(node.getAttribute('height'))||undefined}];
      if(['script','style'].includes(tag))return [];
      let newState={...state};if(['strong','b'].includes(tag))newState.bold=true;
      if(['em','i'].includes(tag))newState.italic=true;
      if(['u','ins'].includes(tag))newState.underline=true;
      const css=node.getAttribute('style')||'';
      if(/font-weight\s*:\s*(bold|[6-9]00)/i.test(css))newState.bold=true;
      if(/font-style\s*:\s*italic/i.test(css))newState.italic=true;
      if(/text-decoration(?:-line)?\s*:[^;]*underline/i.test(css))newState.underline=true;
      return [...node.childNodes].flatMap(c=>inline(c,newState));
    }
    function para(node,kind='body',extra={}){
      let runs=inline(node);if(!runs.length||runs.every(r=>!r.image&&!r.text.trim())){out.push({kind,runs:[],...extra});return}
      // No se exportan colores de Word: MARGEN ya utiliza tinta de tema.
      const align=(node?.style?.textAlign||node?.getAttribute?.('align')||'').toLowerCase();
      out.push({kind,runs,...extra,align:['center','right','justify'].includes(align)?align:''});
    }
    function walk(node){
      if(node.nodeType===3){if(node.nodeValue?.trim())out.push({kind:'body',runs:inline(node)});return}
      if(node.nodeType!==1)return;
      const tag=node.tagName.toLowerCase();
      if(['h1','h2','h3','h4','h5','h6'].includes(tag)){para(node,'heading',{level:Number(tag[1])});return}
      if(tag==='p'){const script=node.dataset.script||(/^sc-(scene|action|character|dialogue|parenthetical|transition|shot)$/.exec(node.className||'')||[])[1];if(script){const upper=['scene','character','transition','shot'].includes(script);if(upper)out.push({kind:'script-'+script,runs:inline(node).map(r=>r.text?{...r,text:r.text.toUpperCase()}:r),script});else para(node,'script-'+script,{script});return}para(node);return}
      if(tag==='blockquote'){para(node,'quote');return}
      if(tag==='ul'||tag==='ol'){
        let number=0;
        for(const li of node.children){if(li.tagName.toLowerCase()!=='li')continue;
          para(li,'list',{prefix:tag==='ol'?`${++number}. `:'• '});}
        return;
      }
      if(tag==='table'){
        const rows=[...node.querySelectorAll(':scope > tbody > tr,:scope > thead > tr,:scope > tr,:scope > tfoot > tr')];
        for(const tr of rows){const cells=[...tr.children].filter(c=>['td','th'].includes(c.tagName.toLowerCase()));
          out.push({kind:'table',cells:cells.map(c=>inline(c)),head:cells.some(c=>c.tagName.toLowerCase()==='th')});}
        return;
      }
      if(tag==='img'){out.push({kind:'body',runs:inline(node)});return}
      if(tag==='hr'){out.push({kind:'body',runs:[{text:'────────'}]});return}
      if(tag==='br'){out.push({kind:'body',runs:[]});return}
      if(['div','section','article','figure','body'].includes(tag)){
        if([...node.childNodes].some(n=>n.nodeType===1&&/^(p|div|h[1-6]|ul|ol|table|blockquote|img|figure)$/i.test(n.tagName)))for(const c of node.childNodes)walk(c);
        else para(node);return;
      }
      para(node);
    }
    [...doc.body.childNodes].forEach(walk);
    return out;
  }
  const encBase64=(arr)=>{let out='';for(let i=0;i<arr.length;i+=32768)out+=String.fromCharCode(...arr.subarray(i,i+32768));return btoa(out)};
  const fromBase64=s=>{const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  async function imageInfo(run){
    if(!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(run.image||'')){warn(T('Se han omitido imágenes externas.','External images were omitted.'));return null}
    const uri=run.image;const mime=uri.slice(5,uri.indexOf(';')).toLowerCase();const bytes=fromBase64(uri.slice(uri.indexOf(',')+1));
    if(bytes.length>18*1024*1024){warn(T('Se ha omitido una imagen superior a 18 MB.','An image larger than 18 MB was omitted.'));return null}
    let width=run.width||640,height=run.height||400;
    const img=new Image();const load=()=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=uri});
    try{await load();const naturalW=img.naturalWidth||width,naturalH=img.naturalHeight||height;
      width=run.width||naturalW;height=run.height||(run.width?run.width*naturalH/naturalW:naturalH);
    }catch(_){warn(T('No se pudo leer una imagen.','Could not decode an image.'));return null}
    if(width<1||height<1)return null;
    let data=bytes,ext=mime.includes('jpeg')||mime.includes('jpg')?'jpeg':'png';
    if(!['image/png','image/jpeg','image/jpg'].includes(mime)){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(img,0,0);data=fromBase64(canvas.toDataURL('image/png').split(',')[1]);ext='png';
    }
    return {data,ext,width,height,img};
  }
  function mmPt(mm){return mm*72/25.4}
  async function withImages(list){
    const ch=[];const images=new Map();let count=0;
    for(const c of list){const blocks=parseBlocks(c.html),imagesInChapter=[];
      for(const block of blocks)for(const run of block.runs||block.cells?.flat()||[]){
        if(!run.image)continue;
        if(!images.has(run.image)){const entry=await imageInfo(run);images.set(run.image,entry);if(entry)count+=entry.data.length;
          if(count>80*1024*1024)throw Error(T('Las imágenes superan 80 MB. Exporta menos capítulos.','Images exceed 80 MB. Select fewer chapters.'));
        }
      }
      ch.push({title:visibleTitle(c)||c.title||T('Sin título','Untitled'),titleAlign:c.titleLayout?.align||'left',mode:c.mode||'prose',blocks});
    }return {chapters:ch,images};
  }
  // ZIP STORE, sin dependencias. DOCX admite archivos ZIP sin comprimir.
  const CRC_TABLE=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
  function concat(arrays){const size=arrays.reduce((s,b)=>s+b.length,0),res=new Uint8Array(size);let at=0;for(const b of arrays){res.set(b,at);at+=b.length}return res}
  function zip(entries){
    let at=0;const chunks=[],central=[];const time=new Date(),dosTime=(time.getHours()<<11)|(time.getMinutes()<<5)|(time.getSeconds()>>>1),dosDate=((Math.max(1980,time.getFullYear())-1980)<<9)|((time.getMonth()+1)<<5)|time.getDate();
    for(const [name,raw] of entries){const nb=encoder.encode(name),data=typeof raw==='string'?encoder.encode(raw):raw,crc=crc32(data);
      const local=new Uint8Array(30+nb.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nb.length,true);local.set(nb,30);
      chunks.push(local,data);
      const cen=new Uint8Array(46+nb.length),cv=new DataView(cen.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,nb.length,true);cv.setUint32(42,at,true);cen.set(nb,46);central.push(cen);
      at+=local.length+data.length;
    }
    const cdir=concat(central),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,cdir.length,true);ev.setUint32(16,at,true);
    return concat([...chunks,cdir,end]);
  }
  // ---- DOCX ----
  function wordRun(text,style={}){
    if(!text)return '';
    const font=XML(settings.font),size=Math.round(settings.size*2);
    const props=`<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/><w:color w:val="000000"/><w:sz w:val="${size}"/>${style.bold?'<w:b/>':''}${style.italic?'<w:i/>':''}${style.underline?'<w:u w:val="single"/>':''}`;
    return String(text).split('\n').map((part,i)=>`${i?'<w:r><w:br/></w:r>':''}${part?`<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${XML(part)}</w:t></w:r>`:''}`).join('');
  }
  async function docx(work){
    const {chapters,images}=work,[pw,ph]=PAGE[settings.paper],pageWidth=Math.round(pw*1440/25.4),pageHeight=Math.round(ph*1440/25.4),m=settings.margins,twip=k=>Math.round(m[k]*1440/25.4),textWidth=pageWidth-twip('left')-twip('right');
    const widthEmu=Math.round((pw-m.left-m.right)/25.4*914400),heightEmu=Math.round((ph-m.top-m.bottom)/25.4*914400);
    const usedImages=new Map(),imageFiles=[],relationships=[];let seq=0;
    function imageRun(src){const info=images.get(src);if(!info)return '';
      if(!usedImages.has(src)){
        const idx=++seq,rid=`rIdImage${idx}`,file=`image${idx}.${info.ext}`;
        usedImages.set(src,{rid,idx});imageFiles.push([`word/media/${file}`,info.data]);
        relationships.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${file}"/>`);
      }
      const {rid,idx}=usedImages.get(src);let w=info.width/96*914400,h=info.height/96*914400;
      const ratio=Math.min(1,widthEmu/w,heightEmu/h);w=Math.max(1,Math.round(w*ratio));h=Math.max(1,Math.round(h*ratio));
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${w}" cy="${h}"/><wp:docPr id="${idx}" name="Image ${idx}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Image ${idx}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }
    function runXML(runs){return (runs||[]).map(r=>r.image?imageRun(r.image):wordRun(r.text,r)).join('')}
    function paragraph(runs,kind='body',extra={}){
      const line=Math.round(240*settings.leading),after=kind==='chapter'?260:kind==='heading'?160:kind==='quote'?160:120;
      let prop=`<w:spacing w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
      if(kind==='chapter')prop+=`<w:keepNext/>${extra.breakBefore?'<w:pageBreakBefore/>':''}<w:outlineLvl w:val="0"/>`;
      if(kind==='heading')prop+='<w:keepNext/>';
      if(['center','right','justify'].includes(extra.align))prop+=`<w:jc w:val="${extra.align==='justify'?'both':extra.align}"/>`;
      if(kind==='chapter'&&['center','right'].includes(extra.titleAlign))prop+=`<w:jc w:val="${extra.titleAlign}"/>`;
      if(kind==='script-scene'||kind==='script-shot')prop+='<w:keepNext/>';
      if(kind==='script-character')prop+='<w:jc w:val="center"/><w:keepNext/>';
      if(kind==='script-dialogue')prop+='<w:ind w:left="1700" w:right="1350"/>';
      if(kind==='script-parenthetical')prop+='<w:ind w:left="2450" w:right="2050"/>';
      if(kind==='script-transition')prop+='<w:jc w:val="right"/>';
      if(kind==='quote')prop+='<w:ind w:left="650"/>';
      if(kind==='list')prop+='<w:ind w:left="360" w:hanging="160"/>';
      const b=kind==='chapter'?{bold:true}:kind==='heading'?{bold:true}:{};
      const sz=kind==='chapter'?Math.round((settings.size+5)*2):kind==='heading'?Math.round((settings.size+2)*2):Math.round(settings.size*2);
      const pR=kind==='chapter'||kind==='heading'?`<w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr>`:'';
      const listPrefix=extra.prefix?wordRun(extra.prefix):'';
      // For headings and chapter titles, set font sizing on each run so Word renders it consistently.
      const exportRuns=(kind==='script-scene'||kind==='script-shot')?(runs||[]).map(x=>x.image?x:{...x,bold:true}):runs;
      const r=kind==='chapter'||kind==='heading'?wordRun((runs||[]).map(x=>x.text||'').join(''),{...b}):runXML(exportRuns);
      let content=r;
      if(kind==='chapter'||kind==='heading')content=content.replace(/<w:sz w:val="\d+"\/>/g,`<w:sz w:val="${sz}"/>`);
      return `<w:p><w:pPr>${prop}${pR}</w:pPr>${listPrefix}${content}</w:p>`;
    }
    function cellXML(runs,colWidth){return `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="2" w:color="BBBBBB"/></w:tcBorders></w:tcPr>${paragraph(runs)}</w:tc>`}
    let content='',chapterIndex=0,inTable=false;
    for(const ch of chapters){
      if(inTable){content+='</w:tbl>';inTable=false}
      content+=paragraph([{text:ch.title}], 'chapter',{breakBefore:chapterIndex>0&&settings.breaks,titleAlign:ch.titleAlign});chapterIndex++;
      for(const block of ch.blocks){
        if(block.kind==='table'){
          if(!inTable){const cols=Math.max(1,block.cells.length),colWidth=Math.floor((textWidth)/cols);
            content+=`<w:tbl><w:tblPr><w:tblW w:w="${textWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${Array.from({length:cols},()=>`<w:gridCol w:w="${colWidth}"/>`).join('')}</w:tblGrid>`;inTable=true}
          const colWidth=Math.floor((textWidth)/Math.max(1,block.cells.length));
          content+='<w:tr>'+block.cells.map(c=>cellXML(c,colWidth)).join('')+'</w:tr>';continue;
        }
        if(inTable){content+='</w:tbl>';inTable=false}
        content+=paragraph(block.runs,block.kind,block);
      }
    }
    if(inTable)content+='</w:tbl>';
    const sect=`<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"/><w:pgMar w:top="${twip('top')}" w:bottom="${twip('bottom')}" w:left="${twip('left')}" w:right="${twip('right')}" w:header="300" w:footer="300" w:gutter="0"/></w:sectPr>`;
    const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${content}${sect}</w:body></w:document>`;
    const rootRels=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
    const docRels=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${relationships.join('')}</Relationships>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${XML(settings.font)}" w:hAnsi="${XML(settings.font)}"/><w:color w:val="000000"/><w:sz w:val="${Math.round(settings.size*2)}"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
    const CT=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
    const title=XML(activeProject()?.name||'MARGEN');
    const core=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>MARGEN</dc:creator></cp:coreProperties>`;
    return zip([['[Content_Types].xml',CT],['_rels/.rels',rootRels],['word/document.xml',doc],['word/styles.xml',styles],['word/_rels/document.xml.rels',docRels],['docProps/core.xml',core],...imageFiles]);
  }
  // ---- PDF paginado, texto seleccionable + JPEG incrustados ----
  // Fuentes estándar PDF: Times / Helvetica / Courier. Unicode completo exige
  // una fuente incorporada (reservado para futuras mejoras, no maquetación GALERADA).
  const pdfMap={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
  function pdfEscape(s){let out='';for(const char of String(s||'')){
    const code=char.codePointAt(0);let b=(code>=32&&code<=126)||(code>=160&&code<=255)?code:pdfMap[char];
    if(b===undefined){b=63;warn(T('Algunos caracteres no latinos se han sustituido por ? en PDF. DOCX conserva Unicode.','Some non-Latin characters became ? in the PDF. DOCX preserves Unicode.'))}
    if(b===40||b===41||b===92)out+='\\'+String.fromCharCode(b);
    else if(b<32||b>126)out+='\\'+b.toString(8).padStart(3,'0');
    else out+=String.fromCharCode(b);
  }return out}
  function pdfTextWidth(text,size,font='Times New Roman',bold=false,italic=false){
    const ctx=pdfTextWidth.ctx||(pdfTextWidth.ctx=document.createElement('canvas').getContext('2d'));
    ctx.font=`${italic?'italic ':''}${bold?'bold ':''}${size}px ${font.includes(' ')?'"'+font+'"':font}`;
    return ctx.measureText(text).width;
  }
  function pdfImage(info){
    if(!info)return null;
    const maxPx=1800,ratio=Math.min(1,maxPx/Math.max(info.width,info.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(info.width*ratio));canvas.height=Math.max(1,Math.round(info.height*ratio));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(info.img,0,0,canvas.width,canvas.height);
    return {data:fromBase64(canvas.toDataURL('image/jpeg',.85).split(',')[1]),width:info.width,height:info.height,pixelWidth:canvas.width,pixelHeight:canvas.height};
  }
  function streamDict(payload){return [{text:`<< /Length ${payload.length} >>\nstream\n`},payload,{text:'\nendstream'}]}
  function pdfObject(content){return typeof content==='string'?encoder.encode(content):Array.isArray(content)?concat(content.map(part=>part.text!==undefined?encoder.encode(part.text):part)):content}
  function pdfBuild(objects,rootId){
    const out=[encoder.encode('%PDF-1.4\n%MARGEN\n')],offsets=[0];let offset=out[0].length;
    for(let i=1;i<objects.length;i++){
      offsets.push(offset);
      const pre=encoder.encode(`${i} 0 obj\n`),obj=pdfObject(objects[i]),post=encoder.encode('\nendobj\n');out.push(pre,obj,post);offset+=pre.length+obj.length+post.length;
    }
    const xrefAt=offset;
    let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    xref+=`trailer\n<< /Size ${objects.length} /Root ${rootId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
    out.push(encoder.encode(xref));return concat(out);
  }
  async function pdf(work){
    const [pw,ph]=PAGE[settings.paper].map(mmPt),m=settings.margins,left=mmPt(m.left),right=mmPt(m.right),top=mmPt(m.top),bottom=mmPt(m.bottom),maxW=pw-left-right,contentHeight=ph-top-bottom;
    const family=settings.font==='Arial'?'Helvetica':settings.font==='Courier New'?'Courier':'Times';
    const fontFaces=family==='Helvetica'?['Helvetica','Helvetica-Bold','Helvetica-Oblique','Helvetica-BoldOblique']:family==='Courier'?['Courier','Courier-Bold','Courier-Oblique','Courier-BoldOblique']:['Times-Roman','Times-Bold','Times-Italic','Times-BoldItalic'];
    const obj=[null],reserve=()=>{obj.push(null);return obj.length-1},set=(id,val)=>obj[id]=val;
    const rootId=reserve(),pagesId=reserve(),fontIds=fontFaces.map(()=>reserve()),imageMap=new Map();
    fontIds.forEach((id,i)=>set(id,`<< /Type /Font /Subtype /Type1 /BaseFont /${fontFaces[i]} /Encoding /WinAnsiEncoding >>`));
    const pageItems=[];let operations=[],y=ph-top;
    const pages=[];
    function finishPage(){if(!operations.length)return;pages.push(operations.join('\n'));operations=[]}
    function newPage(){finishPage();y=ph-top;operations.push('0 0 0 rg')}
    function ensure(space){if(y-space<bottom&&operations.length)newPage()}
    function line(runs,size=settings.size,kind='body',prefix='',indent=0,align=''){
      const leading=size*settings.leading,after=kind==='chapter'?size*.85:kind==='heading'?size*.7:kind==='quote'?size*.6:size*.55;
      let tokens=[];
      for(const r of runs||[]){if(r.image){tokens.push({image:r.image});continue}
        const text=r.text||'';
        // Dos saltos en un mismo run se convierten en líneas separadas.
        const parts=text.split(/(\n|\s+)/);
        for(const part of parts)if(part)tokens.push({text:part,bold:!!r.bold,italic:!!r.italic});
      }
      if(prefix)tokens.unshift({text:prefix,bold:false,italic:false});
      let current=[],width=0;const available=maxW-indent;
      function flush(){
        if(!current.length){ensure(leading);y-=leading;return}
        ensure(leading);y-=leading;
        let x=left+indent+(align==='center'?Math.max(0,(available-width)/2):align==='right'?Math.max(0,available-width):0);
        for(const t of current){const face=t.bold?(t.italic?3:1):(t.italic?2:0);
          const raw=t.text||'',w=pdfTextWidth(raw,size,settings.font,t.bold,t.italic);
          if(raw.trim())operations.push(`BT /F${face+1} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${(y+size*.23).toFixed(2)} Tm (${pdfEscape(raw)}) Tj ET`);
          x+=w;
        }current=[];width=0;
      }
      for(const t of tokens){
        if(t.image){if(current.length)flush();drawImage(t.image);continue}
        if(t.text==='\n'){flush();continue}
        let value=t.text,space=/^\s+$/.test(value);
        if(space&&!current.length)continue;
        let w=pdfTextWidth(value,size,settings.font,t.bold,t.italic);
        if(w>available&&!space){
          // Palabras largas: cortar por carácter, evitando salir de los márgenes.
          for(const ch of value){const cw=pdfTextWidth(ch,size,settings.font,t.bold,t.italic);
            if(width+cw>available&&current.length)flush();current.push({...t,text:ch});width+=cw;
          }continue;
        }
        if(width+w>available&&current.length){flush();if(space)continue}
        current.push(t);width+=w;
      }
      if(current.length)flush();
      y-=after;
    }
    function drawImage(source){const i=work.images.get(source);if(!i)return;
      let cached=imageMap.get(source);
      if(!cached){cached=pdfImage(i);if(!cached)return;cached.id=reserve();cached.name=`I${imageMap.size+1}`;imageMap.set(source,cached)}
      let w=cached.width/96*72,h=cached.height/96*72;
      let ratio=Math.min(1,maxW/w,(contentHeight-12)/h);w*=ratio;h*=ratio;
      ensure(h+12);y-=h;
      operations.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${left.toFixed(2)} ${y.toFixed(2)} cm /${cached.name} Do Q`);
      y-=12;
    }
    newPage();let count=0;
    for(const ch of work.chapters){
      if(count++&&settings.breaks)newPage();
      ensure(settings.size*5);
      line([{text:ch.title,bold:true}],settings.size+5,'chapter','',0,ch.titleAlign||'');
      for(const block of ch.blocks){
        if(block.kind==='table'){
          const text=(block.cells||[]).map(c=>c.map(r=>r.text||'').join('')).join('  |  ');
          line([{text}],settings.size,'body');continue;
        }
        const size=block.kind==='heading'?settings.size+2:settings.size;
        let runs=block.kind==='heading'?(block.runs||[]).map(r=>({...r,bold:true})):block.runs;
        let indent=block.kind==='quote'?mmPt(5):block.kind==='list'?mmPt(4):0,align=block.align||'';
        if(block.kind==='script-scene'||block.kind==='script-shot')runs=(runs||[]).map(r=>({...r,bold:true}));
        if(block.kind==='script-character')align='center';
        if(block.kind==='script-dialogue')indent=maxW*.18;
        if(block.kind==='script-parenthetical')indent=maxW*.27;
        if(block.kind==='script-transition')align='right';
        line(runs,size,block.kind,block.prefix||'',indent,align);
      }
    }
    finishPage();
    if(!pages.length)pages.push('');
    const xobjects=[];
    for(const img of imageMap.values()){
      set(img.id,pdfObject([{text:`<< /Type /XObject /Subtype /Image /Width ${img.pixelWidth} /Height ${img.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`},img.data,{text:'\nendstream'}]));
      xobjects.push(`/${img.name} ${img.id} 0 R`);
    }
    const pageRefs=[];
    for(const body of pages){const stream=encoder.encode(body),streamId=reserve(),pageId=reserve();
      set(streamId,pdfObject(streamDict(stream)));
      const f=fontIds.map((id,i)=>`/F${i+1} ${id} 0 R`).join(' ');
      set(pageId,`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pw.toFixed(3)} ${ph.toFixed(3)}] /Resources << /Font << ${f} >> /XObject << ${xobjects.join(' ')} >> >> /Contents ${streamId} 0 R >>`);
      pageRefs.push(pageId);
    }
    set(pagesId,`<< /Type /Pages /Kids [${pageRefs.map(x=>x+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`);
    set(rootId,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    return pdfBuild(obj,rootId);
  }
  async function save(bytes,extension){
    const p=activeProject(),name=(p?.name||'MARGEN').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').trim().slice(0,90)||'Manuscrito';
    const filename=name+'.'+extension;
    const mime={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pdf:'application/pdf',txt:'text/plain;charset=utf-8'}[extension];
    const invoke=window.__TAURI__?.core?.invoke;
    if(invoke){const result=await invoke('desktop_export_document',{filename,extension,dataBase64:encBase64(bytes)});return result}
    const url=URL.createObjectURL(new Blob([bytes],{type:mime})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    return T('Carpeta de descargas del navegador','Browser Downloads');
  }
  async function go(){
    if(working)return;
    if(!validLayout())return;
    const list=chapters();if(!list.length)return;
    const oldId=projectId;if(activeProject()?.id!==oldId){warn(T('Has cambiado de libro. Vuelve a abrir Exportar.','The active book has changed. Reopen Export.'));return}
    working=true;const status=document.querySelector('#m180-status');status.textContent=T('Preparando el manuscrito…','Preparing manuscript…');
    const button=document.querySelector('#m180-go');button.disabled=true;
    try{
      const extension=settings.format;let bytes;
      if(extension==='txt')bytes=encoder.encode(makeTxt(list));
      else{const work=await withImages(list);bytes=extension==='docx'?await docx(work):await pdf(work)}
      if(bytes.byteLength>95*1024*1024)throw Error(T('Archivo demasiado grande. Selecciona menos capítulos.','File too large. Select fewer chapters.'));
      status.textContent=T('Guardando archivo…','Saving file…');
      const path=await save(bytes,extension);
      if(path===null){status.textContent=T('Guardado cancelado. No se ha creado ningún archivo.','Save cancelled. No file was created.');return;}
      const cautions=[...warningSet];document.querySelector('.m180-backdrop')?.remove();
      const detail=T('Archivo guardado en:','File saved in:')+'\n'+path+(cautions.length?'\n\n'+cautions.join('\n'):'');
      if(typeof m172Notice==='function')void m172Notice(detail);else showToast(detail);
    }catch(err){console.error('MARGEN export error',err);if(status)status.textContent=T('No se pudo exportar: ','Export failed: ')+String(err?.message||err)}
    finally{working=false;if(button?.isConnected)button.disabled=false}
  }
  function mount(){
    if(!activeProject()||!['manuscript','book'].includes(state.view))return;
    const container=document.querySelector('.workspace-head');if(!container)return;
    const existing=container.querySelector('[data-action="export-text"],[data-action="export-script"]');
    if(existing){
      const btn=existing.cloneNode(true);btn.removeAttribute('data-action');btn.dataset.m180Export='';
      btn.innerHTML=ic('download')+' '+T('Exportar','Export');btn.onclick=open;existing.replaceWith(btn);return;
    }
    if(state.view==='book'&&!container.querySelector('[data-m180-export]')){
      const btn=document.createElement('button');btn.type='button';btn.className='btn m180-book-export';btn.dataset.m180Export='';
      btn.innerHTML=ic('download')+' '+T('Exportar libro','Export book');btn.onclick=open;
      container.append(btn);
    }
  }
  return {open,mount,parseBlocks,zip,pdf,docx,makeTxt,settings};
})();
exportText=function(){m180.open()};
exportCurrentScript=function(){m180.open(true)};
const m180PreviousRender=render;
render=function(){m180PreviousRender();const version=document.querySelector('.brand .m11-version');if(version)version.textContent='1.12.0 · Beta';m180.mount();};

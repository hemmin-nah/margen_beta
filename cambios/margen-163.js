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

'use strict';

const PLACE_GROUPS = [
  {heading: 'FACULTADES Y CARRERAS', places: [
    {id:'medicina',title:'Medicina',desc:'Bloque de aulas · sector identificable',icon:'✚',pin:[280,67],callout:[106,112,191],short:'MEDICINA',sub:'Bloque de aulas',
     route:[[448,305],[471,287],[507,270],[529,247],[479,220],[415,186],[356,166],[318,125],[280,67]],steps:['Ubica el origen señalado en verde.','Observa el recorrido azul hacia el sector superior izquierdo de la imagen.','Busca el bloque de aulas identificado como Medicina.']},
    {id:'empresariales',title:'Facultad de Ciencias Empresariales',desc:'Edificio identificado en el mapa',icon:'▣',pin:[859,166],callout:[681,191,200],short:'CIENCIAS',sub:'EMPRESARIALES',
     route:[[448,305],[471,287],[507,270],[529,247],[590,229],[644,208],[691,180],[748,173],[806,167],[859,166]],steps:['Parte desde el punto de origen señalado.','Sigue visualmente la ruta azul hacia el lado derecho del campus.','Identifica el bloque rotulado Ciencias Empresariales.']},
    {id:'sociales',title:'Facultad de Ciencias Sociales',desc:'Edificio identificado en el mapa',icon:'▣',pin:[700,58],callout:[548,91,175],short:'CIENCIAS SOCIALES',sub:'Sector superior del mapa',
     route:[[448,305],[471,287],[507,270],[529,247],[553,212],[574,177],[601,146],[617,107],[666,95],[700,58]],steps:['Comienza en el origen indicado.','Observa el recorrido hacia el sector central y superior de la imagen.','Busca la Facultad de Ciencias Sociales.']},
    {id:'civil',title:'Facultad de Ingeniería Civil',desc:'Edificio identificado en el mapa',icon:'▤',pin:[755,391],callout:[775,331,178],short:'INGENIERÍA CIVIL',sub:'Sector inferior derecho',
     route:[[448,305],[471,287],[507,270],[529,247],[588,276],[642,305],[696,314],[737,353],[755,391]],steps:['Identifica el punto de inicio.', 'La ruta ilustrativa se desplaza hacia la derecha y luego hacia la zona inferior del mapa.','Busca el edificio señalado como Ingeniería Civil.']},
  ]},
  {heading:'LABORATORIOS Y ESPACIOS',places:[
    {id:'laboratorio',title:'Laboratorio 1 · Empresariales',desc:'Laboratorio identificado en el mapa',icon:'◈',pin:[850,98],callout:[655,14,188],short:'LABORATORIO 1',sub:'Ciencias Empresariales',
     route:[[448,305],[471,287],[507,270],[529,247],[590,229],[644,208],[691,180],[746,148],[817,121],[850,98]],steps:['Comienza desde el origen fijo.','Sigue el trazo azul hacia la zona superior derecha.','Identifica el Laboratorio 1 de Empresariales.']},
    {id:'plaza',title:'Plazoleta central',desc:'Espacio circular visible en la imagen',icon:'◎',pin:[529,247],callout:[541,282,158],short:'PLAZOLETA',sub:'Referencia central',
     route:[[448,305],[471,287],[507,270],[529,247]],steps:['Ubica el origen verde.','Observa la ruta corta que llega al espacio circular central.']},
  ]}
];
const places = Object.fromEntries(PLACE_GROUPS.flatMap(g=>g.places.map(p=>[p.id,p])));
window.ORIENTA_PLACES = places;
const listEl = document.getElementById('listaLugares');
const searchInput = document.getElementById('buscar');
const resultCard = document.getElementById('resultCard');
const emptyCard = document.getElementById('emptyCard');
const svgNS='http://www.w3.org/2000/svg';
const mapSvg = document.getElementById('mapSvg');
const facMarkers=document.getElementById('facMarkers');
const routeLine=document.getElementById('routeLine');
const routeHalo=document.getElementById('routeHalo');
const destPulse=document.getElementById('destinationPulse');
let activeId=null;
let customIp='';

function escapeHtml(str){return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function createSVG(name, attrs={}, text=''){
  const el=document.createElementNS(svgNS,name);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
  if(text) el.textContent=text;
  return el;
}
function makeSpot(place){
  const [x,y]=place.pin;
  const [bx,by,w]=place.callout;
  const g=createSVG('g',{class:'spot',transform:'translate(0 0)',role:'button',tabindex:'0','aria-label':'Ver '+place.title,'data-place':place.id});
  const targetX=bx+(bx<x?w:0);const targetY=by+20;
  g.append(createSVG('line',{x1:x,y1:y,x2:targetX,y2:targetY,stroke:'#fff', 'stroke-opacity':'.83','stroke-width':'2'}));
  g.append(createSVG('circle',{cx:x,cy:y,r:10,class:'spot-pin'}));
  g.append(createSVG('circle',{cx:x,cy:y,r:4,class:'spot-center'}));
  g.append(createSVG('rect',{x:bx,y:by,width:w,height:44,rx:10,class:'spot-box'}));
  g.append(createSVG('text',{x:bx+12,y:by+18,class:'spot-text'},place.short));
  g.append(createSVG('text',{x:bx+12,y:by+34,class:'spot-sub'},place.sub));
  g.addEventListener('click',()=>selectPlace(place.id));
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPlace(place.id);}});
  facMarkers.append(g);
}
Object.values(places).filter(p=>p.pin).forEach(makeSpot);

function renderList(query=''){
  const q=query.trim().toLocaleLowerCase('es');
  listEl.replaceChildren();
  let count=0;
  PLACE_GROUPS.forEach(group=>{
    const rows=group.places.filter(p=>(p.title+' '+p.desc).toLocaleLowerCase('es').includes(q));
    if(!rows.length)return;
    const h=document.createElement('div');h.className='group-label';h.textContent=group.heading;listEl.append(h);
    rows.forEach(p=>{
      count++;
      const b=document.createElement('button');b.type='button';
      b.className='place-button'+(p.id===activeId?' selected':'');
      b.setAttribute('aria-pressed',String(p.id===activeId));
      b.innerHTML=`<span class="place-icon" aria-hidden="true">${escapeHtml(p.icon)}</span><span class="place-copy"><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.desc)}</small></span><span class="place-arrow" aria-hidden="true">›</span>`;
      b.addEventListener('click',()=>selectPlace(p.id));listEl.append(b);
    });
  });
  if(!count){const p=document.createElement('div');p.className='empty-filter';p.textContent='No se encontró un destino con ese nombre.';listEl.append(p);}
}
function clearMap(){
  routeLine.style.display='none';routeHalo.style.display='none';destPulse.style.display='none';
  document.querySelectorAll('.spot').forEach(e=>e.classList.remove('active'));
}
function routeUrl(id){
  const cfg=window.ORIENTA_CONFIG||{};
  if(cfg.publicUrl){const b=new URL(cfg.publicUrl);b.pathname='/';b.search='';b.hash='';b.searchParams.set('dest',id);return b.toString();}
  let u=new URL(window.location.href);u.pathname='/';u.hash='';u.search='';u.searchParams.set('dest',id);
  if(customIp) u.hostname=customIp;
  return u.toString();
}
function canShare(){
  if((window.ORIENTA_CONFIG||{}).publicUrl) return true;
  return location.protocol==='https:' || (location.protocol==='http:' && !['localhost','127.0.0.1','::1'].includes(customIp||location.hostname));
}
function renderQR(id){
  const help=document.getElementById('localHelp');
  const inner=document.getElementById('qrInner');
  if(!canShare()){
    help.hidden=false;inner.hidden=true;
    return;
  }
  help.hidden=true;inner.hidden=false;
  const url=routeUrl(id);
  const {QRCode,Levels}=window.QRCore;
  const code=new QRCode(-1,Levels.M);
  try{code.addData(url);code.make();}catch(error){
    inner.hidden=true;help.hidden=false;help.querySelector('p').textContent='No se pudo construir el código QR: '+error.message;return;
  }
  const count=code.getModuleCount(); const pad=4;const view=count+pad*2;
  let paths='';
  for(let r=0;r<count;r++) for(let c=0;c<count;c++) if(code.isDark(r,c)) paths+=`M${c+pad} ${r+pad}h1v1h-1z`;
  document.getElementById('qrSvg').innerHTML=`<svg viewBox="0 0 ${view} ${view}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Código QR con enlace a la ruta"><rect width="${view}" height="${view}" fill="white"/><path d="${paths}" fill="#102b52"/></svg>`;
  
  document.getElementById('btnCopy').onclick=async()=>{
    try {await navigator.clipboard.writeText(url);document.getElementById('btnCopy').textContent='¡Enlace copiado!';}
    catch(e){window.prompt('Copia esta dirección:',url);}
    setTimeout(()=>document.getElementById('btnCopy').textContent='Copiar enlace',1600);
  };
}
function selectPlace(id, opts={}){
  const p=places[id];if(!p)return;
  activeId=id;renderList(searchInput.value);
  resultCard.hidden=false;emptyCard.hidden=true;
  document.getElementById('resultTitle').textContent=p.title;
  document.getElementById('resultMeta').textContent='Entrada principal → '+p.title;
  const found=!!p.pin;
  document.getElementById('resultStatus').textContent=found?'Ruta ilustrativa':'Por ubicar';
  document.getElementById('foundResult').hidden=!found;
  document.getElementById('pendingResult').hidden=found;
  clearMap();
  if(found){
    const points=p.route.map(pt=>pt.join(',')).join(' ');
    routeHalo.setAttribute('points',points);
    routeLine.setAttribute('points',points);
    routeHalo.style.display='block';routeLine.style.display='block';
    destPulse.setAttribute('transform',`translate(${p.pin[0]} ${p.pin[1]})`);
    destPulse.style.display='block';
    const el=document.querySelector(`.spot[data-place="${CSS.escape(id)}"]`);if(el)el.classList.add('active');
    document.getElementById('routeEnd').textContent=p.title;
    document.getElementById('routeSteps').innerHTML=p.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('');
    renderQR(id);
  }
  document.dispatchEvent(new CustomEvent('orienta:select',{detail:{id,found}}));
  if(!opts.skipHistory){
    const u=new URL(location.href);u.searchParams.set('dest',id);history.replaceState(null,'',u.toString());
  }
  if(opts.scroll){
    const target=window.innerWidth<=980?document.querySelector('.workspace'):document.getElementById('resultCard');
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function reset(){
  document.dispatchEvent(new CustomEvent('orienta:reset'));
  activeId=null;searchInput.value='';renderList();clearMap();
  resultCard.hidden=true;emptyCard.hidden=false;
  const u=new URL(location.href);u.searchParams.delete('dest');history.replaceState(null,'',u.toString());
  window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('btnReset').addEventListener('click',reset);
searchInput.addEventListener('input',()=>renderList(searchInput.value));
document.getElementById('btnIp').addEventListener('click',()=>{
  const ip=document.getElementById('ipInput').value.trim();
  const parts=ip.split('.');
  if(parts.length!==4 || !parts.every(x=>/^\d{1,3}$/.test(x)&&Number(x)<=255)){
    alert('Escribe una dirección IPv4 válida, por ejemplo 192.168.1.10');return;
  }
  customIp=ip;if(activeId&&places[activeId].pin)renderQR(activeId);
});
renderList();
const initial=new URLSearchParams(location.search).get('dest');
if(initial&&places[initial]){
  if(window.innerWidth<=980) document.body.classList.add('mobile-route');
  selectPlace(initial,{skipHistory:true,scroll:false});
}

// En localhost: pedir al servidor la IP de la laptop para que el QR funcione desde el celular (mismo Wi-Fi).
if(['localhost','127.0.0.1','::1'].includes(location.hostname) && !(window.ORIENTA_CONFIG||{}).publicUrl){
  fetch('/api/lan').then(r=>r.json()).then(j=>{
    if(!j.ip) return;
    customIp=j.ip;const inp=document.getElementById('ipInput');if(inp)inp.value=j.ip;
    if(activeId&&places[activeId].pin)renderQR(activeId);
  }).catch(()=>{});
}

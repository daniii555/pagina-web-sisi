'use strict';

const PLACE_GROUPS=[{heading:'FACULTADES Y CARRERAS',places:[
{id:'medicina',title:'Medicina',desc:'Bloque de aulas · sector identificable',icon:'✚'},
{id:'empresariales',title:'Facultad de Ciencias Empresariales',desc:'Edificio identificado en el mapa',icon:'▣'},
{id:'sociales',title:'Facultad de Ciencias Sociales',desc:'Edificio identificado en el mapa',icon:'▣'},
{id:'civil',title:'Facultad de Ingeniería Civil',desc:'Edificio identificado en el mapa',icon:'▤'}]},
{heading:'LABORATORIOS Y ESPACIOS',places:[{id:'laboratorio',title:'Laboratorio 1 · Empresariales',desc:'Laboratorio identificado en el mapa',icon:'◈'},{id:'plaza',title:'Plazoleta central',desc:'Referencia central aproximada',icon:'◎'}]}];
PLACE_GROUPS.flatMap(g=>g.places).forEach(p=>{p.pin=CAMPUS_GPS.nodes[p.id];p.route=CAMPUS_GPS.route('entrada',p.id);});
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
 const [x,y]=place.pin;const g=createSVG('g',{class:'spot',role:'button',tabindex:'0','aria-label':'Ver '+place.title,'data-place':place.id});
 g.append(createSVG('title',{},place.title));g.append(createSVG('circle',{cx:x,cy:y,r:11,class:'spot-pin'}));g.append(createSVG('circle',{cx:x,cy:y,r:4,class:'spot-center'}));
 g.addEventListener('click',()=>selectPlace(place.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPlace(place.id);}});facMarkers.append(g);
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
  document.getElementById('resultMeta').textContent=originName()+' → '+p.title;document.getElementById('routeStart').textContent=originName();document.getElementById('routeStartDetail').textContent=originMode==='gps'?'GPS aproximado; camino cercano':'Punto de referencia aproximado';
  const path=originMode==='gps'&&!gpsPoint?null:CAMPUS_GPS.route(originMode==='gps'?gpsPoint:originMode,id);const found=!!path;
  document.getElementById('resultStatus').textContent=found?(originMode==='gps'?'GPS aproximado':'Ruta ilustrativa'):'Origen no disponible';
  document.getElementById('foundResult').hidden=!found;
  document.getElementById('pendingResult').hidden=found;if(!found){document.querySelector('#pendingResult h4').textContent='Selecciona un origen válido';document.querySelector('#pendingResult p').textContent='No se puede trazar un recorrido desde esta posición. Usa el selector de origen o vuelve a activar el GPS.';}
  clearMap();
  if(found){
    p.route=path;const points=path.map(pt=>pt.join(',')).join(' ');if(path.length===1)routeHalo.setAttribute('points','');
    routeHalo.setAttribute('points',points);
    routeLine.setAttribute('points',points);
    routeHalo.style.display='block';routeLine.style.display='block';
    destPulse.setAttribute('transform',`translate(${p.pin[0]} ${p.pin[1]})`);
    destPulse.style.display='block';
    const el=document.querySelector(`.spot[data-place="${CSS.escape(id)}"]`);if(el)el.classList.add('active');
    document.getElementById('routeEnd').textContent=p.title;
    document.getElementById('routeSteps').textContent=path.length===1?'El origen y el destino coinciden.':'Sigue los caminos señalados de forma referencial.';
    renderQR(id);
  }
  document.dispatchEvent(new CustomEvent(opts.refreshOnly?'orienta:route-update':'orienta:select',{detail:{id,found,route:path,origin:originName(),gps:originMode==='gps'}}));
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
const originSelect=document.getElementById('originSelect'),gpsToggle=document.getElementById('gpsToggle'),gpsStatus=document.getElementById('gpsStatus'),gpsMarker=document.getElementById('gpsMarker'),originMarker=document.getElementById('originMarker');
let originMode='entrada',gpsPoint=null,watchId=null,gpsGeneration=0;
for(const p of Object.values(places)){const o=document.createElement('option');o.value=p.id;o.textContent=p.title;originSelect.append(o);}
function originName(){return originMode==='gps'?'Mi ubicación aproximada':places[originMode]?.title||'Entrada principal (aprox.)';}
function updateOrigin(){const pt=originMode==='gps'?(gpsPoint&&CAMPUS_GPS.nearest(gpsPoint)?.point):CAMPUS_GPS.nodes[originMode];originMarker.style.display=pt?'':'none';if(pt){originMarker.setAttribute('transform',`translate(${pt[0]} ${pt[1]})`);originMarker.querySelector('rect').style.display=originMode==='entrada'?'':'none';originMarker.querySelector('text').style.display=originMode==='entrada'?'':'none';originMarker.querySelector('path').style.display=originMode==='entrada'?'':'none';}if(activeId)selectPlace(activeId,{skipHistory:true,refreshOnly:true});}
function stopGps(){gpsGeneration++;if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;gpsPoint=null;gpsMarker.setAttribute('visibility','hidden');gpsToggle.textContent='⌖ Usar mi ubicación';gpsToggle.setAttribute('aria-pressed','false');}
function manual(message){stopGps();originMode=originSelect.value;gpsStatus.textContent=message||'Origen manual. Elige el lugar donde te encuentras.';updateOrigin();}
originSelect.addEventListener('change',()=>manual());
gpsToggle.addEventListener('click',()=>{if(watchId!==null){manual('Ubicación desactivada.');return;}if(!window.isSecureContext||!navigator.geolocation){gpsStatus.textContent='El GPS requiere HTTPS o localhost y un navegador compatible. Elige tu origen manualmente.';return;}originMode='gps';gpsPoint=null;const generation=++gpsGeneration;gpsToggle.textContent='Detener ubicación';gpsToggle.setAttribute('aria-pressed','true');gpsStatus.textContent='Solicitando permiso de ubicación…';updateOrigin();watchId=navigator.geolocation.watchPosition(pos=>{if(generation!==gpsGeneration)return;const c=pos.coords,p=CAMPUS_GPS.project(c.latitude,c.longitude),snap=CAMPUS_GPS.nearest(p);const inMap=p[0]>=0&&p[0]<=698&&p[1]>=0&&p[1]<=500;const good=inMap&&c.accuracy<=40&&snap&&snap.distance<=45;gpsMarker.setAttribute('visibility',inMap?'visible':'hidden');if(inMap){gpsMarker.setAttribute('transform',`translate(${p[0]} ${p[1]})`);document.getElementById('gpsAccuracy').setAttribute('r',Math.min(250,Math.max(8,(c.accuracy+25)*CAMPUS_GPS.pixelsPerMeter)));}const next=good?p:null;const changed=(!gpsPoint!==!next)||(gpsPoint&&next&&CAMPUS_GPS.distance(gpsPoint,next)>5);if(changed)gpsPoint=next;gpsStatus.textContent=good?`GPS activo · precisión del dispositivo ±${Math.round(c.accuracy)} m; calibración del mapa aproximada.`:!inMap?'Tu ubicación estimada está fuera de esta captura. Elige un origen manual.':'GPS poco preciso o lejos del camino dibujado. Elige un origen manual.';if(changed)updateOrigin();},err=>{if(generation!==gpsGeneration)return;manual(err.code===1?'Permiso de ubicación denegado. Elige tu origen manualmente.':'No se pudo obtener la ubicación. Elige un origen manual o vuelve a intentar.');},{enableHighAccuracy:true,maximumAge:3000,timeout:12000});});
window.addEventListener('pagehide',()=>stopGps());
renderList();
const initial=new URLSearchParams(location.search).get('dest');
if(initial&&places[initial]){
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

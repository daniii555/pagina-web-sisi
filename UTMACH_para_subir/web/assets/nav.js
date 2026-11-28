'use strict';
// Guía paso a paso estilo Google Maps. Los giros se calculan de la geometría de la ruta ya dibujada.
// No se muestran metros porque el mapa no tiene escala real verificada.
(function(){
  const CFG = window.ORIENTA_CONFIG || {};
  const svgNS = 'http://www.w3.org/2000/svg';
  const mapSvg = document.getElementById('mapSvg');
  const routeLine = document.getElementById('routeLine');
  const grid = document.getElementById('foundResult');
  let steps = [], legStart = [], total = 0, raf = null, mover = null, place = null, autoplay = null;

  const banner = document.createElement('div');
  banner.id = 'navBanner'; banner.className = 'nav-banner'; banner.hidden = true;
  banner.innerHTML = '<div class="nav-icon" id="navIcon">⬆</div><div class="nav-copy"><strong id="navText"></strong><small id="navSub"></small></div>' +
    '<div class="nav-actions"><button type="button" id="navPlay">▶ Iniciar recorrido</button></div>';
  grid.parentNode.insertBefore(banner, grid);
  const $ = id => banner.querySelector('#' + id);

  const viewport = document.getElementById('mapViewport'), stage = document.getElementById('mapStage');
  // En el celular: ajusta el mapa para que se vea TODA la ruta (entrada principal -> destino), sin desplazarse.
  function fit(p){ /* Encuadre fijo: no modificar escala ni posición. */ }
  function heading(a, b){ return Math.atan2(b[1]-a[1], b[0]-a[0]) * 180 / Math.PI; }
  function delta(a, b){ let d = b - a; while(d > 180) d -= 360; while(d < -180) d += 360; return d; }
  function turnOf(d){
    if(Math.abs(d) < 35) return {icon:'⬆', text:'Sigue recto'};
    if(d >= 35 && d < 140) return {icon:'↱', text:'Gira a la derecha'};
    if(d <= -35 && d > -140) return {icon:'↰', text:'Gira a la izquierda'};
    return {icon:'↩', text:'Da la vuelta'};
  }
  function buildSteps(p){
    const pts = p.route, out = [{icon:'⬆', text:'Parte desde el origen seleccionado', at:0}];
    let ref = pts.length>1?heading(pts[0], pts[1]):0, len = 0;
    for(let i = 1; i < pts.length; i++){
      const seg = Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
      if(i < pts.length - 1){
        const h = heading(pts[i], pts[i+1]);
        if(Math.abs(delta(ref, h)) >= 35){ const t = turnOf(delta(ref, h)); out.push({icon:t.icon, text:t.text, at:len + seg}); ref = h; }
      }
      len += seg;
    }
    out.push({icon:'🎯', text:'Fin del recorrido ilustrativo: ' + p.title, at:len});
    total = len; return out;
  }
  function renderList(active){
    document.getElementById('routeSteps').innerHTML = steps.map((s, i) =>
      '<li class="' + (i === active ? 'nav-current' : '') + '"><span class="nav-li-icon">' + s.icon + '</span> ' + s.text + '</li>').join('');
  }
  function show(i, sub){
    const s = steps[i]; $('navIcon').textContent = s.icon; $('navText').textContent = s.text;
    $('navSub').textContent = sub || (i < steps.length - 1 ? 'Siguiente: ' + steps[i+1].text.toLowerCase() : 'Fin del recorrido');
    banner.classList.toggle('arrived', i === steps.length - 1); renderList(i);
  }
  function stop(){ clearTimeout(autoplay); autoplay=null; if(raf) cancelAnimationFrame(raf); raf = null; if(mover){ mover.remove(); mover = null; } $('navPlay').textContent = '▶ Iniciar recorrido'; }
  function chime(){
    try{ const c = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 1100].forEach((f, k) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.connect(g); g.connect(c.destination);
        const t = c.currentTime + k * .15; g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.start(t); o.stop(t + .26); });
    }catch(e){}
  }
  function play(){
    if(!place)return;stop();document.dispatchEvent(new CustomEvent('orienta:play',{detail:{id:place.id}})); const L = routeLine.getTotalLength(), speed = 85; let t0 = null, cur = -1;
    mover = document.createElementNS(svgNS, 'g'); mover.setAttribute('class', 'nav-mover');
    mover.innerHTML = '<circle r="30" fill="#2979ff" opacity=".25"><animate attributeName="r" values="22;34;22" dur="1.6s" repeatCount="indefinite"/></circle><g class="paki-bob"><clipPath id="pakiClip"><circle r="24"/></clipPath><circle r="26" fill="#fff"/><image href="./assets/paki.png" x="-48" y="-26" width="100" height="106" clip-path="url(#pakiClip)"/></g>';
    mapSvg.appendChild(mover); $('navPlay').textContent = '■ Detener';
    const tick = ts => {
      if(t0 === null) t0 = ts; const d = Math.min(L, (ts - t0) / 1000 * speed), pt = routeLine.getPointAtLength(d);
      mover.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
      let k = 0; for(let i = 0; i < steps.length - 1; i++) if((L?d / L * total:0) >= steps[i].at - .5) k = i;
      if(d >= L) k = steps.length - 1;
      if(k !== cur){ cur = k; show(k); }
      if(d < L) raf = requestAnimationFrame(tick); else { raf = null; chime(); document.dispatchEvent(new CustomEvent('orienta:arrive',{detail:{id:place.id}})); $('navPlay').textContent = '↻ Repetir recorrido'; }
    };
    raf = requestAnimationFrame(tick);
  }
  function gmapsUrl(p){
    const c = CFG.coords && CFG.coords[p.id], o = CFG.origin;
    const dest = c ? c.lat + ',' + c.lng : encodeURIComponent(p.title + ', Universidad Técnica de Machala, Ecuador');
    return 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + dest + (o ? '&origin=' + o.lat + ',' + o.lng : '');
  }
  $('navPlay').addEventListener('click', () => raf || (mover && $('navPlay').textContent.startsWith('■')) ? (stop(),document.dispatchEvent(new CustomEvent('orienta:stop'))) : play());
  function onSelect(e) {
    stop(); place = window.ORIENTA_PLACES && window.ORIENTA_PLACES[e.detail.id];
    if(!e.detail.found || !place){ banner.hidden = true; return; }
    steps = buildSteps(place); fit(place); banner.hidden = false;  show(0, 'Pulsa «Iniciar recorrido» para ver el camino');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches) {const id=place.id;autoplay=setTimeout(()=>{if(place?.id===id&&!banner.hidden&&!raf)play();},700);}
  }
  document.addEventListener('orienta:select',onSelect);
  const initial=new URLSearchParams(location.search).get('dest');if(initial&&window.ORIENTA_PLACES?.[initial])onSelect({detail:{id:initial,found:!!window.ORIENTA_PLACES[initial].pin}});
  document.addEventListener('orienta:reset', () => { stop(); place=null; banner.hidden = true; });
})();


/* Mapa fijo: la captura y las rutas comparten el encuadre 698 × 500. */
(()=>{
 const v=document.getElementById('mapViewport'),s=document.getElementById('mapStage');if(!v||!s)return;
 const css=document.createElement('style');css.textContent=`
 #mapViewport{position:relative;overflow:hidden!important;height:auto!important;touch-action:pan-y;cursor:default}
 #mapStage{position:relative!important;width:100%!important;height:auto!important;min-width:0!important;aspect-ratio:698/500;transform:none!important;user-select:none}
 #mapStage .satellite{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none}
 #mapSvg{position:absolute;inset:0;width:100%;height:100%}
 .scroll-hint,.map-controls,.map-crosshair{display:none!important}
 .map-admin-mode{min-height:44px;padding:8px 12px;border:1px solid #c5d8f3;border-radius:10px;background:white;color:#2156b0;font-weight:700;cursor:pointer}
 .map-joy-focus{outline:3px solid #2156b0!important;outline-offset:-3px;background:#e9f1ff!important}
 .code-evidence{margin:12px 0 0;display:grid;gap:8px}.code-evidence button{display:block;width:100%;background:#fff;border:1px solid #dce6f4;border-radius:10px;overflow:hidden;padding:5px;cursor:zoom-in}.code-evidence img{display:block;width:100%;height:auto;object-fit:contain}.code-evidence figcaption{color:#526781;font-size:12px}
 `;document.head.append(css);
 v.setAttribute('aria-label','Mapa fijo del campus. Selecciona un destino para ver su recorrido.');
 // Permite volver a la lista en la vista móvil, sin controles de cámara.
 const change=document.createElement('button');change.type='button';change.className='ghost-button';change.textContent='Cambiar destino';change.hidden=true;v.before(change);
 const sync=()=>{change.hidden=!document.body.classList.contains('mobile-route');};new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});sync();
 change.onclick=()=>{document.body.classList.remove('mobile-route');document.getElementById('buscar')?.focus();document.querySelector('.sidebar')?.scrollIntoView({block:'start',behavior:'smooth'});};
 // Evidencias reales del código proporcionadas por el equipo; no se modifican las fotos del montaje.
 const cards=document.querySelectorAll('#desarrollo>.grid>article'),gallery=document.getElementById('gallery-dialog');
 function evidence(card,file,label){if(!card)return;const f=document.createElement('figure');f.className='code-evidence';const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Ampliar '+label);const img=document.createElement('img');img.src='assets/evidencias/'+file;img.alt=label;img.loading='lazy';b.append(img);const cap=document.createElement('figcaption');cap.textContent=label;f.append(b,cap);card.append(f);b.addEventListener('click',()=>{if(!gallery)return;gallery.querySelector('img').src=img.src;gallery.querySelector('img').alt=label;gallery.querySelector('p').textContent=label;gallery.showModal();});}
 evidence(cards[0],'codigo-pseint.png','PSeInt · funciones y búsqueda de ubicaciones');evidence(cards[1],'codigo-java-algoritmo.png','Java · algoritmo del mapa interactivo');evidence(cards[1],'codigo-java-servidor.png','Java · servidor web Main.java');
})();

/* Joystick: desplazamiento de la página o selección de destinos. Sin cámara móvil. */
(()=>{
 const panel=document.getElementById('adminPanel');if(!panel)return;
 const dock=document.createElement('button');dock.type='button';dock.id='joy-global-mode';dock.className='map-admin-mode';dock.hidden=true;dock.style.cssText='position:fixed;bottom:16px;left:16px;z-index:45;background:#2156b0;color:white;box-shadow:0 5px 18px #14294b33;max-width:calc(100vw - 32px)';document.body.append(dock);
 let mode=0,pending=0,marked=null,listIndex=-1;
 function clear(){if(marked){marked.style.outline='';marked.style.outlineOffset='';marked=null;}document.querySelectorAll('.map-joy-focus').forEach(x=>x.classList.remove('map-joy-focus'));listIndex=-1;}
 function setMode(n){mode=n;clear();dock.textContent='Joystick: '+(mode?'Elegir destino':'Página completa')+' · doble OK cambia modo';if(mode){document.body.classList.remove('mobile-route');document.getElementById('mapa')?.scrollIntoView({block:'start',behavior:'smooth'});}}
 function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.closest('[hidden]')&&!el.disabled&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
 function page(dir){if(dir==='UP'||dir==='DOWN'){clear();window.scrollBy({top:(dir==='UP'?-1:1)*Math.max(140,Math.round(innerHeight*.37)),behavior:'smooth'});return;}const a=[...(document.querySelector('dialog[open]')||document).querySelectorAll('button,a[href],summary,select,[role="button"]')].filter(visible);if(dir==='OK'){if(marked&&visible(marked)){if(marked.tagName==='SELECT'){marked.focus();try{marked.showPicker?.();}catch(e){}}else marked.click();}return;}if(!a.length)return;let i=a.indexOf(marked);i=i<0?(dir==='LEFT'?a.length-1:0):(i+(dir==='LEFT'?-1:1)+a.length)%a.length;clear();marked=a[i];marked.style.outline='3px solid #2156b0';marked.style.outlineOffset='4px';marked.focus({preventScroll:true});}
 function choose(dir){const a=[...document.querySelectorAll('.place-button')];if(!a.length)return;if(dir==='OK'){a[Math.max(0,listIndex)%a.length].click();clear();return;}listIndex=listIndex<0?0:(listIndex+(dir==='UP'||dir==='LEFT'?-1:1)+a.length)%a.length;a.forEach((x,i)=>x.classList.toggle('map-joy-focus',i===listIndex));a[listIndex].scrollIntoView({block:'nearest'});}
 function execute(dir){if(!window.orientaAdmin)return;mode?choose(dir):page(dir);}
 window.orientaJoystick=dir=>{if(!window.orientaAdmin)return;if(dir==='OK'){if(pending){clearTimeout(pending);pending=0;setMode(1-mode);}else pending=setTimeout(()=>{pending=0;execute('OK');},420);return;}if(pending){clearTimeout(pending);pending=0;}execute(dir);};
 dock.onclick=()=>setMode(1-mode);function sync(){dock.hidden=!window.orientaAdmin;if(dock.hidden){if(pending){clearTimeout(pending);pending=0;}setMode(0);}}new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden']});setMode(0);sync();
})();

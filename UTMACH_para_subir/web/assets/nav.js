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
  function fit(p){ /* La cámara interactiva ajusta la ruta. */ }
  function heading(a, b){ return Math.atan2(b[1]-a[1], b[0]-a[0]) * 180 / Math.PI; }
  function delta(a, b){ let d = b - a; while(d > 180) d -= 360; while(d < -180) d += 360; return d; }
  function turnOf(d){
    if(Math.abs(d) < 35) return {icon:'⬆', text:'Sigue recto'};
    if(d >= 35 && d < 140) return {icon:'↱', text:'Gira a la derecha'};
    if(d <= -35 && d > -140) return {icon:'↰', text:'Gira a la izquierda'};
    return {icon:'↩', text:'Da la vuelta'};
  }
  function buildSteps(p){
    const pts = p.route, out = [{icon:'⬆', text:'Parte desde la entrada principal', at:0}];
    let ref = heading(pts[0], pts[1]), len = 0;
    for(let i = 1; i < pts.length; i++){
      const seg = Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
      if(i < pts.length - 1){
        const h = heading(pts[i], pts[i+1]);
        if(Math.abs(delta(ref, h)) >= 35){ const t = turnOf(delta(ref, h)); out.push({icon:t.icon, text:t.text, at:len + seg}); ref = h; }
      }
      len += seg;
    }
    out.push({icon:'🎯', text:'¡Llegaste a ' + p.title + '!', at:len});
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
      let k = 0; for(let i = 0; i < steps.length - 1; i++) if(d / L * total >= steps[i].at - .5) k = i;
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

// Cámara del mapa y controles de exploración. Mantiene coordenadas de las rutas SVG.
(()=>{
 const v=document.getElementById('mapViewport'),s=document.getElementById('mapStage');if(!v||!s)return;
 const css=document.createElement('style');css.textContent=`
 #mapViewport.interactive-map{position:relative;overflow:hidden!important;height:clamp(280px,35vw,560px)!important;touch-action:none;background:#e4ecf8;cursor:grab;isolation:isolate}
 #mapViewport.interactive-map:active{cursor:grabbing}
 #mapViewport.interactive-map #mapStage{position:absolute!important;left:0;top:0;width:1009px!important;height:440px!important;min-width:0!important;margin:0!important;transform-origin:0 0;user-select:none}
 .map-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px;background:#f6f9ff;border-bottom:1px solid #dce6f4}
 .map-controls button,.map-admin-mode{min-height:44px;min-width:44px;padding:8px 12px;border:1px solid #c5d8f3;border-radius:10px;background:white;color:#2156b0;font-weight:700;cursor:pointer}
 .map-controls button:hover,.map-admin-mode:hover{background:#e9f1ff}.map-controls button:focus-visible{outline:3px solid #759cde;outline-offset:2px}
 .map-controls .map-hint{flex:1 1 180px;font-size:12px;color:#526781;line-height:1.5}
 .map-crosshair{position:absolute;pointer-events:none;left:50%;top:50%;width:24px;height:24px;transform:translate(-50%,-50%);border:2px solid white;border-radius:50%;box-shadow:0 0 0 2px #2156b0;z-index:4}
 .map-crosshair:after,.map-crosshair:before{content:'';position:absolute;background:#2156b0;left:50%;top:50%;transform:translate(-50%,-50%)}.map-crosshair:before{width:12px;height:2px}.map-crosshair:after{height:12px;width:2px}
 .map-joy-focus{outline:3px solid #2156b0!important;outline-offset:-3px;background:#e9f1ff!important}
 .code-evidence{margin:12px 0 0;display:grid;gap:8px}.code-evidence button{display:block;width:100%;background:#fff;border:1px solid #dce6f4;border-radius:10px;overflow:hidden;padding:5px;cursor:zoom-in}.code-evidence img{display:block;width:100%;height:auto;object-fit:contain}.code-evidence figcaption{color:#526781;font-size:12px}
 @media(max-width:980px){#mapViewport.interactive-map{height:clamp(280px,65vw,440px)!important}.map-controls{padding:9px;gap:6px}.map-controls button{padding:7px 10px}.location-list{max-height:320px!important}.workspace{min-width:0}.map-controls .map-hint{flex-basis:100%}}
 @media(max-width:480px){.map-controls button{min-width:44px}.map-foot{flex-wrap:wrap}.map-legend{font-size:10px}.map-controls .map-hint{font-size:11px}}
 `;document.head.append(css);
 v.classList.add('interactive-map');v.tabIndex=0;v.setAttribute('aria-label','Mapa explorable. Usa las flechas, arrastra o amplía.');
 const toolbar=document.createElement('div');toolbar.className='map-controls';toolbar.innerHTML='<button type="button" data-map="minus" aria-label="Reducir mapa">−</button><button type="button" data-map="plus" aria-label="Ampliar mapa">+</button><button type="button" data-map="fit">Vista completa</button><button type="button" data-map="route">Ver ruta</button><button type="button" data-map="dest" hidden>Cambiar destino</button><span class="map-hint" aria-live="polite">Arrastra para explorar · pellizca para ampliar</span>';v.before(toolbar);
 const hint=toolbar.querySelector('.map-hint'),cross=document.createElement('span');cross.className='map-crosshair';cross.hidden=true;cross.setAttribute('aria-hidden','true');v.append(cross);
 const W=1009,H=440;let z=1,x=0,y=0,base=1,ready=false,route=null,joyMode='map',listIndex=-1,lastW=0,lastH=0;
 const clamp=(a,b,c)=>Math.min(c,Math.max(b,a));
 const dims=()=>({w:v.clientWidth,h:v.clientHeight});
 function bounds(){const {w,h}=dims(),k=base*z; x=W*k<=w?(w-W*k)/2:clamp(x,w-W*k,0);y=H*k<=h?(h-H*k)/2:clamp(y,h-H*k,0);}
 function draw(){bounds();s.style.transform=`translate(${x}px,${y}px) scale(${base*z})`;v.dataset.zoom=z.toFixed(2);}
 function center(cx,cy,zoom){const {w,h}=dims();z=clamp(zoom,1,5);x=w/2-cx*base*z;y=h/2-cy*base*z;draw();}
 function full(){center(W/2,H/2,1);}
 function fitRoute(){if(!route?.route?.length){full();return;}const {w,h}=dims(),xs=route.route.map(p=>p[0]),ys=route.route.map(p=>p[1]);const a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...ys),d=Math.max(...ys);center((a+b)/2,(c+d)/2,Math.min(w/(b-a+180),h/(d-c+150))/base);}
 function resize(){const {w,h}=dims();if(!w||!h)return;const old=base*z,cx=ready?(lastW/2-x)/old:W/2,cy=ready?(lastH/2-y)/old:H/2;base=Math.min(w/W,h/H);lastW=w;lastH=h;if(!ready){ready=true;full();}else center(cx,cy,z);}
 function zoom(f,px=v.clientWidth/2,py=v.clientHeight/2){const old=base*z;const cx=(px-x)/old,cy=(py-y)/old;z=clamp(z*f,1,5);x=px-cx*base*z;y=py-cy*base*z;draw();}
 function pan(dx,dy){x+=dx;y+=dy;draw();}
 resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(v);else addEventListener('resize',resize);
 toolbar.addEventListener('click',e=>{const b=e.target.closest('[data-map]');if(!b)return;switch(b.dataset.map){case 'minus':zoom(1/1.3);break;case 'plus':zoom(1.3);break;case 'fit':full();break;case 'route':fitRoute();break;case 'dest':document.body.classList.remove('mobile-route');b.hidden=true;document.getElementById('buscar')?.focus();break;}});
 const points=new Map();let dragged=false,ignoreClick=0;
 const pos=e=>({x:e.clientX-v.getBoundingClientRect().left,y:e.clientY-v.getBoundingClientRect().top});
 v.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!points.size)dragged=false;const p=pos(e);points.set(e.pointerId,{...p,startX:p.x,startY:p.y});if(points.size>1){dragged=true;for(const id of points.keys())try{v.setPointerCapture(id);}catch(_){}}});
 v.addEventListener('pointermove',e=>{const old=points.get(e.pointerId);if(!old)return;const p=pos(e),other=[...points.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const d1=Math.hypot(old.x-other.x,old.y-other.y),d2=Math.hypot(p.x-other.x,p.y-other.y);if(d1>8)zoom(d2/d1,(old.x+other.x)/2,(old.y+other.y)/2);pan((p.x-old.x)/2,(p.y-old.y)/2);dragged=true;}else if(dragged||Math.hypot(p.x-old.startX,p.y-old.startY)>5){if(!dragged)try{v.setPointerCapture(e.pointerId);}catch(_){}dragged=true;pan(p.x-old.x,p.y-old.y);}points.set(e.pointerId,{...old,...p});});
 const end=e=>{if(!points.has(e.pointerId))return;points.delete(e.pointerId);if(dragged)ignoreClick=performance.now()+450;};v.addEventListener('pointerup',end);v.addEventListener('pointercancel',end);v.addEventListener('lostpointercapture',end);v.addEventListener('pointerleave',e=>{if(!v.hasPointerCapture(e.pointerId))end(e);});v.addEventListener('click',e=>{if(performance.now()<ignoreClick){e.preventDefault();e.stopImmediatePropagation();}},true);
 v.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const p=pos(e);zoom(e.deltaY<0?1.15:1/1.15,p.x,p.y);},{passive:false});
 function selectCenter(){const {w,h}=dims(),k=base*z,cx=(w/2-x)/k,cy=(h/2-y)/k;const near=Object.values(window.ORIENTA_PLACES||{}).filter(p=>p.pin).map(p=>({p,d:Math.hypot(cx-p.pin[0],cy-p.pin[1])})).sort((a,b)=>a.d-b.d)[0];if(!near||near.d>125){hint.textContent='Acerca la mira a un destino y presiona OK.';return;}const spot=document.querySelector('.spot[data-place="'+near.p.id+'"]');spot?.dispatchEvent(new MouseEvent('click',{bubbles:true}));hint.textContent='Destino: '+near.p.title;}
 function step(dir){const delta={UP:[0,44],DOWN:[0,-44],LEFT:[44,0],RIGHT:[-44,0]}[dir];if(dir==='OK'){selectCenter();return;}if(!delta)return;const {w,h}=dims();const min=Math.max(1.8,(w+100)/(base*W),(h+100)/(base*H));if(z<min)zoom(min/z);pan(...delta);}
 v.addEventListener('keydown',e=>{if(e.target!==v)return;const key={ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',Enter:'OK'}[e.key];if(key){e.preventDefault();cross.hidden=false;step(key);}else if(e.key==='+'||e.key==='-'){e.preventDefault();zoom(e.key==='+'?1.25:.8);}});
 function clearList(){document.querySelectorAll('.map-joy-focus').forEach(b=>b.classList.remove('map-joy-focus'));listIndex=-1;}
 const mode=document.createElement('button');mode.type='button';mode.className='map-admin-mode';mode.textContent='Joystick: explorar mapa';document.getElementById('adminPanel')?.append(mode);
 mode.addEventListener('click',()=>{joyMode=joyMode==='map'?'list':'map';mode.textContent=joyMode==='map'?'Joystick: explorar mapa':'Joystick: elegir destino';cross.hidden=joyMode!=='map';clearList();hint.textContent=joyMode==='map'?'Joystick: mueve la mira y presiona OK.':'Joystick: elige un destino de la lista y presiona OK.';});
 window.orientaJoystick=dir=>{if(!window.orientaAdmin)return;if(joyMode==='map'){cross.hidden=false;step(dir);}else{const items=[...document.querySelectorAll('.place-button')];if(!items.length)return;if(dir==='OK'){if(listIndex<0)listIndex=0;items[listIndex%items.length]?.click();clearList();return;}const d=dir==='UP'||dir==='LEFT'?-1:1;listIndex=listIndex<0?0:(listIndex+d+items.length)%items.length;items.forEach((b,i)=>b.classList.toggle('map-joy-focus',i===listIndex));items[listIndex].scrollIntoView({block:'nearest'});}};
 document.addEventListener('orienta:select',e=>{route=e.detail.found?window.ORIENTA_PLACES[e.detail.id]:null;if(route)fitRoute();});
 document.addEventListener('orienta:reset',()=>{route=null;full();clearList();cross.hidden=true;});
 const initial=new URLSearchParams(location.search).get('dest');if(initial&&window.ORIENTA_PLACES?.[initial]?.pin){route=window.ORIENTA_PLACES[initial];fitRoute();}
 toolbar.querySelector('[data-map=dest]').hidden=!document.body.classList.contains('mobile-route');
 // Evidencias reales del código proporcionadas por el equipo; no se modifican las fotos del montaje.
 const cards=document.querySelectorAll('#desarrollo>.grid>article'),gallery=document.getElementById('gallery-dialog');
 function evidence(card,file,label){if(!card)return;const f=document.createElement('figure');f.className='code-evidence';const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Ampliar '+label);const img=document.createElement('img');img.src='assets/evidencias/'+file;img.alt=label;img.loading='lazy';b.append(img);const cap=document.createElement('figcaption');cap.textContent=label;f.append(b,cap);card.append(f);b.addEventListener('click',()=>{if(!gallery)return;gallery.querySelector('img').src=img.src;gallery.querySelector('img').alt=label;gallery.querySelector('p').textContent=label;gallery.showModal();});}
 evidence(cards[0],'codigo-pseint.png','PSeInt · funciones y búsqueda de ubicaciones');evidence(cards[1],'codigo-java-algoritmo.png','Java · algoritmo del mapa interactivo');evidence(cards[1],'codigo-java-servidor.png','Java · servidor web Main.java');
})();

// Video de demostración del equipo (archivo real, no reproducción simulada).
(()=>{
 const section=document.getElementById('desarrollo');if(!section||document.getElementById('video-demostracion'))return;
 const block=document.createElement('div');block.id='video-demostracion';block.style.cssText='margin-top:24px;padding:clamp(14px,3vw,26px);border:1px solid #dce6f4;border-radius:16px;background:#f6f9ff;color:#23364f';
 const title=document.createElement('h3');title.textContent='Video demostrativo del proyecto';title.style.color='#14294b';
 const status=document.createElement('p');status.textContent='Comprobando disponibilidad del video…';status.style.color='#526781';status.setAttribute('role','status');
 const player=document.createElement('video');player.controls=true;player.playsInline=true;player.preload='metadata';player.hidden=true;player.style.cssText='width:100%;max-width:960px;aspect-ratio:16/9;display:block;margin:12px auto 0;background:#14294b;border-radius:12px;object-fit:contain';
 player.style.display='none';block.append(title,status,player);section.append(block);
 const url='assets/videos/demostracion.mp4';
 fetch(url,{method:'HEAD',cache:'no-store'}).then(r=>{if(!r.ok||!r.headers.get('Content-Type')?.startsWith('video/'))throw Error('Video pendiente');player.src=url;player.hidden=false;player.style.display='block';status.textContent='Reproduce la demostración de UTMACH Orienta.';}).catch(()=>{status.textContent='Video demostrativo pendiente de incorporar.';});
 player.addEventListener('error',()=>{player.hidden=true;player.style.display='none';status.textContent='No se pudo reproducir el video. Comprueba el archivo MP4.';});
})();

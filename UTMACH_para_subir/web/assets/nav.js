'use strict';
// Guía paso a paso estilo Google Maps. Los giros se calculan de la geometría de la ruta ya dibujada.
// No se muestran metros porque el mapa no tiene escala real verificada.
(function(){
  const CFG = window.ORIENTA_CONFIG || {};
  const svgNS = 'http://www.w3.org/2000/svg';
  const mapSvg = document.getElementById('mapSvg');
  const routeLine = document.getElementById('routeLine');
  const grid = document.getElementById('foundResult');
  let steps = [], legStart = [], total = 0, raf = null, mover = null, place = null, autoTimer = null;

  const banner = document.createElement('div');
  banner.id = 'navBanner'; banner.className = 'nav-banner'; banner.hidden = true;
  banner.innerHTML = '<div class="nav-icon" id="navIcon">⬆</div><div class="nav-copy"><strong id="navText"></strong><small id="navSub"></small></div>' +
    '<div class="nav-actions"><button type="button" id="navPlay">▶ Iniciar recorrido</button></div>';
  grid.parentNode.insertBefore(banner, grid);
  const $ = id => banner.querySelector('#' + id);

  const viewport = document.getElementById('mapViewport'), stage = document.getElementById('mapStage');
  // En el celular: ajusta el mapa para que se vea TODA la ruta (entrada principal -> destino), sin desplazarse.
  function fit(p){
    if(!document.body.classList.contains('mobile-route')) return;
    const xs = p.route.map(q => q[0]), ys = p.route.map(q => q[1]), pad = 60;
    const bx = Math.max(0, Math.min(...xs) - pad), by = Math.max(0, Math.min(...ys) - pad);
    const bw = Math.min(698, Math.max(...xs) + pad) - bx, bh = Math.min(500, Math.max(...ys) + pad) - by;
    const W = viewport.clientWidth || innerWidth, k = Math.min(W / bw, innerHeight * .5 / bh);
    Object.assign(viewport.style, {overflow:'hidden', height: bh * k + 'px'});
    Object.assign(stage.style, {width: 698 * k + 'px', minWidth:'0', height: 500 * k + 'px',
      margin: (-by * k) + 'px 0 0 ' + (-bx * k + (W - bw * k) / 2) + 'px'});
  }
  function heading(a, b){ return Math.atan2(b[1]-a[1], b[0]-a[0]) * 180 / Math.PI; }
  function delta(a, b){ let d = b - a; while(d > 180) d -= 360; while(d < -180) d += 360; return d; }
  function turnOf(d){
    if(Math.abs(d) < 35) return {icon:'⬆', text:'Sigue recto'};
    if(d >= 35 && d < 140) return {icon:'↱', text:'Gira a la derecha'};
    if(d <= -35 && d > -140) return {icon:'↰', text:'Gira a la izquierda'};
    return {icon:'↩', text:'Da la vuelta'};
  }
  function buildSteps(p){
    const pts = p.route, out = [{icon:'⬆', text:'Parte desde '+(p.origin||'el punto seleccionado'), at:0}];
    let ref = pts.length>1?heading(pts[0], pts[1]):0, len = 0;
    for(let i = 1; i < pts.length; i++){
      const seg = Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
      if(i < pts.length - 1){
        const h = heading(pts[i], pts[i+1]);
        if(Math.abs(delta(ref, h)) >= 35){ const t = turnOf(delta(ref, h)); out.push({icon:t.icon, text:t.text, at:len + seg}); ref = h; }
      }
      len += seg;
    }
    out.push({icon:'🎯', text:'Fin de la demostración: ' + p.title, at:len});
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
  function stop(){ if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;} if(raf) cancelAnimationFrame(raf); raf = null; if(mover){ mover.remove(); mover = null; } $('navPlay').textContent = '▶ Iniciar recorrido'; }
  function chime(){
    try{ const c = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 1100].forEach((f, k) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.connect(g); g.connect(c.destination);
        const t = c.currentTime + k * .15; g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.start(t); o.stop(t + .26); });
    }catch(e){}
  }
  function play(){
    if(!place||place.route.length<2||place.gps)return;stop();document.dispatchEvent(new CustomEvent('orienta:play',{detail:{id:place.id}})); const L = routeLine.getTotalLength(), speed = 85; let t0 = null, cur = -1;
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
  function showRoute(e,auto){
    stop(); const p=window.ORIENTA_PLACES&&window.ORIENTA_PLACES[e.detail.id];place=p&&{...p,route:e.detail.route||p.route,origin:e.detail.origin,gps:e.detail.gps};
    if(!e.detail.found || !place){ banner.hidden = true; return; }
    steps = buildSteps(place); fit(place); banner.hidden = false;$('navPlay').hidden=place.gps||place.route.length<2;show(0,place.gps?'Ubicación en vivo · recorrido orientativo':place.route.length<2?'El origen y el destino coinciden':'Pulsa «Iniciar recorrido» para ver la simulación');
    if(auto&&!place.gps&&place.route.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const current=place;autoTimer=setTimeout(()=>{autoTimer=null;if(place===current&&!banner.hidden&&!raf)play();},700);}
  }
  document.addEventListener('orienta:select',e=>showRoute(e,true));document.addEventListener('orienta:route-update',e=>showRoute(e,false));
  const initial=new URLSearchParams(location.search).get('dest');if(initial&&window.ORIENTA_PLACES?.[initial])showRoute({detail:{id:initial,found:true,route:window.ORIENTA_PLACES[initial].route,origin:'Entrada principal (aprox.)',gps:false}},false);
  document.addEventListener('orienta:reset', () => { stop(); banner.hidden = true; });
})();

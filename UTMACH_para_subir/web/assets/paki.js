'use strict';
// Paki, asistente virtual de UTMACH Orienta: saluda, da consejos y comenta la ruta.
(function(){
  const TIPS = [
    'Consulta tus trámites y datos académicos en el SIUTMACH.',
    'Bienestar Universitario puede orientarte si necesitas apoyo durante tu carrera.',
    'La biblioteca es un buen lugar para estudiar con calma.',
    'Si te pierdes, vuelve a la entrada principal y elige otro destino.',
    'Pregunta sin miedo: todos fuimos estudiantes de nuevo ingreso.'
  ];
  let tipIdx = 0, hideT = null;
  const el = document.createElement('div'); el.className = 'paki';
  el.innerHTML = '<div class="paki-bubble" id="pakiBubble" hidden></div>' +
    '<button type="button" class="paki-avatar" id="pakiAvatar" aria-label="Paki, tu guía. Toca para un consejo"><img src="./assets/paki.png" alt="Paki, mascota de la UTMACH"></button>' +
    '<div class="paki-row"><button type="button" class="paki-tip" id="pakiTip">💡 Consejo</button><button type="button" class="paki-min" id="pakiMin" aria-label="Minimizar a Paki">–</button></div>';
  document.body.appendChild(el);
  const bubble = el.querySelector('#pakiBubble'), avatar = el.querySelector('#pakiAvatar');

  function say(text, ms){
    bubble.textContent = text; bubble.hidden = false;
    avatar.classList.remove('talk'); void avatar.offsetWidth; avatar.classList.add('talk');
    clearTimeout(hideT); hideT = setTimeout(() => { bubble.hidden = true; }, ms || 7000);
  }
  function tip(){ say('💡 ' + TIPS[tipIdx++ % TIPS.length], 9000); }
  avatar.addEventListener('click', () => { if(!avatar.dataset.dragged) tip(); }); el.querySelector('#pakiTip').addEventListener('click', tip);
  // Minimizar y arrastrar: Paki nunca tapa el QR ni el mapa.
  const min = el.querySelector('#pakiMin');
  min.addEventListener('click', () => { el.classList.toggle('mini'); min.textContent = el.classList.contains('mini') ? '+' : '–'; });
  if(document.body.classList.contains('mobile-route')) min.click();
  let drag = null;
  avatar.addEventListener('pointerdown', e => { const r = el.getBoundingClientRect(); drag = {dx:e.clientX - r.left, dy:e.clientY - r.top, moved:false, x:e.clientX, y:e.clientY}; avatar.setPointerCapture(e.pointerId); });
  avatar.addEventListener('pointermove', e => { if(!drag) return;
    if(Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
    if(drag.moved) Object.assign(el.style, {left: Math.max(0, Math.min(innerWidth - el.offsetWidth, e.clientX - drag.dx)) + 'px', top: Math.max(0, Math.min(innerHeight - el.offsetHeight, e.clientY - drag.dy)) + 'px', bottom:'auto', right:'auto'}); });
  avatar.addEventListener('pointerup', () => { avatar.dataset.dragged = drag && drag.moved ? '1' : ''; drag = null; setTimeout(() => { avatar.dataset.dragged = ''; }, 0); });
  const title = id => (window.ORIENTA_PLACES && window.ORIENTA_PLACES[id] || {}).title || 'tu destino';

  document.addEventListener('orienta:pir', () => say('¡Hola! Soy Paki, tu guía en la UTMACH. ¿A dónde quieres ir?', 9000));
  document.addEventListener('orienta:select', e => say(e.detail.found
    ? '¡Sígueme! Te llevo a ' + title(e.detail.id) + '.'
    : 'Ese lugar aún no está en el mapa. ¡Prueba con otro destino!'));
  document.addEventListener('orienta:arrive', e => say('¡Llegamos a ' + title(e.detail.id) + '! 🎉'));
  document.addEventListener('orienta:reset', () => say('¡Listo! ¿A dónde vamos ahora?'));
  setTimeout(() => say('¡Hola! Soy Paki. Elige un lugar y te acompaño.', 8000), 800);
})();

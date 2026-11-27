'use strict';
// ESP32: componente previsto para la futura comunicación inalámbrica.
(()=>{
 const grid=document.getElementById('materials-grid');if(!grid||grid.querySelector('[data-esp32]'))return;
 const card=document.createElement('article');card.className='material-card';card.dataset.category='Control';card.dataset.esp32='true';
 card.innerHTML=`<button type="button" class="material-image" data-material-image="assets/materiales/esp32.svg" data-material-title="ESP32 DevKit V1 · ilustración" aria-label="Ampliar ilustración del ESP32"><img src="assets/materiales/esp32.svg" alt="Ilustración referencial de una placa ESP32 DevKit V1" loading="lazy" decoding="async"><span class="material-index">10</span><span aria-hidden="true" class="material-zoom">↗</span></button><div class="material-info"><span class="material-category">Control</span><h4>ESP32 DevKit V1</h4><span class="material-qty">1 unidad · integración prevista</span><p>Microcontrolador con Wi-Fi y Bluetooth. Se contempla para una futura comunicación inalámbrica entre el prototipo y la plataforma web. La conexión física actual continúa por Arduino USB.</p><p><small>Ilustración referencial; no es una fotografía del montaje.</small></p></div>`;
 grid.append(card);const count=document.getElementById('materials-count');if(count)count.textContent=String(grid.querySelectorAll('.material-card').length).padStart(2,'0')+' / componentes';
})();

(()=>{
 const grid=document.getElementById('materials-grid'),count=document.getElementById('materials-count'),dialog=document.getElementById('gallery-dialog');
 if(!grid)return;
 const cards=[...grid.querySelectorAll('.material-card')], filters=[...document.querySelectorAll('.material-filters button')];
 filters.forEach(btn=>btn.addEventListener('click',()=>{
  filters.forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
  let n=0; cards.forEach(card=>{card.hidden=btn.dataset.filter!=='Todos'&&card.dataset.category!==btn.dataset.filter;if(!card.hidden){n++;card.classList.add('visible');}});
  count.textContent=String(n).padStart(2,'0')+' / componentes';
 }));
 grid.querySelectorAll('[data-material-image]').forEach(b=>b.addEventListener('click',()=>{
  if(!dialog||typeof dialog.showModal!=='function')return;
  const img=dialog.querySelector('img');img.src=b.dataset.materialImage;img.alt=b.dataset.materialTitle;
  dialog.querySelector('p').textContent=b.dataset.materialTitle+' · imagen de referencia del material';dialog.showModal();
 }));
})();

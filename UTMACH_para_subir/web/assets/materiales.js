'use strict';
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

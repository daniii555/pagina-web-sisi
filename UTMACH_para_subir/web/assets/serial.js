'use strict';
// Comunicación USB con el Arduino mediante Web Serial (Chrome/Edge; requiere HTTPS o localhost).
// Protocolo (una línea por mensaje, terminada en \n):
//   Arduino -> Web:  EVT:PIR | ACK:<id> | STATE:<texto>
//   Web -> Arduino:  DEST:<id> | RESET
(function(){
  const BAUD = 9600;
  let port = null, reader = null, lastSent = '', busy = false, welcomeTimer = null;
  const topbar = document.querySelector('.topbar');
  const box = document.createElement('div'); box.className = 'serial-box';
  box.innerHTML = '<button type="button" id="btnSerial">Conectar Arduino</button><span id="serialState" class="serial-state off">Sin conexión</span>';
  topbar.appendChild(box);
  const btn = box.querySelector('#btnSerial'), stateEl = box.querySelector('#serialState');
  const overlay = document.createElement('div'); overlay.className = 'welcome-overlay'; overlay.hidden = true;
  overlay.innerHTML = '<div><h2>¡Bienvenido a la UTMACH!</h2><p>Elige en el menú a dónde quieres ir.</p><small>Toca la pantalla para continuar</small></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', hideWelcome);

  function setState(text, cls){ stateEl.textContent = text; stateEl.className = 'serial-state ' + cls; }
  function showWelcome(){ overlay.hidden = false; clearTimeout(welcomeTimer); welcomeTimer = setTimeout(hideWelcome, 12000); }
  function hideWelcome(){ overlay.hidden = true; clearTimeout(welcomeTimer); }

  async function send(line){
    if(!port || !port.writable) return;
    try{ const w = port.writable.getWriter(); await w.write(new TextEncoder().encode(line + '\n')); w.releaseLock(); }
    catch(e){ console.warn('Error al enviar:', e); setState('Error de envío', 'err'); }
  }
  function onLine(line){
    line = line.trim(); if(!line) return; console.log('[Arduino]', line);
    if(line === 'EVT:PIR'){ showWelcome(); document.dispatchEvent(new CustomEvent('orienta:pir')); }
  }
  async function readLoop(){
    const dec = new TextDecoder(); let buf = '';
    try{
      while(port && port.readable){
        reader = port.readable.getReader();
        try{
          for(;;){ const {value, done} = await reader.read(); if(done) break;
            buf += dec.decode(value, {stream:true}); let i;
            while((i = buf.indexOf('\n')) >= 0){ onLine(buf.slice(0, i)); buf = buf.slice(i + 1); } }
        } finally { reader.releaseLock(); reader = null; }
      }
    }catch(e){ console.warn('Lectura interrumpida:', e); }
    await cleanup('Desconectado');
  }
  async function cleanup(msg){
    const p = port; port = null; lastSent = '';
    try{ if(reader) await reader.cancel(); }catch(e){}
    try{ if(p) await p.close(); }catch(e){}
    btn.textContent = 'Conectar Arduino'; setState(msg, 'off');
  }
  async function open(p){
    port = p; await port.open({baudRate: BAUD});
    btn.textContent = 'Desconectar'; setState('Arduino conectado', 'on'); readLoop();
  }
  async function connect(){
    if(busy) return; busy = true;
    try{
      if(port){ await cleanup('Desconectado'); return; }
      if(!('serial' in navigator)){ setState('Usa Chrome o Edge en localhost/HTTPS', 'err'); return; }
      await open(await navigator.serial.requestPort());
    }catch(e){
      setState(e.name === 'NotFoundError' ? 'No se eligió ningún puerto' : 'No se pudo abrir el puerto (¿otro programa lo usa?)', 'err'); port = null;
    }finally{ busy = false; }
  }
  btn.addEventListener('click', connect);
  if('serial' in navigator){
    navigator.serial.addEventListener('disconnect', () => cleanup('Cable desconectado'));
    navigator.serial.getPorts().then(ps => { if(ps.length) open(ps[0]).catch(() => { port = null; }); }).catch(() => {});
  }
  document.addEventListener('orienta:select', e => {
    hideWelcome();
    if(!e.detail.found || e.detail.id === lastSent) return;   // sin comandos repetidos ni destinos sin ruta
    lastSent = e.detail.id; send('DEST:' + e.detail.id);
  });
  document.addEventListener('orienta:reset', () => { hideWelcome(); if(lastSent !== ''){ lastSent = ''; send('RESET'); } });
})();

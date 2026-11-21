'use strict';
// ===== CONFIGURACIÓN DE UTMACH ORIENTA =====
// publicUrl: dirección HTTPS de Railway. El QR apuntará aquí. Ej.: 'https://utmach-orienta.up.railway.app'
// origin / coords: coordenadas REALES para el botón "Abrir en Google Maps" (copiarlas desde Google Maps).
//   origin: {lat:-3.0000, lng:-79.0000}   coords: { medicina:{lat:..., lng:...}, civil:{...} }
// Mientras estén vacías, el botón abre Google Maps buscando el nombre del lugar.
window.ORIENTA_CONFIG = { publicUrl: '', origin: null, coords: {} };

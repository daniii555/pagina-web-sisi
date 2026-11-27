# UTMACH Orienta — página única
Base: Expo Amplio Materiales, diseño original del mapa. No incluye la fase Wi-Fi del ESP32.

## Railway
Configurar variables ADMIN_USER (por defecto admin) y ADMIN_PASSWORD (mínimo 12 caracteres, elige una privada y única). No incluir la contraseña en GitHub. Publicar usando Dockerfile existente. Sin contraseña válida el acceso administrador permanece deshabilitado.

## Local Windows
En CMD, desde la carpeta del proyecto:
```
set ADMIN_USER=admin
set ADMIN_PASSWORD=TU_CLAVE_PRIVADA_DE_12_O_MAS_CARACTERES
iniciar_windows.bat
```
Abrir http://localhost:8080. Para USB usar Chrome o Edge en localhost o HTTPS; conectar Arduino, iniciar sesión y seleccionar el puerto. La sesión dura 8 horas y se pierde al reiniciar el servidor. La telemetría se guarda automáticamente en un historial continuo (monitoring.tsv), sin separar pruebas. En Railway debe existir un volumen persistente montado en /app/data (o la ruta indicada por RAILWAY_VOLUME_MOUNT_PATH). Sin volumen se muestra una advertencia. Localmente se usa data/. La tabla muestra los 300 registros recientes y permite descargar todos los anteriores. Se registran cambios y una muestra cada 5 segundos de estados repetidos; solo cuando se reciben mensajes del Arduino. Los registros de la versión anterior que solo estaban en memoria no se recuperan automáticamente. No subas data/ a GitHub. El firmware debe emitir STATE para mostrar telemetría; el código incluido corresponde a la base original. El público puede usar el mapa, QR, materiales y demostración sin acceso a USB. Las rutas son ilustrativas, no navegación física verificada. Los archivos de código se descargan sin navegar a otras páginas. La simulación visual integrada no sustituye Wokwi.

## Mapa y GPS
Nueva captura 698 × 500 aportada por el equipo. La red de caminos es ilustrativa, redibujada visualmente; no garantiza acceso peatonal. La georreferencia usa dos centros aproximados (Mapcarta / OpenStreetMap W161671748 y W161672598), que deben calibrarse in situ. El GPS del navegador solicita permiso al pulsar «Usar mi ubicación», requiere HTTPS o localhost y no envía ni guarda coordenadas en Java, telemetría ni QR. Los QR contienen solo el destino. Si la precisión es superior a 40 m o queda fuera de la imagen, se debe elegir un origen manual. El botón de recorrido es una demostración, no una confirmación de llegada física.

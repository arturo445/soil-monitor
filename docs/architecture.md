# Arquitectura y alcance

```text
Sensor A1 → Uno (9600, trama 1/s) → adaptación 5 V/3,3 V → ESP8266
ESP8266 HTTP :80 → Fetch cada 2 s → React/Vite → navegadores LAN
```

## Responsabilidades

- Uno: ADC A1, umbrales originales y LED 10/11/12/13. Planificación por `millis()`, sin `delay()`.
- ESP8266: parser serial acotado, última trama válida, vencimiento a 5 s, Wi-Fi con reintentos, HTTP y CORS. No reloj civil ni nube.
- `src/api/humidityApi.js`: URL por entorno, fetch con timeout/cancelación, validación del contrato y traducción de errores.
- `src/hooks/useHumidity.js`: polling sin solapamiento, recuperación, cancelación y máximo 120 muestras. No persistencia.
- Componentes: presentación accesible; página Dashboard compone las vistas.
- Pruebas: unidades ADC/API, hook con reloj controlado, navegador con respuestas HTTP interceptadas y firmware nativo. Los datos de test no están disponibles en producción.

## Alcance del cambio y compatibilidad

Se inspeccionaron `../versionUNO.ino` y `../versionESP.ino`; se conservan sin modificar. La implementación nueva vive en este directorio. Alcance: ambos firmwares, emisor y receptor del protocolo, contrato HTTP, cliente, hook, componentes, configuración Vite, fixtures de prueba y documentación. El protocolo reemplaza el entero suelto original: **hay que actualizar ambos firmwares juntos**. No borrar ni sobrescribir datos de usuario; no se requiere base de datos. No se crean commits ni se publican servicios externos.

## Decisiones

- ASCII con XOR: parser pequeño y verificable; detecta errores comunes, sin pretender seguridad criptográfica.
- HTTP y polling: suficiente para una lectura por segundo y consulta por dos segundos; no se justifican WebSockets.
- `readingAgeMs` permite estimar fecha del navegador sin interpretar `millis()` como Unix. La latencia de red y adquisición limita esa precisión. Historia por tiempo de recepción estimado, no reloj exacto del Uno.
- Historial finito de sesión. Las interrupciones introducen un hueco; no se interpolan como si hubiera mediciones. Reinicio del ESP inicia nueva serie al detectarse retroceso de uptime (incluye rollover).
- No datos simulados en la aplicación, ni porcentajes sin calibración. Un ADC plausible no garantiza sensor enchufado o sano.
- URL del ESP mediante `VITE_ESP8266_URL`, validada, nunca codificada en componentes. Build-time: reiniciar Vite/recompilar al cambiar `.env`.
- CORS abierto sin credenciales, solo LAN confiable. CORS no es autenticación. Sin port-forwarding, exposición pública ni HTTPS→HTTP mixto.

## Seguridad eléctrica — verificar antes de energizar

El original del Uno declara SoftwareSerial RX=2 / TX=3, sensor=A1 y LED=10/11/12/13. El original ESP declara D5 RX / D6 TX: estos alias sugieren una placa de desarrollo, **no identifican el modelo real**. Confirmar serigrafía, esquema y selección de placa antes de conectar; no traducir alias a GPIO por suposición.

- Uno TX3 es lógica de 5 V: nunca directo a RX del ESP. Usar adaptación unidireccional adecuada a 3,3 V o conversor de niveles compatible con UART. No prescribir valores de resistencias sin verificar el hardware.
- GND común obligatorio. Enlace de monitoreo unidireccional: basta TX Uno→RX ESP adaptado. No hace falta conectar ESP TX al Uno RX; conservar declaraciones de pines no obliga a cablear retorno.
- ESP8266 necesita alimentación regulada y estable de 3,3 V con margen para picos Wi-Fi (dimensionar fuente conforme al módulo/placa, típicamente al menos 500 mA). No asumir que el pin 3,3 V del Uno lo soporta.
- Algunas placas de desarrollo admiten USB/VIN regulado; otras son módulos desnudos y no. Nunca aplicar 5 V a VCC de un módulo ESP8266 ni a sus GPIO.
- A1 del Uno debe recibir voltaje dentro de su referencia de ADC; verificar sensor, alimentación, resistencias de LED y polaridades reales.
- Pines de arranque, UART de programación y comportamiento LED integrado dependen de placa. No se detecta ni valida eléctricamente desde software.

## Operación offline y red

Tras instalar dependencias y cargar firmware no se consulta ningún servicio de Internet; todos los scripts, CSS y fuentes son locales. El frontend debe servirse desde un equipo LAN y cada navegador contacta al ESP directamente. Mantener IP del ESP estable por reserva DHCP. Dos saltos distintos: celular→servidor frontend y celular→ESP. Si falla uno, revisar aislamiento AP/guest, subred, firewall y permisos de red local del navegador. Vite dev escucha 0.0.0.0, pero no es un servidor de producción. Servir `frontend/dist` con servidor estático apropiado en despliegues permanentes.

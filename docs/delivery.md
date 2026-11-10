# Entrega de Soil Monitor

## 1. Implementado

Firmware Uno/ESP8266, API HTTP local y dashboard React responsive en español. Conserva A1, LED 10/11/12/13 y pines seriales del original. Polling cada 2 segundos, timeout y cancelación, historial limitado, mensajes de error y reconexión automática. No hay datos simulados en la aplicación ni porcentajes sin calibración. Contratos serial/HTTP y guía de operación incluidos.

## 2. Estructura

```text
soil-monitor/
├── firmware/
│   ├── arduino-uno/      # sketch y protocolo local
│   └── esp8266/          # sketch, parser, HTTP y ejemplo de secretos
├── frontend/
│   ├── public/
│   ├── src/{api,components,hooks,pages,utils}/
│   ├── tests/            # navegador responsive
│   └── scripts/          # entorno de test portable
├── tests/firmware/       # pruebas nativas y dobles de plataforma
├── docs/                # contratos, arquitectura y validación
├── PRODUCT.md
├── DESIGN.md
├── .gitignore
└── README.md
```

## 3. Archivos creados y modificados

Todos los archivos de la lista inferior son nuevos respecto al workspace inicial, que solo contenía los dos sketches originales. Las modificaciones durante la implementación se limitaron a estos archivos nuevos. `../versionUNO.ino` y `../versionESP.ino` se conservaron; no se inicializó Git, hizo commit ni push. No se tocaron reglas de firewall. Dependencias, dist y capturas son artefactos locales ignorados, no parte del inventario de fuentes.

Inventario: **52 archivos** de código, configuración, pruebas y documentación.

- `.gitignore`
- `DESIGN.md`
- `PRODUCT.md`
- `README.md`
- `docs/api-contract.md`
- `docs/architecture.md`
- `docs/delivery.md`
- `docs/firmware-validation.md`
- `docs/validation.md`
- `firmware/arduino-uno/arduino-uno.ino`
- `firmware/arduino-uno/soil_protocol.h`
- `firmware/esp8266/.gitignore`
- `firmware/esp8266/esp8266.ino`
- `firmware/esp8266/secrets.example.h`
- `firmware/esp8266/soil_http.h`
- `firmware/esp8266/soil_protocol.h`
- `firmware/esp8266/soil_receiver.h`
- `frontend/.env.example`
- `frontend/eslint.config.js`
- `frontend/index.html`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/playwright.config.js`
- `frontend/public/favicon.svg`
- `frontend/scripts/test-env.js`
- `frontend/src/App.jsx`
- `frontend/src/api/humidityApi.js`
- `frontend/src/api/humidityApi.test.js`
- `frontend/src/components/ConnectionStatus.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/HumidityCard.jsx`
- `frontend/src/components/HumidityCard.test.jsx`
- `frontend/src/components/HumidityChart.jsx`
- `frontend/src/components/StatusIndicator.jsx`
- `frontend/src/hooks/useHumidity.js`
- `frontend/src/hooks/useHumidity.test.jsx`
- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/utils/humidity.js`
- `frontend/src/utils/humidity.test.js`
- `frontend/tests/dashboard.spec.js`
- `frontend/vite.config.js`
- `tests/firmware/esp_sketch_test.cpp`
- `tests/firmware/native_tests.cpp`
- `tests/firmware/run-native.sh`
- `tests/firmware/stubs/ESP8266WebServer.h`
- `tests/firmware/stubs/ESP8266WiFi.h`
- `tests/firmware/stubs/SoftwareSerial.h`
- `tests/firmware/stubs/platform.h`
- `tests/firmware/stubs/secrets.h`
- `tests/firmware/uno_sketch_test.cpp`

## 4. Decisiones técnicas

- Protocolo ASCII versionado `SM1` con ADC, estado, XOR y LF; buffer/presupuesto acotado y resincronización. Ambas placas deben actualizarse juntas.
- API HTTP con CORS sin credenciales para LAN confiable, no-store y errores JSON. `connected` solo significa frescura serial. Tras 5 s sin trama válida responde 503 con datos nulos.
- Caducidad persistente para que un rollover completo de millis no reactive una lectura vencida. `readingAgeMs` permite estimar hora en navegador sin interpretar uptime como Unix.
- `VITE_ESP8266_URL` centraliza la IP. Wi-Fi en `secrets.h` local ignorado; no se incorporaron credenciales reales.
- Sin backend adicional, WebSockets, persistencia, bombas ni control remoto. Recharts se carga como chunk separado para evitar un bundle inicial excesivo.
- Cabeceras de protocolo locales en ambos sketches para compatibilidad con Arduino Builder, con igualdad byte a byte comprobada por el script de test.

## 5. Pruebas ejecutadas

| Verificación | Resultado |
|---|---|
| Instalación dependencias frontend | Correcta, incluyendo herramientas de desarrollo |
| Vitest | 47 pruebas aprobadas en 4 archivos |
| ESLint | Aprobado, sin advertencias |
| Vite build | Aprobado, sin advertencias |
| Chromium E2E | 12 pruebas aprobadas: escritorio, móvil y tablet |
| Firmware nativo | 4693 comprobaciones y dos ejecutables de sketches aprobados |
| Arduino Uno AVR 1.8.8 | Compila para arduino:avr:uno; 4294 bytes de programa y 197 bytes globales |
| ESP8266 core 3.1.2 | Compila para nodemcuv2 de referencia; RAM 30240 bytes, IRAM 62003/65536, flash código 274996 bytes |
| Falta secrets.h | Falla como se espera con diagnóstico explícito |
| Red local del servidor frontend | HTTP 200 por loopback y por su IP Wi-Fi desde el mismo equipo; no prueba un segundo dispositivo |
| Build sin configuración ESP | Advierte configuración pendiente y muestra —, no valores ficticios |
| Audit npm de producción | 0 vulnerabilidades reportadas al consultar |

Detalles y comandos reproducibles: `docs/validation.md` y `docs/firmware-validation.md`. Las compilaciones se repitieron después de la revisión final. Fuentes del ESP en scratch comparadas con producción; credenciales ficticias exclusivamente en la copia de compilación.

## 6. Problemas y soluciones

- Modo producción heredado omitía herramientas y deshabilitaba React.act: instalación con `--include=dev` y aislamiento portable del entorno de test.
- Escritura transitoria fallida dejó un componente sin crear: el build lo detectó, se creó y se repitieron todos los controles frontend.
- Bundle inicial ~597 kB: lazy loading del gráfico, sin ocultar avisos mediante un umbral artificial.
- HTTP con HTML se clasificaba como JSON inválido: prueba de regresión y conservación del error HTTP.
- README esperaba IP USB pero firmware no la anunciaba: prueba del sketch en rojo, anuncio al conectar/reconectar y recompilación.
- Una muestra vencida podía reaparecer tras una vuelta completa de millis: prueba en rojo, vencimiento persistente y recompilación.
- Timeout de herramientas durante compilación/cierre de preview: se verificaron artefactos, se repitieron builds y se cerró el listener de prueba. Los servidores de prueba quedaron detenidos.

## 7. Limitaciones pendientes

No se realizó carga, prueba eléctrica, lectura ADC real, Wi-Fi en el ESP físico ni HTTP/TCP hacia hardware. NodeMCU v2 es solo referencia de compilación; falta identificar la placa real y confirmar D5/D6. La referencia ESP utiliza el 94 % de IRAM incluyendo caché; revisar margen si se amplía firmware. XOR no autentica la comunicación. La API no es apta para exposición pública. No hay calibración ni diagnóstico fiable de sensor desconectado a partir de un ADC plausible.

## 8. Puesta en funcionamiento — pasos necesarios

1. Confirmar modelo ESP/pinout, fuente adecuada, GND común y adaptación Uno TX 5 V → ESP RX 3,3 V antes de energizar. Verificar A1, LED y resistencias reales.
2. Crear `firmware/esp8266/secrets.h` desde su ejemplo con credenciales locales; seleccionar la placa real en Arduino IDE y cargar ambos sketches nuevos.
3. Abrir USB serial del ESP a 115200, obtener su IP y comprobar `/api/health` y `/api/humidity` desde la LAN.
4. Configurar esa IP en `frontend/.env` a partir de `.env.example`; ejecutar `npm ci --include=dev` y `npm run dev` en `frontend/`.
5. Abrir `http://IP_DEL_EQUIPO:5173` desde el celular en la misma red privada; permitir tráfico necesario sin deshabilitar el firewall. Mantener el frontend en HTTP compatible con la API HTTP.
6. Validar cortes de UART/Wi-Fi y recuperación, y calibrar el sensor con el suelo real antes de interpretar la lectura para riego.

Para uso permanente, compilar y servir `frontend/dist` con servidor estático local; Vite dev/preview no son servidores de producción.

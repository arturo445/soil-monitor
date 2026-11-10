# Soil Monitor

Monitoreo de humedad del suelo **en una red local**, con Arduino Uno, ESP8266 y un dashboard React. Solo consulta: no controla bombas ni LED remotamente. No requiere Internet para consultar datos después de instalar herramientas y dependencias.

```text
Sensor → Uno (A1) → serial 9600 → ESP8266 HTTP → React → navegadores LAN
```

Informe final e inventario de archivos: [docs/delivery.md](docs/delivery.md).

## Estado y límites

Implementación de monitoreo real, sin modo demo ni mediciones simuladas en producción. Las respuestas interceptadas de las pruebas son fixtures, no datos de hardware. El estado de validación ejecutada y las limitaciones están en [docs/validation.md](docs/validation.md) y [docs/firmware-validation.md](docs/firmware-validation.md).

**Antes de energizar:** confirma el modelo de placa ESP8266, su fuente y el adaptador de niveles. Uno usa lógica 5 V; ESP usa 3,3 V. **Nunca conectes TX del Uno directamente a RX del ESP.** Requiere GND común y alimentación adecuada; no asumir que el pin 3,3 V del Uno soporta los picos del ESP. Lee [arquitectura y seguridad eléctrica](docs/architecture.md).

## Estructura

- `firmware/arduino-uno/`: lectura A1, cuatro LED y transmisión serial.
- `firmware/esp8266/`: parser, conexión Wi-Fi y API HTTP.
- `frontend/src/api/`: Fetch y validación de respuestas externas.
- `frontend/src/hooks/`: polling y memoria de sesión.
- `frontend/src/components/`, `pages/`: interfaz responsive en español.
- `frontend/src/**/*.test.*`: pruebas unitarias y de hook.
- `frontend/tests/`: pruebas Chromium de escritorio, móvil y tablet.
- `tests/firmware/`: pruebas nativas del firmware.
- `docs/`: arquitectura, contratos y verificaciones.

Los archivos originales `../versionUNO.ino` y `../versionESP.ino` se conservan intactos. Carga los nuevos sketches de `firmware/`, no los originales. Actualiza ambos juntos: el nuevo protocolo es incompatible con el entero suelto que enviaba la versión inicial.

## Requisitos

- Node.js **26 o superior** y npm, para las herramientas de frontend elegidas; Node no es un backend de este sistema.
- Arduino IDE 2 o Arduino CLI; paquete Arduino AVR para Uno y paquete ESP8266 para la placa real.
- Sensor analógico, Uno, ESP8266, cuatro LED con resistencias adecuadas, adaptación de niveles UART, fuente correcta y cableado verificado.
- Red Wi-Fi de 2,4 GHz compatible con ESP8266; equipo que sirva el frontend y navegadores con acceso a la misma LAN.
- Internet únicamente para instalar dependencias, cores y herramientas. No Google Fonts, CDN, nube, base de datos ni API externa durante el uso.

## Instalar y ejecutar el frontend

Desde este directorio:

```sh
cd frontend
npm ci --include=dev
```

Copia `.env.example` a `.env` con el explorador/editor. Configura `VITE_ESP8266_URL` con el **origen HTTP del ESP**, por ejemplo `http://192.168.0.50` (solo un ejemplo, no una IP descubierta). Sin `/api`, credenciales ni query. No uses `localhost`: en un celular se refiere al celular. La IP está centralizada en el entorno y no se escribe en componentes.

```sh
npm run dev
```

Vite escucha en **0.0.0.0:5173**; abre `http://localhost:5173` en el equipo servidor. Sin `.env` correcto, verás una advertencia de configuración, no datos falsos. Cambiar `.env` requiere reiniciar Vite. Las variables `VITE_*` son públicas: nunca incluyas contraseñas ahí.

### Desde el celular o tablet

1. Conecta ambos equipos y el ESP a la misma LAN, sin aislamiento de clientes/guest.
2. Obtén la IPv4 Wi-Fi del equipo con `ipconfig` en Windows; usa la de la interfaz que tiene puerta de enlace, no la de WSL, VPN o Hyper-V.
3. Visita `http://IP_DEL_EQUIPO:5173`. Autoriza el acceso de Node al firewall **solo en red privada** si Windows lo solicita. No deshabilites el firewall.
4. El celular descarga el frontend del equipo, pero consulta al ESP directamente. Su navegador debe poder abrir `http://IP_DEL_ESP/api/health`. Acepta el permiso de acceso a red local si lo pide.
5. Reserva la IP del ESP en DHCP para que `.env` no quede obsoleto. La IP del equipo y la del ESP son distintas.

No se ha verificado desde un segundo dispositivo físico; ver `docs/validation.md` para la prueba local de red realizada. No se modifican reglas de firewall automáticamente.

### Compilación y despliegue

```sh
npm run build
npm run preview
```

`build` produce `frontend/dist`. `preview` escucha en `0.0.0.0:4173` **solo para revisar la compilación**, no sustituye un servidor de producción. Para uso permanente sirve `dist` con un servidor estático de la LAN; no hace falta añadir un backend Node al proyecto. Mantén origen HTTP compatible con la API HTTP: una página HTTPS puede bloquear peticiones HTTP como contenido mixto. Si necesitas HTTPS, usa un proxy local apropiado; no expongas el ESP a Internet.

La dirección `VITE_ESP8266_URL` queda incorporada al build: recompila después de cambiarla. Los assets y fuentes son locales.

## Configurar Wi-Fi y cargar firmware

1. Identifica la placa ESP real y confirma que dispone de los alias **D5/D6** que usaba el firmware original. No se presupone NodeMCU por el nombre del pin. Si la placa no los define, revisa su pinout y adapta explícitamente la declaración antes de compilar/cablear.
2. En `firmware/esp8266/`, copia `secrets.example.h` a `secrets.h` y completa SSID/contraseña **solo en ese archivo local**. Está ignorado por Git. No se solicitan ni almacenan contraseñas en el frontend o la documentación.
3. Instala el core ESP8266 desde el índice oficial `https://arduino.esp8266.com/stable/package_esp8266com_index.json`. Usa la versión indicada en el informe de validación o verifica cualquier cambio de versión.
4. Abre `firmware/arduino-uno/arduino-uno.ino`, selecciona Arduino Uno y el puerto correcto; compila y carga. `SoftwareSerial` proviene del core AVR. El enlace Uno→ESP usa 9600 baudios; el sketch Uno no emite logs USB.
5. Abre `firmware/esp8266/esp8266.ino`, selecciona **tu placa real** y el puerto correcto; compila y carga. `ESP8266WiFi`, `ESP8266WebServer` y `SoftwareSerial` vienen con el core ESP8266; no instalar otra librería SoftwareSerial que los sustituya accidentalmente. Depuración USB ESP: 115200 baudios.
6. Verifica el cableado seguro antes de unir las placas: sensor en A1, LED rojo10/amarillo11/verde12/azul13; TX3 del Uno→adaptador 5→3,3 V→RX ESP (D5 original); GND común. La comunicación es unidireccional, así que no necesitas cablear el retorno ESP D6→Uno RX2. Esta lista conserva el código original, **no certifica el pinout de una placa desconocida**.
7. Abre monitor serial del ESP y espera la IP asignada por Wi-Fi. Usa esa IP en `.env`. Comprueba primero `/api/health`, luego `/api/humidity`.

No se ha cargado firmware ni realizado una prueba eléctrica desde este entorno. Desconecta alimentación antes de cambiar conexiones. No aplicar 5 V a GPIO/VCC de módulos ESP desnudos; USB/VIN de placas reguladas depende del modelo.

## Interpretación de humedad

| ADC | Estado API | Interfaz | LED |
|---|---|---|---|
| 800–1023 | DRY | Suelo seco | Rojo · 10 |
| 650–799 | NEEDS_WATER | Necesita agua | Amarillo · 11 |
| 400–649 | OPTIMAL | Humedad adecuada | Verde · 12 |
| 0–399 | TOO_WET | Exceso de agua | Azul · 13 |

Se mantienen los umbrales iniciales; **ADC no es porcentaje real de humedad**. Calibra con tu sensor, suelo y condiciones antes de usarlo para decidir riego. No basta una lectura dentro del rango para saber si el sensor está conectado: una entrada flotante también puede producir valores plausibles.

## API y comunicación

Contrato completo: [docs/api-contract.md](docs/api-contract.md).

- Serial: una trama ASCII por segundo, `SM1,<ADC>,<ESTADO>*<XOR_HEX>`, terminada en LF; validación de longitud, formato, checksum, rango y coherencia de estado. Firmware sin `delay()` de espera periódica.
- `GET /api/humidity`: HTTP 200 con `rawValue`, `status`, `connected`, `lastReadingMs`, `readingAgeMs`, `uptimeMs`. Solo lecturas seriales con edad ≤5000 ms.
- Sin trama reciente: HTTP 503, `connected:false`, lectura/estado/tiempo de lectura nulos y error `SERIAL_UNAVAILABLE`. Nunca se devuelve un dato antiguo como actual.
- `GET /api/health`: HTTP 200 comprueba el servicio, incluye `connected` serial; salud HTTP no garantiza sensor conectado.
- CORS `*`, sin credenciales; OPTIONS 204, rutas desconocidas 404, métodos no permitidos 405; JSON y no-store.
- `lastReadingMs` es uptime del ESP, **no fecha Unix**. La interfaz estima una hora con el reloj del navegador y `readingAgeMs`; incluye imprecisión por adquisición/red/reloj local.
- React consulta cada 2 s, timeout 1,8 s, sin peticiones superpuestas; cancela al desmontar y recupera conexión automáticamente.
- Gráfico Recharts: hasta 120 entradas de sesión (las marcas de interrupción también ocupan un lugar), sin persistencia. Los datos anteriores solo quedan como historial. Un retroceso de uptime reinicia la serie, incluso en rollover de `millis()`.

## Pruebas reproducibles

Desde `frontend/`:

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e -- --workers=1
npm audit --omit=dev
```

`npm test` fija internamente `NODE_ENV=test` para no heredar el modo producción de la terminal. Las herramientas de test requieren `npm ci --include=dev`. Playwright inicia su propio Vite en el puerto 5173: cierra otro Vite en ese puerto antes de ejecutar; utiliza fixtures HTTP interceptados, nunca un ESP ficticio en producción. No necesita un backend de pruebas permanente. Capturas de prueba: `frontend/test-results/dashboard-{desktop,mobile,tablet}.png`; el directorio se ignora por Git y se regenera.

Para firmware: ver [docs/firmware-validation.md](docs/firmware-validation.md), que detalla comandos nativos, versiones de cores y resultado de compilación de referencia. Compilar para NodeMCU como referencia no identifica tu placa real.

## Resolución de problemas

| Síntoma | Qué comprobar |
|---|---|
| Falta configurar el dispositivo | `.env`, origen `http://IP_DEL_ESP`, reinicio Vite o nuevo build. |
| ESP sin respuesta | Alimentación, IP, 2,4 GHz, subred, aislamiento AP, timeout, permisos LAN del navegador y CORS. |
| ESP responde pero serial no | Ambos firmwares nuevos, 9600 8N1, TX/RX, GND común, adaptador 5→3,3 V, tramas válidas. `/api/health` ayuda a separar red de serial. |
| Solo aparece una muestra | Una trama repetida no se añade dos veces; el gráfico espera un timestamp nuevo. |
| Gráfico vacío | No han llegado lecturas válidas en esta sesión. No se rellenará con datos inventados. |
| Error JSON/HTTP | IP apunta al dispositivo equivocado, ruta incorrecta o firmware antiguo. Consulta el contrato. |
| Celular carga interfaz sin datos | Celular→equipo funciona; revisar separadamente celular→ESP y permisos de red local. |
| Página HTTPS falla al consultar | Contenido mixto. Servir en HTTP dentro de LAN confiable o proxy local HTTPS. |
| Reinicios ESP al activar Wi-Fi | Fuente insuficiente, caída de tensión, desacoplo/cableado. No asumir potencia suficiente desde Uno. |
| ADC extraño, LED incorrecto | A1, sensor y referencia ADC, polaridad/resistencias LED y calibración; no simular valores para ocultar el fallo. |
| No se reconoce `D5`/`D6` | Modelo o core incorrecto. Consultar el pinout real, no adivinar GPIO. |
| Falla `React.act` o faltan Vite/Vitest | Instalar con `--include=dev` y ejecutar mediante `npm test`, que aísla NODE_ENV. |

## Seguridad

API solo lectura sin autenticación para una LAN confiable. CORS no es un control de acceso: otros equipos de esa LAN pueden consultar. No hacer port forwarding ni publicar el ESP. Mantén secretos en `secrets.h`, nunca en Git. Las pruebas de compilación no necesitan la contraseña real. No hay base de datos, almacenamiento remoto ni control físico remoto.

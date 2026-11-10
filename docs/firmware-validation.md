# Validación de firmware

## Resultado comprobado

- Pruebas nativas C++11 con g++ 16.2.0: **4693 comprobaciones pasan**, incluyendo ida/vuelta de los 1024 valores ADC.
- Arduino CLI **1.6.0**, core `arduino:avr` **1.8.8**, FQBN **`arduino:avr:uno`**: compilación correcta, 4294/32256 bytes de programa y 197/2048 bytes de variables globales.
- Core `esp8266:esp8266` **3.1.2**, FQBN **`esp8266:esp8266:nodemcuv2`**: compilación correcta, RAM 30240/80192 bytes, IRAM 62003/65536 bytes (incluye 32768 reservados a caché), flash de código 274996/1048576 bytes.
- **NodeMCU v2 es solamente la referencia de compilación, no una identificación de la placa física.**
- La compilación ESP sin `secrets.h` falla como se esperaba: `Falta secrets.h: copie secrets.example.h a secrets.h y configure WIFI_SSID y WIFI_PASSWORD.`
- El ESP se compiló desde una copia idéntica en scratch, añadiendo únicamente un `secrets.h` temporal con valores ficticios. No existe `secrets.h` en el árbol entregado, ni se usaron credenciales reales.
- No se cargó nada a hardware ni se hizo commit. `versionUNO.ino` y `versionESP.ino` no se modificaron.

## TDD observado

Se ejecutaron ciclos rojo → verde con la prueba escrita antes de la implementación de cada bloque. Extractos reales de los fallos de las versiones intermedias (todos con salida 1):

| Bloque | Fallo observado antes de implementar |
|---|---|
| Umbrales | `FAIL line 11: std::strcmp(soil::statusFor(0), "TOO_WET") == 0` |
| Emisor SM1/XOR | `FAIL line 20: soil::formatFrame(720, frame, sizeof frame)` |
| Parser canónico | `FAIL line 29: soil::parseFrame("SM1,720,NEEDS_WATER*49", 22, decoded)` |
| Estado y frescura | `FAIL line 55: rx.connected(100)` |
| Timeout y descarte | `FAIL line 73: partial.invalidFrames == 1` |
| Scheduling | `FAIL line 106: sample.due(0)` |
| Presupuesto serial | `FAIL line 122: soil::drainSerial(stream, flood, 0) == 64` |
| Contrato HTTP | `FAIL line 133: reply.code == 503` |
| Envío de headers | `FAIL line 179: server.code == reply.code && server.body == reply.body` |

Las líneas corresponden a esas versiones intermedias, no al archivo final. Después de cada bloque se ejecutó el conjunto completo y pasó. La última ejecución del conjunto principal devuelve:

```text
PASS: 4693 checks (1024 ADC roundtrips, receiver, scheduling, budget, HTTP JSON/routes/headers)
PASS: Uno sketch A1, original LED pins, cadence and serial frames
PASS: ESP sketch scheduling, HTTP servicing and IP announcement
```

Cobertura: umbrales extremos, ADC decimal canónico, versión, signos, espacios, ceros iniciales, rango, estado incoherente incluso con XOR correcto, checksum mayúsculo, LF/CRLF, corrupción, caracteres de control y bytes no ASCII, máximo 63 bytes antes de LF, descarte hasta LF, timeout total de trama de 250 ms, recuperación posterior, conservación de la última lectura válida, caducidad inclusiva de 5000 ms, lectura válida en millis cero y rollover uint32. También: intervalos de muestreo y reintento Wi-Fi, ausencia de ráfagas para recuperar periodos atrasados, límite de 64 bytes seriales por vuelta, JSON 200/503/health, 404/405/OPTIONS 204 sin cuerpo y headers CORS/no-store/Allow. Los headers se prueban mediante un servidor de prueba que registra las llamadas al mismo adaptador que usa el sketch; no es una prueba TCP sobre un ESP real.

## Reproducir las pruebas nativas

Desde `soil-monitor/`, con Bash y g++:

```bash
bash tests/firmware/run-native.sh
```

El script usa `CXX` o `g++`, con fallback a `C:/ProgramData/scoop/apps/mingw/current/bin/g++` en este equipo. Compila con `-std=c++11 -Wall -Wextra -Werror -pedantic` y escribe los ejecutables bajo `SOIL_TEST_BUILD_DIR` si se configura. En Windows usa por defecto `%LOCALAPPDATA%/hermes/cache/scratch/soil-firmware-native`; fuera de Windows usa `TMPDIR` o `/tmp`. Esto evita pasar `/tmp` sin convertir a un compilador nativo de Windows. Además comprueba con `cmp` que los dos `soil_protocol.h` sean idénticos. Se mantienen copias locales pequeñas para que Arduino Builder no dependa de includes relativos fuera de cada sketch; cualquier cambio de protocolo debe aplicarse a ambas.

Compilación manual equivalente (ajuste la ruta de salida a su scratch):

```bash
g++ -std=c++11 -Wall -Wextra -Werror -pedantic \
  tests/firmware/native_tests.cpp -o "$TMPDIR/soil-native-tests.exe"
"$TMPDIR/soil-native-tests.exe"
```

## Reproducir Arduino CLI sin configuración global

Herramienta descargada del ZIP oficial `https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip`. En esta sesión quedó bajo:

```text
C:/Users/57321/AppData/Local/hermes/cache/scratch/soil-arduino/
```

Su `config.json` contiene YAML (el comando `config set` de Arduino CLI reescribió el JSON inicial como YAML). Contiene rutas absolutas de `directories.data`, `directories.downloads`, `directories.user` y `build_cache.path` dentro de esa misma carpeta, además de `board_manager.additional_urls` con `https://arduino.esp8266.com/stable/package_esp8266com_index.json`. Los builds usan también un `--build-path` explícito en scratch. No se editó la configuración global de Arduino.

Comandos usados desde `soil-monitor/` (Bash; el binario nativo recibe rutas Windows con `/`):

```bash
S='C:/Users/57321/AppData/Local/hermes/cache/scratch/soil-arduino'
CLI="$S/bin/arduino-cli.exe"
"$CLI" --config-file "$S/config.json" core update-index
"$CLI" --config-file "$S/config.json" core install arduino:avr esp8266:esp8266
"$CLI" --config-file "$S/config.json" core list
"$CLI" --config-file "$S/config.json" compile \
  --fqbn arduino:avr:uno --build-path "$S/build-uno" firmware/arduino-uno

# Sin secrets.h: fallo intencional para verificar el diagnóstico.
"$CLI" --config-file "$S/config.json" compile \
  --fqbn esp8266:esp8266:nodemcuv2 \
  --build-path "$S/build-esp-missing-secrets" firmware/esp8266

# Copia temporal del sketch; el secrets.h de prueba NO va al repositorio.
mkdir -p "$S/sketches/esp8266"
cp firmware/esp8266/*.h firmware/esp8266/*.ino "$S/sketches/esp8266/"
cp "$S/sketches/esp8266/secrets.example.h" "$S/sketches/esp8266/secrets.h"
"$CLI" --config-file "$S/config.json" compile \
  --fqbn esp8266:esp8266:nodemcuv2 --build-path "$S/build-esp" \
  "$S/sketches/esp8266"
```

La copia del ejemplo es una manera de repetir la prueba sin credenciales reales. El build comprobado usó los literales ficticios `SOIL_COMPILE_ONLY_NO_NETWORK` / `NOT_A_REAL_PASSWORD`, solo en scratch; el código fuente restante se comparó byte a byte con el entregado. La primera invocación larga del build ESP agotó el timeout del transporte de herramientas; se encontró el binario generado y se repitió la compilación incremental, que terminó con código 0 y el informe de memoria anterior. Las compilaciones posteriores de ambos firmwares, con caché explícita en scratch, terminaron con código 0.

Artefactos comprobados:

```text
scratch/soil-arduino/build-uno/arduino-uno.ino.hex                 12098 bytes
scratch/soil-arduino/build-uno/arduino-uno.ino.with_bootloader.hex 13244 bytes
scratch/soil-arduino/build-esp/esp8266.ino.bin                     312032 bytes
```

## Revisión final del integrador

Se repitieron las pruebas y las dos compilaciones después de la revisión del padre. Se añadieron pruebas nativas que incluyen directamente los sketches `.ino` con dobles de la plataforma (no hardware): A1, exclusividad y pines LED, tramas y cadencia Uno; Wi-Fi no persistente, reintentos, atención de HTTP y anuncio de IP ESP sin repetirlo en cada vuelta.

Dos regresiones verificadas en rojo y corregidas:

- Tras vencer una lectura, la frescura queda invalidada hasta una trama nueva; un ciclo completo de `millis()` no puede revivirla. Fallo reproducido: `!expired.connected(100)` después de vencer la muestra.
- La IP HTTP del ESP se anuncia por USB a 115200 baudios al conectar/reconectar. Fallo reproducido: no existía `http://192.0.2.50` en el log del sketch bajo test; esa dirección pertenece exclusivamente al doble de prueba.

El código ESP compilado desde scratch se comparó byte a byte con todos los `.ino`/`.h` de producción. Solo la copia scratch contiene secretos ficticios. RAM/flash y tamaño del binario arriba corresponden a esta revisión final; IRAM permanece al 94 %.

## Configuración y límites físicos pendientes

- Para un despliegue real, copiar `firmware/esp8266/secrets.example.h` a `secrets.h` y configurar `WIFI_SSID` / `WIFI_PASSWORD` localmente. `firmware/esp8266/.gitignore` ignora `/secrets.h`. La ausencia del archivo no tiene fallback silencioso.
- Uno: ADC A1; LEDs rojo 10, amarillo 11, verde 12 y azul 13; SoftwareSerial RX2/TX3, 9600 8N1. Una trama SM1 por segundo, comenzando en la primera vuelta. No hay logs en el enlace.
- ESP: SoftwareSerial RX D5/TX D6, 9600 8N1; servidor HTTP en puerto 80. Intento inicial y reintentos Wi-Fi espaciados 10000 ms con `millis()`, sin bucle de espera. `WiFi.persistent(false)` evita persistir esas reconexiones en flash. Se atiende HTTP y se cede ejecución en cada vuelta, incluso bajo ruido serial.
- **No comprobado físicamente:** placa exacta y correspondencia D5/D6; sensor, LEDs y su cableado; alimentación y estabilidad Wi-Fi; comportamiento eléctrico del enlace. Confirmar fuente adecuada para el ESP, masa común y adaptación de niveles desde el TX de 5 V del Uno al RX de 3,3 V del ESP. No conectar directamente suponiendo tolerancia a 5 V.
- Los umbrales son provisionales sin calibrar. No se ofrecen porcentajes ni detección fiable de sensor desconectado. Se requiere calibración para el sensor y suelo reales.
- `connected` informa frescura serial, no estado de Wi-Fi. Health no certifica el sensor. `rawValue`, `status`, `lastReadingMs` y `readingAgeMs` son nulos en 503 aunque internamente se conserve la última muestra; `uptimeMs` sigue siendo uint32.
- La API HTTP sin autenticación y CORS `*` es exclusivamente para LAN confiable, sin credenciales. No exponerla a Internet. XOR detecta ciertos errores accidentales, no autentica ni sustituye un CRC fuerte.
- No se probó carga de firmware, conexión Wi-Fi real, TCP/HTTP sobre hardware ni temporización eléctrica. La IRAM de la referencia ESP queda al 94%; recompilar y revisar uso de memoria si se añaden librerías.

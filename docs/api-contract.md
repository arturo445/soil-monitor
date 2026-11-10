# Contratos de Soil Monitor

## Estados (ADC entero de 10 bits, sin calibrar)

| ADC | Estado | LED Uno | Etiqueta |
|---|---|---|---|
| 800–1023 | DRY | 10 rojo | Suelo seco |
| 650–799 | NEEDS_WATER | 11 amarillo | Necesita agua |
| 400–649 | OPTIMAL | 12 verde | Humedad adecuada |
| 0–399 | TOO_WET | 13 azul | Exceso de agua |

No son porcentajes ni permiten detectar por sí solos un sensor desconectado.

## Serial v1

9600 baudios, 8N1; Uno SoftwareSerial RX2/TX3; ESP SoftwareSerial D5/D6 conservados del original (modelo de placa aún sin confirmar). Una trama por segundo:

`SM1,<rawValue>,<status>*<HH>\n`

`HH` son dos dígitos hexadecimales mayúsculos del XOR de todos los bytes ASCII anteriores a `*`, sin incluir `*` ni el salto de línea. ADC decimal canónico, sin signo, de 0 a 1023; estado ASCII exacto y coherente con los umbrales. No se admiten espacios. Se acepta CRLF además de LF. Máximo 63 bytes antes de LF. No hay mensajes de depuración en este enlace.

El receptor valida versión, formato, ADC, checksum y estado. Descarta tramas inválidas sin refrescar la última lectura. Ante desbordamiento o caracteres de control descarta hasta LF; ante trama incompleta durante 250 ms se resincroniza en LF. Presupuesto de bytes por vuelta para no privar de servicio a HTTP/Wi-Fi. La siguiente trama válida recupera la conexión automáticamente. XOR detecta errores accidentales comunes, no es autenticación ni un CRC fuerte.

## HTTP v1

API solo lectura para una LAN confiable, HTTP puerto 80, sin autenticación. No exponer a Internet. CORS `*`, sin cookies ni credenciales. GET/OPTIONS permitidos; respuestas JSON y `Cache-Control: no-store` para evitar mediciones cacheadas.

### GET /api/humidity

HTTP 200 si la última trama válida se recibió hace como máximo 5000 ms:

```json
{"rawValue":720,"status":"NEEDS_WATER","connected":true,"lastReadingMs":125400,"readingAgeMs":240,"uptimeMs":125640}
```

`lastReadingMs` y `uptimeMs` son contadores uint32 de `millis()` del ESP, **no** una fecha Unix. `readingAgeMs` es la resta unsigned, segura ante rollover. El navegador estima la hora con su reloj de recepción menos esa edad; no promete sincronización absoluta con el sensor. Una muestra se identifica por timestamp y valor; un reinicio que retrocede uptime reinicia el historial para no unir sesiones del ESP.

HTTP 503 cuando no hay trama reciente:

```json
{"rawValue":null,"status":null,"connected":false,"lastReadingMs":null,"readingAgeMs":null,"uptimeMs":125640,"error":{"code":"SERIAL_UNAVAILABLE","message":"Sin lecturas seriales recientes"}}
```

Se conservan internamente los últimos datos válidos, pero no se sirven como actuales. `connected` describe la comunicación serial, **no** el Wi-Fi. Wi-Fi inaccesible produce error de red en el cliente; no una respuesta JSON del ESP.

### GET /api/health

HTTP 200 si el ESP atiende HTTP, incluso si el sensor está ausente:

```json
{"status":"ok","connected":false,"uptimeMs":125640,"wifiConnected":true,"invalidFrames":0}
```

Esta salud comprueba el servidor, no certifica una medición válida; consultar `connected` o `/api/humidity` para el enlace serial.

### Errores

- 404: `{"error":{"code":"NOT_FOUND","message":"Ruta no encontrada"}}`.
- 405 para métodos distintos de GET/OPTIONS en rutas conocidas, con `Allow: GET, OPTIONS` y error `METHOD_NOT_ALLOWED`.
- OPTIONS: 204, sin cuerpo.
- 503 serial no disponible: cuerpo anterior.

El frontend rechaza JSON malformado, ADC fuera de rango/no entero, estados incoherentes, timestamps inválidos y lecturas de más de 5000 ms. Otros errores HTTP no se convierten en datos. Polling cada 2000 ms sin solapamiento; timeout de 1800 ms, cancelación al desmontar. Historial máximo 120 muestras nuevas, únicamente durante la sesión del navegador, con huecos al desconectarse. No se generan mediciones simuladas en la aplicación.

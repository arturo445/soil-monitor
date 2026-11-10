# Verificación de Soil Monitor

## Frontend — ejecutado

Entorno observado: Windows, Node 26.7.0, npm 11.19.0. Versiones exactas de dependencias en `frontend/package-lock.json`.

| Comando / comprobación | Resultado |
|---|---|
| `npm install --include=dev --no-fund --no-audit` | Dependencias instaladas; se usó `--include=dev` porque la terminal heredaba NODE_ENV=production. |
| `npm test` | **47 pruebas aprobadas**, 4 archivos; Vitest 5.1.0. |
| `npm run lint` | ESLint sin errores ni advertencias (`--max-warnings 0`). |
| `npm run build` | Vite 8.3.7 genera `dist`; sin advertencias después de separar el gráfico con `lazy`. |
| `npm run test:e2e -- --workers=1` | **12 pruebas aprobadas** en Chromium: 4 casos por escritorio, móvil y tablet. Repetidas después del ajuste final del gráfico. |
| `npm audit --omit=dev --audit-level=moderate` | 0 vulnerabilidades reportadas en dependencias de producción al ejecutar la consulta. No es una auditoría manual de seguridad. |
| Revisión visual | Capturas escritorio y móvil inspeccionadas; sin texto cortado ni desbordamiento visible. Los 3 tamaños comprueban ancho documental ≤ viewport. |
| Contraste calculado | 9 combinaciones de texto/estado/fondo comprobadas; todas ≥4,5:1. Mínimo observado 5,58:1 entre las combinaciones ensayadas. No equivale a auditoría WCAG completa. |
| `npm run preview` + HTTP desde el mismo equipo | HTTP 200 y HTML correcto en `http://127.0.0.1:4173/` y `http://192.168.0.14:4173/`. Listener observado `0.0.0.0:4173`. IP Wi-Fi obtenida por `ipconfig`, puede cambiar. |
| Navegador contra el build sin `.env` | Alerta de `VITE_ESP8266_URL`, lectura `—`; no solicitudes con mediciones ficticias. |
| Limpieza de servidores de prueba | Puertos 4173/5173 sin listeners al terminar la comprobación. |

### Cobertura funcional

- Fronteras ADC 0/399/400/649/650/799/800/1023 y rechazo de valores inválidos.
- JSON válido/malformado, estados inconsistentes, lectura antigua, `millis=0`, rollover uint32 y timestamps incoherentes.
- HTTP 404/405/500/503; 503 solo significa pérdida serial si coincide el contrato; HTTP con cuerpo HTML conserva su clasificación HTTP.
- URL de dispositivo inválida o ausente; sin rutas/credenciales/HTTPS en la configuración del dispositivo.
- Error de red, timeout, cancelación por consumidor y desmontaje.
- Poll cada 2000 ms, no solapamiento, muestras repetidas no duplicadas, límite de 120, huecos de desconexión y reinicio de serie tras retroceso de uptime.
- Estados de carga/ausencia de lectura, pérdida serial y recuperación automática; interpretación de los cuatro estados en navegador.
- Gráfico Recharts renderizado en Chromium y alternativa textual mediante tabla.

Los fixtures se inyectan mediante `fetch` de prueba o interceptación HTTP de Playwright. **No prueban hardware, RF, ADC real ni conectividad hacia un ESP físico.** Ninguno se activa en producción.

## Firmware — ejecutado

- `bash tests/firmware/run-native.sh`: **4693 comprobaciones** del conjunto principal y **dos ejecutables de test de sketches** aprobados. Los 1024 ADC se codifican y decodifican; parsers, protocolo, caducidad, rollover, presupuestos y respuestas HTTP se prueban sin hardware.
- Compilación Uno: `arduino:avr:uno`, core 1.8.8, salida 0. Programa 4294 bytes y globales 197 bytes.
- Compilación ESP: `esp8266:esp8266:nodemcuv2`, core 3.1.2, salida 0. RAM 30240 bytes, IRAM 62003/65536 (94 %), flash de código 274996 bytes. **Placa de referencia asumida, modelo físico no confirmado.**
- Arduino CLI 1.6.0 y cores instalados en scratch, sin cambiar configuración global.
- ESP compilado desde copia idéntica de fuentes con secretos ficticios solo en scratch; el proyecto no contiene `firmware/esp8266/secrets.h`.
- Se corrigieron y probaron el anuncio USB de IP y la caducidad persistente de muestras para no revivirlas tras un ciclo de `millis()`.

Comandos, artefactos y detalles: [firmware-validation.md](firmware-validation.md). Compilación cruzada y dobles de plataforma **no** equivalen a prueba eléctrica o TCP real sobre el ESP.

## Problemas resueltos

- `NODE_ENV=production` omitía devDependencies: instalación explícita `--include=dev` y documentación de `npm ci --include=dev`.
- React sin `act` al heredar modo producción: precarga de entorno de test portable, exclusivamente para `npm test`.
- Fallo transitorio de la herramienta al crear `HumidityChart.jsx`: el build detectó import ausente; se creó el archivo faltante y se recompiló satisfactoriamente.
- Bundle inicial de ~597 kB: carga diferida de Recharts; salida principal ~232 kB y gráfico ~367 kB, sin aumentar el umbral de advertencia.
- Respuestas HTTP de error con HTML se clasificaban como JSON inválido: regresión reproducida, corrección y prueba aprobada.
- La herramienta de cierre del preview agotó su tiempo: se identificó el listener exacto del proceso de prueba y se cerró; se verificó que no quedaban listeners en los puertos usados. No se cambiaron reglas de firewall.

## Pendiente de validación física

- Modelo/pinout exacto del ESP8266 y selección de placa real.
- Fuente estable, niveles eléctricos, GND común, sensor A1 y LED físicos.
- Carga de ambos firmwares y extremo a extremo sensor→navegador.
- Prueba desde un celular/tablet real, incluyendo firewall, aislamiento AP y permisos LAN.
- Desenchufar UART manteniendo Wi-Fi: verificar 503 al superar 5 s y recuperación con trama válida.
- Interrumpir/restaurar Wi-Fi: verificar reconexión y recuperación frontend.
- Calibración del sensor con el suelo real. No se muestran porcentajes ni se detecta físicamente sensor desconectado por software.

No se afirma que el sistema haya medido humedad real durante esta implementación.

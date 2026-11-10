# Soil Monitor
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, Vite, JavaScript, CSS, Recharts y Fetch, solicitados por el usuario. Firmware C++ Uno + ESP8266.

## Product Purpose
Consultar lecturas reales de humedad del suelo en navegadores de una LAN, sin nube ni Internet durante el uso.

## Operating Context
Sensor A1 → Arduino Uno → serial → ESP8266 HTTP → navegador. Modelo exacto del ESP8266 y calibración física pendientes. No se asume hardware conectado.

## Capabilities and Constraints
Solo monitoreo. ADC 0–1023, cuatro estados y LED. Sin porcentajes sin calibración, simulaciones de producción, base de datos, bombas ni control remoto. Historial en memoria durante la sesión.

## Accessibility & Inclusion
Interfaz en español, responsive, foco visible, estados identificados por texto además de color, alternativa textual al gráfico.

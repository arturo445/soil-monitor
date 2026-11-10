#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <SoftwareSerial.h>
#include "soil_http.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Falta secrets.h: copie secrets.example.h a secrets.h y configure WIFI_SSID y WIFI_PASSWORD."
#endif

SoftwareSerial arduino(D5, D6);
ESP8266WebServer server(80);
soil::Receiver receiver;
soil::Periodic wifiRetryEvery(10000);
bool wasWifiConnected = false;

void handleRequest() {
  const soil::Method method = server.method() == HTTP_GET ? soil::Get :
                              server.method() == HTTP_OPTIONS ? soil::Options : soil::Other;
  soil::HttpReply reply;
  soil::makeReply(server.uri().c_str(), method, receiver, millis(),
                  WiFi.status() == WL_CONNECTED, reply);
  soil::sendReply(server, reply);
}

void setup() {
  Serial.begin(115200);
  arduino.begin(9600);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
  server.on("/api/humidity", HTTP_ANY, handleRequest);
  server.on("/api/health", HTTP_ANY, handleRequest);
  server.onNotFound(handleRequest);
  server.begin();
}

void loop() {
  const uint32_t now = millis();
  soil::drainSerial(arduino, receiver, now);
  const bool wifiConnected = WiFi.status() == WL_CONNECTED;
  if (wifiConnected && !wasWifiConnected) {
    Serial.print("ESP8266 HTTP: http://");
    Serial.println(WiFi.localIP());
  } else if (!wifiConnected && wasWifiConnected) {
    Serial.println("Wi-Fi desconectado. Reintentando...");
  }
  wasWifiConnected = wifiConnected;
  if (!wifiConnected && wifiRetryEvery.due(now))
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  server.handleClient();
  yield();
}

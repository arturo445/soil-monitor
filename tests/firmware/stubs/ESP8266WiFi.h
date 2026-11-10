#pragma once
#include "platform.h"
const int D5 = 14, D6 = 12, WIFI_STA = 1, WL_CONNECTED = 3;
struct FakeWiFi {
  int state = 0, attempts = 0;
  bool persistentValue = true;
  int status() { return state; }
  void persistent(bool value) { persistentValue = value; }
  void mode(int) {}
  void setAutoReconnect(bool) {}
  void begin(const char*, const char*) { ++attempts; }
  const char* localIP() { return "192.0.2.50"; }
};
static FakeWiFi WiFi;

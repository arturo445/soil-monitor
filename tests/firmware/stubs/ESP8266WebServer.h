#pragma once
#include "platform.h"
const int HTTP_GET = 0, HTTP_OPTIONS = 1, HTTP_ANY = 2;
class ESP8266WebServer {
 public:
  int serviced = 0;
  explicit ESP8266WebServer(int) {}
  void on(const char*, int, void (*)()) {}
  void onNotFound(void (*)()) {}
  void begin() {}
  int method() { return HTTP_GET; }
  std::string uri() { return "/api/health"; }
  void handleClient() { ++serviced; }
  void sendHeader(const char*, const char*) {}
  void send(int, const char*, const char*) {}
};

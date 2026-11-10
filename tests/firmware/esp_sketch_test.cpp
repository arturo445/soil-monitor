#include "stubs/platform.h"
#include "../../firmware/esp8266/esp8266.ino"
int main() {
  setup();
  CHECK(!WiFi.persistentValue);
  CHECK(arduino.rx == D5 && arduino.tx == D6 && arduino.baud == 9600);
  loop();
  CHECK(WiFi.attempts == 1 && server.serviced == 1);
  clockMs = 9999; loop(); CHECK(WiFi.attempts == 1);
  clockMs = 10000; loop(); CHECK(WiFi.attempts == 2);
  WiFi.state = WL_CONNECTED;
  clockMs = 10001; loop();
  CHECK(Serial.output.find("http://192.0.2.50") != std::string::npos);
  const std::string firstLog = Serial.output;
  clockMs = 10002; loop(); CHECK(Serial.output == firstLog);
  WiFi.state = 0; clockMs = 20000; loop();
  CHECK(WiFi.attempts == 3);
  WiFi.state = WL_CONNECTED; clockMs = 20001; loop();
  CHECK(Serial.output.size() > firstLog.size());
  std::puts("PASS: ESP sketch scheduling, HTTP servicing and IP announcement");
}

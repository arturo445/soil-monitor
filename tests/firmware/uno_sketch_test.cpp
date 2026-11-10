#include "stubs/platform.h"
#include "../../firmware/arduino-uno/arduino-uno.ino"
int main() {
  setup();
  CHECK(esp.rx == 2 && esp.tx == 3 && esp.baud == 9600);
  const int values[] = {900, 720, 500, 200};
  for (int i = 0; i < 4; ++i) {
    clockMs = uint32_t(i * 1000); adc = values[i]; esp.output.clear(); loop();
    CHECK(readPin == A1);
    for (int j = 0; j < 4; ++j) CHECK(outputs[10 + j] == (j == i ? HIGH : LOW));
    CHECK(!esp.output.empty() && esp.output.back() == '\n');
    uint16_t raw = 0;
    CHECK(soil::parseFrame(esp.output.c_str(), esp.output.size() - 1, raw) && raw == adc);
    const std::string sent = esp.output;
    clockMs += 999; loop(); CHECK(esp.output == sent);
  }
  std::puts("PASS: Uno sketch A1, original LED pins, cadence and serial frames");
}

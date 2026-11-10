#include <SoftwareSerial.h>
#include "soil_protocol.h"

SoftwareSerial esp(2, 3);
const uint8_t sensorPin = A1;
const uint8_t ledPins[] = {10, 11, 12, 13};
const char* const ledStates[] = {"DRY", "NEEDS_WATER", "OPTIMAL", "TOO_WET"};
soil::Periodic sampleEvery(1000);

void setup() {
  esp.begin(9600);
  for (uint8_t pin : ledPins) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
}

void loop() {
  if (!sampleEvery.due(millis())) return;
  const uint16_t raw = analogRead(sensorPin);
  const char* status = soil::statusFor(raw);
  for (uint8_t i = 0; i < 4; ++i)
    digitalWrite(ledPins[i], strcmp(status, ledStates[i]) == 0 ? HIGH : LOW);
  char frame[64];
  if (soil::formatFrame(raw, frame, sizeof frame)) esp.print(frame);
}

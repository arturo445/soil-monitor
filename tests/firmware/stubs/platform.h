#pragma once
#include <stdint.h>
#include <string>
#include <map>
#include <deque>
#include <cstdio>
#include <cstdlib>
static uint32_t clockMs = 0;
inline uint32_t millis() { return clockMs; }
inline void yield() {}
static int adc = 720;
static int readPin = -1;
static std::map<int, int> outputs;
const int A1 = 15, OUTPUT = 1, HIGH = 1, LOW = 0;
inline int analogRead(int pin) { readPin = pin; return adc; }
inline void pinMode(int, int) {}
inline void digitalWrite(int pin, int value) { outputs[pin] = value; }
struct DebugSerial {
  std::string output;
  void begin(int) {}
  void print(const char* text) { output += text; }
  void println(const char* text) { output += std::string(text) + "\n"; }
};
static DebugSerial Serial;
#define CHECK(condition) do { if (!(condition)) {   std::fprintf(stderr, "FAIL sketch line %d: %s\n", __LINE__, #condition); std::exit(1); } } while (0)

#pragma once
#include "platform.h"
class SoftwareSerial {
 public:
  int rx, tx, baud = 0;
  std::string output;
  std::deque<char> input;
  SoftwareSerial(int r, int t) : rx(r), tx(t) {}
  void begin(int speed) { baud = speed; }
  void print(const char* text) { output += text; }
  int available() { return int(input.size()); }
  int read() { if (input.empty()) return -1; char c = input.front(); input.pop_front(); return uint8_t(c); }
};

#ifndef SOIL_PROTOCOL_H
#define SOIL_PROTOCOL_H
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
namespace soil {
inline const char* statusFor(uint16_t raw) {
  return raw >= 800 ? "DRY" : raw >= 650 ? "NEEDS_WATER" :
         raw >= 400 ? "OPTIMAL" : "TOO_WET";
}
inline bool formatFrame(uint16_t raw, char* out, size_t capacity) {
  if (raw > 1023 || capacity == 0) return false;
  const int n = snprintf(out, capacity, "SM1,%u,%s", unsigned(raw), statusFor(raw));
  if (n < 0 || size_t(n) + 5 > capacity) return false;
  uint8_t checksum = 0;
  for (int i = 0; i < n; ++i) checksum ^= uint8_t(out[i]);
  snprintf(out + n, capacity - size_t(n), "*%02X\n", unsigned(checksum));
  return true;
}
inline bool parseFrame(const char* line, size_t length, uint16_t& raw) {
  if (length < 8 || length > 63 || memcmp(line, "SM1,", 4) != 0) return false;
  size_t end = 4;
  uint16_t value = 0;
  while (end < length && line[end] >= '0' && line[end] <= '9') {
    if (end >= 8) return false;
    value = uint16_t(value * 10 + (line[end++] - '0'));
  }
  if (end == 4 || end == length || line[end] != ',' || value > 1023) return false;
  if (line[4] == '0' && end != 5) return false;
  char expected[64];
  if (!formatFrame(value, expected, sizeof expected)) return false;
  if (length != strlen(expected) - 1 || memcmp(line, expected, length) != 0) return false;
  raw = value;
  return true;
}
class Periodic {
 public:
  explicit Periodic(uint32_t interval) : interval_(interval) {}
  bool due(uint32_t now) {
    if (started_ && uint32_t(now - lastMs_) < interval_) return false;
    started_ = true;
    lastMs_ = now;
    return true;
  }
 private:
  uint32_t interval_;
  uint32_t lastMs_ = 0;
  bool started_ = false;
};
}
#endif

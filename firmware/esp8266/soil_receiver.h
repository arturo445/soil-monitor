#ifndef SOIL_RECEIVER_H
#define SOIL_RECEIVER_H
#include "soil_protocol.h"
namespace soil {
class Receiver {
 public:
  uint16_t rawValue = 0;
  uint32_t lastReadingMs = 0;
  uint32_t invalidFrames = 0;
  bool connected(uint32_t now) const {
    return hasReading_ && uint32_t(now - lastReadingMs) <= 5000;
  }
  void tick(uint32_t now) {
    // Expiry is latched so a full millis cycle cannot make old data current again.
    if (hasReading_ && uint32_t(now - lastReadingMs) > 5000) hasReading_ = false;
    if (length_ && !discarding_ && uint32_t(now - startedMs_) >= 250) reject();
  }
  void feed(char c, uint32_t now) {
    tick(now);
    if (discarding_) {
      if (c == '\n') discarding_ = false;
      return;
    }
    if (c != '\n') {
      if (length_ == 63 || (length_ && buffer_[length_ - 1] == '\r') ||
          (c != '\r' && (uint8_t(c) < 32 || uint8_t(c) > 126))) {
        reject();
        return;
      }
      if (!length_) startedMs_ = now;
      buffer_[length_++] = c;
      return;
    }
    size_t size = length_;
    if (size && buffer_[size - 1] == '\r') --size;
    uint16_t value;
    if (parseFrame(buffer_, size, value)) {
      rawValue = value;
      lastReadingMs = now;
      hasReading_ = true;
    } else {
      ++invalidFrames;
    }
    length_ = 0;
  }
 private:
  void reject() {
    ++invalidFrames;
    length_ = 0;
    discarding_ = true;
  }
  bool discarding_ = false;
  uint32_t startedMs_ = 0;
  bool hasReading_ = false;
  char buffer_[64];
  uint8_t length_ = 0;
};
template<class Stream>
size_t drainSerial(Stream& stream, Receiver& receiver, uint32_t now) {
  receiver.tick(now);
  size_t count = 0;
  while (count < 64 && stream.available()) {
    const int byte = stream.read();
    if (byte < 0) break;
    receiver.feed(char(byte), now);
    ++count;
  }
  return count;
}
}
#endif

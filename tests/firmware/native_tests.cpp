#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
#include <string>
#include "../../firmware/arduino-uno/soil_protocol.h"
#include "../../firmware/esp8266/soil_receiver.h"
#include "../../firmware/esp8266/soil_http.h"

static void feed(soil::Receiver& rx, const char* text, uint32_t now) {
  while (*text) rx.feed(*text++, now);
}

static unsigned checks = 0;
#define CHECK(condition) do { ++checks; if (!(condition)) { \
  std::fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #condition); \
  std::exit(1); } } while (0)

int main() {
  CHECK(std::strcmp(soil::statusFor(0), "TOO_WET") == 0);
  CHECK(std::strcmp(soil::statusFor(399), "TOO_WET") == 0);
  CHECK(std::strcmp(soil::statusFor(400), "OPTIMAL") == 0);
  CHECK(std::strcmp(soil::statusFor(649), "OPTIMAL") == 0);
  CHECK(std::strcmp(soil::statusFor(650), "NEEDS_WATER") == 0);
  CHECK(std::strcmp(soil::statusFor(799), "NEEDS_WATER") == 0);
  CHECK(std::strcmp(soil::statusFor(800), "DRY") == 0);
  CHECK(std::strcmp(soil::statusFor(1023), "DRY") == 0);
  char frame[64];
  CHECK(soil::formatFrame(720, frame, sizeof frame));
  CHECK(std::strcmp(frame, "SM1,720,NEEDS_WATER*49\n") == 0);
  CHECK(soil::formatFrame(0, frame, sizeof frame));
  CHECK(std::strcmp(frame, "SM1,0,TOO_WET*52\n") == 0);
  CHECK(soil::formatFrame(1023, frame, sizeof frame));
  CHECK(std::strcmp(frame, "SM1,1023,DRY*60\n") == 0);
  CHECK(!soil::formatFrame(1024, frame, sizeof frame));
  CHECK(!soil::formatFrame(720, frame, 8));
  uint16_t decoded = 999;
  CHECK(soil::parseFrame("SM1,720,NEEDS_WATER*49", 22, decoded));
  CHECK(decoded == 720);
  for (uint16_t raw = 0; raw <= 1023; ++raw) {
    CHECK(soil::formatFrame(raw, frame, sizeof frame));
    CHECK(soil::parseFrame(frame, std::strlen(frame) - 1, decoded));
    CHECK(decoded == raw);
    frame[std::strlen(frame) - 2] = '!';
    CHECK(!soil::parseFrame(frame, std::strlen(frame) - 1, decoded));
  }
  const char* invalid[] = {
    "SM1,720,NEEDS_WATER*48", "SM2,720,NEEDS_WATER*4A",
    "SM1,+720,NEEDS_WATER*62", "SM1,0720,NEEDS_WATER*79",
    "SM1,1024,DRY*67", "SM1,720,DRY*55", "SM1,,DRY*65",
    "SM1,8,TOO_WET*5a", "SM1,720,NEEDS_WATER*49extra",
    "SM1, 720,NEEDS_WATER*69", "SM1,65536,TOO_WET*51", "SM1,00,TOO_WET*62",
    "SM1,720,NEEDS_WATER*49\r", "", "720", "SM1,-1,TOO_WET*7E"
  };
  for (const char* bad : invalid)
    CHECK(!soil::parseFrame(bad, std::strlen(bad), decoded));
  soil::Receiver rx;
  CHECK(!rx.connected(0));
  feed(rx, "SM1,720,NEEDS_WATER*49\n", 100);
  CHECK(rx.connected(100));
  CHECK(rx.rawValue == 720 && rx.lastReadingMs == 100);
  CHECK(rx.connected(5100));
  CHECK(!rx.connected(5101));
  feed(rx, "SM1,0,TOO_WET*52\r\n", 5200);
  CHECK(rx.connected(5200) && rx.rawValue == 0);
  feed(rx, "SM1,720,NEEDS_WATER*48\n", 5300);
  CHECK(rx.rawValue == 0 && rx.lastReadingMs == 5200);
  CHECK(rx.invalidFrames == 1);
  feed(rx, "SM1,1023,DRY*60\n", UINT32_MAX - 50);
  CHECK(rx.connected(49));
  CHECK(uint32_t(49 - rx.lastReadingMs) == 100);
  CHECK(!rx.connected(5000));
  soil::Receiver partial;
  feed(partial, "SM1,720,", 10);
  partial.tick(259);
  CHECK(partial.invalidFrames == 0);
  partial.tick(260);
  CHECK(partial.invalidFrames == 1);
  feed(partial, "NEEDS_WATER*49\n", 261);
  CHECK(!partial.connected(261) && partial.invalidFrames == 1);
  feed(partial, "SM1,720,NEEDS_WATER*49\n", 262);
  CHECK(partial.connected(262));
  feed(partial, "SM1,", UINT32_MAX - 10);
  partial.tick(239);
  CHECK(partial.invalidFrames == 2);
  feed(partial, "SM1,720,NEEDS_WATER*49\n", 240);
  CHECK(partial.lastReadingMs == 262);
  feed(partial, "SM1,0,TOO_WET*52\n", 241);
  CHECK(partial.lastReadingMs == 241);

  soil::Receiver noisy;
  for (int i = 0; i < 64; ++i) noisy.feed('x', 0);
  CHECK(noisy.invalidFrames == 1);
  feed(noisy, "SM1,720,NEEDS_WATER*49\n", 1);
  CHECK(!noisy.connected(1) && noisy.invalidFrames == 1);
  feed(noisy, "SM1,720,NEEDS_WATER*49\n", 2);
  CHECK(noisy.connected(2));
  noisy.feed('\0', 3);
  CHECK(noisy.invalidFrames == 2);
  feed(noisy, "SM1,0,TOO_WET*52\n", 3);
  CHECK(noisy.lastReadingMs == 2 && noisy.invalidFrames == 2);
  feed(noisy, "SM1,0,TOO_WET*52\rX\n", 4);
  CHECK(noisy.invalidFrames == 3 && noisy.lastReadingMs == 2);
  feed(noisy, "SM1,0,TOO_WET*52\r\n", 5);
  CHECK(noisy.lastReadingMs == 5);
  feed(noisy, "SM1,", 1000);
  feed(noisy, "720,", 1200);
  feed(noisy, "NEEDS_WATER*49\n", 1250);
  CHECK(noisy.lastReadingMs == 5 && noisy.invalidFrames == 4);
  soil::Periodic sample(1000);
  CHECK(sample.due(0));
  CHECK(!sample.due(999));
  CHECK(sample.due(1000));
  CHECK(!sample.due(1000));
  CHECK(sample.due(9999));
  CHECK(!sample.due(10000));
  soil::Periodic retry(10000);
  CHECK(retry.due(UINT32_MAX - 100));
  CHECK(!retry.due(9898));
  CHECK(retry.due(9899));
  struct ByteStream {
    size_t position = 0;
    int available() const { return position < 200; }
    int read() { ++position; return 'x'; }
  } stream;
  soil::Receiver flood;
  CHECK(soil::drainSerial(stream, flood, 0) == 64);
  CHECK(stream.position == 64 && stream.available());
  CHECK(soil::drainSerial(stream, flood, 0) == 64);
  CHECK(soil::drainSerial(stream, flood, 0) == 64);
  CHECK(soil::drainSerial(stream, flood, 0) == 8);
  CHECK(soil::drainSerial(stream, flood, 250) == 0);
  CHECK(flood.invalidFrames == 1);
  soil::Receiver api;
  soil::HttpReply reply;
  soil::makeReply("/api/humidity", soil::Get, api, 125640, true, reply);
  CHECK(reply.code == 503);
  CHECK(std::strcmp(reply.body, "{\"rawValue\":null,\"status\":null,\"connected\":false,\"lastReadingMs\":null,\"readingAgeMs\":null,\"uptimeMs\":125640,\"error\":{\"code\":\"SERIAL_UNAVAILABLE\",\"message\":\"Sin lecturas seriales recientes\"}}") == 0);
  feed(api, "SM1,720,NEEDS_WATER*49\n", 125400);
  soil::makeReply("/api/humidity", soil::Get, api, 125640, true, reply);
  CHECK(reply.code == 200);
  CHECK(std::strcmp(reply.body, "{\"rawValue\":720,\"status\":\"NEEDS_WATER\",\"connected\":true,\"lastReadingMs\":125400,\"readingAgeMs\":240,\"uptimeMs\":125640}") == 0);
  soil::makeReply("/api/humidity", soil::Get, api, 130400, true, reply);
  CHECK(reply.code == 200);
  soil::makeReply("/api/humidity", soil::Get, api, 130401, true, reply);
  CHECK(reply.code == 503 && std::strstr(reply.body, "\"rawValue\":null"));
  soil::makeReply("/api/health", soil::Get, api, 140000, true, reply);
  CHECK(reply.code == 200);
  CHECK(std::strcmp(reply.body, "{\"status\":\"ok\",\"connected\":false,\"uptimeMs\":140000,\"wifiConnected\":true,\"invalidFrames\":0}") == 0);
  feed(api, "bad\n", 140001);
  soil::makeReply("/api/health", soil::Get, api, 140002, false, reply);
  CHECK(std::strstr(reply.body, "\"wifiConnected\":false,\"invalidFrames\":1"));
  soil::makeReply("/missing", soil::Get, api, 0, true, reply);
  CHECK(reply.code == 404);
  CHECK(std::strcmp(reply.body, "{\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"Ruta no encontrada\"}}") == 0);
  soil::makeReply("/api/humidity", soil::Other, api, 0, true, reply);
  CHECK(reply.code == 405 && reply.allow);
  CHECK(std::strstr(reply.body, "METHOD_NOT_ALLOWED"));
  soil::makeReply("/api/health", soil::Other, api, 0, true, reply);
  CHECK(reply.code == 405 && reply.allow);
  soil::makeReply("/api/humidity", soil::Options, api, 0, true, reply);
  CHECK(reply.code == 204 && reply.body[0] == '\0' && !reply.allow);
  soil::makeReply("/missing", soil::Options, api, 0, true, reply);
  CHECK(reply.code == 204 && reply.body[0] == '\0');
  feed(api, "SM1,0,TOO_WET*52\n", UINT32_MAX - 50);
  soil::makeReply("/api/humidity", soil::Get, api, 49, true, reply);
  CHECK(std::strstr(reply.body, "\"lastReadingMs\":4294967245,\"readingAgeMs\":100,\"uptimeMs\":49"));
  struct FakeServer {
    int code = 0;
    std::string contentType, body;
    std::map<std::string, std::string> headers;
    void sendHeader(const char* key, const char* value) { headers[key] = value; }
    void send(int status, const char* type, const char* text) {
      code = status; contentType = type; body = text;
    }
  };
  for (soil::Method method : {soil::Get, soil::Other, soil::Options}) {
    FakeServer server;
    soil::makeReply("/api/humidity", method, api, 49, true, reply);
    soil::sendReply(server, reply);
    CHECK(server.code == reply.code && server.body == reply.body);
    CHECK(server.contentType == "application/json");
    CHECK(server.headers["Access-Control-Allow-Origin"] == "*");
    CHECK(server.headers["Access-Control-Allow-Methods"] == "GET, OPTIONS");
    CHECK(server.headers["Cache-Control"] == "no-store");
    CHECK(server.headers.count("Access-Control-Allow-Credentials") == 0);
    CHECK((server.headers.count("Allow") != 0) == reply.allow);
    if (reply.allow) CHECK(server.headers["Allow"] == "GET, OPTIONS");
  }
  soil::Receiver atZero;
  feed(atZero, "SM1,0,TOO_WET*52\n", 0);
  CHECK(atZero.connected(0) && atZero.lastReadingMs == 0);
  soil::Receiver maxLine;
  for (int i = 0; i < 63; ++i) maxLine.feed('x', 0);
  CHECK(maxLine.invalidFrames == 0);
  maxLine.feed('\n', 1);
  CHECK(maxLine.invalidFrames == 1);
  for (int c = 0; c <= 255; ++c) {
    if (c == '\n' || c == '\r' || (c >= 32 && c <= 126)) continue;
    soil::Receiver control;
    control.feed(char(c), 0);
    CHECK(control.invalidFrames == 1);
    feed(control, "SM1,0,TOO_WET*52\n", 1);
    CHECK(!control.connected(1) && control.invalidFrames == 1);
    feed(control, "SM1,0,TOO_WET*52\n", 2);
    CHECK(control.connected(2));
  }
  soil::Receiver expired;
  feed(expired, "SM1,720,NEEDS_WATER*49\n", 100);
  expired.tick(5101);
  CHECK(!expired.connected(5101));
  CHECK(!expired.connected(100)); // A full millis cycle must not revive an expired reading.
  std::printf("PASS: %u checks (1024 ADC roundtrips, receiver, scheduling, budget, HTTP JSON/routes/headers)\n", checks);
}

#ifndef SOIL_HTTP_H
#define SOIL_HTTP_H
#include "soil_receiver.h"
namespace soil {
enum Method { Get, Options, Other };
struct HttpReply {
  int code = 0;
  bool allow = false;
  char body[320] = {};
};
inline void makeReply(const char* path, Method method, const Receiver& rx,
                      uint32_t now, bool wifi, HttpReply& reply) {
  reply.allow = false;
  reply.body[0] = '\0';
  if (method == Options) {
    reply.code = 204;
    return;
  }
  const bool humidity = strcmp(path, "/api/humidity") == 0;
  const bool health = strcmp(path, "/api/health") == 0;
  if (!humidity && !health) {
    reply.code = 404;
    strcpy(reply.body, "{\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"Ruta no encontrada\"}}");
  } else if (method != Get) {
    reply.code = 405;
    reply.allow = true;
    strcpy(reply.body, "{\"error\":{\"code\":\"METHOD_NOT_ALLOWED\",\"message\":\"Metodo no permitido\"}}");
  } else if (health) {
    reply.code = 200;
    snprintf(reply.body, sizeof reply.body,
      "{\"status\":\"ok\",\"connected\":%s,\"uptimeMs\":%lu,\"wifiConnected\":%s,\"invalidFrames\":%lu}",
      rx.connected(now) ? "true" : "false", (unsigned long)now,
      wifi ? "true" : "false", (unsigned long)rx.invalidFrames);
  } else if (!rx.connected(now)) {
    reply.code = 503;
    snprintf(reply.body, sizeof reply.body,
      "{\"rawValue\":null,\"status\":null,\"connected\":false,\"lastReadingMs\":null,\"readingAgeMs\":null,\"uptimeMs\":%lu,"
      "\"error\":{\"code\":\"SERIAL_UNAVAILABLE\",\"message\":\"Sin lecturas seriales recientes\"}}",
      (unsigned long)now);
  } else {
    reply.code = 200;
    snprintf(reply.body, sizeof reply.body,
      "{\"rawValue\":%u,\"status\":\"%s\",\"connected\":true,\"lastReadingMs\":%lu,\"readingAgeMs\":%lu,\"uptimeMs\":%lu}",
      unsigned(rx.rawValue), statusFor(rx.rawValue), (unsigned long)rx.lastReadingMs,
      (unsigned long)uint32_t(now - rx.lastReadingMs), (unsigned long)now);
  }
}
template<class Server>
void sendReply(Server& server, const HttpReply& reply) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Cache-Control", "no-store");
  if (reply.allow) server.sendHeader("Allow", "GET, OPTIONS");
  server.send(reply.code, "application/json", reply.body);
}
}
#endif

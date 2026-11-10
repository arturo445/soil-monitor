import { classifyHumidity } from '../utils/humidity'

const isMillis = value => Number.isInteger(value) && value >= 0 && value <= 0xffffffff
const apiError = (code, message) => Object.assign(new Error(message), { code })

export function getDeviceUrl(value = import.meta.env.VITE_ESP8266_URL) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error()
    return url.origin
  } catch {
    throw apiError('CONFIG_ERROR', 'Configura VITE_ESP8266_URL con la dirección HTTP del ESP8266 en frontend/.env y reinicia el frontend.')
  }
}

export function validateReading(data) {
  try {
    if (!data || data.connected !== true || classifyHumidity(data.rawValue) !== data.status ||
      !isMillis(data.lastReadingMs) || !isMillis(data.uptimeMs) || !isMillis(data.readingAgeMs) ||
      data.readingAgeMs > 5000 || ((data.uptimeMs - data.lastReadingMs) >>> 0) !== data.readingAgeMs) throw new Error()
    return { rawValue: data.rawValue, status: data.status, connected: true, lastReadingMs: data.lastReadingMs,
      readingAgeMs: data.readingAgeMs, uptimeMs: data.uptimeMs }
  } catch {
    throw apiError('INVALID_RESPONSE', 'El ESP8266 devolvió una lectura inválida o antigua. Comprueba que ambos firmwares estén actualizados.')
  }
}

export async function fetchHumidity(baseUrl, { signal } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
  signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 1800)
  try {
    const response = await fetch(`${baseUrl}/api/humidity`, {
      signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' },
    })
    let data
    try { data = await response.json() } catch {
      if (response.ok) throw apiError('INVALID_RESPONSE', 'El dispositivo no respondió con JSON válido. Revisa la dirección y el firmware.')
    }
    if (response.status === 503 && data?.connected === false && data.rawValue === null && data.status === null &&
      data.lastReadingMs === null && data.readingAgeMs === null && isMillis(data.uptimeMs) && data.error?.code === 'SERIAL_UNAVAILABLE') {
      throw apiError('SERIAL_UNAVAILABLE', 'El ESP8266 responde, pero no recibe lecturas recientes del Arduino. Revisa el enlace serial y la alimentación.')
    }
    if (!response.ok) throw apiError('HTTP_ERROR', `El ESP8266 respondió HTTP ${response.status}. Comprueba la dirección y la API del firmware.`)
    return validateReading(data)
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
    if (timedOut) throw apiError('TIMEOUT', 'El ESP8266 tarda demasiado en responder. Revisa su alimentación y conexión Wi-Fi; se reintentará automáticamente.')
    if (error.code) throw error
    throw apiError('NETWORK_ERROR', 'No se puede contactar al ESP8266. Revisa su IP, la red Wi-Fi, CORS y los permisos de red local del navegador.')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

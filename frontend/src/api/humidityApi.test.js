import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHumidity, getDeviceUrl, validateReading } from './humidityApi'

const reading = { rawValue: 720, status: 'NEEDS_WATER', connected: true, lastReadingMs: 1000, readingAgeMs: 200, uptimeMs: 1200 }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('contrato HTTP', () => {
  it('acepta lectura real válida y millis=0', () => {
    expect(validateReading(reading)).toEqual(reading)
    expect(validateReading({ ...reading, lastReadingMs: 0, readingAgeMs: 1200 })).toBeTruthy()
  })
  it.each([
    { rawValue: '720' }, { rawValue: 1024 }, { rawValue: 2.5 }, { status: 'DRY' }, { connected: false },
    { readingAgeMs: 5001 }, { lastReadingMs: -1 }, { uptimeMs: null }, { readingAgeMs: 1 },
  ])('rechaza contrato inconsistente %j', change => {
    expect(() => validateReading({ ...reading, ...change })).toThrow()
  })
  it('acepta rollover uint32', () => {
    expect(validateReading({ ...reading, lastReadingMs: 4294967290, uptimeMs: 10, readingAgeMs: 16 })).toBeTruthy()
  })
  it('valida configuración sin ruta ni credenciales', () => {
    expect(getDeviceUrl('http://192.168.1.50/')).toBe('http://192.168.1.50')
    for (const value of ['', 'foo', 'http://user:secret@host', 'http://host/api', 'https://host', 'http://host?x=1']) {
      expect(() => getDeviceUrl(value)).toThrow()
    }
  })
  it('consulta sin caché y valida JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(response(reading)); vi.stubGlobal('fetch', fetch)
    expect(await fetchHumidity('http://esp.local')).toEqual(reading)
    expect(fetch).toHaveBeenCalledWith('http://esp.local/api/humidity', expect.objectContaining({ cache: 'no-store', credentials: 'omit' }))
  })
  it('distingue ESP accesible de enlace serial perdido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ rawValue: null, status: null, connected: false,
      lastReadingMs: null, readingAgeMs: null, uptimeMs: 10000,
      error: { code: 'SERIAL_UNAVAILABLE', message: 'Sin lecturas' } }, 503)))
    await expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'SERIAL_UNAVAILABLE' })
  })
  it('no confunde cualquier 503 con fallo serial', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 503)))
    await expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'HTTP_ERROR' })
  })
  it.each([404, 405, 500])('rechaza HTTP %i', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, status)))
    await expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'HTTP_ERROR' })
  })
  it('mantiene el error HTTP aunque el servidor devuelva HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>', { status: 500 })))
    await expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'HTTP_ERROR' })
  })
  it('rechaza JSON malformado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{malformed', { status: 200 })))
    await expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
  it('traduce fallo de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
  it('cancela por timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })))
    const pending = expect(fetchHumidity('http://esp.local')).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(1800)
    await pending
  })
  it('propaga cancelación del consumidor', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(fetchHumidity('http://esp.local', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
})

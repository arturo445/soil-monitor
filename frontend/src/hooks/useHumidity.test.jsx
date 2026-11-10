import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useHumidity } from './useHumidity'

const data = (time = 1000) => ({ rawValue: 720, status: 'NEEDS_WATER', connected: true, lastReadingMs: time, readingAgeMs: 200, uptimeMs: time + 200 })
const ok = (time = 1000) => new Response(JSON.stringify(data(time)), { status: 200 })
const unavailable = () => new Response(JSON.stringify({ rawValue: null, status: null, connected: false,
  lastReadingMs: null, readingAgeMs: null, uptimeMs: 10000, error: { code: 'SERIAL_UNAVAILABLE' } }), { status: 503 })
const advance = async ms => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const render = () => renderHook(() => useHumidity({ baseUrl: 'http://esp.local' }))
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T12:00:00Z')) })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('comienza sin datos y consulta cada dos segundos', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(ok()))
  vi.stubGlobal('fetch', fetch)
  const { result } = render()
  expect(result.current.reading).toBeNull()
  await advance(0)
  expect(result.current.connection).toBe('online')
  expect(result.current.history).toHaveLength(1)
  expect(result.current.updatedAt).toBe(Date.now() - 200)
  await advance(1999); expect(fetch).toHaveBeenCalledTimes(1)
  await advance(1); expect(fetch).toHaveBeenCalledTimes(2)
  expect(result.current.history).toHaveLength(1)
})
it('anula la lectura actual al perder el serial y se recupera sin recargar', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(ok(3000)))
  const { result } = render(); await advance(0); await advance(2000)
  expect(result.current.reading).toBeNull()
  expect(result.current.connection).toBe('serial-offline')
  expect(result.current.history.at(-1).rawValue).toBeNull()
  await advance(2000)
  expect(result.current.connection).toBe('online')
  expect(result.current.history.at(-1).rawValue).toBe(720)
})
it('limita el historial a 120 y reinicia si el ESP reinicia', async () => {
  let time = 0
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(ok(time += 2000))))
  const { result } = render(); await advance(0); await advance(250000)
  expect(result.current.history).toHaveLength(120)
  globalThis.fetch.mockResolvedValueOnce(ok(0)); await advance(2000)
  expect(result.current.history).toHaveLength(1)
})
it('no solapa solicitudes pendientes; cancela en timeout y en desmontaje', async () => {
  const signals = []
  const fetch = vi.fn((_url, { signal }) => { signals.push(signal); return new Promise(() => {}) })
  vi.stubGlobal('fetch', fetch)
  const { unmount } = render(); await advance(6000)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(signals[0].aborted).toBe(true)
  unmount(); await advance(6000)
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('aborta solicitud activa y limpia polling al desmontar', async () => {
  let signal
  vi.stubGlobal('fetch', vi.fn((_url, options) => { signal = options.signal; return new Promise(() => {}) }))
  const { unmount } = render(); await advance(0); unmount()
  expect(signal.aborted).toBe(true)
  await advance(10000); expect(globalThis.fetch).toHaveBeenCalledTimes(1)
})
it('reporta red caída y recupera en el siguiente ciclo', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(ok()))
  const { result } = render(); await advance(0)
  expect(result.current.connection).toBe('offline')
  expect(result.current.reading).toBeNull()
  await advance(2000); expect(result.current.connection).toBe('online')
})
it('no consulta una configuración ausente', async () => {
  vi.stubGlobal('fetch', vi.fn())
  const { result } = renderHook(() => useHumidity({ baseUrl: '' })); await advance(0); await advance(10000)
  expect(result.current.connection).toBe('config-error')
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

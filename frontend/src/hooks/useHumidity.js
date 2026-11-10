import { useEffect, useState } from 'react'
import { fetchHumidity, getDeviceUrl } from '../api/humidityApi'

export function useHumidity({ baseUrl = import.meta.env.VITE_ESP8266_URL } = {}) {
  const [state, setState] = useState({ reading: null, history: [], connection: 'loading', error: null, updatedAt: null })

  useEffect(() => {
    let active = true
    let running = false
    let request
    let history = []
    let previous = null
    let gap = false
    let configured = true

    async function poll() {
      if (running || !configured) return
      running = true
      request = new AbortController()
      // Keep all state writes asynchronous, including configuration failures.
      await Promise.resolve()
      try {
        const url = getDeviceUrl(baseUrl)
        const reading = await fetchHumidity(url, { signal: request.signal })
        if (!active) return
        const updatedAt = Date.now() - reading.readingAgeMs
        if (previous && reading.uptimeMs < previous.uptimeMs) history = []
        const fresh = !previous || reading.uptimeMs < previous.uptimeMs ||
          previous.lastReadingMs !== reading.lastReadingMs || previous.rawValue !== reading.rawValue
        if (fresh) history = [...history, { ...reading, timestamp: updatedAt }].slice(-120)
        previous = reading
        gap = false
        setState({ reading, history, connection: 'online', error: null, updatedAt })
      } catch (error) {
        if (!active || error.name === 'AbortError') return
        if (history.length && !gap) {
          history = [...history, { timestamp: Date.now(), rawValue: null }].slice(-120)
          gap = true
        }
        configured = error.code !== 'CONFIG_ERROR'
        const connection = !configured ? 'config-error' : error.code === 'SERIAL_UNAVAILABLE' ? 'serial-offline' :
          ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code) ? 'offline' : 'error'
        setState({ reading: null, history, connection, error: error.message, updatedAt: null })
      } finally {
        running = false
      }
    }

    void poll()
    const interval = setInterval(() => { void poll() }, 2000)
    return () => {
      active = false
      clearInterval(interval)
      request?.abort()
    }
  }, [baseUrl])

  return state
}

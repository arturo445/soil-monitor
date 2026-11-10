import { describe, expect, it } from 'vitest'
import { classifyHumidity, HUMIDITY_STATES } from './humidity'

describe('umbrales ADC sin calibrar', () => {
  it.each([[0, 'TOO_WET'], [399, 'TOO_WET'], [400, 'OPTIMAL'], [649, 'OPTIMAL'],
    [650, 'NEEDS_WATER'], [799, 'NEEDS_WATER'], [800, 'DRY'], [1023, 'DRY']])('%i corresponde a %s', (raw, status) => {
    expect(classifyHumidity(raw)).toBe(status)
    expect(HUMIDITY_STATES[status].label).toBeTruthy()
  })
  it.each([-1, 1024, 0.5, NaN, null, '720', undefined])('rechaza ADC inválido %s', raw => {
    expect(() => classifyHumidity(raw)).toThrow()
  })
})

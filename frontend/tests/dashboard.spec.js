import { expect, test } from '@playwright/test'

const endpoint = 'http://192.168.1.50/api/humidity'
const payload = (rawValue = 720, status = 'NEEDS_WATER') => ({ rawValue, status, connected: true,
  lastReadingMs: 1000, readingAgeMs: 200, uptimeMs: 1200 })

test('dashboard real renderiza lectura, leyenda y gráfico sin desbordar', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.route(endpoint, route => route.fulfill({ json: payload() }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Humedad del suelo', exact: true })).toBeVisible()
  await expect(page.getByTestId('raw-value')).toHaveText('720')
  await expect(page.getByTestId('current-status')).toHaveText('Necesita agua')
  await expect(page.getByText('ESP8266 disponible', { exact: true })).toBeVisible()
  await expect(page.getByText('Serial reciente', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lecturas recientes' })).toBeVisible()
  await expect(page.locator('.recharts-surface').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/dashboard-${test.info().project.name}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('no muestra lecturas viejas al perder serial y recupera automáticamente', async ({ page }) => {
  let mode = 'ok'
  await page.route(endpoint, route => mode === 'ok' ? route.fulfill({ json: payload() }) : route.fulfill({ status: 503,
    json: { rawValue: null, status: null, connected: false, lastReadingMs: null, readingAgeMs: null, uptimeMs: 10000,
      error: { code: 'SERIAL_UNAVAILABLE', message: 'Sin lecturas seriales recientes' } } }))
  await page.goto('/'); await expect(page.getByTestId('raw-value')).toHaveText('720')
  mode = 'serial'
  await expect(page.getByRole('alert')).toContainText('no recibe lecturas recientes')
  await expect(page.getByTestId('raw-value')).toHaveText('—')
  await expect(page.getByText('ESP8266 disponible', { exact: true })).toBeVisible()
  mode = 'ok'; await expect(page.getByTestId('raw-value')).toHaveText('720')
})

test('red caída presenta recuperación y ausencia de datos, nunca mediciones ficticias', async ({ page }) => {
  await page.route(endpoint, route => route.abort())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('No se puede contactar')
  await expect(page.getByTestId('raw-value')).toHaveText('—')
  await expect(page.getByText('Aún no hay lecturas en esta sesión.')).toBeVisible()
  await expect(page.getByText('ESP8266 sin respuesta', { exact: true })).toBeVisible()
})

test('los cuatro estados mantienen su interpretación y no son porcentajes', async ({ page }) => {
  for (const [raw, status, label] of [[900, 'DRY', 'Suelo seco'], [720, 'NEEDS_WATER', 'Necesita agua'],
    [500, 'OPTIMAL', 'Humedad adecuada'], [200, 'TOO_WET', 'Exceso de agua']]) {
    await page.route(endpoint, route => route.fulfill({ json: payload(raw, status) }))
    await page.goto('/')
    await expect(page.getByTestId('current-status')).toHaveText(label)
    await expect(page.getByTestId('raw-value')).toHaveText(String(raw))
    await expect(page.getByText('ADC sin calibrar · no es un porcentaje')).toBeVisible()
    await page.unroute(endpoint)
  }
})

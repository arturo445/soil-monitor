import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import HumidityCard from './HumidityCard'

afterEach(cleanup)
it('sin medición válida no muestra el dato anterior ni un porcentaje', () => {
  render(<HumidityCard reading={null} updatedAt={null} />)
  expect(screen.getByTestId('raw-value').textContent).toBe('—')
  expect(screen.getByTestId('current-status').textContent).toBe('Sin lectura actual')
})
it('presenta ADC y estado con explicación de calibración', () => {
  render(<HumidityCard reading={{ rawValue: 720, status: 'NEEDS_WATER' }} updatedAt={1767268800000} />)
  expect(screen.getByTestId('raw-value').textContent).toBe('720')
  expect(screen.getByTestId('current-status').textContent).toBe('Necesita agua')
  expect(screen.getByText('ADC sin calibrar · no es un porcentaje')).toBeTruthy()
  expect(screen.getByText(/Hora estimada/)).toBeTruthy()
})

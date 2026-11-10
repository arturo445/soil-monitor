export const HUMIDITY_STATES = {
  DRY: { label: 'Suelo seco', color: '#ae3027', range: '800–1023', advice: 'La lectura indica suelo seco. Revisa el riego.' },
  NEEDS_WATER: { label: 'Necesita agua', color: '#855900', range: '650–799', advice: 'La lectura está en el rango que requiere agua.' },
  OPTIMAL: { label: 'Humedad adecuada', color: '#256148', range: '400–649', advice: 'La lectura está dentro del rango de referencia adecuado.' },
  TOO_WET: { label: 'Exceso de agua', color: '#175f9b', range: '0–399', advice: 'La lectura indica suelo muy húmedo. Revisa el drenaje.' },
}

export function classifyHumidity(raw) {
  if (!Number.isInteger(raw) || raw < 0 || raw > 1023) throw new Error('Valor ADC inválido')
  return raw >= 800 ? 'DRY' : raw >= 650 ? 'NEEDS_WATER' : raw >= 400 ? 'OPTIMAL' : 'TOO_WET'
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp)
}

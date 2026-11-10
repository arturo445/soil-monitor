import StatusIndicator from './StatusIndicator'
import { formatTime, HUMIDITY_STATES } from '../utils/humidity'

export default function HumidityCard({ reading, updatedAt }) {
  const state = HUMIDITY_STATES[reading?.status]
  return <section className="reading-panel" aria-labelledby="reading-title">
    <h2 id="reading-title">Lectura actual</h2>
    <div className="reading-value" style={{ color: state?.color }}>
      <span data-testid="raw-value">{reading?.rawValue ?? '—'}</span><span className="reading-unit">ADC</span>
    </div>
    <StatusIndicator status={reading?.status} />
    <p className="reading-advice">{state?.advice ?? 'Esperando una medición válida del dispositivo.'}</p>
    <div className="adc-scale" aria-hidden="true"><span /><span /><span /><span /></div>
    <div className="scale-labels" aria-hidden="true"><span>0 · Más húmedo</span><span>1023 · Más seco</span></div>
    <p className="calibration-note">ADC sin calibrar · no es un porcentaje</p>
    <p className="updated-time">{updatedAt !== null ? <>
      Hora estimada: <time dateTime={new Date(updatedAt).toISOString()}>{formatTime(updatedAt)}</time>
      <span>Según el reloj de este navegador.</span>
    </> : 'Sin actualización válida por ahora.'}</p>
  </section>
}

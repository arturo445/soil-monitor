import Header from '../components/Header'
import HumidityCard from '../components/HumidityCard'
import { lazy, Suspense } from 'react'

const HumidityChart = lazy(() => import('../components/HumidityChart'))
import ConnectionStatus from '../components/ConnectionStatus'
import { useHumidity } from '../hooks/useHumidity'
import { HUMIDITY_STATES } from '../utils/humidity'

export default function Dashboard() {
  const { reading, history, connection, error, updatedAt } = useHumidity()
  return <>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <Header />
    <main id="main" className="dashboard">
      <div className="page-heading"><div><h1>Humedad del suelo</h1><p>Una lectura clara de lo que pasa bajo la superficie.</p></div>
        <span className="monitor-label">Solo monitoreo</span>
      </div>
      <div className="feedback" aria-live="polite" aria-atomic="true">
        {connection === 'loading' && <p className="loading-message" role="status">Conectando con el dispositivo… No se mostrarán datos hasta recibir una lectura válida.</p>}
        {error && <p className="error-message" role="alert">{error}{connection !== 'config-error' && ' La consulta se repetirá cada 2 segundos.'}</p>}
      </div>
      <div className="live-layout"><HumidityCard reading={reading} updatedAt={updatedAt} /><ConnectionStatus connection={connection} /></div>
      <Suspense fallback={<p className="loading-message" role="status">Cargando historial…</p>}><HumidityChart history={history} /></Suspense>
      <section className="reference-section" aria-labelledby="reference-title">
        <h2 id="reference-title">Cómo interpretar la lectura</h2>
        <ul className="reference-list">{Object.entries(HUMIDITY_STATES).reverse().map(([key, state]) => <li key={key}>
          <span className="reference-dot" style={{ backgroundColor: state.color }} aria-hidden="true" />
          <span><strong>{state.label}</strong><span>{state.range} ADC</span></span>
        </li>)}</ul>
        <p>Umbrales iniciales de referencia. Calibra el sensor con tu suelo antes de tomar decisiones de riego.</p>
      </section>
    </main>
    <footer className="site-footer"><span>Soil Monitor</span><span>Datos locales. Sin almacenamiento permanente.</span></footer>
  </>
}

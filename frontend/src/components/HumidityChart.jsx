import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatTime, HUMIDITY_STATES } from '../utils/humidity'

export default function HumidityChart({ history }) {
  const readings = history.filter(item => item.rawValue !== null)
  return <section className="history-panel" aria-labelledby="history-title">
    <div className="section-heading"><div><h2 id="history-title">Lecturas recientes</h2><p>Solo esta sesión · hasta 120 muestras · ADC</p></div>
      <span className="sample-count">{readings.length} {readings.length === 1 ? 'muestra' : 'muestras'}</span>
    </div>
    {readings.length ? <>
      <figure className="chart-figure" aria-label="Gráfico de lecturas ADC recientes, escala de 0 a 1023">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 260 }}>
            <LineChart data={history} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
              <CartesianGrid stroke="#e6e9e0" vertical={false} />
              <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} minTickGap={42} tickLine={false} axisLine={false} tick={{ fill: '#526359', fontSize: 12 }} />
              <YAxis domain={[0, 1023]} ticks={[0, 400, 650, 800, 1023]} tickLine={false} axisLine={false} tick={{ fill: '#526359', fontSize: 12 }} />
              <Tooltip labelFormatter={formatTime} formatter={value => [value, 'Lectura ADC']} contentStyle={{ borderRadius: 8, borderColor: '#d7dfd3' }} />
              <Line dataKey="rawValue" type="linear" stroke="#256148" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <figcaption>Menor ADC indica más humedad según los umbrales originales. Los cortes de conexión dejan huecos.</figcaption>
      </figure>
      <details className="history-table"><summary>Ver {readings.length === 1 ? 'la última lectura' : `las últimas ${Math.min(readings.length, 10)} lecturas`} como tabla</summary>
        <div className="table-scroll"><table><caption className="sr-only">Alternativa textual al gráfico; horas estimadas del navegador.</caption>
          <thead><tr><th scope="col">Hora estimada</th><th scope="col">ADC</th><th scope="col">Estado</th></tr></thead>
          <tbody>{readings.slice(-10).reverse().map((item, index) => <tr key={`${item.timestamp}-${index}`}>
            <td>{formatTime(item.timestamp)}</td><td>{item.rawValue}</td><td>{HUMIDITY_STATES[item.status].label}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </> : <div className="chart-empty"><svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
      <path d="M4 4v34h56M12 28l12-9 12 5 17-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg><p>Aún no hay lecturas en esta sesión.</p><span>El gráfico aparecerá al recibir datos válidos del Arduino.</span></div>}
  </section>
}

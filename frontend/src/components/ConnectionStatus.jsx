const messages = {
  loading: ['Comprobando conexión', 'Esperando primera respuesta'],
  online: ['ESP8266 disponible', 'Serial reciente'],
  'serial-offline': ['ESP8266 disponible', 'Serial sin lecturas recientes'],
  offline: ['ESP8266 sin respuesta', 'Serial no verificable'],
  'config-error': ['Falta configurar el dispositivo', 'Serial no verificable'],
  error: ['Respuesta no válida', 'Serial no verificable'],
}

export default function ConnectionStatus({ connection }) {
  const [device, serial] = messages[connection] ?? messages.error
  const online = connection === 'online'
  const reachable = online || connection === 'serial-offline'
  return <section className="connection-panel" aria-labelledby="connection-title">
    <h2 id="connection-title">Ruta de la medición</h2>
    <ol className="connection-path">
      <li><span className="path-node" aria-hidden="true" /><div><h3>Sensor de suelo</h3><p>A1 · Entrada analógica</p></div></li>
      <li data-active={online}><span className="path-node" aria-hidden="true" /><div><h3>Arduino Uno</h3><p>{serial}</p></div></li>
      <li data-active={reachable}><span className="path-node" aria-hidden="true" /><div><h3>ESP8266</h3><p>{device}</p></div></li>
      <li data-active="true"><span className="path-node" aria-hidden="true" /><div><h3>Este navegador</h3><p>Consulta automática cada 2 s</p></div></li>
    </ol>
    <p className="connection-note">La conexión confirma mensajes recientes, no la integridad física del sensor.</p>
  </section>
}

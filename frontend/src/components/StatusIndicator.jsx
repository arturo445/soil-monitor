import { HUMIDITY_STATES } from '../utils/humidity'

export default function StatusIndicator({ status }) {
  const state = HUMIDITY_STATES[status]
  return <span className="status-indicator" style={{ color: state?.color }}>
    <span className="status-dot" aria-hidden="true" />
    <span data-testid="current-status">{state?.label ?? 'Sin lectura actual'}</span>
  </span>
}

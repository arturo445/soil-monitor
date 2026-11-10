export default function Header() {
  return <header className="site-header">
    <div className="header-inner">
      <a className="brand" href="#main" aria-label="Soil Monitor, ir al panel">
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path d="M10 29C8 13 23 8 32 9c0 16-7 23-22 20Zm1 2 16-17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Soil <strong>Monitor</strong></span>
      </a>
      <span className="local-label">Red local <span aria-hidden="true">/</span> Sin nube</span>
    </div>
  </header>
}

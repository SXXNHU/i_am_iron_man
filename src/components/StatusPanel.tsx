type StatusItem = {
  label: string
  value: string
}

type StatusPanelProps = {
  items: StatusItem[]
  error: string
}

export function StatusPanel({ items, error }: StatusPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Status</h2>
        <span className={error ? 'badge badge-error' : 'badge'}>Live</span>
      </div>
      <div className="status-grid">
        {items.map((item) => (
          <article key={item.label} className="status-tile">
            <span className="status-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
      <div className="error-log">
        <span className="status-label">Error Logs</span>
        <p>{error || 'No critical errors logged.'}</p>
      </div>
    </section>
  )
}

export default function ChartPanel({ title, subtitle, children }) {
  return (
    <section className="chart-panel">
      <header className="chart-panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="chart-panel__content">{children}</div>
    </section>
  )
}

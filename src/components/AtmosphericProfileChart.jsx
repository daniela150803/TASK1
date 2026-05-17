import { useEffect, useRef } from 'react'
import { select } from 'd3-selection'

const WIDTH = 860
const HEIGHT = 520

export default function AtmosphericProfileChart() {
  const chartRef = useRef(null)

  useEffect(() => {
    const svg = select(chartRef.current)
    svg.selectAll('*').remove()

    svg
      .append('text')
      .attr('x', WIDTH / 2)
      .attr('y', HEIGHT / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', 14)
      .text('Aquí va el perfil de temperatura atmosférica (D3)')
  }, [])

  return (
    <svg
      ref={chartRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="chart-canvas"
      aria-label="Atmospheric profile chart"
    />
  )
}

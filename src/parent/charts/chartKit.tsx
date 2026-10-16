import type { ReactNode } from 'react'

/** Single-series chart colour: passes the dataviz lightness, chroma and contrast checks on the white panel. */
export const SERIES = '#199e70'
export const INK = '#24292f'
export const MUTED = '#57606a'
export const GRID = '#e8e8e8'

/** Clean y-axis ticks (steps of 1, 2 or 5 × 10ⁿ) covering at least `min`. */
export function niceTicks(maxValue: number, min = 5, count = 4): number[] {
  const top = Math.max(min, maxValue)
  const raw = top / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw)!
  const ticks: number[] = []
  for (let v = 0; v < top + step; v += step) ticks.push(v)
  return ticks
}

/** Every chart has a table twin, so no value is only reachable by hovering. */
export function TableView({ caption, head, rows }: { caption: string; head: [string, string]; rows: [string, string][] }) {
  return (
    <details className="no-print" style={{ marginTop: 4 }}>
      <summary className="muted" style={{ fontSize: 14, cursor: 'pointer' }}>Show as a table</summary>
      <table style={{ fontVariantNumeric: 'tabular-nums' }}>
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th>{head[0]}</th><th>{head[1]}</th></tr></thead>
        <tbody>{rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
      </table>
    </details>
  )
}

/** Hover/focus readout: the value leads, the label follows. */
export function Tooltip({ leftPct, children }: { leftPct: number; children: ReactNode }) {
  return (
    <div role="status" style={{
      position: 'absolute', top: 0, left: `${leftPct}%`, transform: `translateX(${leftPct > 70 ? '-100%' : leftPct < 30 ? '0' : '-50%'})`,
      background: '#fff', border: '1px solid #d0d7de', borderRadius: 8, padding: '4px 10px', fontSize: 13, color: INK,
      boxShadow: '0 2px 8px rgba(0,0,0,.08)', pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>{children}</div>
  )
}

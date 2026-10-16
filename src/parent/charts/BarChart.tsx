import { useState } from 'react'
import { GRID, INK, MUTED, SERIES, TableView, Tooltip } from './chartKit'

/** Column path: 4px rounded data end, square at the baseline. */
function column(x: number, w: number, top: number, base: number): string {
  const r = Math.min(4, w / 2, base - top)
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`
}

/** One series of proportions (0–1) by period. Weeks with no data show a muted dash, never a zero bar. */
export function BarChart({ title, points, unit = '%' }: { title: string; points: { label: string; value: number | null; detail?: string }[]; unit?: string }) {
  const W = 560, H = 210, P = { l: 36, r: 12, t: 12, b: 28 }
  const [active, setActive] = useState<number | null>(null)
  const band = (W - P.l - P.r) / points.length
  const bw = Math.min(24, band * 0.6)
  const base = H - P.b
  const y = (pct: number) => base - (pct / 100) * (H - P.t - P.b)
  const fmt = (v: number | null) => (v === null ? 'no practice' : `${Math.round(v * 100)}${unit}`)
  const lastWithData = points.reduce((k, p, i) => (p.value !== null ? i : k), -1)
  const a = active === null ? null : points[active]

  return (
    <figure aria-label={title} style={{ margin: 0 }}>
      <figcaption><strong>{title}</strong></figcaption>
      <div style={{ position: 'relative', paddingTop: 30 }}>
        {a && <Tooltip leftPct={((P.l + active! * band + band / 2) / W) * 100}><strong>{fmt(a.value)}</strong> <span style={{ color: MUTED }}>week of {a.label}{a.detail ? ` · ${a.detail}` : ''}</span></Tooltip>}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title} style={{ display: 'block' }}>
          {[0, 50, 100].map(t => <line key={t} x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />)}
          {[0, 50, 100].map(t => <text key={`t${t}`} x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{t}{unit}</text>)}
          {points.map((p, i) => {
            const cx = P.l + i * band + band / 2
            const top = p.value === null ? base : y(p.value * 100)
            return (
              <g key={i} tabIndex={0} aria-label={`Week of ${p.label}: ${fmt(p.value)}`} style={{ outline: 'none' }}
                onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
                <rect x={P.l + i * band} y={P.t} width={band} height={base - P.t} fill="transparent" />
                {p.value !== null && p.value > 0 && <path d={column(cx - bw / 2, bw, top, base)} fill={SERIES} opacity={active === i ? 0.75 : 1} />}
                {p.value === null && <text x={cx} y={base - 4} textAnchor="middle" fontSize="12" fill={MUTED}>–</text>}
                {i === lastWithData && p.value !== null && <text x={cx} y={top - 6} textAnchor="middle" fontSize="13" fontWeight="600" fill={INK}>{fmt(p.value)}</text>}
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{p.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <TableView caption={title} head={['Week starting', 'First-try accuracy']} rows={points.map(p => [p.label, fmt(p.value)])} />
    </figure>
  )
}

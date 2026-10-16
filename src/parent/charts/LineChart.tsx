import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GRID, INK, MUTED, SERIES, TableView, Tooltip, niceTicks } from './chartKit'

/** One series over time: 2px line, a light wash, an end dot and end label, crosshair readout on hover or arrow keys. */
export function LineChart({ title, points }: { title: string; points: { label: string; value: number }[] }) {
  const W = 560, H = 210, P = { l: 36, r: 44, t: 12, b: 28 }
  const [active, setActive] = useState<number | null>(null)
  const ticks = niceTicks(Math.max(0, ...points.map(p => p.value)))
  const max = ticks.at(-1)!
  const step = (W - P.l - P.r) / Math.max(1, points.length - 1)
  const x = (i: number) => P.l + i * step
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  const lastI = points.length - 1
  const last = points[lastI]
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const sx = ((e.clientX - box.left) / box.width) * W
    setActive(Math.min(lastI, Math.max(0, Math.round((sx - P.l) / step))))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setActive(i => Math.max(0, (i ?? lastI) - 1))
    else if (e.key === 'ArrowRight') setActive(i => Math.min(lastI, (i ?? lastI) + 1))
  }
  const a = active === null ? null : points[active]

  return (
    <figure aria-label={title} style={{ margin: 0 }}>
      <figcaption><strong>{title}</strong></figcaption>
      <div style={{ position: 'relative', paddingTop: 30 }}>
        {a && <Tooltip leftPct={(x(active!) / W) * 100}><strong>{a.value}</strong> <span style={{ color: MUTED }}>week of {a.label}</span></Tooltip>}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${title}: now ${last?.value ?? 0}`} tabIndex={0}
          onKeyDown={onKey} onFocus={() => setActive(lastI)} onBlur={() => setActive(null)} style={{ display: 'block', outlineOffset: 2 }}>
          {ticks.map(t => <line key={t} x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />)}
          {ticks.map(t => <text key={`t${t}`} x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{t}</text>)}
          {points.length > 1 && <polygon points={`${x(0)},${y(0)} ${line} ${x(lastI)},${y(0)}`} fill={SERIES} opacity="0.1" />}
          <polyline fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={line} />
          {points.map((p, i) => (i % 2 === lastI % 2) && <text key={`l${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{p.label}</text>)}
          {active !== null && <line x1={x(active)} x2={x(active)} y1={P.t} y2={H - P.b} stroke="#8c959f" strokeWidth="1" />}
          {active !== null && active !== lastI && <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill={SERIES} stroke="#fff" strokeWidth="2" />}
          {last && <circle cx={x(lastI)} cy={y(last.value)} r="4.5" fill={SERIES} stroke="#fff" strokeWidth="2" />}
          {last && <text x={x(lastI) + 9} y={y(last.value) + 4} fontSize="13" fontWeight="600" fill={INK}>{last.value}</text>}
          <rect x={P.l - step / 2} y={P.t} width={W - P.l - P.r + step} height={H - P.t - P.b} fill="transparent"
            onPointerMove={onMove} onPointerLeave={() => setActive(null)} />
        </svg>
      </div>
      <TableView caption={title} head={['Week starting', 'Secure words']} rows={points.map(p => [p.label, String(p.value)])} />
    </figure>
  )
}

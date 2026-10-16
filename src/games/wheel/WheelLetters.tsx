import { useRef } from 'react'

export function WheelLetters({ letters, path, onStart, onEnter, onClickLetter, onRelease }: {
  letters: string[]; path: number[]
  onStart: (i: number) => void; onEnter: (i: number) => void; onClickLetter: (i: number) => void; onRelease: () => void
}) {
  const size = 300
  const r = 110
  const centre = size / 2
  const pos = (i: number) => {
    const a = (i * 2 * Math.PI) / letters.length - Math.PI / 2
    return { x: centre + r * Math.cos(a), y: centre + r * Math.sin(a) }
  }
  const dragging = useRef(false)
  const moved = useRef(false)
  return (
    <svg width={size} height={size} onPointerUp={() => { if (dragging.current && moved.current) onRelease(); dragging.current = false }}
      onPointerLeave={() => { if (dragging.current && moved.current) onRelease(); dragging.current = false }} style={{ touchAction: 'none' }}>
      <circle cx={centre} cy={centre} r={r + 40} fill="#fff" stroke="var(--line)" strokeWidth={4} />
      <polyline points={path.map(i => { const p = pos(i); return `${p.x},${p.y}` }).join(' ')} fill="none" stroke="var(--meadow)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      {letters.map((ch, i) => {
        const p = pos(i)
        const on = path.includes(i)
        return (
          <g key={i} role="button" aria-label={`letter ${ch}`} tabIndex={-1} style={{ cursor: 'pointer' }}
            onPointerDown={e => { (e.target as Element).releasePointerCapture?.(e.pointerId); dragging.current = true; moved.current = false; onStart(i) }}
            onPointerEnter={() => { if (dragging.current) { moved.current = true; onEnter(i) } }}
            onClick={() => { if (!moved.current) onClickLetter(i) }}>
            <circle cx={p.x} cy={p.y} r={34} fill={on ? 'var(--meadow)' : 'var(--soft-sun)'} />
            <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize={34} fontWeight={700} fill={on ? '#fff' : 'var(--ink)'}>{ch}</text>
          </g>
        )
      })}
    </svg>
  )
}

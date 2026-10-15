import type { LetterOp } from '../engine/diff'

export function LetterDiff({ ops }: { ops: LetterOp[] }) {
  return (
    <div className="diff" aria-live="polite">
      <div>
        <span className="muted" style={{ fontSize: 20 }}>You wrote: </span>
        {ops.map((o, i) =>
          o.kind === 'missing' ? <span key={i} className="diff-gap">_</span>
            : <span key={i} className={o.kind === 'match' ? undefined : 'diff-wrong'}>{o.typed}</span>)}
      </div>
      <div>
        <span className="muted" style={{ fontSize: 20 }}>The right way: </span>
        {ops.map((o, i) =>
          o.kind === 'extra' ? null : <span key={i} className={o.kind === 'match' ? undefined : 'diff-fix'}>{o.expected}</span>)}
      </div>
    </div>
  )
}

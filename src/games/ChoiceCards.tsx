import { useEffect, useRef, useState } from 'react'
import { useServices } from '../app/services'
import { useLater } from './useAdvance'

export function ChoiceCards({ options, answer, onFirstChoice, onSolved }: {
  options: string[]; answer: string; onFirstChoice: (choice: string, correct: boolean) => void; onSolved: () => void
}) {
  const { sfx } = useServices()
  const later = useLater()
  const [phase, setPhase] = useState<'choosing' | 'fix' | 'right'>('choosing')
  const [wrong, setWrong] = useState<string | null>(null)
  const first = useRef(true)

  const choose = (opt: string) => {
    if (phase === 'right') return
    const correct = opt === answer
    if (first.current) {
      first.current = false
      onFirstChoice(opt, correct)
    }
    if (correct) {
      setPhase('right')
      sfx.correct()
      later(onSolved)
    } else if (phase === 'choosing') {
      setWrong(opt)
      setPhase('fix')
      sfx.gentle()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) choose(options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      {phase === 'fix' && <p className="praise" style={{ color: 'var(--ink)' }}>Almost! Let's look.</p>}
      {phase === 'right' && <p className="praise">✨ That's right!</p>}
      <div className="row">
        {options.map((opt, k) => (
          <button key={opt} type="button" aria-label={`Choose ${opt}`} onClick={() => choose(opt)}
            className={`btn ghost ${phase !== 'choosing' && opt === answer ? 'diff-fix' : ''}`}
            style={{ fontSize: 34, minWidth: 200, opacity: opt === wrong ? 0.5 : 1 }}>
            <span className="muted" style={{ fontSize: 16, marginRight: 8 }} aria-hidden="true">{k + 1}</span><span data-opt>{opt}</span>
            {phase === 'fix' && opt === answer && <span style={{ fontSize: 16 }} aria-hidden="true"> ← This one!</span>}
          </button>
        ))}
      </div>
    </>
  )
}

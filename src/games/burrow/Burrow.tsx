import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { checkWord } from '../../engine/checker'
import { sayWord } from '../../speech/voice'
import { Button } from '../../ui/Button'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useLater } from '../useAdvance'
import { burrowGaps, fillGaps } from './gaps'

export function Burrow({ words, onAttempt, onDone }: GameProps) {
  const { speaker, delays, sfx } = useServices()
  const later = useLater()
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState<string[]>([])
  const [phase, setPhase] = useState<'fill' | 'fix' | 'right'>('fill')
  const reported = useRef(false)
  const word = words[i]
  useEffect(() => { if (word) void sayWord(speaker, word, delays.gap) }, [word, speaker, delays.gap])
  if (!word) return null
  const gaps = burrowGaps(word)

  const next = () => {
    reported.current = false
    setTyped([])
    setPhase('fill')
    if (i + 1 < words.length) setI(i + 1)
    else onDone()
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const assembled = fillGaps(word.text, gaps, typed)
    const r = checkWord(word, assembled)
    if (!reported.current) {
      reported.current = true
      onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: assembled })
    }
    if (r.correct) { setPhase('right'); sfx.correct(); later(next) }
    else { setPhase('fix'); setTyped([]); sfx.gentle() }
  }

  let pos = 0
  const parts = gaps.flatMap(([a, b], k) => {
    const before = word.text.slice(pos, a)
    pos = b
    return [
      <span key={`t${k}`}>{before}</span>,
      <input key={`g${k}`} className="answer-input" aria-label={`Missing letters ${k + 1}`} value={typed[k] ?? ''}
        style={{ width: `${(b - a) * 1.2 + 1}em`, padding: '4px 6px', fontSize: 'inherit' }} maxLength={b - a + 2}
        autoFocus={k === 0} autoComplete="off" spellCheck={false}
        onChange={e => setTyped(t => { const c = [...t]; c[k] = e.target.value; return c })} />,
    ]
  })

  return (
    <GameFrame title="Fill the Burrow" emoji="🕳️" done={i} total={words.length}>
      <p>Fill in the missing letters.</p>
      <Button variant="secondary" onClick={() => void sayWord(speaker, word, delays.gap)}>🔊 Hear it</Button>
      {phase === 'fix' && <><p className="praise" style={{ color: 'var(--ink)' }}>Almost! Let's look.</p><WordDisplay word={word} /></>}
      {phase === 'right' ? <p className="praise">✨ Burrow filled!</p> : (
        <form onSubmit={onSubmit} className="row">
          <span className="big-word" style={{ display: 'inline-flex', alignItems: 'center' }}>{parts}<span>{word.text.slice(pos)}</span></span>
          <Button type="submit">Check</Button>
        </form>
      )}
    </GameFrame>
  )
}

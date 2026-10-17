import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useServices } from '../../app/services'
import { hashString, makeRng } from '../../engine/rng'
import { Button } from '../../ui/Button'
import { SpeakButton } from '../../ui/SpeakButton'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useLater } from '../useAdvance'
import { useDictation } from '../useDictation'
import { scramble } from './scramble'

export function BunnyHop({ activity, words, onAttempt, onDone }: GameProps) {
  const { sfx } = useServices()
  const later = useLater()
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number[]>([])
  const [phase, setPhase] = useState<'build' | 'fix' | 'right'>('build')
  const reported = useRef(false)
  const word = words[i]
  const tiles = useMemo(() => (word ? scramble(word.text, makeRng(hashString(`${activity.id}:${word.id}`))) : []), [word, activity.id])
  const { canSpeak, peeking, replay } = useDictation(word)
  if (!word) return null
  if (canSpeak === null) return <p>Getting ready…</p>
  if (!canSpeak && peeking) {
    return <GameFrame title="Bunny Hop" emoji="🐰" done={i} total={words.length}><p>Look carefully…</p><WordDisplay word={word} /></GameFrame>
  }

  const next = () => {
    reported.current = false
    setChosen([])
    setPhase('build')
    if (i + 1 < words.length) setI(i + 1)
    else onDone()
  }
  const submit = (ids: number[]) => {
    const built = ids.map(k => tiles[k]).join('')
    const ok = built === word.text
    if (!reported.current) {
      reported.current = true
      onAttempt({ wordId: word.id, correct: ok, firstTry: true, hint: false, typed: built })
    }
    if (ok) { setPhase('right'); sfx.correct(); later(next) }
    else { setPhase('fix'); setChosen([]); sfx.gentle() }
  }
  const pick = (k: number) => {
    if (phase === 'right' || chosen.includes(k)) return
    const ids = [...chosen, k]
    setChosen(ids)
    sfx.pop()
    if (ids.length === tiles.length) submit(ids)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Backspace') { setChosen(c => c.slice(0, -1)); return }
    if (e.key.length !== 1) return
    const k = tiles.findIndex((ch, idx) => !chosen.includes(idx) && ch.toLowerCase() === e.key.toLowerCase())
    if (k >= 0) pick(k)
  }

  return (
    <GameFrame title="Bunny Hop" emoji="🐰" done={i} total={words.length}>
      <p>Hop the letters into the right order.</p>
      {canSpeak && <Button variant="secondary" onClick={replay}>🔊 Hear it</Button>}
      {phase === 'fix' && (
        <div data-testid="model">
          <p className="praise" style={{ color: 'var(--ink)' }}>Almost! Let's look.</p>
          <SpeakButton text="Almost! Let's look. Hop the letters into the right order." />
          <WordDisplay word={word} />
        </div>
      )}
      {phase === 'right' && <p className="praise">✨ Hop-tastic!</p>}
      <div className="row" aria-label="Your word" style={{ fontSize: 40, minHeight: 60 }}>
        {tiles.map((_, k) => <span key={k} style={{ borderBottom: '4px solid var(--line)', minWidth: 40, textAlign: 'center' }}>{chosen[k] !== undefined ? tiles[chosen[k]] : ' '}</span>)}
      </div>
      <div className="row" tabIndex={0} aria-label="Letter tiles" onKeyDown={onKey} autoFocus>
        {tiles.map((ch, k) => (
          <button key={k} type="button" className="btn secondary" aria-label={`tile ${ch}`} disabled={chosen.includes(k)} onClick={() => pick(k)} style={{ fontSize: 34, minWidth: 64 }}>{ch}</button>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setChosen(c => c.slice(0, -1))}>↩ Undo</Button>
    </GameFrame>
  )
}

import { useReducedMotion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { useServices } from '../../app/services'
import { hashString, makeRng, shuffle } from '../../engine/rng'
import { Button } from '../../ui/Button'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useLater } from '../useAdvance'
import { useDictation } from '../useDictation'

interface Bubble { id: number; ch: string; left: number; delay: number }
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
/** Every bubble rises at the same speed, so neighbours keep their distance. */
export const RISE_SECONDS = 11

/**
 * One lane per bubble (letters shuffled across lanes). Lanes alternate between the first and second half
 * of the rise cycle (0, ⌈n/2⌉, 1, ⌈n/2⌉+1, …), so side-by-side bubbles are always far apart vertically.
 * A negative delay starts each bubble part-way up, so the screen is never empty at the start.
 */
export function layoutBubbles(chars: readonly string[], rng: () => number): Bubble[] {
  const n = chars.length
  const lanes = shuffle([...chars.keys()], rng)
  const half = Math.ceil(n / 2)
  return chars.map((ch, id) => {
    const lane = lanes[id]
    const phase = lane % 2 === 0 ? lane / 2 : half + (lane - 1) / 2
    return { id, ch, left: ((lane + 0.5) / n) * 100, delay: -(phase / n) * RISE_SECONDS }
  })
}

export function BubblePop({ activity, words, onAttempt, onDone }: GameProps) {
  const { sfx } = useServices()
  const later = useLater()
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [k, setK] = useState(0)
  const [popped, setPopped] = useState<Set<number>>(new Set())
  const [wobble, setWobble] = useState<number | null>(null)
  const wrongTotal = useRef(0)
  const wrongHere = useRef(0)
  const hinted = useRef(false)
  const [glow, setGlow] = useState(false)
  const word = words[i]
  const letters = word ? [...word.text] : []

  const bubbles = useMemo<Bubble[]>(() => {
    if (!word) return []
    const rng = makeRng(hashString(`${activity.id}:${word.id}`))
    const decoys = shuffle([...ALPHABET].filter(c => !word.text.toLowerCase().includes(c)), rng).slice(0, 3)
    return layoutBubbles(shuffle([...word.text, ...decoys], rng), rng)
  }, [word, activity.id])
  const { canSpeak, peeking, replay } = useDictation(word)

  if (!word) return null
  if (canSpeak === null) return <p>Getting ready…</p>
  if (!canSpeak && peeking) {
    return <GameFrame title="Bubble Pop" emoji="🫧" done={i} total={words.length}><p>Look carefully…</p><WordDisplay word={word} /></GameFrame>
  }
  const needed = letters[k]?.toLowerCase()
  const glowId = glow ? bubbles.find(b => !popped.has(b.id) && b.ch.toLowerCase() === needed)?.id : undefined

  const next = () => {
    wrongTotal.current = 0; wrongHere.current = 0; hinted.current = false
    setGlow(false); setK(0); setPopped(new Set())
    if (i + 1 < words.length) setI(i + 1)
    else onDone()
  }
  const pop = (b: Bubble) => {
    if (popped.has(b.id) || k >= letters.length) return
    if (b.ch.toLowerCase() === needed) {
      sfx.pop()
      setPopped(p => new Set(p).add(b.id))
      wrongHere.current = 0
      setGlow(false)
      const nk = k + 1
      setK(nk)
      if (nk === letters.length) {
        onAttempt({ wordId: word.id, correct: wrongTotal.current === 0, firstTry: true, hint: hinted.current })
        sfx.correct()
        later(next)
      }
      return
    }
    wrongTotal.current++
    wrongHere.current++
    sfx.gentle()
    setWobble(b.id)
    if (wrongHere.current >= 3) { hinted.current = true; setGlow(true) }
  }

  return (
    <GameFrame title="Bubble Pop" emoji="🫧" done={i} total={words.length}>
      <p>Pop the letters in the right order!</p>
      {canSpeak && <Button variant="secondary" onClick={replay}>🔊 Hear it</Button>}
      <div className="row" aria-label="Letters so far" style={{ fontSize: 40 }}>
        {letters.map((ch, n) => <span key={n} style={{ minWidth: 40, textAlign: 'center', borderBottom: `4px solid ${n === k ? 'var(--meadow)' : 'var(--line)'}` }}>{n < k ? ch : ' '}</span>)}
      </div>
      <div style={{ position: 'relative', width: '100%', height: reduce ? 'auto' : 380, overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(#e8f6ff, #fff8ec)' }}
        className={reduce ? 'row' : undefined}>
        {bubbles.filter(b => !popped.has(b.id)).map(b => (
          // A plain CSS rise: the animation library's infinite repeat left some bubbles frozen.
          <div key={`${word.id}-${b.id}`} className={reduce ? undefined : 'bubble-lane'}
            style={reduce ? undefined : { left: `${b.left}%`, animationName: 'bubble-rise', animationDuration: `${RISE_SECONDS}s`, animationDelay: `${b.delay.toFixed(2)}s` }}>
            <button type="button" aria-label={`bubble ${b.ch}`} data-glow={glowId === b.id ? 'true' : 'false'}
              onClick={() => pop(b)} className={`btn ghost${wobble === b.id ? ' bubble-wobble' : ''}`}
              onAnimationEnd={() => setWobble(w => (w === b.id ? null : w))}
              style={{ width: 72, height: 72, borderRadius: '50%', fontSize: 32, background: '#fffffff2', boxShadow: glowId === b.id ? '0 0 0 6px var(--sun)' : undefined }}>
              {b.ch}
            </button>
          </div>
        ))}
      </div>
    </GameFrame>
  )
}

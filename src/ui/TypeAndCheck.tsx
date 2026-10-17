import { useRef, useState, type FormEvent } from 'react'
import { usePetMood } from '../app/petMood'
import { useServices } from '../app/services'
import type { Word } from '../content/types'
import { checkWord, type WordCheck } from '../engine/checker'
import { Button } from './Button'
import { SpeakButton } from './SpeakButton'
import { LetterDiff } from './LetterDiff'

export type Feedback = 'full' | 'neutral' | 'pretest'
export interface FirstResult { correct: boolean; typed: string; capitalOnly: boolean }

const PRAISE = ['Brilliant!', 'Super spelling!', 'You got it!', 'Fantastic!', 'Paw-some!']
type Phase = 'answering' | 'correcting' | 'praise' | 'neutral' | 'known' | 'learn'

export function TypeAndCheck({ word, feedback = 'full', onFirstResult, onFinished, label = 'Your spelling' }: {
  word: Word
  feedback?: Feedback
  onFirstResult: (r: FirstResult) => void
  onFinished: () => void
  label?: string
}) {
  const { sfx, delays } = useServices()
  const setMood = usePetMood(s => s.setMood)
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState<Phase>('answering')
  const [check, setCheck] = useState<WordCheck | null>(null)
  const [nudge, setNudge] = useState('')
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)])
  const submitted = useRef(false)
  const finished = useRef(false)

  const finish = () => {
    if (finished.current) return
    finished.current = true
    onFinished()
  }
  const finishSoon = () => (delays.feedback > 0 ? setTimeout(finish, delays.feedback) : finish())

  const submitFirst = () => {
    if (submitted.current) return
    if (!value.trim()) { setNudge('Have a go! Type the word.'); return }
    submitted.current = true
    const r = checkWord(word, value)
    setCheck(r)
    onFirstResult({ correct: r.correct, typed: r.typed, capitalOnly: r.capitalOnly })
    if (feedback === 'neutral') { setPhase('neutral'); sfx.pop(); finishSoon(); return }
    if (r.correct) { setPhase(feedback === 'pretest' ? 'known' : 'praise'); sfx.correct(); setMood('happy', 1500); finishSoon(); return }
    if (feedback === 'pretest') { setPhase('learn'); sfx.gentle(); finishSoon(); return }
    setPhase('correcting')
    setValue('')
    setNudge('')
    sfx.gentle()
    setMood('encourage', 1500)
  }

  const submitCorrection = () => {
    if (finished.current) return
    if (checkWord(word, value).correct) { setPhase('praise'); sfx.correct(); finishSoon() }
    else setNudge('Nearly! Copy the right way, letter by letter.')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'answering') submitFirst()
    else if (phase === 'correcting') submitCorrection()
  }

  if (phase === 'praise') return <p className="praise">✨ {praise}</p>
  if (phase === 'neutral') return <p className="praise">💎 Treasure found!</p>
  if (phase === 'known') return <p className="praise">🌟 Wow, you already know it!</p>
  if (phase === 'learn') return <p className="praise">Let's learn this one together!</p>

  const correcting = phase === 'correcting'
  return (
    <form onSubmit={onSubmit} className="card" style={{ boxShadow: 'none', padding: 0 }}>
      {correcting && check && (
        <>
          <p className="praise" style={{ color: 'var(--ink)' }}>Almost! Let's look.</p>
          {check.capitalOnly && <p>Remember the capital letter at the start!</p>}
          <LetterDiff ops={check.ops} />
          <p>Type it the right way:</p>
          <SpeakButton text="Almost! Let's look. Type it the right way." />
        </>
      )}
      <input
        className="answer-input"
        aria-label={correcting ? 'Type it the right way' : label}
        value={value}
        onChange={e => { setValue(e.target.value); setNudge('') }}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <Button type="submit">Check</Button>
      <p className="nudge" aria-live="polite">{nudge}</p>
    </form>
  )
}

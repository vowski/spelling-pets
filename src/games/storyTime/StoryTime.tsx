import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { wordId } from '../../content/parse'
import { checkSentence, type SentenceCheck } from '../../engine/checker'
import { useSpeechAvailable } from '../../speech/useSpeech'
import { Button } from '../../ui/Button'
import { GameFrame } from '../GameFrame'
import type { GameProps, StoryOutcome } from '../types'
import { splitPhrases } from './phrases'

export function StoryTime({ activity, onAttempt, onDone }: GameProps) {
  const { bank, speaker, delays, sfx } = useServices()
  const canSpeak = useSpeechAvailable()
  const sentences = (activity.sentenceIds ?? []).map(id => bank.sentences.find(s => s.id === id)).filter(s => s !== undefined)
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [check, setCheck] = useState<SentenceCheck | null>(null)
  const [peeking, setPeeking] = useState(true)
  const [praise, setPraise] = useState(false)
  const [nudge, setNudge] = useState('')
  // Bumped by "Look again" (no voice) to show the sentence once more.
  const [peekRound, setPeekRound] = useState(0)
  const results = useRef<StoryOutcome[]>([])
  const submitted = useRef(false)
  const sentence = sentences[i]
  const isCs = (token: string) => bank.words.get(wordId(token))?.caseSensitive ?? false

  useEffect(() => {
    if (!sentence || canSpeak === null) return
    if (canSpeak) { setPeeking(false); void speaker.speak(sentence.text); return }
    setPeeking(true)
    const t = setTimeout(() => setPeeking(false), delays.peek)
    return () => clearTimeout(t)
  }, [sentence, canSpeak, speaker, delays.peek, peekRound])

  useEffect(() => { if (!sentences.length) onDone({ storyResults: [] }) }, [sentences.length, onDone])
  if (!sentence || canSpeak === null) return <p>Getting ready…</p>

  const next = () => {
    submitted.current = false
    setCheck(null)
    setValue('')
    setPraise(false)
    setNudge('')
    if (i + 1 < sentences.length) setI(i + 1)
    else onDone({ storyResults: results.current })
  }
  const later = (fn: () => void) => (delays.feedback > 0 ? setTimeout(fn, delays.feedback) : fn())

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    if (!submitted.current) {
      submitted.current = true
      const r = checkSentence(sentence.text, value, isCs)
      for (const id of sentence.wordIds) {
        const w = bank.words.get(id)!
        const hit = r.words.find(x => x.expected.toLowerCase() === w.text.toLowerCase())
        onAttempt({ wordId: id, correct: hit?.correct ?? false, firstTry: true, hint: false, typed: hit?.typed ?? '' })
      }
      results.current.push({ wordAccuracy: r.wordAccuracy, punctuationOk: r.startsWithCapital && r.endsWithPunctuation, perfect: r.allCorrect })
      if (r.allCorrect) { setPraise(true); sfx.correct(); later(next); return }
      setCheck(r)
      setValue('')
      sfx.gentle()
      return
    }
    if (checkSentence(sentence.text, value, isCs).allCorrect) { setPraise(true); sfx.correct(); later(next) }
    else { setNudge('Nearly! Copy the sentence carefully, word by word.'); sfx.gentle() }
  }

  const phrases = splitPhrases(sentence.text)
  return (
    <GameFrame title="Story Time" emoji="📖" done={i} total={sentences.length}>
      {canSpeak && (
        <div className="row">
          <Button variant="secondary" onClick={() => void speaker.speak(sentence.text)}>🔊 Whole sentence</Button>
          {phrases.length > 1 && phrases.map((p, k) => <Button key={k} variant="ghost" onClick={() => void speaker.speak(p)}>🔊 Part {k + 1}</Button>)}
        </div>
      )}
      {!canSpeak && peeking && <><p>Look carefully…</p><p className="big-word" style={{ fontSize: 36 }}>{sentence.text}</p></>}
      {!canSpeak && !peeking && !check && !praise && <Button variant="secondary" onClick={() => setPeekRound(n => n + 1)}>👀 Look again</Button>}
      {praise ? <p className="praise">✨ Perfect sentence!</p> : !peeking && (
        <form onSubmit={onSubmit} className="card" style={{ boxShadow: 'none', padding: 0 }}>
          {check && (
            <>
              <p className="praise" style={{ color: 'var(--ink)' }}>Almost! Let's look.</p>
              <ul>
                {check.words.filter(w => !w.correct).map((w, k) => <li key={k}>{w.typed === null ? `(missing) → ${w.expected}` : `${w.typed} → ${w.expected}`}</li>)}
                <li>Capital letter at the start: {check.startsWithCapital ? '✓' : 'Remember it!'}</li>
                <li>Full stop at the end: {check.endsWithPunctuation ? '✓' : 'Remember it!'}</li>
              </ul>
              <p className="big-word" style={{ fontSize: 34 }}>{sentence.text}</p>
            </>
          )}
          <input className="answer-input" style={{ width: 'min(820px, 100%)', fontSize: 30 }}
            aria-label={check ? 'Type it the right way' : 'Type the sentence'} value={value} onChange={e => { setValue(e.target.value); setNudge('') }}
            autoFocus autoComplete="off" autoCorrect="off" spellCheck={false} />
          <Button type="submit">Check</Button>
          <p className="nudge" aria-live="polite">{nudge}</p>
        </form>
      )}
    </GameFrame>
  )
}

import { useState } from 'react'
import { Button } from '../../ui/Button'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useDictation } from '../useDictation'

export function UnitCheck({ words, onAttempt, onDone }: GameProps) {
  const [i, setI] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const word = words[i]
  const { canSpeak, peeking, replay } = useDictation(i < words.length ? word : undefined)
  const finished = results.length >= words.length && i >= words.length
  if (finished) {
    const allRight = results.every(Boolean)
    return (
      <GameFrame title="Quick Check" emoji="⭐" done={words.length} total={words.length}>
        <p className="praise">{allRight ? 'You already know this pattern! ⭐' : "Let's learn this pattern together."}</p>
        <Button size="big" onClick={() => onDone({ unitCheckResults: results })}>Continue</Button>
      </GameFrame>
    )
  }
  if (!word || canSpeak === null) return <p>Getting ready…</p>
  return (
    <GameFrame title="Quick Check" emoji="⭐" done={i} total={words.length}>
      <p>Let's see what you already know!</p>
      {canSpeak && <Button variant="secondary" onClick={replay}>🔊 Hear it again</Button>}
      {!canSpeak && peeking && <><p>Look carefully…</p><WordDisplay word={word} /></>}
      {!peeking && (
        <TypeAndCheck key={`${word.id}-${i}`} word={word}
          onFirstResult={r => { setResults(rs => [...rs, r.correct]); onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed }) }}
          onFinished={() => setI(i + 1)} />
      )}
    </GameFrame>
  )
}

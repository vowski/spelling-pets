import { useState } from 'react'
import { Button } from '../../ui/Button'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { WordDisplay } from '../../ui/WordDisplay'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useDictation } from '../useDictation'

export function TreasureHunt({ words, onAttempt, onDone }: GameProps) {
  const [i, setI] = useState(0)
  const [found, setFound] = useState(0)
  const word = words[i]
  const { canSpeak, peeking, replay } = useDictation(word)
  if (!word) return null
  if (canSpeak === null) return <p>Getting ready…</p>
  return (
    <GameFrame title="Treasure Hunt" emoji="💎" done={i} total={words.length}>
      <div aria-label={`${found} of ${words.length} treasures found`} style={{ fontSize: 34 }}>
        {words.map((_, k) => (k < found ? '💎' : '🪨')).join(' ')}
      </div>
      <p>Type each word you hear. Every word digs up treasure!</p>
      {canSpeak && <Button variant="secondary" onClick={replay}>🔊 Hear it again</Button>}
      {!canSpeak && peeking && <><p>Look carefully…</p><WordDisplay word={word} /></>}
      {!peeking && (
        <TypeAndCheck key={`${word.id}-${i}`} word={word} feedback="neutral"
          onFirstResult={r => { setFound(f => f + 1); onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed }) }}
          onFinished={() => (i + 1 < words.length ? setI(i + 1) : onDone())} />
      )}
    </GameFrame>
  )
}

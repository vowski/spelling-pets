import { useEffect, useMemo, useState } from 'react'
import { useServices } from '../../app/services'
import { wordId } from '../../content/parse'
import { hashString, makeRng, shuffle } from '../../engine/rng'
import { Button } from '../../ui/Button'
import { TypeAndCheck } from '../../ui/TypeAndCheck'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'

export function WordBuilder({ activity, onAttempt, onDone }: GameProps) {
  const { bank, speaker } = useServices()
  const unit = activity.unitId ? bank.unitById.get(activity.unitId) : undefined
  const pairs = useMemo(() => (unit?.game.kind === 'builder' ? shuffle(unit.game.pairs, makeRng(hashString(activity.id))).slice(0, 8) : []), [unit, activity.id])
  const [i, setI] = useState(0)
  const [showRule, setShowRule] = useState(false)
  useEffect(() => { if (!pairs.length) onDone() }, [pairs.length, onDone])
  const pair = pairs[i]
  const word = pair ? bank.words.get(wordId(pair.word)) : undefined
  if (!pair || !word) return null

  return (
    <GameFrame title="Word Builder" emoji="🧱" done={i} total={pairs.length}>
      <div className="row big-word" aria-label="Word parts" style={{ fontSize: 40 }}>
        {pair.parts.map((p, k) => (
          <span key={k}>{k > 0 && <span className="muted"> + </span>}<span className="tricky" style={{ padding: '0 10px' }}>{p}</span></span>
        ))}
        <span className="muted"> = ?</span>
      </div>
      <div className="row">
        <Button variant="secondary" onClick={() => void speaker.speak(word.text)}>🔊 Hear the new word</Button>
        <Button variant="ghost" onClick={() => setShowRule(s => !s)}>{showRule ? 'Hide the rule' : 'Show the rule'}</Button>
      </div>
      {showRule && <p>{unit!.rule}</p>}
      <TypeAndCheck key={`${pair.word}-${i}`} word={word}
        onFirstResult={r => onAttempt({ wordId: word.id, correct: r.correct, firstTry: true, hint: false, typed: r.typed })}
        onFinished={() => (i + 1 < pairs.length ? setI(i + 1) : onDone())} />
    </GameFrame>
  )
}

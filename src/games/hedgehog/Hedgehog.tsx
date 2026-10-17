import { useEffect, useMemo, useState } from 'react'
import { useServices } from '../../app/services'
import { wordId } from '../../content/parse'
import { hashString, makeRng, shuffle } from '../../engine/rng'
import { Button } from '../../ui/Button'
import { ChoiceCards } from '../ChoiceCards'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'

export function Hedgehog({ activity, onAttempt, onDone }: GameProps) {
  const { bank, speaker } = useServices()
  const unit = activity.unitId ? bank.unitById.get(activity.unitId) : undefined
  const items = useMemo(() => (unit?.game.kind === 'homophone' ? shuffle(unit.game.items, makeRng(hashString(activity.id))).slice(0, 8) : []), [unit, activity.id])
  const [i, setI] = useState(0)
  const item = items[i]
  const full = item ? item.sentence.replace('___', item.answer) : ''

  useEffect(() => { if (!items.length) onDone() }, [items.length, onDone])
  useEffect(() => { if (full) void speaker.speak(full) }, [full, speaker])
  if (!item) return null

  return (
    <GameFrame title="Homophone Hedgehog" emoji="🦔" done={i} total={items.length}>
      <p className="big-word" style={{ fontSize: 36 }} data-testid="gap-sentence">{item.sentence}</p>
      <Button variant="secondary" onClick={() => void speaker.speak(full)}>🔊 Hear the sentence</Button>
      <ChoiceCards key={`${i}-${item.sentence}`} options={shuffle(item.options, makeRng(hashString(item.sentence)))} answer={item.answer}
        onFirstChoice={(_choice, correct) => onAttempt({ wordId: wordId(item.answer), correct, firstTry: true, hint: false })}
        onSolved={() => (i + 1 < items.length ? setI(i + 1) : onDone())} />
    </GameFrame>
  )
}

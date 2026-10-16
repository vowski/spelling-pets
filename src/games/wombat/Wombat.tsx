import { useEffect, useMemo, useRef, useState } from 'react'
import { useServices } from '../../app/services'
import { isRejectedDistractor } from '../../content/dictionary'
import { makeDistractors } from '../../engine/misspell'
import { hashString, makeRng, shuffle } from '../../engine/rng'
import { sayWord } from '../../speech/voice'
import { Button } from '../../ui/Button'
import { ChoiceCards } from '../ChoiceCards'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'

export function Wombat({ activity, words, onAttempt, onDone }: GameProps) {
  const { repo, speaker, delays } = useServices()
  const [history, setHistory] = useState<Map<string, string[]> | null>(null)
  const [i, setI] = useState(0)
  const word = words[i]

  useEffect(() => {
    void repo.db.progress.bulkGet(words.map(w => w.id)).then(rows => {
      setHistory(new Map(rows.filter(r => r !== undefined).map(r => [r.wordId, Object.entries(r.misspellings).sort((a, b) => b[1] - a[1]).map(([t]) => t)])))
    })
  }, [repo, words])

  const options = useMemo(() => {
    if (!word || !history) return []
    const rng = makeRng(hashString(`${activity.id}:${word.id}`))
    const d = makeDistractors(word.text, { history: history.get(word.id) ?? [], reject: isRejectedDistractor, rng, count: 3 })
    return shuffle([word.text, ...d], rng)
  }, [word, history, activity.id])

  const next = () => (i + 1 < words.length ? setI(i + 1) : onDone())
  const skipped = useRef<string | null>(null)

  useEffect(() => { if (word) void sayWord(speaker, word, delays.gap) }, [word, speaker, delays.gap])
  useEffect(() => {
    if (history && word && options.length < 2 && skipped.current !== word.id) { skipped.current = word.id; next() }
  })

  if (!word || !history || options.length < 2) return <p>Getting ready…</p>
  return (
    <GameFrame title="Which Way Wombat?" emoji="🐾" done={i} total={words.length}>
      <p>Which one is spelt the right way?</p>
      <Button variant="secondary" onClick={() => void sayWord(speaker, word, delays.gap)}>🔊 Hear it again</Button>
      <ChoiceCards key={word.id} options={options} answer={word.text}
        onFirstChoice={(choice, correct) => onAttempt({ wordId: word.id, correct, firstTry: true, hint: false, typed: choice })}
        onSolved={next} />
    </GameFrame>
  )
}

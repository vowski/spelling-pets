import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useServices } from '../../app/services'
import { wordId } from '../../content/parse'
import { hashString, makeRng, shuffle } from '../../engine/rng'
import { SpeakButton } from '../../ui/SpeakButton'
import { GameFrame } from '../GameFrame'
import type { GameProps } from '../types'
import { useLater } from '../useAdvance'

const PEN_ANIMALS = ['🐑', '🐄', '🐖', '🐐']
interface Card { text: string; bucket: string }

function Draggable({ id, children, onClick, selected }: { id: string; children: ReactNode; onClick: () => void; selected: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  return (
    <button ref={setNodeRef} type="button" aria-label={`card ${id}`} onClick={onClick} {...listeners} {...attributes}
      className="btn ghost" style={{ fontSize: 28, borderColor: selected ? 'var(--meadow)' : undefined, borderWidth: 3, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}>
      {children}
    </button>
  )
}

function Pen({ id, label, emoji, glow, onClick, children }: { id: string; label: string; emoji: string; glow: boolean; onClick: () => void; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="card" style={{ width: 220, minHeight: 200, background: glow || isOver ? 'var(--soft-sun)' : undefined }}>
      <button type="button" className="btn ghost" aria-label={`pen ${label}`} onClick={onClick} style={{ fontSize: 24 }}>{emoji} {label}</button>
      <div className="row" style={{ gap: 6 }}>{children}</div>
    </div>
  )
}

export function SortPen({ activity, onAttempt, onDone }: GameProps) {
  const { bank, speaker, sfx } = useServices()
  const later = useLater()
  const unit = activity.unitId ? bank.unitById.get(activity.unitId) : undefined
  const buckets = unit?.game.kind === 'sort' ? unit.game.buckets : []
  const cards = useMemo<Card[]>(() => {
    const rng = makeRng(hashString(activity.id))
    const per = Math.max(2, Math.floor(12 / Math.max(1, buckets.length)))
    return shuffle(buckets.flatMap(b => shuffle(b.words, rng).slice(0, per).map(text => ({ text, bucket: b.id }))), rng)
  }, [buckets, activity.id])
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [hint, setHint] = useState<{ text: string; bucket: string } | null>(null)
  const reported = useRef(new Set<string>())
  const done = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { if (!buckets.length && !done.current) { done.current = true; onDone() } }, [buckets.length, onDone])
  useEffect(() => {
    if (cards.length && Object.keys(placed).length === cards.length && !done.current) { done.current = true; later(onDone) }
  }, [placed, cards.length, later, onDone])
  if (!buckets.length) return null

  const place = (text: string, bucketId: string) => {
    const card = cards.find(c => c.text === text)
    if (!card || placed[text]) return
    const ok = card.bucket === bucketId
    if (!reported.current.has(text)) {
      reported.current.add(text)
      const id = wordId(text)
      if (bank.words.has(id)) onAttempt({ wordId: id, correct: ok, firstTry: true, hint: false }) // a pen choice is not her spelling
    }
    setSelected(null)
    if (ok) { setPlaced(p => ({ ...p, [text]: bucketId })); setHint(null); sfx.correct() }
    else { setHint({ text, bucket: card.bucket }); sfx.gentle() }
  }
  const onDragEnd = (e: DragEndEvent) => { if (e.over) place(String(e.active.id), String(e.over.id)) }
  const allSorted = Object.keys(placed).length === cards.length

  return (
    <GameFrame title="Sort the Pen" emoji="🐑" done={Object.keys(placed).length} total={cards.length}>
      <p>{unit!.rule}</p>
      <SpeakButton text={unit!.rule} label="Read the rule" />
      {hint && <p className="praise" style={{ color: 'var(--ink)' }}>Almost! <strong>{hint.text}</strong> goes in the <strong>{buckets.find(b => b.id === hint.bucket)?.label}</strong> pen.</p>}
      {allSorted && <p className="praise">✨ All sorted!</p>}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="row">
          {cards.filter(c => !placed[c.text]).map(c => (
            <Draggable key={c.text} id={c.text} selected={selected === c.text} onClick={() => { setSelected(c.text); void speaker.speak(c.text) }}>{c.text}</Draggable>
          ))}
        </div>
        <div className="row" style={{ alignItems: 'stretch' }}>
          {buckets.map((b, k) => (
            <Pen key={b.id} id={b.id} label={b.label} emoji={PEN_ANIMALS[k % PEN_ANIMALS.length]} glow={hint?.bucket === b.id} onClick={() => selected && place(selected, b.id)}>
              {cards.filter(c => placed[c.text] === b.id).map(c => <span key={c.text} className="diff-fix" style={{ padding: '2px 8px' }}>{c.text}</span>)}
            </Pen>
          ))}
        </div>
      </DndContext>
    </GameFrame>
  )
}

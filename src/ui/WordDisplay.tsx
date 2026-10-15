import { Fragment } from 'react'
import type { Word } from '../content/types'

export function WordDisplay({ word, syllables = false, className = 'big-word' }: { word: Pick<Word, 'text' | 'syllables' | 'tricky'>; syllables?: boolean; className?: string }) {
  const boundaries = new Set<number>()
  let pos = 0
  word.syllables.slice(0, -1).forEach(s => { pos += s.length; boundaries.add(pos) })
  const tricky = (i: number) => word.tricky.some(([a, b]) => i >= a && i < b)
  return (
    <span className={className} role="img" aria-label={word.text}>
      {[...word.text].map((ch, i) => (
        <Fragment key={i}>
          {syllables && boundaries.has(i) && <span className="syllable-dot" aria-hidden="true">·</span>}
          <span className={tricky(i) ? 'tricky' : undefined} aria-hidden="true">{ch}</span>
        </Fragment>
      ))}
    </span>
  )
}

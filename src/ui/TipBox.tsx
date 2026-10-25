import { useEffect, useState } from 'react'
import { useServices } from '../app/services'
import type { Word } from '../content/types'
import { SpeakButton } from './SpeakButton'

/**
 * One short tip explaining her mistake, under the letter comparison. Shows "Thinking of a tip…" in its place straight
 * away so nothing jumps, never blocks her from retyping, and ignores a tip that arrives after she has moved on.
 */
export function TipBox({ word, typed }: { word: Word; typed: string }) {
  const { tips } = useServices()
  const [state, setState] = useState<{ text: string | null } | null>(null)

  useEffect(() => {
    const prepared = tips?.prepare(word, typed) ?? null
    setState(prepared ? { text: null } : null)
    if (!prepared) return
    let live = true
    void prepared.result.then(r => { if (live) setState({ text: r.text }) })
    return () => { live = false }
  }, [tips, word, typed])

  if (!state) return null
  return (
    <div className="tip-box" role="status" aria-live="polite" data-state={state.text === null ? 'thinking' : 'ready'}>
      {state.text === null
        ? <p className="tip-text">💡 Thinking of a tip…</p>
        : <>
          <p className="tip-text">💡 {state.text}</p>
          <SpeakButton text={state.text} label="Read the tip" />
        </>}
    </div>
  )
}

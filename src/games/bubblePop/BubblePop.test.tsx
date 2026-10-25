import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BubblePop } from './BubblePop'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'
import { createStubSpeaker } from '../../speech/voice'

const was = getWord(BUILTIN_BANK, 'w-was')
const all = getWord(BUILTIN_BANK, 'w-all')
const bubble = (ch: string) => screen.getAllByRole('button', { name: `bubble ${ch}` })[0]

describe('BubblePop', () => {
  it('pops letters in order, including repeated letters', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<BubblePop activity={{ id: 'a', gameType: 'bubblePop', wordIds: ['w-all'] }} words={[all]} onAttempt={onAttempt} onDone={onDone} />)
    for (const ch of 'all') await user.click(bubble(ch))
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-all', correct: true, firstTry: true, hint: false })
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('counts a wrong pop, and glows the right bubble after three slips', async () => {
    const onAttempt = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<BubblePop activity={{ id: 'a', gameType: 'bubblePop', wordIds: ['w-was'] }} words={[was]} onAttempt={onAttempt} onDone={() => {}} />)
    const decoy = screen.getAllByRole('button', { name: /^bubble / }).find(b => !'was'.includes(b.getAttribute('aria-label')!.slice(-1)))!
    await user.click(decoy)
    await user.click(decoy)
    await user.click(decoy)
    expect(bubble('w')).toHaveAttribute('data-glow', 'true')
    for (const ch of 'was') await user.click(bubble(ch))
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-was', correct: false, firstTry: true, hint: true })
  })

  it('shows the word first when there is no voice', async () => {
    const was = getWord(BUILTIN_BANK, 'w-was')
    renderWithServices(<BubblePop activity={{ id: 'a', gameType: 'bubblePop', wordIds: ['w-was'] }} words={[was]} onAttempt={() => {}} onDone={() => {}} />, { speaker: createStubSpeaker([], false), delays: { feedback: 0, peek: 400, gap: 0 } }) // 400 ms look: checked while the suite is busy
    expect(await screen.findByText('Look carefully…')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'was' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /^bubble / })).toHaveLength(0)
    expect((await screen.findAllByRole('button', { name: /^bubble / })).length).toBeGreaterThan(3)
  })
  // Bubbles froze at the top or stacked on each other: each needs its own lane, a CSS rise and a height apart from its neighbours.
  it('gives every bubble its own lane, rising steadily, with neighbours at different heights', async () => {
    const word = getWord(BUILTIN_BANK, 'w-accidentally')
    renderWithServices(<BubblePop activity={{ id: 'a', gameType: 'bubblePop', wordIds: [word.id] }} words={[word]} onAttempt={() => {}} onDone={() => {}} />)
    const lanes = (await screen.findAllByRole('button', { name: /^bubble / })).map(b => b.parentElement as HTMLElement)
    expect(new Set(lanes).size).toBe(lanes.length)
    for (const l of lanes) expect(l.style.animationName).toBe('bubble-rise')
    const info = lanes.map(l => ({ left: parseFloat(l.style.left), delay: parseFloat(l.style.animationDelay), dur: parseFloat(l.style.animationDuration) }))
    expect(new Set(info.map(x => x.left)).size).toBe(info.length)
    expect(new Set(info.map(x => x.dur)).size).toBe(1) // one speed, so neighbours never drift together
    info.sort((a, b) => a.left - b.left)
    for (let n = 1; n < info.length; n++) {
      const d = Math.abs(info[n].delay - info[n - 1].delay) / info[n].dur % 1
      expect(Math.min(d, 1 - d), `lanes ${n - 1} and ${n}`).toBeGreaterThanOrEqual(0.2)
    }
  })
})

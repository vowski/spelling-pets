import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BubblePop } from './BubblePop'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'

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
})

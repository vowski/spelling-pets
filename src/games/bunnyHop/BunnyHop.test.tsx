import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BunnyHop } from './BunnyHop'
import { scramble } from './scramble'
import { makeRng } from '../../engine/rng'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'

const said = getWord(BUILTIN_BANK, 'w-said')
const activity = { id: 'a', gameType: 'bunnyHop' as const, wordIds: ['w-said'] }

describe('scramble', () => {
  it('returns the same letters in a different order', () => {
    const s = scramble('said', makeRng(1))
    expect([...s].sort()).toEqual(['a', 'd', 'i', 's'])
    expect(s.join('')).not.toBe('said')
    expect(scramble('a', makeRng(1))).toEqual(['a'])
  })
})

describe('BunnyHop', () => {
  const tile = (ch: string) => screen.getAllByRole('button', { name: `tile ${ch}` }).find(b => !b.hasAttribute('disabled'))!

  it('builds the word by clicking tiles', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<BunnyHop activity={activity} words={[said]} onAttempt={onAttempt} onDone={onDone} />)
    for (const ch of 'said') await user.click(tile(ch))
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-said', correct: true, firstTry: true, hint: false, typed: 'said' })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('accepts typing and corrects a wrong build', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<BunnyHop activity={activity} words={[said]} onAttempt={onAttempt} onDone={onDone} />)
    screen.getByLabelText('Letter tiles').focus()
    await user.keyboard('siad')
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ correct: false, typed: 'siad' }))
    expect(screen.getByText("Almost! Let's look.")).toBeInTheDocument()
    expect(within(screen.getByTestId('model')).getByRole('img', { name: 'said' })).toBeInTheDocument()
    await user.keyboard('sa{Backspace}a')
    await user.keyboard('id')
    expect(onAttempt).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })
})

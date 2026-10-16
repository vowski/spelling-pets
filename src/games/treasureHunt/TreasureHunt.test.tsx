import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TreasureHunt } from './TreasureHunt'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'

describe('TreasureHunt', () => {
  it('reveals treasure for every answer and reports each one', async () => {
    const words = ['w-said', 'w-was'].map(id => getWord(BUILTIN_BANK, id))
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<TreasureHunt activity={{ id: 'a', gameType: 'treasureHunt', wordIds: words.map(w => w.id) }} words={words} onAttempt={onAttempt} onDone={onDone} />)
    expect(await screen.findByLabelText('0 of 2 treasures found')).toBeInTheDocument()
    await user.type(await screen.findByLabelText('Your spelling'), 'sed{Enter}')
    expect(screen.getByLabelText('1 of 2 treasures found')).toBeInTheDocument()
    expect(screen.queryByText("Almost! Let's look.")).not.toBeInTheDocument()
    await user.type(await screen.findByLabelText('Your spelling'), 'was{Enter}')
    expect(onAttempt.mock.calls.map(c => [c[0].wordId, c[0].correct])).toEqual([['w-said', false], ['w-was', true]])
    expect(onDone).toHaveBeenCalledOnce()
  })
})

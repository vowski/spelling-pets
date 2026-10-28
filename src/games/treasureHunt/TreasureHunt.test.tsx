import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
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

    // At the end she sees her answers next to the right spellings, then carries on.
    expect(await screen.findByRole('heading', { name: 'Your Treasure Hunt answers' })).toBeInTheDocument()
    const rows = within(screen.getByRole('list', { name: 'Your answers' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('You wrote: s_ed') // the gap shows where a letter is missing, as on correction screens
    expect(rows[0]).toHaveTextContent('The right way: said')
    expect(rows[1]).toHaveTextContent('✓ was')
    expect(screen.getByText('1 of 2 spelt right')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Carry on' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitCheck } from './UnitCheck'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'

const ids = ['w-sadly', 'w-finally', 'w-gently']
const words = ids.map(id => getWord(BUILTIN_BANK, id))
const activity = { id: 'a', gameType: 'unitCheck' as const, wordIds: ids, unitId: 'y3-ly', unitDay: 1 as const }

describe('UnitCheck', () => {
  it('reports results and celebrates a perfect check', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<UnitCheck activity={activity} words={words} onAttempt={() => {}} onDone={onDone} />)
    for (const w of ['sadly', 'finally', 'gently']) await user.type(await screen.findByLabelText('Your spelling'), `${w}{Enter}`)
    expect(await screen.findByText('You already know this pattern! ⭐')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onDone).toHaveBeenCalledWith({ unitCheckResults: [true, true, true] })
  })
  it('moves to teaching after a slip', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<UnitCheck activity={activity} words={words} onAttempt={() => {}} onDone={onDone} />)
    await user.type(await screen.findByLabelText('Your spelling'), 'sadly{Enter}')
    await user.type(await screen.findByLabelText('Your spelling'), 'finaly{Enter}')
    await user.type(screen.getByLabelText('Type it the right way'), 'finally{Enter}')
    await user.type(await screen.findByLabelText('Your spelling'), 'gently{Enter}')
    expect(await screen.findByText("Let's learn this pattern together.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onDone).toHaveBeenCalledWith({ unitCheckResults: [true, false, true] })
  })
})

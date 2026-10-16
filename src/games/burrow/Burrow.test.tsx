import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Burrow } from './Burrow'
import { burrowGaps, fillGaps } from './gaps'
import { renderWithServices } from '../../test/render'

const feb = { id: 'w-february', text: 'February', sets: ['y34' as const], patternUnitIds: [], sentence: 'My birthday is in February.', syllables: ['Feb', 'ru', 'ar', 'y'], tricky: [[3, 5]] as [number, number][], caseSensitive: true }

describe('gaps', () => {
  it('uses tricky ranges or a fallback', () => {
    expect(burrowGaps(feb)).toEqual([[3, 5]])
    expect(burrowGaps({ text: 'house', tricky: [] })).toEqual([[1, 3]])
    expect(burrowGaps({ text: 'was', tricky: [] })).toEqual([[0, 1]])
  })
  it('fills gaps', () => {
    expect(fillGaps('February', [[3, 5]], ['ru'])).toBe('February')
    expect(fillGaps('February', [[3, 5]], ['u'])).toBe('Febuary')
  })
})

describe('Burrow', () => {
  it('reports the assembled word and corrects gently', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Burrow activity={{ id: 'a', gameType: 'burrow', wordIds: [feb.id] }} words={[feb]} onAttempt={onAttempt} onDone={onDone} />)
    await user.type(screen.getByLabelText('Missing letters 1'), 'u{Enter}')
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-february', correct: false, firstTry: true, hint: false, typed: 'Febuary' })
    expect(screen.getByText("Almost! Let's look.")).toBeInTheDocument()
    await user.type(screen.getByLabelText('Missing letters 1'), 'ru{Enter}')
    expect(onAttempt).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })
})

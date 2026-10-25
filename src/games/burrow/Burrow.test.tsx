import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Burrow } from './Burrow'
import { burrowGaps, fillGaps } from './gaps'
import { renderWithServices } from '../../test/render'
import { makeTestServices } from '../../test/render'
import { servicesWithTips } from '../../test/fakeTipModel'

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
  it('reads the correction instruction aloud', async () => {
    const user = userEvent.setup()
    const { services } = renderWithServices(<Burrow activity={{ id: 'a', gameType: 'burrow', wordIds: [feb.id] }} words={[feb]} onAttempt={() => {}} onDone={() => {}} />)
    await user.type(screen.getByLabelText('Missing letters 1'), 'u{Enter}')
    await user.click(screen.getByRole('button', { name: 'Read it to me' }))
    expect(services.speechLog.at(-1)).toBe("Almost! Let's look. Fill in the missing letters.")
  })
  // Review Focus #2 class: an accidental Enter on empty gaps is not an attempt
  it('nudges instead of recording an attempt when the gaps are empty', async () => {
    const onAttempt = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Burrow activity={{ id: 'a', gameType: 'burrow', wordIds: [feb.id] }} words={[feb]} onAttempt={onAttempt} onDone={() => {}} />)
    await user.type(screen.getByLabelText('Missing letters 1'), '{Enter}')
    expect(onAttempt).not.toHaveBeenCalled()
    expect(screen.getByText('Have a go! Fill in the missing letters.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Missing letters 1'), 'ru{Enter}')
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ correct: true }))
  })

  it('shows a tip for the missing letters', async () => {
    const services = await servicesWithTips(makeTestServices())
    const user = userEvent.setup()
    renderWithServices(<Burrow activity={{ id: 'a', gameType: 'burrow', wordIds: [feb.id] }} words={[feb]} onAttempt={() => {}} onDone={() => {}} />, services)
    await user.type(screen.getByLabelText('Missing letters 1'), 'u{Enter}')
    expect(await screen.findByText(/The tricky bit in "February" is "ru"/)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpellingPractice } from './SpellingPractice'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'

const words = ['w-said', 'w-was', 'w-the'].map(id => getWord(BUILTIN_BANK, id))
const typeAll = async (user: ReturnType<typeof userEvent.setup>, typed: string[]) => {
  for (const t of typed) await user.type(await screen.findByLabelText('Your spelling', {}, { timeout: 4000 }), `${t}{Enter}`)
}

// Weekly spellings (2026-11-03): a score, the right spellings, then only the missed words until all are right.
describe('SpellingPractice', () => {
  it('scores a go, shows the right spellings, and repeats only the missed words until all are right', async () => {
    const onAttempt = vi.fn()
    const onFinished = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<SpellingPractice title="Class spellings" words={words} order={ws => [...ws]} bestBefore={null} onAttempt={onAttempt} onFinished={onFinished} onClose={vi.fn()} />)
    expect(await screen.findByText('Go 1')).toBeInTheDocument()
    await typeAll(user, ['sed', 'was', 'teh'])
    expect(await screen.findByRole('heading', { name: 'You spelt 1 out of 3 right!' })).toBeInTheDocument()
    const rows = within(screen.getByRole('list', { name: 'Your answers' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('The right way: said')
    expect(rows[1]).toHaveTextContent('✓ was')
    await user.click(screen.getByRole('button', { name: 'Try the 2 you missed' }))
    expect(await screen.findByText('Go 2')).toBeInTheDocument()
    await typeAll(user, ['said', 'the'])
    expect(await screen.findByRole('heading', { name: 'You spelt 2 out of 2 right!' })).toBeInTheDocument()
    expect(screen.getByText('All 3 spelt right! 🎉 It took you 2 goes.')).toBeInTheDocument()
    expect(screen.getByText("That's your best this week! 🏆")).toBeInTheDocument()
    expect(onFinished).toHaveBeenCalledWith({ goes: 2, firstScore: 1, total: 3 })
    expect(onAttempt.mock.calls.map(([a, go]) => [a.wordId, a.correct, go])).toEqual([
      ['w-said', false, 1], ['w-was', true, 1], ['w-the', false, 1], ['w-said', true, 2], ['w-the', true, 2],
    ])
  })

  it('starts again with every word, and says when a go beats or misses her best', async () => {
    const onFinished = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<SpellingPractice title="Class spellings" words={words} order={ws => [...ws]} bestBefore={2} onAttempt={vi.fn()} onFinished={onFinished} onClose={vi.fn()} />)
    await typeAll(user, ['said', 'was', 'the'])
    expect(await screen.findByText('All 3 spelt right! 🎉 It took you 1 go: all right first time!')).toBeInTheDocument()
    expect(screen.getByText("That's your best this week! 🏆")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Have another go' }))
    expect(await screen.findByText('Go 1')).toBeInTheDocument()
    await typeAll(user, ['sed', 'was', 'the'])
    await user.click(await screen.findByRole('button', { name: 'Try the 1 you missed' }))
    await typeAll(user, ['said'])
    expect(await screen.findByText('Your best this week is 1 go. Have another go to match it!')).toBeInTheDocument()
    expect(onFinished.mock.calls.map(c => c[0].goes)).toEqual([1, 2])
  })
  // Final review of 2026-11-03.
  it('asks every missed word when "Try the ones you missed" is tapped before the last answer has settled', { timeout: 20_000 }, async () => {
    const onAttempt = vi.fn()
    const user = userEvent.setup()
    const four = [...words, getWord(BUILTIN_BANK, 'w-are')]
    renderWithServices(<SpellingPractice title="T" words={four} order={ws => [...ws]} bestBefore={null} onAttempt={onAttempt} onFinished={vi.fn()} onClose={vi.fn()} />,
      { delays: { feedback: 400, peek: 30, gap: 0 } })
    await typeAll(user, ['x', 'y', 'zz', 'are'])
    await user.click(await screen.findByRole('button', { name: 'Try the 3 you missed' }))
    await new Promise(r => setTimeout(r, 600)) // the last answer of go 1 settles after go 2 has begun
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    expect(await screen.findByText('Next word coming…')).toBeInTheDocument() // not the Treasure Hunt's message
    await typeAll(user, ['was', 'the'])
    expect(await screen.findByText(/All 4 spelt right/)).toBeInTheDocument()
    expect(onAttempt.mock.calls.filter(c => c[1] === 2).map(c => [c[0].wordId, c[0].correct])).toEqual([['w-said', true], ['w-was', true], ['w-the', true]])
  })

  it('says she matched her best when she can not beat it, and counts the first go of each practice afresh', async () => {
    const onFinished = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<SpellingPractice title="T" words={words.slice(0, 2)} order={ws => [...ws]} bestBefore={1} onAttempt={vi.fn()} onFinished={onFinished} onClose={vi.fn()} />)
    await typeAll(user, ['said', 'was'])
    expect(await screen.findByText('You matched your best this week! 🏆')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Have another go' }))
    await typeAll(user, ['said', 'wos'])
    await user.click(await screen.findByRole('button', { name: 'Try the 1 you missed' }))
    await typeAll(user, ['was'])
    expect(await screen.findByText('Your best this week is 1 go. Have another go to match it!')).toBeInTheDocument()
    expect(onFinished.mock.calls.map(c => c[0])).toEqual([{ goes: 1, firstScore: 2, total: 2 }, { goes: 2, firstScore: 1, total: 2 }])
  })

  it('reads well for a list of one word', async () => {
    const user = userEvent.setup()
    renderWithServices(<SpellingPractice title="T" words={words.slice(0, 1)} order={ws => [...ws]} bestBefore={null} onAttempt={vi.fn()} onFinished={vi.fn()} onClose={vi.fn()} />)
    await typeAll(user, ['said'])
    expect(await screen.findByText('You spelt it right! 🎉 It took you 1 go: right first time!')).toBeInTheDocument()
  })
})

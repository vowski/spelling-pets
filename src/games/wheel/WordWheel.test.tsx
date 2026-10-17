import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithServices, makeTestServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'

const PUZZLE = {
  id: 'wp-test', anchorWordId: 'w-because', letters: ['s', 'e', 'b', 'c', 'u', 'a', 'e'], rows: 4, cols: 7,
  grid: [{ word: 'because', row: 0, col: 0, dir: 'across' as const }, { word: 'case', row: 0, col: 2, dir: 'down' as const }],
  bonus: ['cause', 'sauce'],
}
vi.mock('../../content/wheel', () => ({ puzzlesForAnchor: () => [PUZZLE], WHEEL_ANCHORS: new Set(['w-because']), WHEEL_PUZZLES: [PUZZLE] }))
const { WordWheel } = await import('./WordWheel')

const activity = { id: 'a', gameType: 'wheel' as const, wordIds: ['w-because'] }

describe('WordWheel', () => {
  it('fills the grid from typed words, counts bonus words and finishes', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    const { services } = renderWithServices(<WordWheel activity={activity} words={[getWord(BUILTIN_BANK, 'w-because')]} onAttempt={onAttempt} onDone={onDone} />)
    expect(services.speechLog[0]).toBe('Find the hidden spelling word: because')
    screen.getByLabelText('Letter wheel').focus()
    await user.keyboard('xy{Enter}')
    await user.keyboard('case{Enter}')
    expect(screen.getAllByTestId('cell-filled')).toHaveLength(4)
    await user.keyboard('sauce{Enter}')
    expect(screen.getByText('Bonus word! +2 🐾')).toBeInTheDocument()
    await user.keyboard('case{Enter}')
    expect(screen.getByText('You already found that one!')).toBeInTheDocument()
    await user.keyboard('because{Enter}')
    expect(onAttempt).toHaveBeenCalledExactlyOnceWith({ wordId: 'w-because', correct: true, firstTry: true, hint: false })
    expect(screen.getByText('🎉 You found the hidden spelling word!')).toBeInTheDocument()
    expect(onDone).toHaveBeenCalledWith({ wheel: { puzzles: 1, threeStars: 1, bonusWords: 1 } })
  })

  it('gives 3 free hints per puzzle, counting down on the button', async () => {
    const services = makeTestServices()
    await services.repo.addCoins(20, 'test', 1)
    const user = userEvent.setup()
    renderWithServices(<WordWheel activity={activity} words={[]} onAttempt={() => {}} onDone={() => {}} />, services)
    expect(screen.getByRole('button', { name: '💡 Hint (3 left)' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /Hint/ }))
    expect(await screen.findByRole('button', { name: '💡 Hint (2 left)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Hint/ }))
    await user.click(screen.getByRole('button', { name: /Hint/ }))
    expect(await screen.findByRole('button', { name: '💡 Hint (0 left)' })).toBeDisabled()
    expect(await services.repo.balance()).toBe(20) // hints are free
  })

  it('selects letters by clicking', async () => {
    const user = userEvent.setup()
    renderWithServices(<WordWheel activity={activity} words={[]} onAttempt={() => {}} onDone={() => {}} />)
    for (const ch of 'case') await user.click(screen.getAllByRole('button', { name: `letter ${ch}` })[0])
    await user.click(screen.getByRole('button', { name: '✔ Enter' }))
    expect(screen.getAllByTestId('cell-filled')).toHaveLength(4)
  })
})

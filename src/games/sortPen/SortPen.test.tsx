import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortPen } from './SortPen'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK } from '../../content'

const unit = BUILTIN_BANK.unitById.get('y1-tch')!

describe('SortPen', () => {
  it('sorts by clicking a card then a pen, correcting wrong pens', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<SortPen activity={{ id: 'a', gameType: 'sortPen', wordIds: unit.wordIds, unitId: unit.id, unitDay: 1 }} words={[]} onAttempt={onAttempt} onDone={onDone} />)
    expect(screen.getByText(unit.rule)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'card rich' }))
    await user.click(screen.getByRole('button', { name: 'pen tch' }))
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-rich', correct: false, firstTry: true, hint: false, typed: 'tch' })
    expect(screen.getByText(/goes in the/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'card rich' }))
    await user.click(screen.getByRole('button', { name: 'pen ch rule-breakers' }))
    const buckets = unit.game.kind === 'sort' ? unit.game.buckets : []
    for (const b of buckets) for (const w of b.words) {
      const card = screen.queryByRole('button', { name: `card ${w}` })
      if (!card) continue
      await user.click(card)
      await user.click(screen.getByRole('button', { name: `pen ${b.label}` }))
    }
    expect(onAttempt.mock.calls.filter(c => c[0].wordId === 'w-rich')).toHaveLength(1)
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('finishes straight away without a sort unit', () => {
    const onDone = vi.fn()
    renderWithServices(<SortPen activity={{ id: 'a', gameType: 'sortPen', wordIds: [] }} words={[]} onAttempt={() => {}} onDone={onDone} />)
    expect(onDone).toHaveBeenCalledOnce()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WordBuilder } from './WordBuilder'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK } from '../../content'

const unit = BUILTIN_BANK.unitById.get('y1-compound')!

describe('WordBuilder', () => {
  it('shows the parts and checks the built word', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<WordBuilder activity={{ id: 'a', gameType: 'builder', wordIds: unit.wordIds, unitId: unit.id }} words={[]} onAttempt={onAttempt} onDone={onDone} />)
    const pairs = unit.game.kind === 'builder' ? unit.game.pairs : []
    for (let k = 0; k < pairs.length; k++) {
      const shown = screen.getByLabelText('Word parts').textContent!.replace(/\s/g, '')
      const pair = pairs.find(p => p.parts.join('+') + '=?' === shown)!
      await user.type(screen.getByLabelText('Your spelling'), `${pair.word}{Enter}`)
    }
    expect(onAttempt).toHaveBeenCalledTimes(pairs.length)
    expect(onAttempt.mock.calls.every(c => c[0].correct)).toBe(true)
    expect(onDone).toHaveBeenCalledOnce()
  })
})

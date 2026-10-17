import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Hedgehog } from './Hedgehog'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK } from '../../content'

const unit = BUILTIN_BANK.unitById.get('y2-homophones')!

describe('Hedgehog', () => {
  it('reads the sentence, takes the first choice and needs the right word to move on', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    const { services } = renderWithServices(<Hedgehog activity={{ id: 'a', gameType: 'hedgehog', wordIds: unit.wordIds, unitId: unit.id }} words={[]} onAttempt={onAttempt} onDone={onDone} />)
    const items = unit.game.kind === 'homophone' ? unit.game.items : []
    for (let k = 0; k < 8; k++) {
      const shown = screen.getByTestId('gap-sentence').textContent!
      const item = items.find(it => it.sentence === shown)!
      expect(services.speechLog).toContain(item.sentence.replace('___', item.answer))
      const wrong = item.options.find(o => o !== item.answer)!
      if (k === 0) await user.click(screen.getByRole('button', { name: `Choose ${wrong}` }))
      await user.click(screen.getByRole('button', { name: `Choose ${item.answer}` }))
    }
    expect(onAttempt).toHaveBeenCalledTimes(8)
    expect(onAttempt.mock.calls[0][0].correct).toBe(false)
    expect(onAttempt.mock.calls[0][0]).not.toHaveProperty('typed') // a picked option is not her spelling
    expect(onDone).toHaveBeenCalledOnce()
  })
})

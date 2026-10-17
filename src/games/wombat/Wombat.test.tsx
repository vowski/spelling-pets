import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Wombat } from './Wombat'
import { renderWithServices, makeTestServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'
import { prog } from '../../engine/testing'

const because = getWord(BUILTIN_BANK, 'w-because')
const activity = { id: 'a', gameType: 'wombat' as const, wordIds: ['w-because'] }

describe('Wombat', () => {
  it('offers the right spelling among believable ones, including her own past mistake', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-because', { box: 1, misspellings: { becuz: 3 } })])
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Wombat activity={activity} words={[because]} onAttempt={onAttempt} onDone={onDone} />, services)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Choose / })).toHaveLength(4))
    const labels = screen.getAllByRole('button', { name: /^Choose / }).map(b => b.querySelector('[data-opt]')!.textContent)
    expect(labels).toContain('because')
    expect(labels).toContain('becuz')
    expect(new Set(labels).size).toBe(4)
    await user.click(screen.getByRole('button', { name: 'Choose becuz' }))
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-because', correct: false, firstTry: true, hint: false })
    expect(screen.getByText("Almost! Let's look.")).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Choose because' }))
    expect(onAttempt).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('accepts number keys', async () => {
    const onAttempt = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Wombat activity={activity} words={[because]} onAttempt={onAttempt} onDone={() => {}} />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Choose / })).toHaveLength(4))
    const idx = screen.getAllByRole('button', { name: /^Choose / }).findIndex(b => b.querySelector('[data-opt]')!.textContent === 'because')
    await user.keyboard(String(idx + 1))
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ correct: true }))
  })
})

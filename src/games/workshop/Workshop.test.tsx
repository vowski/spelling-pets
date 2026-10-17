import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Workshop } from './Workshop'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'
import { createStubSpeaker } from '../../speech/voice'

const words = ['w-friend', 'w-because'].map(id => getWord(BUILTIN_BANK, id))
const activity = { id: 'a', gameType: 'workshop' as const, wordIds: words.map(w => w.id) }

describe('Workshop', () => {
  it('skips teaching when the pretest is right, otherwise teaches with Look, Say, Cover and Write twice', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Workshop activity={activity} words={words} onAttempt={onAttempt} onDone={onDone} />)

    expect(await screen.findByText(/Have a go first/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your spelling'), 'friend{Enter}')
    expect(onAttempt).toHaveBeenNthCalledWith(1, { wordId: 'w-friend', correct: true, firstTry: true, hint: false, typed: 'friend', role: 'pretest' })

    await user.type(await screen.findByLabelText('Your spelling'), 'becos{Enter}')
    expect(onAttempt).toHaveBeenNthCalledWith(2, expect.objectContaining({ wordId: 'w-because', correct: false, role: 'pretest' }))
    expect(await screen.findByRole('heading', { name: 'Look' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'because' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Say' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'I said it!' }))
    expect(screen.getByRole('heading', { name: 'Cover and write' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your spelling'), 'because{Enter}')
    expect(await screen.findByText('Great! Once more from memory.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your spelling'), 'because{Enter}')
    expect(onAttempt).toHaveBeenNthCalledWith(3, { wordId: 'w-because', correct: true, firstTry: true, hint: false, role: 'teach' })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('a wrong write resets the streak', async () => {
    const onAttempt = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Workshop activity={{ ...activity, wordIds: ['w-because'] }} words={[words[1]]} onAttempt={onAttempt} onDone={() => {}} />)
    await user.type(await screen.findByLabelText('Your spelling'), 'x{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'I said it!' }))
    await user.type(screen.getByLabelText('Your spelling'), 'because{Enter}')
    await user.type(await screen.findByLabelText('Your spelling'), 'becuase{Enter}')
    await user.type(screen.getByLabelText('Type it the right way'), 'because{Enter}')
    expect(onAttempt).toHaveBeenCalledTimes(1) // only the pretest so far
    expect(screen.queryByText('Great! Once more from memory.')).not.toBeInTheDocument()
  })

  // Review Focus #5: with no voice she cannot know the word, so there is no pretest to guess at
  it('skips the pretest when there is no voice and teaches straight away', async () => {
    const onAttempt = vi.fn()
    renderWithServices(<Workshop activity={activity} words={words} onAttempt={onAttempt} onDone={() => {}} />, { speaker: createStubSpeaker([], false) })
    expect(await screen.findByRole('heading', { name: 'Look' })).toBeInTheDocument()
    expect(screen.queryByText(/Have a go first/)).not.toBeInTheDocument()
    expect(onAttempt).not.toHaveBeenCalled()
  })
})

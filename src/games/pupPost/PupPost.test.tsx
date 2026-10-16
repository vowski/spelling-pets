import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PupPost } from './PupPost'
import { renderWithServices } from '../../test/render'
import { BUILTIN_BANK, getWord } from '../../content'
import { createStubSpeaker } from '../../speech/voice'
import type { Activity } from '../../engine/planner'

const words = ['w-said', 'w-was'].map(id => getWord(BUILTIN_BANK, id))
const activity: Activity = { id: 'a1', gameType: 'pupPost', wordIds: ['w-said', 'w-was'] }

describe('PupPost', () => {
  it('says each word in context and reports one attempt per word', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    const { services } = renderWithServices(<PupPost activity={activity} words={words} onAttempt={onAttempt} onDone={onDone} />)
    await waitFor(() => expect(services.speechLog.slice(0, 3)).toEqual(['said', words[0].sentence, 'said']))
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-said', correct: true, firstTry: true, hint: false, typed: 'said' })
    await waitFor(() => expect(services.speechLog).toContain('was'))
    await user.type(await screen.findByLabelText('Your spelling'), 'wos{Enter}')
    await user.type(screen.getByLabelText('Type it the right way'), 'was{Enter}')
    expect(onAttempt).toHaveBeenCalledTimes(2)
    expect(onAttempt).toHaveBeenLastCalledWith({ wordId: 'w-was', correct: false, firstTry: true, hint: false, typed: 'wos' })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('labels practice tests', async () => {
    renderWithServices(<PupPost activity={{ ...activity, practiceTest: true }} words={words} onAttempt={() => {}} onDone={() => {}} />)
    expect(await screen.findByText(/Practice test for tomorrow/)).toBeInTheDocument()
  })

  // Review Focus #5: no voice → Look-and-Cover
  it('falls back to Look-and-Cover when there is no voice', async () => {
    const onAttempt = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<PupPost activity={activity} words={words} onAttempt={onAttempt} onDone={() => {}} />, { speaker: createStubSpeaker([], false) })
    expect(await screen.findByText('Look carefully…')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'said' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Your spelling')).not.toBeInTheDocument()
    const input = await screen.findByLabelText('Your spelling')
    expect(screen.queryByRole('img', { name: 'said' })).not.toBeInTheDocument()
    await user.type(input, 'said{Enter}')
    expect(onAttempt).toHaveBeenCalledOnce()
  })
})

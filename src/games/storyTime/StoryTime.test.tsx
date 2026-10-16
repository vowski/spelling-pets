import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryTime } from './StoryTime'
import { renderWithServices } from '../../test/render'
import { buildBank } from '../../content'

describe('StoryTime', () => {
  it('dictates, scores words and punctuation, and corrects errorlessly', async () => {
    const bank = buildBank()
    const sentence = bank.sentences.find(s => s.text === 'My friend came to our house.')!
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    const { services } = renderWithServices(
      <StoryTime activity={{ id: 'a', gameType: 'storyTime', wordIds: sentence.wordIds, sentenceIds: [sentence.id] }} words={[]} onAttempt={onAttempt} onDone={onDone} />, { bank })
    await waitFor(() => expect(services.speechLog).toContain(sentence.text))
    await user.type(screen.getByLabelText('Type the sentence'), 'my frend came to our house{Enter}')
    expect(screen.getByText("Almost! Let's look.")).toBeInTheDocument()
    expect(screen.getByText('frend → friend')).toBeInTheDocument()
    expect(screen.getByText(/Capital letter at the start: Remember it!/)).toBeInTheDocument()
    expect(screen.getByText(/Full stop at the end: Remember it!/)).toBeInTheDocument()
    const reported = Object.fromEntries(onAttempt.mock.calls.map(c => [c[0].wordId, c[0].correct]))
    expect(reported['w-friend']).toBe(false)
    expect(reported['w-our']).toBe(true)
    expect(onAttempt.mock.calls.length).toBe(sentence.wordIds.length)
    await user.type(screen.getByLabelText('Type it the right way'), 'My friend came to our house.{Enter}')
    expect(onDone).toHaveBeenCalledWith({ storyResults: [{ wordAccuracy: 5 / 6, punctuationOk: false, perfect: false }] })
  })
})

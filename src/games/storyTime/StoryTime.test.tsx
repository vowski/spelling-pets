import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryTime } from './StoryTime'
import { renderWithServices } from '../../test/render'
import { buildBank } from '../../content'
import { createStubSpeaker } from '../../speech/voice'

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

  it('nudges gently when the corrected sentence is still not right', async () => {
    const bank = buildBank()
    const sentence = bank.sentences.find(s => s.text === 'My friend came to our house.')!
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(
      <StoryTime activity={{ id: 'a', gameType: 'storyTime', wordIds: sentence.wordIds, sentenceIds: [sentence.id] }} words={[]} onAttempt={onAttempt} onDone={onDone} />, { bank })
    await user.type(await screen.findByLabelText('Type the sentence'), 'my frend came to our house{Enter}')
    await user.type(screen.getByLabelText('Type it the right way'), 'My frend came to our house.{Enter}')
    expect(screen.getByText('Nearly! Copy the sentence carefully, word by word.')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    expect(onAttempt.mock.calls.length).toBe(sentence.wordIds.length)
    await user.type(screen.getByLabelText('Type it the right way'), '{Control>}a{/Control}My friend came to our house.{Enter}')
    expect(onDone).toHaveBeenCalled()
  })

  it('reads the correction instruction aloud', async () => {
    const bank = buildBank()
    const sentence = bank.sentences.find(s => s.text === 'My friend came to our house.')!
    const user = userEvent.setup()
    const { services } = renderWithServices(
      <StoryTime activity={{ id: 'a', gameType: 'storyTime', wordIds: sentence.wordIds, sentenceIds: [sentence.id] }} words={[]} onAttempt={() => {}} onDone={() => {}} />, { bank })
    await user.type(await screen.findByLabelText('Type the sentence'), 'my frend came to our house{Enter}')
    await user.click(screen.getByRole('button', { name: 'Read it to me' }))
    expect(services.speechLog.at(-1)).toBe("Almost! Let's look. Type it the right way.")
  })

  it('with no voice, lets the child look at the sentence again', async () => {
    const bank = buildBank()
    const sentence = bank.sentences.find(s => s.text === 'My friend came to our house.')!
    const user = userEvent.setup()
    renderWithServices(
      <StoryTime activity={{ id: 'a', gameType: 'storyTime', wordIds: sentence.wordIds, sentenceIds: [sentence.id] }} words={[]} onAttempt={() => {}} onDone={() => {}} />,
      { bank, speaker: createStubSpeaker([], false) })
    expect(await screen.findByText(sentence.text)).toBeInTheDocument()
    await user.type(await screen.findByLabelText('Type the sentence'), 'My friend')
    expect(screen.queryByText(sentence.text)).toBeNull()
    await user.click(screen.getByRole('button', { name: /Look again/ }))
    expect(screen.getByText(sentence.text)).toBeInTheDocument()
    expect(await screen.findByLabelText('Type the sentence')).toHaveValue('My friend')
  })
})

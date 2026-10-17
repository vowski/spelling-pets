import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpeakButton } from './SpeakButton'
import { renderWithServices } from '../test/render'
import { createStubSpeaker } from '../speech/voice'

describe('SpeakButton', () => {
  it('reads the text aloud without taking focus from the answer box', async () => {
    const user = userEvent.setup()
    const { services } = renderWithServices(<><input aria-label="Answer" autoFocus /><SpeakButton text="Have a go first!" /></>)
    expect(screen.getByLabelText('Answer')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Read it to me' }))
    expect(services.speechLog).toEqual(['Have a go first!'])
    expect(screen.getByLabelText('Answer')).toHaveFocus()
  })

  it('is not shown when there is no voice to read with', async () => {
    renderWithServices(<><p>Ready</p><SpeakButton text="Have a go first!" /></>, { speaker: createStubSpeaker([], false) })
    expect(await screen.findByText('Ready')).toBeInTheDocument()
    await Promise.resolve()
    expect(screen.queryByRole('button', { name: 'Read it to me' })).toBeNull()
  })
})

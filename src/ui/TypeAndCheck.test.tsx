import { describe, it, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypeAndCheck } from './TypeAndCheck'
import { renderWithServices } from '../test/render'
import { BUILTIN_BANK, getWord } from '../content'

const said = getWord(BUILTIN_BANK, 'w-said')
const monday = getWord(BUILTIN_BANK, 'w-monday')

function setup(feedback?: 'full' | 'neutral' | 'pretest', word = said) {
  const onFirstResult = vi.fn()
  const onFinished = vi.fn()
  renderWithServices(<TypeAndCheck word={word} feedback={feedback} onFirstResult={onFirstResult} onFinished={onFinished} />)
  return { onFirstResult, onFinished, user: userEvent.setup() }
}

describe('TypeAndCheck', () => {
  it('reports a correct first answer once and finishes', async () => {
    const { onFirstResult, onFinished, user } = setup()
    await user.type(screen.getByLabelText('Your spelling'), 'said{Enter}')
    expect(onFirstResult).toHaveBeenCalledExactlyOnceWith({ correct: true, typed: 'said', capitalOnly: false })
    expect(onFinished).toHaveBeenCalledOnce()
  })

  // Review Focus #2: key-mashing
  it('records exactly one attempt when Enter and Check are mashed', async () => {
    const { onFirstResult, onFinished, user } = setup()
    const input = screen.getByLabelText('Your spelling')
    await user.type(input, 'siad')
    await user.keyboard('{Enter}{Enter}{Enter}')
    await user.keyboard('{Enter}')
    expect(onFirstResult).toHaveBeenCalledOnce()
    expect(onFirstResult).toHaveBeenCalledWith({ correct: false, typed: 'siad', capitalOnly: false })
    expect(onFinished).not.toHaveBeenCalled()
    const retry = screen.getByLabelText('Type it the right way')
    await user.type(retry, 'said')
    const check = screen.getByRole('button', { name: 'Check' })
    fireEvent.click(check)
    fireEvent.click(check)
    expect(onFinished).toHaveBeenCalledOnce()
    expect(onFirstResult).toHaveBeenCalledOnce()
  })

  it('shows gentle correction for a wrong answer and only finishes on a correct retype', async () => {
    const { onFinished, user } = setup()
    await user.type(screen.getByLabelText('Your spelling'), 'sed{Enter}')
    expect(screen.getByText("Almost! Let's look.")).toBeInTheDocument()
    expect(screen.getByText(/The right way/)).toBeInTheDocument()
    expect(screen.queryByText(/✗|❌/)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Type it the right way'), 'sed{Enter}')
    expect(screen.getByText(/Nearly! Copy the right way/)).toBeInTheDocument()
    expect(onFinished).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Type it the right way'))
    await user.type(screen.getByLabelText('Type it the right way'), 'said{Enter}')
    expect(onFinished).toHaveBeenCalledOnce()
  })

  it('asks for a go on empty input without recording anything', async () => {
    const { onFirstResult, user } = setup()
    await user.type(screen.getByLabelText('Your spelling'), '   {Enter}')
    expect(screen.getByText('Have a go! Type the word.')).toBeInTheDocument()
    expect(onFirstResult).not.toHaveBeenCalled()
  })

  it('hints about the capital letter', async () => {
    const { user } = setup('full', monday)
    await user.type(screen.getByLabelText('Your spelling'), 'monday{Enter}')
    expect(screen.getByText(/capital letter/i)).toBeInTheDocument()
  })

  it('neutral mode never says right or wrong', async () => {
    const { onFirstResult, onFinished, user } = setup('neutral')
    await user.type(screen.getByLabelText('Your spelling'), 'sed{Enter}')
    expect(onFirstResult).toHaveBeenCalledWith({ correct: false, typed: 'sed', capitalOnly: false })
    expect(screen.getByText('💎 Treasure found!')).toBeInTheDocument()
    expect(screen.queryByText("Almost! Let's look.")).not.toBeInTheDocument()
    expect(onFinished).toHaveBeenCalledOnce()
  })

  it('pretest mode moves straight on after a wrong guess', async () => {
    const { onFinished, user } = setup('pretest')
    await user.type(screen.getByLabelText('Your spelling'), 'sed{Enter}')
    expect(screen.getByText("Let's learn this one together!")).toBeInTheDocument()
    expect(screen.queryByLabelText('Type it the right way')).not.toBeInTheDocument()
    expect(onFinished).toHaveBeenCalledOnce()
  })
})

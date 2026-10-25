import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BunnyHop } from './BunnyHop'
import { scramble } from './scramble'
import { makeRng } from '../../engine/rng'
import { renderWithServices } from '../../test/render'
import { makeTestServices } from '../../test/render'
import { servicesWithTips } from '../../test/fakeTipModel'
import { BUILTIN_BANK, getWord } from '../../content'
import { createStubSpeaker } from '../../speech/voice'

const said = getWord(BUILTIN_BANK, 'w-said')
const activity = { id: 'a', gameType: 'bunnyHop' as const, wordIds: ['w-said'] }

describe('scramble', () => {
  it('returns the same letters in a different order', () => {
    const s = scramble('said', makeRng(1))
    expect([...s].sort()).toEqual(['a', 'd', 'i', 's'])
    expect(s.join('')).not.toBe('said')
    expect(scramble('a', makeRng(1))).toEqual(['a'])
  })
})

describe('BunnyHop', () => {
  const tile = (ch: string) => screen.getAllByRole('button', { name: `tile ${ch}` }).find(b => !b.hasAttribute('disabled'))!

  it('builds the word by clicking tiles', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<BunnyHop activity={activity} words={[said]} onAttempt={onAttempt} onDone={onDone} />)
    for (const ch of 'said') await user.click(tile(ch))
    expect(onAttempt).toHaveBeenCalledWith({ wordId: 'w-said', correct: true, firstTry: true, hint: false, typed: 'said' })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('accepts typing and corrects a wrong build', async () => {
    const onAttempt = vi.fn()
    const onDone = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<BunnyHop activity={activity} words={[said]} onAttempt={onAttempt} onDone={onDone} />)
    screen.getByLabelText('Letter tiles').focus()
    await user.keyboard('siad')
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({ correct: false, typed: 'siad' }))
    expect(screen.getByText("Almost! Let's look.")).toBeInTheDocument()
    expect(within(screen.getByTestId('model')).getByRole('img', { name: 'said' })).toBeInTheDocument()
    await user.keyboard('sa{Backspace}a')
    await user.keyboard('id')
    expect(onAttempt).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('reads the correction instruction aloud', async () => {
    const user = userEvent.setup()
    const { services } = renderWithServices(<BunnyHop activity={activity} words={[said]} onAttempt={() => {}} onDone={() => {}} />)
    screen.getByLabelText('Letter tiles').focus()
    await user.keyboard('siad')
    await user.click(screen.getByRole('button', { name: 'Read it to me' }))
    expect(services.speechLog.at(-1)).toBe("Almost! Let's look. Hop the letters into the right order.")
  })

  it('shows the word first when there is no voice', async () => {
    renderWithServices(<BunnyHop activity={activity} words={[said]} onAttempt={() => {}} onDone={() => {}} />, { speaker: createStubSpeaker([], false), delays: { feedback: 0, peek: 400, gap: 0 } }) // 400 ms look: checked while the suite is busy
    expect(await screen.findByText('Look carefully…')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'said' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /^tile / })).toHaveLength(0)
    expect((await screen.findAllByRole('button', { name: /^tile / })).length).toBe(4)
    expect(screen.queryByRole('img', { name: 'said' })).not.toBeInTheDocument()
  })

  it('shows a tip for a wrong letter order', async () => {
    const services = await servicesWithTips(makeTestServices())
    const user = userEvent.setup()
    const friend = getWord(BUILTIN_BANK, 'w-friend')
    renderWithServices(<BunnyHop activity={{ id: 'a', gameType: 'bunnyHop', wordIds: ['w-friend'] }} words={[friend]} onAttempt={() => {}} onDone={() => {}} />, services)
    screen.getByLabelText('Letter tiles').focus()
    await user.keyboard('freind')
    expect(await screen.findByText(/The tricky bit in "friend" is "ie"/)).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Overview } from './Overview'
import { renderWithServices, makeTestServices } from '../test/render'
import { prog } from '../engine/testing'
import { createStubSpeaker } from '../speech/voice'

describe('Overview', () => {
  it('shows the week, progress, trouble spots and a backup reminder', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-because', { box: 1, seen: 3, correct: 1, misspellings: { becuase: 2 } }), prog('w-said', { box: 4, secureOn: '2026-10-14' })])
    renderWithServices(<MemoryRouter><Overview /></MemoryRouter>, services)
    expect(await screen.findByText('This week')).toBeInTheDocument()
    expect(screen.getByText('Year 3/4 word list')).toBeInTheDocument()
    expect(screen.getByText('becuase')).toBeInTheDocument()
    expect(screen.getByText(/hasn't been backed up recently/)).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: /Secure words over time/ })).toBeInTheDocument()
    expect(screen.queryByText(/No British voice/)).not.toBeInTheDocument()
  })
  it('warns when no voice is available', async () => {
    renderWithServices(<MemoryRouter><Overview /></MemoryRouter>, { speaker: createStubSpeaker([], false) })
    expect(await screen.findByText(/No British voice was found/)).toBeInTheDocument()
  })
  it('warns when the voice it has to use is not British English', async () => {
    const speaker = { ...createStubSpeaker([]), currentVoice: () => ({ name: 'Microsoft David - English (United States)', lang: 'en-US', voiceURI: 'david', localService: true }) }
    renderWithServices(<MemoryRouter><Overview /></MemoryRouter>, { speaker })
    expect(await screen.findByText(/isn't British English/)).toBeInTheDocument()
    expect(screen.queryByText(/No British voice was found/)).not.toBeInTheDocument()
  })
  it('does not warn about a British voice', async () => {
    const speaker = { ...createStubSpeaker([]), currentVoice: () => ({ name: 'Microsoft Hazel - English (United Kingdom)', lang: 'en-GB', voiceURI: 'hazel', localService: true }) }
    renderWithServices(<MemoryRouter><Overview /></MemoryRouter>, { speaker })
    expect(await screen.findByText('This week')).toBeInTheDocument()
    expect(screen.queryByText(/isn't British English/)).not.toBeInTheDocument()
  })
  it('says straight away when automatic backup has stopped', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ lastBackupAt: services.clock.now().getTime(), lastAutoBackup: 'needs-permission' })
    renderWithServices(<MemoryRouter><Overview /></MemoryRouter>, services)
    expect(await screen.findByText(/Automatic backup has stopped/)).toBeInTheDocument()
    expect(screen.queryByText(/hasn't been backed up recently/)).not.toBeInTheDocument()
  })
})

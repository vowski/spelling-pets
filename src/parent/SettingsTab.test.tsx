import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsTab } from './SettingsTab'
import { renderWithServices, makeTestServices } from '../test/render'
import { hashPin, checkPin } from '../app/pin'

describe('SettingsTab', () => {
  it('saves settings', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<SettingsTab />, services)
    await user.selectOptions(await screen.findByLabelText('Session length'), '15')
    await user.selectOptions(screen.getByLabelText('New words per day'), '3')
    await user.click(screen.getByLabelText('Dyslexia-friendly font'))
    await user.clear(screen.getByLabelText("Child's name"))
    await user.type(screen.getByLabelText("Child's name"), 'Amy')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument()
    expect(await services.repo.getSettings()).toMatchObject({ sessionMinutes: 15, newWordsPerDay: 3, dyslexiaFont: true, childName: 'Amy' })
    expect(screen.getByRole('option', { name: 'Automatic (best British voice)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test voice' }))
    expect(services.speechLog).toContain("Hello! Let's practise our spellings.")
  })
  it('changes the PIN only with the current PIN', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ pinSalt: 's', pinHash: await hashPin('1111', 's') })
    const user = userEvent.setup()
    renderWithServices(<SettingsTab />, services)
    await user.type(await screen.findByLabelText('Current PIN'), '9999')
    await user.type(screen.getByLabelText('New PIN'), '2222')
    await user.type(screen.getByLabelText('Confirm new PIN'), '2222')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))
    expect(await screen.findByText("The current PIN isn't right.")).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Current PIN'))
    await user.type(screen.getByLabelText('Current PIN'), '1111')
    await user.click(screen.getByRole('button', { name: 'Change PIN' }))
    await waitFor(async () => expect(await checkPin('2222', await services.repo.getSettings())).toBe(true))
  })
})

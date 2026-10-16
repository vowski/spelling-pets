import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FirstRun } from './FirstRun'
import { renderWithServices } from '../test/render'
import { checkPin } from './pin'

describe('FirstRun', () => {
  it('collects name, PIN and pet, then saves settings', async () => {
    const user = userEvent.setup()
    const { services } = renderWithServices(<FirstRun />)
    expect(screen.getByText(/Welcome to Spelling Pets/)).toBeInTheDocument()
    await user.type(screen.getByLabelText("Child's first name (optional)"), 'Amy')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByLabelText('New PIN'), '1234')
    await user.type(screen.getByLabelText('Type the PIN again'), '9999')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText("Those PINs don't match. Try again.")).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Type the PIN again'))
    await user.type(screen.getByLabelText('Type the PIN again'), '1234')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Bunny egg' }))
    await user.type(screen.getByLabelText("Your pet's name"), 'Clover')
    await user.click(screen.getByRole('button', { name: "Let's go!" }))
    await waitFor(async () => expect((await services.repo.getSettings()).firstRunDone).toBe(true))
    const s = await services.repo.getSettings()
    expect(s).toMatchObject({ childName: 'Amy', petSpecies: 'bunny', petName: 'Clover', firstRunDone: true })
    expect(await checkPin('1234', s)).toBe(true)
  })
})

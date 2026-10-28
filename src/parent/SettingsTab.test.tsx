import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsTab } from './SettingsTab'
import { renderWithServices, makeTestServices } from '../test/render'
import { hashPin, checkPin } from '../app/pin'
import { createTipService } from '../app/tips'
import { isBlockedWord } from '../content/dictionary'
import { fakeTipModel, servicesWithTips, type FakeTipModelOptions } from '../test/fakeTipModel'

const NOTICE = 'Downloads about 0.9 GB once from Hugging Face. After that the AI works offline on this laptop. Tips you play aloud use the voice chosen above. Online voices send the words to Google or Microsoft, just like the spelling words.'
function servicesWithModel(o: FakeTipModelOptions = {}) {
  const s = makeTestServices()
  const model = fakeTipModel(o)
  return { ...s, model, tips: createTipService({ repo: s.repo, bank: s.bank, model, clock: s.clock, timeoutMs: 1000, isBlocked: isBlockedWord }) }
}

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
  it('lets the grown-up unlock the next year of spellings (Year 3 to start with)', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<SettingsTab />, services)
    const years = await screen.findByLabelText('Spelling years')
    expect(years).toHaveValue('3')
    expect(screen.getAllByRole('option').filter(o => o.closest('select') === years).map(o => o.textContent)).toEqual(['Up to Year 3', 'Up to Year 4', 'Up to Year 5', 'Up to Year 6'])
    expect(screen.getByText(/Year 5 adds the Years 5–6 word list and the Year 5 patterns/)).toBeInTheDocument()
    expect(screen.getByText(/Anything she has already started stays in her practice if you choose a lower year/)).toBeInTheDocument()
    await user.selectOptions(years, '5')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Saved ✓')).toBeInTheDocument()
    expect(await services.repo.getSettings()).toMatchObject({ highestYear: 5 })
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

  describe('AI spelling tips', () => {
    it('turns AI tips on after showing the download notice', async () => {
      const services = servicesWithModel()
      const user = userEvent.setup()
      renderWithServices(<SettingsTab />, services)
      await user.click(await screen.findByRole('button', { name: 'Turn on AI tips' }))
      expect(screen.getByText(/a small AI model on this laptop writes the tip from what she actually typed/)).toBeInTheDocument()
      expect(screen.getByText(NOTICE)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Download and turn on' }))
      expect(await screen.findByText('On')).toBeInTheDocument()
      expect((await services.repo.getSettings()).aiTipsOn).toBe(true)
      expect(screen.getByText(/AI tips use Gemma 3 1B by Google/)).toBeInTheDocument()
    })

    it('says why it cannot run on an unsupported computer', async () => {
      const services = servicesWithModel({ unsupported: 'no WebGPU' })
      const user = userEvent.setup()
      renderWithServices(<SettingsTab />, services)
      await user.click(await screen.findByRole('button', { name: 'Turn on AI tips' }))
      await user.click(screen.getByRole('button', { name: 'Download and turn on' }))
      expect(await screen.findByText("This computer can't run AI tips; she'll keep getting the plain tips.")).toBeInTheDocument()
      expect((await services.repo.getSettings()).aiTipsOn).toBeFalsy()
    })

    // Review Focus #2: the first download fails part-way
    it('shows a download problem and lets you try again', async () => {
      const services = servicesWithModel({ downloadFails: 'Failed to fetch' })
      const user = userEvent.setup()
      renderWithServices(<SettingsTab />, services)
      await user.click(await screen.findByRole('button', { name: 'Turn on AI tips' }))
      await user.click(screen.getByRole('button', { name: 'Download and turn on' }))
      expect(await screen.findByText('Something went wrong: Failed to fetch')).toBeInTheDocument()
      services.model.options.downloadFails = undefined
      await user.click(screen.getByRole('button', { name: 'Turn on AI tips' }))
      await user.click(screen.getByRole('button', { name: 'Download and turn on' }))
      expect(await screen.findByText('On')).toBeInTheDocument()
    })

    it('removes the model after confirming', async () => {
      const services = await servicesWithTips(makeTestServices())
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const user = userEvent.setup()
      renderWithServices(<SettingsTab />, services)
      await user.click(await screen.findByRole('button', { name: 'Remove the AI model' }))
      expect(await screen.findByText('Off')).toBeInTheDocument()
      expect((await services.repo.getSettings()).aiTipsOn).toBe(false)
    })

    it('hides the AI section and licence note without the feature', async () => {
      renderWithServices(<SettingsTab />)
      await screen.findByLabelText("Child's name")
      expect(screen.queryByRole('heading', { name: 'AI spelling tips' })).not.toBeInTheDocument()
      expect(screen.queryByText(/Gemma 3 1B by Google/)).not.toBeInTheDocument()
    })
  })
})

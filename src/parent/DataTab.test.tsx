import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTab } from './DataTab'
import { renderWithServices, makeTestServices } from '../test/render'
import { exportBackup } from '../storage/backup'
import { Repo } from '../storage/repo'
import { prog } from '../engine/testing'

describe('DataTab', () => {
  it('downloads a backup and records the time', async () => {
    const services = makeTestServices()
    const create = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    renderWithServices(<DataTab reload={() => {}} />, services)
    expect(await screen.findByText('Never backed up')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download backup' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(create).toHaveBeenCalled()
    expect((await services.repo.getSettings()).lastBackupAt).not.toBeNull()
  })

  it('previews and restores a valid backup, and rejects a bad file', async () => {
    const source = Repo.open(`d-${Math.random()}`)
    await source.updateSettings({ childName: 'Amy' })
    await source.putProgress([prog('w-said', { box: 4 })])
    const file = new File([JSON.stringify(await exportBackup(source.db, '2026-10-10T10:00:00.000Z'))], 'b.json', { type: 'application/json' })
    const services = makeTestServices()
    const reload = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<DataTab reload={reload} />, services)
    await user.upload(await screen.findByLabelText('Backup file'), new File(['nope'], 'x.json'))
    expect(await screen.findByText("This file isn't a Spelling Pets backup.")).toBeInTheDocument()
    await user.upload(screen.getByLabelText('Backup file'), file)
    expect(await screen.findByText(/for Amy: 1 Secure words, 0 sessions/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Replace with this backup' }))
    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect((await services.repo.getSettings()).childName).toBe('Amy')
  })

  it('needs RESET typed before wiping everything', async () => {
    const reload = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<DataTab reload={reload} />)
    const button = await screen.findByRole('button', { name: 'Reset everything' })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Type RESET to confirm'), 'RESET')
    expect(button).toBeEnabled()
  })
})

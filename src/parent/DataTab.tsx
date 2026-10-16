import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useServices, useToday } from '../app/services'
import { chooseBackupFolder, reconnectBackupFolder, supportsFolderBackup, writeAutoBackup } from '../storage/autoBackup'
import { backupFileName, exportBackup, importBackup, parseBackup, type ParseResult } from '../storage/backup'
import { Button } from '../ui/Button'

const when = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Reload without the #/parent/... hash, so after a reset or restore the app opens at Home, not the PIN gate.
const reloadHome = () => window.location.replace(window.location.pathname + window.location.search)

export function DataTab({ reload = reloadHome }: { reload?: () => void }) {
  const { repo, clock } = useServices()
  const today = useToday()
  const settings = useLiveQuery(() => repo.getSettings(), [repo])
  const folder = useLiveQuery(() => repo.db.handles.get('backupDir'), [repo])
  const errors = useLiveQuery(() => repo.getErrors(), [repo])
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [msg, setMsg] = useState('')
  const [huntMsg, setHuntMsg] = useState('')
  const [confirmText, setConfirmText] = useState('')
  if (!settings || errors === undefined) return <p>Loading…</p>

  const download = async () => {
    const data = await exportBackup(repo.db, clock.now().toISOString())
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(today)
    a.click()
    URL.revokeObjectURL(url)
    await repo.updateSettings({ lastBackupAt: clock.now().getTime() })
  }
  const onFile = async (f: File | undefined) => { if (f) setParsed(parseBackup(await f.text())) }
  const restore = async () => {
    if (!parsed?.ok) return
    await importBackup(repo.db, parsed.backup)
    reload()
  }
  const backupNow = async () => {
    const r = await writeAutoBackup(repo, today, clock.now().getTime())
    setMsg({ written: 'Backed up ✓', 'needs-permission': 'Please reconnect the backup folder first.', 'no-folder': 'Choose a backup folder first.', error: 'Backup failed. See the problems log.' }[r])
  }

  return (
    <section>
      <div className="panel">
        <h2>Backups</h2>
        <p>{settings.lastBackupAt ? `Last backup: ${when(settings.lastBackupAt)}` : 'Never backed up'}</p>
        <Button onClick={() => void download()}>Download backup</Button>
        {supportsFolderBackup() ? (
          <p className="row" style={{ justifyContent: 'flex-start' }}>
            {!folder ? <Button variant="secondary" onClick={() => void chooseBackupFolder(repo).then(ok => setMsg(ok ? 'Folder chosen ✓ A backup will be saved after every session.' : ''))}>Choose a backup folder</Button>
              : <Button variant="secondary" onClick={() => void reconnectBackupFolder(repo).then(ok => setMsg(ok ? 'Reconnected ✓' : 'Permission not given.'))}>Reconnect backup folder</Button>}
            <Button variant="ghost" onClick={() => void backupNow()}>Back up now</Button>
          </p>
        ) : <p className="muted">This browser can't save backups to a folder automatically. Download a backup each week instead.</p>}
        <p role="status">{msg}</p>
      </div>
      <div className="panel">
        <h2>Restore from a backup</h2>
        <input type="file" accept="application/json,.json" aria-label="Backup file" onChange={e => void onFile(e.target.files?.[0])} />
        {parsed && !parsed.ok && <p role="alert">{parsed.reason}</p>}
        {parsed?.ok && (
          <div>
            <p>Backup from {new Date(parsed.summary.exportedAt).toLocaleDateString('en-GB')} for {parsed.summary.childName || 'your child'}: {parsed.summary.secureWords} Secure words, {parsed.summary.sessions} sessions. Restoring replaces everything on this laptop.</p>
            <Button onClick={() => void restore()}>Replace with this backup</Button> <Button variant="ghost" onClick={() => setParsed(null)}>Cancel</Button>
          </div>
        )}
      </div>
      <div className="panel">
        <h2>Treasure Hunt</h2>
        <Button variant="secondary" onClick={() => { if (window.confirm('Run the Treasure Hunt again? Progress is kept.')) void repo.db.placement.clear().then(() => setHuntMsg('The Treasure Hunt will run at the next session.')) }}>Re-run the Treasure Hunt</Button>
        <p role="status">{huntMsg}</p>
      </div>
      <div className="panel">
        <h2>Reset everything</h2>
        <p>This deletes all progress, rewards and settings on this laptop. Download a backup first.</p>
        <input aria-label="Type RESET to confirm" value={confirmText} onChange={e => setConfirmText(e.target.value)} />{' '}
        <Button disabled={confirmText !== 'RESET'} onClick={() => void repo.db.delete().then(reload)}>Reset everything</Button>
      </div>
      <div className="panel">
        <h2>Problems log</h2>
        {errors.length === 0 ? <p className="muted">No problems recorded.</p> : <ul>{errors.map(e => <li key={e.id}>{when(e.at)} · {e.where}: {e.message}</li>)}</ul>}
      </div>
    </section>
  )
}

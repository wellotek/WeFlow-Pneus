import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { type UpdateSnapshot } from '@shared/updates'
import { APP_VERSION } from '@shared/version'
import { CHANNELS } from '@shared/channels'

let snapshot: UpdateSnapshot = {
  currentVersion: APP_VERSION,
  availableVersion: null,
  phase: 'idle',
  percent: 0,
  error: '',
  packaged: false,
  channel: 'latest',
  repository: 'wellotek/WeFlow-Pneus-updates'
}
let configured = false

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'update'
  return message.replace(/gh[pousr]_[A-Za-z0-9_]+/gi, '[redacted]').slice(0, 180)
}

function publish(): UpdateSnapshot {
  snapshot = {
    ...snapshot,
    currentVersion: app.isPackaged ? app.getVersion() : APP_VERSION,
    packaged: app.isPackaged,
    channel: 'latest',
    repository: 'wellotek/WeFlow-Pneus-updates',
    lastChecked: new Date().toISOString()
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(CHANNELS.UPDATER_STATUS_CHANGED, snapshot)
      win.webContents.send('updater:snapshot', snapshot)
    }
  }
  return { ...snapshot }
}

function apply(partial: Partial<UpdateSnapshot>): UpdateSnapshot {
  snapshot = { ...snapshot, ...partial }
  return publish()
}

function ensureUpdater(): void {
  if (configured) return
  configured = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    apply({ phase: 'checking', percent: 0, error: '' })
  })

  autoUpdater.on('update-available', (info) => {
    let releaseNotes: string | undefined
    if (typeof info?.releaseNotes === 'string') {
      releaseNotes = info.releaseNotes
    } else if (Array.isArray(info?.releaseNotes)) {
      releaseNotes = (info.releaseNotes as any[]).map((n) => n.note || '').join('\n')
    }
    apply({
      phase: 'available',
      availableVersion: info.version,
      releaseNotes,
      releaseDate: info.releaseDate,
      percent: 0,
      error: ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    apply({ phase: 'idle', availableVersion: null, percent: 0, error: '' })
  })

  autoUpdater.on('download-progress', (progress) => {
    apply({
      phase: 'downloading',
      percent: Math.round(Number(progress.percent) || 0),
      totalBytes: progress.total,
      transferredBytes: progress.transferred,
      error: ''
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    apply({
      phase: 'ready',
      availableVersion: info.version,
      percent: 100,
      error: ''
    })
  })

  autoUpdater.on('error', (error) => {
    apply({ phase: 'error', error: safeMessage(error) })
  })
}

export function getUpdateSnapshot(): UpdateSnapshot {
  ensureUpdater()
  return {
    ...snapshot,
    currentVersion: app.isPackaged ? app.getVersion() : APP_VERSION,
    packaged: app.isPackaged
  }
}

export async function checkForAppUpdates(): Promise<UpdateSnapshot> {
  ensureUpdater()
  if (!app.isPackaged) {
    return apply({
      phase: 'idle',
      error: 'Mode développement : vérification automatique inactive.'
    })
  }

  try {
    apply({ phase: 'checking', percent: 0, error: '' })
    const result = await autoUpdater.checkForUpdates()
    if (!result?.updateInfo?.version) {
      return apply({ phase: 'idle', availableVersion: null })
    }
    return { ...snapshot }
  } catch (error) {
    return apply({ phase: 'error', error: safeMessage(error) })
  }
}

export async function downloadAppUpdate(): Promise<void> {
  ensureUpdater()
  if (!app.isPackaged) {
    throw new Error('Mise à jour impossible en mode développement.')
  }
  apply({ phase: 'downloading', percent: 0, error: '' })
  await autoUpdater.downloadUpdate()
}

export function installAppUpdateAndRestart(): void {
  ensureUpdater()
  autoUpdater.quitAndInstall(false, true)
}

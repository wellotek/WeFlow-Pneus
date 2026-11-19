import { app, BrowserWindow, safeStorage, shell } from 'electron'
import path from 'node:path'
import { FileAndConsoleLogger } from './logger'
import { initDatabase } from './database/connection'
import { runMigrations } from './database/migrate'
import { LicenseService } from './license/service'
import { setLicenseService } from './license/guard'
import { registerIpcHandlers } from './ipc/register'
import { SettingsRepository } from './database/repositories/settings'
import { checkForAppUpdates } from './services/appUpdater'
import type { Cipher } from './license/installationId'

let mainWindow: BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createCipher(): Cipher {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      encrypt: (text: string) => safeStorage.encryptString(text),
      decrypt: (buffer: Buffer) => safeStorage.decryptString(buffer)
    }
  }
  // Base64 fallback if safeStorage is disabled in dev/container
  return {
    encrypt: (text: string) => Buffer.from(text, 'utf-8'),
    decrypt: (buffer: Buffer) => buffer.toString('utf-8')
  }
}

async function createWindow(initialZoomFactor = 1.0, onZoomChange?: (factor: number) => void): Promise<BrowserWindow> {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../../resources/icon.ico')

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'WeFlow Pneus',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.webContents.setZoomFactor(initialZoomFactor)
    win.show()
  })

  // Keyboard zoom controls: Ctrl + +, Ctrl + -, Ctrl + 0, Ctrl + =
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && !input.alt && !input.shift) {
      const key = input.key.toLowerCase()
      if (key === '+' || key === '=' || key === 'add') {
        event.preventDefault()
        const current = win.webContents.getZoomFactor()
        const next = Math.min(1.5, Math.round((current + 0.1) * 10) / 10)
        win.webContents.setZoomFactor(next)
        onZoomChange?.(next)
      } else if (key === '-' || key === 'subtract') {
        event.preventDefault()
        const current = win.webContents.getZoomFactor()
        const next = Math.max(0.8, Math.round((current - 0.1) * 10) / 10)
        win.webContents.setZoomFactor(next)
        onZoomChange?.(next)
      } else if (key === '0' || key === 'num0') {
        event.preventDefault()
        win.webContents.setZoomFactor(1.0)
        onZoomChange?.(1.0)
      }
    }
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    await win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData')
  const logger = new FileAndConsoleLogger(userDataDir)
  logger.info('WeFlow Pneus starting up', { version: app.getVersion() })

  const cipher = createCipher()
  const licenseService = new LicenseService({
    userDataDir,
    cipher,
    logger
  })
  setLicenseService(licenseService)

  const dbPath = path.join(userDataDir, 'weflow-pneus.db')
  const db = initDatabase(dbPath, logger)
  runMigrations(db, logger)

  registerIpcHandlers(db, dbPath, userDataDir)

  const settingsRepo = new SettingsRepository(db)
  const savedZoom = settingsRepo.getZoomFactor()

  mainWindow = await createWindow(savedZoom, (factor) => {
    settingsRepo.setZoomFactor(factor)
  })

  // Automatic update check after 3 seconds on startup, then every 3 hours
  setTimeout(() => {
    checkForAppUpdates().catch((err) => {
      logger.warn('Initial update check failed', { error: err?.message || String(err) })
    })
  }, 3000)

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000
  setInterval(() => {
    checkForAppUpdates().catch((err) => {
      logger.warn('Periodic update check failed', { error: err?.message || String(err) })
    })
  }, THREE_HOURS_MS)

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow(settingsRepo.getZoomFactor(), (factor) => {
        settingsRepo.setZoomFactor(factor)
      })
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import type { Logger } from '../logger'

export class BackupService {
  constructor(
    private dbPath: string,
    private defaultBackupDir: string,
    private logger?: Logger
  ) {}

  createBackup(targetDir?: string): { success: boolean; filePath: string } {
    const dir = targetDir || this.defaultBackupDir
    fs.mkdirSync(dir, { recursive: true })

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupName = `weflow-pneus-backup-${dateStr}.db`
    const backupPath = path.join(dir, backupName)

    // Using better-sqlite3 native backup API for consistency even while db is active
    const srcDb = new Database(this.dbPath)
    try {
      srcDb.backup(backupPath)
      this.logger?.info('Database backup created', { backupPath })
      return { success: true, filePath: backupPath }
    } finally {
      srcDb.close()
    }
  }

  restoreBackup(backupFilePath: string): { success: boolean } {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('Fichier de sauvegarde introuvable.')
    }

    // Verify file is a genuine readable SQLite DB
    try {
      const testDb = new Database(backupFilePath, { readonly: true })
      const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
      testDb.close()

      const tableNames = new Set(tables.map((t) => t.name))
      if (!tableNames.has('products') || !tableNames.has('sales') || !tableNames.has('store_profile')) {
        throw new Error('Le fichier de sauvegarde ne contient pas la structure WeFlow Pneus valide.')
      }
    } catch (e: any) {
      throw new Error(`Validation de la sauvegarde échouée: ${e.message}`)
    }

    // Safety backup of existing DB first
    this.createBackup()

    // Restore by copying over dbPath
    fs.copyFileSync(backupFilePath, this.dbPath)
    this.logger?.info('Database successfully restored from', { backupFilePath })
    return { success: true }
  }

  listBackups(customDir?: string): { fileName: string; filePath: string; size: number; createdAt: string }[] {
    const dir = customDir || this.defaultBackupDir
    if (!fs.existsSync(dir)) return []

    const files = fs.readdirSync(dir)
    const backups = files
      .filter((f) => f.startsWith('weflow-pneus-backup-') && f.endsWith('.db'))
      .map((f) => {
        const full = path.join(dir, f)
        const stat = fs.statSync(full)
        return {
          fileName: f,
          filePath: full,
          size: stat.size,
          createdAt: stat.mtime.toISOString()
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return backups
  }
}

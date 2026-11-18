import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import type { Logger } from '../logger'

let dbInstance: Database.Database | null = null

export function initDatabase(dbPathOrDir: string, logger?: Logger): Database.Database {
  if (dbInstance) return dbInstance

  let fullPath = dbPathOrDir
  if (!dbPathOrDir.endsWith('.db')) {
    fs.mkdirSync(dbPathOrDir, { recursive: true })
    fullPath = path.join(dbPathOrDir, 'weflow-pneus.db')
  } else {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  }

  const db = new Database(fullPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 5000')

  logger?.info('SQLite database initialized for WeFlow Pneus', { path: fullPath })
  dbInstance = db
  return db
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close()
    } catch {
      // ignore
    }
    dbInstance = null
  }
}

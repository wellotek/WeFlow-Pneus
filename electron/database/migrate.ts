import type Database from 'better-sqlite3'
import type { Logger } from '../logger'
import { migration001 } from './migrations/001_initial_schema'
import { migration002 } from './migrations/002_seed_initial_data'

export interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
}

const MIGRATIONS: Migration[] = [migration001, migration002]

export function runMigrations(db: Database.Database, logger?: Logger): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]
  const appliedSet = new Set(appliedRows.map((r) => r.version))

  for (const m of MIGRATIONS) {
    if (!appliedSet.has(m.version)) {
      logger?.info(`Applying migration ${m.version}: ${m.name}`)
      const applyMigration = db.transaction(() => {
        m.up(db)
        db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
          m.version,
          m.name,
          new Date().toISOString()
        )
      })
      applyMigration()
      logger?.info(`Migration ${m.version} applied successfully`)
    }
  }
}

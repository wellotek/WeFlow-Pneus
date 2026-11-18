import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { CashMovement, CashSession, PaymentMethod } from '@shared/types'

export class CashRepository {
  constructor(private db: Database.Database) {}

  getCurrentSession(): CashSession | null {
    const row = this.db
      .prepare("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
      .get()
    return (row as CashSession) || null
  }

  openSession(initialCash: number, notes?: string): CashSession {
    const current = this.getCurrentSession()
    if (current) throw new Error('Une session de caisse est déjà ouverte.')

    const id = randomUUID()
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    this.db
      .prepare(`
        INSERT INTO cash_sessions (
          id, session_date, opened_at, initial_cash, total_in, total_out, calculated_cash, notes, status
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, 'open')
      `)
      .run(id, today, now, initialCash, initialCash, notes || '')

    return this.getCurrentSession()!
  }

  closeSession(actualCash: number, notes?: string): CashSession {
    const current = this.getCurrentSession()
    if (!current) throw new Error('Aucune session de caisse ouverte à clôturer.')

    const now = new Date().toISOString()
    const diff = actualCash - current.calculated_cash

    this.db
      .prepare(`
        UPDATE cash_sessions SET
          closed_at = ?, actual_cash = ?, difference = ?, notes = CASE WHEN notes = '' THEN ? ELSE notes || '\n' || ? END, status = 'closed'
        WHERE id = ?
      `)
      .run(now, actualCash, diff, notes || '', notes || '', current.id)

    const row = this.db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(current.id)
    return row as CashSession
  }

  listMovements(sessionId?: string): CashMovement[] {
    let sql = 'SELECT * FROM cash_movements WHERE 1=1'
    const params: any[] = []
    if (sessionId) {
      sql += ' AND session_id = ?'
      params.push(sessionId)
    }
    sql += ' ORDER BY created_at DESC LIMIT 100'
    return this.db.prepare(sql).all(...params) as CashMovement[]
  }

  addMovement(
    type: 'in' | 'out',
    category: 'sale' | 'debt_payment' | 'expense' | 'supplier_payment' | 'deposit' | 'withdrawal',
    amount: number,
    paymentMethod: PaymentMethod,
    description: string
  ): CashMovement {
    let session = this.getCurrentSession()
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    if (!session) {
      // Auto-open session if none exists
      session = this.openSession(0, 'Ouverture automatique pour mouvement de caisse')
    }

    const id = randomUUID()
    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO cash_movements (
            id, session_id, type, category, amount, payment_method, description, date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(id, session!.id, type, category, amount, paymentMethod, description, today, now)

      if (type === 'in') {
        this.db
          .prepare(`
            UPDATE cash_sessions SET
              total_in = total_in + ?,
              calculated_cash = calculated_cash + ?
            WHERE id = ?
          `)
          .run(amount, paymentMethod === 'cash' ? amount : 0, session!.id)
      } else {
        this.db
          .prepare(`
            UPDATE cash_sessions SET
              total_out = total_out + ?,
              calculated_cash = calculated_cash - ?
            WHERE id = ?
          `)
          .run(amount, paymentMethod === 'cash' ? amount : 0, session!.id)
      }
    })

    tx()
    const row = this.db.prepare('SELECT * FROM cash_movements WHERE id = ?').get(id)
    return row as CashMovement
  }
}

import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Expense } from '@shared/types'
import { CashRepository } from './cash'

export class ExpensesRepository {
  private cashRepo: CashRepository

  constructor(private db: Database.Database) {
    this.cashRepo = new CashRepository(db)
  }

  list(): Expense[] {
    return this.db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all() as Expense[]
  }

  create(data: Omit<Expense, 'id' | 'created_at'>): Expense {
    const id = randomUUID()
    const now = new Date().toISOString()

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO expenses (id, date, category, amount, description, payment_method, paid_to, receipt_ref, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          data.date,
          data.category,
          data.amount,
          data.description.trim(),
          data.payment_method,
          data.paid_to || '',
          data.receipt_ref || '',
          now
        )

      this.cashRepo.addMovement('out', 'expense', data.amount, data.payment_method, `Dépense: ${data.description}`)
    })

    tx()
    const row = this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id)
    return row as Expense
  }

  delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    return res.changes > 0
  }
}

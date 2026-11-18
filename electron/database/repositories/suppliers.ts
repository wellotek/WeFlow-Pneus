import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Supplier } from '@shared/types'

export class SuppliersRepository {
  constructor(private db: Database.Database) {}

  list(search?: string): Supplier[] {
    let sql = 'SELECT * FROM suppliers WHERE 1=1'
    const params: any[] = []
    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR contact_person LIKE ? OR wilaya LIKE ?)'
      const term = `%${search.trim()}%`
      params.push(term, term, term, term)
    }
    sql += ' ORDER BY created_at DESC'
    return this.db.prepare(sql).all(...params) as Supplier[]
  }

  getById(id: string): Supplier | null {
    const row = this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
    return (row as Supplier) || null
  }

  create(data: Omit<Supplier, 'id' | 'balance_due' | 'created_at'>): Supplier {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO suppliers (id, name, phone, address, wilaya, contact_person, email, balance_due, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `)
      .run(
        id,
        data.name.trim(),
        data.phone.trim(),
        data.address || '',
        data.wilaya || '',
        data.contact_person || '',
        data.email || '',
        now
      )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Supplier>): Supplier {
    const existing = this.getById(id)
    if (!existing) throw new Error('Fournisseur introuvable')

    const updated = { ...existing, ...data }
    this.db
      .prepare(`
        UPDATE suppliers SET
          name = ?, phone = ?, address = ?, wilaya = ?, contact_person = ?, email = ?, balance_due = ?
        WHERE id = ?
      `)
      .run(
        updated.name,
        updated.phone,
        updated.address,
        updated.wilaya,
        updated.contact_person,
        updated.email,
        updated.balance_due,
        id
      )
    return this.getById(id)!
  }

  delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return res.changes > 0
  }
}

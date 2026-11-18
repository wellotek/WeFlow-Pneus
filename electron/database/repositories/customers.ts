import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Customer, CustomerVehicle } from '@shared/types'

export class CustomersRepository {
  constructor(private db: Database.Database) {}

  list(search?: string): Customer[] {
    let sql = `
      SELECT c.*, (SELECT COUNT(*) FROM customer_vehicles cv WHERE cv.customer_id = c.id) as vehicle_count
      FROM customers c
      WHERE 1=1
    `
    const params: any[] = []
    if (search && search.trim()) {
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.wilaya LIKE ?)'
      const term = `%${search.trim()}%`
      params.push(term, term, term, term)
    }
    sql += ' ORDER BY c.created_at DESC'
    return this.db.prepare(sql).all(...params) as Customer[]
  }

  getById(id: string): Customer | null {
    const row = this.db
      .prepare(`
        SELECT c.*, (SELECT COUNT(*) FROM customer_vehicles cv WHERE cv.customer_id = c.id) as vehicle_count
        FROM customers c WHERE c.id = ?
      `)
      .get(id)
    return (row as Customer) || null
  }

  create(data: Omit<Customer, 'id' | 'balance_due' | 'created_at'>): Customer {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO customers (id, type, name, phone, address, wilaya, email, notes, balance_due, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `)
      .run(
        id,
        data.type || 'individual',
        data.name.trim(),
        data.phone.trim(),
        data.address || '',
        data.wilaya || '',
        data.email || '',
        data.notes || '',
        now
      )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Customer>): Customer {
    const existing = this.getById(id)
    if (!existing) throw new Error('Client introuvable')

    const updated = { ...existing, ...data }
    this.db
      .prepare(`
        UPDATE customers SET
          type = ?, name = ?, phone = ?, address = ?, wilaya = ?, email = ?, notes = ?, balance_due = ?
        WHERE id = ?
      `)
      .run(
        updated.type,
        updated.name,
        updated.phone,
        updated.address,
        updated.wilaya,
        updated.email,
        updated.notes,
        updated.balance_due,
        id
      )
    return this.getById(id)!
  }

  delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    return res.changes > 0
  }

  getVehicles(customerId: string): CustomerVehicle[] {
    return this.db
      .prepare('SELECT * FROM customer_vehicles WHERE customer_id = ? ORDER BY created_at DESC')
      .all(customerId) as CustomerVehicle[]
  }

  createVehicle(data: Omit<CustomerVehicle, 'id' | 'created_at'>): CustomerVehicle {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO customer_vehicles (
          id, customer_id, brand, model, year, license_plate, mileage, front_dimension, rear_dimension, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        data.customer_id,
        data.brand.trim(),
        data.model.trim(),
        data.year || '',
        data.license_plate.trim().toUpperCase(),
        data.mileage || 0,
        data.front_dimension || '',
        data.rear_dimension || '',
        data.notes || '',
        now
      )
    const row = this.db.prepare('SELECT * FROM customer_vehicles WHERE id = ?').get(id)
    return row as CustomerVehicle
  }

  deleteVehicle(id: string): boolean {
    const res = this.db.prepare('DELETE FROM customer_vehicles WHERE id = ?').run(id)
    return res.changes > 0
  }
}

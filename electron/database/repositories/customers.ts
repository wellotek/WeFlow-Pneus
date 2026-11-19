import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Customer, CustomerVehicle } from '@shared/types'

export class CustomersRepository {
  constructor(private db: Database.Database) {}

  list(search?: string): Customer[] {
    let sql = `
      SELECT c.*, (SELECT COUNT(*) FROM customer_vehicles cv WHERE cv.customer_id = c.id AND (cv.is_archived = 0 OR cv.is_archived IS NULL)) as vehicle_count
      FROM customers c
      WHERE (c.is_archived = 0 OR c.is_archived IS NULL)
    `
    const params: any[] = []
    if (search && search.trim()) {
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ? OR c.wilaya LIKE ?)'
      const term = `%${search.trim()}%`
      params.push(term, term, term, term)
    }
    sql += ' ORDER BY c.created_at DESC'
    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => ({
      ...r,
      is_archived: Boolean(r.is_archived)
    }))
  }

  getById(id: string): Customer | null {
    const row = this.db
      .prepare(`
        SELECT c.*, (SELECT COUNT(*) FROM customer_vehicles cv WHERE cv.customer_id = c.id AND (cv.is_archived = 0 OR cv.is_archived IS NULL)) as vehicle_count
        FROM customers c WHERE c.id = ?
      `)
      .get(id) as any
    if (!row) return null
    return {
      ...row,
      is_archived: Boolean(row.is_archived)
    }
  }

  create(data: Partial<Customer>): Customer {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO customers (id, type, name, phone, address, wilaya, email, notes, photo_path, is_archived, balance_due, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
      `)
      .run(
        id,
        data.type || 'individual',
        (data.name || 'Client sans nom').trim(),
        (data.phone || '').trim(),
        data.address || '',
        data.wilaya || '',
        data.email || '',
        data.notes || '',
        data.photo_path || null,
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
          type = ?, name = ?, phone = ?, address = ?, wilaya = ?, email = ?,
          notes = ?, photo_path = ?, balance_due = ?
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
        updated.photo_path || null,
        updated.balance_due,
        id
      )
    return this.getById(id)!
  }

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE customers SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }

  delete(id: string): boolean {
    // Check if client has historical sales, quotes or warranties
    const countSales = this.db.prepare('SELECT COUNT(*) as count FROM sales WHERE customer_id = ?').get(id) as { count: number }
    const countQuotes = this.db.prepare('SELECT COUNT(*) as count FROM quotations WHERE customer_id = ?').get(id) as { count: number }

    if (countSales.count > 0 || countQuotes.count > 0) {
      // Never delete historical data; archive instead!
      return this.archive(id)
    }

    const res = this.db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    return res.changes > 0
  }

  getVehicles(customerId: string): CustomerVehicle[] {
    const rows = this.db
      .prepare('SELECT * FROM customer_vehicles WHERE customer_id = ? AND (is_archived = 0 OR is_archived IS NULL) ORDER BY created_at DESC')
      .all(customerId) as any[]
    return rows.map((r) => ({
      ...r,
      is_archived: Boolean(r.is_archived)
    }))
  }

  createVehicle(data: Partial<CustomerVehicle>): CustomerVehicle {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO customer_vehicles (
          id, customer_id, brand, model, year, license_plate, mileage, front_dimension, rear_dimension, photo_path, is_archived, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)
      .run(
        id,
        data.customer_id,
        data.brand || 'Non spécifié',
        data.model || 'Standard',
        data.year || '',
        (data.license_plate || '00000 000 00').trim(),
        data.mileage || 0,
        data.front_dimension || '',
        data.rear_dimension || '',
        data.photo_path || null,
        data.notes || '',
        now
      )

    const row = this.db.prepare('SELECT * FROM customer_vehicles WHERE id = ?').get(id) as any
    return {
      ...row,
      is_archived: Boolean(row.is_archived)
    }
  }

  updateVehicle(id: string, data: Partial<CustomerVehicle>): CustomerVehicle {
    const existing = this.db.prepare('SELECT * FROM customer_vehicles WHERE id = ?').get(id) as any
    if (!existing) throw new Error('Véhicule introuvable')

    const updated = { ...existing, ...data }
    this.db
      .prepare(`
        UPDATE customer_vehicles SET
          brand = ?, model = ?, year = ?, license_plate = ?, mileage = ?,
          front_dimension = ?, rear_dimension = ?, photo_path = ?, notes = ?
        WHERE id = ?
      `)
      .run(
        updated.brand,
        updated.model,
        updated.year,
        updated.license_plate,
        updated.mileage,
        updated.front_dimension,
        updated.rear_dimension,
        updated.photo_path || null,
        updated.notes,
        id
      )

    const row = this.db.prepare('SELECT * FROM customer_vehicles WHERE id = ?').get(id) as any
    return {
      ...row,
      is_archived: Boolean(row.is_archived)
    }
  }

  archiveVehicle(id: string): boolean {
    const res = this.db.prepare('UPDATE customer_vehicles SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }

  deleteVehicle(id: string): boolean {
    const countSales = this.db.prepare('SELECT COUNT(*) as count FROM sales WHERE vehicle_id = ?').get(id) as { count: number }
    if (countSales.count > 0) {
      return this.archiveVehicle(id)
    }
    const res = this.db.prepare('DELETE FROM customer_vehicles WHERE id = ?').run(id)
    return res.changes > 0
  }
}

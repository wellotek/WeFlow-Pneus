import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Service, ServiceOrder, ServiceOrderItem } from '@shared/types'

export class ServicesRepository {
  constructor(private db: Database.Database) {}

  private nextOrderNumber(): string {
    const row = this.db.prepare('SELECT next_number FROM document_sequences WHERE doc_type = ?').get('service_order') as {
      next_number: number
    }
    const num = row ? row.next_number : 1
    this.db
      .prepare('INSERT INTO document_sequences (doc_type, next_number) VALUES (?, ?) ON CONFLICT(doc_type) DO UPDATE SET next_number = next_number + 1')
      .run('service_order', num + 1)
    const year = new Date().getFullYear()
    return `OT-${year}-${String(num).padStart(4, '0')}`
  }

  listServices(): Service[] {
    return this.db.prepare('SELECT * FROM services ORDER BY category ASC, name ASC').all() as Service[]
  }

  createService(data: Omit<Service, 'id'>): Service {
    const id = randomUUID()
    this.db
      .prepare('INSERT INTO services (id, code, name, category, default_price, description) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, data.code.trim().toUpperCase(), data.name.trim(), data.category, data.default_price, data.description || '')
    const row = this.db.prepare('SELECT * FROM services WHERE id = ?').get(id)
    return row as Service
  }

  updateService(id: string, data: Partial<Service>): Service {
    const existing = this.db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined
    if (!existing) throw new Error('Service introuvable')
    const updated = { ...existing, ...data }
    this.db
      .prepare('UPDATE services SET code = ?, name = ?, category = ?, default_price = ?, description = ? WHERE id = ?')
      .run(updated.code, updated.name, updated.category, updated.default_price, updated.description, id)
    return this.db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service
  }

  deleteService(id: string): boolean {
    const res = this.db.prepare('DELETE FROM services WHERE id = ?').run(id)
    return res.changes > 0
  }

  listOrders(): ServiceOrder[] {
    const rows = this.db.prepare('SELECT * FROM service_orders ORDER BY date DESC, created_at DESC').all() as ServiceOrder[]
    return rows
  }

  getOrderById(id: string): ServiceOrder | null {
    const order = this.db.prepare('SELECT * FROM service_orders WHERE id = ?').get(id) as ServiceOrder | undefined
    if (!order) return null
    const items = this.db.prepare('SELECT * FROM service_order_items WHERE service_order_id = ?').all(id) as ServiceOrderItem[]
    return { ...order, items }
  }

  createOrder(data: {
    customer_id?: string | null
    customer_name?: string
    customer_phone?: string
    vehicle_info?: string
    license_plate?: string
    mileage?: number
    date: string
    technician_name?: string
    notes?: string
    items: {
      service_id: string
      service_name: string
      quantity: number
      unit_price: number
      notes?: string
    }[]
  }): ServiceOrder {
    const id = randomUUID()
    const orderNumber = this.nextOrderNumber()
    const now = new Date().toISOString()

    let totalAmount = 0
    for (const item of data.items) {
      totalAmount += item.quantity * item.unit_price
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO service_orders (
            id, order_number, customer_id, customer_name, customer_phone, vehicle_info,
            license_plate, mileage, date, technician_name, status, total_amount, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `)
        .run(
          id,
          orderNumber,
          data.customer_id || null,
          data.customer_name || 'Client Atelier',
          data.customer_phone || '',
          data.vehicle_info || '',
          data.license_plate || '',
          data.mileage || null,
          data.date,
          data.technician_name || 'Technicien Atelier',
          totalAmount,
          data.notes || '',
          now
        )

      const insertItem = this.db.prepare(`
        INSERT INTO service_order_items (
          id, service_order_id, service_id, service_name, quantity, unit_price, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of data.items) {
        insertItem.run(
          randomUUID(),
          id,
          item.service_id,
          item.service_name,
          item.quantity,
          item.unit_price,
          item.notes || ''
        )
      }
    })

    tx()
    return this.getOrderById(id)!
  }

  updateOrderStatus(id: string, status: string): ServiceOrder {
    this.db.prepare('UPDATE service_orders SET status = ? WHERE id = ?').run(status, id)
    return this.getOrderById(id)!
  }
}

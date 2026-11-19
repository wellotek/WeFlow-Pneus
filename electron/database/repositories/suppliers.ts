import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Supplier, SupplierPayment } from '@shared/types'

export class SuppliersRepository {
  constructor(private db: Database.Database) {}

  list(search?: string): Supplier[] {
    let sql = `
      SELECT s.*,
        COALESCE((SELECT SUM(total_amount) FROM purchases p WHERE p.supplier_id = s.id AND (p.is_archived = 0 OR p.is_archived IS NULL)), 0) as total_orders,
        COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id AND sp.payment_type = 'paiement'), 0) as total_paid,
        COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id AND sp.payment_type = 'acompte'), 0) as total_deposits
      FROM suppliers s
      WHERE (s.is_archived = 0 OR s.is_archived IS NULL)
    `
    const params: any[] = []
    if (search && search.trim()) {
      sql += ' AND (s.name LIKE ? OR s.phone LIKE ? OR s.contact_person LIKE ? OR s.wilaya LIKE ?)'
      const term = `%${search.trim()}%`
      params.push(term, term, term, term)
    }
    sql += ' ORDER BY s.name ASC'

    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => {
      const orders = Number(r.total_orders) || 0
      const paid = Number(r.total_paid) || 0
      const deposits = Number(r.total_deposits) || 0
      const balance = Math.max(0, orders - (paid + deposits))
      return {
        ...r,
        total_orders: orders,
        total_paid: paid,
        total_deposits: deposits,
        balance_due: balance,
        is_archived: Boolean(r.is_archived)
      }
    })
  }

  getById(id: string): Supplier | null {
    const row = this.db
      .prepare(`
        SELECT s.*,
          COALESCE((SELECT SUM(total_amount) FROM purchases p WHERE p.supplier_id = s.id AND (p.is_archived = 0 OR p.is_archived IS NULL)), 0) as total_orders,
          COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id AND sp.payment_type = 'paiement'), 0) as total_paid,
          COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id AND sp.payment_type = 'acompte'), 0) as total_deposits
        FROM suppliers s WHERE s.id = ?
      `)
      .get(id) as any

    if (!row) return null

    const orders = Number(row.total_orders) || 0
    const paid = Number(row.total_paid) || 0
    const deposits = Number(row.total_deposits) || 0
    const balance = Math.max(0, orders - (paid + deposits))

    return {
      ...row,
      total_orders: orders,
      total_paid: paid,
      total_deposits: deposits,
      balance_due: balance,
      is_archived: Boolean(row.is_archived)
    }
  }

  create(data: Partial<Supplier>): Supplier {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO suppliers (id, name, phone, address, wilaya, contact_person, email, balance_due, is_archived, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
      `)
      .run(
        id,
        (data.name || 'Fournisseur sans nom').trim(),
        (data.phone || '').trim(),
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
          name = ?, phone = ?, address = ?, wilaya = ?, contact_person = ?, email = ?
        WHERE id = ?
      `)
      .run(
        updated.name,
        updated.phone,
        updated.address,
        updated.wilaya,
        updated.contact_person,
        updated.email,
        id
      )
    return this.getById(id)!
  }

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE suppliers SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }

  delete(id: string): boolean {
    // Check if supplier has orders or payments
    const countPurchases = this.db.prepare('SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?').get(id) as { count: number }
    const countPayments = this.db.prepare('SELECT COUNT(*) as count FROM supplier_payments WHERE supplier_id = ?').get(id) as { count: number }

    if (countPurchases.count > 0 || countPayments.count > 0) {
      return this.archive(id)
    }

    const res = this.db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return res.changes > 0
  }

  // --- SUPPLIER PAYMENTS & ACOMPTES ---
  listPayments(supplierId?: string): SupplierPayment[] {
    let sql = 'SELECT * FROM supplier_payments'
    const params: any[] = []
    if (supplierId) {
      sql += ' WHERE supplier_id = ?'
      params.push(supplierId)
    }
    sql += ' ORDER BY date DESC, created_at DESC'
    return this.db.prepare(sql).all(...params) as SupplierPayment[]
  }

  addPayment(data: Omit<SupplierPayment, 'id' | 'created_at'>): SupplierPayment {
    const id = randomUUID()
    const now = new Date().toISOString()

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO supplier_payments (
            id, supplier_id, purchase_id, amount, payment_type, payment_method, date, reference_note, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          data.supplier_id,
          data.purchase_id || null,
          data.amount,
          data.payment_type || 'paiement',
          data.payment_method || 'cash',
          data.date || now.split('T')[0],
          data.reference_note || '',
          data.notes || '',
          now
        )

      // If tied to purchase, update purchase paid_amount
      if (data.purchase_id) {
        const purchase = this.db.prepare('SELECT * FROM purchases WHERE id = ?').get(data.purchase_id) as any
        if (purchase) {
          const newPaid = Number(purchase.paid_amount) + Number(data.amount)
          const newBalance = Math.max(0, Number(purchase.total_amount) - newPaid)
          this.db
            .prepare('UPDATE purchases SET paid_amount = ?, balance_due = ? WHERE id = ?')
            .run(newPaid, newBalance, data.purchase_id)
        }
      }
    })

    tx()

    return this.db.prepare('SELECT * FROM supplier_payments WHERE id = ?').get(id) as SupplierPayment
  }
}

import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Purchase, PurchaseItem } from '@shared/types'

export class PurchasesRepository {
  constructor(private db: Database.Database) {}

  private nextNumber(): string {
    const row = this.db.prepare('SELECT next_number FROM document_sequences WHERE doc_type = ?').get('purchase') as {
      next_number: number
    }
    const num = row ? row.next_number : 1
    this.db
      .prepare('INSERT INTO document_sequences (doc_type, next_number) VALUES (?, ?) ON CONFLICT(doc_type) DO UPDATE SET next_number = next_number + 1')
      .run('purchase', num + 1)
    const year = new Date().getFullYear()
    return `BC-${year}-${String(num).padStart(4, '0')}`
  }

  list(): Purchase[] {
    const rows = this.db.prepare('SELECT * FROM purchases ORDER BY date DESC, created_at DESC').all() as Purchase[]
    return rows
  }

  getById(id: string): Purchase | null {
    const purchase = this.db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as Purchase | undefined
    if (!purchase) return null
    const items = this.db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id) as PurchaseItem[]
    return { ...purchase, items }
  }

  create(data: {
    supplier_id: string
    supplier_name: string
    date: string
    paid_amount: number
    notes?: string
    items: {
      product_id: string
      reference: string
      brand: string
      dimension: string
      quantity: number
      unit_cost: number
    }[]
  }): Purchase {
    const id = randomUUID()
    const purchaseNumber = this.nextNumber()
    const now = new Date().toISOString()

    let totalAmount = 0
    for (const item of data.items) {
      totalAmount += item.quantity * item.unit_cost
    }
    const balanceDue = Math.max(0, totalAmount - (data.paid_amount || 0))

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO purchases (
            id, purchase_number, supplier_id, supplier_name, date, status,
            total_amount, paid_amount, balance_due, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, 'ordered', ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          purchaseNumber,
          data.supplier_id,
          data.supplier_name,
          data.date,
          totalAmount,
          data.paid_amount || 0,
          balanceDue,
          data.notes || '',
          now
        )

      const insertItem = this.db.prepare(`
        INSERT INTO purchase_items (
          id, purchase_id, product_id, reference, brand, dimension, quantity, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of data.items) {
        insertItem.run(
          randomUUID(),
          id,
          item.product_id,
          item.reference,
          item.brand,
          item.dimension,
          item.quantity,
          item.unit_cost,
          item.quantity * item.unit_cost
        )
      }

      // Update supplier balance if balance due
      if (balanceDue > 0) {
        this.db
          .prepare('UPDATE suppliers SET balance_due = balance_due + ? WHERE id = ?')
          .run(balanceDue, data.supplier_id)
      }
    })

    tx()
    return this.getById(id)!
  }

  receive(id: string): Purchase {
    const purchase = this.getById(id)
    if (!purchase) throw new Error('Achat introuvable')
    if (purchase.status === 'received') return purchase

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const tx = this.db.transaction(() => {
      // 1. Mark purchase as received
      this.db.prepare("UPDATE purchases SET status = 'received' WHERE id = ?").run(id)

      // 2. Increase stock and add stock movements
      const updateProductStock = this.db.prepare(`
        UPDATE products SET
          stock_quantity = stock_quantity + ?,
          buy_price = ?,
          updated_at = ?
        WHERE id = ?
      `)

      const insertMovement = this.db.prepare(`
        INSERT INTO stock_movements (
          id, product_id, type, quantity, unit_cost, reference_doc_type, reference_doc_id, reason, date, created_at
        ) VALUES (?, ?, 'in_purchase', ?, ?, 'purchase', ?, ?, ?, ?)
      `)

      for (const item of purchase.items || []) {
        updateProductStock.run(item.quantity, item.unit_cost, now, item.product_id)
        insertMovement.run(
          randomUUID(),
          item.product_id,
          item.quantity,
          item.unit_cost,
          purchase.purchase_number,
          `Réception achat fournisseur ${purchase.supplier_name}`,
          today,
          now
        )
      }
    })

    tx()
    return this.getById(id)!
  }

  delete(id: string): boolean {
    const purchase = this.getById(id)
    if (!purchase) return false
    if (purchase.status === 'received') {
      throw new Error('Impossible de supprimer un bon de réception validé. Utilisez un retour fournisseur.')
    }
    const res = this.db.prepare('DELETE FROM purchases WHERE id = ?').run(id)
    return res.changes > 0
  }
}

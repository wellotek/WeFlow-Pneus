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
    const rows = this.db
      .prepare('SELECT * FROM purchases WHERE (is_archived = 0 OR is_archived IS NULL) ORDER BY date DESC, created_at DESC')
      .all() as any[]

    return rows.map((r) => {
      const items = this.db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(r.id) as PurchaseItem[]
      return {
        ...r,
        is_archived: Boolean(r.is_archived),
        items
      }
    })
  }

  getById(id: string): Purchase | null {
    const purchase = this.db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as any
    if (!purchase) return null
    const items = this.db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id) as PurchaseItem[]
    return {
      ...purchase,
      is_archived: Boolean(purchase.is_archived),
      items
    }
  }

  create(data: {
    supplier_id: string
    supplier_name: string
    date: string
    expected_date?: string
    paid_amount?: number
    deposit_amount?: number
    notes?: string
    items: {
      product_id?: string | null
      reference: string
      brand?: string
      dimension?: string
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

    const paidOrDeposit = (data.deposit_amount || 0) + (data.paid_amount || 0)
    const balanceDue = Math.max(0, totalAmount - paidOrDeposit)

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO purchases (
            id, purchase_number, supplier_id, supplier_name, date, expected_date, status,
            total_amount, paid_amount, balance_due, notes, is_archived, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?, ?, ?, 0, ?)
        `)
        .run(
          id,
          purchaseNumber,
          data.supplier_id,
          data.supplier_name,
          data.date,
          data.expected_date || '',
          totalAmount,
          paidOrDeposit,
          balanceDue,
          data.notes || '',
          now
        )

      const insertItem = this.db.prepare(`
        INSERT INTO purchase_items (
          id, purchase_id, product_id, reference, brand, dimension, quantity, received_quantity, unit_cost, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)

      for (const item of data.items) {
        // If product does not exist, look up by reference or create placeholder
        let prodId = item.product_id
        if (!prodId) {
          const found = this.db.prepare('SELECT id FROM products WHERE reference = ?').get(item.reference) as any
          if (found) {
            prodId = found.id
          } else {
            prodId = randomUUID()
            this.db
              .prepare(`
                INSERT INTO products (
                  id, reference, product_code, barcode, brand, model_name, description, dimension,
                  width, height, diameter, load_index, speed_rating, tire_type, condition,
                  vehicle_category, buy_price, sell_price, wholesale_price, stock_quantity,
                  min_stock_alert, location, dot, is_archived, created_at, updated_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '', '', '', 'summer', 'new', 'passenger', ?, ?, ?, 0, 4, '', '', 0, ?, ?
                )
              `)
              .run(
                prodId,
                item.reference.trim().toUpperCase(),
                item.reference.trim(),
                `200${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                item.brand || 'Générique',
                item.reference,
                item.reference,
                item.dimension || 'Non spécifié',
                item.unit_cost,
                item.unit_cost * 1.25,
                item.unit_cost * 1.15,
                now,
                now
              )
          }
        }

        insertItem.run(
          randomUUID(),
          id,
          prodId,
          item.reference.trim().toUpperCase(),
          item.brand || 'Générique',
          item.dimension || 'Non spécifié',
          item.quantity,
          item.unit_cost,
          item.quantity * item.unit_cost
        )
      }

      // Record deposit / acompte in supplier_payments if any
      if (paidOrDeposit > 0) {
        this.db
          .prepare(`
            INSERT INTO supplier_payments (
              id, supplier_id, purchase_id, amount, payment_type, payment_method, date, reference_note, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, 'cash', ?, ?, 'Acompte / Règlement initial bon de commande', ?)
          `)
          .run(
            randomUUID(),
            data.supplier_id,
            id,
            paidOrDeposit,
            data.deposit_amount && data.deposit_amount > 0 ? 'acompte' : 'paiement',
            data.date,
            purchaseNumber,
            now
          )
      }
    })

    tx()
    return this.getById(id)!
  }

  receive(id: string): Purchase {
    const purchase = this.getById(id)
    if (!purchase) throw new Error('Achat introuvable')

    // Receive all remaining quantities
    const itemsToReceive = (purchase.items || []).map((it) => ({
      itemId: it.id,
      receivedQty: Math.max(0, it.quantity - (it.received_quantity || 0))
    }))

    return this.receiveItems(id, itemsToReceive)
  }

  receiveItems(id: string, receivedItems: { itemId: string; receivedQty: number }[]): Purchase {
    const purchase = this.getById(id)
    if (!purchase) throw new Error('Achat introuvable')

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const tx = this.db.transaction(() => {
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

      const updateItemReceived = this.db.prepare(`
        UPDATE purchase_items SET received_quantity = received_quantity + ? WHERE id = ?
      `)

      for (const rec of receivedItems) {
        if (rec.receivedQty <= 0) continue
        const item = purchase.items?.find((it) => it.id === rec.itemId)
        if (!item) continue

        updateItemReceived.run(rec.receivedQty, rec.itemId)
        updateProductStock.run(rec.receivedQty, item.unit_cost, now, item.product_id)
        insertMovement.run(
          randomUUID(),
          item.product_id,
          rec.receivedQty,
          item.unit_cost,
          purchase.purchase_number,
          `Réception achat fournisseur ${purchase.supplier_name} (${purchase.purchase_number})`,
          today,
          now
        )
      }

      // Check if all items fully received
      const updatedItems = this.db.prepare('SELECT quantity, received_quantity FROM purchase_items WHERE purchase_id = ?').all(id) as any[]
      const allReceived = updatedItems.every((it) => Number(it.received_quantity) >= Number(it.quantity))
      const anyReceived = updatedItems.some((it) => Number(it.received_quantity) > 0)

      if (allReceived) {
        this.db.prepare("UPDATE purchases SET status = 'received', received_at = ? WHERE id = ?").run(now, id)
      } else if (anyReceived) {
        this.db.prepare("UPDATE purchases SET status = 'partial_received' WHERE id = ?").run(id)
      }
    })

    tx()
    return this.getById(id)!
  }

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE purchases SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }

  delete(id: string): boolean {
    const purchase = this.getById(id)
    if (!purchase) return false
    if (purchase.status === 'received') {
      return this.archive(id)
    }
    const res = this.db.prepare('DELETE FROM purchases WHERE id = ?').run(id)
    return res.changes > 0
  }
}

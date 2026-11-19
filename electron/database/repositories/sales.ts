import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { PaymentMethod, Sale, SaleItem, SalePayment } from '@shared/types'

export class SalesRepository {
  private lastSaleTimestamp = 0
  private lastSaleFingerprint = ''

  constructor(private db: Database.Database) {}

  private nextInvoiceNumber(): string {
    const row = this.db.prepare('SELECT next_number FROM document_sequences WHERE doc_type = ?').get('invoice') as {
      next_number: number
    }
    const num = row ? row.next_number : 1
    this.db
      .prepare('INSERT INTO document_sequences (doc_type, next_number) VALUES (?, ?) ON CONFLICT(doc_type) DO UPDATE SET next_number = next_number + 1')
      .run('invoice', num + 1)
    const year = new Date().getFullYear()
    return `F-${year}-${String(num).padStart(4, '0')}`
  }

  list(filter?: { startDate?: string; endDate?: string; customerId?: string; status?: string }): Sale[] {
    let sql = 'SELECT * FROM sales WHERE (is_archived = 0 OR is_archived IS NULL)'
    const params: any[] = []

    if (filter?.startDate) {
      sql += ' AND date >= ?'
      params.push(filter.startDate)
    }
    if (filter?.endDate) {
      sql += ' AND date <= ?'
      params.push(filter.endDate)
    }
    if (filter?.customerId) {
      sql += ' AND customer_id = ?'
      params.push(filter.customerId)
    }
    if (filter?.status && filter.status !== 'all') {
      sql += ' AND status = ?'
      params.push(filter.status)
    }

    sql += ' ORDER BY date DESC, created_at DESC'
    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => ({
      ...r,
      is_archived: Boolean(r.is_archived)
    }))
  }

  getById(id: string): Sale | null {
    const sale = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any
    if (!sale) return null
    const items = this.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[]
    const payments = this.db.prepare('SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY date ASC').all(id) as SalePayment[]
    return {
      ...sale,
      is_archived: Boolean(sale.is_archived),
      items,
      payments
    }
  }

  getByInvoiceNumber(invNum: string): Sale | null {
    const sale = this.db.prepare('SELECT * FROM sales WHERE invoice_number = ?').get(invNum) as any
    if (!sale) return null
    return this.getById(sale.id)
  }

  create(data: {
    customer_id?: string | null
    customer_name?: string
    customer_phone?: string
    vehicle_id?: string | null
    vehicle_info?: string
    license_plate?: string
    mileage?: number
    date: string
    sale_type?: 'retail' | 'wholesale'
    tax_rate?: number
    discount_amount?: number
    paid_amount?: number
    payment_method?: PaymentMethod
    notes?: string
    items: {
      product_id?: string | null
      item_type: 'product' | 'service'
      reference: string
      designation: string
      quantity: number
      unit_price: number
      tax_rate?: number
    }[]
  }): Sale {
    // 0. Double-click idempotency guard (prevent creating 2 sales within 2 seconds with same payload)
    const nowMs = Date.now()
    const fingerprint = `${data.customer_name}_${data.customer_phone}_${data.items.length}_${data.items.map(i => `${i.reference}:${i.quantity}`).join(';')}`
    if (nowMs - this.lastSaleTimestamp < 2000 && this.lastSaleFingerprint === fingerprint) {
      const recentSale = this.db.prepare('SELECT id FROM sales ORDER BY created_at DESC LIMIT 1').get() as { id: string }
      if (recentSale) {
        return this.getById(recentSale.id)!
      }
    }
    this.lastSaleTimestamp = nowMs
    this.lastSaleFingerprint = fingerprint

    const profile = this.db.prepare('SELECT allow_negative_stock, is_tva_enabled, default_tax_rate FROM store_profile WHERE id = 1').get() as {
      allow_negative_stock: number
      is_tva_enabled: number
      default_tax_rate: number
    } | undefined
    const allowNegative = profile ? Boolean(profile.allow_negative_stock) : false
    const isTvaEnabled = profile?.is_tva_enabled === undefined ? true : Boolean(profile.is_tva_enabled)

    // 1. Check stock availability for products
    if (!allowNegative) {
      for (const item of data.items) {
        if (item.item_type === 'product' && item.product_id) {
          const prod = this.db
            .prepare('SELECT stock_quantity, reference, brand, model_name FROM products WHERE id = ?')
            .get(item.product_id) as { stock_quantity: number; reference: string; brand: string; model_name: string } | undefined
          if (!prod) {
            throw new Error(`Produit introuvable (${item.reference})`)
          }
          if (prod.stock_quantity < item.quantity) {
            throw new Error(
              `Stock insuffisant pour ${prod.brand} ${prod.model_name} (${prod.reference}). Disponible: ${prod.stock_quantity}, Demandé: ${item.quantity}`
            )
          }
        }
      }
    }

    // 2. Calculations
    let subtotal = 0
    let totalTax = 0
    const taxRate = isTvaEnabled ? (data.tax_rate ?? profile?.default_tax_rate ?? 19.0) : 0
    const discount = data.discount_amount ?? 0

    for (const item of data.items) {
      const lineTaxRate = isTvaEnabled ? (item.tax_rate ?? taxRate) : 0
      const lineTotal = item.quantity * item.unit_price
      subtotal += lineTotal
      totalTax += lineTotal * (lineTaxRate / 100)
    }

    const totalAmount = Math.max(0, subtotal + totalTax - discount)
    const paidAmount = Math.min(totalAmount, Math.max(0, data.paid_amount ?? totalAmount))
    const balanceDue = Math.max(0, totalAmount - paidAmount)
    const status = balanceDue === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'

    const id = randomUUID()
    const invoiceNumber = this.nextInvoiceNumber()
    const now = new Date().toISOString()
    const paymentMethod = data.payment_method ?? 'cash'

    const tx = this.db.transaction(() => {
      // Insert Sale
      this.db
        .prepare(`
          INSERT INTO sales (
            id, invoice_number, customer_id, customer_name, customer_phone,
            vehicle_id, vehicle_info, license_plate, mileage, date,
            sale_type, subtotal, tax_rate, tax_amount, discount_amount,
            total_amount, paid_amount, balance_due, payment_method, status, notes, is_archived, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `)
        .run(
          id,
          invoiceNumber,
          data.customer_id || null,
          data.customer_name || 'Client Passager',
          data.customer_phone || '',
          data.vehicle_id || null,
          data.vehicle_info || '',
          data.license_plate || '',
          data.mileage || null,
          data.date,
          data.sale_type || 'retail',
          subtotal,
          taxRate,
          totalTax,
          discount,
          totalAmount,
          paidAmount,
          balanceDue,
          paymentMethod,
          status,
          data.notes || '',
          now
        )

      // Insert Sale Items and update Stock
      const insertItem = this.db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, product_id, item_type, reference, designation, quantity, unit_price, tax_rate, total_line
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const decrementStock = this.db.prepare(`
        UPDATE products SET
          stock_quantity = stock_quantity - ?,
          updated_at = ?
        WHERE id = ?
      `)

      const insertStockMovement = this.db.prepare(`
        INSERT INTO stock_movements (
          id, product_id, type, quantity, unit_cost, reference_doc_type, reference_doc_id, reason, date, created_at
        ) VALUES (?, ?, 'out_sale', ?, ?, 'sale', ?, ?, ?, ?)
      `)

      for (const item of data.items) {
        const lineTaxRate = isTvaEnabled ? (item.tax_rate ?? taxRate) : 0
        const totalLine = item.quantity * item.unit_price * (1 + lineTaxRate / 100)
        insertItem.run(
          randomUUID(),
          id,
          item.product_id || null,
          item.item_type,
          item.reference,
          item.designation,
          item.quantity,
          item.unit_price,
          lineTaxRate,
          totalLine
        )

        if (item.item_type === 'product' && item.product_id) {
          decrementStock.run(item.quantity, now, item.product_id)

          const prod = this.db.prepare('SELECT buy_price FROM products WHERE id = ?').get(item.product_id) as {
            buy_price: number
          } | undefined
          const cost = prod ? prod.buy_price : 0

          insertStockMovement.run(
            randomUUID(),
            item.product_id,
            item.quantity,
            cost,
            invoiceNumber,
            `Vente facture ${invoiceNumber} à ${data.customer_name || 'Client'}`,
            data.date,
            now
          )
        }
      }

      // Record Initial Payment if paidAmount > 0
      if (paidAmount > 0) {
        this.db
          .prepare(`
            INSERT INTO sale_payments (id, sale_id, amount, payment_method, date, reference_note)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .run(randomUUID(), id, paidAmount, paymentMethod, data.date, `Règlement initial ${invoiceNumber}`)

        // Record in active cash session if cash
        const activeSession = this.db
          .prepare("SELECT id FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
          .get() as { id: string } | undefined
        if (activeSession) {
          this.db
            .prepare(`
              INSERT INTO cash_movements (id, session_id, type, category, amount, payment_method, description, date, created_at)
              VALUES (?, ?, 'in', 'sale', ?, ?, ?, ?, ?)
            `)
            .run(
              randomUUID(),
              activeSession.id,
              paidAmount,
              paymentMethod,
              `Paiement vente ${invoiceNumber}`,
              data.date,
              now
            )

          this.db
            .prepare('UPDATE cash_sessions SET total_in = total_in + ?, calculated_cash = calculated_cash + ? WHERE id = ?')
            .run(paidAmount, paymentMethod === 'cash' ? paidAmount : 0, activeSession.id)
        }
      }

      // Update customer balance due if customer provided and balance due > 0
      if (data.customer_id && balanceDue > 0) {
        this.db
          .prepare('UPDATE customers SET balance_due = balance_due + ? WHERE id = ?')
          .run(balanceDue, data.customer_id)
      }
    })

    tx()
    return this.getById(id)!
  }

  addPayment(saleId: string, amount: number, paymentMethod: PaymentMethod, note?: string): Sale {
    const sale = this.getById(saleId)
    if (!sale) throw new Error('Vente introuvable')
    if (sale.balance_due <= 0) throw new Error('Cette vente est déjà intégralement payée')

    const payAmount = Math.min(amount, sale.balance_due)
    const newPaid = sale.paid_amount + payAmount
    const newBalance = Math.max(0, sale.total_amount - newPaid)
    const newStatus = newBalance === 0 ? 'paid' : 'partial'
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const tx = this.db.transaction(() => {
      this.db
        .prepare('UPDATE sales SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?')
        .run(newPaid, newBalance, newStatus, saleId)

      this.db
        .prepare(`
          INSERT INTO sale_payments (id, sale_id, amount, payment_method, date, reference_note)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(randomUUID(), saleId, payAmount, paymentMethod, today, note || `Versement solde facture ${sale.invoice_number}`)

      if (sale.customer_id) {
        this.db
          .prepare('UPDATE customers SET balance_due = MAX(0, balance_due - ?) WHERE id = ?')
          .run(payAmount, sale.customer_id)
      }

      // Record in cash session
      const activeSession = this.db
        .prepare("SELECT id FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
        .get() as { id: string } | undefined
      if (activeSession) {
        this.db
          .prepare(`
            INSERT INTO cash_movements (id, session_id, type, category, amount, payment_method, description, date, created_at)
            VALUES (?, ?, 'in', 'debt_payment', ?, ?, ?, ?, ?)
          `)
          .run(
            randomUUID(),
            activeSession.id,
            payAmount,
            paymentMethod,
            `Versement différé facture ${sale.invoice_number}`,
            today,
            now
          )
        this.db
          .prepare('UPDATE cash_sessions SET total_in = total_in + ?, calculated_cash = calculated_cash + ? WHERE id = ?')
          .run(payAmount, paymentMethod === 'cash' ? payAmount : 0, activeSession.id)
      }
    })

    tx()
    return this.getById(saleId)!
  }

  cancel(id: string, reason?: string): boolean {
    const sale = this.getById(id)
    if (!sale) return false
    if (sale.status === 'cancelled') return true

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const tx = this.db.transaction(() => {
      // 1. Mark sale as cancelled with timestamp and reason
      this.db
        .prepare("UPDATE sales SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?, notes = notes || ? WHERE id = ?")
        .run(now, reason || 'Annulation par utilisateur', ` [ANNULÉE: ${reason || 'Annulation'}]`, id)

      // 2. Return products to stock and add reverse movements
      const incrementStock = this.db.prepare(`
        UPDATE products SET
          stock_quantity = stock_quantity + ?,
          updated_at = ?
        WHERE id = ?
      `)

      const insertMovement = this.db.prepare(`
        INSERT INTO stock_movements (
          id, product_id, type, quantity, unit_cost, reference_doc_type, reference_doc_id, reason, date, created_at
        ) VALUES (?, ?, 'return_in', ?, ?, 'sale_cancellation', ?, ?, ?, ?)
      `)

      for (const item of sale.items || []) {
        if (item.item_type === 'product' && item.product_id) {
          incrementStock.run(item.quantity, now, item.product_id)
          const prod = this.db.prepare('SELECT buy_price FROM products WHERE id = ?').get(item.product_id) as {
            buy_price: number
          } | undefined
          insertMovement.run(
            randomUUID(),
            item.product_id,
            item.quantity,
            prod?.buy_price || 0,
            sale.invoice_number,
            `Annulation vente ${sale.invoice_number}`,
            today,
            now
          )
        }
      }

      // 3. Revert customer debt if balance due was remaining
      if (sale.customer_id && sale.balance_due > 0) {
        this.db
          .prepare('UPDATE customers SET balance_due = MAX(0, balance_due - ?) WHERE id = ?')
          .run(sale.balance_due, sale.customer_id)
      }
    })

    tx()
    return true
  }

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE sales SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }
}

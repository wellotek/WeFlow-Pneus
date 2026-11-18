import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Quotation, QuotationItem, Sale } from '@shared/types'
import { SalesRepository } from './sales'

export class QuotationsRepository {
  private salesRepo: SalesRepository

  constructor(private db: Database.Database) {
    this.salesRepo = new SalesRepository(db)
  }

  private nextQuoteNumber(): string {
    const row = this.db.prepare('SELECT next_number FROM document_sequences WHERE doc_type = ?').get('quote') as {
      next_number: number
    }
    const num = row ? row.next_number : 1
    this.db
      .prepare('INSERT INTO document_sequences (doc_type, next_number) VALUES (?, ?) ON CONFLICT(doc_type) DO UPDATE SET next_number = next_number + 1')
      .run('quote', num + 1)
    const year = new Date().getFullYear()
    return `DEV-${year}-${String(num).padStart(4, '0')}`
  }

  list(): Quotation[] {
    const rows = this.db.prepare('SELECT * FROM quotations ORDER BY date DESC, created_at DESC').all() as Quotation[]
    return rows
  }

  getById(id: string): Quotation | null {
    const quote = this.db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as Quotation | undefined
    if (!quote) return null
    const items = this.db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(id) as QuotationItem[]
    return { ...quote, items }
  }

  create(data: {
    customer_id?: string | null
    customer_name?: string
    customer_phone?: string
    vehicle_info?: string
    date: string
    valid_until: string
    notes?: string
    items: {
      product_id?: string | null
      item_type: 'product' | 'service'
      reference: string
      designation: string
      quantity: number
      unit_price: number
    }[]
  }): Quotation {
    const id = randomUUID()
    const quoteNumber = this.nextQuoteNumber()
    const now = new Date().toISOString()

    let subtotal = 0
    for (const item of data.items) {
      subtotal += item.quantity * item.unit_price
    }
    const taxAmount = subtotal * 0.19
    const totalAmount = subtotal + taxAmount

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO quotations (
            id, quote_number, customer_id, customer_name, customer_phone, vehicle_info,
            date, valid_until, subtotal, tax_amount, total_amount, status, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        `)
        .run(
          id,
          quoteNumber,
          data.customer_id || null,
          data.customer_name || 'Client',
          data.customer_phone || '',
          data.vehicle_info || '',
          data.date,
          data.valid_until,
          subtotal,
          taxAmount,
          totalAmount,
          data.notes || '',
          now
        )

      const insertItem = this.db.prepare(`
        INSERT INTO quotation_items (
          id, quotation_id, product_id, item_type, reference, designation, quantity, unit_price, total_line
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of data.items) {
        insertItem.run(
          randomUUID(),
          id,
          item.product_id || null,
          item.item_type,
          item.reference,
          item.designation,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price * 1.19
        )
      }
    })

    tx()
    return this.getById(id)!
  }

  update(
    id: string,
    data: {
      customer_id?: string | null
      customer_name?: string
      customer_phone?: string
      vehicle_info?: string
      valid_until?: string
      notes?: string
      items?: {
        product_id?: string | null
        item_type: 'product' | 'service'
        reference: string
        designation: string
        quantity: number
        unit_price: number
      }[]
    }
  ): Quotation {
    const quote = this.getById(id)
    if (!quote) throw new Error('Devis introuvable')
    if (quote.status === 'converted') {
      throw new Error('Impossible de modifier un devis déjà converti en facture.')
    }

    const tx = this.db.transaction(() => {
      if (data.items) {
        this.db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id)
        let subtotal = 0
        const insertItem = this.db.prepare(`
          INSERT INTO quotation_items (
            id, quotation_id, product_id, item_type, reference, designation, quantity, unit_price, total_line
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const item of data.items) {
          subtotal += item.quantity * item.unit_price
          insertItem.run(
            randomUUID(),
            id,
            item.product_id || null,
            item.item_type,
            item.reference,
            item.designation,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price * 1.19
          )
        }
        const taxAmount = subtotal * 0.19
        const totalAmount = subtotal + taxAmount
        this.db
          .prepare(`
            UPDATE quotations SET
              customer_id = ?, customer_name = ?, customer_phone = ?, vehicle_info = ?,
              valid_until = ?, subtotal = ?, tax_amount = ?, total_amount = ?, notes = ?
            WHERE id = ?
          `)
          .run(
            data.customer_id ?? quote.customer_id,
            data.customer_name ?? quote.customer_name,
            data.customer_phone ?? quote.customer_phone,
            data.vehicle_info ?? quote.vehicle_info,
            data.valid_until ?? quote.valid_until,
            subtotal,
            taxAmount,
            totalAmount,
            data.notes ?? quote.notes,
            id
          )
      } else {
        this.db
          .prepare(`
            UPDATE quotations SET
              customer_id = ?, customer_name = ?, customer_phone = ?, vehicle_info = ?,
              valid_until = ?, notes = ?
            WHERE id = ?
          `)
          .run(
            data.customer_id ?? quote.customer_id,
            data.customer_name ?? quote.customer_name,
            data.customer_phone ?? quote.customer_phone,
            data.vehicle_info ?? quote.vehicle_info,
            data.valid_until ?? quote.valid_until,
            data.notes ?? quote.notes,
            id
          )
      }
    })

    tx()
    return this.getById(id)!
  }

  convertToSale(id: string): Sale {
    const quote = this.getById(id)
    if (!quote) throw new Error('Devis introuvable')
    if (quote.status === 'converted' && quote.converted_sale_id) {
      const existingSale = this.salesRepo.getById(quote.converted_sale_id)
      if (existingSale) return existingSale
    }

    const today = new Date().toISOString().split('T')[0]
    const saleItems = (quote.items || []).map((it) => ({
      product_id: it.product_id,
      item_type: it.item_type,
      reference: it.reference,
      designation: it.designation,
      quantity: it.quantity,
      unit_price: it.unit_price
    }))

    const sale = this.salesRepo.create({
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      vehicle_info: quote.vehicle_info,
      date: today,
      notes: `Converti depuis le devis ${quote.quote_number}`,
      items: saleItems
    })

    this.db
      .prepare("UPDATE quotations SET status = 'converted', converted_sale_id = ? WHERE id = ?")
      .run(sale.id, id)

    return sale
  }

  delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM quotations WHERE id = ?').run(id)
    return res.changes > 0
  }
}

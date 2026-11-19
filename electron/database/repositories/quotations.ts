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

  list(filter?: { search?: string; status?: string; is_archived?: boolean }): Quotation[] {
    let sql = 'SELECT * FROM quotations WHERE 1=1'
    const params: any[] = []

    if (filter?.is_archived !== undefined) {
      sql += ' AND is_archived = ?'
      params.push(filter.is_archived ? 1 : 0)
    } else {
      sql += ' AND (is_archived = 0 OR is_archived IS NULL)'
    }

    if (filter?.status) {
      sql += ' AND status = ?'
      params.push(filter.status)
    }

    if (filter?.search) {
      sql += ' AND (quote_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'
      const q = `%${filter.search}%`
      params.push(q, q, q)
    }

    sql += ' ORDER BY date DESC, created_at DESC'
    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => ({
      ...r,
      is_archived: Boolean(r.is_archived)
    }))
  }

  getById(id: string): Quotation | null {
    const quote = this.db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as any
    if (!quote) return null
    const items = this.db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(id) as QuotationItem[]
    return {
      ...quote,
      is_archived: Boolean(quote.is_archived),
      items
    }
  }

  create(data: {
    customer_id?: string | null
    customer_name?: string
    customer_phone?: string
    vehicle_info?: string
    date: string
    valid_until: string
    discount_amount?: number
    tax_rate?: number
    deposit_amount?: number
    notes?: string
    items: {
      product_id?: string | null
      item_type: 'product' | 'service'
      reference: string
      designation: string
      quantity: number
      unit_price: number
      discount_amount?: number
      tax_rate?: number
    }[]
  }): Quotation {
    const id = randomUUID()
    const quoteNumber = this.nextQuoteNumber()
    const now = new Date().toISOString()

    const profile = this.db.prepare('SELECT is_tva_enabled, default_tax_rate FROM store_profile WHERE id = 1').get() as {
      is_tva_enabled: number
      default_tax_rate: number
    } | undefined
    const isTvaEnabled = profile?.is_tva_enabled === undefined ? true : Boolean(profile.is_tva_enabled)
    const defaultTaxRate = isTvaEnabled ? (data.tax_rate ?? profile?.default_tax_rate ?? 19.0) : 0

    let subtotal = 0
    let totalTax = 0
    const globalDiscount = data.discount_amount || 0

    for (const item of data.items) {
      const lineBase = item.quantity * item.unit_price - (item.discount_amount || 0)
      const lineTaxRate = isTvaEnabled ? (item.tax_rate !== undefined ? item.tax_rate : defaultTaxRate) : 0
      const lineTax = (lineBase * lineTaxRate) / 100
      subtotal += lineBase
      totalTax += lineTax
    }

    const taxableBase = Math.max(0, subtotal - globalDiscount)
    const effectiveTax = isTvaEnabled ? (taxableBase * defaultTaxRate) / 100 : 0
    const totalAmount = Math.max(0, taxableBase + effectiveTax)
    const depositAmount = data.deposit_amount || 0

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO quotations (
            id, quote_number, customer_id, customer_name, customer_phone, vehicle_info,
            date, valid_until, subtotal, discount_amount, tax_rate, tax_amount, deposit_amount,
            total_amount, status, notes, is_archived, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, ?)
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
          globalDiscount,
          defaultTaxRate,
          effectiveTax,
          depositAmount,
          totalAmount,
          data.notes || '',
          now
        )

      const insertItem = this.db.prepare(`
        INSERT INTO quotation_items (
          id, quotation_id, product_id, item_type, reference, designation, quantity, unit_price,
          discount_amount, tax_rate, total_line
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of data.items) {
        const lineBase = item.quantity * item.unit_price - (item.discount_amount || 0)
        const lineTaxRate = isTvaEnabled ? (item.tax_rate !== undefined ? item.tax_rate : defaultTaxRate) : 0
        const lineTotal = lineBase + (lineBase * lineTaxRate) / 100
        insertItem.run(
          randomUUID(),
          id,
          item.product_id || null,
          item.item_type,
          item.reference,
          item.designation,
          item.quantity,
          item.unit_price,
          item.discount_amount || 0,
          lineTaxRate,
          lineTotal
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
      date?: string
      valid_until?: string
      discount_amount?: number
      tax_rate?: number
      deposit_amount?: number
      notes?: string
      status?: 'draft' | 'sent' | 'converted' | 'expired'
      items?: {
        product_id?: string | null
        item_type: 'product' | 'service'
        reference: string
        designation: string
        quantity: number
        unit_price: number
        discount_amount?: number
        tax_rate?: number
      }[]
    }
  ): Quotation {
    const quote = this.getById(id)
    if (!quote) throw new Error('Devis introuvable')
    if (quote.status === 'converted') {
      throw new Error('Impossible de modifier un devis déjà converti en facture.')
    }

    const profile = this.db.prepare('SELECT is_tva_enabled, default_tax_rate FROM store_profile WHERE id = 1').get() as {
      is_tva_enabled: number
      default_tax_rate: number
    } | undefined
    const isTvaEnabled = profile?.is_tva_enabled === undefined ? true : Boolean(profile.is_tva_enabled)
    const defaultTaxRate = isTvaEnabled ? (data.tax_rate ?? quote.tax_rate ?? profile?.default_tax_rate ?? 19.0) : 0

    const tx = this.db.transaction(() => {
      if (data.items) {
        this.db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id)
        let subtotal = 0
        const insertItem = this.db.prepare(`
          INSERT INTO quotation_items (
            id, quotation_id, product_id, item_type, reference, designation, quantity, unit_price,
            discount_amount, tax_rate, total_line
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const item of data.items) {
          const lineBase = item.quantity * item.unit_price - (item.discount_amount || 0)
          const lineTaxRate = isTvaEnabled ? (item.tax_rate !== undefined ? item.tax_rate : defaultTaxRate) : 0
          const lineTotal = lineBase + (lineBase * lineTaxRate) / 100
          subtotal += lineBase
          insertItem.run(
            randomUUID(),
            id,
            item.product_id || null,
            item.item_type,
            item.reference,
            item.designation,
            item.quantity,
            item.unit_price,
            item.discount_amount || 0,
            lineTaxRate,
            lineTotal
          )
        }

        const globalDiscount = data.discount_amount !== undefined ? data.discount_amount : (quote.discount_amount || 0)
        const taxableBase = Math.max(0, subtotal - globalDiscount)
        const effectiveTax = isTvaEnabled ? (taxableBase * defaultTaxRate) / 100 : 0
        const totalAmount = Math.max(0, taxableBase + effectiveTax)
        const depositAmount = data.deposit_amount !== undefined ? data.deposit_amount : (quote.deposit_amount || 0)

        this.db
          .prepare(`
            UPDATE quotations SET
              customer_id = ?, customer_name = ?, customer_phone = ?, vehicle_info = ?,
              date = COALESCE(?, date), valid_until = COALESCE(?, valid_until),
              subtotal = ?, discount_amount = ?, tax_rate = ?, tax_amount = ?, deposit_amount = ?,
              total_amount = ?, status = COALESCE(?, status), notes = COALESCE(?, notes)
            WHERE id = ?
          `)
          .run(
            data.customer_id !== undefined ? data.customer_id : quote.customer_id,
            data.customer_name ?? quote.customer_name,
            data.customer_phone ?? quote.customer_phone,
            data.vehicle_info ?? quote.vehicle_info,
            data.date ?? null,
            data.valid_until ?? null,
            subtotal,
            globalDiscount,
            defaultTaxRate,
            effectiveTax,
            depositAmount,
            totalAmount,
            data.status ?? null,
            data.notes ?? null,
            id
          )
      } else {
        this.db
          .prepare(`
            UPDATE quotations SET
              customer_id = COALESCE(?, customer_id),
              customer_name = COALESCE(?, customer_name),
              customer_phone = COALESCE(?, customer_phone),
              vehicle_info = COALESCE(?, vehicle_info),
              date = COALESCE(?, date),
              valid_until = COALESCE(?, valid_until),
              status = COALESCE(?, status),
              notes = COALESCE(?, notes)
            WHERE id = ?
          `)
          .run(
            data.customer_id ?? null,
            data.customer_name ?? null,
            data.customer_phone ?? null,
            data.vehicle_info ?? null,
            data.date ?? null,
            data.valid_until ?? null,
            data.status ?? null,
            data.notes ?? null,
            id
          )
      }
    })

    tx()
    return this.getById(id)!
  }

  duplicate(id: string): Quotation {
    const original = this.getById(id)
    if (!original) throw new Error('Devis introuvable')

    const today = new Date().toISOString().split('T')[0]
    const validUntilDate = new Date()
    validUntilDate.setDate(validUntilDate.getDate() + 30)
    const validUntil = validUntilDate.toISOString().split('T')[0]

    return this.create({
      customer_id: original.customer_id,
      customer_name: original.customer_name,
      customer_phone: original.customer_phone,
      vehicle_info: original.vehicle_info,
      date: today,
      valid_until: validUntil,
      discount_amount: original.discount_amount,
      tax_rate: original.tax_rate,
      deposit_amount: 0,
      notes: `Duplicata de ${original.quote_number}${original.notes ? ` — ${original.notes}` : ''}`,
      items: (original.items || []).map((it) => ({
        product_id: it.product_id,
        item_type: it.item_type,
        reference: it.reference,
        designation: it.designation,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_amount: it.discount_amount,
        tax_rate: it.tax_rate
      }))
    })
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
      unit_price: it.unit_price,
      discount_amount: it.discount_amount,
      tax_rate: it.tax_rate
    }))

    const sale = this.salesRepo.create({
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      vehicle_info: quote.vehicle_info,
      date: today,
      discount_amount: quote.discount_amount,
      tax_rate: quote.tax_rate,
      paid_amount: quote.deposit_amount || 0,
      notes: `Converti depuis le devis ${quote.quote_number}${quote.notes ? ` — ${quote.notes}` : ''}`,
      items: saleItems
    })

    this.db
      .prepare("UPDATE quotations SET status = 'converted', converted_sale_id = ? WHERE id = ?")
      .run(sale.id, id)

    return sale
  }

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE quotations SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }

  delete(id: string): boolean {
    const quote = this.getById(id)
    if (!quote) return false
    if (quote.status === 'converted') {
      // Soft-archive instead of hard deleting converted quotation to keep audit trail
      return this.archive(id)
    }
    const res = this.db.prepare('DELETE FROM quotations WHERE id = ?').run(id)
    return res.changes > 0
  }
}

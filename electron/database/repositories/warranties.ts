import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { WarrantyClaim } from '@shared/types'

export class WarrantiesRepository {
  constructor(private db: Database.Database) {}

  private nextClaimNumber(): string {
    const row = this.db.prepare('SELECT next_number FROM document_sequences WHERE doc_type = ?').get('warranty') as {
      next_number: number
    }
    const num = row ? row.next_number : 1
    this.db
      .prepare('INSERT INTO document_sequences (doc_type, next_number) VALUES (?, ?) ON CONFLICT(doc_type) DO UPDATE SET next_number = next_number + 1')
      .run('warranty', num + 1)
    const year = new Date().getFullYear()
    return `GAR-${year}-${String(num).padStart(4, '0')}`
  }

  list(): WarrantyClaim[] {
    return this.db.prepare('SELECT * FROM warranties ORDER BY claim_date DESC, created_at DESC').all() as WarrantyClaim[]
  }

  getById(id: string): WarrantyClaim | null {
    const row = this.db.prepare('SELECT * FROM warranties WHERE id = ?').get(id)
    return (row as WarrantyClaim) || null
  }

  create(data: Omit<WarrantyClaim, 'id' | 'claim_number' | 'created_at'>): WarrantyClaim {
    const id = randomUUID()
    const claimNumber = this.nextClaimNumber()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO warranties (
          id, claim_number, customer_id, customer_name, customer_phone,
          sale_id, invoice_number, product_id, product_ref,
          purchase_date, claim_date, reason, defect_description, status,
          resolution_notes, replacement_product_id, refund_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        claimNumber,
        data.customer_id || null,
        data.customer_name.trim(),
        data.customer_phone.trim(),
        data.sale_id || null,
        data.invoice_number || '',
        data.product_id || null,
        data.product_ref.trim(),
        data.purchase_date || '',
        data.claim_date,
        data.reason.trim(),
        data.defect_description.trim(),
        data.status || 'new',
        data.resolution_notes || '',
        data.replacement_product_id || null,
        data.refund_amount || 0,
        now
      )
    return this.getById(id)!
  }

  updateStatus(
    id: string,
    status: string,
    notes?: string,
    options?: { replacementProductId?: string; refundAmount?: number }
  ): WarrantyClaim {
    const claim = this.getById(id)
    if (!claim) throw new Error('Réclamation introuvable')

    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE warranties SET
            status = ?,
            resolution_notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN resolution_notes || '\n' || ? ELSE resolution_notes END,
            replacement_product_id = COALESCE(?, replacement_product_id),
            refund_amount = COALESCE(?, refund_amount)
          WHERE id = ?
        `)
        .run(
          status,
          notes,
          notes,
          notes,
          options?.replacementProductId || null,
          options?.refundAmount ?? null,
          id
        )

      // Handle stock movement if exchange performed
      if (status === 'replaced' && options?.replacementProductId) {
        this.db
          .prepare('UPDATE products SET stock_quantity = stock_quantity - 1, updated_at = ? WHERE id = ?')
          .run(now, options.replacementProductId)

        const prod = this.db.prepare('SELECT buy_price FROM products WHERE id = ?').get(options.replacementProductId) as {
          buy_price: number
        } | undefined

        this.db
          .prepare(`
            INSERT INTO stock_movements (
              id, product_id, type, quantity, unit_cost, reference_doc_type, reference_doc_id, reason, date, created_at
            ) VALUES (?, ?, 'out_sale', 1, ?, 'warranty_exchange', ?, ?, ?, ?)
          `)
          .run(
            randomUUID(),
            options.replacementProductId,
            prod?.buy_price || 0,
            claim.claim_number,
            `Échange sous garantie réclamation ${claim.claim_number}`,
            today,
            now
          )
      }
    })

    tx()
    return this.getById(id)!
  }
}

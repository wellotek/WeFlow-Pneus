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

  list(filter?: { is_archived?: boolean; status?: string }): WarrantyClaim[] {
    let sql = 'SELECT * FROM warranties WHERE 1=1'
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

    sql += ' ORDER BY claim_date DESC, created_at DESC'
    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => ({
      ...r,
      is_archived: Boolean(r.is_archived)
    }))
  }

  getById(id: string): WarrantyClaim | null {
    const row = this.db.prepare('SELECT * FROM warranties WHERE id = ?').get(id) as any
    if (!row) return null
    return {
      ...row,
      is_archived: Boolean(row.is_archived)
    }
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
          resolution_notes, replacement_product_id, refund_amount, is_archived, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
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

  update(id: string, data: Partial<WarrantyClaim>): WarrantyClaim {
    const claim = this.getById(id)
    if (!claim) throw new Error('Réclamation introuvable')

    const now = new Date().toISOString()
    const isResolved = data.status && ['resolved', 'closed', 'refunded', 'replaced'].includes(data.status)
    const resolvedAt = isResolved ? now : claim.resolved_at

    this.db
      .prepare(`
        UPDATE warranties SET
          customer_name = COALESCE(?, customer_name),
          customer_phone = COALESCE(?, customer_phone),
          product_ref = COALESCE(?, product_ref),
          reason = COALESCE(?, reason),
          defect_description = COALESCE(?, defect_description),
          status = COALESCE(?, status),
          resolution_notes = COALESCE(?, resolution_notes),
          replacement_product_id = COALESCE(?, replacement_product_id),
          refund_amount = COALESCE(?, refund_amount),
          resolved_at = COALESCE(?, resolved_at)
        WHERE id = ?
      `)
      .run(
        data.customer_name ?? null,
        data.customer_phone ?? null,
        data.product_ref ?? null,
        data.reason ?? null,
        data.defect_description ?? null,
        data.status ?? null,
        data.resolution_notes ?? null,
        data.replacement_product_id ?? null,
        data.refund_amount ?? null,
        resolvedAt ?? null,
        id
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
    const isResolved = ['closed', 'refunded', 'replaced'].includes(status)
    const resolvedAt = isResolved ? now : claim.resolved_at

    const tx = this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE warranties SET
            status = ?,
            resolution_notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN resolution_notes || '\n' || ? ELSE resolution_notes END,
            replacement_product_id = COALESCE(?, replacement_product_id),
            refund_amount = COALESCE(?, refund_amount),
            resolved_at = COALESCE(?, resolved_at)
          WHERE id = ?
        `)
        .run(
          status,
          notes ?? null,
          notes ?? null,
          notes ?? null,
          options?.replacementProductId || null,
          options?.refundAmount ?? null,
          resolvedAt ?? null,
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

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE warranties SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }
}

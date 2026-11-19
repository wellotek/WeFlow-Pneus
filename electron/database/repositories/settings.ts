import type Database from 'better-sqlite3'
import type { StoreProfile, TaxRate } from '@shared/types'
import crypto from 'node:crypto'

export class SettingsRepository {
  constructor(private db: Database.Database) {}

  getProfile(): StoreProfile {
    const row = this.db.prepare('SELECT * FROM store_profile WHERE id = 1').get() as any
    if (!row) {
      return {
        store_name: 'WeFlow Pneus',
        phone: '0555 12 34 56',
        address: 'Zone Industrielle, Lot 14',
        wilaya: 'Alger',
        email: 'contact@weflow-pneus.dz',
        default_tax_rate: 19.0,
        is_tva_enabled: true,
        zoom_factor: 1.0,
        ticket_format: '80mm',
        auto_backup_enabled: true,
        language: 'fr',
        allow_negative_stock: false
      }
    }
    return {
      store_name: row.store_name,
      phone: row.phone,
      address: row.address,
      wilaya: row.wilaya,
      email: row.email || '',
      rc_number: row.rc_number || '',
      nif_number: row.nif_number || '',
      nis_number: row.nis_number || '',
      ai_number: row.ai_number || '',
      default_tax_rate: row.default_tax_rate ?? 19.0,
      is_tva_enabled: row.is_tva_enabled === undefined ? true : Boolean(row.is_tva_enabled),
      zoom_factor: row.zoom_factor || 1.0,
      default_printer: row.default_printer || '',
      default_label_printer: row.default_label_printer || '',
      ticket_format: row.ticket_format || '80mm',
      invoice_footer: row.invoice_footer || '',
      backup_directory: row.backup_directory || '',
      auto_backup_enabled: Boolean(row.auto_backup_enabled),
      language: row.language || 'fr',
      allow_negative_stock: Boolean(row.allow_negative_stock)
    }
  }

  updateProfile(profile: Partial<StoreProfile>): StoreProfile {
    const current = this.getProfile()
    const merged = { ...current, ...profile }

    this.db
      .prepare(`
        UPDATE store_profile SET
          store_name = ?, phone = ?, address = ?, wilaya = ?, email = ?,
          rc_number = ?, nif_number = ?, nis_number = ?, ai_number = ?,
          default_tax_rate = ?, is_tva_enabled = ?, zoom_factor = ?,
          default_printer = ?, default_label_printer = ?,
          ticket_format = ?, invoice_footer = ?, backup_directory = ?,
          auto_backup_enabled = ?, language = ?, allow_negative_stock = ?
        WHERE id = 1
      `)
      .run(
        merged.store_name,
        merged.phone,
        merged.address,
        merged.wilaya,
        merged.email || '',
        merged.rc_number || '',
        merged.nif_number || '',
        merged.nis_number || '',
        merged.ai_number || '',
        merged.default_tax_rate,
        merged.is_tva_enabled ? 1 : 0,
        merged.zoom_factor || 1.0,
        merged.default_printer || '',
        merged.default_label_printer || '',
        merged.ticket_format,
        merged.invoice_footer || '',
        merged.backup_directory || '',
        merged.auto_backup_enabled ? 1 : 0,
        merged.language,
        merged.allow_negative_stock ? 1 : 0
      )

    return this.getProfile()
  }

  getZoomFactor(): number {
    const profile = this.getProfile()
    return profile.zoom_factor || 1.0
  }

  setZoomFactor(factor: number): number {
    const clamped = Math.max(0.8, Math.min(1.5, Math.round(factor * 100) / 100))
    this.db.prepare('UPDATE store_profile SET zoom_factor = ? WHERE id = 1').run(clamped)
    return clamped
  }

  // --- TAX RATES ---
  listTaxRates(includeInactive = false): TaxRate[] {
    const sql = includeInactive
      ? 'SELECT * FROM tax_rates ORDER BY rate DESC'
      : 'SELECT * FROM tax_rates WHERE is_active = 1 ORDER BY rate DESC'
    const rows = this.db.prepare(sql).all() as any[]
    return rows.map((r) => ({
      id: r.id,
      rate: Number(r.rate),
      label: r.label,
      name: r.label,
      is_default: Boolean(r.is_default),
      is_active: Boolean(r.is_active),
      created_at: r.created_at
    }))
  }

  createTaxRate(data: Omit<TaxRate, 'id' | 'created_at'>): TaxRate {
    const id = `tax_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const label = data.label || data.name || `${data.rate}%`

    if (data.is_default) {
      this.db.prepare('UPDATE tax_rates SET is_default = 0').run()
    }

    this.db
      .prepare(`
        INSERT INTO tax_rates (id, rate, label, is_default, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(id, data.rate, label, data.is_default ? 1 : 0, data.is_active ? 1 : 0, now)

    return {
      id,
      rate: data.rate,
      label,
      name: label,
      is_default: data.is_default,
      is_active: data.is_active,
      created_at: now
    }
  }

  updateTaxRate(id: string, data: Partial<TaxRate>): TaxRate {
    const existing = this.db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(id) as any
    if (!existing) throw new Error('Taux de TVA introuvable')

    if (data.is_default) {
      this.db.prepare('UPDATE tax_rates SET is_default = 0 WHERE id != ?').run(id)
    }

    const merged = {
      rate: data.rate !== undefined ? data.rate : existing.rate,
      label: data.label !== undefined ? data.label : (data.name !== undefined ? data.name : existing.label),
      name: data.label !== undefined ? data.label : (data.name !== undefined ? data.name : existing.label),
      is_default: data.is_default !== undefined ? data.is_default : Boolean(existing.is_default),
      is_active: data.is_active !== undefined ? data.is_active : Boolean(existing.is_active)
    }

    this.db
      .prepare(`
        UPDATE tax_rates SET rate = ?, label = ?, is_default = ?, is_active = ?
        WHERE id = ?
      `)
      .run(merged.rate, merged.label, merged.is_default ? 1 : 0, merged.is_active ? 1 : 0, id)

    return {
      id,
      ...merged,
      created_at: existing.created_at
    }
  }

  deleteTaxRate(id: string): boolean {
    const existing = this.db.prepare('SELECT * FROM tax_rates WHERE id = ?').get(id) as any
    if (!existing) return false

    // Check if used in historical sales
    const countUsed = this.db
      .prepare('SELECT COUNT(*) as count FROM sale_items WHERE tax_rate = ?')
      .get(existing.rate) as { count: number }

    if (countUsed.count > 0) {
      // Soft disable instead of delete to preserve historical integrity
      this.db.prepare('UPDATE tax_rates SET is_active = 0, is_default = 0 WHERE id = ?').run(id)
      return true
    }

    this.db.prepare('DELETE FROM tax_rates WHERE id = ?').run(id)
    return true
  }
}

import type Database from 'better-sqlite3'
import type { StoreProfile } from '@shared/types'

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
          default_tax_rate = ?, default_printer = ?, default_label_printer = ?,
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
}

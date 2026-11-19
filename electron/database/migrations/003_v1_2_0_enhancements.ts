import type Database from 'better-sqlite3'
import type { Migration } from '../migrate'

export const migration003: Migration = {
  version: 3,
  name: 'v1_2_0_enhancements',
  up: (db: Database.Database) => {
    // 1. Dedicated Tax Rates Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tax_rates (
        id TEXT PRIMARY KEY,
        rate REAL NOT NULL,
        label TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
    `)

    // Seed default Algerian VAT rates if empty
    const countTax = db.prepare('SELECT COUNT(*) as count FROM tax_rates').get() as { count: number }
    if (countTax.count === 0) {
      const now = new Date().toISOString()
      const insertTax = db.prepare(
        'INSERT INTO tax_rates (id, rate, label, is_default, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      insertTax.run('tax_19', 19.0, 'TVA Normale (19%)', 1, 1, now)
      insertTax.run('tax_9', 9.0, 'TVA Réduite (9%)', 0, 1, now)
      insertTax.run('tax_0', 0.0, 'Exonéré (0%)', 0, 1, now)
    }

    // Helper to add column safely
    const addColumnIfNotExists = (table: string, column: string, definition: string) => {
      const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
      const exists = tableInfo.some((col) => col.name === column)
      if (!exists) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`)
      }
    }

    // 2. Store Profile enhancements (TVA toggle, Zoom Factor)
    addColumnIfNotExists('store_profile', 'is_tva_enabled', 'INTEGER NOT NULL DEFAULT 1')
    addColumnIfNotExists('store_profile', 'zoom_factor', 'REAL NOT NULL DEFAULT 1.0')

    // 3. Products enhancements (Images, Product type, Archiving)
    addColumnIfNotExists('products', 'image_path', 'TEXT')
    addColumnIfNotExists('products', 'product_type', "TEXT NOT NULL DEFAULT 'pneu'")
    addColumnIfNotExists('products', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')

    // 4. Customers & Customer Vehicles enhancements (Photos, Archiving)
    addColumnIfNotExists('customers', 'photo_path', 'TEXT')
    addColumnIfNotExists('customers', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfNotExists('customer_vehicles', 'photo_path', 'TEXT')
    addColumnIfNotExists('customer_vehicles', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')

    // 5. Suppliers enhancements (Archiving)
    addColumnIfNotExists('suppliers', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')

    // 6. Supplier Payments table (Acomptes & Règlements)
    db.exec(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        purchase_id TEXT,
        amount REAL NOT NULL,
        payment_type TEXT NOT NULL DEFAULT 'paiement', -- 'acompte' | 'paiement'
        payment_method TEXT NOT NULL DEFAULT 'cash',
        date TEXT NOT NULL,
        reference_note TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
    `)

    // 7. Purchases & Purchase Items enhancements (Archiving, Received quantity for partial reception)
    addColumnIfNotExists('purchases', 'expected_date', 'TEXT')
    addColumnIfNotExists('purchases', 'deposit_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfNotExists('purchases', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfNotExists('purchases', 'received_at', 'TEXT')
    addColumnIfNotExists('purchase_items', 'received_quantity', 'INTEGER NOT NULL DEFAULT 0')

    // 8. Sales enhancements (Archiving, Cancellation audit)
    addColumnIfNotExists('sales', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfNotExists('sales', 'cancelled_at', 'TEXT')
    addColumnIfNotExists('sales', 'cancel_reason', 'TEXT')

    // 9. Quotations enhancements (Archiving, Discounts, TVA)
    addColumnIfNotExists('quotations', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfNotExists('quotations', 'discount_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfNotExists('quotations', 'tax_rate', 'REAL NOT NULL DEFAULT 19.0')
    addColumnIfNotExists('quotations', 'deposit_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfNotExists('quotation_items', 'discount_amount', 'REAL NOT NULL DEFAULT 0')
    addColumnIfNotExists('quotation_items', 'tax_rate', 'REAL NOT NULL DEFAULT 19.0')

    // 10. Warranties enhancements (Archiving, Resolution timestamp)
    addColumnIfNotExists('warranties', 'is_archived', 'INTEGER NOT NULL DEFAULT 0')
    addColumnIfNotExists('warranties', 'resolved_at', 'TEXT')
  }
}

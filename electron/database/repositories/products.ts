import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Product, TireFilter } from '@shared/types'

export class ProductsRepository {
  constructor(private db: Database.Database) {}

  list(filter?: TireFilter): Product[] {
    let sql = 'SELECT * FROM products WHERE 1=1'
    const params: any[] = []

    if (filter?.search) {
      sql += ' AND (reference LIKE ? OR brand LIKE ? OR model_name LIKE ? OR dimension LIKE ? OR barcode LIKE ?)'
      const term = `%${filter.search.trim()}%`
      params.push(term, term, term, term, term)
    }

    if (filter?.brand && filter.brand !== 'all') {
      sql += ' AND brand = ?'
      params.push(filter.brand)
    }

    if (filter?.dimension && filter.dimension !== 'all') {
      sql += ' AND dimension = ?'
      params.push(filter.dimension)
    }

    if (filter?.tire_type && filter.tire_type !== 'all') {
      sql += ' AND tire_type = ?'
      params.push(filter.tire_type)
    }

    if (filter?.condition && filter.condition !== 'all') {
      sql += ' AND condition = ?'
      params.push(filter.condition)
    }

    if (filter?.vehicle_category && filter.vehicle_category !== 'all') {
      sql += ' AND vehicle_category = ?'
      params.push(filter.vehicle_category)
    }

    if (filter?.stock_status === 'in_stock') {
      sql += ' AND stock_quantity > 0'
    } else if (filter?.stock_status === 'low_stock') {
      sql += ' AND stock_quantity <= min_stock_alert AND stock_quantity > 0'
    } else if (filter?.stock_status === 'out_of_stock') {
      sql += ' AND stock_quantity <= 0'
    }

    sql += ' ORDER BY brand ASC, model_name ASC'
    return this.db.prepare(sql).all(...params) as Product[]
  }

  getById(id: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    return (row as Product) || null
  }

  getByReference(ref: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE reference = ?').get(ref)
    return (row as Product) || null
  }

  create(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const id = randomUUID()
    const now = new Date().toISOString()
    const barcode = data.barcode || `200${Math.floor(1000000000 + Math.random() * 9000000000)}`

    this.db
      .prepare(`
        INSERT INTO products (
          id, reference, product_code, barcode, brand, model_name, description, dimension,
          width, height, diameter, load_index, speed_rating, tire_type, condition,
          vehicle_category, buy_price, sell_price, wholesale_price, stock_quantity,
          min_stock_alert, location, dot, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)
      .run(
        id,
        data.reference.trim().toUpperCase(),
        data.product_code || data.reference,
        barcode,
        data.brand.trim(),
        data.model_name.trim(),
        data.description || '',
        data.dimension.trim(),
        data.width,
        data.height,
        data.diameter.trim().toUpperCase(),
        data.load_index.trim(),
        data.speed_rating.trim().toUpperCase(),
        data.tire_type,
        data.condition,
        data.vehicle_category,
        data.buy_price,
        data.sell_price,
        data.wholesale_price || 0,
        data.stock_quantity,
        data.min_stock_alert,
        data.location || '',
        data.dot || '',
        now,
        now
      )

    if (data.stock_quantity > 0) {
      this.db
        .prepare(`
          INSERT INTO stock_movements (
            id, product_id, type, quantity, unit_cost, reference_doc_type, reference_doc_id, reason, date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          randomUUID(),
          id,
          'adjustment_plus',
          data.stock_quantity,
          data.buy_price,
          'product_creation',
          id,
          'Stock initial lors de la création du produit',
          now.split('T')[0],
          now
        )
    }

    return this.getById(id)!
  }

  update(id: string, data: Partial<Product>): Product {
    const existing = this.getById(id)
    if (!existing) throw new Error('Produit introuvable')

    const now = new Date().toISOString()
    const updated = { ...existing, ...data, updated_at: now }

    this.db
      .prepare(`
        UPDATE products SET
          reference = ?, product_code = ?, barcode = ?, brand = ?, model_name = ?,
          description = ?, dimension = ?, width = ?, height = ?, diameter = ?,
          load_index = ?, speed_rating = ?, tire_type = ?, condition = ?,
          vehicle_category = ?, buy_price = ?, sell_price = ?, wholesale_price = ?,
          stock_quantity = ?, min_stock_alert = ?, location = ?, dot = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        updated.reference,
        updated.product_code,
        updated.barcode,
        updated.brand,
        updated.model_name,
        updated.description,
        updated.dimension,
        updated.width,
        updated.height,
        updated.diameter,
        updated.load_index,
        updated.speed_rating,
        updated.tire_type,
        updated.condition,
        updated.vehicle_category,
        updated.buy_price,
        updated.sell_price,
        updated.wholesale_price,
        updated.stock_quantity,
        updated.min_stock_alert,
        updated.location,
        updated.dot,
        now,
        id
      )

    return this.getById(id)!
  }

  delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return res.changes > 0
  }

  searchDimensions(query: string): string[] {
    const term = `%${query.trim()}%`
    const rows = this.db
      .prepare('SELECT DISTINCT dimension FROM products WHERE dimension LIKE ? ORDER BY dimension ASC LIMIT 20')
      .all(term) as { dimension: string }[]
    return rows.map((r) => r.dimension)
  }

  adjustStock(productId: string, quantityDelta: number, reason: string): Product {
    const product = this.getById(productId)
    if (!product) throw new Error('Produit introuvable')

    const newQuantity = product.stock_quantity + quantityDelta
    const now = new Date().toISOString()

    const tx = this.db.transaction(() => {
      this.db
        .prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?')
        .run(newQuantity, now, productId)

      this.db
        .prepare(`
          INSERT INTO stock_movements (
            id, product_id, type, quantity, unit_cost, reason, date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          randomUUID(),
          productId,
          quantityDelta >= 0 ? 'adjustment_plus' : 'adjustment_minus',
          Math.abs(quantityDelta),
          product.buy_price,
          reason,
          now.split('T')[0],
          now
        )
    })
    tx()

    return this.getById(productId)!
  }
}

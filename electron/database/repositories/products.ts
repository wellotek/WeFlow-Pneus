import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Product, TireFilter } from '@shared/types'

export class ProductsRepository {
  constructor(private db: Database.Database) {}

  list(filter?: TireFilter): Product[] {
    let sql = 'SELECT * FROM products WHERE (is_archived = 0 OR is_archived IS NULL)'
    const params: any[] = []

    if (filter?.search) {
      sql += ' AND (reference LIKE ? OR brand LIKE ? OR model_name LIKE ? OR dimension LIKE ? OR barcode LIKE ? OR description LIKE ?)'
      const term = `%${filter.search.trim()}%`
      params.push(term, term, term, term, term, term)
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

    sql += ' ORDER BY brand ASC, model_name ASC, reference ASC'
    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => ({
      ...r,
      is_archived: Boolean(r.is_archived)
    }))
  }

  getById(id: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any
    if (!row) return null
    return {
      ...row,
      is_archived: Boolean(row.is_archived)
    }
  }

  getByReference(ref: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE reference = ?').get(ref) as any
    if (!row) return null
    return {
      ...row,
      is_archived: Boolean(row.is_archived)
    }
  }

  create(data: Partial<Product>): Product {
    const id = randomUUID()
    const now = new Date().toISOString()
    const cleanRef = (data.reference && data.reference.trim())
      ? data.reference.trim().toUpperCase()
      : `ART-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`

    const barcode = data.barcode && data.barcode.trim()
      ? data.barcode.trim()
      : `200${Math.floor(1000000000 + Math.random() * 9000000000)}`

    const brand = data.brand?.trim() || 'Générique'
    const model_name = (data as any).designation?.trim() || data.model_name?.trim() || data.description?.trim() || 'Standard'
    const dimension = data.dimension?.trim() || 'Non spécifié'
    const buy_price = Number(data.buy_price) || 0
    const sell_price = Number(data.sell_price) || 0
    const stock_quantity = Number(data.stock_quantity) || 0
    const min_stock_alert = Number(data.min_stock_alert) || 4
    const product_type = data.product_type || 'pneu'
    const image_path = data.image_path || null

    this.db
      .prepare(`
        INSERT INTO products (
          id, reference, product_code, barcode, brand, model_name, description, dimension,
          width, height, diameter, load_index, speed_rating, tire_type, condition,
          vehicle_category, product_type, image_path, buy_price, sell_price, wholesale_price,
          stock_quantity, min_stock_alert, location, dot, is_archived, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
        )
      `)
      .run(
        id,
        cleanRef,
        data.product_code || cleanRef,
        barcode,
        brand,
        model_name,
        data.description || model_name,
        dimension,
        data.width || 0,
        data.height || 0,
        data.diameter || '',
        data.load_index || '',
        data.speed_rating || '',
        data.tire_type || 'summer',
        data.condition || 'new',
        data.vehicle_category || 'passenger',
        product_type,
        image_path,
        buy_price,
        sell_price,
        data.wholesale_price || sell_price,
        stock_quantity,
        min_stock_alert,
        data.location || '',
        data.dot || '',
        now,
        now
      )

    if (stock_quantity > 0) {
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
          stock_quantity,
          buy_price,
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
          vehicle_category = ?, product_type = ?, image_path = ?, buy_price = ?,
          sell_price = ?, wholesale_price = ?, stock_quantity = ?, min_stock_alert = ?,
          location = ?, dot = ?, updated_at = ?
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
        updated.product_type || 'pneu',
        updated.image_path || null,
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

  archive(id: string): boolean {
    const res = this.db.prepare('UPDATE products SET is_archived = 1 WHERE id = ?').run(id)
    return res.changes > 0
  }

  delete(id: string): boolean {
    // Check if product is referenced in sales or purchases
    const countSales = this.db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?').get(id) as { count: number }
    const countPurchases = this.db.prepare('SELECT COUNT(*) as count FROM purchase_items WHERE product_id = ?').get(id) as { count: number }

    if (countSales.count > 0 || countPurchases.count > 0) {
      // Propose archive instead of hard delete to avoid foreign key errors
      return this.archive(id)
    }

    const res = this.db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return res.changes > 0
  }

  searchDimensions(query: string): string[] {
    const term = `%${query.trim()}%`
    const rows = this.db
      .prepare('SELECT DISTINCT dimension FROM products WHERE dimension LIKE ? AND dimension != "Non spécifié" ORDER BY dimension ASC LIMIT 20')
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

import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Product, VehicleBrand, VehicleFitment, VehicleModel } from '@shared/types'

export class VehiclesRepository {
  constructor(private db: Database.Database) {}

  getBrands(): VehicleBrand[] {
    return this.db.prepare('SELECT * FROM vehicle_brands ORDER BY name ASC').all() as VehicleBrand[]
  }

  getModels(brandId: string): VehicleModel[] {
    return this.db
      .prepare('SELECT * FROM vehicle_models WHERE brand_id = ? ORDER BY name ASC')
      .all(brandId) as VehicleModel[]
  }

  getFitments(brandId?: string, modelId?: string): VehicleFitment[] {
    let sql = `
      SELECT f.id, f.brand_id, vb.name AS brand_name, f.model_id, vm.name AS model_name,
             f.year_range, f.engine, f.front_dimension, f.rear_dimension, f.notes
      FROM vehicle_fitments f
      JOIN vehicle_brands vb ON f.brand_id = vb.id
      JOIN vehicle_models vm ON f.model_id = vm.id
      WHERE 1=1
    `
    const params: any[] = []
    if (brandId) {
      sql += ' AND f.brand_id = ?'
      params.push(brandId)
    }
    if (modelId) {
      sql += ' AND f.model_id = ?'
      params.push(modelId)
    }
    sql += ' ORDER BY vb.name ASC, vm.name ASC'
    return this.db.prepare(sql).all(...params) as VehicleFitment[]
  }

  searchCompatibility(params: { brand?: string; model?: string; dimension?: string }): {
    fitments: VehicleFitment[]
    matchingProducts: Product[]
  } {
    let fitmentsSql = `
      SELECT f.id, f.brand_id, vb.name AS brand_name, f.model_id, vm.name AS model_name,
             f.year_range, f.engine, f.front_dimension, f.rear_dimension, f.notes
      FROM vehicle_fitments f
      JOIN vehicle_brands vb ON f.brand_id = vb.id
      JOIN vehicle_models vm ON f.model_id = vm.id
      WHERE 1=1
    `
    const fitmentsParams: any[] = []

    if (params.brand && params.brand !== 'all') {
      fitmentsSql += ' AND vb.name LIKE ?'
      fitmentsParams.push(`%${params.brand.trim()}%`)
    }
    if (params.model && params.model !== 'all') {
      fitmentsSql += ' AND vm.name LIKE ?'
      fitmentsParams.push(`%${params.model.trim()}%`)
    }
    if (params.dimension && params.dimension !== 'all') {
      fitmentsSql += ' AND (f.front_dimension LIKE ? OR f.rear_dimension LIKE ?)'
      const dim = `%${params.dimension.trim()}%`
      fitmentsParams.push(dim, dim)
    }

    const fitments = this.db.prepare(fitmentsSql).all(...fitmentsParams) as VehicleFitment[]

    // Collect all unique dimensions
    const dimensions = new Set<string>()
    if (params.dimension && params.dimension !== 'all') {
      dimensions.add(params.dimension.trim())
    }
    for (const f of fitments) {
      if (f.front_dimension) dimensions.add(f.front_dimension)
      if (f.rear_dimension) dimensions.add(f.rear_dimension)
    }

    let matchingProducts: Product[] = []
    if (dimensions.size > 0) {
      const placeholders = Array.from(dimensions).map(() => '?').join(',')
      matchingProducts = this.db
        .prepare(`SELECT * FROM products WHERE dimension IN (${placeholders}) ORDER BY stock_quantity DESC, brand ASC`)
        .all(...Array.from(dimensions)) as Product[]
    } else {
      matchingProducts = this.db.prepare('SELECT * FROM products ORDER BY stock_quantity DESC LIMIT 20').all() as Product[]
    }

    return { fitments, matchingProducts }
  }

  createFitment(data: Omit<VehicleFitment, 'id' | 'brand_name' | 'model_name'>): VehicleFitment {
    const id = randomUUID()
    this.db
      .prepare(`
        INSERT INTO vehicle_fitments (
          id, brand_id, model_id, year_range, engine, front_dimension, rear_dimension, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        data.brand_id,
        data.model_id,
        data.year_range,
        data.engine,
        data.front_dimension,
        data.rear_dimension,
        data.notes || ''
      )
    return this.getFitments(data.brand_id, data.model_id).find((f) => f.id === id)!
  }

  deleteFitment(id: string): boolean {
    const res = this.db.prepare('DELETE FROM vehicle_fitments WHERE id = ?').run(id)
    return res.changes > 0
  }
}

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { initDatabase, closeDatabase } from '../electron/database/connection'
import { runMigrations } from '../electron/database/migrate'
import { ProductsRepository } from '../electron/database/repositories/products'
import { VehiclesRepository } from '../electron/database/repositories/vehicles'
import { CustomersRepository } from '../electron/database/repositories/customers'
import { SuppliersRepository } from '../electron/database/repositories/suppliers'
import { PurchasesRepository } from '../electron/database/repositories/purchases'
import { SalesRepository } from '../electron/database/repositories/sales'
import { QuotationsRepository } from '../electron/database/repositories/quotations'
import { ServicesRepository } from '../electron/database/repositories/services'
import { AppointmentsRepository } from '../electron/database/repositories/appointments'
import { CashRepository } from '../electron/database/repositories/cash'
import { ExpensesRepository } from '../electron/database/repositories/expenses'
import { DashboardRepository } from '../electron/database/repositories/dashboard'
import { SettingsRepository } from '../electron/database/repositories/settings'

describe('SQLite Database & Business Logic Engine - WeFlow Pneus', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weflow-db-test-'))
  const dbFile = path.join(tempDir, 'test-pneus.db')
  const db = initDatabase(dbFile)
  runMigrations(db)

  const productsRepo = new ProductsRepository(db)
  const vehiclesRepo = new VehiclesRepository(db)
  const customersRepo = new CustomersRepository(db)
  const suppliersRepo = new SuppliersRepository(db)
  const purchasesRepo = new PurchasesRepository(db)
  const salesRepo = new SalesRepository(db)
  const quotesRepo = new QuotationsRepository(db)
  const servicesRepo = new ServicesRepository(db)
  const apptsRepo = new AppointmentsRepository(db)
  const cashRepo = new CashRepository(db)
  const expensesRepo = new ExpensesRepository(db)
  const dashboardRepo = new DashboardRepository(db)
  const settingsRepo = new SettingsRepository(db)

  it('initializes schema and applies seeds correctly', () => {
    const products = productsRepo.list()
    expect(products.length).toBeGreaterThanOrEqual(6)

    const brands = vehiclesRepo.getBrands()
    expect(brands.length).toBeGreaterThanOrEqual(10)

    const profile = settingsRepo.getProfile()
    expect(profile.store_name).toBe('WeFlow Pneus')
    expect(profile.language).toBe('fr')
  })

  it('performs tire dimension compatibility search accurately', () => {
    // Search by vehicle: Renault Symbol
    const res = vehiclesRepo.searchCompatibility({ brand: 'Renault', model: 'Symbol' })
    expect(res.fitments.length).toBeGreaterThanOrEqual(1)
    expect(res.fitments[0].front_dimension).toBe('185/65 R15')

    // Matching products should include Michelin 185/65 R15
    const matched = res.matchingProducts.find((p) => p.dimension === '185/65 R15')
    expect(matched).toBeDefined()
    expect(matched?.brand).toBe('Michelin')
  })

  it('executes purchase receipt and updates stock atomically', () => {
    const supplier = suppliersRepo.list()[0]
    expect(supplier).toBeDefined()

    const tire = productsRepo.getByReference('MIC-2055516-E')!
    const initialStock = tire.stock_quantity

    const purchase = purchasesRepo.create({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      date: '2026-11-18',
      paid_amount: 50000,
      items: [
        {
          product_id: tire.id,
          reference: tire.reference,
          brand: tire.brand,
          dimension: tire.dimension,
          quantity: 10,
          unit_cost: 11000
        }
      ]
    })

    expect(purchase.status).toBe('ordered')
    // Stock should not change before receipt validation
    expect(productsRepo.getById(tire.id)?.stock_quantity).toBe(initialStock)

    // Receive purchase
    const received = purchasesRepo.receive(purchase.id)
    expect(received.status).toBe('received')
    expect(productsRepo.getById(tire.id)?.stock_quantity).toBe(initialStock + 10)
  })

  it('validates POS sale, decrements stock, records payment, and prevents negative stock', () => {
    const tire = productsRepo.getByReference('PIR-2254517-P')!
    const initialStock = tire.stock_quantity
    const customer = customersRepo.list()[0]

    // 1. Attempting to sell more than available should throw
    expect(() => {
      salesRepo.create({
        customer_id: customer.id,
        customer_name: customer.name,
        date: '2026-11-18',
        items: [
          {
            product_id: tire.id,
            item_type: 'product',
            reference: tire.reference,
            designation: `${tire.brand} ${tire.model_name}`,
            quantity: initialStock + 100,
            unit_price: tire.sell_price
          }
        ]
      })
    }).toThrow(/Stock insuffisant/)

    // 2. Normal sale of 4 tires
    const sale = salesRepo.create({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      date: '2026-11-18',
      paid_amount: 4 * tire.sell_price * 1.19,
      payment_method: 'cash',
      items: [
        {
          product_id: tire.id,
          item_type: 'product',
          reference: tire.reference,
          designation: `${tire.brand} ${tire.model_name}`,
          quantity: 4,
          unit_price: tire.sell_price,
          tax_rate: 19
        }
      ]
    })

    expect(sale.status).toBe('paid')
    expect(sale.invoice_number).toMatch(/^F-\d{4}-\d{4}$/)
    expect(productsRepo.getById(tire.id)?.stock_quantity).toBe(initialStock - 4)

    // Check cash movement was recorded
    const movements = cashRepo.listMovements()
    const saleMove = movements.find((m) => m.description.includes(sale.invoice_number))
    expect(saleMove).toBeDefined()
    expect(saleMove?.type).toBe('in')
  })

  it('converts a quotation to sale without re-entering data', () => {
    const quote = quotesRepo.create({
      customer_name: 'Client Devis Test',
      customer_phone: '0555998877',
      vehicle_info: 'Volkswagen Golf 7',
      date: '2026-11-18',
      valid_until: '2026-12-18',
      items: [
        {
          item_type: 'service',
          reference: 'PARAL-GEO',
          designation: 'Parallélisme & Géométrie',
          quantity: 1,
          unit_price: 2500
        }
      ]
    })

    expect(quote.status).toBe('draft')
    const convertedSale = quotesRepo.convertToSale(quote.id)
    expect(convertedSale.invoice_number).toMatch(/^F-\d{4}-\d{4}$/)
    expect(quotesRepo.getById(quote.id)?.status).toBe('converted')
  })

  it('detects appointment overlap correctly', () => {
    apptsRepo.create({
      customer_name: 'M. Ali',
      phone: '0550112233',
      service_requested: 'Montage 4 pneus',
      date: '2026-11-20',
      start_time: '10:00',
      end_time: '11:00',
      status: 'scheduled'
    })

    // Overlapping slot
    const overlap = apptsRepo.checkOverlap('2026-11-20', '10:30', '11:30')
    expect(overlap).toBeDefined()
    expect(overlap?.customer_name).toBe('M. Ali')

    // Non-overlapping slot
    const freeSlot = apptsRepo.checkOverlap('2026-11-20', '11:00', '12:00')
    expect(freeSlot).toBeNull()
  })

  it('calculates real dashboard metrics from SQLite transactions', () => {
    const stats = dashboardRepo.getStats('month')
    expect(stats.turnover).toBeGreaterThan(0)
    expect(stats.salesCount).toBeGreaterThanOrEqual(1)
    expect(stats.totalStockCount).toBeGreaterThan(0)
    expect(stats.stockValue).toBeGreaterThan(0)
    expect(stats.recentSales.length).toBeGreaterThan(0)
  })
})

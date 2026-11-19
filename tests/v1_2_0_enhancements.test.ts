import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { initDatabase } from '../electron/database/connection'
import { runMigrations } from '../electron/database/migrate'
import { ProductsRepository } from '../electron/database/repositories/products'
import { CustomersRepository } from '../electron/database/repositories/customers'
import { SuppliersRepository } from '../electron/database/repositories/suppliers'
import { PurchasesRepository } from '../electron/database/repositories/purchases'
import { SalesRepository } from '../electron/database/repositories/sales'
import { QuotationsRepository } from '../electron/database/repositories/quotations'
import { SettingsRepository } from '../electron/database/repositories/settings'

describe('WEFLOW PNEUS v1.2.0 Enhancements & Business Logic', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weflow-v120-test-'))
  const dbFile = path.join(tempDir, 'test-v120.db')
  const db = initDatabase(dbFile)
  runMigrations(db)

  const productsRepo = new ProductsRepository(db)
  const customersRepo = new CustomersRepository(db)
  const suppliersRepo = new SuppliersRepository(db)
  const purchasesRepo = new PurchasesRepository(db)
  const salesRepo = new SalesRepository(db)
  const quotesRepo = new QuotationsRepository(db)
  const settingsRepo = new SettingsRepository(db)

  it('verifies Zoom factor clamping and persistence in SQLite', () => {
    expect(settingsRepo.getZoomFactor()).toBe(1.0)

    const z1 = settingsRepo.setZoomFactor(1.3)
    expect(z1).toBe(1.3)
    expect(settingsRepo.getZoomFactor()).toBe(1.3)

    // Clamping to maximum 1.5
    const zMax = settingsRepo.setZoomFactor(2.2)
    expect(zMax).toBe(1.5)

    // Clamping to minimum 0.8
    const zMin = settingsRepo.setZoomFactor(0.4)
    expect(zMin).toBe(0.8)

    // Reset to 1.0
    settingsRepo.setZoomFactor(1.0)
    expect(settingsRepo.getZoomFactor()).toBe(1.0)
  })

  it('manages configurable TVA rates and preserves historical rates', () => {
    const initialRates = settingsRepo.listTaxRates(true)
    expect(initialRates.length).toBeGreaterThanOrEqual(3) // 19%, 9%, 0% seeded

    const newRate = settingsRepo.createTaxRate({
      rate: 14.0,
      label: 'TVA Intermédiaire 14%',
      is_default: false,
      is_active: true
    })
    expect(newRate.rate).toBe(14.0)

    // Verify it appears in active rates
    const activeRates = settingsRepo.listTaxRates(false)
    expect(activeRates.some((r) => r.rate === 14.0)).toBe(true)

    // Deleting an unused tax rate actually deletes it
    const deleted = settingsRepo.deleteTaxRate(newRate.id)
    expect(deleted).toBe(true)
    expect(settingsRepo.listTaxRates(true).some((r) => r.id === newRate.id)).toBe(false)
  })

  it('manages products simplification: only designation mandatory, auto-reference and archiving', () => {
    const p1 = productsRepo.create({
      model_name: 'Pneu Sans Reference Explicite 195/65 R15',
      buy_price: 6000,
      sell_price: 8500,
      stock_quantity: 10
    } as any)

    expect(p1.reference).toBeTruthy()
    expect(p1.reference.startsWith('ART-')).toBe(true)
    expect(p1.stock_quantity).toBe(10)

    // Archiving product
    productsRepo.archive(p1.id)
    const listAfterArchive = productsRepo.list()
    expect(listAfterArchive.some((p) => p.id === p1.id)).toBe(false)
  })

  it('handles partial reception in purchases and updates stock only on received items', () => {
    const supplier = suppliersRepo.create({
      name: 'Fournisseur Test Pneus Nord',
      phone: '0550000001'
    })

    const prod = productsRepo.create({
      reference: 'TEST-REC-01',
      brand: 'Michelin',
      model_name: 'Primacy 4',
      dimension: '205/55 R16',
      buy_price: 10000,
      sell_price: 14000,
      stock_quantity: 5
    } as any)

    const initialStock = productsRepo.getById(prod.id)!.stock_quantity
    expect(initialStock).toBe(5)

    // Create purchase order for 20 tires with deposit
    const purchase = purchasesRepo.create({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      date: '2026-11-19',
      deposit_amount: 50000,
      notes: 'Commande test réception partielle',
      items: [
        {
          product_id: prod.id,
          reference: prod.reference,
          brand: prod.brand,
          dimension: prod.dimension,
          quantity: 20,
          unit_cost: 10000
        }
      ]
    })

    // Strict rule: Stock must NOT increase immediately upon ordering
    const stockAfterOrder = productsRepo.getById(prod.id)!.stock_quantity
    expect(stockAfterOrder).toBe(5)

    // Partial reception of 8 tires
    const purchaseDetails = purchasesRepo.getById(purchase.id)!
    const itemId = purchaseDetails.items![0].id
    purchasesRepo.receiveItems(purchase.id, [{ itemId, receivedQty: 8 }])

    // Stock should increase by exactly 8
    const stockAfterPartial = productsRepo.getById(prod.id)!.stock_quantity
    expect(stockAfterPartial).toBe(13)

    const updatedPurchase1 = purchasesRepo.getById(purchase.id)!
    expect(updatedPurchase1.status).toBe('partial_received')
    expect(updatedPurchase1.items![0].received_quantity).toBe(8)

    // Complete reception of the remaining 12 tires
    purchasesRepo.receiveItems(purchase.id, [{ itemId, receivedQty: 12 }])
    const stockAfterComplete = productsRepo.getById(prod.id)!.stock_quantity
    expect(stockAfterComplete).toBe(25)

    const updatedPurchase2 = purchasesRepo.getById(purchase.id)!
    expect(updatedPurchase2.status).toBe('received')
    expect(updatedPurchase2.items![0].received_quantity).toBe(20)
  })

  it('quotation does not deduct stock, but converts to sale which does', () => {
    const cust = customersRepo.create({
      name: 'Client Devis Test',
      phone: '0660000002',
      type: 'individual'
    })

    const prod = productsRepo.create({
      reference: 'TEST-QUOTE-01',
      brand: 'Continental',
      model_name: 'UltraContact',
      dimension: '195/65 R15',
      buy_price: 8000,
      sell_price: 11000,
      stock_quantity: 12
    } as any)

    const initialStock = productsRepo.getById(prod.id)!.stock_quantity
    expect(initialStock).toBe(12)

    // Create quote for 4 tires
    const quote = quotesRepo.create({
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone,
      date: '2026-11-19',
      valid_until: '2026-12-19',
      tax_rate: 19.0,
      discount_amount: 0,
      items: [
        {
          product_id: prod.id,
          item_type: 'product',
          reference: prod.reference,
          designation: `${prod.brand} ${prod.model_name}`,
          quantity: 4,
          unit_price: 11000
        }
      ]
    })

    // Strict rule: Stock must NOT change
    expect(productsRepo.getById(prod.id)!.stock_quantity).toBe(12)

    // Duplicate quotation
    const dup = quotesRepo.duplicate(quote.id)
    expect(dup.id).not.toBe(quote.id)
    expect(dup.items?.length).toBe(1)
    expect(productsRepo.getById(prod.id)!.stock_quantity).toBe(12)

    // Convert quotation to sale
    const sale = quotesRepo.convertToSale(quote.id, {
      paymentMethod: 'cash',
      paidAmount: 44000
    })

    expect(sale.id).toBeTruthy()
    // Stock must now be decremented by 4 (12 - 4 = 8)
    expect(productsRepo.getById(prod.id)!.stock_quantity).toBe(8)

    // Quote should be marked as converted
    const convertedQuote = quotesRepo.getById(quote.id)!
    expect(convertedQuote.status).toBe('converted')
    expect(convertedQuote.converted_sale_id).toBe(sale.id)
  })

  it('cancels a sale and restores stock atomically via stock_movements', () => {
    const cust = customersRepo.create({
      name: 'Client Vente Annulation',
      phone: '0770000003',
      type: 'individual'
    })

    const prod = productsRepo.create({
      reference: 'TEST-CANCEL-01',
      brand: 'Pirelli',
      model_name: 'Cinturato P7',
      dimension: '225/45 R17',
      buy_price: 15000,
      sell_price: 20000,
      stock_quantity: 10
    } as any)

    const sale = salesRepo.create({
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone,
      date: '2026-11-19',
      payment_method: 'cash',
      paid_amount: 40000,
      items: [
        {
          product_id: prod.id,
          item_type: 'product',
          reference: prod.reference,
          designation: `${prod.brand} ${prod.model_name}`,
          quantity: 2,
          unit_price: 20000,
          tax_rate: 0
        }
      ]
    })

    expect(productsRepo.getById(prod.id)!.stock_quantity).toBe(8)

    // Cancel sale
    const success = salesRepo.cancel(sale.id, 'Erreur de taille demandée par le client')
    expect(success).toBe(true)

    const cancelled = salesRepo.getById(sale.id)!
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancel_reason).toBe('Erreur de taille demandée par le client')

    // Stock must be restored to 10
    expect(productsRepo.getById(prod.id)!.stock_quantity).toBe(10)
  })
})

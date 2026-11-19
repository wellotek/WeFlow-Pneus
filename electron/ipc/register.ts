import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import type Database from 'better-sqlite3'
import { CHANNELS } from '@shared/channels'
import {
  appointmentSchema,
  createProductSchema,
  createPurchaseSchema,
  createQuotationSchema,
  createSaleSchema,
  customerSchema,
  customerVehicleSchema,
  expenseSchema,
  serviceSchema,
  supplierSchema,
  updateProductSchema,
  warrantyClaimSchema,
  taxRateSchema,
  supplierPaymentSchema
} from '@shared/schemas'
import { ProductsRepository } from '../database/repositories/products'
import { VehiclesRepository } from '../database/repositories/vehicles'
import { CustomersRepository } from '../database/repositories/customers'
import { SuppliersRepository } from '../database/repositories/suppliers'
import { PurchasesRepository } from '../database/repositories/purchases'
import { SalesRepository } from '../database/repositories/sales'
import { QuotationsRepository } from '../database/repositories/quotations'
import { ServicesRepository } from '../database/repositories/services'
import { AppointmentsRepository } from '../database/repositories/appointments'
import { WarrantiesRepository } from '../database/repositories/warranties'
import { CashRepository } from '../database/repositories/cash'
import { ExpensesRepository } from '../database/repositories/expenses'
import { DashboardRepository } from '../database/repositories/dashboard'
import { SettingsRepository } from '../database/repositories/settings'
import { assertLicensed, getLicenseService } from '../license/guard'
import { isTrustedIpcSender } from './trusted'
import { serializeError } from './errors'
import {
  renderClosingZHtml,
  renderInvoiceHtml,
  renderPurchaseHtml,
  renderQuotationHtml,
  renderServiceOrderHtml,
  renderTicketHtml,
  renderTireLabelsHtml
} from '../services/documentTemplates'
import { getAvailablePrinters, printHtml, savePdf } from '../services/printService'
import { BackupService } from '../services/backupService'
import { MediaService } from '../services/mediaService'
import { exportToCsv, exportToListPdf } from '../services/exportService'
import {
  checkForAppUpdates,
  downloadAppUpdate,
  getUpdateSnapshot,
  installAppUpdateAndRestart
} from '../services/appUpdater'

export function registerIpcHandlers(db: Database.Database, dbPath: string, userDataDir: string): void {
  const productsRepo = new ProductsRepository(db)
  const vehiclesRepo = new VehiclesRepository(db)
  const customersRepo = new CustomersRepository(db)
  const suppliersRepo = new SuppliersRepository(db)
  const purchasesRepo = new PurchasesRepository(db)
  const salesRepo = new SalesRepository(db)
  const quotesRepo = new QuotationsRepository(db)
  const servicesRepo = new ServicesRepository(db)
  const apptsRepo = new AppointmentsRepository(db)
  const warrantiesRepo = new WarrantiesRepository(db)
  const cashRepo = new CashRepository(db)
  const expensesRepo = new ExpensesRepository(db)
  const dashboardRepo = new DashboardRepository(db)
  const settingsRepo = new SettingsRepository(db)
  const backupService = new BackupService(dbPath, `${userDataDir}/backups`)
  const mediaService = new MediaService(userDataDir)

  function handle<T, R>(channel: string, fn: (payload: T, event: IpcMainInvokeEvent) => Promise<R> | R, requiresLicense = true) {
    ipcMain.handle(channel, async (event, payload: T) => {
      if (!isTrustedIpcSender(event)) {
        return { ok: false, error: { code: 'UNTRUSTED_SENDER', message: 'Appel IPC non autorisé' } }
      }
      try {
        if (requiresLicense) {
          assertLicensed()
        }
        const data = await fn(payload, event)
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: serializeError(error) }
      }
    })
  }

  // --- APP & ZOOM ---
  handle(CHANNELS.APP_GET_ZOOM, () => settingsRepo.getZoomFactor(), false)
  handle(
    CHANNELS.APP_SET_ZOOM,
    (factor: number) => {
      const clamped = Math.min(1.5, Math.max(0.8, Number(factor.toFixed(2))))
      settingsRepo.setZoomFactor(clamped)
      for (const win of BrowserWindow.getAllWindows()) {
        try {
          win.webContents.setZoomFactor(clamped)
        } catch {
          // ignore window disposed
        }
      }
      return clamped
    },
    false
  )

  // --- MEDIA ---
  handle(
    CHANNELS.MEDIA_UPLOAD_IMAGE,
    ({ folder, fileData, fileName }: { folder: 'products' | 'customers' | 'vehicles'; fileData: string; fileName?: string }) => {
      return mediaService.saveImage(folder, fileData, fileName)
    }
  )
  handle(CHANNELS.MEDIA_DELETE_IMAGE, (filePath: string) => {
    return mediaService.deleteImage(filePath)
  })

  // --- LICENSE (NO LICENSE CHECK) ---
  handle(CHANNELS.LICENSE_GET_STATUS, () => getLicenseService().getUiState(), false)
  handle(
    CHANNELS.LICENSE_ACTIVATE,
    async ({ licenseId, activationCode }: { licenseId: string; activationCode: string }) => {
      return getLicenseService().activate(licenseId, activationCode)
    },
    false
  )
  handle(CHANNELS.LICENSE_VALIDATE, () => getLicenseService().getUiState(), false)

  // --- SETTINGS & PROFILE & TAX RATES ---
  handle(CHANNELS.SETTINGS_GET, () => settingsRepo.getProfile(), false)
  handle(CHANNELS.PROFILE_GET, () => settingsRepo.getProfile(), false)
  handle(CHANNELS.PROFILE_UPDATE, (profile: any) => settingsRepo.updateProfile(profile))
  handle(CHANNELS.TAX_RATES_LIST, (includeInactive?: boolean) => settingsRepo.listTaxRates(includeInactive))
  handle(CHANNELS.TAX_RATES_CREATE, (data: any) => {
    const valid = taxRateSchema.parse(data)
    return settingsRepo.createTaxRate(valid as any)
  })
  handle(CHANNELS.TAX_RATES_UPDATE, ({ id, data }: { id: string; data: any }) => {
    return settingsRepo.updateTaxRate(id, data)
  })
  handle(CHANNELS.TAX_RATES_DELETE, (id: string) => settingsRepo.deleteTaxRate(id))

  // --- PRODUCTS & TIRES ---
  handle(CHANNELS.PRODUCTS_LIST, (filter: any) => productsRepo.list(filter))
  handle(CHANNELS.PRODUCTS_GET, (id: string) => productsRepo.getById(id))
  handle(CHANNELS.PRODUCTS_CREATE, (data: any) => {
    const valid = createProductSchema.parse(data)
    return productsRepo.create(valid as any)
  })
  handle(CHANNELS.PRODUCTS_UPDATE, ({ id, data }: { id: string; data: any }) => {
    const valid = updateProductSchema.parse({ ...data, id })
    return productsRepo.update(id, valid as any)
  })
  handle(CHANNELS.PRODUCTS_DELETE, (id: string) => productsRepo.delete(id))
  handle(CHANNELS.PRODUCTS_ARCHIVE, (id: string) => productsRepo.archive(id))
  handle(CHANNELS.PRODUCTS_SEARCH_DIMENSIONS, (query: string) => productsRepo.searchDimensions(query))

  // --- VEHICLES & COMPATIBILITY ---
  handle(CHANNELS.VEHICLES_GET_BRANDS, () => vehiclesRepo.getBrands())
  handle(CHANNELS.VEHICLES_GET_MODELS, (brandId: string) => vehiclesRepo.getModels(brandId))
  handle(CHANNELS.VEHICLES_GET_FITMENTS, ({ brandId, modelId }: any = {}) =>
    vehiclesRepo.getFitments(brandId, modelId)
  )
  handle(CHANNELS.VEHICLES_SEARCH_COMPATIBILITY, (params: any) =>
    vehiclesRepo.searchCompatibility(params)
  )
  handle(CHANNELS.VEHICLES_CREATE_FITMENT, (data: any) => vehiclesRepo.createFitment(data))
  handle(CHANNELS.VEHICLES_DELETE_FITMENT, (id: string) => vehiclesRepo.deleteFitment(id))

  // --- STOCK & MOVEMENTS ---
  handle(CHANNELS.STOCK_LIST_MOVEMENTS, (productId?: string) => {
    let sql = 'SELECT * FROM stock_movements'
    const params: any[] = []
    if (productId) {
      sql += ' WHERE product_id = ?'
      params.push(productId)
    }
    sql += ' ORDER BY created_at DESC LIMIT 200'
    return db.prepare(sql).all(...params)
  })
  handle(CHANNELS.STOCK_ADJUST, ({ productId, quantityDelta, reason }: any) =>
    productsRepo.adjustStock(productId, quantityDelta, reason)
  )
  handle(CHANNELS.STOCK_GET_SUMMARY, () => {
    const agg = db
      .prepare('SELECT SUM(stock_quantity) as totalItems, SUM(stock_quantity * buy_price) as totalValue FROM products WHERE is_archived = 0 OR is_archived IS NULL')
      .get() as any
    const low = db
      .prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_alert AND (is_archived = 0 OR is_archived IS NULL)')
      .get() as any
    return {
      totalItems: agg?.totalItems || 0,
      totalValue: agg?.totalValue || 0,
      lowStockCount: low?.count || 0
    }
  })

  // --- CUSTOMERS & VEHICLES ---
  handle(CHANNELS.CUSTOMERS_LIST, (search?: string) => customersRepo.list(search))
  handle(CHANNELS.CUSTOMERS_GET, (id: string) => customersRepo.getById(id))
  handle(CHANNELS.CUSTOMERS_CREATE, (data: any) => {
    const valid = customerSchema.parse(data)
    return customersRepo.create(valid as any)
  })
  handle(CHANNELS.CUSTOMERS_UPDATE, ({ id, data }: { id: string; data: any }) =>
    customersRepo.update(id, data)
  )
  handle(CHANNELS.CUSTOMERS_DELETE, (id: string) => customersRepo.delete(id))
  handle(CHANNELS.CUSTOMERS_ARCHIVE, (id: string) => customersRepo.archive(id))
  handle(CHANNELS.CUSTOMERS_GET_VEHICLES, (customerId: string) =>
    customersRepo.getVehicles(customerId)
  )
  handle(CHANNELS.CUSTOMERS_CREATE_VEHICLE, (data: any) => {
    const valid = customerVehicleSchema.parse(data)
    return customersRepo.createVehicle(valid as any)
  })
  handle(CHANNELS.CUSTOMERS_UPDATE_VEHICLE, ({ id, data }: { id: string; data: any }) =>
    customersRepo.updateVehicle(id, data)
  )
  handle(CHANNELS.CUSTOMERS_DELETE_VEHICLE, (id: string) => customersRepo.deleteVehicle(id))
  handle(CHANNELS.CUSTOMERS_ARCHIVE_VEHICLE, (id: string) => customersRepo.archiveVehicle(id))

  // --- SUPPLIERS & PURCHASES ---
  handle(CHANNELS.SUPPLIERS_LIST, (search?: string) => suppliersRepo.list(search))
  handle(CHANNELS.SUPPLIERS_GET, (id: string) => suppliersRepo.getById(id))
  handle(CHANNELS.SUPPLIERS_CREATE, (data: any) => {
    const valid = supplierSchema.parse(data)
    return suppliersRepo.create(valid as any)
  })
  handle(CHANNELS.SUPPLIERS_UPDATE, ({ id, data }: { id: string; data: any }) =>
    suppliersRepo.update(id, data)
  )
  handle(CHANNELS.SUPPLIERS_DELETE, (id: string) => suppliersRepo.delete(id))
  handle(CHANNELS.SUPPLIERS_ARCHIVE, (id: string) => suppliersRepo.archive(id))
  handle(CHANNELS.SUPPLIERS_LIST_PAYMENTS, (supplierId?: string) => suppliersRepo.listPayments(supplierId))
  handle(CHANNELS.SUPPLIERS_ADD_PAYMENT, (data: any) => {
    const valid = supplierPaymentSchema.parse(data)
    return suppliersRepo.addPayment(valid as any)
  })

  handle(CHANNELS.PURCHASES_LIST, () => purchasesRepo.list())
  handle(CHANNELS.PURCHASES_GET, (id: string) => purchasesRepo.getById(id))
  handle(CHANNELS.PURCHASES_CREATE, (data: any) => {
    const valid = createPurchaseSchema.parse(data)
    return purchasesRepo.create(valid as any)
  })
  handle(CHANNELS.PURCHASES_RECEIVE, (id: string) => purchasesRepo.receive(id))
  handle(CHANNELS.PURCHASES_RECEIVE_ITEMS, ({ id, receivedItems }: { id: string; receivedItems: { itemId: string; receivedQty: number }[] }) =>
    purchasesRepo.receiveItems(id, receivedItems)
  )
  handle(CHANNELS.PURCHASES_DELETE, (id: string) => purchasesRepo.delete(id))
  handle(CHANNELS.PURCHASES_ARCHIVE, (id: string) => purchasesRepo.archive(id))

  // --- SALES & POS ---
  handle(CHANNELS.SALES_LIST, (filter: any) => salesRepo.list(filter))
  handle(CHANNELS.SALES_GET, (id: string) => salesRepo.getById(id))
  handle(CHANNELS.SALES_CREATE, (data: any) => {
    const valid = createSaleSchema.parse(data)
    return salesRepo.create(valid as any)
  })
  handle(
    CHANNELS.SALES_ADD_PAYMENT,
    ({ saleId, amount, paymentMethod, note }: any) =>
      salesRepo.addPayment(saleId, amount, paymentMethod, note)
  )
  handle(CHANNELS.SALES_CANCEL, ({ id, reason }: any) => salesRepo.cancel(id, reason))
  handle(CHANNELS.SALES_ARCHIVE, (id: string) => salesRepo.archive(id))

  // --- QUOTATIONS ---
  handle(CHANNELS.QUOTATIONS_LIST, () => quotesRepo.list())
  handle(CHANNELS.QUOTATIONS_GET, (id: string) => quotesRepo.getById(id))
  handle(CHANNELS.QUOTATIONS_CREATE, (data: any) => {
    const valid = createQuotationSchema.parse(data)
    return quotesRepo.create(valid as any)
  })
  handle(CHANNELS.QUOTATIONS_UPDATE, ({ id, data }: { id: string; data: any }) =>
    quotesRepo.update(id, data)
  )
  handle(CHANNELS.QUOTATIONS_DUPLICATE, (id: string) => quotesRepo.duplicate(id))
  handle(CHANNELS.QUOTATIONS_CONVERT_TO_SALE, (id: string) => quotesRepo.convertToSale(id))
  handle(CHANNELS.QUOTATIONS_DELETE, (id: string) => quotesRepo.delete(id))

  // --- SERVICES ATELIER ---
  handle(CHANNELS.SERVICES_LIST, () => servicesRepo.listServices())
  handle(CHANNELS.SERVICES_CREATE, (data: any) => {
    const valid = serviceSchema.parse(data)
    return servicesRepo.createService(valid as any)
  })
  handle(CHANNELS.SERVICES_UPDATE, ({ id, data }: { id: string; data: any }) =>
    servicesRepo.updateService(id, data)
  )
  handle(CHANNELS.SERVICES_DELETE, (id: string) => servicesRepo.deleteService(id))
  handle(CHANNELS.SERVICE_ORDERS_LIST, () => servicesRepo.listOrders())
  handle(CHANNELS.SERVICE_ORDERS_GET, (id: string) => servicesRepo.getOrderById(id))
  handle(CHANNELS.SERVICE_ORDERS_CREATE, (data: any) => servicesRepo.createOrder(data))
  handle(CHANNELS.SERVICE_ORDERS_UPDATE_STATUS, ({ id, status }: any) =>
    servicesRepo.updateOrderStatus(id, status)
  )

  // --- APPOINTMENTS ---
  handle(CHANNELS.APPOINTMENTS_LIST, (dateFilter?: string) => apptsRepo.list(dateFilter))
  handle(CHANNELS.APPOINTMENTS_CREATE, (data: any) => {
    const valid = appointmentSchema.parse(data)
    return apptsRepo.create(valid as any)
  })
  handle(CHANNELS.APPOINTMENTS_UPDATE, ({ id, data }: { id: string; data: any }) =>
    apptsRepo.update(id, data)
  )
  handle(CHANNELS.APPOINTMENTS_DELETE, (id: string) => apptsRepo.delete(id))

  // --- WARRANTIES & RETURNS ---
  handle(CHANNELS.WARRANTIES_LIST, (filter?: any) => warrantiesRepo.list(filter))
  handle(CHANNELS.WARRANTIES_GET, (id: string) => warrantiesRepo.getById(id))
  handle(CHANNELS.WARRANTIES_CREATE, (data: any) => {
    const valid = warrantyClaimSchema.parse(data)
    return warrantiesRepo.create(valid as any)
  })
  handle(CHANNELS.WARRANTIES_UPDATE, ({ id, data }: { id: string; data: any }) =>
    warrantiesRepo.update(id, data)
  )
  handle(CHANNELS.WARRANTIES_UPDATE_STATUS, ({ id, status, notes, options }: any) =>
    warrantiesRepo.updateStatus(id, status, notes, options)
  )
  handle(CHANNELS.WARRANTIES_ARCHIVE, (id: string) => warrantiesRepo.archive(id))

  // --- CASH REGISTER & EXPENSES ---
  handle(CHANNELS.CASH_GET_CURRENT_SESSION, () => cashRepo.getCurrentSession())
  handle(CHANNELS.CASH_OPEN_SESSION, ({ initialCash, notes }: any) =>
    cashRepo.openSession(initialCash, notes)
  )
  handle(CHANNELS.CASH_CLOSE_SESSION, ({ actualCash, notes }: any) =>
    cashRepo.closeSession(actualCash, notes)
  )
  handle(CHANNELS.CASH_LIST_MOVEMENTS, (sessionId?: string) => cashRepo.listMovements(sessionId))
  handle(
    CHANNELS.CASH_ADD_MOVEMENT,
    ({ type, category, amount, method, description }: any) =>
      cashRepo.addMovement(type, category, amount, method, description)
  )
  handle(CHANNELS.EXPENSES_LIST, () => expensesRepo.list())
  handle(CHANNELS.EXPENSES_CREATE, (data: any) => {
    const valid = expenseSchema.parse(data)
    return expensesRepo.create(valid as any)
  })
  handle(CHANNELS.EXPENSES_DELETE, (id: string) => expensesRepo.delete(id))

  // --- DASHBOARD & REPORTS ---
  handle(CHANNELS.DASHBOARD_GET_STATS, (period?: string) => dashboardRepo.getStats(period))
  handle(CHANNELS.REPORTS_GET_FINANCIAL, (period?: string) =>
    dashboardRepo.getFinancialReport(period)
  )

  // --- PRINTING & PDF EXPORT ---
  handle(CHANNELS.DOCUMENTS_PRINT_INVOICE, async (saleId: string) => {
    const sale = salesRepo.getById(saleId)
    if (!sale) throw new Error('Vente introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderInvoiceHtml(sale, profile)
    await printHtml(html, 'A4', profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_EXPORT_PDF_INVOICE, async (saleId: string) => {
    const sale = salesRepo.getById(saleId)
    if (!sale) throw new Error('Vente introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderInvoiceHtml(sale, profile)
    return savePdf(html, `Facture_${sale.invoice_number}.pdf`, 'A4')
  })

  handle(CHANNELS.DOCUMENTS_PRINT_TICKET, async (saleId: string) => {
    const sale = salesRepo.getById(saleId)
    if (!sale) throw new Error('Vente introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderTicketHtml(sale, profile)
    await printHtml(html, 'A4', profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_PRINT_QUOTATION, async (quoteId: string) => {
    const quote = quotesRepo.getById(quoteId)
    if (!quote) throw new Error('Devis introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderQuotationHtml(quote, profile)
    await printHtml(html, 'A4', profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_EXPORT_PDF_QUOTATION, async (quoteId: string) => {
    const quote = quotesRepo.getById(quoteId)
    if (!quote) throw new Error('Devis introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderQuotationHtml(quote, profile)
    return savePdf(html, `Devis_${quote.quote_number}.pdf`, 'A4')
  })

  handle(CHANNELS.DOCUMENTS_PRINT_PURCHASE, async (purchaseId: string) => {
    const purchase = purchasesRepo.getById(purchaseId)
    if (!purchase) throw new Error('Achat introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderPurchaseHtml(purchase, profile)
    await printHtml(html, 'A4', profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_PRINT_SERVICE_ORDER, async (orderId: string) => {
    const order = servicesRepo.getOrderById(orderId)
    if (!order) throw new Error('Ordre de travail introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderServiceOrderHtml(order, profile)
    await printHtml(html, 'A4', profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_PRINT_CLOSING_Z, async (sessionId: string) => {
    const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any
    if (!session) throw new Error('Session de caisse introuvable')
    const profile = settingsRepo.getProfile()
    const html = renderClosingZHtml(session, profile)
    await printHtml(html, 'A4', profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_PRINT_LABELS, async (labels: any[]) => {
    const profile = settingsRepo.getProfile()
    const html = renderTireLabelsHtml(labels, profile)
    await printHtml(html, 'A4', profile.default_label_printer || profile.default_printer)
  })

  handle(CHANNELS.DOCUMENTS_EXPORT_PDF_LABELS, async (labels: any[]) => {
    const profile = settingsRepo.getProfile()
    const html = renderTireLabelsHtml(labels, profile)
    return savePdf(html, `Etiquettes_Pneus_${Date.now()}.pdf`, 'A4')
  })

  handle(CHANNELS.DOCUMENTS_EXPORT_CSV, async ({ filename, headers, rows }: any) => {
    return exportToCsv(filename, headers, rows)
  })

  handle(CHANNELS.DOCUMENTS_EXPORT_LIST_PDF, async ({ title, columns, rows, options }: any) => {
    const profile = settingsRepo.getProfile()
    return exportToListPdf(title, columns, rows, profile, options)
  })

  handle(CHANNELS.DOCUMENTS_GET_PRINTERS, () => getAvailablePrinters())

  // --- BACKUP & RESTORE ---
  handle(CHANNELS.BACKUP_CREATE, () => backupService.createBackup())
  handle(CHANNELS.BACKUP_RESTORE, (filePath: string) => backupService.restoreBackup(filePath))
  handle(CHANNELS.BACKUP_LIST, () => backupService.listBackups())

  // --- UPDATER ---
  handle(CHANNELS.UPDATER_CHECK, () => checkForAppUpdates(), false)
  handle(CHANNELS.UPDATER_DOWNLOAD, () => downloadAppUpdate(), false)
  handle(CHANNELS.UPDATER_INSTALL, () => installAppUpdateAndRestart(), false)
  handle(CHANNELS.UPDATER_GET_STATUS, () => getUpdateSnapshot(), false)
}

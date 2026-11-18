import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '@shared/channels'
import type { WeFlowPneusApi } from '@shared/api'
import type { UpdateSnapshot } from '@shared/updates'

async function invoke<T = any>(channel: string, payload?: any): Promise<T> {
  const res = await ipcRenderer.invoke(channel, payload)
  if (res && typeof res === 'object' && 'ok' in res) {
    if (res.ok) {
      return res.data
    }
    const err = res.error || { message: 'Une erreur est survenue' }
    throw new Error(err.message || String(err))
  }
  return res
}

const api: WeFlowPneusApi = {
  license: {
    getStatus: () => invoke(CHANNELS.LICENSE_GET_STATUS),
    activate: (licenseId, activationCode) => invoke(CHANNELS.LICENSE_ACTIVATE, { licenseId, activationCode }),
    validate: () => invoke(CHANNELS.LICENSE_VALIDATE)
  },

  settings: {
    getProfile: () => invoke(CHANNELS.PROFILE_GET),
    updateProfile: (profile) => invoke(CHANNELS.PROFILE_UPDATE, profile)
  },

  products: {
    list: (filter) => invoke(CHANNELS.PRODUCTS_LIST, filter),
    get: (id) => invoke(CHANNELS.PRODUCTS_GET, id),
    create: (data) => invoke(CHANNELS.PRODUCTS_CREATE, data),
    update: (id, data) => invoke(CHANNELS.PRODUCTS_UPDATE, { id, data }),
    delete: (id) => invoke(CHANNELS.PRODUCTS_DELETE, id),
    searchDimensions: (query) => invoke(CHANNELS.PRODUCTS_SEARCH_DIMENSIONS, query)
  },

  vehicles: {
    getBrands: () => invoke(CHANNELS.VEHICLES_GET_BRANDS),
    getModels: (brandId) => invoke(CHANNELS.VEHICLES_GET_MODELS, brandId),
    getFitments: (brandId, modelId) => invoke(CHANNELS.VEHICLES_GET_FITMENTS, { brandId, modelId }),
    searchCompatibility: (params) => invoke(CHANNELS.VEHICLES_SEARCH_COMPATIBILITY, params),
    createFitment: (data) => invoke(CHANNELS.VEHICLES_CREATE_FITMENT, data),
    deleteFitment: (id) => invoke(CHANNELS.VEHICLES_DELETE_FITMENT, id)
  },

  stock: {
    listMovements: (productId) => invoke(CHANNELS.STOCK_LIST_MOVEMENTS, productId),
    adjust: (productId, quantityDelta, reason) =>
      invoke(CHANNELS.STOCK_ADJUST, { productId, quantityDelta, reason }),
    getSummary: () => invoke(CHANNELS.STOCK_GET_SUMMARY)
  },

  customers: {
    list: (search) => invoke(CHANNELS.CUSTOMERS_LIST, search),
    get: (id) => invoke(CHANNELS.CUSTOMERS_GET, id),
    create: (data) => invoke(CHANNELS.CUSTOMERS_CREATE, data),
    update: (id, data) => invoke(CHANNELS.CUSTOMERS_UPDATE, { id, data }),
    delete: (id) => invoke(CHANNELS.CUSTOMERS_DELETE, id),
    getVehicles: (customerId) => invoke(CHANNELS.CUSTOMERS_GET_VEHICLES, customerId),
    createVehicle: (data) => invoke(CHANNELS.CUSTOMERS_CREATE_VEHICLE, data),
    deleteVehicle: (id) => invoke(CHANNELS.CUSTOMERS_DELETE_VEHICLE, id)
  },

  suppliers: {
    list: (search) => invoke(CHANNELS.SUPPLIERS_LIST, search),
    get: (id) => invoke(CHANNELS.SUPPLIERS_GET, id),
    create: (data) => invoke(CHANNELS.SUPPLIERS_CREATE, data),
    update: (id, data) => invoke(CHANNELS.SUPPLIERS_UPDATE, { id, data }),
    delete: (id) => invoke(CHANNELS.SUPPLIERS_DELETE, id)
  },

  purchases: {
    list: () => invoke(CHANNELS.PURCHASES_LIST),
    get: (id) => invoke(CHANNELS.PURCHASES_GET, id),
    create: (data) => invoke(CHANNELS.PURCHASES_CREATE, data),
    receive: (id) => invoke(CHANNELS.PURCHASES_RECEIVE, id),
    delete: (id) => invoke(CHANNELS.PURCHASES_DELETE, id)
  },

  sales: {
    list: (filter) => invoke(CHANNELS.SALES_LIST, filter),
    get: (id) => invoke(CHANNELS.SALES_GET, id),
    create: (data) => invoke(CHANNELS.SALES_CREATE, data),
    addPayment: (saleId, amount, paymentMethod, note) =>
      invoke(CHANNELS.SALES_ADD_PAYMENT, { saleId, amount, paymentMethod, note }),
    cancel: (id, reason) => invoke(CHANNELS.SALES_CANCEL, { id, reason })
  },

  quotations: {
    list: () => invoke(CHANNELS.QUOTATIONS_LIST),
    get: (id) => invoke(CHANNELS.QUOTATIONS_GET, id),
    create: (data) => invoke(CHANNELS.QUOTATIONS_CREATE, data),
    update: (id, data) => invoke(CHANNELS.QUOTATIONS_UPDATE, { id, data }),
    convertToSale: (id) => invoke(CHANNELS.QUOTATIONS_CONVERT_TO_SALE, id),
    delete: (id) => invoke(CHANNELS.QUOTATIONS_DELETE, id)
  },

  services: {
    list: () => invoke(CHANNELS.SERVICES_LIST),
    create: (data) => invoke(CHANNELS.SERVICES_CREATE, data),
    update: (id, data) => invoke(CHANNELS.SERVICES_UPDATE, { id, data }),
    delete: (id) => invoke(CHANNELS.SERVICES_DELETE, id)
  },

  serviceOrders: {
    list: () => invoke(CHANNELS.SERVICE_ORDERS_LIST),
    get: (id) => invoke(CHANNELS.SERVICE_ORDERS_GET, id),
    create: (data) => invoke(CHANNELS.SERVICE_ORDERS_CREATE, data),
    updateStatus: (id, status) => invoke(CHANNELS.SERVICE_ORDERS_UPDATE_STATUS, { id, status })
  },

  appointments: {
    list: (dateOrWeek) => invoke(CHANNELS.APPOINTMENTS_LIST, dateOrWeek),
    create: (data) => invoke(CHANNELS.APPOINTMENTS_CREATE, data),
    update: (id, data) => invoke(CHANNELS.APPOINTMENTS_UPDATE, { id, data }),
    delete: (id) => invoke(CHANNELS.APPOINTMENTS_DELETE, id)
  },

  warranties: {
    list: () => invoke(CHANNELS.WARRANTIES_LIST),
    get: (id) => invoke(CHANNELS.WARRANTIES_GET, id),
    create: (data) => invoke(CHANNELS.WARRANTIES_CREATE, data),
    updateStatus: (id, status, notes) =>
      invoke(CHANNELS.WARRANTIES_UPDATE_STATUS, { id, status, notes })
  },

  cash: {
    getCurrentSession: () => invoke(CHANNELS.CASH_GET_CURRENT_SESSION),
    openSession: (initialCash, notes) => invoke(CHANNELS.CASH_OPEN_SESSION, { initialCash, notes }),
    closeSession: (actualCash, notes) => invoke(CHANNELS.CASH_CLOSE_SESSION, { actualCash, notes }),
    listMovements: (sessionId) => invoke(CHANNELS.CASH_LIST_MOVEMENTS, sessionId),
    addMovement: (type, category, amount, method, description) =>
      invoke(CHANNELS.CASH_ADD_MOVEMENT, { type, category, amount, method, description })
  },

  expenses: {
    list: () => invoke(CHANNELS.EXPENSES_LIST),
    create: (data) => invoke(CHANNELS.EXPENSES_CREATE, data),
    delete: (id) => invoke(CHANNELS.EXPENSES_DELETE, id)
  },

  dashboard: {
    getStats: (period) => invoke(CHANNELS.DASHBOARD_GET_STATS, period)
  },

  reports: {
    getFinancial: (period) => invoke(CHANNELS.REPORTS_GET_FINANCIAL, period)
  },

  documents: {
    printInvoice: (saleId) => invoke(CHANNELS.DOCUMENTS_PRINT_INVOICE, saleId),
    exportPdfInvoice: (saleId) => invoke(CHANNELS.DOCUMENTS_EXPORT_PDF_INVOICE, saleId),
    printTicket: (saleId) => invoke(CHANNELS.DOCUMENTS_PRINT_TICKET, saleId),
    printQuotation: (quoteId) => invoke(CHANNELS.DOCUMENTS_PRINT_QUOTATION, quoteId),
    exportPdfQuotation: (quoteId) => invoke(CHANNELS.DOCUMENTS_EXPORT_PDF_QUOTATION, quoteId),
    printPurchase: (purchaseId) => invoke(CHANNELS.DOCUMENTS_PRINT_PURCHASE, purchaseId),
    printServiceOrder: (orderId) => invoke(CHANNELS.DOCUMENTS_PRINT_SERVICE_ORDER, orderId),
    printClosingZ: (sessionId) => invoke(CHANNELS.DOCUMENTS_PRINT_CLOSING_Z, sessionId),
    printLabels: (labels) => invoke(CHANNELS.DOCUMENTS_PRINT_LABELS, labels),
    exportPdfLabels: (labels) => invoke(CHANNELS.DOCUMENTS_EXPORT_PDF_LABELS, labels),
    exportReportPdf: (reportType, period) =>
      invoke(CHANNELS.DOCUMENTS_EXPORT_REPORT_PDF, { reportType, period }),
    getPrinters: () => invoke(CHANNELS.DOCUMENTS_GET_PRINTERS)
  },

  backup: {
    create: () => invoke(CHANNELS.BACKUP_CREATE),
    restore: (filePath) => invoke(CHANNELS.BACKUP_RESTORE, filePath),
    list: () => invoke(CHANNELS.BACKUP_LIST)
  },

  updater: {
    check: () => invoke(CHANNELS.UPDATER_CHECK),
    download: () => invoke(CHANNELS.UPDATER_DOWNLOAD),
    install: () => invoke(CHANNELS.UPDATER_INSTALL),
    getStatus: () => invoke(CHANNELS.UPDATER_GET_STATUS),
    onStatusChange: (callback: (status: UpdateSnapshot) => void) => {
      const listener = (_: any, status: UpdateSnapshot) => callback(status)
      ipcRenderer.on(CHANNELS.UPDATER_STATUS_CHANGED, listener)
      return () => {
        ipcRenderer.removeListener(CHANNELS.UPDATER_STATUS_CHANGED, listener)
      }
    }
  }
}

contextBridge.exposeInMainWorld('pneusApi', api)

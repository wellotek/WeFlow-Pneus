export const CHANNELS = {
  // License
  LICENSE_GET_STATUS: 'license:getStatus',
  LICENSE_ACTIVATE: 'license:activate',
  LICENSE_VALIDATE: 'license:validate',

  // Store & Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  PROFILE_GET: 'profile:get',
  PROFILE_UPDATE: 'profile:update',
  TAX_RATES_LIST: 'settings:listTaxRates',
  TAX_RATES_CREATE: 'settings:createTaxRate',
  TAX_RATES_UPDATE: 'settings:updateTaxRate',
  TAX_RATES_DELETE: 'settings:deleteTaxRate',

  // App & Zoom
  APP_GET_ZOOM: 'app:getZoom',
  APP_SET_ZOOM: 'app:setZoom',

  // Media
  MEDIA_UPLOAD_IMAGE: 'media:uploadImage',
  MEDIA_DELETE_IMAGE: 'media:deleteImage',

  // Products & Tires
  PRODUCTS_LIST: 'products:list',
  PRODUCTS_GET: 'products:get',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_ARCHIVE: 'products:archive',
  PRODUCTS_SEARCH_DIMENSIONS: 'products:searchDimensions',

  // Vehicle Compatibility
  VEHICLES_GET_BRANDS: 'vehicles:getBrands',
  VEHICLES_GET_MODELS: 'vehicles:getModels',
  VEHICLES_GET_FITMENTS: 'vehicles:getFitments',
  VEHICLES_SEARCH_COMPATIBILITY: 'vehicles:searchCompatibility',
  VEHICLES_CREATE_FITMENT: 'vehicles:createFitment',
  VEHICLES_DELETE_FITMENT: 'vehicles:deleteFitment',

  // Stock & Inventory
  STOCK_LIST_MOVEMENTS: 'stock:listMovements',
  STOCK_ADJUST: 'stock:adjust',
  STOCK_GET_SUMMARY: 'stock:getSummary',

  // Customers & Customer Vehicles
  CUSTOMERS_LIST: 'customers:list',
  CUSTOMERS_GET: 'customers:get',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_ARCHIVE: 'customers:archive',
  CUSTOMERS_GET_VEHICLES: 'customers:getVehicles',
  CUSTOMERS_CREATE_VEHICLE: 'customers:createVehicle',
  CUSTOMERS_UPDATE_VEHICLE: 'customers:updateVehicle',
  CUSTOMERS_DELETE_VEHICLE: 'customers:deleteVehicle',
  CUSTOMERS_ARCHIVE_VEHICLE: 'customers:archiveVehicle',

  // Suppliers & Purchases
  SUPPLIERS_LIST: 'suppliers:list',
  SUPPLIERS_GET: 'suppliers:get',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_UPDATE: 'suppliers:update',
  SUPPLIERS_DELETE: 'suppliers:delete',
  SUPPLIERS_ARCHIVE: 'suppliers:archive',
  SUPPLIERS_LIST_PAYMENTS: 'suppliers:listPayments',
  SUPPLIERS_ADD_PAYMENT: 'suppliers:addPayment',
  PURCHASES_LIST: 'purchases:list',
  PURCHASES_GET: 'purchases:get',
  PURCHASES_CREATE: 'purchases:create',
  PURCHASES_RECEIVE: 'purchases:receive',
  PURCHASES_RECEIVE_ITEMS: 'purchases:receiveItems',
  PURCHASES_DELETE: 'purchases:delete',
  PURCHASES_ARCHIVE: 'purchases:archive',

  // Sales & POS
  SALES_LIST: 'sales:list',
  SALES_GET: 'sales:get',
  SALES_CREATE: 'sales:create',
  SALES_ADD_PAYMENT: 'sales:addPayment',
  SALES_CANCEL: 'sales:cancel',
  SALES_ARCHIVE: 'sales:archive',

  // Quotations
  QUOTATIONS_LIST: 'quotations:list',
  QUOTATIONS_GET: 'quotations:get',
  QUOTATIONS_CREATE: 'quotations:create',
  QUOTATIONS_UPDATE: 'quotations:update',
  QUOTATIONS_DUPLICATE: 'quotations:duplicate',
  QUOTATIONS_CONVERT_TO_SALE: 'quotations:convertToSale',
  QUOTATIONS_DELETE: 'quotations:delete',

  // Workshop Services
  SERVICES_LIST: 'services:list',
  SERVICES_CREATE: 'services:create',
  SERVICES_UPDATE: 'services:update',
  SERVICES_DELETE: 'services:delete',
  SERVICE_ORDERS_LIST: 'serviceOrders:list',
  SERVICE_ORDERS_GET: 'serviceOrders:get',
  SERVICE_ORDERS_CREATE: 'serviceOrders:create',
  SERVICE_ORDERS_UPDATE_STATUS: 'serviceOrders:updateStatus',

  // Appointments
  APPOINTMENTS_LIST: 'appointments:list',
  APPOINTMENTS_CREATE: 'appointments:create',
  APPOINTMENTS_UPDATE: 'appointments:update',
  APPOINTMENTS_DELETE: 'appointments:delete',

  // Warranties & Returns
  WARRANTIES_LIST: 'warranties:list',
  WARRANTIES_GET: 'warranties:get',
  WARRANTIES_CREATE: 'warranties:create',
  WARRANTIES_UPDATE: 'warranties:update',
  WARRANTIES_UPDATE_STATUS: 'warranties:updateStatus',
  WARRANTIES_ARCHIVE: 'warranties:archive',

  // Cash Register & Expenses
  CASH_GET_CURRENT_SESSION: 'cash:getCurrentSession',
  CASH_OPEN_SESSION: 'cash:openSession',
  CASH_CLOSE_SESSION: 'cash:closeSession',
  CASH_LIST_MOVEMENTS: 'cash:listMovements',
  CASH_ADD_MOVEMENT: 'cash:addMovement',
  EXPENSES_LIST: 'expenses:list',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_DELETE: 'expenses:delete',

  // Dashboard & Reports
  DASHBOARD_GET_STATS: 'dashboard:getStats',
  REPORTS_GET_FINANCIAL: 'reports:getFinancial',

  // Printing & Document Generation
  DOCUMENTS_PRINT_INVOICE: 'documents:printInvoice',
  DOCUMENTS_EXPORT_PDF_INVOICE: 'documents:exportPdfInvoice',
  DOCUMENTS_PRINT_TICKET: 'documents:printTicket',
  DOCUMENTS_PRINT_QUOTATION: 'documents:printQuotation',
  DOCUMENTS_EXPORT_PDF_QUOTATION: 'documents:exportPdfQuotation',
  DOCUMENTS_PRINT_PURCHASE: 'documents:printPurchase',
  DOCUMENTS_PRINT_SERVICE_ORDER: 'documents:printServiceOrder',
  DOCUMENTS_PRINT_CLOSING_Z: 'documents:printClosingZ',
  DOCUMENTS_PRINT_LABELS: 'documents:printLabels',
  DOCUMENTS_EXPORT_PDF_LABELS: 'documents:exportPdfLabels',
  DOCUMENTS_EXPORT_REPORT_PDF: 'documents:exportReportPdf',
  DOCUMENTS_EXPORT_CSV: 'documents:exportCsv',
  DOCUMENTS_EXPORT_LIST_PDF: 'documents:exportListPdf',
  DOCUMENTS_GET_PRINTERS: 'documents:getPrinters',

  // Backup & Restore
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',

  // Updates
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_GET_STATUS: 'updater:getStatus',
  UPDATER_STATUS_CHANGED: 'updater:statusChanged'
} as const

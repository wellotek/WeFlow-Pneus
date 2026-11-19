import type {
  Appointment,
  CashMovement,
  CashSession,
  Customer,
  CustomerVehicle,
  DashboardStats,
  Expense,
  FinancialReportData,
  LabelPrintConfig,
  LicenseUiState,
  Product,
  Purchase,
  Quotation,
  Sale,
  Service,
  ServiceOrder,
  TaxRate,
  SupplierPayment,
  StoreProfile,
  Supplier,
  TireFilter,
  VehicleBrand,
  VehicleFitment,
  VehicleModel,
  WarrantyClaim
} from './types'
import type { UpdateSnapshot } from './updates'

export interface WeFlowPneusApi {
  // License
  license: {
    getStatus: () => Promise<LicenseUiState>
    activate: (licenseId: string, activationCode: string) => Promise<LicenseUiState>
    validate: () => Promise<LicenseUiState>
  }

  // App & Zoom
  app: {
    getZoom: () => Promise<number>
    setZoom: (factor: number) => Promise<number>
  }

  // Media & Images
  media: {
    uploadImage: (folder: 'products' | 'customers' | 'vehicles', fileData: string, fileName?: string) => Promise<{ success: boolean; path: string }>
    deleteImage: (filePath: string) => Promise<boolean>
  }

  // Profile & Settings
  settings: {
    getProfile: () => Promise<StoreProfile>
    updateProfile: (profile: Partial<StoreProfile>) => Promise<StoreProfile>
    listTaxRates: (includeInactive?: boolean) => Promise<TaxRate[]>
    createTaxRate: (data: Omit<TaxRate, 'id' | 'created_at'>) => Promise<TaxRate>
    updateTaxRate: (id: string, data: Partial<TaxRate>) => Promise<TaxRate>
    deleteTaxRate: (id: string) => Promise<boolean>
  }

  // Products & Tires
  products: {
    list: (filter?: TireFilter) => Promise<Product[]>
    get: (id: string) => Promise<Product | null>
    create: (data: Partial<Product> & { designation?: string }) => Promise<Product>
    update: (id: string, data: Partial<Product>) => Promise<Product>
    delete: (id: string) => Promise<boolean>
    archive: (id: string) => Promise<boolean>
    searchDimensions: (query: string) => Promise<string[]>
  }

  // Vehicles & Compatibility
  vehicles: {
    getBrands: () => Promise<VehicleBrand[]>
    getModels: (brandId: string) => Promise<VehicleModel[]>
    getFitments: (brandId?: string, modelId?: string) => Promise<VehicleFitment[]>
    searchCompatibility: (params: { brand?: string; model?: string; dimension?: string }) => Promise<{
      fitments: VehicleFitment[]
      matchingProducts: Product[]
    }>
    createFitment: (data: Omit<VehicleFitment, 'id' | 'brand_name' | 'model_name'>) => Promise<VehicleFitment>
    deleteFitment: (id: string) => Promise<boolean>
  }

  // Stock
  stock: {
    listMovements: (productId?: string) => Promise<any[]>
    adjust: (productId: string, quantityDelta: number, reason: string) => Promise<Product>
    getSummary: () => Promise<{ totalItems: number; totalValue: number; lowStockCount: number }>
  }

  // Customers & Customer Vehicles
  customers: {
    list: (search?: string) => Promise<Customer[]>
    get: (id: string) => Promise<Customer | null>
    create: (data: Omit<Customer, 'id' | 'balance_due' | 'created_at'>) => Promise<Customer>
    update: (id: string, data: Partial<Customer>) => Promise<Customer>
    delete: (id: string) => Promise<boolean>
    archive: (id: string) => Promise<boolean>
    getVehicles: (customerId: string) => Promise<CustomerVehicle[]>
    createVehicle: (data: Omit<CustomerVehicle, 'id' | 'created_at'>) => Promise<CustomerVehicle>
    updateVehicle: (id: string, data: Partial<CustomerVehicle>) => Promise<CustomerVehicle>
    deleteVehicle: (id: string) => Promise<boolean>
    archiveVehicle: (id: string) => Promise<boolean>
  }

  // Suppliers & Purchases
  suppliers: {
    list: (search?: string) => Promise<Supplier[]>
    get: (id: string) => Promise<Supplier | null>
    create: (data: Omit<Supplier, 'id' | 'balance_due' | 'created_at'>) => Promise<Supplier>
    update: (id: string, data: Partial<Supplier>) => Promise<Supplier>
    delete: (id: string) => Promise<boolean>
    archive: (id: string) => Promise<boolean>
    listPayments: (supplierId?: string) => Promise<SupplierPayment[]>
    addPayment: (data: Omit<SupplierPayment, 'id' | 'created_at'>) => Promise<SupplierPayment>
  }
  purchases: {
    list: () => Promise<Purchase[]>
    get: (id: string) => Promise<Purchase | null>
    create: (data: any) => Promise<Purchase>
    receive: (id: string) => Promise<Purchase>
    receiveItems: (id: string, receivedItems: { itemId: string; receivedQty: number }[]) => Promise<Purchase>
    delete: (id: string) => Promise<boolean>
    archive: (id: string) => Promise<boolean>
  }

  // Sales & POS
  sales: {
    list: (filter?: any) => Promise<Sale[]>
    get: (id: string) => Promise<Sale | null>
    create: (data: any) => Promise<Sale>
    addPayment: (saleId: string, amount: number, paymentMethod: string, note?: string) => Promise<Sale>
    cancel: (id: string, reason?: string) => Promise<boolean>
    archive: (id: string) => Promise<boolean>
  }

  // Quotations
  quotations: {
    list: () => Promise<Quotation[]>
    get: (id: string) => Promise<Quotation | null>
    create: (data: any) => Promise<Quotation>
    update: (id: string, data: any) => Promise<Quotation>
    duplicate: (id: string) => Promise<Quotation>
    convertToSale: (id: string) => Promise<Sale>
    delete: (id: string) => Promise<boolean>
  }

  // Workshop Services
  services: {
    list: () => Promise<Service[]>
    create: (data: Omit<Service, 'id'>) => Promise<Service>
    update: (id: string, data: Partial<Service>) => Promise<Service>
    delete: (id: string) => Promise<boolean>
  }
  serviceOrders: {
    list: () => Promise<ServiceOrder[]>
    get: (id: string) => Promise<ServiceOrder | null>
    create: (data: any) => Promise<ServiceOrder>
    updateStatus: (id: string, status: string) => Promise<ServiceOrder>
  }

  // Appointments
  appointments: {
    list: (dateOrWeek?: string) => Promise<Appointment[]>
    create: (data: Omit<Appointment, 'id' | 'created_at'>) => Promise<Appointment>
    update: (id: string, data: Partial<Appointment>) => Promise<Appointment>
    delete: (id: string) => Promise<boolean>
  }

  // Warranties & Returns
  warranties: {
    list: () => Promise<WarrantyClaim[]>
    get: (id: string) => Promise<WarrantyClaim | null>
    create: (data: any) => Promise<WarrantyClaim>
    update: (id: string, data: any) => Promise<WarrantyClaim>
    updateStatus: (id: string, status: string, notes?: string) => Promise<WarrantyClaim>
    archive: (id: string) => Promise<boolean>
  }

  // Cash Register & Expenses
  cash: {
    getCurrentSession: () => Promise<CashSession | null>
    openSession: (initialCash: number, notes?: string) => Promise<CashSession>
    closeSession: (actualCash: number, notes?: string) => Promise<CashSession>
    listMovements: (sessionId?: string) => Promise<CashMovement[]>
    addMovement: (type: 'in' | 'out', category: string, amount: number, method: string, description: string) => Promise<CashMovement>
  }
  expenses: {
    list: () => Promise<Expense[]>
    create: (data: Omit<Expense, 'id' | 'created_at'>) => Promise<Expense>
    delete: (id: string) => Promise<boolean>
  }

  // Dashboard & Reports
  dashboard: {
    getStats: (period?: string) => Promise<DashboardStats>
  }
  reports: {
    getFinancial: (period?: string) => Promise<FinancialReportData>
  }

  // Printing & PDF Generation
  documents: {
    printInvoice: (saleId: string) => Promise<void>
    exportPdfInvoice: (saleId: string) => Promise<{ cancelled: boolean; path?: string }>
    printTicket: (saleId: string) => Promise<void>
    printQuotation: (quoteId: string) => Promise<void>
    exportPdfQuotation: (quoteId: string) => Promise<{ cancelled: boolean; path?: string }>
    printPurchase: (purchaseId: string) => Promise<void>
    printServiceOrder: (orderId: string) => Promise<void>
    printClosingZ: (sessionId: string) => Promise<void>
    printLabels: (labels: LabelPrintConfig[]) => Promise<void>
    exportPdfLabels: (labels: LabelPrintConfig[]) => Promise<{ cancelled: boolean; path?: string }>
    exportReportPdf: (reportType: string, period?: string) => Promise<{ cancelled: boolean; path?: string }>
    exportCsv: (filename: string, headers: string[], rows: (string | number)[][]) => Promise<{ cancelled: boolean; path?: string }>
    exportListPdf: (title: string, columns: { header: string; dataKey: string }[], rows: any[], options?: any) => Promise<{ cancelled: boolean; path?: string }>
    getPrinters: () => Promise<string[]>
  }

  // Backup & Restore
  backup: {
    create: () => Promise<{ success: boolean; filePath: string }>
    restore: (filePath: string) => Promise<{ success: boolean }>
    list: () => Promise<{ fileName: string; filePath: string; size: number; createdAt: string }[]>
  }

  // Auto-Update
  updater: {
    check: () => Promise<UpdateSnapshot>
    download: () => Promise<void>
    install: () => Promise<void>
    getStatus: () => Promise<UpdateSnapshot>
    onStatusChange: (callback: (status: UpdateSnapshot) => void) => () => void
  }
}

declare global {
  interface Window {
    pneusApi: WeFlowPneusApi
  }
}

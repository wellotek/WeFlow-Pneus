export type { UpdateSnapshot } from './updates'
export * from './version'

// --- LICENSE TYPES ---
export interface LicenseTerms {
  lifetime?: boolean
  expiresAt?: string
  durationMonths?: number
  activatedAt?: string
}

export interface LicenseRecord {
  v: 1
  license_id: string
  installation_id: string
  status: string
  lastValidatedAt: string
  offlineUntil: string
  product: string
  version: string
  integrity: string
  serverToken?: string
  lifetime?: boolean
  expiresAt?: string
  durationMonths?: number
  activatedAt?: string
}

export interface LicenseUiState {
  status: 'active' | 'activate' | 'offline' | 'blocked'
  messageKey?: string
  licenseId?: string
  offlineUntil?: string
  lastValidatedAt?: string
  lifetime?: boolean
  expiresAt?: string
}

// --- STORE PROFILE & SETTINGS ---
export interface StoreProfile {
  store_name: string
  phone: string
  address: string
  wilaya: string
  email?: string
  rc_number?: string
  nif_number?: string
  nis_number?: string
  ai_number?: string
  default_tax_rate: number
  default_printer?: string
  default_label_printer?: string
  ticket_format: '58mm' | '80mm'
  invoice_footer?: string
  backup_directory?: string
  auto_backup_enabled: boolean
  language: 'fr' | 'ar'
  allow_negative_stock: boolean
}

// --- PRODUCTS & TIRES ---
export type TireType = 'summer' | 'winter' | 'all_season'
export type TireCondition = 'new' | 'used'
export type VehicleCategory = 'passenger' | '4x4_suv' | 'commercial' | 'truck' | 'moto'

export interface Product {
  id: string
  reference: string
  product_code: string
  barcode: string
  brand: string
  model_name: string
  description?: string
  dimension: string
  width: number
  height: number
  diameter: string
  load_index: string
  speed_rating: string
  tire_type: TireType
  condition: TireCondition
  vehicle_category: VehicleCategory
  buy_price: number
  sell_price: number
  wholesale_price: number
  stock_quantity: number
  min_stock_alert: number
  location?: string
  dot?: string
  created_at: string
  updated_at: string
}

export interface TireFilter {
  search?: string
  brand?: string
  dimension?: string
  tire_type?: string
  condition?: string
  vehicle_category?: string
  stock_status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
}

// --- VEHICLE COMPATIBILITY ---
export interface VehicleBrand {
  id: string
  name: string
}

export interface VehicleModel {
  id: string
  brand_id: string
  name: string
}

export interface VehicleFitment {
  id: string
  brand_id: string
  brand_name: string
  model_id: string
  model_name: string
  year_range: string
  engine: string
  front_dimension: string
  rear_dimension: string
  notes?: string
}

// --- STOCK & MOVEMENTS ---
export type MovementType =
  | 'in_purchase'
  | 'out_sale'
  | 'adjustment_plus'
  | 'adjustment_minus'
  | 'return_in'
  | 'service_use'

export interface StockMovement {
  id: string
  product_id: string
  product_ref: string
  product_name: string
  type: MovementType
  quantity: number
  unit_cost: number
  reference_doc_type?: string
  reference_doc_id?: string
  reason?: string
  date: string
  created_at: string
}

// --- CUSTOMERS & VEHICLES ---
export interface Customer {
  id: string
  type: 'individual' | 'business'
  name: string
  phone: string
  address?: string
  wilaya?: string
  email?: string
  notes?: string
  balance_due: number
  created_at: string
  vehicle_count?: number
}

export interface CustomerVehicle {
  id: string
  customer_id: string
  customer_name?: string
  brand: string
  model: string
  year?: string
  license_plate: string
  mileage?: number
  front_dimension?: string
  rear_dimension?: string
  notes?: string
  created_at: string
}

// --- SUPPLIERS & PURCHASES ---
export interface Supplier {
  id: string
  name: string
  phone: string
  address?: string
  wilaya?: string
  contact_person?: string
  email?: string
  balance_due: number
  created_at: string
}

export type PurchaseStatus = 'ordered' | 'received' | 'cancelled'

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  reference: string
  brand: string
  dimension: string
  quantity: number
  unit_cost: number
  total_cost: number
}

export interface Purchase {
  id: string
  purchase_number: string
  supplier_id: string
  supplier_name: string
  date: string
  status: PurchaseStatus
  total_amount: number
  paid_amount: number
  balance_due: number
  notes?: string
  created_at: string
  items?: PurchaseItem[]
}

// --- SALES & POS ---
export type PaymentMethod = 'cash' | 'check' | 'cib' | 'transfer' | 'credit'
export type SaleStatus = 'paid' | 'partial' | 'pending' | 'cancelled'

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string | null
  item_type: 'product' | 'service'
  reference: string
  designation: string
  quantity: number
  unit_price: number
  tax_rate: number
  total_line: number
}

export interface SalePayment {
  id: string
  sale_id: string
  amount: number
  payment_method: PaymentMethod
  date: string
  reference_note?: string
}

export interface Sale {
  id: string
  invoice_number: string
  customer_id?: string | null
  customer_name?: string
  customer_phone?: string
  vehicle_id?: string | null
  vehicle_info?: string
  license_plate?: string
  mileage?: number
  date: string
  sale_type: 'retail' | 'wholesale'
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  payment_method: PaymentMethod
  status: SaleStatus
  notes?: string
  created_at: string
  items?: SaleItem[]
  payments?: SalePayment[]
}

// --- QUOTATIONS ---
export type QuotationStatus = 'draft' | 'sent' | 'converted' | 'expired'

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id?: string | null
  item_type: 'product' | 'service'
  reference: string
  designation: string
  quantity: number
  unit_price: number
  total_line: number
}

export interface Quotation {
  id: string
  quote_number: string
  customer_id?: string | null
  customer_name?: string
  customer_phone?: string
  vehicle_info?: string
  date: string
  valid_until: string
  subtotal: number
  tax_amount: number
  total_amount: number
  status: QuotationStatus
  converted_sale_id?: string | null
  notes?: string
  created_at: string
  items?: QuotationItem[]
}

// --- WORKSHOP SERVICES ---
export type ServiceCategory = 'montage' | 'equilibrage' | 'reparation' | 'geometrie' | 'permutation' | 'autre'

export interface Service {
  id: string
  code: string
  name: string
  category: ServiceCategory
  default_price: number
  description?: string
}

export type ServiceOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface ServiceOrderItem {
  id: string
  service_order_id: string
  service_id: string
  service_name: string
  quantity: number
  unit_price: number
  notes?: string
}

export interface ServiceOrder {
  id: string
  order_number: string
  customer_id?: string | null
  customer_name?: string
  customer_phone?: string
  vehicle_info?: string
  license_plate?: string
  mileage?: number
  date: string
  technician_name?: string
  status: ServiceOrderStatus
  total_amount: number
  notes?: string
  created_at: string
  items?: ServiceOrderItem[]
}

// --- APPOINTMENTS ---
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  customer_id?: string | null
  customer_name: string
  phone: string
  vehicle_info?: string
  service_requested: string
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  notes?: string
  technician_name?: string
  created_at: string
}

// --- WARRANTIES & RETURNS ---
export type WarrantyStatus =
  | 'new'
  | 'investigating'
  | 'accepted'
  | 'rejected'
  | 'replaced'
  | 'refunded'
  | 'closed'

export interface WarrantyClaim {
  id: string
  claim_number: string
  customer_id?: string | null
  customer_name: string
  customer_phone: string
  sale_id?: string | null
  invoice_number?: string
  product_id?: string | null
  product_ref: string
  purchase_date?: string
  claim_date: string
  reason: string
  defect_description: string
  status: WarrantyStatus
  resolution_notes?: string
  replacement_product_id?: string | null
  refund_amount?: number
  created_at: string
}

// --- CASH & EXPENSES ---
export type CashSessionStatus = 'open' | 'closed'

export interface CashSession {
  id: string
  session_date: string
  opened_at: string
  closed_at?: string | null
  initial_cash: number
  total_in: number
  total_out: number
  calculated_cash: number
  actual_cash?: number | null
  difference?: number | null
  notes?: string
  status: CashSessionStatus
}

export interface CashMovement {
  id: string
  session_id: string
  type: 'in' | 'out'
  category: 'sale' | 'debt_payment' | 'expense' | 'supplier_payment' | 'deposit' | 'withdrawal'
  amount: number
  payment_method: PaymentMethod
  description: string
  date: string
  created_at: string
}

export type ExpenseCategory =
  | 'rent'
  | 'electricity'
  | 'salaries'
  | 'transport'
  | 'supplies'
  | 'maintenance'
  | 'other'

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  amount: number
  description: string
  payment_method: PaymentMethod
  paid_to?: string
  receipt_ref?: string
  created_at: string
}

// --- DASHBOARD & REPORTS ---
export interface DashboardStats {
  turnover: number
  salesCount: number
  netProfit: number
  totalStockCount: number
  stockValue: number
  totalCustomers: number
  appointmentsCount: number
  lowStockCount: number
  outOfStockCount: number
  totalExpenses: number
  commercialMargin: number
  recentSales: Sale[]
  lowStockAlerts: Product[]
  topSellingTires: { name: string; quantity: number }[]
  monthlySales: { month: string; turnover: number; profit: number }[]
}

export interface FinancialReportData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  revenueTrend: { date: string; revenue: number; expenses: number }[]
  paymentMethodsBreakdown: { method: string; amount: number; percentage: number }[]
  recentCashMovements: CashMovement[]
}

// --- PRINTING & LABELS ---
export interface LabelPrintConfig {
  productId: string
  reference: string
  brand: string
  model_name: string
  dimension: string
  load_index: string
  speed_rating: string
  tire_type: string
  price: number
  barcode: string
  quantity: number
}

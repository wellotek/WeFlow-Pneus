import { z } from 'zod'

export const activateLicenseSchema = z.object({
  licenseId: z.string().min(1),
  activationCode: z.string().min(1)
})

export const storeProfileSchema = z.object({
  store_name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  wilaya: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  rc_number: z.string().optional(),
  nif_number: z.string().optional(),
  nis_number: z.string().optional(),
  ai_number: z.string().optional(),
  default_tax_rate: z.number().min(0).max(100).default(19),
  default_printer: z.string().optional(),
  default_label_printer: z.string().optional(),
  ticket_format: z.enum(['58mm', '80mm']).default('80mm'),
  invoice_footer: z.string().optional(),
  backup_directory: z.string().optional(),
  auto_backup_enabled: z.boolean().default(true),
  language: z.enum(['fr', 'ar']).default('fr'),
  allow_negative_stock: z.boolean().default(false)
})

export const createProductSchema = z.object({
  reference: z.string().min(1),
  product_code: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().min(1),
  model_name: z.string().min(1),
  description: z.string().optional(),
  dimension: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  diameter: z.string().min(1),
  load_index: z.string().min(1),
  speed_rating: z.string().min(1),
  tire_type: z.enum(['summer', 'winter', 'all_season']).default('summer'),
  condition: z.enum(['new', 'used']).default('new'),
  vehicle_category: z.enum(['passenger', '4x4_suv', 'commercial', 'truck', 'moto']).default('passenger'),
  buy_price: z.number().min(0),
  sell_price: z.number().min(0),
  wholesale_price: z.number().min(0).default(0),
  stock_quantity: z.number().int().default(0),
  min_stock_alert: z.number().int().default(4),
  location: z.string().optional(),
  dot: z.string().optional()
})

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid()
})

export const customerSchema = z.object({
  type: z.enum(['individual', 'business']).default('individual'),
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
  wilaya: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional()
})

export const customerVehicleSchema = z.object({
  customer_id: z.string().uuid(),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.string().optional(),
  license_plate: z.string().min(1),
  mileage: z.number().optional(),
  front_dimension: z.string().optional(),
  rear_dimension: z.string().optional(),
  notes: z.string().optional()
})

export const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
  wilaya: z.string().optional(),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal(''))
})

export const createPurchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  reference: z.string().min(1),
  brand: z.string().min(1),
  dimension: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_cost: z.number().min(0)
})

export const createPurchaseSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_name: z.string().min(1),
  date: z.string().min(1),
  paid_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(createPurchaseItemSchema).min(1)
})

export const createSaleItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  item_type: z.enum(['product', 'service']),
  reference: z.string().min(1),
  designation: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).default(19)
})

export const createSaleSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  vehicle_info: z.string().optional(),
  license_plate: z.string().optional(),
  mileage: z.number().optional(),
  date: z.string().min(1),
  sale_type: z.enum(['retail', 'wholesale']).default('retail'),
  tax_rate: z.number().min(0).default(19),
  discount_amount: z.number().min(0).default(0),
  paid_amount: z.number().min(0).default(0),
  payment_method: z.enum(['cash', 'check', 'cib', 'transfer', 'credit']).default('cash'),
  notes: z.string().optional(),
  items: z.array(createSaleItemSchema).min(1)
})

export const createQuotationSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  vehicle_info: z.string().optional(),
  date: z.string().min(1),
  valid_until: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(createSaleItemSchema).min(1)
})

export const serviceSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['montage', 'equilibrage', 'reparation', 'geometrie', 'permutation', 'autre']),
  default_price: z.number().min(0),
  description: z.string().optional()
})

export const createServiceOrderSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  vehicle_info: z.string().optional(),
  license_plate: z.string().optional(),
  mileage: z.number().optional(),
  date: z.string().min(1),
  technician_name: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      service_id: z.string().uuid(),
      service_name: z.string().min(1),
      quantity: z.number().int().positive(),
      unit_price: z.number().min(0),
      notes: z.string().optional()
    })
  ).min(1)
})

export const appointmentSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1),
  phone: z.string().min(1),
  vehicle_info: z.string().optional(),
  service_requested: z.string().min(1),
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  notes: z.string().optional(),
  technician_name: z.string().optional()
})

export const warrantyClaimSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  sale_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().optional(),
  product_id: z.string().uuid().nullable().optional(),
  product_ref: z.string().min(1),
  purchase_date: z.string().optional(),
  claim_date: z.string().min(1),
  reason: z.string().min(1),
  defect_description: z.string().min(1)
})

export const expenseSchema = z.object({
  date: z.string().min(1),
  category: z.enum(['rent', 'electricity', 'salaries', 'transport', 'supplies', 'maintenance', 'other']),
  amount: z.number().positive(),
  description: z.string().min(1),
  payment_method: z.enum(['cash', 'check', 'cib', 'transfer', 'credit']).default('cash'),
  paid_to: z.string().optional(),
  receipt_ref: z.string().optional()
})

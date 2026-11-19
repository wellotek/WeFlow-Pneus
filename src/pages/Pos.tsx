import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Printer,
  Trash2,
  FileText,
  User,
  Car,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  PlusCircle,
  X,
  History
} from 'lucide-react'
import type { Customer, CustomerVehicle, PaymentMethod, Product, Service, StoreProfile, TaxRate } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

interface CartLine {
  id: string
  product_id?: string | null
  item_type: 'product' | 'service'
  reference: string
  designation: string
  quantity: number
  unit_price: number
  discount_amount: number
  tax_rate: number
  available_stock?: number
}

export const Pos: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)
  const navigate = useNavigate()

  // Store profile & TVA config
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null)
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])

  // Customers & Vehicles
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerVehicles, setCustomerVehicles] = useState<CustomerVehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [licensePlate, setLicensePlate] = useState<string>('')
  const [mileage, setMileage] = useState<string>('')

  // Quick Customer Create Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustType, setNewCustType] = useState<'individual' | 'business'>('individual')

  // Catalog for search
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ type: 'product' | 'service'; item: any }[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Cart Lines (start with empty cart for clean POS)
  const [cart, setCart] = useState<CartLine[]>([])

  // Payment & Financials
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)
  const [amountReceived, setAmountReceived] = useState<number | string>('')
  const [notes, setNotes] = useState<string>('')

  // Confirmation / Print Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [printChoice, setPrintChoice] = useState<'ticket' | 'invoice' | 'both' | 'none'>('ticket')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load initial store profile, customers, products, services, tax rates
  const loadData = async () => {
    try {
      const [profile, cList, pList, sList, rates] = await Promise.all([
        window.pneusApi.settings.getProfile(),
        window.pneusApi.customers.list(),
        window.pneusApi.products.list(),
        window.pneusApi.services.list(),
        window.pneusApi.settings.listTaxRates()
      ])
      setStoreProfile(profile)
      setCustomers(cList)
      setProducts(pList)
      setServices(sList)
      setTaxRates(rates)
    } catch (err) {
      console.error('Error loading POS data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Load vehicles when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      window.pneusApi.customers.getVehicles(selectedCustomerId).then((vList) => {
        setCustomerVehicles(vList)
        if (vList.length > 0) {
          setSelectedVehicleId(vList[0].id)
          setLicensePlate(vList[0].license_plate || '')
        } else {
          setSelectedVehicleId('')
          setLicensePlate('')
        }
      }).catch(() => {})
    } else {
      setCustomerVehicles([])
      setSelectedVehicleId('')
      setLicensePlate('')
    }
  }, [selectedCustomerId])

  // Real-time catalog search
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    const matchedProducts = products
      .filter(
        (p) =>
          p.reference.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.dimension.toLowerCase().includes(q) ||
          p.model_name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 10)
      .map((p) => ({ type: 'product' as const, item: p }))

    const matchedServices = services
      .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ type: 'service' as const, item: s }))

    setSearchResults([...matchedProducts, ...matchedServices])
    setIsSearchOpen(true)
  }, [searchQuery, products, services])

  // Add Item to Cart
  const addItemToCart = (type: 'product' | 'service', item: any) => {
    const defaultTax = storeProfile?.is_tva_enabled ? (storeProfile.default_tax_rate ?? 19) : 0
    if (type === 'product') {
      const existing = cart.find((l) => l.product_id === item.id)
      if (existing) {
        setCart(
          cart.map((l) =>
            l.product_id === item.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          )
        )
      } else {
        const newLine: CartLine = {
          id: Math.random().toString(36).substring(2, 9),
          product_id: item.id,
          item_type: 'product',
          reference: item.reference,
          designation: `${item.brand} ${item.dimension} ${item.model_name || ''}`.trim(),
          quantity: 1,
          unit_price: item.sell_price || 0,
          discount_amount: 0,
          tax_rate: defaultTax,
          available_stock: item.stock_quantity
        }
        setCart([...cart, newLine])
      }
    } else {
      const newLine: CartLine = {
        id: Math.random().toString(36).substring(2, 9),
        product_id: null,
        item_type: 'service',
        reference: item.code,
        designation: item.name,
        quantity: 1,
        unit_price: item.default_price || 0,
        discount_amount: 0,
        tax_rate: defaultTax
      }
      setCart([...cart, newLine])
    }

    setSearchQuery('')
    setIsSearchOpen(false)
    searchInputRef.current?.focus()
  }

  // Update line quantity
  const updateQuantity = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.id === lineId) {
            const nextQty = Math.max(1, line.quantity + delta)
            return { ...line, quantity: nextQty }
          }
          return line
        })
        .filter((l) => l.quantity > 0)
    )
  }

  // Set line unit price
  const updateUnitPrice = (lineId: string, price: number) => {
    setCart((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, unit_price: Math.max(0, price) } : l))
    )
  }

  // Set line discount
  const updateLineDiscount = (lineId: string, disc: number) => {
    setCart((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, discount_amount: Math.max(0, disc) } : l))
    )
  }

  // Remove line
  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.id !== lineId))
  }

  // Calculations
  const isTvaEnabled = Boolean(storeProfile?.is_tva_enabled)
  const defaultTaxRate = isTvaEnabled ? (storeProfile?.default_tax_rate ?? 19) : 0

  let subtotalHT = 0
  let totalLineDiscounts = 0
  for (const line of cart) {
    const lineTotal = line.quantity * line.unit_price
    subtotalHT += lineTotal
    totalLineDiscounts += line.discount_amount || 0
  }

  const taxableBase = Math.max(0, subtotalHT - totalLineDiscounts - globalDiscount)
  const totalTVA = isTvaEnabled ? (taxableBase * defaultTaxRate) / 100 : 0
  const totalTTC = Math.max(0, taxableBase + totalTVA)

  const numReceived = typeof amountReceived === 'number' ? amountReceived : parseFloat(amountReceived) || 0
  const changeDue = Math.max(0, numReceived - totalTTC)

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim()) return
    try {
      const created = await window.pneusApi.customers.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        type: newCustType
      })
      setCustomers((prev) => [created, ...prev])
      setSelectedCustomerId(created.id)
      setShowNewCustomerModal(false)
      setNewCustName('')
      setNewCustPhone('')
    } catch (err: any) {
      alert(`Erreur création client: ${err?.message || err}`)
    }
  }

  // Handle Complete Sale
  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      setErrorMessage(isAr ? 'السلة فارغة' : 'Le panier est vide.')
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
      const selectedVehicle = customerVehicles.find((v) => v.id === selectedVehicleId)

      const vehicleInfoStr = selectedVehicle
        ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.license_plate})`
        : licensePlate
        ? `Véhicule (${licensePlate})`
        : ''

      const today = new Date().toISOString().split('T')[0]

      const saleData = {
        customer_id: selectedCustomerId || null,
        customer_name: selectedCustomer ? selectedCustomer.name : (isAr ? 'زبون عابر' : 'Client Comptoir'),
        customer_phone: selectedCustomer?.phone || '',
        vehicle_id: selectedVehicleId || null,
        vehicle_info: vehicleInfoStr,
        license_plate: licensePlate.trim() || undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        date: today,
        sale_type: 'retail' as const,
        tax_rate: defaultTaxRate,
        discount_amount: totalLineDiscounts + globalDiscount,
        paid_amount: paymentMethod === 'credit' ? 0 : totalTTC,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        items: cart.map((line) => ({
          product_id: line.product_id || null,
          item_type: line.item_type,
          reference: line.reference,
          designation: line.designation,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate
        }))
      }

      const createdSale = await window.pneusApi.sales.create(saleData)

      // Handle Printing based on user choice
      if (printChoice === 'ticket' || printChoice === 'both') {
        try {
          await window.pneusApi.documents.printTicket(createdSale.id)
        } catch (printErr) {
          console.warn('Ticket print failed:', printErr)
        }
      }
      if (printChoice === 'invoice' || printChoice === 'both') {
        try {
          await window.pneusApi.documents.printInvoice(createdSale.id)
        } catch (printErr) {
          console.warn('Invoice print failed:', printErr)
        }
      }

      setSuccessMessage(
        isAr
          ? `تم تسجيل الفاتورة بنجاح: ${createdSale.invoice_number}`
          : `Vente enregistrée avec succès : ${createdSale.invoice_number}`
      )

      // Reset cart and form
      setCart([])
      setSelectedCustomerId('')
      setSelectedVehicleId('')
      setLicensePlate('')
      setMileage('')
      setGlobalDiscount(0)
      setAmountReceived('')
      setNotes('')
      setShowConfirmModal(false)

      // Reload products to update stock quantities
      window.pneusApi.products.list().then(setProducts)

      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    } catch (err: any) {
      console.error('Sale error:', err)
      setErrorMessage(err?.message || 'Erreur lors de la validation de la vente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#172235] text-[#F5BD18] flex items-center justify-center shadow-md">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
              {isAr ? 'نقطة البيع والصندوق (POS)' : 'Point de Vente & Caisse (POS)'}
            </h1>
            <p className="text-xs text-[#667085]">
              {isAr
                ? 'إصدار الفواتير الفورية، بيع الإطارات وخدمات الورشة'
                : 'Encaissement rapide, vente de pneus et services atelier au comptoir'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <History className="w-4 h-4 text-[#667085]" />
            <span>{isAr ? 'سجل الفواتير والمبيعات' : 'Historique des Ventes'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error alerts */}
      {successMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between text-red-800 text-sm font-semibold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Cart / Catalog (65%) + Right Summary (35%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Customer Selection + Catalog Search + Cart Lines (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3 min-h-0 bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm overflow-hidden">
          {/* Customer & Vehicle Header Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pb-3 border-b border-slate-100">
            {/* Customer selector */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1">
                {isAr ? 'الزبون' : 'Client'}
              </label>
              <div className="flex gap-1.5">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="flex-1 h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] px-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5BD18]"
                >
                  <option value="">{isAr ? 'زبون عابر (Comptoir)' : 'Client Comptoir (Passage)'}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(true)}
                  className="px-2.5 h-9 bg-[#F5BD18] hover:bg-[#e5b014] text-[#172235] text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-all"
                  title="Nouveau Client"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'جديد' : 'Nouveau'}</span>
                </button>
              </div>
            </div>

            {/* Vehicle Selector or License Plate */}
            <div>
              <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1">
                {isAr ? 'المركبة' : 'Véhicule'}
              </label>
              {customerVehicles.length > 0 ? (
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value)
                    const v = customerVehicles.find((veh) => veh.id === e.target.value)
                    if (v) setLicensePlate(v.license_plate || '')
                  }}
                  className="w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] px-2 focus:outline-none focus:ring-2 focus:ring-[#F5BD18]"
                >
                  {customerVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.license_plate})
                    </option>
                  ))}
                  <option value="">{isAr ? 'مركبة أخرى...' : 'Autre véhicule...'}</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={isAr ? 'رقم الترقيم (Matricule)' : 'Matricule / Plaque'}
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#172235] px-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5BD18]"
                />
              )}
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1">
                {isAr ? 'الكيلومترات' : 'Kilométrage'}
              </label>
              <input
                type="number"
                placeholder="Ex: 85000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#172235] px-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5BD18]"
              />
            </div>
          </div>

          {/* Catalog Instant Autocomplete Search */}
          <div className="relative">
            <div className="relative">
              <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  isAr
                    ? 'ابحث بالمرجع، الماركة، المقاس (205/55 R16) أو الباركود...'
                    : 'Rechercher par référence, marque, dimension (ex: 205/55 R16), code-barres ou service...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setIsSearchOpen(true)}
                className={`w-full h-11 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F5BD18] focus:bg-white transition-all shadow-inner ${
                  isAr ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4 text-left'
                }`}
              />
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 z-50 bg-white border border-[#E5E7EB] rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                {searchResults.map((res, idx) => {
                  if (res.type === 'product') {
                    const p: Product = res.item
                    const isLow = p.stock_quantity <= p.min_stock_alert
                    const isOut = p.stock_quantity <= 0
                    return (
                      <div
                        key={`p-${p.id}-${idx}`}
                        onClick={() => addItemToCart('product', p)}
                        className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {p.reference}
                          </span>
                          <span className="font-bold text-[#172235]">
                            {p.brand} {p.dimension}
                          </span>
                          <span className="text-[#667085]">{p.model_name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            Stock: {p.stock_quantity}
                          </span>
                          <span className="font-black text-[#172235]">
                            {formatCurrencyDA(p.sell_price)}
                          </span>
                        </div>
                      </div>
                    )
                  } else {
                    const s: Service = res.item
                    return (
                      <div
                        key={`s-${s.id}-${idx}`}
                        onClick={() => addItemToCart('service', s)}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                            SERVICE
                          </span>
                          <span className="font-bold text-[#172235]">{s.name}</span>
                        </div>
                        <span className="font-black text-[#172235]">
                          {formatCurrencyDA(s.default_price)}
                        </span>
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </div>

          {/* Quick Service Badges (Click to add workshop services in 1 second) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-[#667085] whitespace-nowrap">
              {isAr ? 'خدمات سريعة:' : 'Services rapides :'}
            </span>
            {services.slice(0, 6).map((srv) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => addItemToCart('service', srv)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#F5BD18] hover:text-[#172235] text-slate-700 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-colors border border-slate-200"
              >
                + {srv.name} ({formatCurrencyDA(srv.default_price)})
              </button>
            ))}
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">{isAr ? 'المرجع والتعيين' : 'Réf & Désignation'}</th>
                  <th className="py-2.5 px-3 text-center w-28">{isAr ? 'الكمية' : 'Quantité'}</th>
                  <th className="py-2.5 px-3 text-right w-24">{isAr ? 'سعر الوحدة' : 'Prix Unit.'}</th>
                  {isTvaEnabled && <th className="py-2.5 px-2 text-center w-14">TVA</th>}
                  <th className="py-2.5 px-3 text-right w-24">{isAr ? 'المجموع' : 'Total'}</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={isTvaEnabled ? 7 : 6} className="py-12 text-center text-[#667085]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-sm">
                          {isAr ? 'السلة فارغة. ابحث عن إطار أو خدمة لإضافتها.' : 'Panier vide. Recherchez un pneu ou un service ci-dessus.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((line, idx) => {
                    const lineTotal = line.quantity * line.unit_price - (line.discount_amount || 0)
                    const lineTTC = isTvaEnabled ? lineTotal * (1 + line.tax_rate / 100) : lineTotal
                    return (
                      <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-[#667085] font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#172235]">{line.designation}</div>
                          <div className="text-[10px] text-[#667085] font-mono">
                            {line.reference} {line.item_type === 'service' ? '• Service Atelier' : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(line.id, -1)}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-[#172235]">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(line.id, 1)}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={line.unit_price}
                            onChange={(e) => updateUnitPrice(line.id, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right font-bold text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-[#F5BD18]"
                          />
                        </td>
                        {isTvaEnabled && (
                          <td className="py-2 px-2 text-center font-semibold text-slate-600 text-[11px]">
                            {line.tax_rate}%
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-black text-[#172235] text-xs">
                          {formatCurrencyDA(lineTTC)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Total Card + Payment Mode + Encaissement (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          {/* Big Header Total Display (Matching screenshot design) */}
          <div className="bg-[#172235] text-white rounded-xl p-4 text-center shadow-md border-t-4 border-[#F5BD18]">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-300 block mb-1">
              {isAr ? 'المجموع الإجمالي الواجب دفعه' : 'TOTAL À PAYER (TTC)'}
            </span>
            <div className="text-2xl lg:text-3xl font-black text-[#F5BD18] tracking-tight">
              {formatCurrencyDA(totalTTC)}
            </div>
          </div>

          {/* Breakdown: Subtotal, TVA, Discount */}
          <div className="bg-[#F9FAFB] rounded-xl p-3.5 border border-[#E5E7EB] space-y-2 text-xs">
            <div className="flex justify-between text-[#667085]">
              <span>{isAr ? 'المجموع الصافي (HT):' : 'Sous-Total HT :'}</span>
              <strong className="text-[#172235]">{formatCurrencyDA(subtotalHT)}</strong>
            </div>

            {isTvaEnabled ? (
              <div className="flex justify-between text-[#667085]">
                <span>TVA ({defaultTaxRate}%) :</span>
                <strong className="text-[#172235]">{formatCurrencyDA(totalTVA)}</strong>
              </div>
            ) : (
              <div className="flex justify-between text-slate-400 text-[11px] italic">
                <span>TVA :</span>
                <span>Désactivée (0%)</span>
              </div>
            )}

            <div className="flex justify-between items-center text-[#667085] pt-1 border-t border-slate-200">
              <span>{isAr ? 'تخفيض إضافي (DA):' : 'Remise globale (DA) :'}</span>
              <input
                type="number"
                min="0"
                value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-24 text-right bg-white border border-[#E5E7EB] rounded px-2 py-0.5 text-xs font-bold text-[#172235]"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1.5">
              {isAr ? 'طريقة الدفع' : 'Mode de règlement'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', labelFr: 'Espèces', labelAr: 'نقدا', icon: Banknote },
                { id: 'card', labelFr: 'Carte CIB', labelAr: 'بطاقة CIB', icon: CreditCard },
                { id: 'check', labelFr: 'Chèque', labelAr: 'صك', icon: FileText },
                { id: 'transfer', labelFr: 'Virement', labelAr: 'تحويل', icon: RotateCcw },
                { id: 'credit', labelFr: 'À terme', labelAr: 'بالأجل', icon: History }
              ].map((m) => {
                const Icon = m.icon
                const isSelected = paymentMethod === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#172235] text-white border-[#172235] shadow-sm ring-1 ring-[#F5BD18]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#F5BD18]' : 'text-slate-400'}`} />
                    <span>{isAr ? m.labelAr : m.labelFr}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cash Received and Change Calculation */}
          {paymentMethod === 'cash' && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[#172235]">
                  {isAr ? 'المبلغ المستلم (DA):' : 'Montant reçu :'}
                </label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={String(totalTTC)}
                  className="w-28 text-right bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-sm font-black text-[#172235] focus:outline-none focus:ring-2 focus:ring-[#F5BD18]"
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-amber-200/80">
                <span className="font-bold text-slate-600">
                  {isAr ? 'المبلغ المتبقي / الصرف:' : 'Monnaie à rendre :'}
                </span>
                <span className="text-sm font-black text-emerald-700">
                  {formatCurrencyDA(changeDue)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-[#667085] uppercase mb-1">
              {isAr ? 'ملاحظات الفاتورة' : 'Observations / Note'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'ملاحظة اختيارية...' : 'Note ou commentaire sur la vente...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
            />
          </div>

          {/* Action Validation Button */}
          <div className="mt-auto pt-2">
            <button
              type="button"
              disabled={cart.length === 0 || isSubmitting}
              onClick={() => setShowConfirmModal(true)}
              className="w-full h-12 bg-[#F5BD18] hover:bg-[#e0ac13] disabled:opacity-40 disabled:hover:bg-[#F5BD18] text-[#172235] font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              <Printer className="w-5 h-5" />
              <span>{isAr ? 'تأكيد ودفع الفاتورة' : 'VALIDER ET ENCAISSER'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Confirmation & Printing Options */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-base">
                  {isAr ? 'تأكيد العملية وخيارات الطباعة' : 'Confirmation de Vente'}
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-xs text-[#667085] block">{isAr ? 'المبلغ الإجمالي' : 'Montant Total'}</span>
                <span className="text-2xl font-black text-[#172235]">
                  {formatCurrencyDA(totalTTC)}
                </span>
                <div className="text-xs text-slate-500 mt-1">
                  {cart.length} {cart.length === 1 ? 'article' : 'articles'} • {paymentMethod.toUpperCase()}
                </div>
              </div>

              {/* Print choice selector */}
              <div>
                <label className="block text-xs font-bold text-[#172235] mb-2">
                  {isAr ? 'نوع الوثيقة المراد طباعتها:' : 'Impression après validation :'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'ticket', labelFr: 'Ticket Caisse (80mm)', labelAr: 'تذكرة الصندوق' },
                    { id: 'invoice', labelFr: 'Facture A4 Commerciale', labelAr: 'فاتورة A4' },
                    { id: 'both', labelFr: 'Ticket + Facture A4', labelAr: 'الاثنان معاً' },
                    { id: 'none', labelFr: 'Ne pas imprimer', labelAr: 'بدون طباعة' }
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-semibold transition-all ${
                        printChoice === opt.id
                          ? 'border-[#172235] bg-slate-100 text-[#172235]'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="printOption"
                        checked={printChoice === opt.id}
                        onChange={() => setPrintChoice(opt.id as any)}
                        className="text-[#F5BD18] focus:ring-[#F5BD18]"
                      />
                      <span>{isAr ? opt.labelAr : opt.labelFr}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSale}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] disabled:opacity-50 text-[#172235] font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>{isAr ? 'جاري المعالجة...' : 'En cours...'}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد وطباعة' : 'Confirmer & Encaisser'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Add Customer */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-5 py-3.5 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                {isAr ? 'إضافة زبون جديد سريعا' : 'Nouveau Client Rapide'}
              </h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'الاسم الكامل *' : 'Nom complet *'}
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ex: Mourad Belkacem"
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'رقم الهاتف' : 'Téléphone'}
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="Ex: 0555 12 34 56"
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'النوع' : 'Type'}
                </label>
                <select
                  value={newCustType}
                  onChange={(e) => setNewCustType(e.target.value as any)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235]"
                >
                  <option value="individual">{isAr ? 'فردي (Particulier)' : 'Particulier'}</option>
                  <option value="business">{isAr ? 'شركة (Société / Flotte)' : 'Société / Flotte'}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg text-xs"
                >
                  {isAr ? 'حفظ' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

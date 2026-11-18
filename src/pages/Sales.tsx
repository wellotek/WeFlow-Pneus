import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  Printer,
  Trash2,
  FileText,
  User,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import type { Customer, CustomerVehicle, PaymentMethod, Product, Service } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

interface CartItem {
  product_id?: string | null
  item_type: 'product' | 'service'
  reference: string
  designation: string
  quantity: number
  unit_price: number
  tax_rate: number
  available_stock?: number
}

export const Sales: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  // Customers & Vehicles
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerVehicles, setCustomerVehicles] = useState<CustomerVehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')

  // Catalog for Autocomplete
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ type: 'product' | 'service'; item: any }[]>([])

  // Cart / Sale lines
  const [cart, setCart] = useState<CartItem[]>([
    {
      product_id: null,
      item_type: 'product',
      reference: 'MIC-1856515-S',
      designation: 'Pneu Michelin 185/65 R15 88T Energy Saver',
      quantity: 4,
      unit_price: 12000,
      tax_rate: 19
    },
    {
      product_id: null,
      item_type: 'service',
      reference: 'MONT-EQUIL',
      designation: 'Montage & Équilibrage',
      quantity: 4,
      unit_price: 350,
      tax_rate: 19
    },
    {
      product_id: null,
      item_type: 'service',
      reference: 'VAL-TR414',
      designation: 'Valve Tubeless TR414',
      quantity: 4,
      unit_price: 150,
      tax_rate: 19
    }
  ])

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [amountReceived, setAmountReceived] = useState<number>(58000)
  const [saleNotes, setSaleNotes] = useState<string>('')

  // In-flight
  const [loading, setLoading] = useState(false)
  const [successInvoice, setSuccessInvoice] = useState<string | null>(null)

  useEffect(() => {
    // Load customers, products, services
    window.pneusApi.customers.list().then((cList) => {
      setCustomers(cList)
      if (cList.length > 0) {
        setSelectedCustomerId(cList[0].id)
      }
    })
    window.pneusApi.products.list().then(setProducts)
    window.pneusApi.services.list().then(setServices)
  }, [])

  useEffect(() => {
    if (selectedCustomerId) {
      window.pneusApi.customers.getVehicles(selectedCustomerId).then((vList) => {
        setCustomerVehicles(vList)
        if (vList.length > 0) {
          setSelectedVehicleId(vList[0].id)
        } else {
          setSelectedVehicleId('')
        }
      })
    }
  }, [selectedCustomerId])

  // Autocomplete search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const q = searchQuery.toLowerCase()
    const pMatches = products
      .filter((p) => p.reference.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.dimension.includes(q))
      .slice(0, 5)
      .map((p) => ({ type: 'product' as const, item: p }))

    const sMatches = services
      .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ type: 'service' as const, item: s }))

    setSearchResults([...pMatches, ...sMatches])
  }, [searchQuery, products, services])

  const handleAddItem = (res: { type: 'product' | 'service'; item: any }) => {
    if (res.type === 'product') {
      const p = res.item as Product
      setCart((prev) => [
        ...prev,
        {
          product_id: p.id,
          item_type: 'product',
          reference: p.reference,
          designation: `${p.brand} ${p.dimension} ${p.model_name}`,
          quantity: 2,
          unit_price: p.sell_price,
          tax_rate: 19,
          available_stock: p.stock_quantity
        }
      ])
    } else {
      const s = res.item as Service
      setCart((prev) => [
        ...prev,
        {
          product_id: null,
          item_type: 'service',
          reference: s.code,
          designation: s.name,
          quantity: 2,
          unit_price: s.default_price,
          tax_rate: 19
        }
      ])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const handleUpdateQty = (index: number, qty: number) => {
    if (qty <= 0) return
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item)))
  }

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  // Totals
  let subtotal = 0
  let totalTax = 0
  for (const item of cart) {
    const lineHt = item.quantity * item.unit_price
    subtotal += lineHt
    totalTax += lineHt * (item.tax_rate / 100)
  }
  const totalTtc = Math.max(0, subtotal + totalTax - discountAmount)
  const changeAmount = Math.max(0, amountReceived - totalTtc)

  useEffect(() => {
    setAmountReceived(totalTtc)
  }, [totalTtc])

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const selectedVehicle = customerVehicles.find((v) => v.id === selectedVehicleId)

  const handleValidateAndPrint = async () => {
    if (cart.length === 0) {
      alert('Veuillez ajouter au moins un pneu ou une prestation.')
      return
    }

    setLoading(true)
    setSuccessInvoice(null)

    try {
      const today = new Date().toISOString().split('T')[0]
      const sale = await window.pneusApi.sales.create({
        customer_id: selectedCustomerId || null,
        customer_name: selectedCustomer?.name || 'Client Passager',
        customer_phone: selectedCustomer?.phone || '',
        vehicle_id: selectedVehicleId || null,
        vehicle_info: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : '',
        license_plate: selectedVehicle?.license_plate || '',
        mileage: selectedVehicle?.mileage,
        date: today,
        sale_type: 'retail',
        tax_rate: 19,
        discount_amount: discountAmount,
        paid_amount: Math.min(amountReceived, totalTtc),
        payment_method: paymentMethod,
        notes: saleNotes,
        items: cart.map((it) => ({
          product_id: it.product_id,
          item_type: it.item_type,
          reference: it.reference,
          designation: it.designation,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate
        }))
      })

      setSuccessInvoice(sale.invoice_number)
      // Print Invoice automatically
      await window.pneusApi.documents.printInvoice(sale.id)

      // Reset cart
      setCart([])
    } catch (err: any) {
      alert(`Erreur validation vente : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Breadcrumb & Header matching screenshot */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold text-[#667085]">
            Ventes &gt; <span className="text-[#111827]">Nouvelle Facture</span>
          </div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('pos.title')}
          </h1>
        </div>
        <div className="text-xs font-semibold text-[#667085] bg-white px-3 py-1.5 rounded-lg border border-[#E5E7EB]">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>
      </div>

      {/* Success Banner */}
      {successInvoice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Facture {successInvoice} enregistrée et transmise à l'impression !</span>
          </div>
          <span className="text-emerald-700 font-semibold cursor-pointer" onClick={() => setSuccessInvoice(null)}>
            ✕
          </span>
        </div>
      )}

      {/* Main Grid: Left Form (2/3) + Right Summary (1/3) matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card: Client & Vehicle Selection matching screenshot */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
            {/* Row 1: Client selection */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-2 text-xs font-bold text-[#111827]">
                {t('pos.client')}
              </div>
              <div className="sm:col-span-6">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none"
                >
                  <option value="">Sélectionner un client...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-4 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={selectedCustomer?.phone || '0555 12 34 56'}
                  className="w-full h-10 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono text-[#667085]"
                />
              </div>
            </div>

            {/* Row 2: Vehicle selection matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-2 text-xs font-bold text-[#111827]">
                {t('pos.vehicle')}
              </div>
              <div className="sm:col-span-5">
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none"
                >
                  <option value="">Véhicule du client...</option>
                  {customerVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.year || ''})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  readOnly
                  value={selectedVehicle?.license_plate || '12345 121 16'}
                  placeholder="Immatriculation"
                  className="w-full h-10 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono uppercase font-bold text-[#111827]"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value={selectedVehicle?.mileage ? `${selectedVehicle.mileage} km` : '85 432 km'}
                  placeholder="Kilométrage"
                  className="w-full h-10 px-2 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-mono text-[#667085]"
                />
              </div>
            </div>
          </div>

          {/* Autocomplete Input matching screenshot */}
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3.5 text-[#667085]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('pos.searchItem')}
              className="w-full h-11 pl-10 pr-4 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#111827] shadow-xs focus:ring-2 focus:ring-[#F5BD18] focus:border-transparent outline-none"
            />

            {/* Dropdown results */}
            {searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-[#E5E7EB]">
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => handleAddItem(res)}
                    className="p-3 hover:bg-[#F5F6F8] cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <strong className="text-[#111827]">
                        {res.type === 'product' ? res.item.brand : '[SERVICE]'} {res.item.reference || res.item.code}
                      </strong>
                      <span className="text-[#667085] ml-2">
                        {res.type === 'product' ? `${res.item.dimension} ${res.item.model_name}` : res.item.name}
                      </span>
                    </div>
                    <div className="font-extrabold text-[#172235]">
                      {formatCurrencyDA(res.type === 'product' ? res.item.sell_price : res.item.default_price, i18n.language)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Table matching screenshot */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#667085] uppercase text-[11px] font-bold">
                  <th className="py-3 px-4 w-[140px]">{t('tires.reference')}</th>
                  <th className="py-3 px-4">Désignation (Pneus & Services)</th>
                  <th className="py-3 px-4 text-center w-[70px]">{t('pos.qty')}</th>
                  <th className="py-3 px-4 text-right w-[110px]">{t('pos.unitPrice')}</th>
                  <th className="py-3 px-4 text-center w-[70px]">{t('pos.tva')}</th>
                  <th className="py-3 px-4 text-right w-[120px]">{t('pos.lineTotal')}</th>
                  <th className="py-3 px-3 text-center w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {cart.map((item, idx) => {
                  const lineTotal = item.quantity * item.unit_price
                  return (
                    <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#111827]">
                        {idx + 1}. {item.reference}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#111827]">
                        {item.designation}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                          className="w-14 h-7 text-center font-bold border border-[#E5E7EB] rounded-md focus:ring-1 focus:ring-[#F5BD18]"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#111827]">
                        {item.unit_price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center text-[#667085] font-semibold">
                        {item.tax_rate}%
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#111827]">
                        {lineTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 hover:bg-red-50 text-[#667085] hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: Résumé de la Vente matching screenshot */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#111827]">
              {t('pos.summary')}
            </h3>

            {/* Big Golden Yellow Total Box matching screenshot */}
            <div className="bg-[#172235] rounded-xl p-5 text-center text-white space-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#F5BD18]" />
              <div className="text-3xl font-black text-white tracking-tight">
                {totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </div>
              <div className="text-[11px] font-bold text-[#F5BD18] uppercase tracking-wider">
                {t('pos.totalTtc')}
              </div>
            </div>

            {/* Breakdown calculations */}
            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between text-[#667085]">
                <span>{t('pos.subtotalHt')} :</span>
                <span className="font-semibold text-[#111827]">
                  {subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>TVA (19%) :</span>
                <span className="font-semibold text-[#111827]">
                  {totalTax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>{t('pos.discount')} :</span>
                <span className="font-semibold text-[#111827]">
                  {discountAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#111827] pt-2 border-t border-[#E5E7EB]">
                <span>{t('pos.netToPay')} :</span>
                <span>{totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA</span>
              </div>
            </div>

            {/* Mode de règlement toggle buttons matching screenshot */}
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-[#667085] uppercase">
                {t('pos.paymentMethod')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#172235] text-white shadow-xs'
                      : 'bg-[#F5F6F8] text-[#111827] border border-[#E5E7EB] hover:bg-slate-200'
                  }`}
                >
                  {t('pos.cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('check')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all ${
                    paymentMethod === 'check'
                      ? 'bg-[#172235] text-white shadow-xs'
                      : 'bg-[#F5F6F8] text-[#111827] border border-[#E5E7EB] hover:bg-slate-200'
                  }`}
                >
                  {t('pos.check')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cib')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all ${
                    paymentMethod === 'cib'
                      ? 'bg-[#172235] text-white shadow-xs'
                      : 'bg-[#F5F6F8] text-[#111827] border border-[#E5E7EB] hover:bg-slate-200'
                  }`}
                >
                  {t('pos.cib')}
                </button>
              </div>
            </div>

            {/* Received & Change Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block font-semibold text-[#667085] mb-1">{t('pos.received')}</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2.5 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg font-bold text-[#111827]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#667085] mb-1">{t('pos.change')}</label>
                <input
                  type="text"
                  readOnly
                  value={`${changeAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA`}
                  className="w-full h-9 px-2.5 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg font-bold text-emerald-600"
                />
              </div>
            </div>

            {/* Giant Action Button: VALIDER ET IMPRIMER LA FACTURE matching screenshot */}
            <button
              onClick={handleValidateAndPrint}
              disabled={loading || cart.length === 0}
              className="w-full h-14 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] font-black text-sm rounded-xl shadow-lg shadow-[#F5BD18]/25 flex items-center justify-center gap-2.5 transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              <Printer className="w-5 h-5" />
              <span>{loading ? 'Validation en cours...' : t('pos.validateAndPrint')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

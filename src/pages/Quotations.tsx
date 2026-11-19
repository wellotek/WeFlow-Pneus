import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Printer,
  FileText,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Copy,
  Edit2,
  Search,
  Download,
  X,
  AlertTriangle,
  RotateCcw,
  Eye,
  Calendar,
  DollarSign
} from 'lucide-react'
import type { Customer, CustomerVehicle, Product, Quotation, Service, StoreProfile } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

interface FormItemLine {
  id: string
  product_id?: string | null
  item_type: 'product' | 'service'
  reference: string
  designation: string
  quantity: number
  unit_price: number
  discount_amount: number
  tax_rate: number
}

export const Quotations: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Catalog data for quote modal
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null)

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [depositAmount, setDepositAmount] = useState<number>(0)
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [formItems, setFormItems] = useState<FormItemLine[]>([])

  // Line search autocomplete
  const [lineSearch, setLineSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ type: 'product' | 'service'; item: any }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Detail Modal
  const [detailQuote, setDetailQuote] = useState<Quotation | null>(null)

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [qList, cList, pList, sList, prof] = await Promise.all([
        window.pneusApi.quotations.list(),
        window.pneusApi.customers.list(),
        window.pneusApi.products.list(),
        window.pneusApi.services.list(),
        window.pneusApi.settings.getProfile()
      ])
      setQuotes(qList)
      setCustomers(cList)
      setProducts(pList)
      setServices(sList)
      setStoreProfile(prof)
    } catch (err: any) {
      console.error('Failed to load quotations:', err)
      setNotification({ type: 'error', message: err?.message || 'Erreur chargement' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Search catalog for modal
  useEffect(() => {
    const q = lineSearch.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    const matchedP = products
      .filter((p) => p.reference.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.dimension.toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({ type: 'product' as const, item: p }))

    const matchedS = services
      .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({ type: 'service' as const, item: s }))

    setSearchResults([...matchedP, ...matchedS])
    setIsSearching(true)
  }, [lineSearch, products, services])

  // Filtered quotes list
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (q.is_archived) return false
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchNum = q.quote_number.toLowerCase().includes(query)
        const matchCust = q.customer_name?.toLowerCase().includes(query)
        const matchPhone = q.customer_phone?.toLowerCase().includes(query)
        if (!matchNum && !matchCust && !matchPhone) return false
      }
      return true
    })
  }, [quotes, searchTerm, statusFilter])

  // Open Create Modal
  const openCreateModal = () => {
    setEditingQuoteId(null)
    setSelectedCustomerId('')
    setCustomerName('')
    setCustomerPhone('')
    setVehicleInfo('')
    const today = new Date().toISOString().split('T')[0]
    setQuoteDate(today)
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setValidUntil(d.toISOString().split('T')[0])
    setDepositAmount(0)
    setGlobalDiscount(0)
    setNotes('')
    setFormItems([])
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = async (q: Quotation) => {
    if (q.status === 'converted') {
      alert(isAr ? 'لا يمكن تعديل عرض سعر تم تحويله إلى فاتورة.' : 'Impossible de modifier un devis déjà converti.')
      return
    }
    const full = await window.pneusApi.quotations.get(q.id)
    if (!full) return

    setEditingQuoteId(full.id)
    setSelectedCustomerId(full.customer_id || '')
    setCustomerName(full.customer_name || '')
    setCustomerPhone(full.customer_phone || '')
    setVehicleInfo(full.vehicle_info || '')
    setQuoteDate(full.date)
    setValidUntil(full.valid_until)
    setDepositAmount(full.deposit_amount || 0)
    setGlobalDiscount(full.discount_amount || 0)
    setNotes(full.notes || '')
    setFormItems(
      (full.items || []).map((it) => ({
        id: it.id || Math.random().toString(36).substring(2, 9),
        product_id: it.product_id,
        item_type: it.item_type,
        reference: it.reference,
        designation: it.designation,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_amount: it.discount_amount || 0,
        tax_rate: it.tax_rate ?? (storeProfile?.is_tva_enabled ? (storeProfile.default_tax_rate ?? 19) : 0)
      }))
    )
    setIsModalOpen(true)
  }

  // Add Item to Modal Lines
  const addLine = (type: 'product' | 'service', item?: any) => {
    const defaultTax = storeProfile?.is_tva_enabled ? (storeProfile.default_tax_rate ?? 19) : 0
    if (item) {
      if (type === 'product') {
        const newLine: FormItemLine = {
          id: Math.random().toString(36).substring(2, 9),
          product_id: item.id,
          item_type: 'product',
          reference: item.reference,
          designation: `${item.brand} ${item.dimension} ${item.model_name || ''}`.trim(),
          quantity: 1,
          unit_price: item.sell_price || 0,
          discount_amount: 0,
          tax_rate: defaultTax
        }
        setFormItems([...formItems, newLine])
      } else {
        const newLine: FormItemLine = {
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
        setFormItems([...formItems, newLine])
      }
    } else {
      // Manual line
      const newLine: FormItemLine = {
        id: Math.random().toString(36).substring(2, 9),
        product_id: null,
        item_type: 'product',
        reference: '',
        designation: '',
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        tax_rate: defaultTax
      }
      setFormItems([...formItems, newLine])
    }
    setLineSearch('')
    setIsSearching(false)
  }

  // Calculate Modal Totals
  const isTvaEnabled = Boolean(storeProfile?.is_tva_enabled)
  const defaultTaxRate = isTvaEnabled ? (storeProfile?.default_tax_rate ?? 19) : 0

  let modalSubtotal = 0
  let modalLineDiscounts = 0
  for (const item of formItems) {
    const base = item.quantity * item.unit_price
    modalSubtotal += base
    modalLineDiscounts += item.discount_amount || 0
  }

  const modalTaxableBase = Math.max(0, modalSubtotal - modalLineDiscounts - globalDiscount)
  const modalTaxAmount = isTvaEnabled ? (modalTaxableBase * defaultTaxRate) / 100 : 0
  const modalTotalAmount = Math.max(0, modalTaxableBase + modalTaxAmount)
  const modalBalanceDue = Math.max(0, modalTotalAmount - depositAmount)

  // Save Quote Form
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formItems.length === 0) {
      alert(isAr ? 'يرجى إضافة سطر واحد على الأقل.' : 'Veuillez ajouter au moins une ligne au devis.')
      return
    }

    try {
      const selectedCust = customers.find((c) => c.id === selectedCustomerId)
      const payload = {
        customer_id: selectedCustomerId || null,
        customer_name: customerName.trim() || selectedCust?.name || (isAr ? 'زبون' : 'Client'),
        customer_phone: customerPhone.trim() || selectedCust?.phone || '',
        vehicle_info: vehicleInfo.trim() || undefined,
        date: quoteDate,
        valid_until: validUntil,
        discount_amount: modalLineDiscounts + globalDiscount,
        tax_rate: defaultTaxRate,
        deposit_amount: depositAmount,
        notes: notes.trim() || undefined,
        items: formItems.map((it) => ({
          product_id: it.product_id || null,
          item_type: it.item_type,
          reference: it.reference.trim() || 'REF',
          designation: it.designation.trim() || 'Article',
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_amount: it.discount_amount,
          tax_rate: it.tax_rate
        }))
      }

      if (editingQuoteId) {
        await window.pneusApi.quotations.update(editingQuoteId, payload)
        setNotification({
          type: 'success',
          message: isAr ? 'تم تحديث عرض السعر بنجاح' : 'Devis mis à jour avec succès.'
        })
      } else {
        const created = await window.pneusApi.quotations.create(payload)
        setNotification({
          type: 'success',
          message: isAr
            ? `تم إنشاء عرض السعر ${created.quote_number} بنجاح`
            : `Devis ${created.quote_number} créé avec succès.`
        })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Duplicate Quote
  const handleDuplicate = async (id: string, num: string) => {
    try {
      const dup = await window.pneusApi.quotations.duplicate(id)
      setNotification({
        type: 'success',
        message: isAr
          ? `تم إنشاء نسخة من عرض السعر: ${dup.quote_number}`
          : `Devis dupliqué avec succès : ${dup.quote_number}`
      })
      loadData()
    } catch (err: any) {
      alert(`Erreur duplication : ${err.message}`)
    }
  }

  // Convert to Sale
  const handleConvert = async (id: string, quoteNum: string) => {
    if (
      confirm(
        isAr
          ? `هل تريد تأكيد تحويل عرض السعر ${quoteNum} إلى فاتورة نهائية وخصم الكميات من المخزون؟`
          : `Convertir le devis ${quoteNum} en vente réelle et déduire le stock physique ?`
      )
    ) {
      try {
        const sale = await window.pneusApi.quotations.convertToSale(id)
        setNotification({
          type: 'success',
          message: isAr
            ? `تم تحويل عرض السعر بنجاح إلى الفاتورة ${sale.invoice_number}`
            : `Devis converti avec succès en Facture ${sale.invoice_number} !`
        })
        loadData()
      } catch (err: any) {
        alert(`Erreur conversion : ${err.message}`)
      }
    }
  }

  // Delete Quote
  const handleDelete = async (id: string, quoteNum: string) => {
    if (confirm(isAr ? `حذف عرض السعر ${quoteNum} ؟` : `Supprimer le devis ${quoteNum} ?`)) {
      try {
        await window.pneusApi.quotations.delete(id)
        setNotification({
          type: 'success',
          message: isAr ? 'تم حذف عرض السعر' : 'Devis supprimé avec succès.'
        })
        loadData()
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    const headers = [
      'N° Devis',
      'Date',
      'Validité',
      'Client',
      'Téléphone',
      'Véhicule',
      'Total TTC (DA)',
      'Acompte (DA)',
      'Statut'
    ]
    const rows = filteredQuotes.map((q) => [
      q.quote_number,
      q.date,
      q.valid_until,
      q.customer_name || 'Client',
      q.customer_phone || '',
      q.vehicle_info || '',
      q.total_amount,
      q.deposit_amount || 0,
      q.status
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Devis_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    )
    if (!res.cancelled && res.path) {
      setNotification({
        type: 'success',
        message: isAr ? 'تم تصدير ملف CSV بنجاح' : `Export CSV réussi : ${res.path}`
      })
    }
  }

  // Export List PDF
  const handleExportPdf = async () => {
    const columns = [
      { header: 'N° Devis', dataKey: 'quote_number' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Validité', dataKey: 'valid_until' },
      { header: 'Client', dataKey: 'customer_name' },
      { header: 'Total TTC (DA)', dataKey: 'total_formatted' },
      { header: 'Statut', dataKey: 'status_label' }
    ]

    const rows = filteredQuotes.map((q) => ({
      quote_number: q.quote_number,
      date: q.date,
      valid_until: q.valid_until,
      customer_name: q.customer_name || 'Client',
      total_formatted: formatCurrencyDA(q.total_amount),
      status_label: q.status.toUpperCase()
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'قائمة عروض الأسعار' : 'Liste des Devis Commerciaux',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({
        type: 'success',
        message: isAr ? 'تم تصدير ملف PDF بنجاح' : `Export PDF réussi : ${res.path}`
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#F5BD18]" />
            <span>{isAr ? 'عروض الأسعار والفواتير الشكلية' : 'Devis & Proformas'}</span>
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'إنشاء عروض أسعار متكاملة، طباعة A4، والتحويل المباشر إلى فواتير'
              : 'Création multi-lignes sans déduction de stock, impression A4 et conversion en vente'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Exporter en fichier Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Exporter la liste en PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إنشاء عرض سعر جديد' : 'NOUVEAU DEVIS'}</span>
          </button>
        </div>
      </div>

      {/* Notification alert */}
      {notification && (
        <div
          className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 mb-3 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم العرض، الزبون، أو الهاتف...' : 'Recherche par N° devis, client, téléphone...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18] ${
              isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
            }`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] px-2.5 focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
        >
          <option value="all">{isAr ? 'كل الحالات' : 'Tous statuts'}</option>
          <option value="draft">{isAr ? 'مسودة' : 'Brouillon'}</option>
          <option value="sent">{isAr ? 'مرسل' : 'Envoyé'}</option>
          <option value="converted">{isAr ? 'محول إلى فاتورة' : 'Converti en Vente'}</option>
          <option value="expired">{isAr ? 'منتهي الصلاحية' : 'Expiré'}</option>
        </select>
      </div>

      {/* Quotes Table */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
              <tr>
                <th className="py-2.5 px-3">{isAr ? 'رقم العرض' : 'N° Devis'}</th>
                <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الزبون' : 'Client'}</th>
                <th className="py-2.5 px-3">{isAr ? 'المركبة' : 'Véhicule'}</th>
                <th className="py-2.5 px-3 text-right">{isAr ? 'المجموع (TTC)' : 'Total TTC'}</th>
                <th className="py-2.5 px-3 text-right">{isAr ? 'العربون' : 'Acompte'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الصلاحية' : 'Validité'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Statut'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#F5BD18] border-t-transparent rounded-full animate-spin" />
                      <span>{isAr ? 'جاري التحميل...' : 'Chargement des devis...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    {isAr ? 'لا توجد عروض أسعار مطابقة' : 'Aucun devis trouvé.'}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const isConverted = q.status === 'converted'
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#172235]">
                        {q.quote_number}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085] whitespace-nowrap">{q.date}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#172235]">{q.customer_name || 'Client'}</div>
                        {q.customer_phone && (
                          <div className="text-[10px] text-[#667085]">{q.customer_phone}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085]">{q.vehicle_info || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-black text-[#172235]">
                        {formatCurrencyDA(q.total_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {q.deposit_amount ? formatCurrencyDA(q.deposit_amount) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#667085] whitespace-nowrap">
                        {q.valid_until}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isConverted
                              ? 'bg-blue-100 text-blue-800'
                              : q.status === 'draft'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isConverted
                            ? (isAr ? 'محول' : 'Converti')
                            : q.status === 'draft'
                            ? (isAr ? 'مسودة' : 'Brouillon')
                            : q.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print A4 */}
                          <button
                            type="button"
                            onClick={() => window.pneusApi.documents.printQuotation(q.id)}
                            className="p-1 hover:bg-slate-100 text-[#172235] rounded"
                            title="Imprimer Devis A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Export PDF */}
                          <button
                            type="button"
                            onClick={() => window.pneusApi.documents.exportPdfQuotation(q.id)}
                            className="p-1 hover:bg-slate-100 text-red-600 rounded"
                            title="Exporter en PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(q.id, q.quote_number)}
                            className="p-1 hover:bg-slate-100 text-blue-600 rounded"
                            title="Dupliquer le devis"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit (if not converted) */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => openEditModal(q)}
                              className="p-1 hover:bg-slate-100 text-amber-600 rounded"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Convert to Sale */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleConvert(q.id, q.quote_number)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"
                              title="Convertir en Facture / Vente"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(q.id, q.quote_number)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create / Edit Quotation */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-base">
                  {editingQuoteId ? 'Modifier le Devis' : 'Nouveau Devis Commercial'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveQuote} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {/* Customer Selector */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value)
                      const c = customers.find((cust) => cust.id === e.target.value)
                      if (c) {
                        setCustomerName(c.name)
                        setCustomerPhone(c.phone)
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#172235]"
                  >
                    <option value="">-- Client Comptoir / Libre --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Ahmed Benali"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235]"
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0555 12 34 56"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235]"
                  />
                </div>

                {/* Vehicle */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Véhicule (Optionnel)</label>
                  <input
                    type="text"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    placeholder="Ex: Renault Symbol 2021"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235]"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    required
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235]"
                  />
                </div>

                {/* Valid until */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Validité jusqu'au</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-[#172235]"
                  />
                </div>

                {/* Deposit */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Acompte versé (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-700"
                  />
                </div>

                {/* Global Discount */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remise globale (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={globalDiscount || ''}
                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#172235]"
                  />
                </div>
              </div>

              {/* Catalog Search & Add Line */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ajouter depuis le catalogue (chercher par pneu ou service)..."
                      value={lineSearch}
                      onChange={(e) => setLineSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addLine('product')}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ligne personnalisée</span>
                  </button>
                </div>

                {/* Dropdown search results */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute top-9 left-0 right-32 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((r, idx) => (
                      <div
                        key={idx}
                        onClick={() => addLine(r.type, r.item)}
                        className="px-3 py-2 hover:bg-amber-50 cursor-pointer flex justify-between text-xs"
                      >
                        <div className="font-semibold text-[#172235]">
                          {r.type === 'product'
                            ? `${r.item.brand} ${r.item.dimension} (${r.item.reference})`
                            : `[Service] ${r.item.name}`}
                        </div>
                        <span className="font-bold text-[#172235]">
                          {formatCurrencyDA(r.type === 'product' ? r.item.sell_price : r.item.default_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#172235] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3 w-28">Réf</th>
                      <th className="py-2 px-3">Désignation</th>
                      <th className="py-2 px-3 w-20 text-center">Qté</th>
                      <th className="py-2 px-3 w-24 text-right">Prix Unit.</th>
                      <th className="py-2 px-3 w-20 text-right">Remise</th>
                      <th className="py-2 px-3 w-24 text-right">Total</th>
                      <th className="py-2 px-2 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          Aucun article. Utilisez la recherche ci-dessus pour ajouter des pneus ou des services.
                        </td>
                      </tr>
                    ) : (
                      formItems.map((item, idx) => {
                        const lineTotal = item.quantity * item.unit_price - (item.discount_amount || 0)
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.reference}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setFormItems((prev) =>
                                    prev.map((l) => (l.id === item.id ? { ...l, reference: v } : l))
                                  )
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs font-bold"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.designation}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setFormItems((prev) =>
                                    prev.map((l) => (l.id === item.id ? { ...l, designation: v } : l))
                                  )
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                                  setFormItems((prev) =>
                                    prev.map((l) => (l.id === item.id ? { ...l, quantity: v } : l))
                                  )
                                }}
                                className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0
                                  setFormItems((prev) =>
                                    prev.map((l) => (l.id === item.id ? { ...l, unit_price: v } : l))
                                  )
                                }}
                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.discount_amount || ''}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0
                                  setFormItems((prev) =>
                                    prev.map((l) => (l.id === item.id ? { ...l, discount_amount: v } : l))
                                  )
                                }}
                                placeholder="0"
                                className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-black text-[#172235]">
                              {formatCurrencyDA(lineTotal)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setFormItems((prev) => prev.filter((l) => l.id !== item.id))}
                                className="p-1 text-slate-400 hover:text-red-600"
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

              {/* Notes & Summary Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes et Conditions</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Validité de l'offre, délais de livraison, modalités de paiement..."
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg p-2 text-xs text-[#172235]"
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total HT :</span>
                    <strong>{formatCurrencyDA(modalSubtotal)}</strong>
                  </div>
                  {isTvaEnabled ? (
                    <div className="flex justify-between text-slate-600">
                      <span>TVA ({defaultTaxRate}%) :</span>
                      <strong>{formatCurrencyDA(modalTaxAmount)}</strong>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-400 italic text-[11px]">
                      <span>TVA :</span>
                      <span>Désactivée (0%)</span>
                    </div>
                  )}
                  {modalLineDiscounts + globalDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise totale :</span>
                      <strong>-{formatCurrencyDA(modalLineDiscounts + globalDiscount)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-[#172235] pt-2 border-t border-slate-200">
                    <span>TOTAL TTC :</span>
                    <span className="text-[#F5BD18] bg-[#172235] px-2.5 py-0.5 rounded">
                      {formatCurrencyDA(modalTotalAmount)}
                    </span>
                  </div>
                  {depositAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Reste à payer :</span>
                      <span>{formatCurrencyDA(modalBalanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl text-xs shadow-md transition-all"
                >
                  {editingQuoteId ? 'Enregistrer les Modifications' : 'Créer et Enregistrer le Devis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

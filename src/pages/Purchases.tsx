import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  CheckCircle,
  Printer,
  ShoppingBag,
  Clock,
  Download,
  FileText,
  Search,
  X,
  CheckCircle2,
  Trash2,
  PackageCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import type { Product, Purchase, Supplier, PurchaseItem } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

interface OrderLine {
  id: string
  product_id?: string
  reference: string
  brand: string
  dimension: string
  quantity: number
  unit_cost: number
}

export const Purchases: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // New Purchase Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [depositAmount, setDepositAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])

  // Line search autocomplete
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Quick Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')

  // Partial Reception Modal
  const [purchaseToReceive, setPurchaseToReceive] = useState<Purchase | null>(null)
  const [receptionLines, setReceptionLines] = useState<{ itemId: string; name: string; orderedQty: number; prevReceived: number; receivingQty: number }[]>([])

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [pList, sList, prodList] = await Promise.all([
        window.pneusApi.purchases.list(),
        window.pneusApi.suppliers.list(),
        window.pneusApi.products.list()
      ])
      setPurchases(pList)
      setSuppliers(sList)
      setProducts(prodList)
    } catch (err: any) {
      console.error('Failed to load purchases:', err)
      setNotification({ type: 'error', message: err?.message || 'Erreur chargement' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Product Autocomplete
  useEffect(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    const matched = products
      .filter((p) => p.reference.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.dimension.toLowerCase().includes(q))
      .slice(0, 6)
    setSearchResults(matched)
    setIsSearching(true)
  }, [productSearch, products])

  // Open Order Modal
  const handleOpenNewOrder = () => {
    setSelectedSupplierId(suppliers.length > 0 ? suppliers[0].id : '')
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setDepositAmount(0)
    setNotes('')
    setOrderLines([])
    setIsModalOpen(true)
  }

  // Add Line
  const handleAddLine = (p?: Product) => {
    if (p) {
      const newLine: OrderLine = {
        id: Math.random().toString(36).substring(2, 9),
        product_id: p.id,
        reference: p.reference,
        brand: p.brand,
        dimension: p.dimension,
        quantity: 10,
        unit_cost: p.buy_price
      }
      setOrderLines([...orderLines, newLine])
    } else {
      const newLine: OrderLine = {
        id: Math.random().toString(36).substring(2, 9),
        product_id: undefined,
        reference: '',
        brand: '',
        dimension: '',
        quantity: 10,
        unit_cost: 0
      }
      setOrderLines([...orderLines, newLine])
    }
    setProductSearch('')
    setIsSearching(false)
  }

  // Calculate Order Totals
  const totalAmount = useMemo(() => {
    return orderLines.reduce((acc, l) => acc + l.quantity * l.unit_cost, 0)
  }, [orderLines])

  // Save Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplierId) {
      alert('Veuillez sélectionner un fournisseur.')
      return
    }
    if (orderLines.length === 0) {
      alert('Veuillez ajouter au moins une ligne d’article à la commande.')
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) return

    try {
      const created = await window.pneusApi.purchases.create({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        date: purchaseDate,
        paid_amount: depositAmount,
        notes: notes.trim() || undefined,
        items: orderLines.map((l) => ({
          product_id: l.product_id || null,
          reference: l.reference.trim() || 'REF',
          brand: l.brand.trim() || 'Générique',
          dimension: l.dimension.trim() || 'Standard',
          quantity: l.quantity,
          unit_cost: l.unit_cost
        }))
      })

      setNotification({
        type: 'success',
        message: `Bon de commande ${created.purchase_number || created.order_number} enregistré (le stock sera augmenté lors de la réception).`
      })
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Quick Supplier Create
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierName.trim()) return
    try {
      const created = await window.pneusApi.suppliers.create({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim()
      })
      setSuppliers([created, ...suppliers])
      setSelectedSupplierId(created.id)
      setIsSupplierModalOpen(false)
      setNewSupplierName('')
      setNewSupplierPhone('')
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Open Reception Modal
  const handleOpenReceive = async (purchase: Purchase) => {
    const full = await window.pneusApi.purchases.get(purchase.id)
    if (!full) return
    setPurchaseToReceive(full)
    setReceptionLines(
      (full.items || []).map((it) => {
        const remaining = Math.max(0, it.quantity - (it.received_quantity || 0))
        return {
          itemId: it.id,
          name: `${it.brand} ${it.dimension} (${it.reference})`,
          orderedQty: it.quantity,
          prevReceived: it.received_quantity || 0,
          receivingQty: remaining // default to receiving the rest
        }
      })
    )
  }

  // Confirm Reception
  const handleConfirmReception = async () => {
    if (!purchaseToReceive) return
    try {
      const payload = receptionLines.map((l) => ({
        itemId: l.itemId,
        receivedQty: Math.max(0, l.receivingQty)
      }))

      await window.pneusApi.purchases.receiveItems(purchaseToReceive.id, payload)
      setNotification({
        type: 'success',
        message: `Réception validée pour la commande ${purchaseToReceive.purchase_number || purchaseToReceive.order_number} ! Les stocks ont été augmentés.`
      })
      setPurchaseToReceive(null)
      loadData()
    } catch (err: any) {
      alert(`Erreur réception : ${err.message}`)
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    const headers = ['N° Commande', 'Date', 'Fournisseur', 'Montant Total (DA)', 'Payé / Acompte', 'Statut']
    const rows = purchases.map((p) => [
      p.purchase_number || p.order_number || '',
      p.date,
      p.supplier_name,
      p.total_amount,
      p.paid_amount,
      p.status
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Commandes_Achats_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export CSV réussi : ${res.path}` })
    }
  }

  // Export PDF
  const handleExportPdf = async () => {
    const columns = [
      { header: 'N° Commande', dataKey: 'order_number' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Fournisseur', dataKey: 'supplier_name' },
      { header: 'Montant (DA)', dataKey: 'total_formatted' },
      { header: 'Statut', dataKey: 'status_label' }
    ]

    const rows = purchases.map((p) => ({
      order_number: p.purchase_number || p.order_number,
      date: p.date,
      supplier_name: p.supplier_name,
      total_formatted: formatCurrencyDA(p.total_amount),
      status_label: p.status.toUpperCase()
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'قائمة المشتريات والطلبيات' : 'Commandes Fournisseurs & Approvisionnements',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export PDF réussi : ${res.path}` })
    }
  }

  const filteredPurchases = purchases.filter((p) => {
    if (p.is_archived) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      return (p.purchase_number || p.order_number || '').toLowerCase().includes(q) || p.supplier_name.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
            {isAr ? 'المشتريات وطلبيات الموردين' : 'Achats & Approvisionnements'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'إنشاء طلبيات الشراء، تتبع دفع العربون، واستلام البضاعة وزيادة المخزون'
              : 'Commandes fournisseurs, acomptes, et réception totale ou partielle des stocks'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Exporter en fichier CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Exporter en PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleOpenNewOrder}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? '+ طلبية شراء جديدة' : '+ NOUVELLE COMMANDE'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
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
            placeholder={isAr ? 'بحث برقم الطلبية أو المورد...' : 'Recherche par N° commande, fournisseur...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <option value="all">Tous statuts</option>
          <option value="ordered">Commandé (En attente réception)</option>
          <option value="partial_received">Réception Partielle</option>
          <option value="received">Réceptionné (Stock augmenté)</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
              <tr>
                <th className="py-2.5 px-3">N° Commande</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Fournisseur</th>
                <th className="py-2.5 px-3 text-right">Total (DA)</th>
                <th className="py-2.5 px-3 text-right">Acompte / Payé</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    Aucune commande d'achat trouvée.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const isReceived = p.status === 'received'
                  const isPartial = p.status === 'partial_received'
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#172235]">
                        {p.purchase_number || p.order_number}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085] whitespace-nowrap">{p.date}</td>
                      <td className="py-2.5 px-3 font-bold text-[#172235]">{p.supplier_name}</td>
                      <td className="py-2.5 px-3 text-right font-black text-[#172235]">
                        {formatCurrencyDA(p.total_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {p.paid_amount ? formatCurrencyDA(p.paid_amount) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isReceived
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isReceived
                            ? 'Réceptionné'
                            : isPartial
                            ? 'Partiellement reçu'
                            : 'Commandé'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Receive items button */}
                          {!isReceived && (
                            <button
                              type="button"
                              onClick={() => handleOpenReceive(p)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#172235] hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-xs"
                              title="Réceptionner la marchandise et incrémenter le stock"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-[#F5BD18]" />
                              <span>Réceptionner</span>
                            </button>
                          )}

                          {/* Print Bon de Commande */}
                          <button
                            type="button"
                            onClick={() => window.pneusApi.documents.printPurchase(p.id)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                            title="Imprimer Bon de Commande"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

      {/* MODAL: Create Purchase Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-base">Nouvelle Commande Fournisseur</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Header: Supplier + Date + Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Fournisseur *</label>
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      + Nouveau
                    </button>
                  </div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date de commande</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Acompte versé (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Autocomplete Search & Add line */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ajouter des pneus depuis le catalogue..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddLine()}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ligne personnalisée</span>
                  </button>
                </div>

                {/* Dropdown */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute top-9 left-0 right-32 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddLine(p)}
                        className="px-3 py-2 hover:bg-amber-50 cursor-pointer flex justify-between text-xs"
                      >
                        <span className="font-semibold text-[#172235]">
                          {p.brand} {p.dimension} ({p.reference})
                        </span>
                        <span className="font-bold text-slate-600">Achat: {formatCurrencyDA(p.buy_price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#172235] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3 w-24">Réf</th>
                      <th className="py-2 px-3">Marque</th>
                      <th className="py-2 px-3">Dimension</th>
                      <th className="py-2 px-3 w-20 text-center">Qté</th>
                      <th className="py-2 px-3 w-28 text-right">Prix Achat</th>
                      <th className="py-2 px-3 w-28 text-right">Total Ligne</th>
                      <th className="py-2 px-2 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderLines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          Aucun article ajouté. Utilisez la barre de recherche ci-dessus.
                        </td>
                      </tr>
                    ) : (
                      orderLines.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={l.reference}
                              onChange={(e) => {
                                const v = e.target.value
                                setOrderLines((prev) => prev.map((it) => (it.id === l.id ? { ...it, reference: v } : it)))
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs font-bold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={l.brand}
                              onChange={(e) => {
                                const v = e.target.value
                                setOrderLines((prev) => prev.map((it) => (it.id === l.id ? { ...it, brand: v } : it)))
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={l.dimension}
                              onChange={(e) => {
                                const v = e.target.value
                                setOrderLines((prev) => prev.map((it) => (it.id === l.id ? { ...it, dimension: v } : it)))
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={l.quantity}
                              onChange={(e) => {
                                const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                                setOrderLines((prev) => prev.map((it) => (it.id === l.id ? { ...it, quantity: v } : it)))
                              }}
                              className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={l.unit_cost}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) || 0
                                setOrderLines((prev) => prev.map((it) => (it.id === l.id ? { ...it, unit_cost: v } : it)))
                              }}
                              className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-black text-[#172235]">
                            {formatCurrencyDA(l.quantity * l.unit_cost)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => setOrderLines((prev) => prev.filter((it) => it.id !== l.id))}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Total Commande :</span>
                <span className="text-base font-black text-[#172235]">{formatCurrencyDA(totalAmount)}</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl shadow-md"
                >
                  Enregistrer le Bon de Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Partial / Total Reception */}
      {purchaseToReceive && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-base">
                  Réceptionner la marchandise — Commande {purchaseToReceive.purchase_number || purchaseToReceive.order_number}
                </h3>
              </div>
              <button onClick={() => setPurchaseToReceive(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <p className="text-slate-600 font-semibold">
                Indiquez les quantités reçues aujourd'hui pour chaque article. Le stock physique sera immédiatement mis à jour pour ces articles.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Article</th>
                      <th className="py-2.5 px-3 text-center">Commandé</th>
                      <th className="py-2.5 px-3 text-center">Déjà reçu</th>
                      <th className="py-2.5 px-3 text-center font-black text-[#172235]">Reçu aujourd'hui</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receptionLines.map((line, idx) => (
                      <tr key={line.itemId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-[#172235]">{line.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{line.orderedQty}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{line.prevReceived}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={line.orderedQty - line.prevReceived}
                            value={line.receivingQty}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10) || 0
                              setReceptionLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, receivingQty: v } : l))
                              )
                            }}
                            className="w-20 text-center font-black text-sm bg-amber-50 border border-amber-300 rounded px-2 py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPurchaseToReceive(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReception}
                  className="px-6 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl shadow-md"
                >
                  Valider la Réception & Augmenter le Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Add Supplier */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-5 py-3.5 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">Nouveau Fournisseur Rapide</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom / Société *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SARL Import Pneumatique"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  placeholder="0555 12 34 56"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

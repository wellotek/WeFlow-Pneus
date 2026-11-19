import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  Truck,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Archive,
  Download,
  FileText,
  DollarSign,
  Receipt,
  X,
  CheckCircle2,
  AlertTriangle,
  History,
  CreditCard
} from 'lucide-react'
import type { Supplier, Purchase, SupplierPayment, PaymentMethod } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const Suppliers: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierPurchases, setSupplierPurchases] = useState<Purchase[]>([])
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([])

  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders')

  // Modal Supplier Form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    wilaya: 'Alger',
    contact_person: '',
    email: ''
  })

  // Modal Payment Form
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentType, setPaymentType] = useState<'acompte' | 'paiement'>('paiement')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentRefNote, setPaymentRefNote] = useState('')

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadSuppliers = async () => {
    try {
      const list = await window.pneusApi.suppliers.list(search)
      setSuppliers(list)
      if (list.length > 0) {
        if (!selectedSupplier || !list.find((s) => s.id === selectedSupplier.id)) {
          handleSelectSupplier(list[0])
        }
      } else {
        setSelectedSupplier(null)
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [search])

  const handleSelectSupplier = async (s: Supplier) => {
    setSelectedSupplier(s)
    try {
      const [allPurchases, payments] = await Promise.all([
        window.pneusApi.purchases.list(),
        window.pneusApi.suppliers.listPayments(s.id)
      ])
      setSupplierPurchases(allPurchases.filter((p) => p.supplier_id === s.id))
      setSupplierPayments(payments)
    } catch (err) {
      console.error('Error fetching supplier details:', err)
    }
  }

  const handleOpenAdd = () => {
    setEditingSupplier(null)
    setFormData({
      name: '',
      phone: '',
      address: '',
      wilaya: 'Alger',
      contact_person: '',
      email: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setFormData({
      name: s.name,
      phone: s.phone,
      address: s.address || '',
      wilaya: s.wilaya || 'Alger',
      contact_person: s.contact_person || '',
      email: s.email || ''
    })
    setIsModalOpen(true)
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSupplier) {
        await window.pneusApi.suppliers.update(editingSupplier.id, formData)
        setNotification({ type: 'success', message: 'Fournisseur mis à jour.' })
      } else {
        await window.pneusApi.suppliers.create(formData)
        setNotification({ type: 'success', message: 'Nouveau fournisseur créé.' })
      }
      setIsModalOpen(false)
      loadSuppliers()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleArchiveSupplier = async (s: Supplier) => {
    if (confirm(`Archiver le fournisseur ${s.name} tout en préservant son historique d'achats ?`)) {
      try {
        await window.pneusApi.suppliers.archive(s.id)
        setNotification({ type: 'success', message: 'Fournisseur archivé.' })
        loadSuppliers()
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier || paymentAmount <= 0) return

    try {
      await window.pneusApi.suppliers.addPayment({
        supplier_id: selectedSupplier.id,
        amount: paymentAmount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        date: paymentDate,
        reference_note: paymentRefNote.trim() || undefined
      })
      setNotification({ type: 'success', message: 'Règlement fournisseur enregistré.' })
      setIsPaymentModalOpen(false)
      setPaymentAmount(0)
      setPaymentRefNote('')
      loadSuppliers()
      handleSelectSupplier(selectedSupplier)
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    const headers = ['Fournisseur', 'Téléphone', 'Contact', 'Wilaya', 'Total Commandes', 'Total Payé', 'Solde Dû']
    const rows = suppliers.map((s) => [
      s.name,
      s.phone,
      s.contact_person || '',
      s.wilaya || '',
      s.total_orders || 0,
      s.total_paid || 0,
      s.balance_due
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Fournisseurs_${new Date().toISOString().split('T')[0]}`,
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
      { header: 'Fournisseur', dataKey: 'name' },
      { header: 'Téléphone', dataKey: 'phone' },
      { header: 'Contact', dataKey: 'contact_person' },
      { header: 'Commandes (DA)', dataKey: 'orders_formatted' },
      { header: 'Solde Dû (DA)', dataKey: 'balance_formatted' }
    ]

    const rows = suppliers.map((s) => ({
      name: s.name,
      phone: s.phone,
      contact_person: s.contact_person || '-',
      orders_formatted: formatCurrencyDA(s.total_orders || 0),
      balance_formatted: formatCurrencyDA(s.balance_due)
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'دليل الموردين والشركاء' : 'Répertoire des Fournisseurs & Grossistes',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export PDF réussi : ${res.path}` })
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
            {isAr ? 'الموردون وشركات الاستيراد' : 'Fournisseurs & Grossistes'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'متابعة حسابات الموردين، المدفوعات، والديون المستحقة'
              : 'Gestion des comptes fournisseurs, règlements et dettes fournisseurs'}
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
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? '+ مورد جديد' : '+ NOUVEAU FOURNISSEUR'}</span>
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

      {/* Main Grid: Left Suppliers (5 cols) + Right Detail Sheet (7 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
        {/* Left Column: Suppliers Table */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm overflow-hidden">
          <div className="relative">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالاسم، الهاتف أو المسؤول...' : 'Rechercher par nom, téléphone...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full h-10 bg-[#F5F6F8] border border-[#E5E7EB] rounded-xl text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18] ${
                isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            />
          </div>

          <div className="flex-1 overflow-y-auto border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3">Téléphone</th>
                  <th className="py-2.5 px-3 text-right">Solde Dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {suppliers.map((s) => {
                  const isSelected = selectedSupplier?.id === s.id
                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleSelectSupplier(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-100/60 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-[#172235]">
                        <div>{s.name}</div>
                        {s.contact_person && (
                          <div className="text-[10px] text-[#667085] font-normal">{s.contact_person}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085] font-mono text-[11px]">{s.phone}</td>
                      <td className="py-2.5 px-3 text-right font-black text-[#172235]">
                        {formatCurrencyDA(s.balance_due)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Detailed Sheet */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm overflow-hidden">
          {selectedSupplier ? (
            <>
              {/* Header Profile */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#172235] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    <Truck className="w-6 h-6 text-[#F5BD18]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#172235]">{selectedSupplier.name}</h2>
                    <p className="text-xs text-[#667085]">
                      {selectedSupplier.phone} {selectedSupplier.contact_person ? `• Contact: ${selectedSupplier.contact_person}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] rounded-lg text-xs font-black transition-all shadow-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Régler / Acompte</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(selectedSupplier)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleArchiveSupplier(selectedSupplier)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                    title="Archiver"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3 Financial Stats Cards (NO DOUBLE COUNTING OF DEPOSITS) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[#667085] block font-bold uppercase text-[10px]">Total Commandes</span>
                  <strong className="text-[#172235] text-sm">{formatCurrencyDA(selectedSupplier.total_orders || 0)}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[#667085] block font-bold uppercase text-[10px]">Total Payé & Acomptes</span>
                  <strong className="text-emerald-700 text-sm">{formatCurrencyDA(selectedSupplier.total_paid || 0)}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[#667085] block font-bold uppercase text-[10px]">Solde Dû / Dette</span>
                  <strong className="text-amber-600 text-sm">{formatCurrencyDA(selectedSupplier.balance_due)}</strong>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 gap-2 text-xs font-bold text-slate-600">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-all ${
                    activeTab === 'orders' ? 'border-[#F5BD18] text-[#172235] font-black' : 'border-transparent'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Commandes ({supplierPurchases.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-all ${
                    activeTab === 'payments' ? 'border-[#F5BD18] text-[#172235] font-black' : 'border-transparent'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Règlements & Acomptes ({supplierPayments.length})</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'orders' ? (
                  <div className="space-y-2 pt-2">
                    {supplierPurchases.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-500">Aucune commande enregistrée pour ce fournisseur.</p>
                    ) : (
                      supplierPurchases.map((p) => (
                        <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#172235]">{p.purchase_number || p.order_number}</span>
                            <span className="text-[#667085] ml-2">{p.date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#172235]">{formatCurrencyDA(p.total_amount)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                              {p.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    {supplierPayments.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-500">Aucun paiement ou acompte enregistré.</p>
                    ) : (
                      supplierPayments.map((pay) => (
                        <div key={pay.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-[#172235]">{pay.payment_type === 'acompte' ? 'Acompte' : 'Paiement'} • {pay.payment_method.toUpperCase()}</div>
                            <span className="text-[10px] text-[#667085]">{pay.date} {pay.reference_note ? `• ${pay.reference_note}` : ''}</span>
                          </div>
                          <span className="font-black text-emerald-700 text-sm">{formatCurrencyDA(pay.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Sélectionnez un fournisseur pour consulter sa fiche.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add / Edit Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                {editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom / Société *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: SARL Pneus Import Algérie"
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0555 12 34 56"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Personne de contact</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Ex: Mohamed Kaci"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wilaya</label>
                  <input
                    type="text"
                    value={formData.wilaya}
                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  {editingSupplier ? 'Mettre à jour' : 'Créer le fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Payment / Deposit */}
      {isPaymentModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-5 py-3.5 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                Règlement Fournisseur : {selectedSupplier.name}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Type d'opération</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                >
                  <option value="paiement">Règlement de facture / Dette</option>
                  <option value="acompte">Acompte sur commande future</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Montant versé (DA) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-black text-sm text-[#172235]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mode de paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  >
                    <option value="cash">Espèces</option>
                    <option value="check">Chèque</option>
                    <option value="transfer">Virement</option>
                    <option value="card">Carte CIB</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Référence / N° Chèque (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Chèque n° 1234567 BNA"
                  value={paymentRefNote}
                  onChange={(e) => setPaymentRefNote(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Enregistrer le Règlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

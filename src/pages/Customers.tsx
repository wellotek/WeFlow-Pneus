import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Car,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Archive,
  Download,
  FileText,
  CreditCard,
  PlusCircle,
  X,
  Camera,
  ShieldAlert,
  Receipt,
  UserCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import type { Customer, CustomerVehicle, Sale, Quotation, WarrantyClaim } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const Customers: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])
  const [salesHistory, setSalesHistory] = useState<Sale[]>([])
  const [quotesHistory, setQuotesHistory] = useState<Quotation[]>([])
  const [warrantiesHistory, setWarrantiesHistory] = useState<WarrantyClaim[]>([])

  const [activeTab, setActiveTab] = useState<'vehicles' | 'sales' | 'quotes' | 'warranties'>('vehicles')

  // Modal customer
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerForm, setCustomerForm] = useState({
    type: 'individual' as 'individual' | 'business',
    name: '',
    phone: '',
    address: '',
    wilaya: 'Alger',
    email: '',
    notes: '',
    photo_path: ''
  })

  // Modal vehicle
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [vehicleForm, setVehicleForm] = useState({
    brand: 'Renault',
    model: 'Symbol',
    year: '2021',
    license_plate: '',
    mileage: 85000,
    front_dimension: '185/65 R15',
    rear_dimension: '185/65 R15',
    notes: '',
    photo_path: ''
  })

  // File input refs for photo upload
  const customerPhotoInputRef = useRef<HTMLInputElement>(null)
  const vehiclePhotoInputRef = useRef<HTMLInputElement>(null)

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadCustomers = async () => {
    try {
      const list = await window.pneusApi.customers.list(search)
      setCustomers(list)
      if (list.length > 0) {
        if (!selectedCustomer || !list.find((c) => c.id === selectedCustomer.id)) {
          handleSelectCustomer(list[0])
        }
      } else {
        setSelectedCustomer(null)
      }
    } catch (err) {
      console.error('Failed to load customers:', err)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [search])

  const handleSelectCustomer = async (c: Customer) => {
    setSelectedCustomer(c)
    try {
      const [vList, allSales, allQuotes, allWarranties] = await Promise.all([
        window.pneusApi.customers.getVehicles(c.id),
        window.pneusApi.sales.list({ customer_id: c.id }),
        window.pneusApi.quotations.list(),
        window.pneusApi.warranties.list()
      ])
      setVehicles(vList)
      setSalesHistory(allSales.filter((s) => s.customer_id === c.id || s.customer_name === c.name))
      setQuotesHistory(allQuotes.filter((q) => q.customer_id === c.id || q.customer_name === c.name))
      setWarrantiesHistory(allWarranties.filter((w) => w.customer_id === c.id || w.customer_name === c.name))
    } catch (err) {
      console.error('Error fetching customer history:', err)
    }
  }

  // Open Add/Edit Customer Modal
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null)
    setCustomerForm({
      type: 'individual',
      name: '',
      phone: '',
      address: '',
      wilaya: 'Alger',
      email: '',
      notes: '',
      photo_path: ''
    })
    setIsCustomerModalOpen(true)
  }

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c)
    setCustomerForm({
      type: c.type,
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      wilaya: c.wilaya || 'Alger',
      email: c.email || '',
      notes: c.notes || '',
      photo_path: c.photo_path || ''
    })
    setIsCustomerModalOpen(true)
  }

  // Handle Photo Upload
  const handleCustomerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await window.pneusApi.media.uploadImage('customers', base64, file.name)
        if (res && res.path) {
          setCustomerForm((prev) => ({ ...prev, photo_path: res.path }))
        }
      } catch (err: any) {
        alert(`Erreur upload photo: ${err.message}`)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleVehiclePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await window.pneusApi.media.uploadImage('vehicles', base64, file.name)
        if (res && res.path) {
          setVehicleForm((prev) => ({ ...prev, photo_path: res.path }))
        }
      } catch (err: any) {
        alert(`Erreur upload photo véhicule: ${err.message}`)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCustomer) {
        await window.pneusApi.customers.update(editingCustomer.id, customerForm)
        setNotification({ type: 'success', message: 'Client mis à jour avec succès.' })
      } else {
        const created = await window.pneusApi.customers.create(customerForm)
        setSelectedCustomer(created)
        setNotification({ type: 'success', message: 'Nouveau client créé avec succès.' })
      }
      setIsCustomerModalOpen(false)
      loadCustomers()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  // Soft Archive Customer
  const handleArchiveCustomer = async (c: Customer) => {
    if (confirm(isAr ? `أرشفة الزبون ${c.name} مع الحفاظ على الفواتير؟` : `Archiver le client ${c.name} tout en préservant son historique comptable ?`)) {
      try {
        await window.pneusApi.customers.archive(c.id)
        setNotification({ type: 'success', message: 'Client archivé avec succès.' })
        loadCustomers()
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Save Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    try {
      if (editingVehicleId) {
        await window.pneusApi.customers.updateVehicle(editingVehicleId, vehicleForm)
        setNotification({ type: 'success', message: 'Véhicule mis à jour.' })
      } else {
        await window.pneusApi.customers.createVehicle({
          customer_id: selectedCustomer.id,
          brand: vehicleForm.brand,
          model: vehicleForm.model,
          year: vehicleForm.year,
          license_plate: vehicleForm.license_plate,
          mileage: vehicleForm.mileage,
          front_dimension: vehicleForm.front_dimension,
          rear_dimension: vehicleForm.rear_dimension,
          notes: vehicleForm.notes,
          photo_path: vehicleForm.photo_path
        })
        setNotification({ type: 'success', message: 'Véhicule associé au client.' })
      }
      setIsVehicleModalOpen(false)
      handleSelectCustomer(selectedCustomer)
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  // Archive Vehicle
  const handleArchiveVehicle = async (vId: string) => {
    if (confirm('Archiver ce véhicule ?')) {
      try {
        await window.pneusApi.customers.archiveVehicle(vId)
        if (selectedCustomer) handleSelectCustomer(selectedCustomer)
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    const headers = ['Nom', 'Type', 'Téléphone', 'Wilaya', 'Adresse', 'Email', 'Véhicules', 'Solde Dû (DA)']
    const rows = customers.map((c) => [
      c.name,
      c.type === 'business' ? 'Société' : 'Particulier',
      c.phone,
      c.wilaya || '',
      c.address || '',
      c.email || '',
      c.vehicle_count || 0,
      c.balance_due
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Clients_${new Date().toISOString().split('T')[0]}`,
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
      { header: 'Nom / Raison', dataKey: 'name' },
      { header: 'Téléphone', dataKey: 'phone' },
      { header: 'Wilaya', dataKey: 'wilaya' },
      { header: 'Véhicules', dataKey: 'vehicle_count' },
      { header: 'Solde Dû (DA)', dataKey: 'balance_formatted' }
    ]

    const rows = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      wilaya: c.wilaya || '-',
      vehicle_count: c.vehicle_count || 0,
      balance_formatted: formatCurrencyDA(c.balance_due)
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'قائمة الزبائن' : 'Répertoire des Clients',
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
            {isAr ? 'الزبائن والمركبات' : 'Clients & Véhicules'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'إدارة ملفات الزبائن، صور المركبات، وتاريخ العمليات والفواتير'
              : 'Fichier client complet, historique des montes pneumatiques et opérations'}
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
            onClick={handleOpenAddCustomer}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? '+ زبون جديد' : '+ NOUVEAU CLIENT'}</span>
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

      {/* Main Grid: Left Customers List (5 cols) + Right Customer Sheet (7 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Customer Table (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm overflow-hidden">
          <div className="relative">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالاسم، الهاتف، الولاية...' : 'Recherche par nom, téléphone, wilaya...'}
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
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Téléphone</th>
                  <th className="py-2.5 px-2 text-center">Auto</th>
                  <th className="py-2.5 px-3 text-right">Solde Dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {customers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-100/60 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-[#172235]">
                        <div className="flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.type === 'business' && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                              PRO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#667085] font-mono text-[11px]">{c.phone}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                          {c.vehicle_count || 0}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#172235]">
                        {formatCurrencyDA(c.balance_due)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Customer Details Sheet & Tabs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm overflow-hidden">
          {selectedCustomer ? (
            <>
              {/* Header Card with Client Info & Quick Actions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#172235] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-[#172235]">{selectedCustomer.name}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                        {selectedCustomer.type === 'business' ? 'Professionnel' : 'Particulier'}
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] flex items-center gap-2 mt-0.5">
                      <span>{selectedCustomer.phone}</span>
                      {selectedCustomer.wilaya && <span>• {selectedCustomer.wilaya}</span>}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons matching prompt specifications */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => navigate('/quotations')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-[#172235] rounded-lg text-xs font-bold transition-all shadow-xs"
                    title="Créer un devis pour ce client"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Créer un devis</span>
                  </button>
                  <button
                    onClick={() => navigate('/pos')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] rounded-lg text-xs font-black transition-all shadow-xs"
                    title="Ouvrir le POS pour ce client"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Nouvelle vente</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditCustomer(selectedCustomer)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600"
                    title="Modifier la fiche client"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleArchiveCustomer(selectedCustomer)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                    title="Archiver ce client (conserve la comptabilité)"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-200 gap-2 text-xs font-bold text-slate-600">
                {[
                  { id: 'vehicles', label: `Véhicules (${vehicles.length})`, icon: Car },
                  { id: 'sales', label: `Ventes (${salesHistory.length})`, icon: Receipt },
                  { id: 'quotes', label: `Devis (${quotesHistory.length})`, icon: FileText },
                  { id: 'warranties', label: `Garanties (${warrantiesHistory.length})`, icon: ShieldAlert }
                ].map((t) => {
                  const Icon = t.icon
                  const isAct = activeTab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-all ${
                        isAct
                          ? 'border-[#F5BD18] text-[#172235] font-black'
                          : 'border-transparent hover:text-[#172235]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isAct ? 'text-[#F5BD18]' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto">
                {/* TAB: Vehicles */}
                {activeTab === 'vehicles' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#667085] uppercase">
                        Véhicules rattachés
                      </span>
                      <button
                        onClick={() => {
                          setEditingVehicleId(null)
                          setVehicleForm({
                            brand: 'Renault',
                            model: 'Symbol',
                            year: '2021',
                            license_plate: '',
                            mileage: 85000,
                            front_dimension: '185/65 R15',
                            rear_dimension: '185/65 R15',
                            notes: '',
                            photo_path: ''
                          })
                          setIsVehicleModalOpen(true)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#172235] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#F5BD18]" />
                        <span>Ajouter un véhicule</span>
                      </button>
                    </div>

                    {vehicles.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Aucun véhicule enregistré pour ce client.
                      </div>
                    ) : (
                      vehicles.map((v) => (
                        <div key={v.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[#172235] text-sm">
                              {v.brand} {v.model} ({v.year || '-'})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-[#172235] text-white rounded-md">
                                {v.license_plate}
                              </span>
                              <button
                                onClick={() => handleArchiveVehicle(v.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                title="Archiver le véhicule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[#667085] pt-1 border-t border-slate-200">
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-700">Kilométrage:</span>
                              <strong>{v.mileage ? `${v.mileage} km` : 'Non renseigné'}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-700">Monte Avant:</span>
                              <strong>{v.front_dimension || '-'}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-slate-700">Monte Arrière:</span>
                              <strong>{v.rear_dimension || '-'}</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB: Sales */}
                {activeTab === 'sales' && (
                  <div className="space-y-2 pt-2">
                    {salesHistory.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Aucune vente enregistrée pour ce client.
                      </div>
                    ) : (
                      salesHistory.map((s) => (
                        <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#172235]">{s.invoice_number}</span>
                            <span className="text-[#667085] ml-2">{s.date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#172235]">{formatCurrencyDA(s.total_amount)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {s.status.toUpperCase()}
                            </span>
                            <button
                              onClick={() => window.pneusApi.documents.printInvoice(s.id)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600"
                              title="Imprimer Facture"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB: Quotes */}
                {activeTab === 'quotes' && (
                  <div className="space-y-2 pt-2">
                    {quotesHistory.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Aucun devis enregistré pour ce client.
                      </div>
                    ) : (
                      quotesHistory.map((q) => (
                        <div key={q.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#172235]">{q.quote_number}</span>
                            <span className="text-[#667085] ml-2">{q.date} (valable jusqu'au {q.valid_until})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#172235]">{formatCurrencyDA(q.total_amount)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {q.status.toUpperCase()}
                            </span>
                            <button
                              onClick={() => window.pneusApi.documents.printQuotation(q.id)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600"
                              title="Imprimer Devis"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB: Warranties */}
                {activeTab === 'warranties' && (
                  <div className="space-y-2 pt-2">
                    {warrantiesHistory.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Aucun dossier de garantie pour ce client.
                      </div>
                    ) : (
                      warrantiesHistory.map((w) => (
                        <div key={w.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#172235]">{w.claim_number}</span>
                            <p className="text-[#667085]">{w.product_ref} • {w.reason}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {w.status.toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <UserCheck className="w-10 h-10 mb-2 opacity-40" />
              <p>Sélectionnez un client dans la liste pour voir sa fiche complète.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add / Edit Customer */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                {editingCustomer ? 'Modifier la Fiche Client' : 'Nouveau Client'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Ex: Ahmed Benali / SARL Express"
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-[#172235]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="0555 12 34 56"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type de client</label>
                  <select
                    value={customerForm.type}
                    onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value as any })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-[#172235]"
                  >
                    <option value="individual">Particulier</option>
                    <option value="business">Société / Professionnel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wilaya</label>
                  <input
                    type="text"
                    value={customerForm.wilaya}
                    onChange={(e) => setCustomerForm({ ...customerForm, wilaya: e.target.value })}
                    placeholder="Alger, Oran..."
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email (Optionnel)</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    placeholder="client@mail.com"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse complète</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Rue, quartier, commune..."
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo (Optionnel)</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={customerPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomerPhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => customerPhotoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#F5BD18]" />
                    <span>{customerForm.photo_path ? 'Changer la photo' : 'Choisir une photo'}</span>
                  </button>
                  {customerForm.photo_path && (
                    <span className="text-emerald-600 font-bold text-[11px]">Photo enregistrée</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  {editingCustomer ? 'Mettre à jour' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                {editingVehicleId ? 'Modifier le Véhicule' : 'Associer un Véhicule au Client'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Marque *</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modèle *</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Immatriculation *</label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value.toUpperCase() })}
                    placeholder="12345 121 16"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono uppercase font-bold text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kilométrage</label>
                  <input
                    type="number"
                    value={vehicleForm.mileage}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monte Avant</label>
                  <input
                    type="text"
                    value={vehicleForm.front_dimension}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, front_dimension: e.target.value })}
                    placeholder="185/65 R15"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monte Arrière</label>
                  <input
                    type="text"
                    value={vehicleForm.rear_dimension}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, rear_dimension: e.target.value })}
                    placeholder="185/65 R15"
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

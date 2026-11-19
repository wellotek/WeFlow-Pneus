import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ShieldAlert,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Eye,
  X,
  AlertTriangle,
  FileText,
  Download,
  CheckCircle2,
  Edit2,
  Archive
} from 'lucide-react'
import type { WarrantyClaim, WarrantyStatus } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const WarrantiesPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null)

  // Form state for new claim
  const [newClaim, setNewClaim] = useState({
    customer_name: '',
    customer_phone: '',
    invoice_number: '',
    product_ref: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    claim_date: new Date().toISOString().slice(0, 10),
    reason: 'Hernie / Déformation flanc',
    defect_description: '',
    status: 'new' as WarrantyStatus
  })

  // Status update modal state
  const [updateStatus, setUpdateStatus] = useState<WarrantyStatus>('investigating')
  const [resolutionNotes, setResolutionNotes] = useState('')

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadClaims = async () => {
    try {
      setLoading(true)
      const data = await window.pneusApi.warranties.list()
      setClaims(data || [])
    } catch (err: any) {
      console.error('Failed to load warranty claims:', err)
      setNotification({ type: 'error', message: err?.message || 'Erreur chargement' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [])

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClaim.customer_name || !newClaim.product_ref || !newClaim.defect_description) {
      alert('Veuillez renseigner le nom du client, la référence du pneu et la description.')
      return
    }

    try {
      await window.pneusApi.warranties.create(newClaim)
      setShowCreateModal(false)
      setNewClaim({
        customer_name: '',
        customer_phone: '',
        invoice_number: '',
        product_ref: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        claim_date: new Date().toISOString().slice(0, 10),
        reason: 'Hernie / Déformation flanc',
        defect_description: '',
        status: 'new'
      })
      setNotification({ type: 'success', message: 'Dossier de réclamation enregistré.' })
      await loadClaims()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClaim) return
    try {
      await window.pneusApi.warranties.updateStatus(selectedClaim.id, updateStatus, resolutionNotes)
      setShowStatusModal(false)
      setSelectedClaim(null)
      setResolutionNotes('')
      setNotification({ type: 'success', message: 'Statut de la garantie mis à jour.' })
      await loadClaims()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleArchive = async (claim: WarrantyClaim) => {
    if (confirm(`Archiver la réclamation ${claim.claim_number} ?`)) {
      try {
        await window.pneusApi.warranties.archive(claim.id)
        setNotification({ type: 'success', message: 'Dossier archivé avec succès.' })
        loadClaims()
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    const headers = ['N° Dossier', 'Date Réclamation', 'Client', 'Téléphone', 'Réf Pneu', 'N° Facture', 'Motif', 'Statut']
    const rows = filteredClaims.map((c) => [
      c.claim_number,
      c.claim_date,
      c.customer_name,
      c.customer_phone,
      c.product_ref,
      c.invoice_number || '',
      c.reason,
      c.status
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Garanties_${new Date().toISOString().split('T')[0]}`,
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
      { header: 'N° Dossier', dataKey: 'claim_number' },
      { header: 'Date', dataKey: 'claim_date' },
      { header: 'Client', dataKey: 'customer_name' },
      { header: 'Réf Pneu', dataKey: 'product_ref' },
      { header: 'Motif', dataKey: 'reason' },
      { header: 'Statut', dataKey: 'status_label' }
    ]

    const rows = filteredClaims.map((c) => ({
      claim_number: c.claim_number,
      claim_date: c.claim_date,
      customer_name: c.customer_name,
      product_ref: c.product_ref,
      reason: c.reason,
      status_label: c.status.toUpperCase()
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'سجل الضمانات والإرجاع' : 'Suivi des Garanties & Retours Constructeur',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export PDF réussi : ${res.path}` })
    }
  }

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (c.is_archived) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        return (
          c.claim_number.toLowerCase().includes(q) ||
          c.customer_name.toLowerCase().includes(q) ||
          c.product_ref.toLowerCase().includes(q) ||
          (c.invoice_number && c.invoice_number.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [claims, search, statusFilter])

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
            {isAr ? 'الضمانات والإرجاع' : 'Garanties & Retours'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'متابعة الشكاوى والعيوب المصنعية، قرارات الخبرة والتعويض'
              : 'Dossiers SAV, avaries de fabrication, expertise constructeur et échanges'}
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
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? '+ تسجيل مطالبة ضمان' : '+ NOUVEAU DOSSIER'}</span>
          </button>
        </div>
      </div>

      {/* Notification */}
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

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 mb-3 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم الملف، الزبون، مرجع الإطار...' : 'Recherche par N° dossier, client, référence...'}
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
          <option value="new">Nouveau dossier</option>
          <option value="investigating">Expertise en cours</option>
          <option value="accepted">Accepté (Constructeur)</option>
          <option value="rejected">Refusé</option>
          <option value="replaced">Échange effectué</option>
          <option value="refunded">Remboursé</option>
          <option value="closed">Clos</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
              <tr>
                <th className="py-2.5 px-3">N° Dossier</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Réf Pneu</th>
                <th className="py-2.5 px-3">Motif de Réclamation</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    Chargement des dossiers SAV...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    Aucune réclamation de garantie trouvée.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#172235]">
                      {claim.claim_number}
                    </td>
                    <td className="py-2.5 px-3 text-[#667085] whitespace-nowrap">{claim.claim_date}</td>
                    <td className="py-2.5 px-3 font-bold text-[#172235]">
                      <div>{claim.customer_name}</div>
                      <span className="text-[10px] text-[#667085] font-normal">{claim.customer_phone}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#172235] font-bold">
                      {claim.product_ref}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{claim.reason}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          claim.status === 'new'
                            ? 'bg-blue-100 text-blue-800'
                            : claim.status === 'investigating'
                            ? 'bg-amber-100 text-amber-800'
                            : claim.status === 'accepted' || claim.status === 'replaced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {claim.status === 'new'
                          ? 'Nouveau'
                          : claim.status === 'investigating'
                          ? 'Expertise'
                          : claim.status === 'accepted'
                          ? 'Accepté'
                          : claim.status === 'replaced'
                          ? 'Échangé'
                          : claim.status === 'rejected'
                          ? 'Refusé'
                          : claim.status === 'refunded'
                          ? 'Remboursé'
                          : 'Clos'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClaim(claim)
                            setShowDetailModal(true)
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                          title="Voir le dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClaim(claim)
                            setUpdateStatus(claim.status)
                            setResolutionNotes(claim.resolution_notes || '')
                            setShowStatusModal(true)
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-[11px]"
                          title="Changer le statut"
                        >
                          Statut
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(claim)}
                          className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                          title="Archiver"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create Claim */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">Nouveau Dossier SAV / Garantie</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateClaim} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={newClaim.customer_name}
                    onChange={(e) => setNewClaim({ ...newClaim, customer_name: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={newClaim.customer_phone}
                    onChange={(e) => setNewClaim({ ...newClaim, customer_phone: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Référence du pneu *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MIC-2055516-E"
                    value={newClaim.product_ref}
                    onChange={(e) => setNewClaim({ ...newClaim, product_ref: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° Facture d'origine</label>
                  <input
                    type="text"
                    placeholder="Ex: FAC-2026-0042"
                    value={newClaim.invoice_number}
                    onChange={(e) => setNewClaim({ ...newClaim, invoice_number: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif principal</label>
                <select
                  value={newClaim.reason}
                  onChange={(e) => setNewClaim({ ...newClaim, reason: e.target.value })}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold"
                >
                  <option value="Hernie / Déformation flanc">Hernie / Déformation flanc</option>
                  <option value="Défaut de bande de roulement / Décollement">Défaut de bande de roulement / Décollement</option>
                  <option value="Vibration persistante / Balourd anormal">Vibration persistante / Balourd anormal</option>
                  <option value="Porosité / Perte de pression inexpliquée">Porosité / Perte de pression inexpliquée</option>
                  <option value="Autre avarie">Autre avarie</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description détaillée de l'anomalie *</label>
                <textarea
                  rows={3}
                  required
                  value={newClaim.defect_description}
                  onChange={(e) => setNewClaim({ ...newClaim, defect_description: e.target.value })}
                  placeholder="Circonstances d'apparition, kilométrage approximatif..."
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Enregistrer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Status */}
      {showStatusModal && selectedClaim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">Changer Statut : {selectedClaim.claim_number}</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nouveau Statut</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as any)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                >
                  <option value="new">Nouveau dossier</option>
                  <option value="investigating">Expertise en cours</option>
                  <option value="accepted">Accepté par le fabricant</option>
                  <option value="rejected">Refusé (Non garanti / Choc trottoir)</option>
                  <option value="replaced">Échange pneu neuf effectué</option>
                  <option value="refunded">Remboursement client effectué</option>
                  <option value="closed">Dossier clôturé</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rapport d'expertise / Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Justification de la décision, rapport d'expert..."
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Claim Details */}
      {showDetailModal && selectedClaim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">Détail du Dossier SAV : {selectedClaim.claim_number}</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-bold block">Client :</span>
                  <strong>{selectedClaim.customer_name}</strong>
                  <p className="text-slate-600">{selectedClaim.customer_phone}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Pneu concerné :</span>
                  <strong className="font-mono">{selectedClaim.product_ref}</strong>
                  <p className="text-slate-600">{selectedClaim.invoice_number ? `Facture: ${selectedClaim.invoice_number}` : ''}</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Motif déclaré :</span>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">{selectedClaim.reason}</p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Description détaillée :</span>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-line">{selectedClaim.defect_description}</p>
              </div>

              {selectedClaim.resolution_notes && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Notes de résolution / Expertise :</span>
                  <p className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg whitespace-pre-line">
                    {selectedClaim.resolution_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

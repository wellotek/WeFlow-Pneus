import React, { useEffect, useState } from 'react'
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
  FileText
} from 'lucide-react'
import type { WarrantyClaim, WarrantyStatus } from '../../shared/types'
import { formatDA } from '../../shared/locales'

export const WarrantiesPage: React.FC = () => {
  const { t } = useTranslation()
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null)

  // Form state for new claim
  const [newClaim, setNewClaim] = useState({
    customer_name: '',
    customer_phone: '',
    invoice_number: '',
    product_ref: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    claim_date: new Date().toISOString().slice(0, 10),
    reason: 'hernie',
    defect_description: '',
    status: 'new' as WarrantyStatus
  })

  // Status update modal state
  const [updateStatus, setUpdateStatus] = useState<WarrantyStatus>('investigating')
  const [resolutionNotes, setResolutionNotes] = useState('')

  const loadClaims = async () => {
    try {
      setLoading(true)
      if (window.pneusApi?.warranties?.list) {
        const data = await window.pneusApi.warranties.list()
        setClaims(data || [])
      }
    } catch (err) {
      console.error('Failed to load warranty claims:', err)
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
      alert('Veuillez renseigner le nom du client, la référence du pneu et le motif.')
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
        reason: 'hernie',
        defect_description: '',
        status: 'new'
      })
      await loadClaims()
    } catch (err: any) {
      alert(`Erreur lors de l'enregistrement de la réclamation: ${err.message}`)
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
      await loadClaims()
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  const filteredClaims = claims.filter((c) => {
    const matchesSearch =
      c.claim_number.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.product_ref.toLowerCase().includes(search.toLowerCase()) ||
      (c.invoice_number && c.invoice_number.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Metrics
  const totalClaims = claims.length
  const pendingCount = claims.filter((c) => c.status === 'new' || c.status === 'investigating').length
  const acceptedCount = claims.filter(
    (c) => c.status === 'accepted' || c.status === 'replaced' || c.status === 'refunded'
  ).length
  const rejectedCount = claims.filter((c) => c.status === 'rejected').length

  const getStatusBadge = (status: WarrantyStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            <Clock className="w-3.5 h-3.5" /> Nouveau
          </span>
        )
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> En expertise
          </span>
        )
      case 'accepted':
      case 'replaced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            {status === 'replaced' ? 'Pneu Remplacé' : 'Accepté'}
          </span>
        )
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
            <RotateCcw className="w-3.5 h-3.5" /> Remboursé
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Rejeté
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            Clôturé
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
            {t('nav.warranties')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion du SAV, réclamations de garantie constructeur et retours clients
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Réclamation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-kpi p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Réclamations</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totalClaims}</p>
        </div>
        <div className="card-kpi p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">En cours d'expertise</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
        </div>
        <div className="card-kpi p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Garanties Validées</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{acceptedCount}</p>
        </div>
        <div className="card-kpi p-5 border-l-4 border-l-rose-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dossiers Rejetés</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">{rejectedCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par n° réclamation, client, réf pneu ou facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-[160px]"
          >
            <option value="all">Tous les statuts</option>
            <option value="new">Nouveaux</option>
            <option value="investigating">En cours d'expertise</option>
            <option value="accepted">Acceptés</option>
            <option value="replaced">Remplacés</option>
            <option value="refunded">Remboursés</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">N° Réclamation</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Référence Pneu</th>
                <th className="py-3 px-4">Motif</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Chargement des dossiers de garantie...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Aucun dossier de garantie trouvé.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                      {claim.claim_number}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{claim.claim_date}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-gray-900">{claim.customer_name}</p>
                      <p className="text-xs text-gray-500">{claim.customer_phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-900">{claim.product_ref}</span>
                      {claim.invoice_number && (
                        <p className="text-xs text-gray-400">Facture: {claim.invoice_number}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium capitalize text-gray-800">{claim.reason}</span>
                      <p className="text-xs text-gray-500 max-w-xs truncate">
                        {claim.defect_description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(claim.status)}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedClaim(claim)
                          setUpdateStatus(claim.status)
                          setResolutionNotes(claim.resolution_notes || '')
                          setShowStatusModal(true)
                        }}
                        className="p-1.5 text-gray-600 hover:text-primary hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Mettre à jour le statut"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Warranty Claim */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-dark-navy text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Nouvelle Réclamation SAV & Garantie
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClaim} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du Client *</label>
                  <input
                    type="text"
                    required
                    value={newClaim.customer_name}
                    onChange={(e) => setNewClaim({ ...newClaim, customer_name: e.target.value })}
                    className="input-field w-full"
                    placeholder="M. Dupont / EURL Transports"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={newClaim.customer_phone}
                    onChange={(e) => setNewClaim({ ...newClaim, customer_phone: e.target.value })}
                    className="input-field w-full"
                    placeholder="0550 12 34 56"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">N° Facture Vente</label>
                  <input
                    type="text"
                    value={newClaim.invoice_number}
                    onChange={(e) => setNewClaim({ ...newClaim, invoice_number: e.target.value })}
                    className="input-field w-full"
                    placeholder="Ex: F-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date d'achat</label>
                  <input
                    type="date"
                    value={newClaim.purchase_date}
                    onChange={(e) => setNewClaim({ ...newClaim, purchase_date: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Référence / Désignation du Pneu *
                </label>
                <input
                  type="text"
                  required
                  value={newClaim.product_ref}
                  onChange={(e) => setNewClaim({ ...newClaim, product_ref: e.target.value })}
                  className="input-field w-full"
                  placeholder="Ex: Michelin 205/55 R16 Primacy 4"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motif de réclamation *</label>
                <select
                  value={newClaim.reason}
                  onChange={(e) => setNewClaim({ ...newClaim, reason: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="hernie">Hernie / Déformation flanc</option>
                  <option value="usure_anormale">Usure anormale / Facette</option>
                  <option value="vibration">Vibration persistante / Équilibrage impossible</option>
                  <option value="perte_pression">Perte de pression lente / Défaut tringle</option>
                  <option value="bruit">Bruit de roulement excessif</option>
                  <option value="crevaison">Crevaison non réparable (Garantie Dommages)</option>
                  <option value="autre">Autre anomalie</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description détaillée du défaut constaté *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newClaim.defect_description}
                  onChange={(e) => setNewClaim({ ...newClaim, defect_description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Détaillez le problème constaté lors du diagnostic en atelier..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary px-5 py-2">
                  Enregistrer la Réclamation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Status & Decision */}
      {showStatusModal && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-dark-navy text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Décision SAV : {selectedClaim.claim_number}
              </h2>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Client: <strong className="text-gray-800">{selectedClaim.customer_name}</strong></p>
                <p className="text-xs text-gray-500">Pneu: <strong className="text-gray-800">{selectedClaim.product_ref}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nouveau Statut</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as WarrantyStatus)}
                  className="input-field w-full"
                >
                  <option value="new">Nouveau dossier</option>
                  <option value="investigating">En cours d'expertise technique</option>
                  <option value="accepted">Garantie acceptée (Accord constructeur)</option>
                  <option value="replaced">Pneu remplacé à neuf</option>
                  <option value="refunded">Avoir / Remboursement client</option>
                  <option value="rejected">Rejeté (Choc trottoir / Sous-gonflage)</option>
                  <option value="closed">Dossier clôturé</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rapport technique / Notes de résolution
                </label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="input-field w-full"
                  placeholder="Ex: Analyse confirmant un défaut d'adhérence de la bande de roulement. Pneu neuf fourni au client..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary px-5 py-2">
                  Enregistrer la Décision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  History,
  Download,
  FileText,
  X,
  CheckCircle2,
  PackagePlus,
  Edit2
} from 'lucide-react'
import type { Product, StockMovement } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Stock: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, lowStockCount: 0 })
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory')
  const [search, setSearch] = useState('')

  // Quick Movement Modal (+ / - / Ajuster)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [movementQty, setMovementQty] = useState<number>(1)
  const [adjustReason, setAdjustReason] = useState('Réception express / correction')

  // History Modal for Specific Product
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [productMovements, setProductMovements] = useState<StockMovement[]>([])

  // Quick Add Misc Item Modal
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false)
  const [miscForm, setMiscForm] = useState({
    designation: '',
    product_type: 'accessoire' as any,
    buy_price: 0,
    sell_price: 0,
    stock_quantity: 10,
    min_stock_alert: 5
  })

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    try {
      const [pList, sum, moves] = await Promise.all([
        window.pneusApi.products.list(),
        window.pneusApi.stock.getSummary(),
        window.pneusApi.stock.listMovements()
      ])
      setProducts(pList)
      setSummary(sum)
      setMovements(moves)
    } catch (err: any) {
      console.error('Failed to load stock data:', err)
      setNotification({ type: 'error', message: err?.message || 'Erreur lors du chargement des stocks' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenMovementModal = (p: Product, type: 'add' | 'remove' | 'set') => {
    setSelectedProduct(p)
    setAdjustType(type)
    setMovementQty(1)
    if (type === 'add') setAdjustReason('Entrée de stock / Réassort')
    else if (type === 'remove') setAdjustReason('Sortie de stock / Perte / Ajustement')
    else setAdjustReason('Ajustement inventaire physique')
    setIsAdjustModalOpen(true)
  }

  const handleConfirmMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || movementQty <= 0) return

    try {
      let delta = movementQty
      if (adjustType === 'remove') delta = -movementQty
      else if (adjustType === 'set') delta = movementQty - selectedProduct.stock_quantity

      await window.pneusApi.stock.adjust(selectedProduct.id, delta, adjustReason)
      setNotification({
        type: 'success',
        message: `Stock mis à jour pour ${selectedProduct.reference} (${delta > 0 ? `+${delta}` : delta}).`
      })
      setIsAdjustModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur d'ajustement : ${err.message}`)
    }
  }

  const handleOpenProductHistory = async (p: Product) => {
    setHistoryProduct(p)
    try {
      const pMoves = await window.pneusApi.stock.listMovements(p.id)
      setProductMovements(pMoves)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSaveMiscItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!miscForm.designation.trim()) return

    try {
      await window.pneusApi.products.create({
        designation: miscForm.designation.trim(),
        brand: 'Générique',
        product_type: miscForm.product_type,
        buy_price: Number(miscForm.buy_price) || 0,
        sell_price: Number(miscForm.sell_price) || 0,
        stock_quantity: Number(miscForm.stock_quantity) || 0,
        min_stock_alert: Number(miscForm.min_stock_alert) || 5
      })
      setNotification({ type: 'success', message: 'Article divers ajouté avec succès.' })
      setIsMiscModalOpen(false)
      setMiscForm({
        designation: '',
        product_type: 'accessoire',
        buy_price: 0,
        sell_price: 0,
        stock_quantity: 10,
        min_stock_alert: 5
      })
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    const headers = ['Référence', 'Marque', 'Désignation', 'Dimension', 'Type', 'Prix Achat (DA)', 'Prix Vente (DA)', 'Stock Actuel']
    const rows = products.map((p) => [
      p.reference,
      p.brand,
      p.model_name || '',
      p.dimension,
      p.product_type || 'pneu',
      p.buy_price,
      p.sell_price,
      p.stock_quantity
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Inventaire_Stock_${new Date().toISOString().split('T')[0]}`,
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
      { header: 'Référence', dataKey: 'reference' },
      { header: 'Article / Marque', dataKey: 'article_label' },
      { header: 'Dimension', dataKey: 'dimension' },
      { header: 'Prix Vente (DA)', dataKey: 'price_formatted' },
      { header: 'Stock', dataKey: 'stock_quantity' }
    ]

    const rows = products.map((p) => ({
      reference: p.reference,
      article_label: `${p.brand} ${p.model_name || ''}`.trim(),
      dimension: p.dimension || '-',
      price_formatted: formatCurrencyDA(p.sell_price),
      stock_quantity: p.stock_quantity
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'حالة المخزون والجرد' : 'État de Stock & Inventaire',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export PDF réussi : ${res.path}` })
    }
  }

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      p.reference.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.dimension.toLowerCase().includes(q) ||
      (p.model_name && p.model_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
            {isAr ? 'المخزون وحركات السلع' : 'Stocks & Inventaire'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'متابعة الكميات المتوفرة، حركات الدخول والخروج، والتعديل اليدوي'
              : 'Valorisation des stocks, journal des entrées/sorties et ajustements'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            onClick={() => setIsMiscModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#172235] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <PackagePlus className="w-3.5 h-3.5 text-[#F5BD18]" />
            <span>+ Article Divers</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-200 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'inventory' ? 'bg-white text-[#172235] shadow-xs' : 'text-slate-600'
              }`}
            >
              État du Stock
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'movements' ? 'bg-white text-[#172235] shadow-xs' : 'text-slate-600'
              }`}
            >
              Mouvements ({movements.length})
            </button>
          </div>
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

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-[#667085] uppercase">Total Articles en Stock</span>
          <div className="text-xl font-black text-[#172235] mt-1">{summary.totalItems} articles</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-[#667085] uppercase">Valeur du Stock (Prix Achat)</span>
          <div className="text-xl font-black text-[#172235] mt-1">
            {formatCurrencyDA(summary.totalValue)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#667085] uppercase">Alertes Stock Bas</span>
            <div className="text-xl font-black text-red-600 mt-1">{summary.lowStockCount} articles</div>
          </div>
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs mb-3">
        <input
          type="text"
          placeholder="Filtrer les articles du stock par réf, marque, dimension..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#172235] outline-none focus:ring-1 focus:ring-[#F5BD18]"
        />
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'inventory' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3">Référence</th>
                  <th className="py-2.5 px-3">Article / Marque</th>
                  <th className="py-2.5 px-3">Dimension</th>
                  <th className="py-2.5 px-2 text-center">Type</th>
                  <th className="py-2.5 px-3 text-right">P. Achat (DA)</th>
                  <th className="py-2.5 px-3 text-right">P. Vente (DA)</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-center">Actions Rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredProducts.map((p) => {
                  const isOut = p.stock_quantity <= 0
                  const isLow = p.stock_quantity <= p.min_stock_alert && !isOut
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#172235]">{p.reference}</td>
                      <td className="py-2.5 px-3 font-bold text-[#172235]">
                        {p.brand} {p.model_name || ''}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085]">{p.dimension || '-'}</td>
                      <td className="py-2.5 px-2 text-center text-[10px] font-bold text-slate-500 uppercase">
                        {p.product_type || 'Pneu'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-semibold">
                        {formatCurrencyDA(p.buy_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#172235]">
                        {formatCurrencyDA(p.sell_price)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                            isOut
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenMovementModal(p, 'add')}
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[11px]"
                            title="Ajouter du stock"
                          >
                            + Entrée
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMovementModal(p, 'remove')}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-[11px]"
                            title="Retirer du stock"
                          >
                            - Sortie
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMovementModal(p, 'set')}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px]"
                            title="Ajuster le stock à une valeur précise"
                          >
                            Ajuster
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenProductHistory(p)}
                            className="p-1 hover:bg-slate-100 text-slate-500 rounded"
                            title="Historique des mouvements"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-center">Quantité</th>
                  <th className="py-2.5 px-3 text-right">Coût Unitaire (DA)</th>
                  <th className="py-2.5 px-3">Document de référence</th>
                  <th className="py-2.5 px-3">Motif / Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{m.date}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type.startsWith('in')
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type.startsWith('out')
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-sm">
                      {m.type.startsWith('out') ? `-${m.quantity}` : `+${m.quantity}`}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatCurrencyDA(m.unit_cost)}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {m.reference_doc_id || m.reference_doc_type || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{m.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: Stock Movement Adjustment */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-5 py-3.5 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                {adjustType === 'add'
                  ? 'Entrée de Stock Rapide'
                  : adjustType === 'remove'
                  ? 'Sortie de Stock'
                  : 'Correction Inventaire'}
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmMovement} className="p-5 space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono font-bold text-[#172235]">{selectedProduct.reference}</span>
                <p className="text-slate-600 font-semibold">{selectedProduct.brand} {selectedProduct.dimension}</p>
                <p className="text-xs text-slate-500 mt-1">Stock actuel : <strong>{selectedProduct.stock_quantity}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {adjustType === 'set' ? 'Nouveau stock réel exact' : 'Quantité à modifier *'}
                </label>
                <input
                  type="number"
                  min={adjustType === 'set' ? 0 : 1}
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-[#172235]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif / Justification *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Product Movements History */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                Historique des mouvements : {historyProduct.brand} {historyProduct.dimension} ({historyProduct.reference})
              </h3>
              <button onClick={() => setHistoryProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-xs flex-1">
              {productMovements.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Aucun mouvement enregistré pour cet article.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-center">Quantité</th>
                      <th className="py-2 px-3">Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{m.date}</td>
                        <td className="py-2 px-3 font-semibold text-[#172235]">{m.type}</td>
                        <td className="py-2 px-3 text-center font-bold">
                          {m.type.startsWith('out') ? `-${m.quantity}` : `+${m.quantity}`}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{m.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Add Misc Item */}
      {isMiscModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">Ajouter un Article Divers / Atelier</h3>
              <button onClick={() => setIsMiscModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMiscItem} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Désignation de l'article *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Valve TR414, Plomb équilibrage 20g, Colle rustine..."
                  value={miscForm.designation}
                  onChange={(e) => setMiscForm({ ...miscForm, designation: e.target.value })}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-[#172235]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={miscForm.product_type}
                  onChange={(e) => setMiscForm({ ...miscForm, product_type: e.target.value as any })}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-[#172235]"
                >
                  <option value="accessoire">Accessoire</option>
                  <option value="chambre_air">Chambre à air</option>
                  <option value="valve">Valve pneumatique</option>
                  <option value="consommable">Consommable d'atelier</option>
                  <option value="divers">Divers</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix d'Achat (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={miscForm.buy_price}
                    onChange={(e) => setMiscForm({ ...miscForm, buy_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix de Vente (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={miscForm.sell_price}
                    onChange={(e) => setMiscForm({ ...miscForm, sell_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Initial</label>
                  <input
                    type="number"
                    min="0"
                    value={miscForm.stock_quantity}
                    onChange={(e) => setMiscForm({ ...miscForm, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alerte Stock Min</label>
                  <input
                    type="number"
                    min="0"
                    value={miscForm.min_stock_alert}
                    onChange={(e) => setMiscForm({ ...miscForm, min_stock_alert: parseInt(e.target.value, 10) || 5 })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsMiscModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg shadow-xs"
                >
                  Ajouter au stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

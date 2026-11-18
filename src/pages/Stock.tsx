import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes, ArrowUpRight, ArrowDownLeft, Sliders, AlertTriangle, RefreshCw } from 'lucide-react'
import type { Product, StockMovement } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Stock: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, lowStockCount: 0 })
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory')

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustReason, setAdjustReason] = useState('Inventaire physique de contrôle')

  const loadData = async () => {
    try {
      const pList = await window.pneusApi.products.list()
      setProducts(pList)
      const sum = await window.pneusApi.stock.getSummary()
      setSummary(sum)
      const moves = await window.pneusApi.stock.listMovements()
      setMovements(moves)
    } catch (err) {
      console.error('Failed to load stock data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAdjust = (p: Product) => {
    setSelectedProduct(p)
    setAdjustQty(0)
    setIsAdjustModalOpen(true)
  }

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || adjustQty === 0) return
    try {
      await window.pneusApi.stock.adjust(selectedProduct.id, adjustQty, adjustReason)
      setIsAdjustModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur d'ajustement : ${err.message}`)
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.stock')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Valorisation du stock, journal des mouvements et inventaire physique
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-[#E5E7EB] p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'inventory' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085]'
            }`}
          >
            État du Stock
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'movements' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085]'
            }`}
          >
            Journal des Mouvements ({movements.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-[#667085] uppercase">Total Pneus en Stock</span>
          <div className="text-2xl font-black text-[#111827] mt-1">{summary.totalItems} pneus</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-[#667085] uppercase">Valeur du Stock (PAMP)</span>
          <div className="text-2xl font-black text-[#172235] mt-1">
            {formatCurrencyDA(summary.totalValue, i18n.language)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-[#667085] uppercase">Alertes de Réapprovisionnement</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{summary.lowStockCount} références</div>
        </div>
      </div>

      {/* Tab 1: Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Marque & Dimension</th>
                <th className="py-3 px-4">Emplacement</th>
                <th className="py-3 px-4 text-center">Qté en Stock</th>
                <th className="py-3 px-4 text-right">Prix d'Achat</th>
                <th className="py-3 px-4 text-right">Valeur Stock</th>
                <th className="py-3 px-4 text-center">Ajustement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {products.map((p) => {
                const isLow = p.stock_quantity <= p.min_stock_alert
                return (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#111827]">{p.reference}</td>
                    <td className="py-3 px-4">
                      <strong>{p.brand}</strong> {p.dimension} <span className="text-[#667085]">({p.model_name})</span>
                    </td>
                    <td className="py-3 px-4 text-[#667085]">{p.location || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md font-black text-xs ${
                          isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-[#111827]'
                        }`}
                      >
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#667085]">
                      {formatCurrencyDA(p.buy_price, i18n.language)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#111827]">
                      {formatCurrencyDA(p.stock_quantity * p.buy_price, i18n.language)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenAdjust(p)}
                        className="px-2.5 py-1 bg-[#172235] hover:bg-[#111827] text-white rounded-md text-[11px] font-semibold transition-all"
                      >
                        Ajuster
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Movements Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type de Mouvement</th>
                <th className="py-3 px-4 text-center">Quantité</th>
                <th className="py-3 px-4">Document Réf.</th>
                <th className="py-3 px-4">Motif / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {movements.map((m: any) => {
                const isPositive = m.quantity > 0 && (m.type === 'in_purchase' || m.type === 'adjustment_plus' || m.type === 'return_in')
                return (
                  <tr key={m.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 text-[#667085]">{formatDateStr(m.date, i18n.language)}</td>
                    <td className="py-3 px-4 font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase ${
                          isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold font-mono">
                      {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#111827]">{m.reference_doc_id || '-'}</td>
                    <td className="py-3 px-4 text-[#667085]">{m.reason || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Stock Adjustment */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">
              Ajustement Physique de Stock : {selectedProduct.brand} {selectedProduct.dimension}
            </h3>
            <div className="p-3 bg-[#F5F6F8] rounded-xl text-xs space-y-1">
              <div>Stock actuel en base : <strong>{selectedProduct.stock_quantity} unités</strong></div>
              <div>Prix d'achat unitaire : <strong>{formatCurrencyDA(selectedProduct.buy_price, i18n.language)}</strong></div>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">
                  Variation de Stock (+ pour ajout, - pour retrait)
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  placeholder="ex: +4 ou -2"
                  required
                  className="w-full h-9 px-2.5 border rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Motif de l'ajustement</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  className="w-full h-9 px-2.5 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-[#667085]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] font-bold rounded-lg text-[#111827]"
                >
                  Confirmer l'ajustement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

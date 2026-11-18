import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, CheckCircle, Printer, ShoppingBag, Clock } from 'lucide-react'
import type { Product, Purchase, Supplier } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Purchases: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('2026-11-18')
  const [paidAmount, setPaidAmount] = useState(0)
  const [items, setItems] = useState([
    {
      product_id: '',
      reference: 'MIC-2055516-E',
      brand: 'Michelin',
      dimension: '205/55 R16',
      quantity: 10,
      unit_cost: 11000
    }
  ])

  const loadData = async () => {
    try {
      const pList = await window.pneusApi.purchases.list()
      setPurchases(pList)
      const sList = await window.pneusApi.suppliers.list()
      setSuppliers(sList)
      if (sList.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sList[0].id)
      }
      const prodList = await window.pneusApi.products.list()
      setProducts(prodList)
      if (prodList.length > 0) {
        setItems([
          {
            product_id: prodList[0].id,
            reference: prodList[0].reference,
            brand: prodList[0].brand,
            dimension: prodList[0].dimension,
            quantity: 10,
            unit_cost: prodList[0].buy_price
          }
        ])
      }
    } catch (err) {
      console.error('Failed to load purchases:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    if (!supplier) return

    try {
      await window.pneusApi.purchases.create({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        date: purchaseDate,
        paid_amount: paidAmount,
        items
      })
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur création achat : ${err.message}`)
    }
  }

  const handleReceive = async (id: string, num: string) => {
    if (confirm(`Confirmer la réception de la commande ${num} ? Les stocks seront immédiatement augmentés.`)) {
      try {
        await window.pneusApi.purchases.receive(id)
        alert('Marchandise réceptionnée ! Les stocks ont été augmentés.')
        loadData()
      } catch (err: any) {
        alert(`Erreur : ${err.message}`)
      }
    }
  }

  const handlePrint = async (id: string) => {
    try {
      await window.pneusApi.documents.printPurchase(id)
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.purchases')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Commandes fournisseurs, bons de livraison et réceptions en stock
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nouvelle Commande Fournisseur</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
              <th className="py-3 px-4">N° Commande</th>
              <th className="py-3 px-4">Fournisseur</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Total Achat</th>
              <th className="py-3 px-4 text-right">Payé</th>
              <th className="py-3 px-4 text-right">Reste Dû</th>
              <th className="py-3 px-4 text-center">État</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-[#111827]">{p.purchase_number}</td>
                <td className="py-3.5 px-4 font-bold text-[#111827]">{p.supplier_name}</td>
                <td className="py-3.5 px-4 text-[#667085]">{formatDateStr(p.date, i18n.language)}</td>
                <td className="py-3.5 px-4 text-right font-extrabold text-[#111827]">
                  {formatCurrencyDA(p.total_amount, i18n.language)}
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                  {formatCurrencyDA(p.paid_amount, i18n.language)}
                </td>
                <td className="py-3.5 px-4 text-right text-red-600 font-bold">
                  {formatCurrencyDA(p.balance_due, i18n.language)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'received'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {p.status === 'received' ? 'Réceptionné' : 'En commande'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {p.status !== 'received' && (
                      <button
                        onClick={() => handleReceive(p.id, p.purchase_number)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition-all"
                        title="Valider la réception"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Réceptionner</span>
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(p.id)}
                      className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-md"
                      title="Imprimer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal New Purchase */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">Passer une Commande Fournisseur</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Fournisseur</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-9 px-2.5 border rounded-lg bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Articles à commander</label>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-center bg-[#F5F6F8] p-2.5 rounded-lg border mb-2">
                    <span className="font-bold col-span-2">{it.brand} {it.dimension}</span>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item)))
                      }}
                      className="h-8 px-2 border rounded bg-white text-center font-bold"
                    />
                    <input
                      type="number"
                      value={it.unit_cost}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, unit_cost: val } : item)))
                      }}
                      className="h-8 px-2 border rounded bg-white text-right font-bold"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold mb-1">Acompte / Montant Réglé (DA)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2.5 border rounded-lg font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-[#667085]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] font-bold rounded-lg text-[#111827]"
                >
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

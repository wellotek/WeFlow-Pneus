import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Printer, FileText, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react'
import type { Quotation } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Quotations: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  // New Quote Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [validUntil, setValidUntil] = useState('2026-12-31')
  const [items, setItems] = useState([
    {
      reference: 'MIC-2055516-E',
      designation: 'Michelin Primacy 4 205/55 R16',
      quantity: 4,
      unit_price: 14500
    },
    {
      reference: 'MONT-EQUIL',
      designation: 'Montage & Équilibrage 4 Pneus',
      quantity: 4,
      unit_price: 350
    }
  ])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const list = await window.pneusApi.quotations.list()
      setQuotes(list)
    } catch (err) {
      console.error('Failed to load quotations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuotes()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const today = new Date().toISOString().split('T')[0]
      await window.pneusApi.quotations.create({
        customer_name: customerName,
        customer_phone: customerPhone,
        vehicle_info: vehicleInfo,
        date: today,
        valid_until: validUntil,
        items: items.map((it) => ({
          item_type: it.reference.startsWith('MONT') ? 'service' : 'product',
          reference: it.reference,
          designation: it.designation,
          quantity: it.quantity,
          unit_price: it.unit_price
        }))
      })
      setIsModalOpen(false)
      loadQuotes()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleConvert = async (id: string, quoteNum: string) => {
    if (confirm(`Convertir le devis ${quoteNum} en vente réelle et déduire le stock ?`)) {
      try {
        const sale = await window.pneusApi.quotations.convertToSale(id)
        alert(`Devis converti avec succès en Facture ${sale.invoice_number} !`)
        loadQuotes()
      } catch (err: any) {
        alert(`Erreur : ${err.message}`)
      }
    }
  }

  const handlePrint = async (id: string) => {
    try {
      await window.pneusApi.documents.printQuotation(id)
    } catch (err: any) {
      alert(`Erreur d'impression : ${err.message}`)
    }
  }

  const handleExportPdf = async (id: string) => {
    try {
      const res = await window.pneusApi.documents.exportPdfQuotation(id)
      if (!res.cancelled && res.path) {
        alert(`Devis exporté :\n${res.path}`)
      }
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Confirmer la suppression de ce devis ?')) {
      await window.pneusApi.quotations.delete(id)
      loadQuotes()
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.quotations')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Établissement des devis clients, proformas et conversion instantanée en facture
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Créer un Devis</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
              <th className="py-3 px-4">N° Devis</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Véhicule</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Valide jusqu'au</th>
              <th className="py-3 px-4 text-right">Montant TTC</th>
              <th className="py-3 px-4 text-center">Statut</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {quotes.map((q) => (
              <tr key={q.id} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-[#111827]">{q.quote_number}</td>
                <td className="py-3.5 px-4 font-semibold text-[#111827]">{q.customer_name || 'Client'}</td>
                <td className="py-3.5 px-4 text-[#667085]">{q.vehicle_info || '-'}</td>
                <td className="py-3.5 px-4 text-[#667085]">{formatDateStr(q.date, i18n.language)}</td>
                <td className="py-3.5 px-4 text-[#667085]">{formatDateStr(q.valid_until, i18n.language)}</td>
                <td className="py-3.5 px-4 text-right font-extrabold text-[#111827]">
                  {formatCurrencyDA(q.total_amount, i18n.language)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      q.status === 'converted'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {q.status === 'converted' ? 'Converti en Vente' : 'Brouillon'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {q.status !== 'converted' && (
                      <button
                        onClick={() => handleConvert(q.id, q.quote_number)}
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition-all"
                        title="Convertir en vente"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>Vente</span>
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(q.id)}
                      className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-md"
                      title="Imprimer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleExportPdf(q.id)}
                      className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-md"
                      title="PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    {q.status !== 'converted' && (
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 hover:bg-red-50 text-[#667085] hover:text-red-600 rounded-md"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal New Quote */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4">
            <h3 className="font-bold text-sm text-[#111827]">Créer un Nouveau Devis Client</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nom du Client</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Véhicule</label>
                  <input
                    type="text"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    placeholder="ex: Peugeot 208"
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Valide jusqu'au</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
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
                  Créer le devis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

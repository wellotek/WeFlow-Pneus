import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Truck, Phone, MapPin, Edit2, Trash2 } from 'lucide-react'
import type { Supplier } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const Suppliers: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
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

  const loadSuppliers = async () => {
    try {
      const list = await window.pneusApi.suppliers.list(search)
      setSuppliers(list)
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [search])

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSupplier) {
        await window.pneusApi.suppliers.update(editingSupplier.id, formData)
      } else {
        await window.pneusApi.suppliers.create(formData)
      }
      setIsModalOpen(false)
      loadSuppliers()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Confirmer la suppression du fournisseur ${name} ?`)) {
      try {
        await window.pneusApi.suppliers.delete(id)
        loadSuppliers()
      } catch (err: any) {
        alert(`Erreur : ${err.message}`)
      }
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.suppliers')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Répertoire des grossistes et importateurs de pneumatiques en Algérie
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nouveau Fournisseur</span>
        </button>
      </div>

      <div className="relative w-80">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-[#667085]" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone, contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none shadow-xs"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
              <th className="py-3 px-4">Fournisseur</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Téléphone</th>
              <th className="py-3 px-4">Wilaya & Adresse</th>
              <th className="py-3 px-4 text-right">Dette / Solde Restant</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#111827]">{s.name}</td>
                <td className="py-3.5 px-4 text-[#667085]">{s.contact_person || '-'}</td>
                <td className="py-3.5 px-4 font-mono text-[#111827]">{s.phone}</td>
                <td className="py-3.5 px-4 text-[#667085]">
                  {s.wilaya ? `${s.wilaya} - ${s.address || ''}` : '-'}
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-red-600">
                  {formatCurrencyDA(s.balance_due, i18n.language)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-md"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="p-1.5 hover:bg-red-50 text-[#667085] hover:text-red-600 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">
              {editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Raison Sociale</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full h-9 px-2.5 border rounded-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Contact Commercial</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Wilaya</label>
                  <input
                    type="text"
                    value={formData.wilaya}
                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Adresse</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

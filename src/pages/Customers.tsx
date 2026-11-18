import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Car, Phone, MapPin, Edit2, Trash2, X, PlusCircle } from 'lucide-react'
import type { Customer, CustomerVehicle } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const Customers: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])

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
    notes: ''
  })

  // Modal vehicle
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({
    brand: 'Renault',
    model: 'Symbol',
    year: '2021',
    license_plate: '',
    mileage: 85000,
    front_dimension: '185/65 R15',
    rear_dimension: '185/65 R15',
    notes: ''
  })

  const loadCustomers = async () => {
    try {
      const list = await window.pneusApi.customers.list(search)
      setCustomers(list)
      if (list.length > 0 && !selectedCustomer) {
        handleSelectCustomer(list[0])
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
    const vList = await window.pneusApi.customers.getVehicles(c.id)
    setVehicles(vList)
  }

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null)
    setCustomerForm({
      type: 'individual',
      name: '',
      phone: '',
      address: '',
      wilaya: 'Alger',
      email: '',
      notes: ''
    })
    setIsCustomerModalOpen(true)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCustomer) {
        await window.pneusApi.customers.update(editingCustomer.id, customerForm)
      } else {
        const created = await window.pneusApi.customers.create(customerForm)
        setSelectedCustomer(created)
      }
      setIsCustomerModalOpen(false)
      loadCustomers()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    try {
      await window.pneusApi.customers.createVehicle({
        customer_id: selectedCustomer.id,
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: vehicleForm.year,
        license_plate: vehicleForm.license_plate,
        mileage: vehicleForm.mileage,
        front_dimension: vehicleForm.front_dimension,
        rear_dimension: vehicleForm.rear_dimension,
        notes: vehicleForm.notes
      })
      setIsVehicleModalOpen(false)
      handleSelectCustomer(selectedCustomer)
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.customers')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Gestion du fichier clients, historique et dimensions des pneus par véhicule
          </p>
        </div>

        <button
          onClick={handleOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nouveau Client</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-[#667085]" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, wilaya..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none shadow-xs"
            />
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Wilaya</th>
                  <th className="py-3 px-4 text-center">Véhicules</th>
                  <th className="py-3 px-4 text-right">Solde Dû</th>
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
                        isSelected ? 'bg-[#F5BD18]/10' : 'hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[#111827]">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.type === 'business' && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">PRO</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#667085]">{c.phone}</td>
                      <td className="py-3 px-4 text-[#667085]">{c.wilaya || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[#111827]">
                          {c.vehicle_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#111827]">
                        {formatCurrencyDA(c.balance_due, i18n.language)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicles of Selected Customer (1 col) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="font-black text-sm text-[#111827]">{selectedCustomer?.name || 'Client'}</h3>
                <span className="text-xs text-[#667085]">{selectedCustomer?.phone}</span>
              </div>
              {selectedCustomer && (
                <button
                  onClick={() => setIsVehicleModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Véhicule</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                Véhicules enregistrés ({vehicles.length})
              </span>

              {vehicles.map((v) => (
                <div key={v.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#111827]">
                      {v.brand} {v.model} ({v.year || '-'})
                    </span>
                    <span className="font-mono font-black text-xs px-2 py-0.5 bg-[#172235] text-white rounded-md">
                      {v.license_plate}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#667085] pt-1 border-t border-[#E5E7EB]">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#111827]">Monte Avant:</span>
                      <strong>{v.front_dimension || 'Non spécifié'}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#111827]">Monte Arrière:</span>
                      <strong>{v.rear_dimension || 'Non spécifié'}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">Associer un Véhicule au Client</h3>
            <form onSubmit={handleSaveVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Marque</label>
                  <input
                    type="text"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Modèle</label>
                  <input
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Immatriculation</label>
                  <input
                    type="text"
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value.toUpperCase() })}
                    placeholder="ex: 12345 121 16"
                    required
                    className="w-full h-9 px-2.5 border rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Kilométrage</label>
                  <input
                    type="number"
                    value={vehicleForm.mileage}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Monte Avant</label>
                  <input
                    type="text"
                    value={vehicleForm.front_dimension}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, front_dimension: e.target.value })}
                    placeholder="ex: 185/65 R15"
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Monte Arrière</label>
                  <input
                    type="text"
                    value={vehicleForm.rear_dimension}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, rear_dimension: e.target.value })}
                    placeholder="ex: 185/65 R15"
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
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

      {/* Modal Add Customer */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">Ajouter un Nouveau Client</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nom / Raison Sociale</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  required
                  className="w-full h-9 px-2.5 border rounded-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Wilaya</label>
                  <input
                    type="text"
                    value={customerForm.wilaya}
                    onChange={(e) => setCustomerForm({ ...customerForm, wilaya: e.target.value })}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#667085] mb-1">Adresse</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full h-9 px-2.5 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
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

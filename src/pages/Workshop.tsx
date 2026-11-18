import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wrench, Plus, Edit2, Trash2, Printer, CheckCircle2, Clock } from 'lucide-react'
import type { Service, ServiceOrder } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Workshop: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [services, setServices] = useState<Service[]>([])
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('orders')

  // Service Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    category: 'montage' as any,
    default_price: 350,
    description: ''
  })

  // Order Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    vehicle_info: 'Renault Clio 4',
    license_plate: '12345 120 16',
    mileage: 65000,
    technician_name: 'Mourad (Chef d’Atelier)',
    service_id: '',
    unit_price: 350,
    quantity: 4
  })

  const loadData = async () => {
    try {
      const sList = await window.pneusApi.services.list()
      setServices(sList)
      if (sList.length > 0) {
        setOrderForm((prev) => ({
          ...prev,
          service_id: sList[0].id,
          unit_price: sList[0].default_price
        }))
      }
      const oList = await window.pneusApi.serviceOrders.list()
      setOrders(oList)
    } catch (err) {
      console.error('Failed to load workshop data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingService) {
        await window.pneusApi.services.update(editingService.id, serviceForm)
      } else {
        await window.pneusApi.services.create(serviceForm)
      }
      setIsServiceModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    const svc = services.find((s) => s.id === orderForm.service_id)
    if (!svc) return

    try {
      const today = new Date().toISOString().split('T')[0]
      await window.pneusApi.serviceOrders.create({
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        vehicle_info: orderForm.vehicle_info,
        license_plate: orderForm.license_plate,
        mileage: orderForm.mileage,
        date: today,
        technician_name: orderForm.technician_name,
        items: [
          {
            service_id: svc.id,
            service_name: svc.name,
            quantity: orderForm.quantity,
            unit_price: orderForm.unit_price
          }
        ]
      })
      setIsOrderModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(`Erreur ordre atelier : ${err.message}`)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await window.pneusApi.serviceOrders.updateStatus(id, newStatus)
      loadData()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handlePrintOrder = async (id: string) => {
    try {
      await window.pneusApi.documents.printServiceOrder(id)
    } catch (err: any) {
      alert(`Erreur d'impression : ${err.message}`)
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.workshop')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Prestations de montage, équilibrage, réparation, géométrie et suivi des interventions
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-[#E5E7EB] p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'orders' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085]'
            }`}
          >
            Ordres de Réparation ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'catalog' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085]'
            }`}
          >
            Grille Tarifaire Prestations ({services.length})
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouvel Ordre d'Intervention</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
                  <th className="py-3 px-4">N° Ordre</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Véhicule & Immat</th>
                  <th className="py-3 px-4">Technicien</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Prestation</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#111827]">{o.order_number}</td>
                    <td className="py-3 px-4 font-bold text-[#111827]">{o.customer_name || 'Client'}</td>
                    <td className="py-3 px-4 text-[#667085]">
                      {o.vehicle_info || ''} {o.license_plate ? `(${o.license_plate})` : ''}
                    </td>
                    <td className="py-3 px-4 text-[#667085]">{o.technician_name || '-'}</td>
                    <td className="py-3 px-4 text-[#667085]">{formatDateStr(o.date, i18n.language)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#111827]">
                      {formatCurrencyDA(o.total_amount, i18n.language)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#F5F6F8] border border-[#E5E7EB] cursor-pointer"
                      >
                        <option value="pending">En attente</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminée</option>
                        <option value="cancelled">Annulée</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handlePrintOrder(o.id)}
                        className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-md"
                        title="Imprimer Fiche Atelier"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingService(null)
                setServiceForm({
                  code: '',
                  name: '',
                  category: 'montage',
                  default_price: 350,
                  description: ''
                })
                setIsServiceModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouveau Tarif Service</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Prestation</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Tarif par Défaut</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#111827]">{s.code}</td>
                    <td className="py-3 px-4 font-bold text-[#111827]">{s.name}</td>
                    <td className="py-3 px-4 uppercase text-[10px] text-[#667085] font-semibold">{s.category}</td>
                    <td className="py-3 px-4 text-[#667085]">{s.description || '-'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#111827]">
                      {formatCurrencyDA(s.default_price, i18n.language)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingService(s)
                          setServiceForm({
                            code: s.code,
                            name: s.name,
                            category: s.category,
                            default_price: s.default_price,
                            description: s.description || ''
                          })
                          setIsServiceModalOpen(true)
                        }}
                        className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] rounded-md"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Service Form */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">
              {editingService ? 'Modifier la Prestation' : 'Nouvelle Prestation Atelier'}
            </h3>
            <form onSubmit={handleSaveService} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Code</label>
                  <input
                    type="text"
                    value={serviceForm.code}
                    onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value.toUpperCase() })}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Catégorie</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value as any })}
                    className="w-full h-9 px-2.5 border rounded-lg bg-white"
                  >
                    <option value="montage">Montage</option>
                    <option value="equilibrage">Équilibrage</option>
                    <option value="reparation">Réparation</option>
                    <option value="geometrie">Géométrie</option>
                    <option value="permutation">Permutation</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Intitulé de la Prestation</label>
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  required
                  className="w-full h-9 px-2.5 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Tarif par Défaut (DA)</label>
                <input
                  type="number"
                  value={serviceForm.default_price}
                  onChange={(e) => setServiceForm({ ...serviceForm, default_price: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full h-9 px-2.5 border rounded-lg font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
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

      {/* Modal Order Form */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#111827]">Créer un Ordre d'Intervention Atelier</h3>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Client</label>
                  <input
                    type="text"
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={orderForm.customer_phone}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Véhicule</label>
                  <input
                    type="text"
                    value={orderForm.vehicle_info}
                    onChange={(e) => setOrderForm({ ...orderForm, vehicle_info: e.target.value })}
                    className="w-full h-9 px-2.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Immatriculation</label>
                  <input
                    type="text"
                    value={orderForm.license_plate}
                    onChange={(e) => setOrderForm({ ...orderForm, license_plate: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-2.5 border rounded-lg font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Prestation principale</label>
                <select
                  value={orderForm.service_id}
                  onChange={(e) => {
                    const svc = services.find((s) => s.id === e.target.value)
                    setOrderForm({
                      ...orderForm,
                      service_id: e.target.value,
                      unit_price: svc ? svc.default_price : orderForm.unit_price
                    })
                  }}
                  className="w-full h-9 px-2.5 border rounded-lg bg-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.default_price} DA)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-[#667085]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] font-bold rounded-lg text-[#111827]"
                >
                  Générer l'ordre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

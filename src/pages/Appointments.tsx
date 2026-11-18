import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  User,
  X,
  AlertCircle
} from 'lucide-react'
import type { Appointment, AppointmentStatus } from '@shared/types'
import { isRtlLocale } from '@shared/locales'

export const Appointments: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    vehicle_info: '',
    service_requested: 'Montage + Équilibrage 4 Pneus',
    date: '2026-11-20',
    start_time: '09:00',
    end_time: '10:00',
    status: 'scheduled' as AppointmentStatus,
    notes: '',
    technician_name: 'Atelier Principal'
  })

  const loadAppointments = async () => {
    try {
      const list = await window.pneusApi.appointments.list()
      setAppointments(list)
    } catch (err) {
      console.error('Failed to load appointments:', err)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.pneusApi.appointments.create(formData)
      setIsModalOpen(false)
      loadAppointments()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  // Days for the week view matching screenshot (18 to 23 Nov)
  const weekDays = [
    { label: 'Lundi 18', date: '2026-11-18' },
    { label: 'Mardi 19', date: '2026-11-19' },
    { label: 'Mercredi 20', date: '2026-11-20' },
    { label: 'Jeudi 21', date: '2026-11-21' },
    { label: 'Vendredi 22', date: '2026-11-22' },
    { label: 'Samedi 23', date: '2026-11-23' }
  ]

  const timeSlots = [
    '08:00',
    '09:00',
    '10:00',
    '11:30',
    '12:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00'
  ]

  // Demo cards matching the screenshot if db is fresh
  const sampleEvents: Appointment[] = [
    {
      id: 'e1',
      customer_name: 'Robert Dubois',
      phone: '0550112233',
      vehicle_info: 'Peugeot 3008',
      service_requested: 'Montage + Équilibrage 4 Pneus',
      date: '2026-11-18',
      start_time: '09:00',
      end_time: '10:15',
      status: 'confirmed',
      created_at: ''
    },
    {
      id: 'e2',
      customer_name: 'Sophie Laurent',
      phone: '0550998877',
      vehicle_info: 'Renault Clio',
      service_requested: 'Changement 2 Pneus Avant',
      date: '2026-11-18',
      start_time: '11:30',
      end_time: '12:30',
      status: 'in_progress',
      created_at: ''
    },
    {
      id: 'e3',
      customer_name: 'Jean-Pierre Martin',
      phone: '0560123456',
      vehicle_info: 'Volkswagen Golf',
      service_requested: 'Parallélisme & Géométrie',
      date: '2026-11-19',
      start_time: '10:00',
      end_time: '11:00',
      status: 'scheduled',
      created_at: ''
    },
    {
      id: 'e4',
      customer_name: 'SARL Dupuy',
      phone: '021887766',
      vehicle_info: 'Citroën Berlingo',
      service_requested: 'Réparation Crevaison + Pneus',
      date: '2026-11-20',
      start_time: '14:00',
      end_time: '15:30',
      status: 'confirmed',
      created_at: ''
    },
    {
      id: 'e5',
      customer_name: 'Marc Antoine',
      phone: '0555332211',
      vehicle_info: 'Audi A4',
      service_requested: '4 Pneus Hiver + Stockage',
      date: '2026-11-21',
      start_time: '08:30',
      end_time: '10:00',
      status: 'confirmed',
      created_at: ''
    },
    {
      id: 'e6',
      customer_name: 'Julie Mercier',
      phone: '0551223344',
      vehicle_info: 'Toyota Yaris',
      service_requested: 'Montage + Équilibrage',
      date: '2026-11-22',
      start_time: '15:00',
      end_time: '16:30',
      status: 'in_progress',
      created_at: ''
    }
  ]

  const allEvents = appointments.length > 0 ? appointments : sampleEvents

  const getStatusBadge = (status: AppointmentStatus) => {
    if (status === 'confirmed') return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Confirmé' }
    if (status === 'in_progress') return { bg: 'bg-amber-100 text-amber-900 border-amber-300', label: 'En cours' }
    if (status === 'completed') return { bg: 'bg-slate-100 text-slate-800 border-slate-300', label: 'Terminé' }
    return { bg: 'bg-sky-100 text-sky-800 border-sky-300', label: 'Planifié' }
  }

  const getCardStyle = (status: AppointmentStatus) => {
    if (status === 'confirmed') return 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
    if (status === 'in_progress') return 'bg-amber-50/90 border-amber-300 text-amber-950'
    return 'bg-sky-50/90 border-sky-300 text-sky-950'
  }

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Top Bar Controls matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('nav.appointments')}
          </h1>

          {/* View toggle (Jour, Semaine, Mois) matching screenshot */}
          <div className="flex items-center bg-[#E5E7EB] p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 rounded-lg transition-all ${
                view === 'day' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 rounded-lg transition-all ${
                view === 'week' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                view === 'month' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Mois
            </button>
          </div>
        </div>

        {/* Search, Navigation & Action Button matching screenshot */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 text-[#667085]" />
            <input
              type="text"
              placeholder="Rechercher un client, immatriculation, rdv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none shadow-xs"
            />
          </div>

          {/* Date arrows */}
          <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg shadow-xs">
            <button className="p-2 hover:bg-[#F5F6F8] text-[#667085]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-[#F5F6F8] text-[#667085]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button className="px-3 py-2 bg-white border border-[#E5E7EB] text-xs font-semibold text-[#111827] rounded-lg shadow-xs hover:bg-[#F5F6F8]">
            Aujourd'hui
          </button>

          <span className="text-xs font-bold text-[#111827] px-2">
            Semaine du 18 au 23 Novembre 2024
          </span>

          {/* Golden Yellow Button matching screenshot */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs font-extrabold rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouveau Rendez-vous</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid matching screenshot */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F5F6F8] text-center text-xs font-bold text-[#111827]">
          <div className="p-3 border-r border-[#E5E7EB] text-[#667085] w-20">Heure</div>
          {weekDays.map((d, i) => (
            <div key={i} className="p-3 border-r border-[#E5E7EB] last:border-r-0">
              {d.label}
            </div>
          ))}
        </div>

        {/* Time Grid with Appointment Cards matching screenshot */}
        <div className="divide-y divide-[#E5E7EB] relative">
          {/* Current time red indicator line */}
          <div
            className="absolute left-20 right-0 border-t-2 border-red-400 z-20 pointer-events-none flex items-center"
            style={{ top: '110px' }}
          >
            <span className="bg-red-500 text-white text-[9px] px-1 py-0.2 rounded font-mono ml-2">
              current time
            </span>
          </div>

          {timeSlots.map((time, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7 min-h-[58px]">
              {/* Hour Column */}
              <div className="p-2 border-r border-[#E5E7EB] text-[11px] font-mono text-[#667085] w-20 flex items-start justify-center">
                {time}
              </div>

              {/* 6 Day Columns */}
              {weekDays.map((day, colIdx) => {
                const dayEvents = allEvents.filter(
                  (e) => e.date === day.date && e.start_time.startsWith(time.split(':')[0])
                )

                return (
                  <div
                    key={colIdx}
                    className="p-1 border-r border-[#E5E7EB] last:border-r-0 relative hover:bg-slate-50/50 transition-colors"
                  >
                    {dayEvents.map((ev, evIdx) => {
                      const badge = getStatusBadge(ev.status)
                      const cardStyle = getCardStyle(ev.status)

                      return (
                        <div
                          key={evIdx}
                          className={`p-2.5 rounded-xl border shadow-sm text-xs space-y-1 mb-1 transition-transform hover:scale-[1.02] cursor-pointer ${cardStyle}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[10px]">
                              {ev.start_time} - {ev.end_time}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="font-extrabold text-[12px] truncate">{ev.customer_name}</div>
                          {ev.vehicle_info && (
                            <div className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                              <Car className="w-3 h-3 shrink-0" />
                              <span>{ev.vehicle_info}</span>
                            </div>
                          )}
                          <div className="text-[10px] font-semibold text-slate-700 truncate">
                            {ev.service_requested}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: New Appointment */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-sm">Planifier un Rendez-vous Atelier</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Nom du Client</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#667085] mb-1">Véhicule & Immatriculation</label>
                <input
                  type="text"
                  value={formData.vehicle_info}
                  onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                  placeholder="ex: Peugeot 3008 (12345 120 16)"
                  className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111827] mb-1">Prestation Demandée</label>
                <input
                  type="text"
                  value={formData.service_requested}
                  onChange={(e) => setFormData({ ...formData, service_requested: e.target.value })}
                  required
                  className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Heure Début</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Heure Fin</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-[#667085] font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] font-bold rounded-lg shadow-xs"
                >
                  Confirmer le rendez-vous
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

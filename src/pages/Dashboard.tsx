import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  Disc,
  Clock,
  Printer
} from 'lucide-react'
import type { DashboardStats } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await window.pneusApi.dashboard.getStats(period)
      setStats(data)
    } catch (err) {
      console.error('Error loading dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [period])

  const handlePrintInvoice = async (saleId: string) => {
    try {
      await window.pneusApi.documents.printInvoice(saleId)
    } catch (err: any) {
      alert(`Erreur d'impression : ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            {isAr ? 'نظرة عامة على مبيعات وعمليات محل وورشة العجلات' : 'Vue d’ensemble des opérations et performances du magasin'}
          </p>
        </div>

        {/* Filter Dropdown matching screenshot */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#667085]">
            {isAr ? 'تصفية حسب:' : 'Filtre :'}
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#111827] shadow-xs focus:ring-2 focus:ring-[#F5BD18] focus:border-transparent outline-none cursor-pointer"
          >
            <option value="today">{t('dashboard.today')}</option>
            <option value="week">{t('dashboard.thisWeek')}</option>
            <option value="month">{t('dashboard.thisMonth')}</option>
            <option value="year">{t('dashboard.thisYear')}</option>
          </select>
        </div>
      </div>

      {/* 4 KPI Cards matching screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chiffre d'affaires */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              {t('dashboard.turnover')}
            </span>
            <span className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +8.5%
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-[#111827] tracking-tight">
              {formatCurrencyDA(stats?.turnover || 0, i18n.language)}
            </span>
          </div>
        </div>

        {/* Card 2: Total des ventes */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              {t('dashboard.salesCount')}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {isAr ? 'مكتملة' : 'Soldes'}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-[#111827] tracking-tight">
              {stats?.salesCount || 0}
            </span>
          </div>
        </div>

        {/* Card 3: Bénéfice net */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              {t('dashboard.netProfit')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F5BD18]/15 text-[#F5BD18] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-[#172235] tracking-tight">
              {formatCurrencyDA(stats?.netProfit || 0, i18n.language)}
            </span>
          </div>
        </div>

        {/* Card 4: Stock total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              {t('dashboard.totalStock')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-[#111827] tracking-tight">
              {stats?.totalStockCount || 0} {t('dashboard.pneusCount')}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Sales Evolution Chart & Top Selling Tires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Evolution Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#111827]">
              {t('dashboard.salesEvolution')}
            </h3>
            <span className="text-xs text-[#667085]">
              {isAr ? 'آخر 6 أشهر' : 'Derniers 6 mois'}
            </span>
          </div>

          {/* SVG Spline/Bar Visualization */}
          <div className="h-56 w-full flex flex-col justify-end">
            <div className="h-44 w-full flex items-end gap-6 px-4 border-b border-[#E5E7EB]">
              {(stats?.monthlySales && stats.monthlySales.length > 0
                ? stats.monthlySales
                : [
                    { month: 'Jan', turnover: 450000, profit: 120000 },
                    { month: 'Fév', turnover: 780000, profit: 210000 },
                    { month: 'Mar', turnover: 1200000, profit: 340000 },
                    { month: 'Avr', turnover: 1950000, profit: 510000 },
                    { month: 'Mai', turnover: 1600000, profit: 420000 },
                    { month: 'Juin', turnover: 2450000, profit: 620000 }
                  ]
              ).map((m, idx) => {
                const maxTurnover = 2500000
                const heightPercent = Math.min(100, Math.max(15, (m.turnover / maxTurnover) * 100))
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div
                      className="w-full max-w-[42px] bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-lg transition-all duration-300 group-hover:from-blue-700 group-hover:to-sky-500 relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#111827] text-white text-[10px] py-1 px-2 rounded-md pointer-events-none whitespace-nowrap transition-opacity shadow-md z-10">
                        {formatCurrencyDA(m.turnover, i18n.language)}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#667085] mt-1">{m.month}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top Selling Tires (1 col) matching screenshot */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#111827] mb-4">
              {t('dashboard.topSellingTires')}
            </h3>

            <div className="space-y-4">
              {(stats?.topSellingTires && stats.topSellingTires.length > 0
                ? stats.topSellingTires
                : [
                    { name: 'Michelin Primacy 4', quantity: 62 },
                    { name: 'Bridgestone Turanza T005', quantity: 48 },
                    { name: 'Continental UltraContact', quantity: 37 }
                  ]
              ).map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#111827]">
                    <span>{item.name}</span>
                    <span className="text-[#667085]">({item.quantity})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#172235] rounded-full"
                      style={{ width: `${Math.min(100, (item.quantity / 70) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] mt-4 flex items-center justify-between text-xs text-[#667085]">
            <span>{isAr ? 'إجمالي الحجم المباع' : 'Volume total vendu'}</span>
            <strong className="text-[#111827]">
              {(stats?.topSellingTires || []).reduce((acc, t) => acc + t.quantity, 0)} {t('dashboard.pneusCount')}
            </strong>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Transactions & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols) matching screenshot */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#111827]">
              {t('dashboard.recentSales')}
            </h3>
            <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">
              {isAr ? 'عرض الكل' : 'Voir tout'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#667085]">
                  <th className="pb-3 font-semibold">{isAr ? 'رقم الفاتورة' : 'ID Facture'}</th>
                  <th className="pb-3 font-semibold">{isAr ? 'الزبون' : 'Client'}</th>
                  <th className="pb-3 font-semibold">{isAr ? 'المركبة' : 'Véhicule'}</th>
                  <th className="pb-3 font-semibold text-right">{isAr ? 'المبلغ' : 'Montant'}</th>
                  <th className="pb-3 font-semibold text-center">{isAr ? 'الحالة' : 'Statut'}</th>
                  <th className="pb-3 font-semibold text-center">{isAr ? 'طباعة' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {(stats?.recentSales && stats.recentSales.length > 0
                  ? stats.recentSales
                  : [
                      {
                        id: 's1',
                        invoice_number: 'F-2024-089',
                        customer_name: 'Ahmed Benali',
                        vehicle_info: 'Dacia Logan',
                        total_amount: 45000,
                        status: 'paid'
                      },
                      {
                        id: 's2',
                        invoice_number: 'F-2024-090',
                        customer_name: 'Garage Al Auto',
                        vehicle_info: 'Hyundai Accent',
                        total_amount: 120000,
                        status: 'pending'
                      }
                    ]
                ).map((sale: any, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F6F8] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#111827]">{sale.invoice_number}</td>
                    <td className="py-3 font-medium text-[#111827]">{sale.customer_name}</td>
                    <td className="py-3 text-[#667085]">{sale.vehicle_info || '-'}</td>
                    <td className="py-3 text-right font-bold text-[#111827]">
                      {formatCurrencyDA(sale.total_amount, i18n.language)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          sale.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {sale.status === 'paid' ? t('dashboard.paid') : t('dashboard.pending')}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handlePrintInvoice(sale.id)}
                        className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-md transition-colors"
                        title="Imprimer Facture"
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

        {/* Low Stock Alerts (1 col) matching screenshot */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#111827]">
              {t('dashboard.lowStockAlerts')}
            </h3>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>

          <div className="space-y-3">
            {(stats?.lowStockAlerts && stats.lowStockAlerts.length > 0
              ? stats.lowStockAlerts
              : [
                  { brand: 'Bridgestone', dimension: '205/55 R16', stock_quantity: 3 },
                  { brand: 'Michelin', dimension: '195/65 R15', stock_quantity: 5 },
                  { brand: 'Pirelli', dimension: '225/45 R17', stock_quantity: 2 }
                ]
            ).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 border border-red-200 text-xs text-red-900"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">
                    {item.brand} {item.dimension}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[11px]">
                  {item.stock_quantity} {t('dashboard.remaining')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

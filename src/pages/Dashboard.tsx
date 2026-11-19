import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  Disc,
  Clock,
  Printer,
  ChevronRight,
  CheckCircle2,
  Plus
} from 'lucide-react'
import type { DashboardStats } from '@shared/types'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '@shared/locales'

export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)
  const navigate = useNavigate()

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

        {/* Filter Dropdown + Quick Sale Button */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'بيع سريع / POS' : 'Nouvelle Vente (POS)'}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chiffre d'affaires */}
        <div
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md hover:border-[#F5BD18] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider group-hover:text-[#172235]">
              {t('dashboard.turnover')}
            </span>
            <span className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +8.5%
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#111827] tracking-tight group-hover:text-[#172235]">
              {formatCurrencyDA(stats?.turnover || 0, i18n.language)}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#F5BD18] transition-colors" />
          </div>
        </div>

        {/* Card 2: Total des ventes */}
        <div
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md hover:border-[#F5BD18] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider group-hover:text-[#172235]">
              {t('dashboard.salesCount')}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {isAr ? 'فواتير مسجلة' : 'Factures'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#111827] tracking-tight group-hover:text-[#172235]">
              {stats?.salesCount || 0}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#F5BD18] transition-colors" />
          </div>
        </div>

        {/* Card 3: Bénéfice net */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md hover:border-[#F5BD18] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider group-hover:text-[#172235]">
              {t('dashboard.netProfit')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F5BD18]/15 text-[#F5BD18] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#172235] tracking-tight">
              {formatCurrencyDA(stats?.netProfit || 0, i18n.language)}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#F5BD18] transition-colors" />
          </div>
        </div>

        {/* Card 4: Stock total */}
        <div
          onClick={() => navigate('/stock')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:shadow-md hover:border-[#F5BD18] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider group-hover:text-[#172235]">
              {t('dashboard.totalStock')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#111827] tracking-tight group-hover:text-[#172235]">
              {stats?.totalStockCount || 0} {t('dashboard.pneusCount')}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#F5BD18] transition-colors" />
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

        {/* Top Selling Tires (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#111827]">
                {t('dashboard.topSellingTires')}
              </h3>
              <button
                onClick={() => navigate('/tires')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {isAr ? 'عرض الإطارات' : 'Catalogue'}
              </button>
            </div>

            <div className="space-y-4">
              {(stats?.topSellingTires && stats.topSellingTires.length > 0 ? (
                stats.topSellingTires.map((item, idx) => (
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
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[#667085]">
                  {isAr ? 'لا توجد بيانات مبيعات كافية بعد' : 'Aucune donnée de vente pour le moment.'}
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
        {/* Recent Transactions (2 cols) - WITH FUNCTIONAL "VOIR TOUT" BUTTON */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#111827]">
              {t('dashboard.recentSales')}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{isAr ? 'عرض الكل' : 'Voir tout'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
                {stats?.recentSales && stats.recentSales.length > 0 ? (
                  stats.recentSales.map((sale: any, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F6F8] transition-colors">
                      <td className="py-3 font-mono font-bold text-[#111827]">{sale.invoice_number}</td>
                      <td className="py-3 font-medium text-[#111827]">{sale.customer_name || (isAr ? 'زبون عابر' : 'Comptoir')}</td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#667085]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <p>{isAr ? 'لا توجد مبيعات مسجلة في هذه الفترة' : 'Aucune vente enregistrée pour cette période.'}</p>
                        <button
                          onClick={() => navigate('/pos')}
                          className="mt-1 text-xs font-bold text-[#172235] hover:text-[#F5BD18] underline"
                        >
                          {isAr ? '+ تسجيل أول عملية بيع' : '+ Enregistrer la première vente'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts (1 col) - WITH FUNCTIONAL LINK TO /stock */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#111827]">
                {t('dashboard.lowStockAlerts')}
              </h3>
              <button
                type="button"
                onClick={() => navigate('/stock')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
              >
                <span>{isAr ? 'المخزون' : 'Gérer stock'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {stats?.lowStockAlerts && stats.lowStockAlerts.length > 0 ? (
                stats.lowStockAlerts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/stock')}
                    className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 border border-red-200 text-xs text-red-900 cursor-pointer hover:bg-red-100/70 transition-colors"
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
                ))
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'جميع مستويات المخزون ممتازة' : 'Tous les stocks sont au niveau optimal.'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] mt-4 flex items-center justify-between text-xs text-[#667085]">
            <span>{isAr ? 'تنبيهات حرجة' : 'Articles en alerte'}</span>
            <strong className="text-red-600 font-bold">
              {stats?.lowStockAlerts?.length || 0}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

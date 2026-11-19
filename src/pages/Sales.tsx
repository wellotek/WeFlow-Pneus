import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Printer,
  FileText,
  RotateCcw,
  Archive,
  Download,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  CreditCard,
  Calendar,
  Filter
} from 'lucide-react'
import type { Sale, PaymentMethod, SaleStatus } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const Sales: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)
  const navigate = useNavigate()

  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Selected Sale for Detail Modal
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  // Cancel Modal State
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Notification message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadSales = async () => {
    try {
      setLoading(true)
      const list = await window.pneusApi.sales.list()
      setSales(list)
    } catch (err: any) {
      console.error('Failed to load sales:', err)
      setNotification({ type: 'error', message: err?.message || 'Erreur lors du chargement des ventes' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Archive filter: hide archived by default
      if (s.is_archived) return false

      // Text search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchesInv = s.invoice_number?.toLowerCase().includes(q)
        const matchesCust = s.customer_name?.toLowerCase().includes(q)
        const matchesPhone = s.customer_phone?.toLowerCase().includes(q)
        const matchesVeh = s.vehicle_info?.toLowerCase().includes(q)
        if (!matchesInv && !matchesCust && !matchesPhone && !matchesVeh) return false
      }

      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false
      }

      // Payment filter
      if (paymentFilter !== 'all' && s.payment_method !== paymentFilter) {
        return false
      }

      // Date range filter
      if (dateRange !== 'all') {
        const saleDate = new Date(s.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (dateRange === 'today') {
          const saleDay = new Date(s.date)
          saleDay.setHours(0, 0, 0, 0)
          if (saleDay.getTime() !== today.getTime()) return false
        } else if (dateRange === 'week') {
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          if (saleDate < weekAgo) return false
        } else if (dateRange === 'month') {
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          if (saleDate < monthAgo) return false
        }
      }

      return true
    })
  }, [sales, searchTerm, statusFilter, paymentFilter, dateRange])

  // KPI Calculations
  const stats = useMemo(() => {
    let totalCA = 0
    let totalEncashed = 0
    let totalDue = 0
    let validCount = 0

    for (const s of filteredSales) {
      if (s.status !== 'cancelled') {
        totalCA += s.total_amount
        totalEncashed += s.paid_amount
        totalDue += s.balance_due
        validCount++
      }
    }

    return { totalCA, totalEncashed, totalDue, validCount }
  }, [filteredSales])

  // Handle Cancel & Refund
  const handleConfirmCancel = async () => {
    if (!saleToCancel) return
    setIsCancelling(true)
    try {
      await window.pneusApi.sales.cancel(saleToCancel.id, cancelReason)
      setNotification({
        type: 'success',
        message: isAr
          ? `تم إلغاء الفاتورة ${saleToCancel.invoice_number} وإعادة المنتجات إلى المخزون`
          : `Vente ${saleToCancel.invoice_number} annulée et stock réintégré avec succès.`
      })
      setSaleToCancel(null)
      setCancelReason('')
      loadSales()
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || "Erreur lors de l'annulation" })
    } finally {
      setIsCancelling(false)
    }
  }

  // Handle Archive
  const handleArchive = async (sale: Sale) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من أرشفة هذه الفاتورة؟' : `Archiver la vente ${sale.invoice_number} ?`)) {
      return
    }
    try {
      await window.pneusApi.sales.archive(sale.id)
      setNotification({
        type: 'success',
        message: isAr ? 'تمت أرشفة الفاتورة' : 'Vente archivée avec succès.'
      })
      loadSales()
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || "Erreur lors de l'archivage" })
    }
  }

  // Handle Export CSV
  const handleExportCsv = async () => {
    const headers = [
      'N° Facture',
      'Date',
      'Client',
      'Téléphone',
      'Véhicule',
      'Total TTC (DA)',
      'Payé (DA)',
      'Reste (DA)',
      'Mode de paiement',
      'Statut'
    ]
    const rows = filteredSales.map((s) => [
      s.invoice_number,
      s.date,
      s.customer_name || 'Comptoir',
      s.customer_phone || '',
      s.vehicle_info || '',
      s.total_amount,
      s.paid_amount,
      s.balance_due,
      s.payment_method,
      s.status
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Ventes_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    )
    if (!res.cancelled && res.path) {
      setNotification({
        type: 'success',
        message: isAr ? 'تم تصدير ملف CSV بنجاح' : `Export CSV réussi : ${res.path}`
      })
    }
  }

  // Handle Export PDF
  const handleExportPdf = async () => {
    const columns = [
      { header: 'N° Facture', dataKey: 'invoice_number' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Client', dataKey: 'customer_name' },
      { header: 'Véhicule', dataKey: 'vehicle_info' },
      { header: 'Total (DA)', dataKey: 'total_formatted' },
      { header: 'Payé (DA)', dataKey: 'paid_formatted' },
      { header: 'Statut', dataKey: 'status_label' }
    ]

    const rows = filteredSales.map((s) => ({
      invoice_number: s.invoice_number,
      date: s.date,
      customer_name: s.customer_name || 'Comptoir',
      vehicle_info: s.vehicle_info || '-',
      total_formatted: formatCurrencyDA(s.total_amount),
      paid_formatted: formatCurrencyDA(s.paid_amount),
      status_label: s.status.toUpperCase()
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'قائمة المبيعات والفواتير' : 'Historique des Ventes & Facturation',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({
        type: 'success',
        message: isAr ? 'تم تصدير ملف PDF بنجاح' : `Export PDF réussi : ${res.path}`
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
            {isAr ? 'سجل المبيعات والفواتير' : 'Ventes & Facturation'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'متابعة الفواتير الصادرة، المدفوعات، وإعادة الطباعة'
              : 'Consultation des transactions, réimpressions et gestion des retours'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Exporter en fichier Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#172235] text-xs font-bold rounded-xl shadow-xs transition-all"
            title="Exporter la liste en PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'فاتورة جديدة / نقطة البيع' : 'NOUVELLE VENTE / POS'}</span>
          </button>
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
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase block">
            {isAr ? 'رقم الأعمال (TTC)' : "Chiffre d'affaires"}
          </span>
          <span className="text-lg lg:text-xl font-black text-[#172235]">
            {formatCurrencyDA(stats.totalCA)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase block">
            {isAr ? 'المبلغ المحصل' : 'Total Encaissé'}
          </span>
          <span className="text-lg lg:text-xl font-black text-emerald-700">
            {formatCurrencyDA(stats.totalEncashed)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase block">
            {isAr ? 'الديون المتبقية' : 'Crédits en cours'}
          </span>
          <span className="text-lg lg:text-xl font-black text-amber-600">
            {formatCurrencyDA(stats.totalDue)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase block">
            {isAr ? 'عدد الفواتير' : 'Nombre de Ventes'}
          </span>
          <span className="text-lg lg:text-xl font-black text-[#172235]">
            {stats.validCount}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 mb-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالرقم، الزبون، الهاتف أو الترقيم...' : 'Recherche par N° facture, client, matricule...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18] ${
              isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
            }`}
          />
        </div>

        {/* Date Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] px-2.5 focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
        >
          <option value="all">{isAr ? 'كل الفترات' : 'Toutes les dates'}</option>
          <option value="today">{isAr ? 'اليوم' : "Aujourd'hui"}</option>
          <option value="week">{isAr ? 'آخر 7 أيام' : 'Cette semaine'}</option>
          <option value="month">{isAr ? 'هذا الشهر' : 'Ce mois'}</option>
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] px-2.5 focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
        >
          <option value="all">{isAr ? 'كل طرق الدفع' : 'Tous paiements'}</option>
          <option value="cash">{isAr ? 'نقدا (Espèces)' : 'Espèces'}</option>
          <option value="card">{isAr ? 'بطاقة CIB' : 'Carte CIB'}</option>
          <option value="check">{isAr ? 'صك (Chèque)' : 'Chèque'}</option>
          <option value="transfer">{isAr ? 'تحويل (Virement)' : 'Virement'}</option>
          <option value="credit">{isAr ? 'بالأجل (À terme)' : 'À terme / Crédit'}</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] px-2.5 focus:outline-none focus:ring-1 focus:ring-[#F5BD18]"
        >
          <option value="all">{isAr ? 'كل الحالات' : 'Tous statuts'}</option>
          <option value="paid">{isAr ? 'مدفوع' : 'Payé'}</option>
          <option value="partial">{isAr ? 'جزئي' : 'Partiel'}</option>
          <option value="pending">{isAr ? 'في الانتظار' : 'En attente'}</option>
          <option value="cancelled">{isAr ? 'ملغى' : 'Annulé'}</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
              <tr>
                <th className="py-2.5 px-3">{isAr ? 'رقم الفاتورة' : 'N° Facture'}</th>
                <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الزبون' : 'Client'}</th>
                <th className="py-2.5 px-3">{isAr ? 'المركبة' : 'Véhicule'}</th>
                <th className="py-2.5 px-3 text-right">{isAr ? 'المجموع (TTC)' : 'Total TTC'}</th>
                <th className="py-2.5 px-3 text-right">{isAr ? 'المدفوع' : 'Payé'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'طريقة الدفع' : 'Paiement'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Statut'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#F5BD18] border-t-transparent rounded-full animate-spin" />
                      <span>{isAr ? 'جاري التحميل...' : 'Chargement des ventes...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    {isAr ? 'لا توجد فواتير مطابقة للبحث' : 'Aucune vente trouvée.'}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled'
                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCancelled ? 'bg-red-50/40 opacity-75' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-[#172235]">
                        {sale.invoice_number}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085] whitespace-nowrap">
                        {sale.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#172235]">
                          {sale.customer_name || (isAr ? 'زبون عابر' : 'Comptoir')}
                        </div>
                        {sale.customer_phone && (
                          <div className="text-[10px] text-[#667085]">{sale.customer_phone}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#667085]">
                        {sale.vehicle_info || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#172235]">
                        {formatCurrencyDA(sale.total_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatCurrencyDA(sale.paid_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center uppercase text-[10px] font-bold text-slate-600">
                        {sale.payment_method}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : sale.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {sale.status === 'paid'
                            ? (isAr ? 'مدفوع' : 'Payé')
                            : sale.status === 'partial'
                            ? (isAr ? 'جزئي' : 'Partiel')
                            : sale.status === 'cancelled'
                            ? (isAr ? 'ملغى' : 'Annulé')
                            : sale.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={async () => {
                              const full = await window.pneusApi.sales.get(sale.id)
                              setDetailSale(full)
                            }}
                            className="p-1 hover:bg-slate-100 text-[#172235] rounded"
                            title="Voir détail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Invoice A4 */}
                          <button
                            type="button"
                            onClick={() => window.pneusApi.documents.printInvoice(sale.id)}
                            className="p-1 hover:bg-slate-100 text-blue-600 rounded"
                            title="Imprimer Facture A4"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Ticket */}
                          <button
                            type="button"
                            onClick={() => window.pneusApi.documents.printTicket(sale.id)}
                            className="p-1 hover:bg-slate-100 text-[#172235] rounded"
                            title="Imprimer Ticket Caisse"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel / Refund */}
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => setSaleToCancel(sale)}
                              className="p-1 hover:bg-red-50 text-red-600 rounded"
                              title="Annuler / Rembourser la vente"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Archive */}
                          <button
                            type="button"
                            onClick={() => handleArchive(sale)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded"
                            title="Archiver"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Sale Detail View */}
      {detailSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#F5BD18]" />
                  <span>Détail Facture {detailSale.invoice_number}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {detailSale.date} • {detailSale.customer_name || 'Comptoir'}
                </span>
              </div>
              <button
                onClick={() => setDetailSale(null)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Header Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[#667085] block font-semibold">Client :</span>
                  <strong className="text-[#172235]">{detailSale.customer_name || 'Comptoir'}</strong>
                  {detailSale.customer_phone && <p className="text-slate-500">{detailSale.customer_phone}</p>}
                </div>
                <div>
                  <span className="text-[#667085] block font-semibold">Véhicule :</span>
                  <strong className="text-[#172235]">{detailSale.vehicle_info || '-'}</strong>
                  {detailSale.mileage && <p className="text-slate-500">{detailSale.mileage} km</p>}
                </div>
                <div>
                  <span className="text-[#667085] block font-semibold">Règlement :</span>
                  <strong className="text-[#172235] uppercase">{detailSale.payment_method}</strong>
                  <p className="text-slate-500">{detailSale.status.toUpperCase()}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Réf</th>
                      <th className="py-2 px-3">Désignation</th>
                      <th className="py-2 px-3 text-center">Qté</th>
                      <th className="py-2 px-3 text-right">Prix Unit.</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detailSale.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-600">{it.reference}</td>
                        <td className="py-2 px-3 font-bold text-[#172235]">{it.designation}</td>
                        <td className="py-2 px-3 text-center font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatCurrencyDA(it.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-black">{formatCurrencyDA(it.total_line)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total HT :</span>
                  <strong>{formatCurrencyDA(detailSale.subtotal)}</strong>
                </div>
                {detailSale.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>TVA ({detailSale.tax_rate}%) :</span>
                    <strong>{formatCurrencyDA(detailSale.tax_amount)}</strong>
                  </div>
                )}
                {detailSale.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise :</span>
                    <strong>-{formatCurrencyDA(detailSale.discount_amount)}</strong>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#172235] pt-2 border-t border-slate-200">
                  <span>TOTAL TTC :</span>
                  <span className="text-[#F5BD18] bg-[#172235] px-2.5 py-0.5 rounded">
                    {formatCurrencyDA(detailSale.total_amount)}
                  </span>
                </div>
              </div>

              {/* Print buttons inside detail */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => window.pneusApi.documents.printInvoice(detailSale.id)}
                  className="flex-1 py-2.5 bg-[#172235] hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-[#F5BD18]" />
                  <span>Imprimer Facture A4</span>
                </button>
                <button
                  onClick={() => window.pneusApi.documents.printTicket(detailSale.id)}
                  className="flex-1 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel & Refund Confirmation */}
      {saleToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-red-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {isAr ? 'إلغاء واسترجاع الفاتورة' : 'Annuler / Rembourser la vente'}
                </h3>
              </div>
              <button onClick={() => setSaleToCancel(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 font-semibold leading-relaxed">
                {isAr
                  ? `هل أنت متأكد من إلغاء الفاتورة رقم ${saleToCancel.invoice_number} بمبلغ ${formatCurrencyDA(saleToCancel.total_amount)}؟`
                  : `Attention : cette opération va annuler la facture ${saleToCancel.invoice_number} (${formatCurrencyDA(saleToCancel.total_amount)}) et remettre automatiquement tous les articles en stock.`}
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'سبب الإلغاء *' : "Motif de l'annulation *"}
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={isAr ? 'خطأ في المقاس، إرجاع الزبون، إلخ...' : 'Erreur dimension, retour client, etc...'}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg p-2 text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleToCancel(null)}
                  disabled={isCancelling}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  {isAr ? 'تراجع' : 'Non, conserver'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling || !cancelReason.trim()}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md"
                >
                  {isCancelling ? (isAr ? 'جاري الإلغاء...' : 'Annulation...') : (isAr ? 'تأكيد الإلغاء' : "Confirmer l'annulation")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

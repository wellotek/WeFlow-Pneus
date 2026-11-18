import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  Tag,
  Printer,
  X,
  Check,
  Disc
} from 'lucide-react'
import type { Product, TireFilter } from '@shared/types'
import { formatCurrencyDA, isRtlLocale } from '@shared/locales'

export const Tires: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TireFilter>({
    search: '',
    brand: 'all',
    dimension: 'all',
    tire_type: 'all',
    stock_status: 'all'
  })

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    reference: '',
    product_code: '',
    barcode: '',
    brand: 'Michelin',
    model_name: '',
    description: '',
    dimension: '205/55 R16',
    width: 205,
    height: 55,
    diameter: 'R16',
    load_index: '91',
    speed_rating: 'V',
    tire_type: 'summer' as any,
    condition: 'new' as any,
    vehicle_category: 'passenger' as any,
    buy_price: 11000,
    sell_price: 14500,
    wholesale_price: 13500,
    stock_quantity: 10,
    min_stock_alert: 4,
    location: 'Rayon A-01',
    dot: '2424'
  })

  const loadProducts = async () => {
    try {
      setLoading(true)
      const list = await window.pneusApi.products.list(filter)
      setProducts(list)
    } catch (err) {
      console.error('Failed to load tires:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleApplyFilter = () => {
    loadProducts()
  }

  const handleResetFilter = () => {
    setFilter({
      search: '',
      brand: 'all',
      dimension: 'all',
      tire_type: 'all',
      stock_status: 'all'
    })
    setTimeout(() => {
      window.pneusApi.products.list({}).then(setProducts)
    }, 50)
  }

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData({
      reference: `PNEU-${Math.floor(100000 + Math.random() * 900000)}`,
      product_code: '',
      barcode: '',
      brand: 'Michelin',
      model_name: 'Primacy 4',
      description: '',
      dimension: '205/55 R16',
      width: 205,
      height: 55,
      diameter: 'R16',
      load_index: '91',
      speed_rating: 'V',
      tire_type: 'summer',
      condition: 'new',
      vehicle_category: 'passenger',
      buy_price: 11200,
      sell_price: 14500,
      wholesale_price: 13500,
      stock_quantity: 12,
      min_stock_alert: 4,
      location: 'Rayon A-01',
      dot: '2024'
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id)
    setFormData({
      reference: p.reference,
      product_code: p.product_code || '',
      barcode: p.barcode || '',
      brand: p.brand,
      model_name: p.model_name,
      description: p.description || '',
      dimension: p.dimension,
      width: p.width,
      height: p.height,
      diameter: p.diameter,
      load_index: p.load_index,
      speed_rating: p.speed_rating,
      tire_type: p.tire_type,
      condition: p.condition,
      vehicle_category: p.vehicle_category,
      buy_price: p.buy_price,
      sell_price: p.sell_price,
      wholesale_price: p.wholesale_price,
      stock_quantity: p.stock_quantity,
      min_stock_alert: p.min_stock_alert,
      location: p.location || '',
      dot: p.dot || ''
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await window.pneusApi.products.update(editingId, formData)
      } else {
        await window.pneusApi.products.create(formData)
      }
      setIsModalOpen(false)
      loadProducts()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleDelete = async (id: string, ref: string) => {
    if (confirm(`Confirmer la suppression du pneu ${ref} ?`)) {
      try {
        await window.pneusApi.products.delete(id)
        loadProducts()
      } catch (err: any) {
        alert(`Erreur : ${err.message}`)
      }
    }
  }

  const handlePrintLabel = async (p: Product) => {
    try {
      await window.pneusApi.documents.printLabels([
        {
          productId: p.id,
          reference: p.reference,
          brand: p.brand,
          model_name: p.model_name,
          dimension: p.dimension,
          load_index: p.load_index,
          speed_rating: p.speed_rating,
          tire_type: p.tire_type,
          price: p.sell_price,
          barcode: p.barcode || p.reference,
          quantity: 1
        }
      ])
    } catch (err: any) {
      alert(`Erreur d'impression d'étiquette : ${err.message}`)
    }
  }

  return (
    <div className="space-y-5 select-none animate-fadeIn">
      {/* Top Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            {t('tires.title')}
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            {isAr ? 'كتالوج ومخزون الإطارات الهوائية وأسعار البيع والشراء' : 'Catalogue complet, caractéristiques techniques et stocks disponibles'}
          </p>
        </div>

        {/* Golden Yellow Action Button */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('tires.addTire')}</span>
        </button>
      </div>

      {/* Filter Bar matching screenshot */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-[#667085]" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالمرجع أو العلامة أو المقاس...' : 'Rechercher par réf, marque...'}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
            className="w-full h-9 pl-9 pr-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none"
          />
        </div>

        {/* Marque Dropdown */}
        <select
          value={filter.brand}
          onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
          className="h-9 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none cursor-pointer"
        >
          <option value="all">{isAr ? 'العلامة التجارية: الكل' : 'Marque: Toutes'}</option>
          <option value="Michelin">Michelin</option>
          <option value="Continental">Continental</option>
          <option value="Pirelli">Pirelli</option>
          <option value="Goodyear">Goodyear</option>
          <option value="Bridgestone">Bridgestone</option>
          <option value="Hankook">Hankook</option>
          <option value="Dunlop">Dunlop</option>
        </select>

        {/* Dimension Dropdown */}
        <select
          value={filter.dimension}
          onChange={(e) => setFilter({ ...filter, dimension: e.target.value })}
          className="h-9 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none cursor-pointer"
        >
          <option value="all">{isAr ? 'المقاس: الكل' : 'Dimension: Toutes'}</option>
          <option value="205/55 R16">205/55 R16</option>
          <option value="195/65 R15">195/65 R15</option>
          <option value="185/65 R15">185/65 R15</option>
          <option value="225/45 R17">225/45 R17</option>
          <option value="175/70 R14">175/70 R14</option>
          <option value="225/55 R18">225/55 R18</option>
        </select>

        {/* Type / Saison Dropdown */}
        <select
          value={filter.tire_type}
          onChange={(e) => setFilter({ ...filter, tire_type: e.target.value })}
          className="h-9 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none cursor-pointer"
        >
          <option value="all">{isAr ? 'النوع: الكل' : 'Type: Tous'}</option>
          <option value="summer">{t('tires.summer')}</option>
          <option value="winter">{t('tires.winter')}</option>
          <option value="all_season">{t('tires.allSeason')}</option>
        </select>

        {/* Stock Status Dropdown */}
        <select
          value={filter.stock_status}
          onChange={(e) => setFilter({ ...filter, stock_status: e.target.value as any })}
          className="h-9 px-3 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:ring-2 focus:ring-[#F5BD18] outline-none cursor-pointer"
        >
          <option value="all">{isAr ? 'المخزون: الكل' : 'Stock: Tous'}</option>
          <option value="in_stock">{isAr ? 'متوفر' : 'En stock'}</option>
          <option value="low_stock">{isAr ? 'مخزون منخفض' : 'Stock bas'}</option>
          <option value="out_of_stock">{isAr ? 'نفذ المخزون' : 'Rupture'}</option>
        </select>

        {/* Action Buttons */}
        <button
          onClick={handleApplyFilter}
          className="flex items-center gap-1.5 h-9 px-3.5 bg-[#172235] hover:bg-[#111827] text-white text-xs font-bold rounded-lg transition-all"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>{t('common.filter')}</span>
        </button>

        <button
          onClick={handleResetFilter}
          className="flex items-center gap-1.5 h-9 px-3 border border-[#E5E7EB] hover:bg-[#F5F6F8] text-[#667085] hover:text-[#111827] text-xs font-semibold rounded-lg transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('common.reset')}</span>
        </button>
      </div>

      {/* Main Tires Table matching screenshot */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E7EB] text-[#111827] uppercase text-[11px] font-bold">
                <th className="py-3 px-4">{t('tires.reference')}</th>
                <th className="py-3 px-4">{t('tires.brand')}</th>
                <th className="py-3 px-4">{t('tires.dimension')}</th>
                <th className="py-3 px-4 text-center">{t('tires.width')}</th>
                <th className="py-3 px-4 text-center">{t('tires.height')}</th>
                <th className="py-3 px-4 text-center">{t('tires.diameter')}</th>
                <th className="py-3 px-4 text-center">{t('tires.loadSpeed')}</th>
                <th className="py-3 px-4 text-center">{t('tires.type')}</th>
                <th className="py-3 px-4 text-right">{t('tires.buyPrice')}</th>
                <th className="py-3 px-4 text-right">{t('tires.sellPrice')}</th>
                <th className="py-3 px-4 text-center">{t('tires.stock')}</th>
                <th className="py-3 px-4 text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {products.map((p) => {
                const stockBg =
                  p.stock_quantity > p.min_stock_alert
                    ? 'bg-emerald-600 text-white'
                    : p.stock_quantity > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-600 text-white'

                return (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#111827]">
                      {p.reference}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#172235]">{p.brand}</span>
                        <span className="text-[10px] text-[#667085]">({p.model_name})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#111827]">
                      {p.dimension}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#667085]">{p.width}</td>
                    <td className="py-3.5 px-4 text-center text-[#667085]">{p.height}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-[#111827]">{p.diameter}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#111827]">
                      {p.load_index}{p.speed_rating}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#111827] text-[11px] font-semibold">
                        {p.tire_type === 'summer'
                          ? t('tires.summer')
                          : p.tire_type === 'winter'
                          ? t('tires.winter')
                          : t('tires.allSeason')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#667085]">
                      {formatCurrencyDA(p.buy_price, i18n.language)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#111827]">
                      {formatCurrencyDA(p.sell_price, i18n.language)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-black ${stockBg}`}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handlePrintLabel(p)}
                          className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-lg transition-colors"
                          title="Imprimer Étiquette"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 hover:bg-[#E5E7EB] text-[#667085] hover:text-[#111827] rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.reference)}
                          className="p-1.5 hover:bg-red-50 text-[#667085] hover:text-red-600 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination matching screenshot */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F5F6F8] flex items-center justify-between text-xs text-[#667085]">
          <div>
            Affiche 1 à {products.length} de {products.length} pneus
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2.5 py-1 rounded bg-[#F5BD18] text-[#111827] font-bold">1</span>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Tire */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-sm">
                  {editingId ? 'Modifier la Référence de Pneu' : 'Ajouter un Nouveau Pneu au Catalogue'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Référence Interne</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value.toUpperCase() })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Marque</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Modèle / Gamme</label>
                  <input
                    type="text"
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 bg-[#F5F6F8] p-3 rounded-xl border border-[#E5E7EB]">
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Dimension (Texte)</label>
                  <input
                    type="text"
                    value={formData.dimension}
                    onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Largeur (mm)</label>
                  <input
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Hauteur (%)</label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Diamètre (R..)</label>
                  <input
                    type="text"
                    value={formData.diameter}
                    onChange={(e) => setFormData({ ...formData, diameter: e.target.value.toUpperCase() })}
                    required
                    className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Indice de Charge</label>
                  <input
                    type="text"
                    value={formData.load_index}
                    onChange={(e) => setFormData({ ...formData, load_index: e.target.value })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Indice de Vitesse</label>
                  <input
                    type="text"
                    value={formData.speed_rating}
                    onChange={(e) => setFormData({ ...formData, speed_rating: e.target.value.toUpperCase() })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Saison / Type</label>
                  <select
                    value={formData.tire_type}
                    onChange={(e) => setFormData({ ...formData, tire_type: e.target.value as any })}
                    className="w-full h-9 px-2 border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value="summer">Été</option>
                    <option value="winter">Hiver</option>
                    <option value="all_season">4 Saisons</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">État</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                    className="w-full h-9 px-2 border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value="new">Neuf</option>
                    <option value="used">Occasion</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Prix d'Achat (DA)</label>
                  <input
                    type="number"
                    value={formData.buy_price}
                    onChange={(e) => setFormData({ ...formData, buy_price: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Prix de Vente (DA)</label>
                  <input
                    type="number"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111827] mb-1">Stock Disponible</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Seuil Alerte Stock Bas</label>
                  <input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Emplacement Rayon</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#667085] mb-1">Code DOT (Semaine/Année)</label>
                  <input
                    type="text"
                    value={formData.dot}
                    onChange={(e) => setFormData({ ...formData, dot: e.target.value })}
                    placeholder="ex: 1824"
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-[#667085] hover:bg-[#F5F6F8] font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] font-bold rounded-lg shadow-xs"
                >
                  {editingId ? 'Enregistrer les modifications' : 'Ajouter le pneu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

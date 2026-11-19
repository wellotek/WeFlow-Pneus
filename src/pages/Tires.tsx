import React, { useEffect, useState, useRef } from 'react'
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
  Disc,
  Download,
  FileText,
  Camera,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Package
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form State: ONLY designation is mandatory! Everything else has sensible defaults/optionals.
  const [formData, setFormData] = useState({
    designation: '',
    reference: '',
    brand: '',
    model_name: '',
    product_type: 'pneu' as 'pneu' | 'accessoire' | 'chambre_air' | 'valve' | 'consommable' | 'divers',
    dimension: '',
    width: '' as string | number,
    height: '' as string | number,
    diameter: '',
    load_index: '',
    speed_rating: '',
    tire_type: 'all_season' as any,
    condition: 'new' as any,
    vehicle_category: 'passenger' as any,
    buy_price: '' as string | number,
    sell_price: '' as string | number,
    wholesale_price: '' as string | number,
    stock_quantity: '' as string | number,
    min_stock_alert: 4,
    location: '',
    barcode: '',
    dot: '',
    image_path: ''
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProducts = async () => {
    try {
      setLoading(true)
      const list = await window.pneusApi.products.list(filter)
      setProducts(list)
    } catch (err: any) {
      console.error('Failed to load tires:', err)
      setNotification({ type: 'error', message: err?.message || 'Erreur lors du chargement des articles' })
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
      designation: '',
      reference: '',
      brand: '',
      model_name: '',
      product_type: 'pneu',
      dimension: '',
      width: '',
      height: '',
      diameter: '',
      load_index: '',
      speed_rating: '',
      tire_type: 'all_season',
      condition: 'new',
      vehicle_category: 'passenger',
      buy_price: '',
      sell_price: '',
      wholesale_price: '',
      stock_quantity: 0,
      min_stock_alert: 4,
      location: '',
      barcode: '',
      dot: '',
      image_path: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id)
    setFormData({
      designation: `${p.brand} ${p.dimension} ${p.model_name || ''}`.trim() || p.reference,
      reference: p.reference,
      brand: p.brand || '',
      model_name: p.model_name || '',
      product_type: (p.product_type as any) || 'pneu',
      dimension: p.dimension || '',
      width: p.width || '',
      height: p.height || '',
      diameter: p.diameter || '',
      load_index: p.load_index || '',
      speed_rating: p.speed_rating || '',
      tire_type: p.tire_type || 'all_season',
      condition: p.condition || 'new',
      vehicle_category: p.vehicle_category || 'passenger',
      buy_price: p.buy_price,
      sell_price: p.sell_price,
      wholesale_price: p.wholesale_price || '',
      stock_quantity: p.stock_quantity,
      min_stock_alert: p.min_stock_alert || 4,
      location: p.location || '',
      barcode: p.barcode || '',
      dot: p.dot || '',
      image_path: p.image_path || ''
    })
    setIsModalOpen(true)
  }

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await window.pneusApi.media.uploadImage('products', base64, file.name)
        if (res && res.path) {
          setFormData((prev) => ({ ...prev, image_path: res.path }))
        }
      } catch (err: any) {
        alert(`Erreur photo: ${err.message}`)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.designation.trim()) {
      alert(isAr ? 'يرجى إدخال اسم / تعيين المقال' : "La désignation de l'article est obligatoire.")
      return
    }

    try {
      const payload: any = {
        designation: formData.designation.trim(),
        reference: formData.reference.trim() || undefined,
        brand: formData.brand.trim() || 'Générique',
        model_name: formData.model_name.trim() || undefined,
        product_type: formData.product_type,
        dimension: formData.dimension.trim() || undefined,
        width: formData.width ? Number(formData.width) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        diameter: formData.diameter.trim() || undefined,
        load_index: formData.load_index.trim() || undefined,
        speed_rating: formData.speed_rating.trim() || undefined,
        tire_type: formData.tire_type,
        condition: formData.condition,
        vehicle_category: formData.vehicle_category,
        buy_price: formData.buy_price ? Number(formData.buy_price) : 0,
        sell_price: formData.sell_price ? Number(formData.sell_price) : 0,
        wholesale_price: formData.wholesale_price ? Number(formData.wholesale_price) : undefined,
        stock_quantity: formData.stock_quantity ? Number(formData.stock_quantity) : 0,
        min_stock_alert: Number(formData.min_stock_alert) || 4,
        location: formData.location.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        dot: formData.dot.trim() || undefined,
        image_path: formData.image_path || undefined
      }

      if (editingId) {
        await window.pneusApi.products.update(editingId, payload)
        setNotification({ type: 'success', message: 'Article mis à jour avec succès.' })
      } else {
        await window.pneusApi.products.create(payload)
        setNotification({ type: 'success', message: 'Nouvel article ajouté au catalogue.' })
      }
      setIsModalOpen(false)
      loadProducts()
    } catch (err: any) {
      alert(`Erreur : ${err.message}`)
    }
  }

  const handleDelete = async (id: string, ref: string) => {
    if (confirm(isAr ? `حذف أو أرشفة المقال ${ref} ؟` : `Confirmer la suppression ou l'archivage de ${ref} ?`)) {
      try {
        await window.pneusApi.products.delete(id)
        setNotification({ type: 'success', message: 'Article supprimé / archivé.' })
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

  // Export CSV
  const handleExportCsv = async () => {
    const headers = [
      'Référence',
      'Marque',
      'Désignation',
      'Dimension',
      'Type',
      'Prix Achat (DA)',
      'Prix Vente (DA)',
      'Stock',
      'Emplacement'
    ]
    const rows = products.map((p) => [
      p.reference,
      p.brand,
      p.model_name || p.dimension,
      p.dimension,
      p.product_type || 'pneu',
      p.buy_price,
      p.sell_price,
      p.stock_quantity,
      p.location || ''
    ])

    const res = await window.pneusApi.documents.exportCsv(
      `Catalogue_Pneus_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export CSV réussi : ${res.path}` })
    }
  }

  // Export PDF
  const handleExportPdf = async () => {
    const columns = [
      { header: 'Référence', dataKey: 'reference' },
      { header: 'Marque', dataKey: 'brand' },
      { header: 'Dimension', dataKey: 'dimension' },
      { header: 'Prix Vente (DA)', dataKey: 'price_formatted' },
      { header: 'Stock', dataKey: 'stock_quantity' }
    ]

    const rows = products.map((p) => ({
      reference: p.reference,
      brand: p.brand,
      dimension: p.dimension,
      price_formatted: formatCurrencyDA(p.sell_price),
      stock_quantity: p.stock_quantity
    }))

    const res = await window.pneusApi.documents.exportListPdf(
      isAr ? 'كتالوج الإطارات والمراجع' : 'Catalogue des Pneus & Références',
      columns,
      rows,
      { isRtl: isAr }
    )
    if (!res.cancelled && res.path) {
      setNotification({ type: 'success', message: `Export PDF réussi : ${res.path}` })
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] p-4 lg:p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#172235] tracking-tight">
            {isAr ? 'الإطارات والمراجع والمقالات' : 'Pneus & Références'}
          </h1>
          <p className="text-xs text-[#667085]">
            {isAr
              ? 'كتالوج الإطارات، الصمامات، الغرف الهوائية، ولوازم الورشة'
              : 'Catalogue complet, caractéristiques techniques, photos et stocks disponibles'}
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
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? '+ إضافة مقال أو إطار' : '+ AJOUTER UN ARTICLE'}</span>
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-wrap items-center gap-2.5 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالمرجع أو العلامة أو المقاس...' : 'Rechercher par réf, marque, dimension...'}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
            className={`w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs text-[#172235] focus:outline-none focus:ring-1 focus:ring-[#F5BD18] ${
              isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
            }`}
          />
        </div>

        <select
          value={filter.brand}
          onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
          className="h-9 px-2.5 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18] outline-none cursor-pointer"
        >
          <option value="all">Marque: Toutes</option>
          <option value="Michelin">Michelin</option>
          <option value="Continental">Continental</option>
          <option value="Pirelli">Pirelli</option>
          <option value="Goodyear">Goodyear</option>
          <option value="Bridgestone">Bridgestone</option>
          <option value="Hankook">Hankook</option>
          <option value="Générique">Générique</option>
        </select>

        <select
          value={filter.stock_status || 'all'}
          onChange={(e) => setFilter({ ...filter, stock_status: e.target.value as any })}
          className="h-9 px-2.5 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18] outline-none cursor-pointer"
        >
          <option value="all">Stock: Tous</option>
          <option value="in_stock">En stock (&gt;0)</option>
          <option value="low_stock">Stock faible (alerte)</option>
          <option value="out_of_stock">Rupture (0)</option>
        </select>

        <button
          onClick={handleApplyFilter}
          className="h-9 px-3.5 bg-[#172235] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          Filtrer
        </button>
        <button
          onClick={handleResetFilter}
          className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-[#172235] rounded-lg text-xs font-semibold transition-all"
        >
          Réinitialiser
        </button>
      </div>

      {/* Main Tires Table */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden flex flex-col shadow-xs">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#172235] text-white sticky top-0 uppercase text-[10px] tracking-wider font-bold z-10">
              <tr>
                <th className="py-2.5 px-3">Référence</th>
                <th className="py-2.5 px-3">Marque</th>
                <th className="py-2.5 px-3">Dimension / Type</th>
                <th className="py-2.5 px-2 text-center">Indice</th>
                <th className="py-2.5 px-2 text-center">Saison</th>
                <th className="py-2.5 px-3 text-right">Prix Achat (DA)</th>
                <th className="py-2.5 px-3 text-right">Prix Vente (DA)</th>
                <th className="py-2.5 px-3 text-center">Stock</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#F5BD18] border-t-transparent rounded-full animate-spin" />
                      <span>Chargement du catalogue...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#667085]">
                    Aucun article trouvé. Cliquez sur "+ Ajouter un article" pour enregistrer votre premier produit.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOut = p.stock_quantity <= 0
                  const isLow = p.stock_quantity <= p.min_stock_alert && !isOut
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#172235]">
                        {p.reference}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-extrabold text-[#172235]">{p.brand}</span>
                        {p.model_name && <span className="text-[10px] text-[#667085] ml-1">({p.model_name})</span>}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {p.dimension || p.product_type?.toUpperCase() || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                        {p.load_index || p.speed_rating ? `${p.load_index || ''}${p.speed_rating || ''}` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600">
                        {p.tire_type === 'summer'
                          ? 'Été'
                          : p.tire_type === 'winter'
                          ? 'Hiver'
                          : p.tire_type === 'all_season'
                          ? '4 Saisons'
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-600">
                        {formatCurrencyDA(p.buy_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#172235]">
                        {formatCurrencyDA(p.sell_price)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                            isOut
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 hover:bg-slate-100 rounded text-amber-600"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintLabel(p)}
                            className="p-1 hover:bg-slate-100 rounded text-blue-600"
                            title="Imprimer étiquette code-barres"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.reference)}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                            title="Supprimer / Archiver"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: Add / Edit Product (SIMPLIFIED & INTUITIVE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-[#F5BD18]" />
                <h3 className="font-bold text-base">
                  {editingId ? "Modifier l'Article" : 'Ajouter un Nouvel Article'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* PRIMARY MANDATORY FIELD */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1">
                <label className="block text-xs font-black text-[#172235]">
                  Désignation de l'article * (SEUL CHAMP STRICTEMENT OBLIGATOIRE)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Michelin Primacy 4 205/55 R16 91V, Valve TR414, Chambre à air 15..."
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full bg-white border border-amber-400 rounded-lg px-3 py-2 text-sm font-bold text-[#172235] focus:outline-none focus:ring-2 focus:ring-[#F5BD18]"
                />
              </div>

              {/* Product Type & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Type d'article (Optionnel)
                  </label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value as any })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-[#172235]"
                  >
                    <option value="pneu">Pneu (Tourisme, 4x4, Utilitaire)</option>
                    <option value="accessoire">Accessoire</option>
                    <option value="chambre_air">Chambre à air</option>
                    <option value="valve">Valve pneumatique</option>
                    <option value="consommable">Consommable d'atelier</option>
                    <option value="divers">Article divers</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Référence (Optionnel — générée si vide)
                  </label>
                  <input
                    type="text"
                    placeholder="Laisser vide pour auto-génération"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-[#172235]"
                  />
                </div>
              </div>

              {/* Brand & Dimension */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Marque (Optionnel — défaut: Générique)
                  </label>
                  <input
                    type="text"
                    placeholder="Michelin, Continental, Pirelli, etc."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Dimension (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 205/55 R16, 195/65 R15..."
                    value={formData.dimension}
                    onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 text-[#172235]"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix d'Achat (DA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.buy_price}
                    onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-[#172235]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix de Vente (DA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-black text-[#172235]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Initial</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-[#172235]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alerte Min.</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value, 10) || 4 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* Photo & Barcode (Both Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Photo du produit (Optionnel)</label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#F5BD18]" />
                      <span>{formData.image_path ? 'Changer image' : 'Importer photo'}</span>
                    </button>
                    {formData.image_path && (
                      <span className="text-emerald-600 font-bold text-[11px]">Photo enregistrée</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code-barres / EAN (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Scannez ou saisissez..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-[#172235]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl shadow-md transition-all"
                >
                  {editingId ? "Enregistrer l'Article" : 'Ajouter au Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Settings,
  Store,
  Printer,
  Globe,
  Database,
  Key,
  RefreshCw,
  Save,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Percent,
  Monitor,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import type { StoreProfile, LicenseUiState, TaxRate } from '@shared/types'
import { APP_VERSION } from '@shared/version'
import { isRtlLocale } from '@shared/locales'

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [profile, setProfile] = useState<StoreProfile>({
    store_name: 'Pneumatique Express Alger',
    phone: '0555 12 34 56',
    address: 'Zone Industrielle Oued Smar, Lot 44',
    wilaya: '16 - Alger',
    email: 'contact@weflow-pneus.dz',
    rc_number: '16/00-1234567B20',
    nif_number: '002016123456789',
    nis_number: '0020161200000',
    ai_number: '16281000000',
    is_tva_enabled: true,
    default_tax_rate: 19,
    zoom_factor: 1.0,
    ticket_format: '80mm',
    invoice_footer: 'Pneus garantis constructeur. Montage et équilibrage certifiés.',
    auto_backup_enabled: true,
    language: 'fr',
    allow_negative_stock: false
  })

  const [licenseState, setLicenseState] = useState<LicenseUiState | null>(null)
  const [backups, setBackups] = useState<
    { fileName: string; filePath: string; size: number; createdAt: string }[]
  >([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState<'profile' | 'tva' | 'display' | 'printers' | 'database' | 'license'>(
    'profile'
  )

  // Tax Rate Modal
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null)
  const [taxRateName, setTaxRateName] = useState('')
  const [taxRateValue, setTaxRateValue] = useState<number>(19)
  const [taxRateIsDefault, setTaxRateIsDefault] = useState(false)

  // Zoom factor
  const [zoomLevel, setZoomLevel] = useState<number>(1.0)

  const loadData = async () => {
    try {
      setLoading(true)
      const [p, lic, b, rates, currentZoom] = await Promise.all([
        window.pneusApi.settings.getProfile(),
        window.pneusApi.license.getStatus(),
        window.pneusApi.backup.list(),
        window.pneusApi.settings.listTaxRates(true),
        window.pneusApi.app.getZoom()
      ])
      if (p) setProfile(p)
      if (lic) setLicenseState(lic)
      if (b) setBackups(b)
      if (rates) setTaxRates(rates)
      if (typeof currentZoom === 'number') setZoomLevel(currentZoom)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      setSaving(true)
      await window.pneusApi.settings.updateProfile(profile)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      alert(`Erreur d'enregistrement: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleZoomChange = async (factor: number) => {
    const clamped = Math.min(1.5, Math.max(0.8, Math.round(factor * 10) / 10))
    setZoomLevel(clamped)
    setProfile((prev) => ({ ...prev, zoom_factor: clamped }))
    await window.pneusApi.app.setZoom(clamped)
  }

  const handleLanguageChange = async (lang: 'fr' | 'ar') => {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    setProfile((prev) => ({ ...prev, language: lang }))
    await window.pneusApi.settings.updateProfile({ language: lang })
  }

  const handleSaveTaxRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taxRateName.trim()) return

    try {
      if (editingTaxRate) {
        await window.pneusApi.settings.updateTaxRate(editingTaxRate.id, {
          label: taxRateName.trim(),
          rate: taxRateValue,
          is_default: taxRateIsDefault,
          is_active: editingTaxRate.is_active
        })
      } else {
        await window.pneusApi.settings.createTaxRate({
          label: taxRateName.trim(),
          rate: taxRateValue,
          is_default: taxRateIsDefault,
          is_active: true
        })
      }

      setShowTaxModal(false)
      setEditingTaxRate(null)
      setTaxRateName('')
      setTaxRateValue(19)
      setTaxRateIsDefault(false)

      const updatedRates = await window.pneusApi.settings.listTaxRates(true)
      setTaxRates(updatedRates)

      // Refresh store profile default tax rate if set as default
      if (taxRateIsDefault) {
        setProfile((prev) => ({ ...prev, default_tax_rate: taxRateValue }))
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  const handleDeleteTaxRate = async (rate: TaxRate) => {
    if (confirm(`Supprimer le taux "${rate.label || rate.name}" (${rate.rate}%) ?`)) {
      try {
        await window.pneusApi.settings.deleteTaxRate(rate.id)
        const updated = await window.pneusApi.settings.listTaxRates(true)
        setTaxRates(updated)
      } catch (err: any) {
        alert(err.message)
      }
    }
  }

  const handleToggleTaxRateActive = async (rate: TaxRate) => {
    try {
      await window.pneusApi.settings.updateTaxRate(rate.id, {
        is_active: !rate.is_active
      })
      const updated = await window.pneusApi.settings.listTaxRates(true)
      setTaxRates(updated)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreateBackup = async () => {
    try {
      const res = await window.pneusApi.backup.create()
      if (res.success) {
        alert(`Sauvegarde réussie !\nFichier: ${res.filePath}`)
        const b = await window.pneusApi.backup.list()
        setBackups(b || [])
      }
    } catch (err: any) {
      alert(`Erreur lors de la sauvegarde: ${err.message}`)
    }
  }

  const handleRestoreBackup = async (filePath: string) => {
    if (
      confirm(
        'ATTENTION: La restauration remplacera toutes les données actuelles par cette sauvegarde. Voulez-vous continuer ?'
      )
    ) {
      try {
        const res = await window.pneusApi.backup.restore(filePath)
        if (res.success) {
          alert('Base de données restaurée avec succès ! Le logiciel va recharger les données.')
          window.location.reload()
        }
      } catch (err: any) {
        alert(`Erreur de restauration: ${err.message}`)
      }
    }
  }

  const handleRefreshLicense = async () => {
    try {
      const res = await window.pneusApi.license.validate()
      setLicenseState(res)
      alert(
        res.status === 'active' || res.status === 'offline'
          ? 'Licence vérifiée et synchronisée avec le serveur avec succès.'
          : `Statut de la licence : ${res.status}`
      )
    } catch (err: any) {
      alert(`Erreur lors de la vérification de licence: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#172235] tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-[#F5BD18]" />
            <span>{isAr ? 'إعدادات النظام والبرنامج' : 'Paramètres du Système'}</span>
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            {isAr
              ? 'إدارة الحسابات، الضرائب (TVA)، التكبير/التصغير، النسخ الاحتياطي والترخيص'
              : 'Configuration légale, gestion de la TVA, zoom, imprimantes, sauvegardes et licence'}
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'تم حفظ التغييرات بنجاح !' : 'Modifications enregistrées !'}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar Tabs + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-2 space-y-1">
          {[
            { id: 'profile', labelFr: 'Profil & Établissement', labelAr: 'معلومات المحل', icon: Store },
            { id: 'tva', labelFr: 'Gestion de la TVA & Taxes', labelAr: 'الضريبة على القيمة المضافة (TVA)', icon: Percent },
            { id: 'display', labelFr: 'Affichage & Zoom', labelAr: 'العرض والتكبير', icon: Monitor },
            { id: 'printers', labelFr: 'Format & Impression', labelAr: 'الطباعة والطابعات', icon: Printer },
            { id: 'database', labelFr: 'Sauvegardes & Restauration', labelAr: 'النسخ الاحتياطي', icon: Database },
            { id: 'license', labelFr: 'Licence & Mises à Jour', labelAr: 'الترخيص والتحديثات', icon: Key }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSection === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#172235] text-white shadow-sm ring-1 ring-[#F5BD18]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F5BD18]' : 'text-slate-400'}`} />
                <span>{isAr ? tab.labelAr : tab.labelFr}</span>
              </button>
            )
          })}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
          {/* TAB 1: Profile */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h2 className="text-base font-black text-[#172235] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#F5BD18]" />
                <span>Informations Légales & En-tête de Facture</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom commercial de l'établissement *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.store_name}
                    onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adresse *</label>
                  <input
                    type="text"
                    required
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wilaya *</label>
                  <input
                    type="text"
                    required
                    value={profile.wilaya}
                    onChange={(e) => setProfile({ ...profile, wilaya: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-[#172235] focus:ring-1 focus:ring-[#F5BD18]"
                  />
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider pt-2 border-t border-slate-100">
                Identifiants Fiscaux Algériens
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">N° RC</label>
                  <input
                    type="text"
                    value={profile.rc_number || ''}
                    onChange={(e) => setProfile({ ...profile, rc_number: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-[#172235]"
                    placeholder="16/00-1234567B20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIF</label>
                  <input
                    type="text"
                    value={profile.nif_number || ''}
                    onChange={(e) => setProfile({ ...profile, nif_number: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-[#172235]"
                    placeholder="002016123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIS</label>
                  <input
                    type="text"
                    value={profile.nis_number || ''}
                    onChange={(e) => setProfile({ ...profile, nis_number: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-[#172235]"
                    placeholder="0020161200000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Article Imposition (AI)</label>
                  <input
                    type="text"
                    value={profile.ai_number || ''}
                    onChange={(e) => setProfile({ ...profile, ai_number: e.target.value })}
                    className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-[#172235]"
                    placeholder="16281000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pied de page des Factures / Devis
                </label>
                <textarea
                  rows={2}
                  value={profile.invoice_footer || ''}
                  onChange={(e) => setProfile({ ...profile, invoice_footer: e.target.value })}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg p-2.5 text-xs text-[#172235] focus:ring-1 focus:ring-[#F5BD18]"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer le Profil'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: TVA & Tax Rates (NEW) */}
          {activeSection === 'tva' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-[#172235] flex items-center gap-2">
                  <Percent className="w-5 h-5 text-[#F5BD18]" />
                  <span>Gestion de la TVA & Taux de Taxe</span>
                </h2>
                <button
                  onClick={() => {
                    setEditingTaxRate(null)
                    setTaxRateName('')
                    setTaxRateValue(19)
                    setTaxRateIsDefault(false)
                    setShowTaxModal(true)
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] text-xs font-black rounded-xl shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un taux</span>
                </button>
              </div>

              {/* Master Toggle Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#172235]">
                    Application de la TVA sur les Factures & Devis
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {profile.is_tva_enabled
                      ? 'La TVA est actuellement active. Les lignes de vente et documents calculent le montant HT et la TVA.'
                      : 'La TVA est désactivée (franchise de taxe). Les montants HT correspondent au net à payer.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(profile.is_tva_enabled)}
                    onChange={async (e) => {
                      const enabled = e.target.checked
                      setProfile({ ...profile, is_tva_enabled: enabled })
                      await window.pneusApi.settings.updateProfile({ is_tva_enabled: enabled })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#172235]"></div>
                </label>
              </div>

              {/* Strict Historical Preservation Notice */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Règle de conformité fiscale :</strong> toute modification ou désactivation des taux de TVA ne s'applique qu'aux nouvelles opérations. Les factures antérieures conservent rigoureusement leur taux historique d'origine.
                </p>
              </div>

              {/* Tax Rates Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#172235] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Nom du Taux</th>
                      <th className="py-2.5 px-4">Taux (%)</th>
                      <th className="py-2.5 px-4 text-center">Par Défaut</th>
                      <th className="py-2.5 px-4 text-center">Statut</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taxRates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Aucun taux configuré.
                        </td>
                      </tr>
                    ) : (
                      taxRates.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-[#172235]">{tr.label || tr.name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-base text-[#172235]">
                            {tr.rate}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            {tr.is_default ? (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full text-[10px]">
                                Par défaut
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleTaxRateActive(tr)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tr.is_active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {tr.is_active ? 'Actif' : 'Inactif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingTaxRate(tr)
                                  setTaxRateName(tr.label || tr.name || '')
                                  setTaxRateValue(tr.rate)
                                  setTaxRateIsDefault(Boolean(tr.is_default))
                                  setShowTaxModal(true)
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                title="Modifier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTaxRate(tr)}
                                className="p-1 hover:bg-red-50 rounded text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Display & Zoom (NEW) */}
          {activeSection === 'display' && (
            <div className="space-y-6">
              <h2 className="text-base font-black text-[#172235] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-[#F5BD18]" />
                <span>Affichage & Zoom de l'Interface</span>
              </h2>

              {/* Zoom Controls */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-[#172235]">Niveau de Zoom Global</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ajustez la taille du texte et des éléments de l'application de 80% à 150%. Votre choix est conservé après redémarrage.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleZoomChange(zoomLevel - 0.1)}
                    disabled={zoomLevel <= 0.8}
                    className="p-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 rounded-xl font-bold text-xs"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1.5 flex-wrap">
                    {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => handleZoomChange(lvl)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          Math.abs(zoomLevel - lvl) < 0.05
                            ? 'bg-[#172235] text-white ring-1 ring-[#F5BD18] shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {Math.round(lvl * 100)}%
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleZoomChange(zoomLevel + 0.1)}
                    disabled={zoomLevel >= 1.5}
                    className="p-2 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 rounded-xl font-bold text-xs"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                  <strong>Raccourcis clavier disponibles :</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li><kbd className="font-mono bg-slate-100 px-1 rounded">Ctrl</kbd> + <kbd className="font-mono bg-slate-100 px-1 rounded">+</kbd> ou <kbd className="font-mono bg-slate-100 px-1 rounded">=</kbd> : Zoom avant (+10%)</li>
                    <li><kbd className="font-mono bg-slate-100 px-1 rounded">Ctrl</kbd> + <kbd className="font-mono bg-slate-100 px-1 rounded">-</kbd> : Zoom arrière (-10%)</li>
                    <li><kbd className="font-mono bg-slate-100 px-1 rounded">Ctrl</kbd> + <kbd className="font-mono bg-slate-100 px-1 rounded">0</kbd> : Réinitialiser à 100%</li>
                  </ul>
                </div>
              </div>

              {/* Language Switch */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="font-bold text-sm text-[#172235]">Langue de l'Application</h3>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('fr')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      i18n.language.startsWith('fr')
                        ? 'border-[#172235] bg-[#172235] text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Français (LTR)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ar')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      i18n.language.startsWith('ar')
                        ? 'border-[#172235] bg-[#172235] text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    العربية (RTL)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Printers */}
          {activeSection === 'printers' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h2 className="text-base font-black text-[#172235] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#F5BD18]" />
                <span>Format de Ticket & Impression</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Format d'impression des Tickets de Caisse
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, ticket_format: '80mm' })}
                      className={`p-4 rounded-xl border text-center font-bold text-xs transition-all ${
                        profile.ticket_format === '80mm'
                          ? 'border-[#172235] bg-[#172235] text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      80 mm (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, ticket_format: '58mm' })}
                      className={`p-4 rounded-xl border text-center font-bold text-xs transition-all ${
                        profile.ticket_format === '58mm'
                          ? 'border-[#172235] bg-[#172235] text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      58 mm (Compact)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: Database & Backups */}
          {activeSection === 'database' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-[#172235] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#F5BD18]" />
                  <span>Sauvegardes Locales de la Base de Données</span>
                </h2>
                <button
                  onClick={handleCreateBackup}
                  className="px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Créer une Sauvegarde Maintenant</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Toutes vos données (stocks, clients, ventes, factures, véhicules) sont stockées dans une
                base SQLite locale sécurisée. Effectuez des sauvegardes régulières pour prévenir toute perte en
                cas de panne matérielle.
              </p>

              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#172235] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Fichier de Sauvegarde</th>
                      <th className="py-2.5 px-4">Date de Création</th>
                      <th className="py-2.5 px-4">Taille</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          Aucune archive de sauvegarde trouvée.
                        </td>
                      </tr>
                    ) : (
                      backups.map((b) => (
                        <tr key={b.fileName} className="hover:bg-white transition-colors">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-[#172235]">
                            {b.fileName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{b.createdAt}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">
                            {(b.size / 1024).toFixed(1)} Ko
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRestoreBackup(b.filePath)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Restaurer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: License */}
          {activeSection === 'license' && (
            <div className="space-y-6">
              <h2 className="text-base font-black text-[#172235] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#F5BD18]" />
                <span>Licence & Activation Commerciale</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block font-semibold">Statut de la Licence</span>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-black text-[#172235] capitalize">
                      {licenseState?.status === 'active' || licenseState?.status === 'offline'
                        ? 'Activée (Licence à vie)'
                        : licenseState?.status || 'Non activée'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block font-semibold">Produit Enregistré</span>
                  <span className="mt-1 text-sm font-black text-[#172235] block">
                    WeFlow Pneus v{APP_VERSION}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block font-semibold">Identifiant Client / Licence</span>
                  <span className="mt-1 font-mono text-xs font-bold text-slate-800 block">
                    {licenseState?.licenseId || 'LIC-WFP-2024-ALGERIA'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block font-semibold">Serveur d'Activation</span>
                  <span className="mt-1 font-mono text-xs text-slate-600 block">
                    https://license.dentisuite.xyz
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={handleRefreshLicense}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Synchroniser la Licence</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      if (window.pneusApi?.updater?.check) {
                        const snap = await window.pneusApi.updater.check()
                        alert(
                          snap.phase === 'available' || snap.availableVersion
                            ? `Nouvelle version disponible : v${snap.availableVersion}`
                            : 'Votre logiciel WeFlow Pneus est à jour !'
                        )
                      }
                    } catch (err: any) {
                      alert(`Vérification des mises à jour : ${err.message}`)
                    }
                  }}
                  className="px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Vérifier les Mises à Jour</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add / Edit Tax Rate */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#172235] px-5 py-3.5 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm">
                {editingTaxRate ? 'Modifier le Taux de TVA' : 'Nouveau Taux de TVA'}
              </h3>
              <button onClick={() => setShowTaxModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTaxRate} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom du Taux *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Taux Standard 19%"
                  value={taxRateName}
                  onChange={(e) => setTaxRateName(e.target.value)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-[#172235]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pourcentage (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={taxRateValue}
                  onChange={(e) => setTaxRateValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F5F6F8] border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-[#172235]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefTax"
                  checked={taxRateIsDefault}
                  onChange={(e) => setTaxRateIsDefault(e.target.checked)}
                  className="rounded text-[#F5BD18] focus:ring-[#F5BD18]"
                />
                <label htmlFor="isDefTax" className="font-semibold text-slate-700 cursor-pointer">
                  Définir comme taux par défaut
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaxModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#172235] font-black rounded-lg"
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

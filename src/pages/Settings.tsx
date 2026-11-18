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
  HardDrive
} from 'lucide-react'
import type { StoreProfile, LicenseUiState, UpdateSnapshot } from '../../shared/types'

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
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
    default_tax_rate: 19,
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState<'profile' | 'printers' | 'database' | 'license'>(
    'profile'
  )

  const loadData = async () => {
    try {
      setLoading(true)
      if (window.pneusApi?.settings?.getProfile) {
        const p = await window.pneusApi.settings.getProfile()
        if (p) setProfile(p)
      }
      if (window.pneusApi?.license?.getStatus) {
        const lic = await window.pneusApi.license.getStatus()
        setLicenseState(lic)
      }
      if (window.pneusApi?.backup?.list) {
        const b = await window.pneusApi.backup.list()
        setBackups(b || [])
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handleLanguageChange = (lang: 'fr' | 'ar') => {
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            {t('nav.settings')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configuration globale du magasin, profil légal, impression, sauvegardes et licence
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Modifications enregistrées !
          </div>
        )}
      </div>

      {/* Main Grid: Navigation tabs on left, settings panels on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 space-y-1">
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'profile'
                ? 'bg-primary text-gray-900 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Store className="w-4 h-4" />
            Profil & Coordonnées
          </button>
          <button
            onClick={() => setActiveSection('printers')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'printers'
                ? 'bg-primary text-gray-900 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            Impression & Périphériques
          </button>
          <button
            onClick={() => setActiveSection('database')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'database'
                ? 'bg-primary text-gray-900 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4" />
            Sauvegardes & Restauration
          </button>
          <button
            onClick={() => setActiveSection('license')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'license'
                ? 'bg-primary text-gray-900 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Key className="w-4 h-4" />
            Licence & Mises à Jour
          </button>
        </div>

        {/* Form Panel */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Informations Légales & En-tête de Facture
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nom commercial de l'établissement *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.store_name}
                    onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse *</label>
                  <input
                    type="text"
                    required
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Wilaya *</label>
                  <input
                    type="text"
                    required
                    value={profile.wilaya}
                    onChange={(e) => setProfile({ ...profile, wilaya: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Taux TVA par défaut (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={profile.default_tax_rate}
                    onChange={(e) => setProfile({ ...profile, default_tax_rate: Number(e.target.value) })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-800 pt-2 border-t">Identifiants Fiscaux Algériens</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">N° RC</label>
                  <input
                    type="text"
                    value={profile.rc_number || ''}
                    onChange={(e) => setProfile({ ...profile, rc_number: e.target.value })}
                    className="input-field w-full"
                    placeholder="16/00-1234567B20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NIF</label>
                  <input
                    type="text"
                    value={profile.nif_number || ''}
                    onChange={(e) => setProfile({ ...profile, nif_number: e.target.value })}
                    className="input-field w-full"
                    placeholder="002016123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NIS</label>
                  <input
                    type="text"
                    value={profile.nis_number || ''}
                    onChange={(e) => setProfile({ ...profile, nis_number: e.target.value })}
                    className="input-field w-full"
                    placeholder="0020161200000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Article Imposition (AI)</label>
                  <input
                    type="text"
                    value={profile.ai_number || ''}
                    onChange={(e) => setProfile({ ...profile, ai_number: e.target.value })}
                    className="input-field w-full"
                    placeholder="16281000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pied de page des Factures / Devis
                </label>
                <textarea
                  rows={2}
                  value={profile.invoice_footer || ''}
                  onChange={(e) => setProfile({ ...profile, invoice_footer: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 font-bold"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'printers' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Format de Ticket & Impression
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Format d'impression des Tickets de Caisse
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, ticket_format: '80mm' })}
                      className={`p-4 rounded-xl border text-center font-bold text-sm ${
                        profile.ticket_format === '80mm'
                          ? 'border-primary bg-yellow-50 text-dark-navy shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      80 mm (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, ticket_format: '58mm' })}
                      className={`p-4 rounded-xl border text-center font-bold text-sm ${
                        profile.ticket_format === '58mm'
                          ? 'border-primary bg-yellow-50 text-dark-navy shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      58 mm (Compact)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Langue de l'interface & des documents
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleLanguageChange('fr')}
                      className={`p-4 rounded-xl border text-center font-bold text-sm ${
                        i18n.language.startsWith('fr')
                          ? 'border-primary bg-yellow-50 text-dark-navy shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Français (LTR)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLanguageChange('ar')}
                      className={`p-4 rounded-xl border text-center font-bold text-sm ${
                        i18n.language.startsWith('ar')
                          ? 'border-primary bg-yellow-50 text-dark-navy shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      العربية (RTL)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 font-bold"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'database' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Sauvegardes Locales de la Base de Données
                </h2>
                <button
                  onClick={handleCreateBackup}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Créer une Sauvegarde Maintenant
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Toutes vos données (stocks, clients, ventes, factures, véhicules) sont stockées dans une
                base SQLite locale sécurisée. Effectuez des sauvegardes régulières pour prévenir toute perte en
                cas de panne matérielle.
              </p>

              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-xs font-semibold text-gray-600 uppercase border-b">
                    <tr>
                      <th className="py-2.5 px-4">Fichier de Sauvegarde</th>
                      <th className="py-2.5 px-4">Date de Création</th>
                      <th className="py-2.5 px-4">Taille</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Aucune archive de sauvegarde trouvée. Cliquez sur "Créer une Sauvegarde" pour générer la
                          première.
                        </td>
                      </tr>
                    ) : (
                      backups.map((b) => (
                        <tr key={b.fileName} className="hover:bg-white transition-colors">
                          <td className="py-3 px-4 font-mono text-xs font-medium text-gray-900">
                            {b.fileName}
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-xs">{b.createdAt}</td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-600">
                            {(b.size / 1024).toFixed(1)} Ko
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRestoreBackup(b.filePath)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded transition-colors"
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

          {activeSection === 'license' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Licence & Activation Commerciale
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-xs text-gray-500 block font-medium">Statut de la Licence</span>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-gray-900 capitalize">
                      {licenseState?.status === 'active' || licenseState?.status === 'offline'
                        ? 'Activée (Licence à vie)'
                        : licenseState?.status || 'Non activée'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-xs text-gray-500 block font-medium">Produit Enregistré</span>
                  <span className="mt-1 text-base font-bold text-gray-900 block">
                    WeFlow Pneus v1.0.0
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-xs text-gray-500 block font-medium">Identifiant Client / Licence</span>
                  <span className="mt-1 font-mono text-sm text-gray-800 block">
                    {licenseState?.licenseId || 'LIC-WFP-2024-ALGERIA'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-xs text-gray-500 block font-medium">Serveur d'Activation</span>
                  <span className="mt-1 font-mono text-xs text-gray-600 block">
                    https://license.dentisuite.xyz
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={handleRefreshLicense}
                  className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Synchroniser la Licence
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
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Vérifier les Mises à Jour
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

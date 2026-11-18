import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Store, Globe, DollarSign, Printer, Database, Check, ArrowRight } from 'lucide-react'
import type { StoreProfile } from '@shared/types'

interface OnboardingWizardProps {
  onComplete: () => void
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<Partial<StoreProfile>>({
    store_name: 'WeFlow Pneus',
    phone: '0555 12 34 56',
    address: 'Zone Industrielle, Lot 14',
    wilaya: 'Alger',
    default_tax_rate: 19.0,
    ticket_format: '80mm',
    auto_backup_enabled: true,
    language: (i18n.language as 'fr' | 'ar') || 'fr',
    allow_negative_stock: false
  })

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1)
    } else {
      // Save and finish
      await window.pneusApi.settings.updateProfile(profile)
      onComplete()
    }
  }

  return (
    <div className="h-screen w-screen bg-[#F5F6F8] flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#172235] px-8 py-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">
              Configuration Initiale <span className="text-[#F5BD18]">WeFlow Pneus</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {isAr ? `الخطوة ${step} من 5` : `Étape ${step} sur 5`}
            </p>
          </div>
          {/* Step circles */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s === step
                    ? 'bg-[#F5BD18] text-[#111827] ring-4 ring-[#F5BD18]/30'
                    : s < step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* Content body */}
        <div className="p-8 flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#172235] font-bold text-base mb-2">
                <Store className="w-5 h-5 text-[#F5BD18]" />
                <span>Informations du Magasin & Atelier</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Nom du Magasin</label>
                  <input
                    type="text"
                    value={profile.store_name}
                    onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Adresse</label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#F5BD18]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Wilaya</label>
                  <input
                    type="text"
                    value={profile.wilaya}
                    onChange={(e) => setProfile({ ...profile, wilaya: e.target.value })}
                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#F5BD18]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#172235] font-bold text-base mb-2">
                <Globe className="w-5 h-5 text-[#F5BD18]" />
                <span>Choix de la Langue de l’Application</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => {
                    setProfile({ ...profile, language: 'fr' })
                    i18n.changeLanguage('fr')
                    document.documentElement.dir = 'ltr'
                  }}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    profile.language === 'fr'
                      ? 'border-[#F5BD18] bg-[#F5BD18]/5 shadow-sm'
                      : 'border-[#E5E7EB] hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-base text-[#111827]">Français (LTR)</div>
                  <div className="text-xs text-[#667085] mt-1">Interface et documents administratifs en français.</div>
                </div>

                <div
                  onClick={() => {
                    setProfile({ ...profile, language: 'ar' })
                    i18n.changeLanguage('ar')
                    document.documentElement.dir = 'rtl'
                  }}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    profile.language === 'ar'
                      ? 'border-[#F5BD18] bg-[#F5BD18]/5 shadow-sm'
                      : 'border-[#E5E7EB] hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-base text-[#111827]">العربية (RTL)</div>
                  <div className="text-xs text-[#667085] mt-1">واجهة عربية من اليمين إلى اليسار مع فواتير بيداغوجية.</div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#172235] font-bold text-base mb-2">
                <DollarSign className="w-5 h-5 text-[#F5BD18]" />
                <span>Paramètres Commerciaux & Fiscaux</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Taux de TVA par défaut (%)</label>
                  <input
                    type="number"
                    value={profile.default_tax_rate}
                    onChange={(e) => setProfile({ ...profile, default_tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-48 h-10 px-3 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#F5BD18]"
                  />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.allow_negative_stock}
                      onChange={(e) => setProfile({ ...profile, allow_negative_stock: e.target.checked })}
                      className="w-4 h-4 rounded text-[#F5BD18] focus:ring-[#F5BD18]"
                    />
                    <span className="text-sm font-medium text-[#111827]">
                      Autoriser les ventes en stock négatif (Désactivé par défaut)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#172235] font-bold text-base mb-2">
                <Printer className="w-5 h-5 text-[#F5BD18]" />
                <span>Paramètres d'Impression des Tickets</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setProfile({ ...profile, ticket_format: '80mm' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profile.ticket_format === '80mm'
                      ? 'border-[#F5BD18] bg-[#F5BD18]/5 shadow-sm'
                      : 'border-[#E5E7EB] hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm text-[#111827]">Rouleau Thermique 80 mm</div>
                  <div className="text-xs text-[#667085] mt-1">Standard pour caisse et POS.</div>
                </div>

                <div
                  onClick={() => setProfile({ ...profile, ticket_format: '58mm' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profile.ticket_format === '58mm'
                      ? 'border-[#F5BD18] bg-[#F5BD18]/5 shadow-sm'
                      : 'border-[#E5E7EB] hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm text-[#111827]">Rouleau Thermique 58 mm</div>
                  <div className="text-xs text-[#667085] mt-1">Format compact portable.</div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#172235] font-bold text-base mb-2">
                <Database className="w-5 h-5 text-[#F5BD18]" />
                <span>Sauvegarde et Sécurité des Données</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.auto_backup_enabled}
                    onChange={(e) => setProfile({ ...profile, auto_backup_enabled: e.target.checked })}
                    className="w-5 h-5 rounded text-[#F5BD18] focus:ring-[#F5BD18]"
                  />
                  <div>
                    <div className="text-sm font-bold text-[#111827]">Activer les sauvegardes automatiques</div>
                    <div className="text-xs text-[#667085] mt-0.5">
                      Une copie de la base SQLite est créée automatiquement pour protéger vos données commerciales.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-[#F5F6F8] px-8 py-4 border-t border-[#E5E7EB] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-semibold text-[#111827] hover:bg-white transition-all"
            >
              {isAr ? 'السابق' : 'Précédent'}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] rounded-lg text-sm font-bold shadow-xs transition-all"
          >
            <span>{step === 5 ? (isAr ? 'إنهاء وبدء الاستخدام' : 'Terminer et Ouvrir WeFlow') : isAr ? 'التالي' : 'Suivant'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

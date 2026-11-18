import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Globe } from 'lucide-react'
import type { LicenseUiState } from '@shared/types'
import { isRtlLocale } from '@shared/locales'
import logoImg from '../../resources/branding/logo.png'

interface ActivationScreenProps {
  onActivated: (state: LicenseUiState) => void
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivated }) => {
  const { t, i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)

  const [licenseId, setLicenseId] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fr' ? 'ar' : 'fr'
    i18n.changeLanguage(nextLang)
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = nextLang
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseId.trim() || !activationCode.trim()) {
      setErrorMsg(isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Veuillez renseigner tous les champs.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const state = await window.pneusApi.license.activate(licenseId, activationCode)
      if (state.status === 'active') {
        setSuccess(true)
        setTimeout(() => {
          onActivated(state)
        }, 1200)
      } else {
        setErrorMsg(isAr ? 'فشل التفعيل. يرجى التحقق من المفتاح.' : 'Échec de l’activation. Vérifiez vos identifiants.')
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('already')) {
        setErrorMsg(t('license.errors.already'))
      } else if (msg.includes('limit')) {
        setErrorMsg(t('license.errors.limit'))
      } else if (msg.includes('unauthorized') || msg.includes('revoked')) {
        setErrorMsg(t('license.errors.unauthorized'))
      } else if (msg.includes('network')) {
        setErrorMsg(t('license.errors.network'))
      } else {
        setErrorMsg(t('license.errors.invalid'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-[#111827] flex items-center justify-center p-4 relative select-none">
      {/* Language Switch Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#172235] hover:bg-[#1F2937] text-white text-xs font-semibold border border-slate-700 transition-all"
        >
          <Globe className="w-4 h-4 text-[#F5BD18]" />
          <span>{i18n.language === 'fr' ? 'العربية' : 'Français'}</span>
        </button>
      </div>

      {/* Main Activation Card */}
      <div className="w-full max-w-md bg-[#172235] border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Top gold bar accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F5BD18]" />

        {/* Brand Logo & Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#111827] p-2.5 border border-slate-700 shadow-inner mb-4 flex items-center justify-center">
            <img src={logoImg} alt="WeFlow Pneus Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            WeFlow <span className="text-[#F5BD18]">Pneus</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {t('license.subtitle')}
          </p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm font-semibold animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{isAr ? 'تم تفعيل الترخيص بنجاح ! جاري فتح البرنامج...' : 'Licence activée avec succès ! Chargement...'}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs font-medium animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('license.licenseId')}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-slate-500" />
              <input
                type="text"
                value={licenseId}
                onChange={(e) => setLicenseId(e.target.value.toUpperCase())}
                placeholder="DS-XXXX-XXXX-XXXX"
                disabled={loading || success}
                className="w-full h-11 pl-10 pr-3 bg-[#111827] border border-slate-700 rounded-xl text-white text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#F5BD18] focus:border-transparent transition-all uppercase"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('license.activationCode')}
            </label>
            <input
              type="text"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              disabled={loading || success}
              className="w-full h-11 px-3 bg-[#111827] border border-slate-700 rounded-xl text-white text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#F5BD18] focus:border-transparent transition-all uppercase"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full h-12 mt-2 bg-[#F5BD18] hover:bg-[#e0ac13] active:bg-[#c99a0e] text-[#111827] font-extrabold text-sm rounded-xl shadow-lg shadow-[#F5BD18]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('license.activating')}</span>
              </>
            ) : (
              <span>{t('license.activateBtn')}</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center text-[11px] text-slate-500">
          <span>Serveur de licence sécurisé : license.dentisuite.xyz</span>
        </div>
      </div>
    </div>
  )
}

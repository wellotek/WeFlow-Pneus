import React from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Bell, HelpCircle, ShieldCheck, Download, Globe, User } from 'lucide-react'
import type { LicenseUiState } from '@shared/types'
import type { UpdateSnapshot } from '@shared/updates'
import { isRtlLocale } from '@shared/locales'

interface TopBarProps {
  licenseState?: LicenseUiState | null
  updateState?: UpdateSnapshot | null
  onOpenUpdateModal?: () => void
  onSearchChange?: (query: string) => void
}

export const TopBar: React.FC<TopBarProps> = ({
  licenseState,
  updateState,
  onOpenUpdateModal,
  onSearchChange
}) => {
  const { i18n } = useTranslation()
  const currentLang = i18n.language || 'fr'
  const isAr = isRtlLocale(currentLang)

  const toggleLanguage = () => {
    const nextLang = currentLang === 'fr' ? 'ar' : 'fr'
    i18n.changeLanguage(nextLang)
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = nextLang
    window.pneusApi.settings.updateProfile({ language: nextLang }).catch(() => {})
  }

  const isUpdateAvailable = updateState?.phase === 'available' || updateState?.phase === 'ready'

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between shadow-xs select-none">
      {/* Global Search Bar matching screenshots */}
      <div className="relative w-72 sm:w-96">
        <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-[#667085] ${isAr ? 'right-3' : 'left-3'}`} />
        <input
          type="text"
          placeholder={isAr ? 'بحث...' : 'Rechercher...'}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className={`w-full h-9 bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#667085] focus:outline-none focus:ring-2 focus:ring-[#F5BD18] focus:border-transparent transition-all ${
            isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
          }`}
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Auto-update available pill */}
        {isUpdateAvailable && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] text-xs font-bold rounded-lg shadow-xs transition-all animate-pulse"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحديث متوفر' : 'Mise à jour disponible'}</span>
          </button>
        )}

        {/* License status badge */}
        {licenseState?.status === 'active' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'ترخيص دائم' : 'Licence Permanente'}</span>
          </div>
        )}

        {/* Language switch button */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F5F6F8] text-xs font-semibold text-[#111827] transition-all"
          title="Changer de langue / تغيير اللغة"
        >
          <Globe className="w-4 h-4 text-[#F5BD18]" />
          <span>{currentLang === 'fr' ? 'العربية' : 'Français'}</span>
        </button>

        {/* Notification bell */}
        <div className="relative p-2 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F8] rounded-lg cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </div>

        {/* Help icon */}
        <div className="p-2 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F8] rounded-lg cursor-pointer">
          <HelpCircle className="w-4 h-4" />
        </div>

        {/* User profile avatar matching screenshots ("Admin - Réda K.") */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB]">
          <div className="w-8 h-8 rounded-full bg-[#172235] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <User className="w-4 h-4 text-[#F5BD18]" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-[#111827] leading-tight">Admin - Réda K.</span>
            <span className="text-[10px] text-[#667085]">Directeur Magasin</span>
          </div>
        </div>
      </div>
    </header>
  )
}

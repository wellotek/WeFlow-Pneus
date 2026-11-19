import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Bell, HelpCircle, ShieldCheck, Download, Globe, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
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

  const [zoomFactor, setZoomFactor] = useState<number>(1.0)

  useEffect(() => {
    if (window.pneusApi?.app?.getZoom) {
      window.pneusApi.app.getZoom().then((val) => {
        if (typeof val === 'number') {
          setZoomFactor(val)
        }
      }).catch(() => {})
    }

    // Keyboard listener to update TopBar UI when Ctrl +/-/0 is pressed
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === '+' || e.key === '=' || e.key === 'Add') {
          setZoomFactor((prev) => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10))
        } else if (e.key === '-' || e.key === 'Subtract') {
          setZoomFactor((prev) => Math.max(0.8, Math.round((prev - 0.1) * 10) / 10))
        } else if (e.key === '0') {
          setZoomFactor(1.0)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleZoomChange = async (newVal: number) => {
    const clamped = Math.min(1.5, Math.max(0.8, Math.round(newVal * 10) / 10))
    setZoomFactor(clamped)
    if (window.pneusApi?.app?.setZoom) {
      await window.pneusApi.app.setZoom(clamped)
    }
  }

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
      <div className="relative w-72 sm:w-80">
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
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Zoom Controls (80% - 150%) */}
        <div className="flex items-center bg-[#F5F6F8] border border-[#E5E7EB] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => handleZoomChange(zoomFactor - 0.1)}
            disabled={zoomFactor <= 0.8}
            className="p-1.5 hover:bg-white disabled:opacity-30 rounded text-[#111827] transition-all"
            title="Zoom arrière (Ctrl -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoomChange(1.0)}
            className="px-2 py-0.5 font-bold text-[11px] text-[#111827] hover:text-[#F5BD18] transition-all"
            title="Réinitialiser zoom 100% (Ctrl 0)"
          >
            {Math.round(zoomFactor * 100)}%
          </button>
          <button
            onClick={() => handleZoomChange(zoomFactor + 0.1)}
            disabled={zoomFactor >= 1.5}
            className="p-1.5 hover:bg-white disabled:opacity-30 rounded text-[#111827] transition-all"
            title="Zoom avant (Ctrl +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

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
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
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

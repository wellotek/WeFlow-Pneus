import React from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { UpdateSnapshot } from '@shared/updates'

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
  updateState: UpdateSnapshot | null
  onDownload: () => Promise<void>
  onInstall: () => Promise<void>
  onCheck: () => Promise<void>
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateState,
  onDownload,
  onInstall,
  onCheck
}) => {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  if (!isOpen) return null

  const phase = updateState?.phase || 'idle'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#172235] px-6 py-4 flex items-center justify-between text-white border-b border-[#111827]">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-[#F5BD18]" />
            <h3 className="font-bold text-base">
              {isAr ? 'تحديث برنامج WeFlow Pneus' : 'Mise à jour WeFlow Pneus'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700/60 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Versions info */}
          <div className="flex items-center justify-between p-3.5 bg-[#F5F6F8] rounded-xl border border-[#E5E7EB] text-sm">
            <div>
              <span className="text-xs text-[#667085] block">{isAr ? 'الإصدار الحالي' : 'Version actuelle'}</span>
              <strong className="text-[#111827]">{updateState?.currentVersion || '1.0.0'}</strong>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#667085] block">{isAr ? 'الإصدار الجديد' : 'Nouvelle version'}</span>
              <strong className="text-[#F5BD18]">{updateState?.availableVersion || 'v1.0.1'}</strong>
            </div>
          </div>

          {/* Release Notes */}
          {updateState?.releaseNotes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#111827] max-h-32 overflow-y-auto">
              <div className="font-bold mb-1">{isAr ? 'ملاحظات الإصدار:' : 'Notes de version :'}</div>
              <p className="whitespace-pre-line text-[#667085]">{updateState.releaseNotes}</p>
            </div>
          )}

          {/* Progress bar during download */}
          {phase === 'downloading' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#111827]">
                <span>{isAr ? 'جاري التحميل...' : 'Téléchargement en cours...'}</span>
                <span>{updateState?.percent || 0}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F5BD18] transition-all duration-300"
                  style={{ width: `${updateState?.percent || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Ready state */}
          {phase === 'ready' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isAr
                  ? 'تم تحميل التحديث بنجاح. انقر على تثبيت وإعادة التشغيل.'
                  : 'Mise à jour téléchargée. Cliquez sur Installer et Redémarrer.'}
              </span>
            </div>
          )}

          {/* Error state */}
          {phase === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{updateState?.error || 'Erreur lors de la mise à jour'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F5F6F8] px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] hover:bg-white transition-all"
          >
            {isAr ? 'إغلاق' : 'Fermer'}
          </button>

          {phase === 'available' && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تحميل التحديث' : 'Télécharger la mise à jour'}</span>
            </button>
          )}

          {phase === 'ready' && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isAr ? 'تثبيت وإعادة التشغيل' : 'Installer et Redémarrer'}</span>
            </button>
          )}

          {phase === 'error' && (
            <button
              onClick={onCheck}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#172235] hover:bg-[#111827] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isAr ? 'إعادة المحاولة' : 'Réessayer'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

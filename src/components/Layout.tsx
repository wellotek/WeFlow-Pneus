import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  Disc,
  Boxes,
  ShoppingBag,
  Truck,
  Wrench,
  Calendar,
  ShieldAlert,
  Wallet,
  BarChart3,
  Settings,
  CreditCard
} from 'lucide-react'
import type { LicenseUiState } from '@shared/types'
import type { UpdateSnapshot } from '@shared/updates'
import { isRtlLocale } from '@shared/locales'
import { TopBar } from './TopBar'
import logoImg from '../../resources/branding/logo.png'

interface LayoutProps {
  children?: React.ReactNode
  appVersion?: string
  licenseState?: LicenseUiState | null
  updateState?: UpdateSnapshot | null
  onOpenUpdateModal?: () => void
}

interface NavModule {
  id: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  labelFr: string
  labelAr: string
}

const NAV_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    labelFr: 'Tableau de bord',
    labelAr: 'لوحة التحكم'
  },
  {
    id: 'pos',
    path: '/pos',
    icon: CreditCard,
    labelFr: 'Point de Vente (POS)',
    labelAr: 'نقطة البيع (POS)'
  },
  {
    id: 'sales',
    path: '/sales',
    icon: ShoppingCart,
    labelFr: 'Ventes & Facturation',
    labelAr: 'المبيعات'
  },
  {
    id: 'quotations',
    path: '/quotations',
    icon: FileText,
    labelFr: 'Devis & Factures',
    labelAr: 'عروض الأسعار والفواتير'
  },
  {
    id: 'customers',
    path: '/customers',
    icon: Users,
    labelFr: 'Clients & Véhicules',
    labelAr: 'الزبائن والسيارات'
  },
  {
    id: 'tires',
    path: '/tires',
    icon: Disc,
    labelFr: 'Pneus & Références',
    labelAr: 'العجلات والمراجع'
  },
  {
    id: 'stock',
    path: '/stock',
    icon: Boxes,
    labelFr: 'Stocks & Inventaire',
    labelAr: 'المخزون'
  },
  {
    id: 'purchases',
    path: '/purchases',
    icon: ShoppingBag,
    labelFr: 'Achats & Commandes',
    labelAr: 'المشتريات'
  },
  {
    id: 'suppliers',
    path: '/suppliers',
    icon: Truck,
    labelFr: 'Fournisseurs',
    labelAr: 'الموردون'
  },
  {
    id: 'workshop',
    path: '/workshop',
    icon: Wrench,
    labelFr: 'Services Atelier',
    labelAr: 'خدمات الورشة'
  },
  {
    id: 'appointments',
    path: '/appointments',
    icon: Calendar,
    labelFr: 'Rendez-vous',
    labelAr: 'المواعيد'
  },
  {
    id: 'warranties',
    path: '/warranties',
    icon: ShieldAlert,
    labelFr: 'Garanties & Retours',
    labelAr: 'الضمانات والإرجاع'
  },
  {
    id: 'cash',
    path: '/cash',
    icon: Wallet,
    labelFr: 'Caisse & Dépenses',
    labelAr: 'الصندوق والمصاريف'
  },
  {
    id: 'reports',
    path: '/reports',
    icon: BarChart3,
    labelFr: 'Rapports & Stats',
    labelAr: 'التقارير'
  },
  {
    id: 'settings',
    path: '/settings',
    icon: Settings,
    labelFr: 'Paramètres',
    labelAr: 'الإعدادات'
  }
]

export const Layout: React.FC<LayoutProps> = ({
  children,
  appVersion,
  licenseState,
  updateState,
  onOpenUpdateModal
}) => {
  const { i18n } = useTranslation()
  const isAr = isRtlLocale(i18n.language)
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6F8] font-sans select-none">
      {/* Sidebar - Dark Navy #172235 */}
      <aside className="w-64 sm:w-72 bg-[#172235] text-slate-300 flex flex-col shrink-0 border-e border-[#111827] shadow-xl z-40">
        {/* Header with Official Logo */}
        <div className="h-20 flex items-center px-4 border-b border-slate-800/80 bg-[#111827]/70 gap-3">
          <img
            src={logoImg}
            alt="WeFlow Pneus Logo"
            className="h-11 w-11 object-contain drop-shadow"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-base tracking-wide leading-tight">
              WeFlow <span className="text-[#F5BD18]">Pneus</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              {isAr ? 'برنامج إدارة المحل' : 'Tire Shop Management'}
            </span>
          </div>
        </div>

        {/* Navigation - Exact 14 modules */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          {NAV_MODULES.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1F2937] text-white font-bold shadow-md shadow-black/20 ring-1 ring-[#F5BD18]/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-[#F5BD18] scale-110' : 'text-slate-400 group-hover:text-[#F5BD18]'
                  }`}
                />
                <span className="truncate flex-1">
                  {isAr ? item.labelAr : item.labelFr}
                </span>

                {/* Golden Yellow Accent indicator */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5BD18] shrink-0 shadow-xs" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer Sidebar info */}
        <div className="p-3 border-t border-slate-800/80 bg-[#111827]/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-base" role="img" aria-label="Algeria">
              🇩🇿
            </span>
            <span className="text-slate-300 font-semibold">
              {isAr ? 'الجزائر' : 'Algérie'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">v{appVersion || '1.0.0'}</span>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          licenseState={licenseState}
          updateState={updateState}
          onOpenUpdateModal={onOpenUpdateModal}
        />

        <main className="flex-1 overflow-y-auto bg-[#F5F6F8] p-4 sm:p-6 custom-scrollbar">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

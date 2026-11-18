import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActivationScreen } from './components/ActivationScreen'
import { OnboardingWizard } from './components/OnboardingWizard'
import { UpdateModal } from './components/UpdateModal'

// Pages
import { Dashboard } from './pages/Dashboard'
import { Sales } from './pages/Sales'
import { Quotations } from './pages/Quotations'
import { Customers } from './pages/Customers'
import { Tires } from './pages/Tires'
import { Stock } from './pages/Stock'
import { Purchases } from './pages/Purchases'
import { Suppliers } from './pages/Suppliers'
import { Workshop } from './pages/Workshop'
import { Appointments } from './pages/Appointments'
import { WarrantiesPage } from './pages/Warranties'
import { CashRegisterPage } from './pages/CashRegister'
import { Reports } from './pages/Reports'
import { SettingsPage } from './pages/Settings'

import type { LicenseUiState, UpdateSnapshot } from '../shared/types'
import { APP_VERSION } from '../shared/version'

export const App: React.FC = () => {
  const [licenseState, setLicenseState] = useState<LicenseUiState | null>(null)
  const [checkingLicense, setCheckingLicense] = useState(true)
  const [isOnboardingNeeded, setIsOnboardingNeeded] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  // Auto-Update State
  const [updateState, setUpdateState] = useState<UpdateSnapshot | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  // License Check on Mount
  useEffect(() => {
    let unsubscribeUpdater: (() => void) | undefined

    const init = async () => {
      try {
        if (window.pneusApi?.license) {
          const status = await window.pneusApi.license.getStatus()
          setLicenseState(status)
        } else {
          // Dev preview fallback
          setLicenseState({
            status: 'active',
            licenseId: 'DEV-DEMO-2024',
            lastValidatedAt: new Date().toISOString()
          })
        }
      } catch (err) {
        console.error('License check error:', err)
      } finally {
        setCheckingLicense(false)
      }

      // Check Onboarding
      try {
        if (window.pneusApi?.settings) {
          const profile = await window.pneusApi.settings.getProfile()
          if (!profile || !profile.store_name) {
            setIsOnboardingNeeded(true)
          }
        }
      } catch (err) {
        console.error('Settings profile check error:', err)
      } finally {
        setCheckingOnboarding(false)
      }

      // Listen to auto-updater changes
      try {
        if (window.pneusApi?.updater) {
          unsubscribeUpdater = window.pneusApi.updater.onStatusChange((snap) => {
            setUpdateState(snap)
            if (snap.phase === 'ready' || snap.phase === 'available') {
              setShowUpdateModal(true)
            }
          })
        }
      } catch (err) {
        console.error('Updater subscription error:', err)
      }
    }

    init()

    return () => {
      if (unsubscribeUpdater) unsubscribeUpdater()
    }
  }, [])

  if (checkingLicense || checkingOnboarding) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#111827] text-white">
        <div className="w-12 h-12 border-4 border-[#F5BD18] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-wide">WEFLOW PNEUS</h2>
        <p className="text-sm text-gray-400 mt-1">Démarrage du système...</p>
      </div>
    )
  }

  // 1. Mandatory Activation SAS Screen if not active or offline grace
  const isLicenseActive =
    licenseState &&
    (licenseState.status === 'active' || licenseState.status === 'offline')

  if (!isLicenseActive) {
    return (
      <ActivationScreen
        onActivated={(state) => {
          setLicenseState(state)
        }}
      />
    )
  }

  // 2. First Run Onboarding Wizard
  if (isOnboardingNeeded) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setIsOnboardingNeeded(false)
        }}
      />
    )
  }

  // 3. Main ERP Application Shell
  return (
    <HashRouter>
      <Layout
        appVersion={APP_VERSION}
        licenseState={licenseState}
        updateState={updateState}
        onOpenUpdateModal={() => setShowUpdateModal(true)}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/tires" element={<Tires />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/workshop" element={<Workshop />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/warranties" element={<WarrantiesPage />} />
          <Route path="/cash" element={<CashRegisterPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>

      {/* Auto-Update Notification / Installation Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateState={updateState}
        onCheck={async () => {
          if (window.pneusApi?.updater?.check) {
            await window.pneusApi.updater.check()
          }
        }}
        onDownload={async () => {
          if (window.pneusApi?.updater?.download) {
            await window.pneusApi.updater.download()
          }
        }}
        onInstall={async () => {
          if (window.pneusApi?.updater?.install) {
            await window.pneusApi.updater.install()
          }
        }}
      />
    </HashRouter>
  )
}

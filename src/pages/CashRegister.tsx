import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Lock,
  Unlock,
  Printer,
  DollarSign,
  Receipt,
  AlertCircle,
  CheckCircle,
  X,
  CreditCard
} from 'lucide-react'
import type { CashSession, CashMovement, Expense, ExpenseCategory, PaymentMethod } from '../../shared/types'
import { formatDA } from '../../shared/locales'

export const CashRegisterPage: React.FC = () => {
  const { t } = useTranslation()
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [activeTab, setActiveTab] = useState<'movements' | 'expenses'>('movements')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  // Form states
  const [initialCash, setInitialCash] = useState<number>(10000)
  const [actualCash, setActualCash] = useState<number>(0)
  const [closeNotes, setCloseNotes] = useState<string>('')

  const [movementForm, setMovementForm] = useState({
    type: 'in' as 'in' | 'out',
    category: 'apport',
    amount: 1000,
    method: 'cash' as PaymentMethod,
    description: ''
  })

  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'supplies' as ExpenseCategory,
    amount: 2500,
    payment_method: 'cash' as PaymentMethod,
    paid_to: '',
    receipt_ref: '',
    description: ''
  })

  const loadData = async () => {
    try {
      setLoading(true)
      if (window.pneusApi?.cash) {
        const session = await window.pneusApi.cash.getCurrentSession()
        setCurrentSession(session)

        const movs = await window.pneusApi.cash.listMovements(session?.id)
        setMovements(movs || [])
      }

      if (window.pneusApi?.expenses) {
        const exps = await window.pneusApi.expenses.list()
        setExpenses(exps || [])
      }
    } catch (err) {
      console.error('Failed to load cash data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.pneusApi.cash.openSession(Number(initialCash), 'Ouverture manuelle')
      setShowOpenModal(false)
      await loadData()
    } catch (err: any) {
      alert(`Erreur d'ouverture de caisse: ${err.message}`)
    }
  }

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const closed = await window.pneusApi.cash.closeSession(Number(actualCash), closeNotes)
      setShowCloseModal(false)
      // Print closing Z
      if (window.pneusApi?.documents?.printClosingZ) {
        if (confirm('Session fermée avec succès ! Voulez-vous imprimer le Ticket Z de clôture ?')) {
          await window.pneusApi.documents.printClosingZ(closed.id)
        }
      }
      await loadData()
    } catch (err: any) {
      alert(`Erreur de clôture: ${err.message}`)
    }
  }

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.pneusApi.cash.addMovement(
        movementForm.type,
        movementForm.category,
        Number(movementForm.amount),
        movementForm.method,
        movementForm.description
      )
      setShowMovementModal(false)
      setMovementForm({
        type: 'in',
        category: 'apport',
        amount: 1000,
        method: 'cash',
        description: ''
      })
      await loadData()
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.pneusApi.expenses.create({
        ...expenseForm,
        amount: Number(expenseForm.amount)
      })
      setShowExpenseModal(false)
      setExpenseForm({
        date: new Date().toISOString().slice(0, 10),
        category: 'supplies',
        amount: 2500,
        payment_method: 'cash',
        paid_to: '',
        receipt_ref: '',
        description: ''
      })
      await loadData()
    } catch (err: any) {
      alert(`Erreur d'ajout de la dépense: ${err.message}`)
    }
  }

  // Calculations
  const totalCashIn = movements
    .filter((m) => m.type === 'in' && m.payment_method === 'cash')
    .reduce((sum, m) => sum + m.amount, 0)

  const totalCashOut = movements
    .filter((m) => m.type === 'out' && m.payment_method === 'cash')
    .reduce((sum, m) => sum + m.amount, 0)

  const theoreticalCash = (currentSession?.initial_cash || 0) + totalCashIn - totalCashOut

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-primary" />
            {t('nav.cash')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion du tiroir-caisse, des sessions de caisse et suivi des dépenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentSession?.status === 'open' ? (
            <>
              <button
                onClick={() => setShowMovementModal(true)}
                className="btn-secondary inline-flex items-center gap-2 px-3.5 py-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Mouvement Caisse
              </button>
              <button
                onClick={() => {
                  setActualCash(theoreticalCash)
                  setShowCloseModal(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-colors"
              >
                <Lock className="w-4 h-4" />
                Clôturer la Caisse (Z)
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-sm"
            >
              <Unlock className="w-4 h-4" />
              Ouvrir la Caisse
            </button>
          )}
        </div>
      </div>

      {/* Session Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                currentSession?.status === 'open'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {currentSession?.status === 'open' ? (
                <Unlock className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {currentSession?.status === 'open'
                    ? 'Session de caisse en cours'
                    : 'Caisse fermée'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    currentSession?.status === 'open'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {currentSession?.status === 'open' ? 'Active' : 'Fermée'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {currentSession?.status === 'open'
                  ? `Ouverte le ${currentSession.opened_at.replace('T', ' à ')} • Fond initial: ${formatDA(currentSession.initial_cash)}`
                  : 'Ouvrez une nouvelle session pour commencer à enregistrer des règlements en espèces.'}
              </p>
            </div>
          </div>

          {currentSession?.status === 'open' && (
            <div className="flex items-center gap-6 divide-x divide-gray-100 border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto">
              <div className="text-left px-3">
                <span className="text-xs text-gray-400 block font-medium">Entrées Espèces</span>
                <span className="text-sm font-bold text-emerald-600">+{formatDA(totalCashIn)}</span>
              </div>
              <div className="text-left px-3">
                <span className="text-xs text-gray-400 block font-medium">Sorties Espèces</span>
                <span className="text-sm font-bold text-rose-600">-{formatDA(totalCashOut)}</span>
              </div>
              <div className="text-left pl-3">
                <span className="text-xs text-gray-400 block font-medium">Total Espèces Attendu</span>
                <span className="text-xl font-extrabold text-gray-900">
                  {formatDA(theoreticalCash)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex items-center justify-between">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'movements'
                ? 'border-primary text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Mouvements de Caisse ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'expenses'
                ? 'border-primary text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Journal des Dépenses ({expenses.length})
          </button>
        </nav>

        {activeTab === 'expenses' && (
          <button
            onClick={() => setShowExpenseModal(true)}
            className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs mb-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter une dépense
          </button>
        )}
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'movements' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date / Heure</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Aucun mouvement de caisse pour cette session.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">
                        {m.created_at.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-3.5 px-4">
                        {m.type === 'in' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
                            <ArrowDownRight className="w-3.5 h-3.5" /> Entrée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs bg-rose-50 px-2 py-0.5 rounded-full">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Sortie
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 capitalize">
                        {m.category}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{m.description || '—'}</td>
                      <td className="py-3.5 px-4 capitalize text-gray-600">{m.payment_method}</td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold font-mono ${
                          m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.type === 'in' ? '+' : '-'} {formatDA(m.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Bénéficiaire</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Réf Justificatif</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Aucune dépense enregistrée.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{e.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">{e.paid_to || '—'}</td>
                      <td className="py-3.5 px-4 text-gray-600">{e.description}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                        {e.receipt_ref || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600 font-mono">
                        -{formatDA(e.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Open Cash Session */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-dark-navy text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Unlock className="w-5 h-5 text-primary" />
                Ouverture de Session de Caisse
              </h2>
              <button
                onClick={() => setShowOpenModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleOpenSession} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fond de caisse initial (DA) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={initialCash}
                  onChange={(e) => setInitialCash(Number(e.target.value))}
                  className="input-field w-full text-lg font-bold text-gray-900"
                  placeholder="Ex: 10000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Montant en espèces présent physiquement dans le tiroir au démarrage.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary px-5 py-2">
                  Confirmer et Ouvrir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Cash Session (Closing Z) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-dark-navy text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Clôture de Caisse (Ticket Z)
              </h2>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCloseSession} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fond initial :</span>
                  <span className="font-semibold text-gray-900">
                    {formatDA(currentSession?.initial_cash || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Espèces Attendu :</span>
                  <span className="font-bold text-gray-900">{formatDA(theoreticalCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Espèces réelles comptées (DA) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={actualCash}
                  onChange={(e) => setActualCash(Number(e.target.value))}
                  className="input-field w-full text-lg font-bold text-gray-900"
                />
              </div>

              {/* Difference calculation */}
              <div
                className={`p-3 rounded-lg text-sm flex items-center justify-between ${
                  actualCash - theoreticalCash === 0
                    ? 'bg-emerald-50 text-emerald-800'
                    : actualCash - theoreticalCash > 0
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-rose-50 text-rose-800'
                }`}
              >
                <span className="font-medium">Écart de caisse :</span>
                <span className="font-bold font-mono">
                  {actualCash - theoreticalCash >= 0 ? '+' : ''}
                  {formatDA(actualCash - theoreticalCash)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observations / Justification d'écart
                </label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="input-field w-full text-xs"
                  placeholder="Notes de clôture, justification éventuelle..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Clôturer la Caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Cash Movement */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-dark-navy text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Mouvement de Caisse Manuel
              </h2>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMovement} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, type: 'in' })}
                  className={`py-2 text-center rounded-lg font-semibold text-xs border ${
                    movementForm.type === 'in'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  Entrée (+)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, type: 'out' })}
                  className={`py-2 text-center rounded-lg font-semibold text-xs border ${
                    movementForm.type === 'out'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  Sortie (-)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Montant (DA) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementForm.amount}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, amount: Number(e.target.value) })
                  }
                  className="input-field w-full font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catégorie *</label>
                <input
                  type="text"
                  required
                  value={movementForm.category}
                  onChange={(e) => setMovementForm({ ...movementForm, category: e.target.value })}
                  className="input-field w-full"
                  placeholder="Ex: apport, retrait dirigeant, monnaie..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={movementForm.description}
                  onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Justification..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary px-5 py-2">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-dark-navy text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Enregistrer une Dépense
              </h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Catégorie *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        category: e.target.value as ExpenseCategory
                      })
                    }
                    className="input-field w-full capitalize"
                  >
                    <option value="rent">Loyer</option>
                    <option value="electricity">Électricité / Eau / Gaz</option>
                    <option value="salaries">Salaires / Avances</option>
                    <option value="transport">Transport / Carburant</option>
                    <option value="supplies">Fournitures / Consommables</option>
                    <option value="maintenance">Entretien outillage / Équipement</option>
                    <option value="other">Autre charge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Montant (DA) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })
                  }
                  className="input-field w-full font-bold text-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payé à / Fournisseur</label>
                  <input
                    type="text"
                    value={expenseForm.paid_to}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paid_to: e.target.value })}
                    className="input-field w-full"
                    placeholder="Sonelgaz / Propriétaire..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">N° Reçu / Quittance</label>
                  <input
                    type="text"
                    value={expenseForm.receipt_ref}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receipt_ref: e.target.value })}
                    className="input-field w-full"
                    placeholder="Q-2024-88"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Motif *</label>
                <textarea
                  required
                  rows={2}
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Détail de la dépense..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary px-5 py-2">
                  Enregistrer la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

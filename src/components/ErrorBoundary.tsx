import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#F5F6F8] flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#111827]">Une erreur inattendue est survenue</h2>
            <p className="text-xs text-[#667085] mt-1 mb-4">
              {this.state.error?.message || 'Erreur d’affichage'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5BD18] hover:bg-[#e0ac13] text-[#111827] text-xs font-bold rounded-lg shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recharger l'application</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

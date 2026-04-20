// app/components/ErrorBoundary.tsx
// React error boundary — catches render errors and shows a recovery UI.
// Wrap around page sections that shouldn't crash the entire app.
'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional fallback component. Defaults to a styled error card. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; could wire to Sentry in production
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center my-6">
          <p className="text-red-700 font-bold text-sm mb-2">Something went wrong</p>
          <p className="text-red-600 text-xs font-medium mb-4">
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

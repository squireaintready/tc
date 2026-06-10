import { Component } from 'react'

// Last-resort guard: a render crash shows a reload screen instead of a blank page
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error('App crashed:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ height: '100svh', background: 'var(--bg)' }}>
        <span className="text-app-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </span>
        <span className="text-app-base" style={{ color: 'var(--text-secondary)' }}>
          Your data is safe. Reload to keep going.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-[var(--btn-py)] rounded-lg font-bold text-app-base active:scale-[0.98] transition-all"
          style={{ background: 'var(--accent)', color: 'var(--btn-text)' }}
        >
          Reload
        </button>
      </div>
    )
  }
}

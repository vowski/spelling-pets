import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ onError: (e: Error) => void; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

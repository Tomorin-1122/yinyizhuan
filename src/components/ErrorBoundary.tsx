import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-parchment-50 dark:bg-gray-950">
          <div className="max-w-md mx-auto text-center px-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-vermilion-100 dark:bg-vermilion-900/30 flex items-center justify-center">
              <span className="text-3xl">⚠</span>
            </div>
            <h1 className="text-xl font-display font-bold text-ink-950 dark:text-gray-100 mb-3">
              页面出现错误
            </h1>
            <p className="text-sm text-ink-500 dark:text-gray-400 mb-6">
              {this.state.error?.message || '发生了未知错误，请刷新页面重试。'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-primary text-sm"
              >
                重试
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-secondary text-sm"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

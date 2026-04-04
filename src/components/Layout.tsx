import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconEdit, IconHistory, IconMoon, IconSun } from './Icons'
import { getTheme, toggleTheme } from '../lib/theme'
import { useEffect, useState } from 'react'

function IconInfo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

const navItems = [
  { path: '/', label: '首页', icon: IconHome },
  { path: '/convert', label: '格式转换', icon: IconEdit },
  { path: '/history', label: '历史记录', icon: IconHistory },
  { path: '/about', label: '关于', icon: IconInfo },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [dark, setDark] = useState(getTheme() === 'dark')

  useEffect(() => {
    setDark(getTheme() === 'dark')
  }, [])

  const handleToggleTheme = () => {
    toggleTheme()
    setDark(!dark)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-ink-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-8 h-8 bg-ink-950 dark:bg-vermilion-600 flex items-center justify-center transition-colors duration-200 group-hover:bg-vermilion-600">
              <span className="text-parchment-50 font-display font-bold text-sm">引</span>
            </div>
            <span className="font-display font-bold text-xl text-ink-950 dark:text-gray-100 tracking-wider">引易转</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-2 sm:px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer border-b-2 -mb-[2px] ${
                      isActive
                        ? 'border-ink-950 dark:border-vermilion-500 text-ink-950 dark:text-gray-100'
                        : 'border-transparent text-ink-500 dark:text-gray-400 hover:text-ink-800 dark:hover:text-gray-200 hover:border-ink-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <button
              onClick={handleToggleTheme}
              className="p-2 text-ink-500 dark:text-gray-400 hover:text-ink-950 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-ink-100 dark:hover:bg-gray-800"
              title={dark ? '切换为亮色模式' : '切换为黑夜模式'}
            >
              {dark ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t-2 border-ink-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-ink-500 dark:text-gray-400 mb-3">
            <span className="font-display">引易转 &mdash; 学术引用格式转换工具</span>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">数据存储于本地浏览器，安全私密</span>
              <a
                href="https://github.com/Tomorin-1122/yinyizhuan"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-ink-400 dark:text-gray-500 hover:text-ink-950 dark:hover:text-gray-100 transition-colors duration-200 cursor-pointer"
                aria-label="GitHub"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
          <div className="border-t border-ink-100 dark:border-gray-800 pt-3 text-xs text-ink-400 dark:text-gray-500">
            <p className="mb-1">
              &copy; 2026 引易转团队 版权所有。本软件及其所有内容受版权法保护，未经许可不得复制、分发或修改。本网站提供的引用格式转换功能基于公开的学术引用标准，我们致力于提供准确的转换结果，但不对因使用本网站而产生的任何直接或间接损失承担责任。
              <Link to="/about#disclaimer" className="ml-1 underline underline-offset-2 hover:text-ink-700 dark:hover:text-gray-300 transition-colors">使用条款和隐私声明</Link>
            </p>
            <p className="text-ink-300 dark:text-gray-600">ICP备案号：待备案</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

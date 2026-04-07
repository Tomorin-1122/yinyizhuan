/**
 * 黑夜模式主题管理
 */

const THEME_KEY = 'yyz_theme'

export type ThemeMode = 'light' | 'dark'

/** 获取当前主题 */
export function getTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  // 默认跟随系统
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 设置主题 */
export function setTheme(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode)
  applyTheme(mode)
}

/** 切换主题 */
export function toggleTheme(): ThemeMode {
  const current = getTheme()
  const next = current === 'light' ? 'dark' : 'light'
  setTheme(next)
  return next
}

/** 应用主题到 DOM */
function applyTheme(mode: ThemeMode): void {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/** 初始化（在应用启动时调用） */
export function initTheme(): void {
  applyTheme(getTheme())
}

/** 监听系统主题变化 */
export function watchSystemTheme(onChange: (mode: ThemeMode) => void): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem(THEME_KEY)) {
      const mode = e.matches ? 'dark' : 'light'
      applyTheme(mode)
      onChange(mode)
    }
  }
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}

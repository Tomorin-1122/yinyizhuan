import { useState } from 'react'
import { unlock } from '../lib/access'

export default function InvitePage({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (unlock(code)) {
      onUnlock()
    } else {
      setError('邀请码错误，请重试')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      setCode('')
    }
  }

  return (
    <div className="min-h-screen bg-parchment-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-ink-950 flex items-center justify-center mx-auto mb-4">
            <span className="text-parchment-50 font-display font-bold text-2xl">引</span>
          </div>
          <h1 className="font-display font-black text-3xl text-ink-950 tracking-wider">引易转</h1>
          <p className="text-ink-500 text-sm mt-2">学术引用格式转换工具</p>
        </div>

        {/* Card */}
        <div className="border-2 border-ink-200 bg-white p-8">
          <h2 className="font-display font-bold text-lg text-ink-950 mb-1">输入邀请码</h2>
          <p className="text-ink-500 text-sm mb-6">本工具仅限受邀用户使用</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={shaking ? 'animate-[shake_0.4s_ease]' : ''}>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setError('') }}
                className="input-field text-center text-xl font-mono tracking-[0.5em]"
                placeholder="- - - -"
                maxLength={20}
                autoFocus
              />
              {error && (
                <p className="text-vermilion-600 text-sm mt-2 text-center">{error}</p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={!code.trim()}>
              进入
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          MIT License &copy; {new Date().getFullYear()} Tomorin-1122 &nbsp;&mdash;&nbsp; 仅供个人学习科研使用
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

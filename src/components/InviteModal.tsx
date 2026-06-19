import { useState } from 'react'
import { IconX } from './Icons'
import { unlock } from '../lib/access'

interface InviteModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (msg: string) => void
}

export default function InviteModal({ open, onClose, onSuccess, onToast }: InviteModalProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [shaking, setShaking] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    if (await unlock(inviteCode)) {
      onClose()
      setInviteCode('')
      setInviteError('')
      onSuccess()
      onToast('邀请码验证成功，已解锁每日100次！')
    } else {
      setInviteError('邀请码错误，请重试')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      setInviteCode('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
      <div className="bg-white border-2 border-ink-200 p-8 w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display font-bold text-lg text-ink-950">输入邀请码解锁</h3>
          <button onClick={() => { onClose(); setInviteCode(''); setInviteError('') }} className="btn-ghost px-2 py-1">
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <p className="text-ink-500 text-sm mb-6">你已用完 10 次免费试用，输入邀请码后每日可转换 100 次</p>
        <div className={shaking ? 'animate-[shake_0.4s_ease]' : ''}>
          <input
            type="text"
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value); setInviteError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="input-field text-center text-xl font-mono tracking-[0.5em] mb-2"
            placeholder="- - - -"
            autoFocus
          />
          {inviteError && <p className="text-vermilion-600 text-sm text-center mb-2">{inviteError}</p>}
        </div>
        <button onClick={handleSubmit} className="btn-primary w-full mt-2" disabled={!inviteCode.trim()}>
          确认
        </button>
      </div>
    </div>
  )
}

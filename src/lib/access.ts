const INVITE_CODE = '1031'
const ADMIN_KEY = 'yyz_admin'
const UNLOCK_KEY = 'yyz_unlocked'
const DAILY_KEY = 'yyz_daily'
const TRIAL_KEY = 'yyz_trial'
const TRIAL_LIMIT = 10
const DAILY_LIMIT = 100

export function isAdmin(): boolean {
  return localStorage.getItem(ADMIN_KEY) === 'true'
}

export function isUnlocked(): boolean {
  return isAdmin() || localStorage.getItem(UNLOCK_KEY) === 'true'
}

export function unlock(code: string): boolean {
  if (code.trim() === INVITE_CODE) {
    localStorage.setItem(UNLOCK_KEY, 'true')
    return true
  }
  return false
}

// 试用次数（累计，不重置）
export function getTrialCount(): number {
  return parseInt(localStorage.getItem(TRIAL_KEY) || '0', 10)
}

export function getTrialRemaining(): number {
  return Math.max(0, TRIAL_LIMIT - getTrialCount())
}

export function isTrialExhausted(): boolean {
  return !isUnlocked() && getTrialCount() >= TRIAL_LIMIT
}

function recordTrial(): void {
  const count = getTrialCount() + 1
  localStorage.setItem(TRIAL_KEY, String(count))
}

// 每日次数（解锁后生效）
interface DailyRecord {
  date: string
  count: number
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function getDailyRecord(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (raw) {
      const rec: DailyRecord = JSON.parse(raw)
      if (rec.date === todayStr()) return rec
    }
  } catch (_) {}
  return { date: todayStr(), count: 0 }
}

export function getRemainingCount(): number {
  if (isAdmin()) return Infinity
  if (!isUnlocked()) return getTrialRemaining()
  return Math.max(0, DAILY_LIMIT - getDailyRecord().count)
}

// 返回 'ok' | 'need_invite' | 'daily_limit'
export function canConvert(): 'ok' | 'need_invite' | 'daily_limit' {
  if (isAdmin()) return 'ok'
  if (!isUnlocked()) {
    if (getTrialCount() < TRIAL_LIMIT) return 'ok'
    return 'need_invite'
  }
  if (getDailyRecord().count < DAILY_LIMIT) return 'ok'
  return 'daily_limit'
}

export function recordConversion(): void {
  if (isAdmin()) return
  if (!isUnlocked()) {
    recordTrial()
    return
  }
  const rec = getDailyRecord()
  rec.count += 1
  localStorage.setItem(DAILY_KEY, JSON.stringify(rec))
}

import { useState } from 'react'
import { isUnlocked, getRemainingCount } from './access'

export function useAccessState() {
  const [unlocked, setUnlocked] = useState(isUnlocked())
  const [remaining, setRemaining] = useState(getRemainingCount())

  const refresh = () => {
    setUnlocked(isUnlocked())
    setRemaining(getRemainingCount())
  }

  return { unlocked, remaining, refresh }
}

import { getTrialRemaining, getFetchMetadataRemaining } from '../lib/access'
import { useAccessState } from '../lib/use-access'

export default function AccessQuotaDisplay() {
  const { unlocked, remaining } = useAccessState()
  const fetchRemaining = getFetchMetadataRemaining()
  const trialRemaining = getTrialRemaining()

  if (!unlocked) {
    return (
      <>
        <div>
          <span className="text-ink-400 dark:text-gray-500">免费试用剩余</span>
          <span className={`ml-2 font-mono font-bold text-lg ${trialRemaining <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
            {trialRemaining}
          </span>
          <span className="text-ink-400 dark:text-gray-500"> / 10</span>
        </div>
        <div>
          <span className="text-ink-400 dark:text-gray-500">自动抓取剩余</span>
          <span className={`ml-2 font-mono font-bold text-lg ${fetchRemaining <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
            {fetchRemaining}
          </span>
          <span className="text-ink-400 dark:text-gray-500"> / 10</span>
        </div>
      </>
    )
  }

  return (
    <>
      <div>
        <span className="text-ink-400 dark:text-gray-500">今日转换剩余</span>
        <span className={`ml-2 font-mono font-bold text-lg ${remaining <= 10 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
          {remaining}
        </span>
        <span className="text-ink-400 dark:text-gray-500"> / 100</span>
      </div>
      <div>
        <span className="text-ink-400 dark:text-gray-500">自动抓取剩余</span>
        <span className={`ml-2 font-mono font-bold text-lg ${fetchRemaining <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
          {fetchRemaining}
        </span>
        <span className="text-ink-400 dark:text-gray-500"> / 10</span>
      </div>
    </>
  )
}

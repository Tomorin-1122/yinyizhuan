import { Citation, TargetFormat } from '../types'
import { formatLSYJ } from './lsyj'
import { formatGBT7714 } from './gbt7714'
import { formatAPA } from './apa'

export function formatCitation(citation: Citation, format: TargetFormat): string {
  switch (format) {
    case 'lsyj': return formatLSYJ(citation)
    case 'gbt7714': return formatGBT7714(citation)
    case 'apa': return formatAPA(citation)
    default: return formatLSYJ(citation)
  }
}

export { formatLSYJ, formatGBT7714, formatAPA }

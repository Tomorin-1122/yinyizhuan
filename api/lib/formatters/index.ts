import { Citation, TargetFormat } from '../types.js'
import { formatLSYJ } from './lsyj.js'
import { formatGBT7714 } from './gbt7714.js'
import { formatAPA } from './apa.js'

export function formatCitation(citation: Citation, format: TargetFormat): string {
  switch (format) {
    case 'lsyj': return formatLSYJ(citation)
    case 'gbt7714': return formatGBT7714(citation)
    case 'apa': return formatAPA(citation)
    default: return formatLSYJ(citation)
  }
}

export { formatLSYJ, formatGBT7714, formatAPA }

import { Citation, TargetFormat } from '../types'
import { formatLSYJ } from './lsyj'
import { formatGBT7714 } from './gbt7714'
import { formatAPA } from './apa'
import { formatUnpublishedAncient, formatPublishedAncient, formatLocalGazetteer } from './ancient'

export function formatCitation(citation: Citation, format: TargetFormat): string {
  // 处理古籍特殊格式
  if (citation.type === 'ancient_unpublished') {
    return formatUnpublishedAncient(citation)
  }
  if (citation.type === 'ancient_published') {
    return formatPublishedAncient(citation)
  }
  if (citation.type === 'ancient_local_gazetteer') {
    return formatLocalGazetteer(citation)
  }
  
  switch (format) {
    case 'lsyj': return formatLSYJ(citation)
    case 'gbt7714': return formatGBT7714(citation)
    case 'apa': return formatAPA(citation)
    default: return formatLSYJ(citation)
  }
}

export { formatLSYJ, formatGBT7714, formatAPA }
export { formatUnpublishedAncient, formatPublishedAncient, formatLocalGazetteer }

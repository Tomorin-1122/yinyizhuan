import { Citation } from './types'

export interface FieldError {
  field: string
  message: string
}

export function validateCitation(_c: Citation): FieldError[] {
  // 不再阻止转换，所有验证改为提醒
  return []
}

// 检查期刊是否缺少作者或题名（仅提醒，不阻止转换）
export function checkJournalWarnings(c: Citation): string[] {
  const warnings: string[] = []
  if (c.type === 'journal') {
    if (!c.title.trim()) {
      warnings.push('期刊标题未填写')
    }
    if (c.authors.length === 0 || c.authors.every(a => !a.name.trim())) {
      warnings.push('期刊作者未填写')
    }
  }
  return warnings
}

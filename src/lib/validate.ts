import { Citation } from './types'

export interface FieldError {
  field: string
  message: string
}

export function validateCitation(c: Citation): FieldError[] {
  const errors: FieldError[] = []

  if (!c.title.trim()) {
    errors.push({ field: 'title', message: '标题不能为空' })
  }

  // 古籍/日记/经典可不填作者
  if (!['ancient', 'classic', 'diary'].includes(c.type)) {
    if (c.authors.length === 0 || c.authors.every(a => !a.name.trim())) {
      errors.push({ field: 'authors', message: '至少需要一位作者' })
    }
  }

  if (c.publishYear && !/^\d{4}(-\d{4})?$/.test(c.publishYear)) {
    errors.push({ field: 'publishYear', message: '年份格式应为 YYYY 或 YYYY-YYYY' })
  }

  return errors
}

/**
 * 通过 DOI / ISBN 自动抓取文献元数据
 * 使用免费公开 API：Crossref (DOI) + Google Books (ISBN)
 */

import { Citation, Author } from './types'

interface FetchResult {
  success: boolean
  data?: Partial<Citation>
  error?: string
}

/**
 * 通过 DOI 获取文献元数据 (Crossref API)
 */
export async function fetchByDOI(doi: string): Promise<FetchResult> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'yinyizhuan/1.0 (mailto:chenwenxuan915@gmail.com)' },
    })
    if (!res.ok) throw new Error(`Crossref API 返回 ${res.status}`)
    const json = await res.json()
    const item = json.message
    if (!item) return { success: false, error: '未找到该 DOI 对应的文献' }

    const authors: Author[] = (item.author || []).map((a: any) => ({
      name: [a.given, a.family].filter(Boolean).join(' ') || a.name || '',
    }))

    const containerTitle = item['container-title']?.[0] || ''
    const issued = item.issued?.['date-parts']?.[0]
    const year = issued ? String(issued[0]) : ''

    return {
      success: true,
      data: {
        title: item.title?.[0] || '',
        authors: authors.length > 0 ? authors : [{ name: '' }],
        journalName: containerTitle,
        publisher: item.publisher || '',
        publishYear: year,
        volume: item.volume || '',
        issue: item.issue || '',
        pages: item.page || '',
        url: item.URL || '',
      },
    }
  } catch (e: any) {
    return { success: false, error: e.message || '获取失败' }
  }
}

/**
 * 通过 ISBN 获取图书元数据 (Google Books API)
 */
export async function fetchByISBN(isbn: string): Promise<FetchResult> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google Books API 返回 ${res.status}`)
    const json = await res.json()
    if (!json.totalItems || json.totalItems === 0) {
      return { success: false, error: '未找到该 ISBN 对应的图书' }
    }

    const book = json.items[0]
    const info = book.volumeInfo

    const authors: Author[] = (info.authors || []).map((name: string) => ({ name }))

    // 尝试从日期中提取年份
    const pubDate = info.publishedDate || ''
    const year = pubDate ? pubDate.substring(0, 4) : ''

    return {
      success: true,
      data: {
        title: info.title || '',
        authors: authors.length > 0 ? authors : [{ name: '' }],
        publisher: info.publisher || '',
        publishPlace: '', // Google Books 不提供出版地
        publishYear: year,
        url: info.previewLink || info.canonicalVolumeLink || '',
      },
    }
  } catch (e: any) {
    return { success: false, error: e.message || '获取失败' }
  }
}

/**
 * 自动识别输入类型并获取元数据
 * 识别规则：
 *   - 包含 "doi.org" 或以 "10." 开头 → DOI
 *   - 纯数字 10 或 13 位 → ISBN
 *   - 其他 → 当作 URL 处理
 */
export function detectInputType(input: string): 'doi' | 'isbn' | 'url' {
  const trimmed = input.trim()

  // DOI 检测
  if (trimmed.startsWith('10.') || trimmed.includes('doi.org')) {
    return 'doi'
  }

  // ISBN 检测（纯数字，可能含连字符）
  const digits = trimmed.replace(/[-\s]/g, '')
  if (/^\d{10}$/.test(digits) || /^\d{13}$/.test(digits)) {
    return 'isbn'
  }

  // 默认当作 URL
  return 'url'
}

/**
 * 统一入口：传入任意字符串，自动识别并获取元数据
 */
export async function fetchMetadata(input: string): Promise<FetchResult> {
  const type = detectInputType(input)
  if (type === 'doi') {
    // 提取纯 DOI（去掉 URL 前缀）
    const doi = input.includes('doi.org')
      ? input.split('doi.org/')[1]?.split('?')[0] || input
      : input.trim()
    return fetchByDOI(doi)
  }
  if (type === 'isbn') {
    return fetchByISBN(input.replace(/[-\s]/g, ''))
  }
  return { success: false, error: '无法识别输入类型，请检查格式是否正确' }
}

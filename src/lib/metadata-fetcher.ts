/**
 * 通过 DOI / ISBN 自动抓取文献元数据
 * 使用免费公开 API：
 *   - DOI: Crossref
 *   - ISBN: Google Books → Open Library（降级 fallback）
 * 
 * 所有 API 均支持 CORS，可直接从浏览器前端调用，无需后端代理。
 */

import { Citation, Author } from './types'

interface FetchResult {
  success: boolean
  data?: Partial<Citation>
  error?: string
  source?: string  // 标记数据来源（Google Books / Open Library / Crossref）
}

// ============================================================
// DOI 抓取：Crossref API
// ============================================================

/**
 * 通过 DOI 获取文献元数据 (Crossref API)
 */
export async function fetchByDOI(doi: string): Promise<FetchResult> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'yinyizhuan/1.0 (mailto:chenwenxuan915@gmail.com)' },
    })
    if (res.status === 404) {
      return { success: false, error: 'Crossref 数据库中未找到该 DOI' }
    }
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

    // 智能判断文献类型
    let inferredType: string | undefined
    if (containerTitle) {
      inferredType = 'journal' // 有期刊名 → 期刊文章
    } else if (item['event-name']) {
      inferredType = 'conference' // 有会议名称 → 会议论文
    } else if (item['archive-location']) {
      inferredType = item['type'] === 'dissertation' ? 'thesis' : 'archive'
    }

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
        ...(inferredType && { type: inferredType as any }),
      },
      source: 'Crossref',
    }
  } catch (e: any) {
    if (e.message?.includes('Failed to fetch')) {
      return { success: false, error: '网络异常，请检查网络连接后重试' }
    }
    return { success: false, error: e.message || '获取失败' }
  }
}

// ============================================================
// ISBN 抓取：Google Books API
// ============================================================

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || ''

/**
 * 通过 ISBN 获取图书元数据 (Google Books API)
 */
async function fetchFromGoogleBooks(isbn: string): Promise<FetchResult> {
  const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : ''
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${keyParam}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google Books API 返回 ${res.status}`)
    const json = await res.json()
    if (!json.totalItems || json.totalItems === 0) {
      return { success: false, error: '' } // 空 error 表示"未找到"，让 fallback 继续
    }

    const book = json.items[0]
    const info = book.volumeInfo

    return parseBookInfo(info, 'Google Books')
  } catch (e: any) {
    if (e.message?.includes('Failed to fetch')) {
      return { success: false, error: '网络异常' }
    }
    return { success: false, error: '' } // 让 fallback 继续
  }
}

// ============================================================
// ISBN 抓取：Open Library API（Google Books 无结果时的降级方案）
// ============================================================

/**
 * 通过 ISBN 获取图书元数据 (Open Library API)
 */
async function fetchFromOpenLibrary(isbn: string): Promise<FetchResult> {
  // Open Library 的 ISBN API 返回的是单个对象的 bibkeys 映射
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
  try {
    const res = await fetch(url)
    if (!res.ok) return { success: false, error: '' }
    const json = await res.json()
    const key = `ISBN:${isbn}`
    const book = json[key]
    if (!book) return { success: false, error: '' }

    // 解析作者
    const authors: Author[] = (book.authors || []).map((a: any) => ({
      name: typeof a === 'string' ? a : (a.name || a.personal_name || ''),
    }))

    // 解析出版年份（从 publish_date 中提取）
    const pubDate = book.publish_date || ''
    const yearMatch = pubDate.match(/\b(\d{4})\b/)
    const year = yearMatch ? yearMatch[1] : ''

    // 解析出版社（publishers 是数组）
    const publisher = (book.publishers || []).map((p: any) => p.name || p).join(', ') || ''

    return {
      success: true,
      data: {
        title: book.title || '',
        authors: authors.length > 0 ? authors : [{ name: '' }],
        publisher,
        publishYear: year,
        publishPlace: '', // Open Library 不提供出版地
        url: book.url || book.preview_url || `https://openlibrary.org/isbn/${isbn}`,
      },
      source: 'Open Library',
    }
  } catch (e: any) {
    return { success: false, error: '' }
  }
}

// ============================================================
// 通用：解析图书信息并映射到表单字段
// ============================================================

function parseBookInfo(info: any, sourceName: string): FetchResult {
  // 解析作者
  const authors: Author[] = (info.authors || []).map((name: string) => ({ name }))

  // 尝试从日期中提取年份
  const pubDate = info.publishedDate || ''
  const year = pubDate ? pubDate.substring(0, 4) : ''

  // 智能推断文献类型：如果有 ISBN 且不是学术专著，可能是普通图书
  // 这里默认保持 book 类型，由用户后续手动修改

  // 尝试从副标题中提取信息
  const fullTitle = info.title || ''
  const subtitle = info.subtitle || ''

  return {
    success: true,
    data: {
      title: fullTitle,
      authors: authors.length > 0 ? authors : [{ name: '' }],
      publisher: info.publisher || '',
      publishPlace: '', // 公开 API 一般不提供出版地
      publishYear: year,
      url: info.previewLink || info.canonicalVolumeLink || info.infoLink || '',
      notes: subtitle ? `副标题：${subtitle}` : undefined,
    },
    source: sourceName,
  }
}

/**
 * 通过 ISBN 获取图书元数据（并行请求提升韧性）
 * 逻辑：同时请求 Google Books 和 Open Library，优先使用数据更全的 Google
 */
export async function fetchByISBN(isbn: string): Promise<FetchResult> {
  const fetchPromises = [
    fetchFromGoogleBooks(isbn),
    fetchFromOpenLibrary(isbn)
  ]

  const results = await Promise.allSettled(fetchPromises)

  // 第一优先级：Google Books 的成功结果
  if (results[0].status === 'fulfilled' && results[0].value.success) {
    return results[0].value
  }

  // 第二优先级：Open Library 的成功结果
  if (results[1].status === 'fulfilled' && results[1].value.success) {
    return results[1].value
  }

  // 第三优先级：如果都失败，提取第一个非空的错误信息
  const gbError = results[0].status === 'fulfilled' ? results[0].value.error : ''
  const olError = results[1].status === 'fulfilled' ? results[1].value.error : ''

  return {
    success: false,
    error: gbError || olError || '未找到该 ISBN 对应的图书（已尝试多个数据库）',
  }
}

// ============================================================
// 类型识别 & 统一入口
// ============================================================

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

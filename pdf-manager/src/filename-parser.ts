/**
 * filename-parser.ts — 从学术 PDF 文件名推断引用信息
 *
 * 支持常见中文/英文 PDF 命名模式，返回部分 Citation 字段
 * 用于关联 PDF 时预填表单或在列表中展示推断结果
 */

// ─── 模式定义 ───

interface ParseResult {
  title?: string
  authors?: string[]   // 作者名列表（原始字符串）
  year?: string
  journalName?: string
  confidence: 'high' | 'medium' | 'low'
}

/** 去掉文件扩展名，去掉常见括号及空格 */
function cleanFileName(name: string): string {
  // 去掉 .pdf 扩展名
  let s = name.replace(/\.pdf$/i, '')
  // 去掉末尾空格和多余字符
  s = s.trim()
  // 把全角括号统一为半角
  s = s.replace(/（/g, '(').replace(/）/g, ')').replace(/【/g, '[').replace(/】/g, ']')
  return s
}

// ─── 模式匹配函数 ───

/**
 * 模式1: 作者 - 标题（年份）.pdf
 * 例：王汎森 - 历史研究的方法（2023）.pdf
 *     Philip Huang - Rural China (2010).pdf
 */
function patternAuthorDashTitleYear(name: string): ParseResult | null {
  // 匹配: 作者 - 标题 (年份) 或 作者 - 标题（年份）
  // 注意中文破折号、英文连字符都匹配
  const m = name.match(/^(.+?)\s*[–—-]\s*(.+?)\s*[(（]\s*(\d{4})\s*[)）]\s*$/)
  if (!m) return null
  return {
    authors: [m[1].trim()],
    title: m[2].trim(),
    year: m[3],
    confidence: 'high',
  }
}

/**
 * 模式2: 作者_年份_标题.pdf （下划线分隔）
 * 例：王汎森_2023_历史研究的方法.pdf
 *     Philip_Huang_2010_Rural_China.pdf
 */
function patternAuthorYearTitle(name: string): ParseResult | null {
  // 匹配: 作者_年份_标题
  const parts = name.split('_')
  if (parts.length < 3) return null

  // 找年份部分（4位数字）
  const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p))
  if (yearIdx === -1 || yearIdx === 0 || yearIdx === parts.length - 1) return null

  const authors = parts.slice(0, yearIdx).join(' ')
  const title = parts.slice(yearIdx + 1).join(' ')
  // 去掉标题中的括号残留
  const cleanTitle = title.replace(/[()[\]【】（）/]/g, '').trim()

  return {
    authors: [authors],
    title: cleanTitle,
    year: parts[yearIdx],
    confidence: 'high',
  }
}

/**
 * 模式3: 标题 - 作者.pdf （年份可选在末尾）
 * 例：历史研究的方法 - 王汎森.pdf
 *     历史研究的方法 - 王汎森 2023.pdf
 */
function patternTitleDashAuthor(name: string): ParseResult | null {
  const m = name.match(/^(.+?)\s*[–—-]\s*(.+?)(?:\s*(\d{4}))?\s*$/)
  if (!m) return null
  return {
    title: m[1].trim(),
    authors: [m[2].trim()],
    year: m[3] || undefined,
    confidence: m[3] ? 'high' : 'medium',
  }
}

/**
 * 模式4: [作者] 标题 [年份].pdf （方括号标注）
 * 例：[王汎森] 历史研究的方法 [2023].pdf
 */
function patternBracketAuthorTitleYear(name: string): ParseResult | null {
  const m = name.match(/^\[(.+?)\]\s*(.+?)\s*\[(\d{4})\]\s*$/)
  if (!m) return null
  return {
    authors: [m[1].trim()],
    title: m[2].trim(),
    year: m[3],
    confidence: 'high',
  }
}

/**
 * 模式5: CNKI 下载模式
 * 例：王汎森_历史研究的方法_历史研究_2023_2.pdf
 *     作者_标题_期刊名_年份_期号.pdf
 */
function patternCNKI(name: string): ParseResult | null {
  const parts = name.split('_')
  if (parts.length < 4) return null

  // 找年份部分
  const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p))
  if (yearIdx === -1 || yearIdx < 2 || yearIdx >= parts.length - 1) return null

  const authors = parts[0].trim()
  const title = parts.slice(1, yearIdx).join('_')
  const journal = parts.slice(yearIdx + 1).join('_')

  return {
    authors: [authors],
    title,
    year: parts[yearIdx],
    journalName: journal,
    confidence: 'high',
  }
}

/**
 * 模式6: 年份_作者_标题.pdf
 * 例：2023_王汎森_历史研究的方法.pdf
 */
function patternYearAuthorTitle(name: string): ParseResult | null {
  const m = name.match(/^(\d{4})\s*[_\s]\s*(.+?)\s*[_\s]\s*(.+)$/)
  if (!m) return null
  return {
    year: m[1],
    authors: [m[2].trim()],
    title: m[3].trim(),
    confidence: 'high',
  }
}

/**
 * 模式7: 简单标题年份.pdf
 * 例：历史研究的方法2023.pdf
 */
function patternTitleYear(name: string): ParseResult | null {
  const m = name.match(/^(.+?)\s*\(?(\d{4})\)?\s*$/)
  if (!m) return null
  return {
    title: m[1].trim(),
    year: m[2],
    confidence: 'medium',
  }
}

type ParserFn = (name: string) => ParseResult | null

const parsers: ParserFn[] = [
  patternCNKI,
  patternAuthorDashTitleYear,
  patternBracketAuthorTitleYear,
  patternYearAuthorTitle,
  patternAuthorYearTitle,
  patternTitleDashAuthor,
  patternTitleYear,
]

/**
 * 主入口：从文件名解析引用信息
 * 依次尝试各个模式，返回第一个匹配结果
 */
export function parseFileName(fileName: string): ParseResult {
  const cleaned = cleanFileName(fileName)
  for (const parser of parsers) {
    const result = parser(cleaned)
    if (result) return result
  }
  return {
    title: cleaned,
    confidence: 'low',
  }
}

/**
 * 格式化解析结果为可读字符串
 */
export function formatParseResult(result: ParseResult): string {
  const parts: string[] = []
  if (result.authors?.length) parts.push(result.authors.join(', '))
  if (result.title) parts.push(result.title)
  if (result.year) parts.push(`(${result.year})`)
  if (result.journalName) parts.push(`—— ${result.journalName}`)

  const confidenceLabel = result.confidence === 'high' ? '高'
    : result.confidence === 'medium' ? '中' : '低'

  return `${parts.join(' ')}  [可信度: ${confidenceLabel}]`
}

/**
 * 获取 Citation 类型的候选提示（从标题/期刊名推断）
 */
export function guessCitationType(result: ParseResult): string {
  if (result.journalName) return 'journal'
  if (!result.title) return 'book'
  // 标题含常见论文关键词
  const kw = ['研究', '分析', '考察', '探析', '论', 'review', 'study', 'analysis']
  if (kw.some(k => result.title!.includes(k))) return 'journal'
  return 'book'
}

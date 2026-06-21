import { Citation } from '../types'
import { formatAuthorName, joinAuthorNames } from './author-utils'

/**
 * 处理书名号嵌套
 * 规则：
 * - 外层使用双书名号《》
 * - 内层使用单书名号〈〉
 * - 特殊情况：单书名号内再有书名号时，内层用双书名号
 * 示例：《读〈石钟山记〉有感》
 */
export function processBookTitleMarks(text: string): string {
  if (!text) return text
  
  // 首先将文本中可能已有的单书名号统一为临时标记
  // 然后重新构建正确的嵌套结构
  
  let result = ''
  let depth = 0 // 当前嵌套深度
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    if (char === '《') {
      depth++
      // 奇数层（1,3,5...）使用双书名号，偶数层（2,4,6...）使用单书名号
      result += depth % 2 === 1 ? '《' : '〈'
    } else if (char === '》') {
      // 先输出闭合符号，再减少深度
      result += depth % 2 === 1 ? '》' : '〉'
      depth--
    } else if (char === '〈') {
      // 处理已有的单书名号开始
      depth++
      result += depth % 2 === 1 ? '《' : '〈'
    } else if (char === '〉') {
      // 处理已有的单书名号结束
      result += depth % 2 === 1 ? '》' : '〉'
      depth--
    } else {
      result += char
    }
  }
  
  return result
}

function authorStr(c: Citation): string {
  if (!c.authors || c.authors.length === 0) return ''
  if (c.language === 'en') {
    const names = c.authors.map(a => formatAuthorName(a, 'suffix', ['author']))
    const sep = c.authors.length <= 2 ? ' and ' : ', '
    return joinAuthorNames(names, { separator: sep })
  }
  const names = c.authors.map(a => formatAuthorName(a, 'direct', ['著']))
  return joinAuthorNames(names, { separator: '、' })
}

function pageStr(pages: string | undefined, lang: string): string {
  if (!pages) return ''
  if (lang === 'en') {
    // 检测页码范围：支持连字符 (-)、en dash (–) 和 em dash (—)
    return pages.includes('-') || pages.includes('–') || pages.includes('—') ? `pp.${pages}` : `p.${pages}`
  }
  return `第${pages}页`
}

function translatorStr(c: Citation): string {
  if (!c.translators || c.translators.length === 0) return ''
  return c.translators.map(t => t.name).join('、') + '译'
}

/**
 * 去除期数的前导零
 * 例如："04" -> "4", "03" -> "3", "10" -> "10"
 */
function removeLeadingZero(num: string | undefined): string {
  if (!num) return ''
  return num.replace(/^0+/, '') || '0'
}

/**
 * 将英文括号 () 转换为中文括号 （）
 * 跳过 URL 中的括号（http:// 或 https:// 开头的段落）
 */
function convertToChineseParens(text: string): string {
  // 按 URL 分割：奇数段是 URL（保留原样），偶数段做替换
  const parts = text.split(/(https?:\/\/[^\s，。、；：]+)/)
  return parts.map((part, i) => {
    if (i % 2 === 1) return part // URL 段，不转换
    return part.replace(/\(/g, '（').replace(/\)/g, '）')
  }).join('')
}

/**
 * 《历史研究》格式化（公开接口）
 * 对中文引文，在输出后统一将英文括号 () 转为中文括号 （）
 */
export function formatLSYJ(citation: Citation): string {
  const raw = formatLSYJRaw(citation)
  if (citation.language !== 'en') {
    return convertToChineseParens(raw)
  }
  return raw
}

function formatLSYJRaw(citation: Citation): string {
  const c = citation
  const isEn = c.language === 'en'

  switch (c.type) {
    case 'book': {
      if (isEn) {
        const parts: string[] = []
        parts.push(authorStr(c))
        parts.push(`*${c.title}*`)
        if (c.translators && c.translators.length > 0) {
          parts.push(`trans. ${c.translators.map(t => t.name).join(' and ')}`)
        }
        if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}: ${c.publisher}`)
        else if (c.publisher) parts.push(c.publisher)
        if (c.publishYear) parts.push(c.publishYear)
        if (c.pages) parts.push(pageStr(c.pages, 'en'))
        return parts.filter(Boolean).join(', ') + '.'
      }
      const parts: string[] = []
      const auth = authorStr(c)
      if (auth) parts.push(auth + '：')
      else if (c.title) parts.push('')
      let titlePart = processBookTitleMarks(`《${c.title}》`)
      if (c.volume) titlePart += c.volume
      parts.push(titlePart)
      if (c.translators && c.translators.length > 0) {
        parts.push(translatorStr(c))
      }
      if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
      else if (c.publisher) parts.push(c.publisher)
      if (c.publishYear) parts.push(`${c.publishYear}年`)
      if (c.pages) parts.push(pageStr(c.pages, 'zh'))
      let result = parts[0]
      for (let i = 1; i < parts.length; i++) {
        if (i === 1 && !auth) result = parts[i]
        else if (i === 1) result += parts[i]
        else result += '，' + parts[i]
      }
      return result + '。'
    }

    case 'chapter': {
      if (isEn) {
        const parts: string[] = []
        parts.push(authorStr(c))
        parts.push(`"${c.title}"`)
        if (c.bookAuthors && c.bookAuthors.length > 0) {
          const editors = c.bookAuthors.map(a => a.name).join(c.bookAuthors.length <= 2 ? ' and ' : ', ')
          const edSuffix = c.bookAuthors.length > 1 ? 'eds.' : 'ed.'
          parts.push(`in ${editors}, ${edSuffix}`)
        }
        if (c.bookTitle) parts.push(`*${c.bookTitle}*`)
        if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}: ${c.publisher}`)
        if (c.publishYear) parts.push(c.publishYear)
        if (c.pages) parts.push(pageStr(c.pages, 'en'))
        return parts.filter(Boolean).join(', ') + '.'
      }
      const parts: string[] = []
      const auth = authorStr(c)
      if (auth) parts.push(auth + '：')
      parts.push(processBookTitleMarks(`《${c.title}》`))
      if (c.bookAuthors && c.bookAuthors.length > 0) {
        const ba = c.bookAuthors.map(a => {
          if (!a.role || a.role === '著') return a.name
          return a.name + a.role
        }).join('、')
        parts.push(ba + '：')
      }
      if (c.bookTitle) parts.push(processBookTitleMarks(`《${c.bookTitle}》`))
      if (c.volume) parts.push(c.volume)
      if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
      if (c.publishYear) parts.push(`${c.publishYear}年`)
      if (c.pages) parts.push(pageStr(c.pages, 'zh'))
      let result = ''
      for (let i = 0; i < parts.length; i++) {
        if (i === 0) result = parts[i]
        else if (parts[i - 1].endsWith('：')) result += parts[i]
        else result += '，' + parts[i]
      }
      return result + '。'
    }

    case 'journal': {
      if (isEn) {
        const parts: string[] = []
        parts.push(authorStr(c))
        // 标题用英文引号
        parts.push(`"${c.title}"`)
        // 期刊名斜体（用 * 标记，提示用户手动设斜体）
        if (c.journalName) parts.push(`*${c.journalName}*`)
        if (c.volumeNumber) parts.push(`Vol. ${c.volumeNumber}`)
        if (c.issue) parts.push(`No. ${c.issue}`)
        if (c.publishYear) parts.push(c.publishYear)
        if (c.pages) parts.push(pageStr(c.pages, 'en'))
        return parts.filter(Boolean).join(', ') + '.'
      }
      // 处理期刊名称中的括号版别：将《期刊名 (版别)》转换为《期刊名》（版别）
      let journalPart = ''
      if (c.journalName) {
        // 匹配括号内容，支持英文括号 () 和中文括号（）
        const match = c.journalName.match(/^(.+?)\(([^()]+)\)$/) || c.journalName.match(/^(.+?)（([^()]+)）$/)
        if (match) {
          const [, name, edition] = match
          // 去除名称末尾可能的空格
          journalPart = processBookTitleMarks(`《${name.trim()}》`) + `（${edition}）`
        } else {
          journalPart = processBookTitleMarks(`《${c.journalName}》`)
        }
      }
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      result += '，'
      result += journalPart
      if (c.volumeNumber && c.issue) {
        result += `第${c.volumeNumber}卷第${removeLeadingZero(c.issue)}号`
        if (c.publishYear) result += `，${c.publishYear}年`
      } else {
        if (c.publishYear) result += `${c.publishYear}年`
        if (c.issue) result += `第${removeLeadingZero(c.issue)}期`
      }
      if (c.pages) result += `，${pageStr(c.pages, 'zh')}`
      return result + '。'
    }

    case 'newspaper': {
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.newspaperName) result += `，` + processBookTitleMarks(`《${c.newspaperName}》`)
      if (c.publishDate) result += c.publishDate
      if (c.pageSection) result += `，第${c.pageSection}版`
      return result + '。'
    }

    case 'conference': {
      if (isEn) {
        const parts: string[] = []
        parts.push(authorStr(c))
        parts.push(`"${c.title}"`)
        if (c.bookAuthors && c.bookAuthors.length > 0) {
          const orgs = c.bookAuthors.map(a => a.name).join(', ')
          parts.push(`in ${orgs}`)
        }
        if (c.bookTitle) parts.push(`*${c.bookTitle}*`)
        if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}: ${c.publisher}`)
        else if (c.publisher) parts.push(c.publisher)
        if (c.publishYear) parts.push(c.publishYear)
        if (c.pages) parts.push(pageStr(c.pages, 'en'))
        return parts.filter(Boolean).join(', ') + '.'
      }
      // 中文会议论文
      const parts: string[] = []
      const auth = authorStr(c)
      if (auth) parts.push(auth + '：')
      parts.push(processBookTitleMarks(`《${c.title}》`))
      if (c.bookTitle) parts.push(processBookTitleMarks(`《${c.bookTitle}》`))
      if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
      else if (c.publisher) parts.push(c.publisher)
      if (c.publishYear) parts.push(`${c.publishYear}年`)
      if (c.pages) parts.push(pageStr(c.pages, 'zh'))
      let result = ''
      for (let i = 0; i < parts.length; i++) {
        if (i === 0) result = parts[i]
        else if (parts[i - 1].endsWith('：')) result += parts[i]
        else result += '，' + parts[i]
      }
      return result + '。'
    }

    case 'thesis': {
      if (isEn) {
        const parts: string[] = []
        parts.push(authorStr(c))
        parts.push(`"${c.title}"`)
        if (c.thesisType) parts.push(c.thesisType)
        if (c.institution) parts.push(c.institution)
        if (c.publishYear) parts.push(c.publishYear)
        return parts.filter(Boolean).join(', ') + '.'
      }
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.thesisType) result += `，${c.thesisType}`
      if (c.institution) result += `，${c.institution}`
      if (c.publishYear) result += `，${c.publishYear}年`
      if (c.pages) result += `，${pageStr(c.pages, 'zh')}`
      return result + '。'
    }

    case 'archive': {
      let result = processBookTitleMarks(`《${c.title}》`)
      if (c.archiveDate) result += `，${c.archiveDate}`
      if (c.archiveNumber) result += `，${c.archiveNumber}`
      if (c.archiveLocation) result += `，${c.archiveLocation}`
      return result + '。'
    }

    case 'diary': {
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.volume) result += c.volume
      if (c.publishDate) result += `，${c.publishDate}`
      if (c.translators && c.translators.length > 0) result += `，${translatorStr(c)}`
      if (c.publishPlace && c.publisher) result += `，${c.publishPlace}：${c.publisher}`
      if (c.publishYear) result += `，${c.publishYear}年`
      if (c.pages) result += `，${pageStr(c.pages, 'zh')}`
      return result + '。'
    }

    case 'ancient': {
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.volume) result += c.volume
      if (c.section) result += processBookTitleMarks(`《${c.section}》`)
      if (c.ancientEdition) result += `，${c.ancientEdition}`
      if (c.seriesName) result += `，` + processBookTitleMarks(`《${c.seriesName}》`)
      if (c.publishPlace && c.publisher) result += `，${c.publishPlace}：${c.publisher}`
      if (c.publishYear) result += `，${c.publishYear}年`
      if (c.edition) result += c.edition
      if (c.seriesVolume) result += `，${c.seriesVolume}`
      if (c.pages) {
        const p = c.pageAB ? `${c.pages}页${c.pageAB}` : pageStr(c.pages, 'zh')
        result += `，${p}`
      }
      return result + '。'
    }

    case 'electronic': {
      const auth = authorStr(c)
      let result = ''
      if (isEn) {
        if (auth) result = auth + ', '
        result += `"${c.title}"`
        if (c.journalName) result += `, *${c.journalName}*`
        if (c.url) result += `, ${c.url}`
        if (c.accessDate) result += `, accessed ${c.accessDate}`
        return result + '.'
      }
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.journalName) result += `，` + processBookTitleMarks(`《${c.journalName}》`)
      if (c.issue) result += `${c.publishYear}年第${removeLeadingZero(c.issue)}期`
      if (c.url) result += `，${c.url}`
      if (c.accessDate) result += `，访问时间：${c.accessDate}`
      return result + '。'
    }

    case 'transferred': {
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.originalCitation) result += `，${c.originalCitation}`
      if (c.transferredFrom) result += `，转引自${c.transferredFrom}`
      if (c.pages) result += `，${pageStr(c.pages, 'zh')}`
      return result + '。'
    }

    case 'classic': {
      let result = ''
      const auth = authorStr(c)
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      if (c.section) result += `·${c.section}`
      return `（${result}）`
    }

    default:
      return formatDefault(c)
  }
}

function formatDefault(c: Citation): string {
  const auth = authorStr(c)
  let result = ''
  if (auth) result = auth + '：'
  result += processBookTitleMarks(`《${c.title}》`)
  if (c.publishPlace && c.publisher) result += `，${c.publishPlace}：${c.publisher}`
  if (c.publishYear) result += `，${c.publishYear}年`
  if (c.pages) result += `，第${c.pages}页`
  return result + '。'
}

// 供 formatLSYJ 内部调用，formatDefault 也需要经过括号转换
// 但因为它在 switch default 分支被直接 return，已由外层 convertToChineseParens 统一处理

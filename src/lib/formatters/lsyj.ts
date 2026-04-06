import { Citation } from '../types'

/**
 * 处理书名号嵌套
 * 规则：
 * - 外层使用双书名号《》
 * - 内层使用单书名号〈〉
 * - 特殊情况：单书名号内再有书名号时，内层用双书名号
 * 示例：《读〈石钟山记〉有感》
 */
function processBookTitleMarks(text: string): string {
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
    return c.authors.map(a => {
      const suffix = a.role && a.role !== 'author' ? `, ${a.role}` : ''
      return a.name + suffix
    }).join(c.authors.length <= 2 ? ' and ' : ', ')
  }
  const parts = c.authors.map(a => {
    if (!a.role || a.role === '著') return a.name
    return a.name + a.role
  })
  return parts.join('、')
}

function pageStr(pages: string | undefined, lang: string): string {
  if (!pages) return ''
  if (lang === 'en') {
    return pages.includes('-') || pages.includes('—') ? `pp.${pages}` : `p.${pages}`
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

export function formatLSYJ(citation: Citation): string {
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
        parts.push(`"${c.title}"`)
        if (c.journalName) parts.push(`*${c.journalName}*`)
        if (c.volumeNumber) parts.push(`Vol. ${c.volumeNumber}`)
        if (c.issue) parts.push(`No. ${c.issue}`)
        if (c.publishYear) parts.push(c.publishYear)
        if (c.pages) parts.push(pageStr(c.pages, 'en'))
        return parts.filter(Boolean).join(', ') + '.'
      }
      const auth = authorStr(c)
      let result = ''
      if (auth) result = auth + '：'
      result += processBookTitleMarks(`《${c.title}》`)
      result += '，'
      if (c.journalName) result += processBookTitleMarks(`《${c.journalName}》`)
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

    case 'thesis':
    case 'conference': {
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

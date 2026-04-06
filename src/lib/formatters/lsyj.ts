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
  
  let result = ''
  let depth = 0 // 当前嵌套深度
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    if (char === '《') {
      depth++
      result += depth % 2 === 1 ? '《' : '〈'
    } else if (char === '》') {
      result += depth % 2 === 1 ? '》' : '〉'
      depth--
    } else if (char === '〈') {
      depth++
      result += depth % 2 === 1 ? '《' : '〈'
    } else if (char === '〉') {
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

export function formatLSYJ(citation: Citation): string {
  const c = citation
  const isEn = c.language === 'en'

  let result: string

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
      if (auth) parts.push(auth + ':')
      else if (c.title) parts.push('')
      let titlePart = processBookTitleMarks(`《${c.title}》`)
      if (c.volume) titlePart += c.volume
      parts.push(titlePart)
      if (c.translators && c.translators.length > 0) {
        parts.push(translatorStr(c))
      }
      if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}:${c.publisher}`)
      else if (c.publisher) parts.push(c.publisher)
      if (c.publishYear) parts.push(`${c.publishYear}年`)
      if (c.pages) parts.push(pageStr(c.pages, 'zh'))
      let res = parts[0]
      for (let i = 1; i < parts.length; i++) {
        if (i === 1 && !auth) res = parts[i]
        else if (i === 1) res += parts[i]
        else res += ',' + parts[i]
      }
      result = res + '。'
      break
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
      if (auth) parts.push(auth + ':')
      parts.push(processBookTitleMarks(`《${c.title}》`))
      if (c.bookAuthors && c.bookAuthors.length > 0) {
        const ba = c.bookAuthors.map(a => {
          if (!a.role || a.role === '著') return a.name
          return a.name + a.role
        }).join(',')
        parts.push(ba + ':')
      }
      if (c.bookTitle) parts.push(processBookTitleMarks(`《${c.bookTitle}》`))
      if (c.volume) parts.push(c.volume)
      if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}:${c.publisher}`)
      if (c.publishYear) parts.push(`${c.publishYear}年`)
      if (c.pages) parts.push(pageStr(c.pages, 'zh'))
      let res = ''
      for (let i = 0; i < parts.length; i++) {
        if (i === 0) res = parts[i]
        else if (parts[i - 1].endsWith(':')) res += parts[i]
        else res += ',' + parts[i]
      }
      result = res + '。'
      break
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
      let res = ''
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      res += ','
      if (c.journalName) res += processBookTitleMarks(`《${c.journalName}》`)
      if (c.volumeNumber && c.issue) {
        res += `，第${c.volumeNumber}卷第${c.issue}号`
        if (c.publishYear) res += `，${c.publishYear}年`
      } else {
        if (c.publishYear) res += `，${c.publishYear}年`
        if (c.issue) res += `，第${c.issue}期`
      }
      if (c.pages) res += `，${pageStr(c.pages, 'zh')}`
      result = res + '。'
      break
    }

    case 'newspaper': {
      const auth = authorStr(c)
      let res = ''
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.newspaperName) res += `,` + processBookTitleMarks(`《${c.newspaperName}》`)
      if (c.publishDate) res += `，${c.publishDate}`
      if (c.pageSection) res += `，第${c.pageSection}版`
      result = res + '。'
      break
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
      let res = ''
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.thesisType) res += `，${c.thesisType}`
      if (c.institution) res += `，${c.institution}`
      if (c.publishYear) res += `，${c.publishYear}年`
      if (c.pages) res += `，${pageStr(c.pages, 'zh')}`
      result = res + '。'
      break
    }

    case 'archive': {
      let res = processBookTitleMarks(`《${c.title}》`)
      if (c.archiveDate) res += `，${c.archiveDate}`
      if (c.archiveNumber) res += `，${c.archiveNumber}`
      if (c.archiveLocation) res += `，${c.archiveLocation}`
      result = res + '。'
      break
    }

    case 'diary': {
      const auth = authorStr(c)
      let res = ''
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.volume) res += `，${c.volume}`
      if (c.publishDate) res += `，${c.publishDate}`
      if (c.translators && c.translators.length > 0) res += `，${translatorStr(c)}`
      if (c.publishPlace && c.publisher) res += `，${c.publishPlace}:${c.publisher}`
      if (c.publishYear) res += `，${c.publishYear}年`
      if (c.pages) res += `，${pageStr(c.pages, 'zh')}`
      result = res + '。'
      break
    }

    case 'ancient': {
      const auth = authorStr(c)
      let res = ''
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.volume) res += `，${c.volume}`
      if (c.section) res += `，` + processBookTitleMarks(`《${c.section}》`)
      if (c.ancientEdition) res += `，${c.ancientEdition}`
      if (c.seriesName) res += `，` + processBookTitleMarks(`《${c.seriesName}》`)
      if (c.publishPlace && c.publisher) res += `，${c.publishPlace}:${c.publisher}`
      if (c.publishYear) res += `，${c.publishYear}年`
      if (c.edition) res += `，${c.edition}`
      if (c.seriesVolume) res += `，${c.seriesVolume}`
      if (c.pages) {
        const p = c.pageAB ? `${c.pages}页${c.pageAB}` : pageStr(c.pages, 'zh')
        res += `，${p}`
      }
      result = res + '。'
      break
    }

    case 'electronic': {
      const auth = authorStr(c)
      let res = ''
      if (isEn) {
        if (auth) res = auth + ', '
        res += `"${c.title}"`
        if (c.journalName) res += `, *${c.journalName}*`
        if (c.url) res += `, ${c.url}`
        if (c.accessDate) res += `, accessed ${c.accessDate}`
        return res + '.'
      }
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.journalName) res += `,` + processBookTitleMarks(`《${c.journalName}》`)
      if (c.issue) res += `，${c.publishYear}年第${c.issue}期`
      if (c.url) res += `，${c.url}`
      if (c.accessDate) res += `，访问时间：${c.accessDate}`
      result = res + '。'
      break
    }

    case 'transferred': {
      const auth = authorStr(c)
      let res = ''
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.originalCitation) res += `，${c.originalCitation}`
      if (c.transferredFrom) res += `，转引自${c.transferredFrom}`
      if (c.pages) res += `，${pageStr(c.pages, 'zh')}`
      result = res + '。'
      break
    }

    case 'classic': {
      let res = ''
      const auth = authorStr(c)
      if (auth) res = auth + ':'
      res += processBookTitleMarks(`《${c.title}》`)
      if (c.section) res += `，·${c.section}`
      return `（${res}）`
    }

    default:
      result = formatDefault(c)
  }

  // 对中文类型文献（除电子文献外）进行额外审查
  if (!isEn && c.type !== 'electronic') {
    // 将英文逗号改为中文逗号
    result = result.replace(/,/g, ',')
    // 去除期数的前导零，如"第03期"改为"第3期"，"第04号"改为"第4号"
    result = result.replace(/第0+(\d+)(期|号)/g, '第$1$2')
  }

  return result
}

function formatDefault(c: Citation): string {
  const auth = authorStr(c)
  let result = ''
  if (auth) result = auth + ':'
  result += processBookTitleMarks(`《${c.title}》`)
  if (c.publishPlace && c.publisher) result += `，${c.publishPlace}:${c.publisher}`
  if (c.publishYear) result += `，${c.publishYear}年`
  if (c.pages) result += `，第${c.pages}页`
  return result + '。'
}

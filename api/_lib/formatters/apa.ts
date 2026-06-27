import { Citation } from '../types'
import { formatAuthorName, joinAuthorNames } from './author-utils'

function authorStr(c: Citation): string {
  if (!c.authors || c.authors.length === 0) return ''
  if (c.language === 'en') {
    const names = c.authors.map(a => a.name)
    return joinAuthorNames(names, { separator: ', ', lastSeparator: ' & ', etAlAfter: 2, etAlText: 'et al.' })
  }
  const names = c.authors.map(a => formatAuthorName(a, 'parens', ['著']))
  return joinAuthorNames(names, { separator: '、' })
}

export function formatAPA(citation: Citation): string {
  const c = citation
  const auth = authorStr(c)
  const isEn = c.language === 'en'
  const year = c.publishYear || 'n.d.'

  switch (c.type) {
    case 'book': {
      if (isEn) {
        let result = `${auth} (${year}). *${c.title}*`
        if (c.edition) result += ` (${c.edition})`
        result += '.'
        if (c.translators && c.translators.length > 0) {
          result += ` (${c.translators.map(t => t.name).join(' & ')}, Trans.).`
        }
        if (c.publisher) result += ` ${c.publisher}.`
        return result
      }
      let result = `${auth}（${year}）。`
      result += `《${c.title}》。`
      if (c.translators && c.translators.length > 0) {
        result += `${c.translators.map(t => t.name).join('、')}译。`
      }
      if (c.publisher) {
        result += c.publishPlace ? `${c.publishPlace}：${c.publisher}。` : `${c.publisher}。`
      }
      return result
    }

    case 'chapter': {
      if (isEn) {
        let result = `${auth} (${year}). ${c.title}. In `
        if (c.bookAuthors && c.bookAuthors.length > 0) {
          result += c.bookAuthors.map(a => a.name).join(' & ') + ' (Eds.), '
        }
        if (c.bookTitle) result += `*${c.bookTitle}*`
        if (c.pages) result += ` (pp. ${c.pages})`
        result += '.'
        if (c.publisher) result += ` ${c.publisher}.`
        return result
      }
      let result = `${auth}（${year}）。${c.title}。`
      if (c.bookAuthors && c.bookAuthors.length > 0) {
        result += `载${c.bookAuthors.map(a => a.name).join('、')}(编)，`
      }
      if (c.bookTitle) result += `《${c.bookTitle}》`
      if (c.pages) result += `（第${c.pages}页）`
      result += '。'
      if (c.publisher) {
        result += c.publishPlace ? `${c.publishPlace}：${c.publisher}。` : `${c.publisher}。`
      }
      return result
    }

    case 'journal': {
      if (isEn) {
        let result = `${auth} (${year}). ${c.title}. *${c.journalName || ''}*`
        if (c.volumeNumber) result += `, *${c.volumeNumber}*`
        if (c.issue) result += `(${c.issue})`
        if (c.pages) result += `, ${c.pages}`
        result += '.'
        return result
      }
      let result = `${auth}（${year}）。${c.title}。`
      if (c.journalName) result += `《${c.journalName}》`
      if (c.issue) result += `，第${c.issue}期`
      if (c.pages) result += `，第${c.pages}页`
      result += '。'
      return result
    }

    case 'newspaper': {
      let result = isEn ? `${auth} (${c.publishDate || year}). ${c.title}. ` : `${auth}（${c.publishDate || year}）。${c.title}。`
      if (c.newspaperName) result += isEn ? `*${c.newspaperName}*` : `《${c.newspaperName}》`
      if (c.pageSection) result += isEn ? `, p. ${c.pageSection}` : `，第${c.pageSection}版`
      result += isEn ? '.' : '。'
      return result
    }

    case 'thesis': {
      if (isEn) {
        return `${auth} (${year}). *${c.title}* [${c.thesisType || 'Doctoral dissertation'}]. ${c.institution || ''}.`
      }
      let result = `${auth}（${year}）。《${c.title}》`
      result += `（${c.thesisType || '学位论文'}）。`
      if (c.institution) result += `${c.institution}。`
      return result
    }

    case 'electronic': {
      if (isEn) {
        let result = `${auth} (${year}). ${c.title}.`
        if (c.url) result += ` ${c.url}`
        return result
      }
      let result = `${auth}（${year}）。${c.title}。`
      if (c.url) result += `${c.url}`
      return result
    }

    default: {
      if (isEn) {
        return `${auth} (${year}). ${c.title}.`
      }
      return `${auth}（${year}）。《${c.title}》。`
    }
  }
}

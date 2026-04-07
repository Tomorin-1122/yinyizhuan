import { Citation } from '../types'

function authorStr(c: Citation): string {
  if (!c.authors || c.authors.length === 0) return ''
  if (c.language === 'en') {
    return c.authors.map(a => a.name).join(', ')
  }
  return c.authors.map(a => {
    if (!a.role || a.role === '著') return a.name
    return a.name + a.role
  }).join(', ')
}

function docType(c: Citation): string {
  switch (c.type) {
    case 'book': return '[M]'
    case 'chapter': return '[M]'
    case 'journal': return '[J]'
    case 'newspaper': return '[N]'
    case 'thesis': return '[D]'
    case 'conference': return '[C]'
    case 'electronic': return '[EB/OL]'
    case 'archive': return '[A]'
    case 'ancient': return '[M]'
    case 'diary': return '[M]'
    default: return '[Z]'
  }
}

export function formatGBT7714(citation: Citation): string {
  const c = citation
  const auth = authorStr(c)

  switch (c.type) {
    case 'book': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}${docType(c)}`
      if (c.translators && c.translators.length > 0) {
        result += `.${c.translators.map(t => t.name).join(', ')},译`
      }
      if (c.edition) result += `.${c.edition}`
      result += '.'
      if (c.publishPlace) result += `${c.publishPlace}:`
      if (c.publisher) result += `${c.publisher},`
      if (c.publishYear) result += c.publishYear
      if (c.pages) result += `:${c.pages}`
      result += '.'
      return result
    }

    case 'chapter': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}[M]//`
      if (c.bookAuthors && c.bookAuthors.length > 0) {
        result += c.bookAuthors.map(a => a.name).join(', ') + '.'
      }
      if (c.bookTitle) result += `${c.bookTitle}`
      result += '.'
      if (c.publishPlace) result += `${c.publishPlace}:`
      if (c.publisher) result += `${c.publisher},`
      if (c.publishYear) result += c.publishYear
      if (c.pages) result += `:${c.pages}`
      result += '.'
      return result
    }

    case 'journal': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}[J].`
      if (c.journalName) result += `${c.journalName},`
      if (c.publishYear) result += c.publishYear
      if (c.volumeNumber) result += `,${c.volumeNumber}`
      if (c.issue) result += `(${c.issue})`
      if (c.pages) result += `:${c.pages}`
      result += '.'
      return result
    }

    case 'newspaper': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}[N].`
      if (c.newspaperName) result += `${c.newspaperName},`
      if (c.publishDate) result += c.publishDate
      if (c.pageSection) result += `(${c.pageSection})`
      result += '.'
      return result
    }

    case 'thesis': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}[D].`
      if (c.institution) result += `${c.institution},`
      if (c.publishYear) result += c.publishYear
      result += '.'
      return result
    }

    case 'conference': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}[C]//`
      if (c.bookTitle) result += `${c.bookTitle}.`
      if (c.publishPlace) result += `${c.publishPlace}:`
      if (c.publisher) result += `${c.publisher},`
      if (c.publishYear) result += c.publishYear
      if (c.pages) result += `:${c.pages}`
      result += '.'
      return result
    }

    case 'electronic': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}[EB/OL].`
      if (c.url) result += c.url
      if (c.accessDate) result += `,[${c.accessDate}]`
      result += '.'
      return result
    }

    case 'archive': {
      let result = `${c.title}[A].`
      if (c.archiveDate) result += c.archiveDate
      if (c.archiveNumber) result += `.${c.archiveNumber}`
      if (c.archiveLocation) result += `.${c.archiveLocation}`
      result += '.'
      return result
    }

    case 'ancient': {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}${docType(c)}`
      if (c.volume) result += `.${c.volume}`
      result += '.'
      if (c.publishPlace) result += `${c.publishPlace}:`
      if (c.publisher) result += `${c.publisher},`
      if (c.publishYear) result += c.publishYear
      if (c.pages) result += `:${c.pages}`
      result += '.'
      return result
    }

    default: {
      let result = auth ? `${auth}.` : ''
      result += `${c.title}${docType(c)}.`
      if (c.publishPlace) result += `${c.publishPlace}:`
      if (c.publisher) result += `${c.publisher},`
      if (c.publishYear) result += c.publishYear
      if (c.pages) result += `:${c.pages}`
      result += '.'
      return result
    }
  }
}

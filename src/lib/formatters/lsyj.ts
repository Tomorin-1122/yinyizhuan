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
 * 格式化卷次：自动加"卷"前缀
 * "3" → "卷3", "一" → "卷一", "卷3" → "卷3", "435" → "卷435"
 */
function formatVolume(vol: string | undefined): string {
  if (!vol) return ''
  // 已有"卷"前缀则原样返回
  if (vol.startsWith('卷')) return vol
  return `卷${vol}`
}

/**
 * 格式化册数：纯数字加"第X册"，已有"册"字或"上/下册"则原样
 * "3" → "第3册", "上册" → "上册", "第6册" → "第6册"
 */
function formatBooklet(vol: string | undefined): string {
  if (!vol) return ''
  // 已含"册"字则原样返回（覆盖"上册""下册""第6册"等）
  if (vol.includes('册')) return vol
  return `第${vol}册`
}

/**
 * 格式化丛书册数：纯数字加"第X册"，已有格式则原样
 * "42" → "第42册", "第88册" → "第88册"
 */
function formatSeriesVolume(vol: string | undefined): string {
  if (!vol) return ''
  if (vol.includes('册')) return vol
  return `第${vol}册`
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
        // 有卷号：第X卷第Y号，YYYY年（规范用"号"）
        result += `第${c.volumeNumber}卷第${removeLeadingZero(c.issue)}号`
        if (c.publishYear) result += `，${c.publishYear}年`
      } else {
        // 无卷号：YYYY年第N期
        if (c.publishYear) result += `${c.publishYear}年`
        if (c.issue) result += `第${removeLeadingZero(c.issue)}期`
      }
      // 页码默认不输出（由结果区"显示页码"按钮控制）
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
      // 按子类型分发到独立格式化函数
      switch (c.ancientSubType) {
        case 'blockprint':  return formatAncientBlockprint(c)
        case 'punctuated':  return formatAncientPunctuated(c)
        case 'reprint':     return formatAncientReprint(c)
        case 'extract':     return formatAncientExtract(c)
        case 'gazetteer':   return formatAncientGazetteer(c)
        case 'classic':     return formatAncientClassic(c)
        case 'chronicle':   return formatAncientChronicle(c)
        default:            return formatAncientLegacy(c)
      }
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

// ─── 古籍子类型格式化函数 ─────────────────────────────────────────

// ─── 刻本 ───────────────────────────────────────
// 规范：姚际恒：《古今伪书考》卷3，光绪三年苏州文学山房活字本，第9页a。
// 带馆藏：《山东经会录》，隆庆五年刻本，京都大学法学部图书馆藏。
function formatAncientBlockprint(c: Citation): string {
  const parts: string[] = []
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  parts.push(processBookTitleMarks(`《${c.title}》`))
  if (c.volume) parts.push(formatVolume(c.volume))
  if (c.section) parts.push(processBookTitleMarks(`《${c.section}》`))
  if (c.ancientEdition) parts.push(c.ancientEdition)
  if (c.archiveLocation) parts.push(c.archiveLocation)
  if (c.pages) {
    const p = c.pageAB ? `第${c.pages}页${c.pageAB}` : pageStr(c.pages, 'zh')
    parts.push(p)
  }
  return joinAncientParts(parts) + '。'
}

// ─── 点校本/整理本 ──────────────────────────────
// 规范：毛祥麟：《墨余录》，毕万忱点校，上海：上海古籍出版社，1985年，第35页。
function formatAncientPunctuated(c: Citation): string {
  const parts: string[] = []
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  parts.push(processBookTitleMarks(`《${c.title}》`))
  if (c.volume) parts.push(formatVolume(c.volume))
  if (c.section) parts.push(processBookTitleMarks(`《${c.section}》`))
  const pStr = punctuatorStr(c.punctuators || [])
  if (pStr) parts.push(pStr)
  if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
  if (c.publishYear) {
    const editionTag = c.ancientEdition ? `${c.publishYear}年${c.ancientEdition}` : `${c.publishYear}年`
    parts.push(editionTag)
  }
  if (c.pages) parts.push(pageStr(c.pages, 'zh'))
  return joinAncientParts(parts) + '。'
}

// ─── 影印本 ─────────────────────────────────────
// 规范：杨钟羲：《雪桥诗话续集》卷5，沈阳：辽沈书社，1991年影印本，上册，第461页下栏。
function formatAncientReprint(c: Citation): string {
  const parts: string[] = []
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  parts.push(processBookTitleMarks(`《${c.title}》`))
  if (c.volume) parts.push(formatVolume(c.volume))
  if (c.section) parts.push(processBookTitleMarks(`《${c.section}》`))
  if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
  if (c.publishYear) {
    // 影印本标注拼到年份后
    const editionTag = c.ancientEdition === '影印本' ? `${c.publishYear}年影印本` : `${c.publishYear}年`
    parts.push(editionTag)
  }
  if (c.bookletVolume) parts.push(formatBooklet(c.bookletVolume))
  if (c.pages) {
    // 影印本：第461页下栏
    const col = c.column ? `${c.column}` : ''
    parts.push(`第${c.pages}页${col}`)
  }
  return joinAncientParts(parts) + '。'
}

// ─── 析出文献 ───────────────────────────────────
// 规范：管志道：《续问辨牍》卷2《答屠仪部赤水丈书》，《四库全书存目丛书》，济南：齐鲁书社，1997年影印本，子部，第88册，第73页。
function formatAncientExtract(c: Citation): string {
  const parts: string[] = []
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  parts.push(processBookTitleMarks(`《${c.title}》`))
  if (c.volume) parts.push(formatVolume(c.volume))
  if (c.section) parts.push(processBookTitleMarks(`《${c.section}》`))
  // 文集题名（用书名号，前面加逗号）
  if (c.bookTitle) parts.push(processBookTitleMarks(`《${c.bookTitle}》`))
  if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
  if (c.publishYear) {
    const editionTag = c.ancientEdition === '影印本' ? `${c.publishYear}年影印本` : `${c.publishYear}年`
    parts.push(editionTag)
  }
  // 部类（子部、史部等）
  if (c.category) parts.push(c.category)
  if (c.seriesVolume) parts.push(formatSeriesVolume(c.seriesVolume))
  if (c.pages) parts.push(pageStr(c.pages, 'zh'))
  return joinAncientParts(parts) + '。'
}

// ─── 地方志 ─────────────────────────────────────
// 规范：万历《广东通志》卷15《郡县志二·广州府·城池》，《稀见中国地方志汇刊》，北京：中国书店，1992年影印本，第42册，第367页。
function formatAncientGazetteer(c: Citation): string {
  const parts: string[] = []
  // 地方志：修纂年代冠题名前，作者一般不标
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  // 题名前冠修纂年代
  const titleWithEra = c.compileEra
    ? `${c.compileEra}${processBookTitleMarks(`《${c.title}》`)}`
    : processBookTitleMarks(`《${c.title}》`)
  parts.push(titleWithEra)
  if (c.volume) parts.push(formatVolume(c.volume))
  if (c.section) parts.push(processBookTitleMarks(`《${c.section}》`))
  // 整理者（可选，在丛书名前）
  const pStr = punctuatorStr(c.punctuators || [])
  if (pStr) parts.push(pStr)
  // 丛书名（如有）+ 册数紧跟
  if (c.seriesName) {
    let seriesPart = processBookTitleMarks(`《${c.seriesName}》`)
    if (c.seriesVolume) seriesPart += formatSeriesVolume(c.seriesVolume)
    parts.push(seriesPart)
  }
  if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
  if (c.publishYear) {
    const editionTag = c.ancientEdition === '影印本' ? `${c.publishYear}年影印本` : `${c.publishYear}年`
    parts.push(editionTag)
  }
  if (c.pages) parts.push(pageStr(c.pages, 'zh'))
  return joinAncientParts(parts) + '。'
}

// ─── 常用基本典籍 ───────────────────────────────
// 规范：《旧唐书》卷9《玄宗纪下》，北京：中华书局，1975年标点本，上册，第233页。
function formatAncientClassic(c: Citation): string {
  const parts: string[] = []
  // 典籍一般不标作者
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  parts.push(processBookTitleMarks(`《${c.title}》`))
  if (c.volume) parts.push(formatVolume(c.volume))
  if (c.section) parts.push(processBookTitleMarks(`《${c.section}》`))
  if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
  if (c.publishYear) {
    const editionTag = c.ancientEdition ? `${c.publishYear}年${c.ancientEdition}` : `${c.publishYear}年`
    parts.push(editionTag)
  }
  if (c.bookletVolume) parts.push(formatBooklet(c.bookletVolume))
  if (c.pages) parts.push(pageStr(c.pages, 'zh'))
  return joinAncientParts(parts) + '。'
}

// ─── 编年体典籍 ─────────────────────────────────
// 规范：《清德宗实录》卷435，光绪二十四年十二月上，北京：中华书局，1987年影印本，第6册，第727页。
function formatAncientChronicle(c: Citation): string {
  const parts: string[] = []
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  if (dyn || auth) parts.push(dyn + auth + '：')
  parts.push(processBookTitleMarks(`《${c.title}》`))
  if (c.volume) parts.push(formatVolume(c.volume))
  // 年月甲子（在出版信息前）
  if (c.archiveDate) parts.push(c.archiveDate)
  if (c.publishPlace && c.publisher) parts.push(`${c.publishPlace}：${c.publisher}`)
  if (c.publishYear) {
    const editionTag = c.ancientEdition === '影印本' ? `${c.publishYear}年影印本` : `${c.publishYear}年`
    parts.push(editionTag)
  }
  if (c.bookletVolume) parts.push(formatBooklet(c.bookletVolume))
  if (c.pages) parts.push(pageStr(c.pages, 'zh'))
  return joinAncientParts(parts) + '。'
}

// ─── 向后兼容：未选子类型时用旧逻辑 ─────────────
function formatAncientLegacy(c: Citation): string {
  const dyn = dynastyPrefix(c)
  const auth = authorStr(c)
  let result = ''
  if (dyn || auth) result = dyn + auth + '：'
  result += processBookTitleMarks(`《${c.title}》`)
  if (c.volume) result += formatVolume(c.volume)
  if (c.section) result += processBookTitleMarks(`《${c.section}》`)
  if (c.ancientEdition) result += `，${c.ancientEdition}`
  if (c.seriesName) result += `，` + processBookTitleMarks(`《${c.seriesName}》`)
  if (c.publishPlace && c.publisher) result += `，${c.publishPlace}：${c.publisher}`
  if (c.publishYear) result += `，${c.publishYear}年`
  if (c.seriesVolume) result += `，${formatSeriesVolume(c.seriesVolume)}`
  if (c.pages) {
    const p = c.pageAB ? `${c.pages}页${c.pageAB}` : pageStr(c.pages, 'zh')
    result += `，${p}`
  }
  return result + '。'
}

// ─── 辅助函数：按古籍规范拼接 parts ──────────────
// 规则：
// - 第一个 part 直接放入
// - 若前一个 part 以"："结尾（作者后），当前 part 直接拼接
// - 否则前面加"，"
function joinAncientParts(parts: string[]): string {
  if (parts.length === 0) return ''
  let result = parts[0]
  for (let i = 1; i < parts.length; i++) {
    const prev = parts[i - 1]
    const next = parts[i]
    // 作者后直接拼接
    if (prev.endsWith('：')) { result += next; continue }
    // 卷次后直接拼接（卷X + 篇名/下一个元素）
    if (next.startsWith('卷')) { result += next; continue }
    // 卷次后的篇名直接拼接（卷X + 《篇名》）
    if (prev.startsWith('卷') && next.startsWith('《')) { result += next; continue }
    // 其他情况加逗号
    result += '，' + next
  }
  return result
}

/**
 * 年代前缀：[明]、[清] 等
 * 仅古籍用，有 dynasty 时输出方括号包裹
 */
function dynastyPrefix(c: Citation): string {
  return c.dynasty ? `[${c.dynasty}]` : ''
}

/**
 * 点校者/整理者字符串
 * 同角色合并：王安、谢安点校
 * 不同角色分开：王安点校、谢安整理
 */
function punctuatorStr(punctuators: import('../types').Author[]): string {
  if (!punctuators || punctuators.length === 0) return ''
  const roles = new Set(punctuators.map(p => p.role || '点校'))
  if (roles.size === 1) {
    const role = punctuators[0].role || '点校'
    return punctuators.map(p => p.name).join('、') + role
  }
  return punctuators.map(p => p.name + (p.role || '点校')).join('、')
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

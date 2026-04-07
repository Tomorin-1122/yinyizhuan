import { Citation } from '../types'

/**
 * 将中文数字转换为阿拉伯数字
 * 例如："三十" -> "30", "五" -> "5"
 */
function chineseToArabic(numStr: string): string {
  const chineseNums: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000
  }
  
  if (!numStr) return ''
  
  // 处理简单的"十"、"二十"等
  if (numStr === '十') return '10'
  
  let result = 0
  let temp = 0
  
  for (let i = 0; i < numStr.length; i++) {
    const char = numStr[i]
    const value = chineseNums[char]
    
    if (value === undefined) continue
    
    if (value >= 10) {
      if (value === 10) {
        if (temp === 0) temp = 1
        result += temp * 10
        temp = 0
      } else {
        if (temp === 0) temp = 1
        result += temp * value
        temp = 0
      }
    } else {
      temp = temp * 10 + value
    }
  }
  
  result += temp
  
  // 如果转换失败，返回原字符串
  return result > 0 ? result.toString() : numStr
}

/**
 * 提取卷数并转换为标准格式
 * 例如："三十卷" -> "卷 30", "卷五" -> "卷 5"
 */
function extractVolume(volumeStr: string | undefined): string {
  if (!volumeStr) return ''
  
  // 匹配"XX 卷"或"卷 XX"格式
  const match = volumeStr.match(/([零一二三四五六七八九十百千万两]+)卷|卷 ([零一二三四五六七八九十百千万两]+)/)
  if (match) {
    const numPart = match[1] || match[2]
    const arabicNum = chineseToArabic(numPart)
    return `卷${arabicNum}`
  }
  
  // 如果已经是阿拉伯数字格式
  const numMatch = volumeStr.match(/卷?\s*(\d+)/)
  if (numMatch) {
    return `卷${numMatch[1]}`
  }
  
  return volumeStr
}

/**
 * 判断是否为地方志
 * 规则：题名中包含"志"字（如府志、县志、通志等）
 */
function isLocalGazetteer(title: string): boolean {
  return /志/.test(title) && /(府志 | 县志 | 通志 | 州志 | 厅志 | 卫志 | 所志 | 里志 | 乡志 | 镇志 | 村志 | 山志 | 水志 | 寺志 | 庙志 | 观志 | 宫志 | 庵志 | 祠志 | 墓志 | 园志 | 谱志 | 图志)/.test(title)
}

/**
 * 判断朝代是否为明清或民国
 */
/**
 * 处理书名号嵌套
 */
function processBookTitleMarks(text: string): string {
  if (!text) return text
  
  let result = ''
  let depth = 0
  
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

/**
 * 格式化未出版古籍
 * 标准输出格式：[责任者]：《[文献题名]》[卷 X]，[版本]，[藏所] 藏（页码可选）ab 面。
 * 地方志特殊处理：年号《书名》卷 X，版本，藏所藏。
 */
export function formatUnpublishedAncient(citation: Citation): string {
  const c = citation
  const parts: string[] = []
  
  // 判断是否为地方志
  const isGazetteer = isLocalGazetteer(c.title)
  const hasEraInfo = c.ancientEdition && /(明 | 清 | 民国 | 洪武 | 永乐 | 嘉靖 | 万历 | 康熙 | 乾隆 | 光绪)/.test(c.ancientEdition)
  
  if (isGazetteer && hasEraInfo) {
    // 地方志特殊处理：不标注作者，年号 + 书名
    // 从版本信息中提取年号
    const eraMatch = c.ancientEdition?.match(/^(明 | 清 | 民国)?([A-Za-z\u4e00-\u9fa5]+?)(刻本 | 抄本 | 稿本 | 活字本 | 石印本 | 铅印本)?/)
    let eraName = ''
    if (eraMatch) {
      const dynasty = eraMatch[1] || ''
      const era = eraMatch[2] || ''
      eraName = dynasty + era
    }
    
    // 如果没有匹配到，尝试从题名中提取（如［萬曆］金華府志）
    if (!eraName) {
      const titleEraMatch = c.title.match(/\[([^\]]+)\]/)
      if (titleEraMatch) {
        eraName = titleEraMatch[1]
      }
    }
    
    if (eraName) {
      parts.push(`${eraName}${processBookTitleMarks(`《${c.title.replace(/\[[^\]]+\]/, '')}`)}`)
    } else {
      parts.push(processBookTitleMarks(`《${c.title}》`))
    }
  } else {
    // 一般古籍：责任者 + 书名
    if (c.authors && c.authors.length > 0) {
      const authorStr = c.authors.map(a => {
        if (!a.role || a.role === '著') return a.name
        return a.name + a.role
      }).join('、')
      parts.push(authorStr + '：')
    }
    parts.push(processBookTitleMarks(`《${c.title}》`))
  }
  
  // 卷次
  const volumeStr = extractVolume(c.volume || c.volumeNumberStr)
  if (volumeStr) {
    parts.push(volumeStr)
  }
  
  // 版本信息
  if (c.ancientEdition) {
    parts.push(c.ancientEdition)
  }
  
  // 藏所
  if (c.collectionInfo) {
    // 如果藏所已包含"藏"字，不再重复添加
    if (c.collectionInfo.endsWith('藏')) {
      parts.push(c.collectionInfo)
    } else {
      parts.push(c.collectionInfo + '藏')
    }
  }
  
  // 页码和 ab 面
  if (c.pages) {
    let pageStr = `第${c.pages}页`
    if (c.pageAB) {
      pageStr += c.pageAB
    }
    parts.push(pageStr)
  }
  
  return parts.join('，') + '。'
}

/**
 * 格式化已出版古籍（一般古籍）
 * 输出格式：[责任者]：《[文献题名]》[卷次]，[出版地]：[出版社]，[出版时间][版本]，第 [页码] 页 [ab 面]。
 */
export function formatPublishedAncient(citation: Citation): string {
  const c = citation
  const parts: string[] = []
  
  // 责任者
  if (c.authors && c.authors.length > 0) {
    const authorStr = c.authors.map(a => {
      if (!a.role || a.role === '著') return a.name
      return a.name + a.role
    }).join('、')
    parts.push(authorStr + '：')
  }
  
  // 书名和卷次
  let titlePart = processBookTitleMarks(`《${c.title}》`)
  if (c.volume) {
    titlePart += extractVolume(c.volume)
  }
  parts.push(titlePart)
  
  // 丛书信息（如果有）
  if (c.seriesName) {
    let seriesPart = processBookTitleMarks(`《${c.seriesName}》`)
    if (c.seriesBookNumber) {
      seriesPart += c.seriesBookNumber
    }
    parts.push(seriesPart)
  }
  
  // 出版信息
  const pubParts: string[] = []
  if (c.publishPlace) pubParts.push(c.publishPlace)
  if (c.publisher) pubParts.push(c.publisher)
  if (pubParts.length > 0) {
    parts.push(pubParts.join('：'))
  }
  
  // 出版时间和版本
  let yearVersion = ''
  if (c.publishYear) yearVersion += `${c.publishYear}年`
  if (c.edition) yearVersion += c.edition
  if (yearVersion) {
    parts.push(yearVersion)
  }
  
  // 页码和 ab 面
  if (c.pages) {
    let pageStr = `第${c.pages}页`
    if (c.pageAB) {
      pageStr += c.pageAB
    }
    parts.push(pageStr)
  }
  
  return parts.join('，') + '。'
}

/**
 * 格式化已出版地方志
 * 输出格式：[年号]《[文献题名]》[卷数]，《[丛书名]》第 [册] 册 [版本]，[出版地]：[出版社]，[出版年]，第 [页] 页 [ab 面]。
 */
export function formatLocalGazetteer(citation: Citation): string {
  const c = citation
  const parts: string[] = []
  
  // 年号 + 书名（无冒号）
  let titlePart = ''
  if (c.eraName) {
    titlePart += c.eraName
  }
  titlePart += processBookTitleMarks(`《${c.title}》`)
  parts.push(titlePart)
  
  // 卷数
  if (c.volume) {
    parts.push(extractVolume(c.volume))
  }
  
  // 丛书信息
  if (c.seriesName) {
    let seriesPart = processBookTitleMarks(`《${c.seriesName}》`)
    if (c.seriesBookNumber) {
      seriesPart += c.seriesBookNumber
    }
    // 版本信息附加在丛书后
    if (c.edition) {
      seriesPart += c.edition
    }
    parts.push(seriesPart)
  } else if (c.edition) {
    // 无丛书时，版本信息单独
    parts.push(c.edition)
  }
  
  // 出版信息（如果存在）
  if (c.publishPlace && c.publisher) {
    parts.push(`${c.publishPlace}：${c.publisher}`)
  } else if (c.publisher) {
    parts.push(c.publisher)
  }
  
  // 出版年
  if (c.publishYear) {
    parts.push(`${c.publishYear}年`)
  }
  
  // 页码和 ab 面
  if (c.pages) {
    let pageStr = `第${c.pages}页`
    if (c.pageAB) {
      pageStr += c.pageAB
    }
    parts.push(pageStr)
  }
  
  return parts.join('，') + '。'
}

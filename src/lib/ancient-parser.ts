import { Citation, Author } from './types'

/**
 * 将中文数字转换为阿拉伯数字
 */
function chineseToArabic(numStr: string): string {
  const chineseNums: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000
  }
  
  if (!numStr) return ''
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
  return result > 0 ? result.toString() : numStr
}

/**
 * 提取卷数并转换为标准格式
 */
function extractVolume(volumeStr: string | undefined): string {
  if (!volumeStr) return ''
  
  const match = volumeStr.match(/([零一二三四五六七八九十百千万两]+) 卷 | 卷 ([零一二三四五六七八九十百千万两]+)/)
  if (match) {
    const numPart = match[1] || match[2]
    const arabicNum = chineseToArabic(numPart)
    return `卷${arabicNum}`
  }
  
  const numMatch = volumeStr.match(/卷?\s*(\d+)/)
  if (numMatch) {
    return `卷${numMatch[1]}`
  }
  
  return volumeStr
}

/**
 * 判断是否为地方志
 */

/**
 * 解析全国古籍普查登记基本数据库格式
 * 标准格式（四行）：
 * 110000-0101-0010283 10634
 * ［萬曆］金華府志三十卷（明）王懋德（明）陸鳳儀纂修
 * 明萬曆刻本
 * 18 册 國家圖書館
 */
export function parseAncientDatabaseFormat(text: string): Partial<Citation> | null {
  const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  
  // 至少需要 4 行
  if (lines.length < 4) return null
  
  // 第一行应该是编号格式：数字 - 数字 - 数字 数字
  const firstLineMatch = /^\d+-\d+-\d+\s+\d+/.test(lines[0])
  if (!firstLineMatch) return null
  
  const result: Partial<Citation> = { type: 'ancient_unpublished' }
  
  // 第二行：题名与责任者
  const secondLine = lines[1]
  
  // 提取朝代信息（方括号内）
  const eraBracketMatch = secondLine.match(/\[([^\]]+)\]/)
  if (eraBracketMatch) {
    // 朝代信息可以用于后续判断
  }
  
  // 提取题名（包含卷数）
  // 题名通常到"XX 卷"为止
  const titleMatch = secondLine.match(/^(\[?[^\]]*\]?[^（(]+?)([零一二三四五六七八九十百千万两]+\s*卷|\d+\s*卷)?/)
  if (titleMatch) {
    let title = titleMatch[1].trim()
    // 去除朝代方括号标记
    title = title.replace(/\[[^\]]+\]/, '').trim()
    result.title = title
    
    // 提取卷数
    const volumePart = titleMatch[2]
    if (volumePart) {
      result.volumeNumberStr = volumePart.trim()
      result.volume = extractVolume(volumePart.trim())
    }
  }
  
  // 提取责任者（括号内的内容）
  const authorMatches = secondLine.matchAll(/（([^）]+)）|\\(([^)]+)\\)/g)
  const authors: Author[] = []
  for (const match of authorMatches) {
    const authorInfo = (match[1] || match[2] || '').trim()
    if (authorInfo) {
      // 分离朝代和姓名
      const dynastyMatch = authorInfo.match(/^(明 | 清 | 民国 | 元 | 宋 | 唐|漢 | 晋 | 南北朝)?(.+)$/)
      if (dynastyMatch) {
        const name = dynastyMatch[2].trim()
        // 检查是否包含责任方式（修、纂修、撰等）
        const roleMatch = name.match(/^(.+?)(修 | 纂修 | 撰 | 编 | 辑 | 校 | 注 | 译)$/)
        if (roleMatch) {
          authors.push({ name: roleMatch[1].trim(), role: roleMatch[2] })
        } else {
          authors.push({ name, role: '著' })
        }
      }
    }
  }
  
  if (authors.length > 0) {
    result.authors = authors
  }
  
  // 第三行：版本信息
  result.ancientEdition = lines[2]
  
  // 第四行：物理形态与藏所
  const fourthLine = lines[3]
  // 格式：18 册 國家圖書館
  const collectionMatch = fourthLine.match(/^\d+\s*册\s+(.+)$/)
  if (collectionMatch) {
    result.collectionInfo = collectionMatch[1].trim()
  } else {
    // 如果没有册数，整行作为藏所
    result.collectionInfo = fourthLine.replace(/^\d+\s*册\s*/, '').trim()
  }
  
  return result
}

/**
 * 通用的古籍文本解析函数
 */
export function parseAncientText(text: string): Partial<Citation> {
  // 首先尝试数据库格式
  const dbResult = parseAncientDatabaseFormat(text)
  if (dbResult) {
    return dbResult
  }
  
  // 降级处理：尝试从普通文本中提取信息
  const result: Partial<Citation> = { type: 'ancient_unpublished' }
  
  // 尝试提取责任者
  const authorMatch = text.match(/^(.+?)[:：]/)
  if (authorMatch) {
    result.authors = [{ name: authorMatch[1].trim(), role: '著' }]
  }
  
  // 尝试提取书名
  const titleMatch = text.match(/《([^》]+)》/)
  if (titleMatch) {
    result.title = titleMatch[1].trim()
  }
  
  // 尝试提取版本
  const editionMatch = text.match(/(刻本 | 抄本 | 稿本 | 活字本 | 石印本 | 铅印本 | 影印本 | 点校本 | 整理本)/)
  if (editionMatch) {
    result.ancientEdition = editionMatch[0]
  }
  
  return result
}

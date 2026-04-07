import { Citation } from './types'

function chineseToArabic(numStr: string): string {
  const chineseNums: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000
  }
  if (!numStr) return ''
  if (numStr === '十') return '10'
  let result = 0, temp = 0
  for (let i = 0; i < numStr.length; i++) {
    const value = chineseNums[numStr[i]]
    if (value === undefined) continue
    if (value >= 10) {
      if (temp === 0) temp = 1
      result += temp * value
      temp = 0
    } else {
      temp = temp * 10 + value
    }
  }
  result += temp
  return result > 0 ? result.toString() : numStr
}

export function parseAncientDatabaseFormat(text: string): Partial<Citation> | null {
  const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 4 || !/^\d+-\d+-\d+\s+\d+/.test(lines[0])) return null
  
  const result: Partial<Citation> = { type: 'ancient_unpublished' }
  let line = lines[1].replace(/[\uFF3B][^\uFF3D]+[\uFF3D]/g, '')
  
  const volMatch = line.match(/([零一二三四五六七八九十百千万两]+)\s*卷/)
  if (volMatch) {
    result.volumeNumberStr = `${volMatch[1]}卷`
    result.volume = `卷${chineseToArabic(volMatch[1])}`
    line = line.replace(/[零一二三四五六七八九十百千万两]+\s*卷/, '').trim()
  }
  
  // "杭州府志（明）陈善纂修" -> 题名 + (朝代) + 姓名 + 责任方式
  const m = line.match(/^(.+?)[\uFF08]([^\uFF09]+)[\uFF09](.+)$/)
  if (m) {
    result.title = m[1].trim()
    const authorPart = m[3].trim()
    const roleM = authorPart.match(/^(.+?)(修 | 纂修 | 撰 | 编 | 辑 | 校 | 注 | 译)$/)
    result.authors = roleM 
      ? [{ name: roleM[1].trim(), role: roleM[2] }]
      : [{ name: authorPart, role: '著' }]
  }
  
  result.ancientEdition = lines[2]
  const collM = lines[3].match(/^\d+\s*册\s+(.+)$/)
  result.collectionInfo = collM ? collM[1].trim() : lines[3].replace(/^\d+\s*册\s*/, '').trim()
  
  return result
}

export function parseAncientText(text: string): Partial<Citation> {
  const db = parseAncientDatabaseFormat(text)
  if (db) return db
  const r: Partial<Citation> = { type: 'ancient_unpublished' }
  const am = text.match(/^(.+?)[:：]/)
  if (am) r.authors = [{ name: am[1].trim(), role: '著' }]
  const tm = text.match(/《([^》]+)》/)
  if (tm) r.title = tm[1].trim()
  const em = text.match(/(刻本 | 抄本 | 稿本 | 活字本 | 石印本 | 铅印本 | 影印本 | 点校本 | 整理本)/)
  if (em) r.ancientEdition = em[0]
  return r
}

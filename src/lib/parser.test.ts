import { describe, it, expect } from 'vitest'
import { parseCitationText } from './parser'

describe('parseCitationText', () => {
  // ─── 中文著作 ────────────────────────────────────────
  describe('中文著作', () => {
    it('解析基本著作（著）', () => {
      const result = parseCitationText('赵景深：《文坛忆旧》，北新书局，1948年，第43页。')
      expect(result.title).toBe('文坛忆旧')
      expect(result.authors).toBeDefined()
      expect(result.authors![0].name).toBe('赵景深')
      expect(result.publishYear).toBe('1948')
    })

    it('解析含主编的著作', () => {
      const result = parseCitationText('张岱年主编：《中国哲学史》，北京大学出版社，2003年。')
      expect(result.title).toBe('中国哲学史')
      expect(result.authors![0].name).toContain('张岱年')
      expect(result.publishYear).toBeDefined()
    })

    it('解析含译者的著作', () => {
      const result = parseCitationText('费正清著，张沛译：《中国：传统与变迁》，世界知识出版社，2002年。')
      expect(result.title).toBeDefined()
      expect(result.publisher).toBeDefined()
    })
  })

  // ─── 中文期刊 ────────────────────────────────────────
  describe('中文期刊', () => {
    it('解析基本期刊文章', () => {
      const result = parseCitationText('王笛：《茶馆：成都的公共生活和微观世界》，《历史研究》2018年第3期，第12-20页。')
      expect(result.title).toBe('茶馆：成都的公共生活和微观世界')
      expect(result.type).toBe('journal')
      expect(result.journalName).toBeDefined()
    })
  })

  // ─── 英文著作 ────────────────────────────────────────
  describe('英文著作', () => {
    it('解析单作者英文著作', () => {
      const result = parseCitationText('Fairbank, J. K. China: A New History. Harvard University Press, 1992.')
      expect(result.language).toBe('en')
      expect(result.title).toBeDefined()
      expect(result.publishYear).toBeDefined()
    })
  })

  // ─── 残缺输入 ────────────────────────────────────────
  describe('残缺输入', () => {
    it('空字符串不崩溃', () => {
      expect(() => parseCitationText('')).not.toThrow()
    })

    it('只有标题不崩溃', () => {
      const result = parseCitationText('《某本书》')
      expect(result).toBeDefined()
      expect(result.title).toBeDefined()
    })

    it('随机文本不崩溃', () => {
      expect(() => parseCitationText('hello world 12345')).not.toThrow()
    })
  })

  // ─── 混合语言 ────────────────────────────────────────
  describe('混合语言', () => {
    it('中文标题+英文作者', () => {
      const result = parseCitationText('John Smith：《中国历史研究》，人民出版社，2020年。')
      expect(result).toBeDefined()
      expect(result.title).toBeDefined()
    })
  })
})

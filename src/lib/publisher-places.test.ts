import { describe, it, expect } from 'vitest'
import { lookupPlace, PUBLISHER_PLACES } from './publisher-places'

describe('lookupPlace', () => {
  // ─── 精确匹配 ────────────────────────────────────────
  describe('精确匹配', () => {
    it('社会科学文献出版社 → 北京', () => {
      expect(lookupPlace('社会科学文献出版社')).toBe('北京')
    })

    it('江苏人民出版社 → 南京', () => {
      expect(lookupPlace('江苏人民出版社')).toBe('南京')
    })

    it('三联书店 → 北京', () => {
      expect(lookupPlace('三联书店')).toBe('北京')
    })

    it('中华书局 → 北京', () => {
      expect(lookupPlace('中华书局')).toBe('北京')
    })

    it('Cambridge University Press → Cambridge', () => {
      expect(lookupPlace('Cambridge University Press')).toBe('Cambridge')
    })

    it('The University of North Carolina Press → Chapel Hill', () => {
      expect(lookupPlace('The University of North Carolina Press')).toBe('Chapel Hill')
    })

    it('人民出版社 → 北京（不被中国人民大学出版社抢先）', () => {
      expect(lookupPlace('人民出版社')).toBe('北京')
    })

    it('中国人民大学出版社 → 北京', () => {
      expect(lookupPlace('中国人民大学出版社')).toBe('北京')
    })
  })

  // ─── 归一化匹配（去掉空格/标点后精确） ─────────────
  describe('归一化匹配', () => {
    it('生活读书新知三联书店（无标点）→ 北京', () => {
      expect(lookupPlace('生活读书新知三联书店')).toBe('北京')
    })

    it('生活·读书·新知三联书店（有间隔号）→ 北京', () => {
      expect(lookupPlace('生活·读书·新知三联书店')).toBe('北京')
    })
  })

  // ─── 子串匹配（key ≤ 6 字时启用） ───────────────────
  describe('子串匹配', () => {
    it('三联书店在北京（精确优先）', () => {
      expect(lookupPlace('生活·读书·新知三联书店')).toBe('北京')
    })
  })

  // ─── 无匹配 ─────────────────────────────────────────
  describe('无匹配', () => {
    it('未知出版社 → undefined', () => {
      expect(lookupPlace('未知出版社')).toBeUndefined()
    })

    it('空字符串 → undefined', () => {
      expect(lookupPlace('')).toBeUndefined()
    })

    it('纯空格 → undefined', () => {
      expect(lookupPlace('   ')).toBeUndefined()
    })
  })

  // ─── 映射表基础检查 ─────────────────────────────────
  describe('映射表', () => {
    it('映射表非空', () => {
      expect(Object.keys(PUBLISHER_PLACES).length).toBeGreaterThan(50)
    })

    it('所有值都是非空字符串', () => {
      for (const [key, val] of Object.entries(PUBLISHER_PLACES)) {
        expect(key.trim()).toBe(key)
        expect(val.trim()).toBe(val)
        expect(val.length).toBeGreaterThan(0)
      }
    })
  })
})

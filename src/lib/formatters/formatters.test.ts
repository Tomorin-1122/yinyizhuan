import { describe, it, expect } from 'vitest'
import { Citation } from '../types'
import { formatLSYJ } from './lsyj'
import { formatGBT7714 } from './gbt7714'
import { formatAPA } from './apa'

// ─── 测试样本 ────────────────────────────────────────

const zhBook: Citation = {
  id: 'test1', type: 'book', language: 'zh',
  authors: [{ name: '赵景深', role: '著' }],
  title: '文坛忆旧', publisher: '北新书局', publishYear: '1948', pages: '43',
}

const zhBookMultiAuthor: Citation = {
  id: 'test2', type: 'book', language: 'zh',
  authors: [{ name: '张岱年', role: '主编' }, { name: '方立天', role: '编' }],
  title: '中国哲学史', publisher: '北京大学出版社', publishPlace: '北京', publishYear: '2003',
}

const zhJournal: Citation = {
  id: 'test3', type: 'journal', language: 'zh',
  authors: [{ name: '王笛', role: '著' }],
  title: '茶馆：成都的公共生活和微观世界',
  journalName: '历史研究', publishYear: '2018', issue: '3', pages: '12-20',
}

const enBook: Citation = {
  id: 'test4', type: 'book', language: 'en',
  authors: [{ name: 'John K. Fairbank' }],
  title: 'China: A New History', publisher: 'Harvard University Press',
  publishPlace: 'Cambridge', publishYear: '1992',
}

const enBookMultiAuthor: Citation = {
  id: 'test5', type: 'book', language: 'en',
  authors: [{ name: 'Paul A. Cohen' }, { name: 'John E. Schrecker' }],
  title: 'Reform in Nineteenth-Century China', publisher: 'Harvard University Press',
  publishYear: '1976',
}

const enJournal: Citation = {
  id: 'test6', type: 'journal', language: 'en',
  authors: [{ name: 'Wang, R.' }, { name: 'Tan, R.' }],
  title: 'Environmental Change and Agricultural Sustainability',
  journalName: 'Ecology and Society', publishYear: '2019',
  volumeNumber: '24', issue: '6',
}

const zhThesis: Citation = {
  id: 'test7', type: 'thesis', language: 'zh',
  authors: [{ name: '李华', role: '著' }],
  title: '清代漕运与社会变迁', thesisType: '博士学位论文',
  institution: '北京大学历史系', publishYear: '2015', pages: '67',
}

const zhNewspaper: Citation = {
  id: 'test8', type: 'newspaper', language: 'zh',
  authors: [{ name: '张三', role: '著' }],
  title: '文化自信与历史研究', newspaperName: '人民日报',
  publishDate: '2023年5月10日', pageSection: '7',
}

const zhArchive: Citation = {
  id: 'test9', type: 'archive', language: 'zh',
  authors: [{ name: '', role: '著' }],
  title: '北洋政府外交部档案',
  archiveDate: '1917年9月15日', archiveNumber: '北洋档案1011—5961',
  archiveLocation: '中国第二历史档案馆藏',
}

const zhElectronic: Citation = {
  id: 'test10', type: 'electronic', language: 'zh',
  authors: [{ name: '国务院', role: '著' }],
  title: '关于加强文物保护的若干意见',
  url: 'https://example.gov.cn/doc/2023', accessDate: '2023年10月4日', publishYear: '2023',
}

const zhTransferred: Citation = {
  id: 'test11', type: 'transferred', language: 'zh',
  authors: [{ name: '陈寅恪', role: '著' }],
  title: '隋唐制度渊源略论稿',
  originalCitation: '陈寅恪：《隋唐制度渊源略论稿》，商务印书馆，1944年',
  transferredFrom: '张国刚：《隋唐五代史》，人民出版社，2010年，第56页',
  pages: '56',
}

const zhAncient: Citation = {
  id: 'test12', type: 'ancient', language: 'zh',
  authors: [{ name: '张廷玉', role: '撰' }],
  title: '明史',
  ancientEdition: '光绪三年苏州文学山房活字本',
  section: '首辅志',
  pages: '12',
}

// ─── LSYJ 格式测试 ──────────────────────────────────

describe('formatLSYJ', () => {
  it('中文单作者著作', () => {
    const result = formatLSYJ(zhBook)
    expect(result).toContain('赵景深')
    expect(result).toContain('《文坛忆旧》')
    expect(result).toContain('北新书局')
    expect(result).toContain('1948')
    expect(result).toMatchSnapshot()
  })

  it('中文多作者著作', () => {
    const result = formatLSYJ(zhBookMultiAuthor)
    expect(result).toContain('张岱年')
    expect(result).toMatchSnapshot()
  })

  it('中文期刊', () => {
    const result = formatLSYJ(zhJournal)
    expect(result).toContain('王笛')
    expect(result).toContain('历史研究')
    expect(result).toMatchSnapshot()
  })

  it('英文著作', () => {
    const result = formatLSYJ(enBook)
    expect(result).toContain('Fairbank')
    expect(result).toMatchSnapshot()
  })

  it('英文多作者著作', () => {
    const result = formatLSYJ(enBookMultiAuthor)
    expect(result).toContain('Cohen')
    expect(result).toMatchSnapshot()
  })

  it('英文期刊', () => {
    const result = formatLSYJ(enJournal)
    expect(result).toContain('Ecology and Society')
    expect(result).toMatchSnapshot()
  })

  it('学位论文', () => {
    const result = formatLSYJ(zhThesis)
    expect(result).toContain('李华')
    expect(result).toMatchSnapshot()
  })

  it('报纸', () => {
    const result = formatLSYJ(zhNewspaper)
    expect(result).toContain('人民日报')
    expect(result).toMatchSnapshot()
  })

  it('档案', () => {
    const result = formatLSYJ(zhArchive)
    expect(result).toContain('北洋档案')
    expect(result).toMatchSnapshot()
  })

  it('电子文献', () => {
    const result = formatLSYJ(zhElectronic)
    expect(result).toContain('https://')
    expect(result).toMatchSnapshot()
  })

  it('转引文献', () => {
    const result = formatLSYJ(zhTransferred)
    expect(result).toContain('转引自')
    expect(result).toMatchSnapshot()
  })

  it('古籍', () => {
    const result = formatLSYJ(zhAncient)
    expect(result).toContain('明史')
    expect(result).toMatchSnapshot()
  })
})

// ─── GB/T 7714 格式测试 ─────────────────────────────

describe('formatGBT7714', () => {
  it('中文单作者著作', () => {
    const result = formatGBT7714(zhBook)
    expect(result).toContain('[M]')
    expect(result).toMatchSnapshot()
  })

  it('中文期刊', () => {
    const result = formatGBT7714(zhJournal)
    expect(result).toContain('[J]')
    expect(result).toMatchSnapshot()
  })

  it('英文著作', () => {
    const result = formatGBT7714(enBook)
    expect(result).toContain('[M]')
    expect(result).toMatchSnapshot()
  })

  it('学位论文', () => {
    const result = formatGBT7714(zhThesis)
    expect(result).toContain('[D]')
    expect(result).toMatchSnapshot()
  })
})

// ─── APA 格式测试 ────────────────────────────────────

describe('formatAPA', () => {
  it('中文单作者著作', () => {
    const result = formatAPA(zhBook)
    expect(result).toContain('赵景深')
    expect(result).toMatchSnapshot()
  })

  it('英文单作者著作', () => {
    const result = formatAPA(enBook)
    expect(result).toContain('Fairbank')
    expect(result).toMatchSnapshot()
  })

  it('英文双作者著作', () => {
    const result = formatAPA(enBookMultiAuthor)
    expect(result).toContain('&')
    expect(result).toMatchSnapshot()
  })

  it('英文期刊', () => {
    const result = formatAPA(enJournal)
    expect(result).toContain('Ecology and Society')
    expect(result).toMatchSnapshot()
  })
})

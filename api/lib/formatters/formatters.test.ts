import { describe, it, expect } from 'vitest'
import { Citation } from '../types.js'
import { formatLSYJ } from './lsyj.js'
import { formatGBT7714 } from './gbt7714.js'
import { formatAPA } from './apa.js'

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

  // ─── 古籍子类型测试 ─────────────────────────────────────

  it('古籍-刻本', () => {
    const c: Citation = {
      id: 'a1', type: 'ancient', language: 'zh', authors: [{ name: '姚际恒' }], title: '古今伪书考',
      ancientSubType: 'blockprint', volume: '卷3',
      ancientEdition: '光绪三年苏州文学山房活字本', pages: '9', pageAB: 'a',
    }
    expect(formatLSYJ(c)).toBe('姚际恒：《古今伪书考》卷3，光绪三年苏州文学山房活字本，第9页a。')
  })

  it('古籍-点校本', () => {
    const c: Citation = {
      id: 'a2', type: 'ancient', language: 'zh', authors: [{ name: '毛祥麟' }], title: '墨余录',
      ancientSubType: 'punctuated', punctuators: [{ name: '毕万忱' }],
      publishPlace: '上海', publisher: '上海古籍出版社', publishYear: '1985',
      ancientEdition: '标点本', pages: '35',
    }
    expect(formatLSYJ(c)).toBe('毛祥麟：《墨余录》，毕万忱点校，上海：上海古籍出版社，1985年标点本，第35页。')
  })

  it('古籍-影印本', () => {
    const c: Citation = {
      id: 'a3', type: 'ancient', language: 'zh', authors: [{ name: '杨钟羲' }], title: '雪桥诗话续集',
      ancientSubType: 'reprint', volume: '卷5',
      publishPlace: '沈阳', publisher: '辽沈书社', publishYear: '1991',
      ancientEdition: '影印本', bookletVolume: '上册', pages: '461', column: '下栏',
    }
    expect(formatLSYJ(c)).toBe('杨钟羲：《雪桥诗话续集》卷5，沈阳：辽沈书社，1991年影印本，上册，第461页下栏。')
  })

  it('古籍-析出文献', () => {
    const c: Citation = {
      id: 'a4', type: 'ancient', language: 'zh', authors: [{ name: '管志道' }], title: '续问辨牍',
      ancientSubType: 'extract', volume: '卷2', section: '答屠仪部赤水丈书',
      bookTitle: '四库全书存目丛书',
      publishPlace: '济南', publisher: '齐鲁书社', publishYear: '1997',
      ancientEdition: '影印本', category: '子部', seriesVolume: '第88册', pages: '73',
    }
    expect(formatLSYJ(c)).toBe('管志道：《续问辨牍》卷2《答屠仪部赤水丈书》，《四库全书存目丛书》，济南：齐鲁书社，1997年影印本，子部，第88册，第73页。')
  })

  it('古籍-地方志', () => {
    const c: Citation = {
      id: 'a5', type: 'ancient', language: 'zh', authors: [], title: '广东通志',
      ancientSubType: 'gazetteer', compileEra: '万历', volume: '卷15', section: '郡县志二·广州府·城池',
      seriesName: '稀见中国地方志汇刊',
      publishPlace: '北京', publisher: '中国书店', publishYear: '1992',
      ancientEdition: '影印本', seriesVolume: '第42册', pages: '367',
    }
    expect(formatLSYJ(c)).toBe('万历《广东通志》卷15《郡县志二·广州府·城池》，《稀见中国地方志汇刊》第42册，北京：中国书店，1992年影印本，第367页。')
  })

  it('古籍-常用基本典籍', () => {
    const c: Citation = {
      id: 'a6', type: 'ancient', language: 'zh', authors: [], title: '旧唐书',
      ancientSubType: 'classic', volume: '卷9', section: '玄宗纪下',
      publishPlace: '北京', publisher: '中华书局', publishYear: '1975',
      ancientEdition: '标点本', bookletVolume: '上册', pages: '233',
    }
    expect(formatLSYJ(c)).toBe('《旧唐书》卷9《玄宗纪下》，北京：中华书局，1975年标点本，上册，第233页。')
  })

  it('古籍-编年体典籍', () => {
    const c: Citation = {
      id: 'a7', type: 'ancient', language: 'zh', authors: [], title: '清德宗实录',
      ancientSubType: 'chronicle', volume: '卷435', archiveDate: '光绪二十四年十二月上',
      publishPlace: '北京', publisher: '中华书局', publishYear: '1987',
      ancientEdition: '影印本', bookletVolume: '第6册', pages: '727',
    }
    expect(formatLSYJ(c)).toBe('《清德宗实录》卷435，光绪二十四年十二月上，北京：中华书局，1987年影印本，第6册，第727页。')
  })

  it('古籍-向后兼容（未选子类型）', () => {
    const c: Citation = {
      id: 'a8', type: 'ancient', language: 'zh',
      authors: [{ name: '姚际恒' }], title: '古今伪书考', volume: '卷3',
      ancientEdition: '光绪三年苏州文学山房活字本', pages: '9',
    }
    const result = formatLSYJ(c)
    expect(result).toContain('姚际恒：《古今伪书考》')
    expect(result).toContain('卷3')
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

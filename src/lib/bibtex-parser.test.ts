import { describe, it, expect } from 'vitest'
import { parseBibTeX } from './bibtex-parser'

describe('parseBibTeX', () => {
  it('解析简单条目', () => {
    const bib = `@book{key1,
  author = {Zhang San},
  title = {A Simple Title},
  year = {2020},
  publisher = {Test Press},
}`
    const result = parseBibTeX(bib)
    expect(result.length).toBe(1)
    expect(result[0].title).toBe('A Simple Title')
    expect(result[0].publishYear).toBe('2020')
  })

  it('解析嵌套花括号标题', () => {
    const bib = `@article{key2,
  author = {Wang, R.},
  title = {A {Deeply} Nested {Example}},
  journal = {Test Journal},
  year = {2019},
}`
    const result = parseBibTeX(bib)
    expect(result.length).toBe(1)
    expect(result[0].title).toBe('A {Deeply} Nested {Example}')
  })

  it('解析多个条目', () => {
    const bib = `@book{key1,
  author = {Author One},
  title = {First Book},
  year = {2010},
}
@article{key2,
  author = {Author Two},
  title = {Second Article},
  journal = {Journal Name},
  year = {2015},
}`
    const result = parseBibTeX(bib)
    expect(result.length).toBe(2)
    expect(result[0].title).toBe('First Book')
    expect(result[1].title).toBe('Second Article')
  })

  it('解析含 DOI 的条目', () => {
    const bib = `@article{key3,
  author = {Li, H.},
  title = {Test Title},
  journal = {Some Journal},
  year = {2021},
  doi = {10.1000/test},
}`
    const result = parseBibTeX(bib)
    expect(result.length).toBe(1)
    expect(result[0].url).toContain('10.1000/test')
  })

  it('空内容不崩溃', () => {
    expect(parseBibTeX('')).toEqual([])
    expect(parseBibTeX('no bibtex here')).toEqual([])
  })
})

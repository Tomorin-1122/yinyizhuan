import { useState, useEffect, useRef } from 'react'
import { IconSearch, IconLoader } from './Icons'

interface AncientBook {
  id: number
  title: string
  fullTitle: string
  authors: { name: string; dynasty?: string; role: string }[]
  category: string
  volumes: { raw: string; start?: number; end?: number }
  totalVolumes: number
  series: string
  publisher: string
  publishYear: string
  version: string
}

// 生成《历史研究》格式引用
function generateCitation(book: AncientBook, volumeNum?: string): string {
  const parts: string[] = []
  
  // 责任者
  if (book.authors.length > 0) {
    const authorParts = book.authors.map(a => {
      const dynasty = a.dynasty ? `(${a.dynasty})` : ''
      return `${dynasty}${a.name}${a.role}`
    })
    parts.push(authorParts.join('，') + '：')
  }
  
  // 题名 + 卷次
  let titlePart = `《${book.title}》`
  if (volumeNum) titlePart += `卷${volumeNum}`
  parts.push(titlePart)
  
  // 丛书 + 册数
  if (book.series) {
    let seriesPart = `《${book.series}》`
    if (book.volumes?.start) seriesPart += `第${book.volumes.start}册`
    parts.push(seriesPart)
  }
  
  // 出版信息
  if (book.publisher) {
    const years = book.publishYear?.match(/\d{4}/g)
    const year = years ? years[years.length - 1] : ''
    parts.push(`台北：${book.publisher}${year ? `，${year}年` : ''}`)
  }
  
  return parts.join('，') + '。'
}

interface AncientBookSearchProps {
  onSelect: (book: AncientBook, citation: string) => void
}

export default function AncientBookSearch({ onSelect }: AncientBookSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AncientBook[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [allBooks, setAllBooks] = useState<AncientBook[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // 加载古籍数据库
  useEffect(() => {
    fetch('/ancient-books.json')
      .then(res => res.json())
      .then(data => setAllBooks(data))
      .catch(err => console.error('加载古籍数据库失败:', err))
  }, [])

  // 点击外部关闭结果列表
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 搜索古籍
  function searchAncientBooks(q: string) {
    if (!q.trim() || allBooks.length === 0) {
      setResults([])
      return
    }

    setLoading(true)
    const qLower = q.toLowerCase()
    const matched = allBooks.filter(book => 
      book.title.toLowerCase().includes(qLower) ||
      book.fullTitle.toLowerCase().includes(qLower) ||
      book.authors.some(a => a.name.toLowerCase().includes(qLower))
    ).slice(0, 10)
    
    setResults(matched)
    setShowResults(true)
    setLoading(false)
  }

  // 输入变化时防抖搜索
  function handleInputChange(value: string) {
    setQuery(value)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      searchAncientBooks(value)
    }, 200)
  }

  // 选择古籍
  function handleSelect(book: AncientBook) {
    setQuery(book.title)
    setShowResults(false)
    const citation = generateCitation(book)
    onSelect(book, citation)
  }

  // 作者显示
  function formatAuthors(authors: AncientBook['authors']): string {
    return authors.map(a => `${a.dynasty ? `[${a.dynasty}]` : ''}${a.name}`).join('、')
  }

  return (
    <div ref={searchRef} className="relative mb-3">
      <label className="block text-sm font-medium text-ink-800 mb-1">
        🔍 搜索常用基本典籍
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="input-field pl-8"
          placeholder="输入题名或作者，如：史记、周易、苏轼"
        />
        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        {loading && (
          <IconLoader className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 animate-spin" />
        )}
      </div>
      
      {/* 搜索结果列表 */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-ink-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map(book => (
            <button
              key={book.id}
              onClick={() => handleSelect(book)}
              className="w-full text-left px-3 py-2 hover:bg-ink-50 border-b border-ink-100 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-ink-800 truncate">{book.fullTitle}</div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {formatAuthors(book.authors)} · {book.category}部 · {book.volumes?.raw || ''}
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  {book.series || '四库全书'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* 无结果提示 */}
      {showResults && results.length === 0 && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-ink-200 rounded-lg shadow-lg p-3">
          <div className="text-sm text-ink-500">未找到"{query}"相关古籍</div>
        </div>
      )}
    </div>
  )
}

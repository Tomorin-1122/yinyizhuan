import { useState, useCallback } from 'react'
import { Citation, CitationType, TargetFormat, FORMAT_LIST, Author } from '../lib/types'
import { formatCitation } from '../lib/formatters'
import { parseCitationText } from '../lib/parser'
import { parseBibTeX } from '../lib/bibtex-parser'
import { parseRIS } from '../lib/ris-parser'
import { addRecord } from '../lib/storage'
import { generateId, copyToClipboard, downloadFile } from '../lib/utils'
import { canConvert, recordConversion, getRemainingCount, isAdmin, isUnlocked, unlock, getTrialRemaining, canFetchMetadata, recordMetadataFetch, getFetchMetadataRemaining } from '../lib/access'
import { IconCopy, IconDownload, IconCheck, IconUpload, IconLink, IconPaste, IconEdit, IconPlus, IconMinus, IconX, IconSearch, IconLoader } from '../components/Icons'
import { fetchMetadata } from '../lib/metadata-fetcher'

type InputMode = 'manual' | 'paste' | 'url' | 'file'

const CITATION_TYPES: { value: CitationType; label: string }[] = [
  { value: 'book', label: '著作' },
  { value: 'chapter', label: '析出文献(论文集)' },
  { value: 'journal', label: '期刊文章' },
  { value: 'newspaper', label: '报纸' },
  { value: 'thesis', label: '学位论文' },
  { value: 'conference', label: '会议论文' },
  { value: 'archive', label: '档案' },
  { value: 'ancient', label: '古籍' },
  { value: 'electronic', label: '电子文献' },
  { value: 'diary', label: '日记' },
  { value: 'transferred', label: '转引文献' },
  { value: 'classic', label: '经典古籍' },
]

const defaultCitation = (): Citation => ({
  id: generateId(),
  type: 'book',
  language: 'zh',
  authors: [{ name: '', role: '著' }],
  title: '',
})

export default function ConvertPage() {
  const [mode, setMode] = useState<InputMode>('manual')
  const [citation, setCitation] = useState<Citation>(defaultCitation())
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('lsyj')
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteShaking, setInviteShaking] = useState(false)
  const [, forceUpdate] = useState(0)
  const [pasteText, setPasteText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [parsedItems, setParsedItems] = useState<Partial<Citation>[]>([])
  const [toast, setToast] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const handleInviteSubmit = () => {
    if (unlock(inviteCode)) {
      setShowInvite(false)
      setInviteCode('')
      setInviteError('')
      forceUpdate(n => n + 1)
      showToast('邀请码验证成功，已解锁每日100次！')
    } else {
      setInviteError('邀请码错误，请重试')
      setInviteShaking(true)
      setTimeout(() => setInviteShaking(false), 500)
      setInviteCode('')
    }
  }

  const handleConvert = useCallback(() => {
    const status = canConvert()
    if (status === 'need_invite') {
      setShowInvite(true)
      return
    }
    if (status === 'daily_limit') {
      showToast('今日转换次数已达上限（100次），明日自动重置')
      return
    }
    const output = formatCitation(citation, targetFormat)
    setResult(output)
    recordConversion()
    forceUpdate(n => n + 1)
    addRecord({
      id: generateId(),
      citation,
      targetFormat,
      result: output,
      timestamp: Date.now(),
      rawInput: citation.rawText || '',
    })
    showToast('转换成功，已保存到历史记录')
  }, [citation, targetFormat])

  const handleCopy = async () => {
    const ok = await copyToClipboard(result)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  const handleDownload = () => {
    downloadFile(result, `citation_${Date.now()}.txt`, 'text/plain')
  }

  const handleParse = () => {
    if (!pasteText.trim()) return
    const parsed = parseCitationText(pasteText)
    const c = { ...defaultCitation(), ...parsed, id: generateId() } as Citation
    if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]
    setCitation(c)
    setMode('manual')
    showToast('已解析并填充到表单，请核对后转换')
  }

  const handleUrlImport = () => {
    if (!urlInput.trim()) return
    const c = defaultCitation()
    c.type = 'electronic'
    c.url = urlInput.trim()
    c.title = '待填写'
    setCitation(c)
    setMode('manual')
    showToast('URL已导入，请手动补充其他信息')
  }

  const handleAutoFetch = async () => {
    if (!urlInput.trim()) return
    
    // 检查每日限额
    const fetchStatus = canFetchMetadata()
    if (fetchStatus === 'isbn_limit_reached') {
      showToast('因 API 限额原因，每日自动抓取仅限 10 次，明日重置')
      return
    }

    setFetchLoading(true)
    const result = await fetchMetadata(urlInput)
    setFetchLoading(false)

    if (result.success && result.data) {
      recordMetadataFetch()
      forceUpdate(n => n + 1)

      const c = { ...defaultCitation(), ...result.data, id: generateId() } as Citation
      if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]

      // 智能判断文献类型
      if (result.data.journalName) c.type = 'journal'
      else if (result.data.publisher) c.type = 'book'

      setCitation(c)
      setMode('manual')
      const sourceTag = result.source ? `（数据来源：${result.source}）` : ''
      const remaining = getFetchMetadataRemaining()
      const quotaTag = !isAdmin() ? `，今日剩余 ${remaining} 次` : ''
      showToast(`已自动填充文献信息${sourceTag}${quotaTag}，请核对后转换`)
    } else {
      showToast(`自动获取失败：${result.error}`)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      let items: Partial<Citation>[] = []
      if (file.name.endsWith('.bib')) items = parseBibTeX(content)
      else if (file.name.endsWith('.ris')) items = parseRIS(content)
      else { showToast('仅支持 .bib 和 .ris 文件'); return }
      if (items.length === 0) { showToast('未解析到引用条目'); return }
      setParsedItems(items)
      if (items.length === 1) {
        const c = { ...defaultCitation(), ...items[0], id: generateId() } as Citation
        if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]
        setCitation(c)
        setMode('manual')
        showToast('已解析 1 条引用')
      } else {
        showToast(`已解析 ${items.length} 条引用，请选择`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const selectParsedItem = (item: Partial<Citation>) => {
    const c = { ...defaultCitation(), ...item, id: generateId() } as Citation
    if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]
    setCitation(c)
    setParsedItems([])
    setMode('manual')
  }

  const updateField = <K extends keyof Citation>(field: K, value: Citation[K]) => {
    setCitation(prev => ({ ...prev, [field]: value }))
  }

  const updateAuthor = (index: number, field: keyof Author, value: string) => {
    const authors = [...citation.authors]
    authors[index] = { ...authors[index], [field]: value }
    updateField('authors', authors)
  }

  const addAuthor = () => updateField('authors', [...citation.authors, { name: '' }])
  const removeAuthor = (i: number) => {
    if (citation.authors.length <= 1) return
    updateField('authors', citation.authors.filter((_, idx) => idx !== i))
  }

  const updateBookAuthor = (index: number, field: keyof Author, value: string) => {
    const authors = [...(citation.bookAuthors || [{ name: '' }])]
    authors[index] = { ...authors[index], [field]: value }
    updateField('bookAuthors', authors)
  }

  const addBookAuthor = () => updateField('bookAuthors', [...(citation.bookAuthors || []), { name: '' }])
  const removeBookAuthor = (i: number) => {
    const arr = citation.bookAuthors || []
    if (arr.length <= 1) return
    updateField('bookAuthors', arr.filter((_, idx) => idx !== i))
  }

  const updateTranslator = (index: number, value: string) => {
    const translators = [...(citation.translators || [{ name: '' }])]
    translators[index] = { name: value }
    updateField('translators', translators)
  }

  const handleReset = () => {
    setCitation(defaultCitation())
    setResult('')
    setPasteText('')
    setUrlInput('')
    setParsedItems([])
  }

  const modeButtons: { mode: InputMode; icon: typeof IconEdit; label: string }[] = [
    { mode: 'manual', icon: IconEdit, label: '手动填写' },
    { mode: 'paste', icon: IconPaste, label: '粘贴文本' },
    { mode: 'url', icon: IconLink, label: 'URL导入' },
    { mode: 'file', icon: IconUpload, label: '文件上传' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in dark:text-gray-100">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink-950 dark:bg-gray-100 text-parchment-50 dark:text-gray-900 px-6 py-3 font-body text-sm animate-slide-up">
          {toast}
        </div>
      )}

      {/* 邀请码弹窗 */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white border-2 border-ink-200 p-8 w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-bold text-lg text-ink-950">输入邀请码解锁</h3>
              <button onClick={() => { setShowInvite(false); setInviteCode(''); setInviteError('') }} className="btn-ghost px-2 py-1">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <p className="text-ink-500 text-sm mb-6">你已用完 10 次免费试用，输入邀请码后每日可转换 100 次</p>
            <div className={inviteShaking ? 'animate-[shake_0.4s_ease]' : ''}>
              <input
                type="text"
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value); setInviteError('') }}
                onKeyDown={e => e.key === 'Enter' && handleInviteSubmit()}
                className="input-field text-center text-xl font-mono tracking-[0.5em] mb-2"
                placeholder="- - - -"
                autoFocus
              />
              {inviteError && <p className="text-vermilion-600 text-sm text-center mb-2">{inviteError}</p>}
            </div>
            <button onClick={handleInviteSubmit} className="btn-primary w-full mt-2" disabled={!inviteCode.trim()}>
              确认
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-950 dark:text-gray-100">格式转换</h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm sm:text-base">输入引用信息，选择目标格式，即刻生成规范引用</p>
        </div>
        {!isAdmin() && (
          <div className="text-sm space-y-1 sm:text-right">
            {!isUnlocked() ? (
              <>
                <div>
                  <span className="text-ink-400 dark:text-gray-500">免费试用剩余</span>
                  <span className={`ml-2 font-mono font-bold text-lg ${getTrialRemaining() <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
                    {getTrialRemaining()}
                  </span>
                  <span className="text-ink-400 dark:text-gray-500"> / 10</span>
                </div>
                <div>
                  <span className="text-ink-400 dark:text-gray-500">自动抓取剩余</span>
                  <span className={`ml-2 font-mono font-bold text-lg ${getFetchMetadataRemaining() <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
                    {getFetchMetadataRemaining()}
                  </span>
                  <span className="text-ink-400 dark:text-gray-500"> / 10</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-ink-400 dark:text-gray-500">今日转换剩余</span>
                  <span className={`ml-2 font-mono font-bold text-lg ${getRemainingCount() <= 10 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
                    {getRemainingCount()}
                  </span>
                  <span className="text-ink-400 dark:text-gray-500"> / 100</span>
                </div>
                <div>
                  <span className="text-ink-400 dark:text-gray-500">自动抓取剩余</span>
                  <span className={`ml-2 font-mono font-bold text-lg ${getFetchMetadataRemaining() <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
                    {getFetchMetadataRemaining()}
                  </span>
                  <span className="text-ink-400 dark:text-gray-500"> / 10</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>

      {/* Input Mode Tabs */}
      <div className="flex border-2 border-ink-200 dark:border-gray-700 mb-0">
        {modeButtons.map(m => {
          const Icon = m.icon
          return (
            <button
              key={m.mode}
              onClick={() => setMode(m.mode)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium cursor-pointer transition-all duration-200 border-r-2 border-ink-200 dark:border-gray-700 last:border-r-0 ${
                mode === m.mode
                  ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
                  : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700 hover:text-ink-950 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-0">
        {/* Left: Input */}
        <div className="border-2 border-ink-200 dark:border-gray-700 border-t-0 lg:border-r-0 p-4 sm:p-6 bg-white dark:bg-gray-800">
          {mode === 'paste' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink-800">粘贴原始引用文本</label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                className="input-field h-48 resize-none font-mono text-sm"
                placeholder={'例如：赵景深：《文坛忆旧》，上海：北新书局，1948年，第43页。'}
              />
              <button onClick={handleParse} className="btn-primary w-full">解析并填充表单</button>
            </div>
          )}

          {mode === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">输入文献 URL 或 DOI / ISBN</label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAutoFetch()
                  }}
                  className="input-field font-mono text-sm"
                  placeholder="10.1000/xyz123 或 9787108034458 或 https://doi.org/..."
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-medium">💡 支持自动识别并填充：</p>
                <p>• <strong>DOI</strong>（如 <code className="bg-amber-100 px-1 rounded">10.1000/xyz</code>）→ 自动获取期刊/会议论文信息</p>
                <p>• <strong>ISBN</strong>（如 <code className="bg-amber-100 px-1 rounded">9787108034458</code>）→ 自动获取图书信息</p>
                <p>• <strong>URL</strong>（如 <code className="bg-amber-100 px-1 rounded">https://doi.org/...</code>）→ 保存链接供手动补充</p>
                {!isAdmin() && (
                  <p className="pt-1 border-t border-amber-200 mt-2">⚠️ 因 API 限额原因，DOI/ISBN 自动抓取每日限 <strong>10</strong> 次，明日自动重置</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoFetch}
                  disabled={!urlInput.trim() || fetchLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchLoading ? (
                    <><IconLoader className="w-4 h-4" />获取中...</>
                  ) : (
                    <><IconSearch className="w-4 h-4" />自动获取</>
                  )}
                </button>
                <button onClick={handleUrlImport} className="btn-secondary px-4">
                  仅导入URL
                </button>
              </div>
            </div>
          )}

          {mode === 'file' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink-800">上传 BibTeX (.bib) 或 RIS (.ris) 文件</label>
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-ink-300 bg-parchment-50 cursor-pointer hover:border-ink-500 hover:bg-parchment-100 transition-all duration-200">
                <IconUpload className="w-10 h-10 text-ink-400 mb-3" />
                <span className="text-ink-600 text-sm">点击或拖拽文件到此处</span>
                <span className="text-ink-400 text-xs mt-1">支持 .bib / .ris 格式</span>
                <input type="file" accept=".bib,.ris" onChange={handleFileUpload} className="hidden" />
              </label>
              {parsedItems.length > 1 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-ink-800">解析到 {parsedItems.length} 条引用，点击选择：</span>
                  {parsedItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => selectParsedItem(item)}
                      className="w-full text-left p-3 border border-ink-200 hover:border-ink-400 hover:bg-ink-50 transition-all duration-200 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{item.title || '未命名'}</span>
                      {item.authors?.[0]?.name && <span className="text-ink-500 ml-2">- {item.authors[0].name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <ManualForm
              citation={citation}
              updateField={updateField}
              updateAuthor={updateAuthor}
              addAuthor={addAuthor}
              removeAuthor={removeAuthor}
              updateBookAuthor={updateBookAuthor}
              addBookAuthor={addBookAuthor}
              removeBookAuthor={removeBookAuthor}
              updateTranslator={updateTranslator}
            />
          )}
        </div>

        {/* Right: Output */}
        <div className="border-2 border-ink-200 dark:border-gray-700 border-t-0 p-4 sm:p-6 bg-white dark:bg-gray-800 flex flex-col">
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-2">目标格式</label>
            <div className="grid grid-cols-3 gap-0">
              {FORMAT_LIST.map(f => (
                <button
                  key={f.id}
                  onClick={() => setTargetFormat(f.id)}
                  className={`px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 border-2 -ml-[2px] first:ml-0 ${
                    targetFormat === f.id
                      ? 'bg-ink-950 text-parchment-50 border-ink-950 z-10'
                      : 'bg-white text-ink-600 border-ink-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:border-ink-400 dark:hover:border-gray-400'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={handleConvert} className="btn-primary flex-1">转换</button>
            <button onClick={handleReset} className="btn-secondary px-4">
              <IconX className="w-4 h-4" />
              重置
            </button>
          </div>

          {result && (
            <div className="flex-1 flex flex-col animate-slide-up">
              <label className="block text-sm font-medium text-ink-800 mb-2">转换结果</label>
              <div className="flex-1 p-4 bg-parchment-50 border-2 border-ink-200 font-body text-ink-950 leading-relaxed text-sm whitespace-pre-wrap min-h-[120px]">
                {result}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleCopy} className="btn-ghost flex-1 text-sm">
                  {copied ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconCopy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
                <button onClick={handleDownload} className="btn-ghost flex-1 text-sm">
                  <IconDownload className="w-4 h-4" />
                  下载
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Manual Form Sub-Component ---------- */

interface ManualFormProps {
  citation: Citation
  updateField: <K extends keyof Citation>(field: K, value: Citation[K]) => void
  updateAuthor: (index: number, field: keyof Author, value: string) => void
  addAuthor: () => void
  removeAuthor: (i: number) => void
  updateBookAuthor: (index: number, field: keyof Author, value: string) => void
  addBookAuthor: () => void
  removeBookAuthor: (i: number) => void
  updateTranslator: (index: number, value: string) => void
}

function ManualForm({
  citation, updateField,
  updateAuthor, addAuthor, removeAuthor,
  updateBookAuthor, addBookAuthor, removeBookAuthor,
  updateTranslator,
}: ManualFormProps) {
  const c = citation
  const showBookFields = ['book', 'ancient', 'diary', 'classic'].includes(c.type)
  const showChapterFields = c.type === 'chapter'
  const showJournalFields = c.type === 'journal'
  const showNewspaperFields = c.type === 'newspaper'
  const showThesisFields = ['thesis', 'conference'].includes(c.type)
  const showArchiveFields = c.type === 'archive'
  const showElectronicFields = c.type === 'electronic'
  const showAncientFields = c.type === 'ancient'
  const showTransferredFields = c.type === 'transferred'

  return (
    <div className="space-y-5">
      {/* Type & Language */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-800 mb-1">文献类型</label>
          <select
            value={c.type}
            onChange={e => updateField('type', e.target.value as CitationType)}
            className="input-field cursor-pointer"
          >
            {CITATION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-800 mb-1">语言</label>
          <select
            value={c.language}
            onChange={e => updateField('language', e.target.value as 'zh' | 'en' | 'ja')}
            className="input-field cursor-pointer"
          >
            <option value="zh">中文</option>
            <option value="en">英文</option>
            <option value="ja">日文</option>
          </select>
        </div>
      </div>

      {/* Authors */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-ink-800">责任者(作者)</label>
          <button onClick={addAuthor} className="btn-ghost text-xs py-1 px-2">
            <IconPlus className="w-3 h-3" />添加
          </button>
        </div>
        {c.authors.map((a, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={a.name}
              onChange={e => updateAuthor(i, 'name', e.target.value)}
              className="input-field flex-1"
              placeholder={c.language === 'zh' ? '姓名' : 'Full Name'}
            />
            <input
              value={a.role || ''}
              onChange={e => updateAuthor(i, 'role', e.target.value)}
              className="input-field w-20"
              placeholder="著"
            />
            {c.authors.length > 1 && (
              <button onClick={() => removeAuthor(i)} className="btn-ghost text-vermilion-600 px-2">
                <IconMinus className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-ink-800 mb-1">文献题名</label>
        <input
          value={c.title}
          onChange={e => updateField('title', e.target.value)}
          className="input-field"
          placeholder={c.language === 'zh' ? '如：中国古代史研究' : 'Title of the Work'}
        />
      </div>

      {/* Book fields */}
      {(showBookFields || showChapterFields) && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版地点</label>
              <input value={c.publishPlace || ''} onChange={e => updateField('publishPlace', e.target.value)} className="input-field" placeholder="北京" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版社</label>
              <input value={c.publisher || ''} onChange={e => updateField('publisher', e.target.value)} className="input-field" placeholder="人民出版社" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="2020" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">页码</label>
              <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="43" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-ink-800 mb-1">卷次/册</label>
              <input value={c.volume || ''} onChange={e => updateField('volume', e.target.value)} className="input-field" placeholder="第3卷" />
            </div>
          </div>
        </>
      )}

      {/* Translator */}
      {(showBookFields || showChapterFields) && (
        <div>
          <label className="block text-sm font-medium text-ink-800 mb-1">译者(可选)</label>
          {(c.translators || []).map((t, i) => (
            <input key={i} value={t.name} onChange={e => updateTranslator(i, e.target.value)} className="input-field mb-2" placeholder="译者姓名" />
          ))}
          {(!c.translators || c.translators.length === 0) && (
            <button onClick={() => updateField('translators', [{ name: '' }])} className="btn-ghost text-xs py-1 px-2">
              <IconPlus className="w-3 h-3" />添加译者
            </button>
          )}
        </div>
      )}

      {/* Chapter fields */}
      {showChapterFields && (
        <>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">文集题名</label>
            <input value={c.bookTitle || ''} onChange={e => updateField('bookTitle', e.target.value)} className="input-field" placeholder="文集名称" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-ink-800">文集责任者</label>
              <button onClick={addBookAuthor} className="btn-ghost text-xs py-1 px-2">
                <IconPlus className="w-3 h-3" />添加
              </button>
            </div>
            {(c.bookAuthors || [{ name: '' }]).map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={a.name} onChange={e => updateBookAuthor(i, 'name', e.target.value)} className="input-field flex-1" placeholder="姓名" />
                <input value={a.role || ''} onChange={e => updateBookAuthor(i, 'role', e.target.value)} className="input-field w-20" placeholder="编" />
                {(c.bookAuthors || []).length > 1 && (
                  <button onClick={() => removeBookAuthor(i)} className="btn-ghost text-vermilion-600 px-2"><IconMinus className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Journal fields */}
      {showJournalFields && (
        <>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">期刊名称</label>
            <input value={c.journalName || ''} onChange={e => updateField('journalName', e.target.value)} className="input-field" placeholder="中国史研究" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="1998" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">期号</label>
              <input value={c.issue || ''} onChange={e => updateField('issue', e.target.value)} className="input-field" placeholder="3" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-ink-800 mb-1">页码(可选)</label>
              <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="12-20" />
            </div>
          </div>
        </>
      )}

      {/* Newspaper fields */}
      {showNewspaperFields && (
        <>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">报纸名称</label>
            <input value={c.newspaperName || ''} onChange={e => updateField('newspaperName', e.target.value)} className="input-field" placeholder="四川工人日报" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版日期</label>
              <input value={c.publishDate || ''} onChange={e => updateField('publishDate', e.target.value)} className="input-field" placeholder="1986年8月22日" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">版次</label>
              <input value={c.pageSection || ''} onChange={e => updateField('pageSection', e.target.value)} className="input-field" placeholder="2" />
            </div>
          </div>
        </>
      )}

      {/* Thesis fields */}
      {showThesisFields && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">论文类型</label>
              <input value={c.thesisType || ''} onChange={e => updateField('thesisType', e.target.value)} className="input-field" placeholder="博士学位论文" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">学校/机构</label>
              <input value={c.institution || ''} onChange={e => updateField('institution', e.target.value)} className="input-field" placeholder="北京师范大学历史系" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="2000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">页码</label>
              <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="67" />
            </div>
          </div>
        </>
      )}

      {/* Archive fields */}
      {showArchiveFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">档案日期</label>
            <input value={c.archiveDate || ''} onChange={e => updateField('archiveDate', e.target.value)} className="input-field" placeholder="1917年9月15日" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">卷宗号</label>
            <input value={c.archiveNumber || ''} onChange={e => updateField('archiveNumber', e.target.value)} className="input-field" placeholder="北洋档案1011—5961" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">藏所</label>
            <input value={c.archiveLocation || ''} onChange={e => updateField('archiveLocation', e.target.value)} className="input-field" placeholder="中国第二历史档案馆藏" />
          </div>
        </div>
      )}

      {/* Electronic fields */}
      {showElectronicFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">URL</label>
            <input value={c.url || ''} onChange={e => updateField('url', e.target.value)} className="input-field font-mono text-sm" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">访问日期</label>
              <input value={c.accessDate || ''} onChange={e => updateField('accessDate', e.target.value)} className="input-field" placeholder="1998年10月4日" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="1998" />
            </div>
          </div>
        </div>
      )}

      {/* Ancient text fields */}
      {showAncientFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">版本信息</label>
            <input value={c.ancientEdition || ''} onChange={e => updateField('ancientEdition', e.target.value)} className="input-field" placeholder="光绪三年苏州文学山房活字本" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">篇名/部类</label>
              <input value={c.section || ''} onChange={e => updateField('section', e.target.value)} className="input-field" placeholder="首辅志" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">a/b面</label>
              <input value={c.pageAB || ''} onChange={e => updateField('pageAB', e.target.value)} className="input-field" placeholder="a 或 b" />
            </div>
          </div>
        </div>
      )}

      {/* Transferred fields */}
      {showTransferredFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">原文献信息</label>
            <input value={c.originalCitation || ''} onChange={e => updateField('originalCitation', e.target.value)} className="input-field" placeholder="原文献的完整信息" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">转引文献信息</label>
            <input value={c.transferredFrom || ''} onChange={e => updateField('transferredFrom', e.target.value)} className="input-field" placeholder="转引来源的完整信息" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">页码</label>
            <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="56" />
          </div>
        </div>
      )}
    </div>
  )
}

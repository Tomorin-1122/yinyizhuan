import { useState, useCallback, useMemo } from 'react'
import { Citation, TargetFormat, FORMAT_LIST, Author } from '../lib/types'
import { formatCitation } from '../lib/formatters'
import { parseCitationText } from '../lib/parser'
import { parseBibTeX } from '../lib/bibtex-parser'
import { parseRIS } from '../lib/ris-parser'
import { addRecord } from '../lib/storage'
import { generateId, copyToClipboard, downloadFile } from '../lib/utils'
import { canConvert, recordConversion, isAdmin, canFetchMetadata, recordMetadataFetch, getFetchMetadataRemaining } from '../lib/access'
import { useAccessState } from '../lib/use-access'
import { validateCitation } from '../lib/validate'
import { IconCopy, IconDownload, IconCheck, IconLink, IconPaste, IconEdit, IconUpload, IconX, IconSearch, IconLoader, IconChevronDown } from '../components/Icons'
import { fetchMetadata } from '../lib/metadata-fetcher'
import { Converter } from 'opencc-js'
import ManualForm from '../components/ManualForm'
import InviteModal from '../components/InviteModal'
import FileUploadArea from '../components/FileUploadArea'
import AddToGroupButton from '../components/AddToGroupButton'
import AccessQuotaDisplay from '../components/AccessQuotaDisplay'

type InputMode = 'manual' | 'paste' | 'url' | 'file'

const defaultCitation = (): Citation => ({
  id: generateId(),
  type: 'book',
  language: 'zh',
  authors: [{ name: '', role: '著' }],
  title: '',
})

// 繁简转换：繁体转简体（模块级，无状态纯转换器，无需每次 render 重建）
const traditionalToSimplified = Converter({ from: 'tw', to: 'cn' })

export default function ConvertPage() {
  const [mode, setMode] = useState<InputMode>('manual')
  const [citation, setCitation] = useState<Citation>(defaultCitation())
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('lsyj')
  const [result, setResult] = useState('')
  const [lastRecordId, setLastRecordId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPages, setShowPages] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [parsedItems, setParsedItems] = useState<Partial<Citation>[]>([])
  const [toast, setToast] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const { refresh: refreshAccess } = useAccessState()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  // P3-2: 输入校验（点转换后才显示）
  const [showErrors, setShowErrors] = useState(false)
  const fieldErrors = useMemo(() => validateCitation(citation), [citation])
  const displayErrors = showErrors ? fieldErrors : []

  // P3-3: 重置确认
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const isFormEmpty = !citation.title.trim() && citation.authors.every(a => !a.name.trim())

  const handleConvert = useCallback(() => {
    // P3-2: 转换前校验
    const errors = validateCitation(citation)
    if (errors.length > 0) {
      setShowErrors(true)
      showToast(`有 ${errors.length} 个字段需要修正`)
      return
    }
    setShowErrors(false)
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
    setShowPages(false)
    recordConversion()
    refreshAccess()
    const newId = generateId()
    setLastRecordId(newId)
    addRecord({
      id: newId,
      citation,
      targetFormat,
      result: output,
      timestamp: Date.now(),
      rawInput: citation.rawText || '',
    })
    showToast('转换成功，已保存到历史记录')
    if (citation.notes?.includes('出版者不详')) {
      showToast('⚠️ 该会议论文出版者不详，请手动填写出版社和出版地')
    }
  }, [citation, targetFormat, refreshAccess])

  const handleCopy = async () => {
    const ok = await copyToClipboard(displayedResult)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  const handleDownload = () => {
    downloadFile(result, `citation_${Date.now()}.txt`, 'text/plain')
  }

  // 生成含页码版本（仅期刊）
  const getResultWithPages = (): string => {
    if (!result || targetFormat !== 'lsyj' || citation.type !== 'journal') return result
    if (!citation.pages) return result
    const pagePart = citation.language === 'en'
      ? `, p.${citation.pages}`
      : `，第${citation.pages}页`
    return result.replace(/。$/, pagePart + '。').replace(/\.$/, pagePart + '.')
  }

  const displayedResult = showPages ? getResultWithPages() : result

  const handleParse = () => {
    if (!pasteText.trim()) return
    const simplifiedText = traditionalToSimplified(pasteText)
    const parsed = parseCitationText(simplifiedText)
    const c = { ...defaultCitation(), ...parsed, id: generateId() } as Citation
    if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]
    setCitation(c)
    setMode('manual')
    const isDouban = /出版社[:：]/.test(simplifiedText) && /出版年[:：]/.test(simplifiedText)
    if (isDouban) {
      showToast('已解析豆瓣图书信息，请补充"出版地点"后转换')
    } else {
      showToast('已解析并填充到表单，请核对后转换')
    }
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
      refreshAccess()

      const c = { ...defaultCitation(), ...result.data, id: generateId() } as Citation
      if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]

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

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      let items: Partial<Citation>[] = []
      if (file.name.endsWith('.bib')) items = parseBibTeX(content)
      else if (file.name.endsWith('.ris')) items = parseRIS(content)
      else if (file.name.endsWith('.txt')) {
        const parsed = parseCitationText(content)
        if (parsed.title || parsed.authors?.length) {
          items = [parsed]
        }
      }
      else { showToast('仅支持 .bib、.ris 和 .txt 文件'); return }
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
    if (isFormEmpty) {
      doReset()
      return
    }
    setShowResetConfirm(true)
  }

  const doReset = () => {
    setCitation(defaultCitation())
    setResult('')
    setPasteText('')
    setUrlInput('')
    setParsedItems([])
    setShowResetConfirm(false)
    setShowErrors(false)
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

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={refreshAccess}
        onToast={showToast}
      />

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-950 dark:text-gray-100">格式转换</h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm sm:text-base">输入引用信息，选择目标格式，即刻生成规范引用</p>
        </div>
        {!isAdmin() && (
          <div className="text-sm space-y-1 sm:text-right">
            <AccessQuotaDisplay />
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

      <div className="flex flex-col lg:flex-row border-2 border-t-0 border-ink-200 dark:border-gray-700">
        {/* Left: Input */}
        <div className="flex-1 border-r-2 border-ink-200 dark:border-gray-700 border-t-0 border-l-0 border-b-0 p-4 sm:p-6 bg-white dark:bg-gray-800">
          {mode === 'paste' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink-800">粘贴原始引用文本</label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                className="input-field h-48 resize-none font-mono text-sm"
                placeholder={'支持格式：\n• 中文：赵景深：《文坛忆旧》，北新书局，1948年，第43页。\n• GB/T 7714：[1]作者.题名[J].期刊,2020,(3):12-20.\n• APA（外文期刊）：Wang, R., & Tan, R. (2019). Title. Journal, 24(6).\n• 豆瓣图书：多行格式，含"出版社:"、"出版年:"'}
              />
              {pasteText && !/[\u4e00-\u9fa5]/.test(pasteText) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <span className="shrink-0 font-bold">i</span>
                  <span>检测到外文文献，建议核实表单后转换。</span>
                </div>
              )}
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
            <FileUploadArea
              onProcessFile={processFile}
              parsedItems={parsedItems}
              onSelectItem={selectParsedItem}
            />
          )}

          {mode === 'manual' && (
            <ManualForm
              citation={citation}
              errors={displayErrors}
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
        <div className="flex-1 p-4 sm:p-6 bg-white dark:bg-gray-800 flex flex-col">
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
                {displayedResult}
              </div>
              {targetFormat === 'lsyj' && citation.language === 'en' && result.includes('*') && (
                <div className="bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800 mt-2">
                  标 <code>*</code> 的部分需在 Word 中设为斜体。
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={handleCopy} className="btn-ghost flex-1 text-sm">
                  {copied ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconCopy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
                <button onClick={handleDownload} className="btn-ghost flex-1 text-sm">
                  <IconDownload className="w-4 h-4" />
                  下载
                </button>
                {targetFormat === 'lsyj' && citation.type === 'journal' && citation.pages && (
                  <button
                    onClick={() => setShowPages(!showPages)}
                    className="btn-ghost flex-1 text-sm"
                    title="显示/隐藏期刊页码"
                  >
                    <IconChevronDown className={`w-4 h-4 transition-transform ${showPages ? 'rotate-180' : ''}`} />
                    {showPages ? '隐藏页码' : '显示页码'}
                  </button>
                )}
                {lastRecordId && (
                  <AddToGroupButton
                    recordId={lastRecordId}
                    onToast={showToast}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P3-3: 重置确认弹窗 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-6">
          <div className="bg-white dark:bg-gray-800 border-2 border-ink-200 dark:border-gray-700 p-6 max-w-sm w-full animate-slide-up">
            <h3 className="font-display font-bold text-lg text-ink-950 dark:text-gray-100 mb-2">确认清空表单？</h3>
            <p className="text-ink-500 dark:text-gray-400 text-sm mb-6">当前填写的内容将丢失，此操作不可撤销。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary px-4 py-2">取消</button>
              <button onClick={doReset} className="bg-vermilion-600 text-white px-4 py-2 text-sm font-medium hover:bg-vermilion-700 transition-colors cursor-pointer">确认清空</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

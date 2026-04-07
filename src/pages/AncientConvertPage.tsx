import { useState, useCallback } from 'react'
// @ts-ignore - opencc-js/t2cn 没有类型声明
import { Converter } from 'opencc-js/t2cn'
import { Citation, Author } from '../lib/types'
import { formatUnpublishedAncient, formatPublishedAncient, formatLocalGazetteer } from '../lib/formatters/ancient'
import { parseAncientText } from '../lib/ancient-parser'
import { addRecord } from '../lib/storage'
import { generateId, copyToClipboard } from '../lib/utils'
import { canConvert, recordConversion, isAdmin, isUnlocked, getTrialRemaining, getRemainingCount } from '../lib/access'
import { IconCopy, IconCheck, IconPaste, IconEdit, IconPlus, IconMinus, IconX } from '../components/Icons'

type InputMode = 'manual' | 'paste'
type AncientTab = 'unpublished' | 'published'
type PublishedSubType = 'general' | 'local_gazetteer'

const defaultCitation = (): Citation => ({
  id: generateId(),
  type: 'ancient_unpublished',
  language: 'zh',
  authors: [{ name: '', role: '著' }],
  title: '',
})

export default function AncientConvertPage() {
  const [mode, setMode] = useState<InputMode>('manual')
  const [tab, setTab] = useState<AncientTab>('unpublished')
  const [publishedSubType, setPublishedSubType] = useState<PublishedSubType>('general')
  const [citation, setCitation] = useState<Citation>(defaultCitation())
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [toast, setToast] = useState('')
  const [showAuthorForGazetteer, setShowAuthorForGazetteer] = useState(false)

  // 繁简转换 - 使用 t2cn 预设（繁体到简体）
  const traditionalToSimplified = Converter()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const handleConvert = useCallback(() => {
    const status = canConvert()
    if (status === 'need_invite') {
      showToast('请先输入邀请码解锁')
      return
    }
    if (status === 'daily_limit') {
      showToast('今日转换次数已达上限')
      return
    }

    let output = ''
    if (tab === 'unpublished') {
      output = formatUnpublishedAncient(citation)
    } else {
      if (publishedSubType === 'local_gazetteer') {
        output = formatLocalGazetteer(citation)
      } else {
        output = formatPublishedAncient(citation)
      }
    }
    
    setResult(output)
    recordConversion()
    const newId = generateId()
    addRecord({
      id: newId,
      citation,
      targetFormat: 'lsyj',
      result: output,
      timestamp: Date.now(),
      rawInput: citation.rawText || '',
    })
    showToast('转换成功，已保存到历史记录')
  }, [citation, tab, publishedSubType])

  const handleCopy = async () => {
    const ok = await copyToClipboard(result)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  const handleParse = () => {
    if (!pasteText.trim()) return
    const simplifiedText = traditionalToSimplified(pasteText)
    const parsed = parseAncientText(simplifiedText)
    const c = { ...defaultCitation(), ...parsed, id: generateId() } as Citation
    if (!c.authors || c.authors.length === 0) c.authors = [{ name: '' }]
    setCitation(c)
    setMode('manual')
    showToast('已解析并填充到表单，请核对后转换')
  }

  const handleReset = () => {
    setCitation(defaultCitation())
    setResult('')
    setPasteText('')
    setTab('unpublished')
    setPublishedSubType('general')
    setShowAuthorForGazetteer(false)
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

  const isLocalGazetteer = /志/.test(citation.title) && /(府志 | 县志 | 通志 | 州志 | 厅志 | 卫志 | 所志 | 里志 | 乡志 | 镇志 | 村志 | 山志 | 水志 | 寺志 | 庙志 | 观志 | 宫志 | 庵志 | 祠志 | 墓志 | 园志 | 谱志 | 图志)/.test(citation.title)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in dark:text-gray-100">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink-950 dark:bg-gray-100 text-parchment-50 dark:text-gray-900 px-6 py-3 font-body text-sm animate-slide-up">
          {toast}
        </div>
      )}

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-950 dark:text-gray-100">古籍引文格式转换</h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm sm:text-base">支持全国古籍普查登记基本数据库格式转换</p>
        </div>
        {!isAdmin() && (
          <div className="text-sm space-y-1 sm:text-right">
            {!isUnlocked() ? (
              <div>
                <span className="text-ink-400 dark:text-gray-500">免费试用剩余</span>
                <span className={`ml-2 font-mono font-bold text-lg ${getTrialRemaining() <= 3 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
                  {getTrialRemaining()}
                </span>
                <span className="text-ink-400 dark:text-gray-500"> / 10</span>
              </div>
            ) : (
              <div>
                <span className="text-ink-400 dark:text-gray-500">今日转换剩余</span>
                <span className={`ml-2 font-mono font-bold text-lg ${getRemainingCount() <= 10 ? 'text-vermilion-600' : 'text-ink-950 dark:text-gray-100'}`}>
                  {getRemainingCount()}
                </span>
                <span className="text-ink-400 dark:text-gray-500"> / 100</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Tabs: Unpublished vs Published */}
      <div className="flex border-2 border-ink-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => { setTab('unpublished'); setMode('manual'); }}
          className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer transition-all duration-200 border-r-2 border-ink-200 dark:border-gray-700 ${
            tab === 'unpublished'
              ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
              : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700'
          }`}
        >
          未出版古籍
        </button>
        <button
          onClick={() => { setTab('published'); setMode('manual'); }}
          className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer transition-all duration-200 ${
            tab === 'published'
              ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
              : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700'
          }`}
        >
          已出版古籍
        </button>
      </div>

      {/* Sub-tabs for Published */}
      {tab === 'published' && (
        <div className="flex border-2 border-ink-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => { setPublishedSubType('general'); setMode('manual'); }}
            className={`flex-1 px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 border-r-2 border-ink-200 dark:border-gray-700 ${
              publishedSubType === 'general'
                ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
                : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700'
            }`}
          >
            一般古籍
          </button>
          <button
            onClick={() => { setPublishedSubType('local_gazetteer'); setMode('manual'); }}
            className={`flex-1 px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 ${
              publishedSubType === 'local_gazetteer'
                ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
                : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700'
            }`}
          >
            明清以来的地方志
          </button>
        </div>
      )}

      {/* Info box for local gazetteer */}
      {tab === 'unpublished' && isLocalGazetteer && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium mb-1">💡 地方志特殊处理说明：</p>
          <p>明清以后的地方志一般不标注作者，书名其前冠以修纂成书时的年代（年号）；民国地方志，在书名前冠加"民国"二字。</p>
        </div>
      )}
      {tab === 'published' && publishedSubType === 'local_gazetteer' && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium mb-1">💡 地方志格式说明：</p>
          <p>年号 + 书名（无冒号），丛书信息附加版本，出版地：出版社，出版年。</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-0">
        {/* Left: Input */}
        <div className="border-2 border-ink-200 dark:border-gray-700 border-t-0 lg:border-r-0 p-4 sm:p-6 bg-white dark:bg-gray-800">
          {/* Input Mode Tabs */}
          <div className="flex border-2 border-ink-200 dark:border-gray-700 mb-4">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 border-r-2 border-ink-200 dark:border-gray-700 ${
                mode === 'manual'
                  ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
                  : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700'
              }`}
            >
              <IconEdit className="w-4 h-4" />
              手动填写
            </button>
            <button
              onClick={() => setMode('paste')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200 ${
                mode === 'paste'
                  ? 'bg-ink-950 text-parchment-50 dark:bg-vermilion-600'
                  : 'bg-white dark:bg-gray-800 text-ink-600 dark:text-gray-400 hover:bg-ink-50 dark:hover:bg-gray-700'
              }`}
            >
              <IconPaste className="w-4 h-4" />
              粘贴文本
            </button>
          </div>

          {mode === 'paste' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink-800 dark:text-gray-200">
                粘贴原始引用文本
                {tab === 'unpublished' && (
                  <span className="block text-xs text-ink-500 dark:text-gray-400 mt-1">支持全国古籍普查登记基本数据库格式转换</span>
                )}
              </label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                className="input-field h-48 resize-none font-mono text-sm"
                placeholder={tab === 'unpublished' 
                  ? '示例：\n110000-0101-0010283 10634\n［萬曆］金華府志三十卷（明）王懋德（明）陸鳳儀纂修\n明萬曆刻本\n18 册 國家圖書館'
                  : '示例：\n杨钟羲：《雪桥诗话续集》卷 5，沈阳：辽沈书社，1991 年影印本，第 461 页 b。'
                }
              />
              <button onClick={handleParse} className="btn-primary w-full">解析并填充表单</button>
            </div>
          )}

          {mode === 'manual' && (
            <ManualForm
              citation={citation}
              tab={tab}
              publishedSubType={publishedSubType}
              updateField={updateField}
              updateAuthor={updateAuthor}
              addAuthor={addAuthor}
              removeAuthor={removeAuthor}
              showAuthorForGazetteer={showAuthorForGazetteer}
              setShowAuthorForGazetteer={setShowAuthorForGazetteer}
            />
          )}
        </div>

        {/* Right: Output */}
        <div className="border-2 border-ink-200 dark:border-gray-700 border-t-0 p-4 sm:p-6 bg-white dark:bg-gray-800 flex flex-col">
          <div className="flex gap-2 mb-4">
            <button onClick={handleConvert} className="btn-primary flex-1">转换</button>
            <button onClick={handleReset} className="btn-secondary px-4">
              <IconX className="w-4 h-4" />
              重置
            </button>
          </div>

          {result && (
            <div className="flex-1 flex flex-col animate-slide-up">
              <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-2">转换结果</label>
              <div className="flex-1 p-4 bg-parchment-50 dark:bg-gray-700 border-2 border-ink-200 dark:border-gray-600 font-body text-ink-950 dark:text-gray-100 leading-relaxed text-sm whitespace-pre-wrap min-h-[120px]">
                {result}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleCopy} className="btn-ghost flex-1 text-sm">
                  {copied ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconCopy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ManualFormProps {
  citation: Citation
  tab: AncientTab
  publishedSubType: PublishedSubType
  updateField: <K extends keyof Citation>(field: K, value: Citation[K]) => void
  updateAuthor: (index: number, field: keyof Author, value: string) => void
  addAuthor: () => void
  removeAuthor: (i: number) => void
  showAuthorForGazetteer: boolean
  setShowAuthorForGazetteer: (show: boolean) => void
}

function ManualForm({
  citation, tab, publishedSubType,
  updateField, updateAuthor, addAuthor, removeAuthor,
  showAuthorForGazetteer, setShowAuthorForGazetteer
}: ManualFormProps) {
  const isGazetteer = /志/.test(citation.title) && /(府志 | 县志 | 通志 | 州志 | 厅志 | 卫志 | 所志 | 里志 | 乡志 | 镇志 | 村志 | 山志 | 水志 | 寺志 | 庙志 | 观志 | 宫志 | 庵志 | 祠志 | 墓志 | 园志 | 谱志 | 图志)/.test(citation.title)

  // 未出版古籍字段
  if (tab === 'unpublished') {
    const hideAuthor = isGazetteer
    return (
      <div className="space-y-5">
        {/* 责任者 */}
        {!hideAuthor && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-ink-800 dark:text-gray-200">责任者</label>
              <button onClick={addAuthor} className="btn-ghost text-xs py-1 px-2">
                <IconPlus className="w-3 h-3" />添加
              </button>
            </div>
            {citation.authors.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={a.name}
                  onChange={e => updateAuthor(i, 'name', e.target.value)}
                  className="input-field flex-1"
                  placeholder="姓名"
                />
                <input
                  value={a.role || ''}
                  onChange={e => updateAuthor(i, 'role', e.target.value)}
                  className="input-field w-20"
                  placeholder="纂修"
                />
                {citation.authors.length > 1 && (
                  <button onClick={() => removeAuthor(i)} className="btn-ghost text-vermilion-600 px-2">
                    <IconMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 文献题名 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">文献题名</label>
          <input
            value={citation.title}
            onChange={e => updateField('title', e.target.value)}
            className="input-field"
            placeholder="如：金华府志"
          />
        </div>

        {/* 卷次 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">卷次</label>
          <input
            value={citation.volume || ''}
            onChange={e => updateField('volume', e.target.value)}
            className="input-field"
            placeholder="卷 30 或三十卷"
          />
        </div>

        {/* 版本 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">版本</label>
          <input
            value={citation.ancientEdition || ''}
            onChange={e => updateField('ancientEdition', e.target.value)}
            className="input-field"
            placeholder="明万历刻本"
          />
        </div>

        {/* 藏所 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">藏所</label>
          <input
            value={citation.collectionInfo || ''}
            onChange={e => updateField('collectionInfo', e.target.value)}
            className="input-field"
            placeholder="国家图书馆"
          />
        </div>

        {/* 页码和 ab 面 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">页码</label>
            <input
              value={citation.pages || ''}
              onChange={e => updateField('pages', e.target.value)}
              className="input-field"
              placeholder="9"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">a/b 面</label>
            <select
              value={citation.pageAB || ''}
              onChange={e => updateField('pageAB', e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">-</option>
              <option value="a">a 面</option>
              <option value="b">b 面</option>
            </select>
          </div>
        </div>
      </div>
    )
  }

  // 已出版古籍 - 一般古籍
  if (publishedSubType === 'general') {
    return (
      <div className="space-y-5">
        {/* 责任者 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-ink-800 dark:text-gray-200">责任者 *</label>
            <button onClick={addAuthor} className="btn-ghost text-xs py-1 px-2">
              <IconPlus className="w-3 h-3" />添加
            </button>
          </div>
          {citation.authors.map((a, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={a.name}
                onChange={e => updateAuthor(i, 'name', e.target.value)}
                className="input-field flex-1"
                placeholder="姓名"
              />
              <input
                value={a.role || ''}
                onChange={e => updateAuthor(i, 'role', e.target.value)}
                className="input-field w-20"
                placeholder="著"
              />
              {citation.authors.length > 1 && (
                <button onClick={() => removeAuthor(i)} className="btn-ghost text-vermilion-600 px-2">
                  <IconMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 文献题名 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">文献题名 *</label>
          <input
            value={citation.title}
            onChange={e => updateField('title', e.target.value)}
            className="input-field"
            placeholder="如：雪桥诗话续集"
          />
        </div>

        {/* 卷次 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">卷次</label>
          <input
            value={citation.volume || ''}
            onChange={e => updateField('volume', e.target.value)}
            className="input-field"
            placeholder="卷 5"
          />
        </div>

        {/* 出版地和出版社 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">出版地 *</label>
            <input
              value={citation.publishPlace || ''}
              onChange={e => updateField('publishPlace', e.target.value)}
              className="input-field"
              placeholder="沈阳"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">出版社 *</label>
            <input
              value={citation.publisher || ''}
              onChange={e => updateField('publisher', e.target.value)}
              className="input-field"
              placeholder="辽沈书社"
            />
          </div>
        </div>

        {/* 出版时间 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">出版时间 *</label>
          <input
            value={citation.publishYear || ''}
            onChange={e => updateField('publishYear', e.target.value)}
            className="input-field"
            placeholder="1991"
          />
        </div>

        {/* 版本下拉选择 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">版本</label>
          <select
            value={citation.edition || ''}
            onChange={e => updateField('edition', e.target.value)}
            className="input-field cursor-pointer"
          >
            <option value="">请选择</option>
            <option value="影印本">影印本</option>
            <option value="点校本">点校本</option>
            <option value="整理本">整理本</option>
          </select>
        </div>

        {/* 丛书名 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">丛书名</label>
          <input
            value={citation.seriesName || ''}
            onChange={e => updateField('seriesName', e.target.value)}
            className="input-field"
            placeholder="景印文渊阁四库全书"
          />
        </div>

        {/* 册数 */}
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">册数</label>
          <input
            value={citation.seriesBookNumber || ''}
            onChange={e => updateField('seriesBookNumber', e.target.value)}
            className="input-field"
            placeholder="第 971 册"
          />
        </div>

        {/* 页码和 ab 面 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">页码</label>
            <input
              value={citation.pages || ''}
              onChange={e => updateField('pages', e.target.value)}
              className="input-field"
              placeholder="461"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">a/b 面</label>
            <select
              value={citation.pageAB || ''}
              onChange={e => updateField('pageAB', e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">-</option>
              <option value="a">a 面</option>
              <option value="b">b 面</option>
            </select>
          </div>
        </div>
      </div>
    )
  }

  // 已出版古籍 - 地方志
  return (
    <div className="space-y-5">
      {/* 年号 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">年号 *</label>
        <input
          value={citation.eraName || ''}
          onChange={e => updateField('eraName', e.target.value)}
          className="input-field"
          placeholder="万历"
        />
      </div>

      {/* 文献题名 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">文献题名 *</label>
        <input
          value={citation.title}
          onChange={e => updateField('title', e.target.value)}
          className="input-field"
          placeholder="金华府志"
        />
      </div>

      {/* 卷数 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">卷数 *</label>
        <input
          value={citation.volume || ''}
          onChange={e => updateField('volume', e.target.value)}
          className="input-field"
          placeholder="卷 8"
        />
      </div>

      {/* 册数 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">册数 *</label>
        <input
          value={citation.seriesBookNumber || ''}
          onChange={e => updateField('seriesBookNumber', e.target.value)}
          className="input-field"
          placeholder="第 300 册"
        />
      </div>

      {/* 丛书名 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">丛书名 *</label>
        <input
          value={citation.seriesName || ''}
          onChange={e => updateField('seriesName', e.target.value)}
          className="input-field"
          placeholder="四库全书存目丛书"
        />
      </div>

      {/* 版本 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">版本</label>
        <select
          value={citation.edition || ''}
          onChange={e => updateField('edition', e.target.value)}
          className="input-field cursor-pointer"
        >
          <option value="">请选择</option>
          <option value="影印本">影印本</option>
          <option value="点校本">点校本</option>
          <option value="整理本">整理本</option>
        </select>
      </div>

      {/* 出版地和出版社 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">出版地 *</label>
          <input
            value={citation.publishPlace || ''}
            onChange={e => updateField('publishPlace', e.target.value)}
            className="input-field"
            placeholder="济南"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">出版社 *</label>
          <input
            value={citation.publisher || ''}
            onChange={e => updateField('publisher', e.target.value)}
            className="input-field"
            placeholder="齐鲁书社"
          />
        </div>
      </div>

      {/* 出版时间 */}
      <div>
        <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">出版时间 *</label>
        <input
          value={citation.publishYear || ''}
          onChange={e => updateField('publishYear', e.target.value)}
          className="input-field"
          placeholder="1996"
        />
      </div>

      {/* 页码和 ab 面 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">页码</label>
          <input
            value={citation.pages || ''}
            onChange={e => updateField('pages', e.target.value)}
            className="input-field"
            placeholder="98"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-800 dark:text-gray-200 mb-1">a/b 面</label>
          <select
            value={citation.pageAB || ''}
            onChange={e => updateField('pageAB', e.target.value)}
            className="input-field cursor-pointer"
          >
            <option value="">-</option>
            <option value="a">a 面</option>
            <option value="b">b 面</option>
          </select>
        </div>
      </div>

      {/* 责任者选项（可选显示） */}
      <div className="pt-4 border-t border-ink-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="show-author"
            checked={showAuthorForGazetteer}
            onChange={e => setShowAuthorForGazetteer(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="show-author" className="text-sm text-ink-700 dark:text-gray-300">显示责任者（可选）</label>
        </div>
        {showAuthorForGazetteer && (
          <div>
            {citation.authors.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={a.name}
                  onChange={e => updateAuthor(i, 'name', e.target.value)}
                  className="input-field flex-1"
                  placeholder="姓名"
                />
                <input
                  value={a.role || ''}
                  onChange={e => updateAuthor(i, 'role', e.target.value)}
                  className="input-field w-20"
                  placeholder="纂修"
                />
              </div>
            ))}
            <button onClick={addAuthor} className="btn-ghost text-xs py-1 px-2">
              <IconPlus className="w-3 h-3" />添加责任者
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

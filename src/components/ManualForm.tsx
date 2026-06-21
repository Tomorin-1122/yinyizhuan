import { useRef } from 'react'
import { Citation, CitationType, Author } from '../lib/types'
import { IconPlus, IconMinus } from './Icons'
import { FieldError } from '../lib/validate'
import { lookupPlace } from '../lib/publisher-places'

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

export interface ManualFormProps {
  citation: Citation
  errors?: FieldError[]
  updateField: <K extends keyof Citation>(field: K, value: Citation[K]) => void
  updateAuthor: (index: number, field: keyof Author, value: string) => void
  addAuthor: () => void
  removeAuthor: (i: number) => void
  updateBookAuthor: (index: number, field: keyof Author, value: string) => void
  addBookAuthor: () => void
  removeBookAuthor: (i: number) => void
  updateTranslator: (index: number, value: string) => void
}

export default function ManualForm({
  citation, errors = [], updateField,
  updateAuthor, addAuthor, removeAuthor,
  updateBookAuthor, addBookAuthor, removeBookAuthor,
  updateTranslator,
}: ManualFormProps) {
  const c = citation
  const errorMap: Record<string, string> = {}
  errors.forEach(e => { errorMap[e.field] = e.message })
  const showBookFields = ['book', 'diary', 'classic'].includes(c.type)
  const showChapterFields = c.type === 'chapter'

  // 追踪 publishPlace 是否为自动补全
  const isAutoFilledRef = useRef(false)

  // 出版社 onChange 联动：自动补全出版地
  const handlePublisherChange = (value: string) => {
    updateField('publisher', value)
    // 若地址为空或原本就是自动补的，按新出版社查表
    if (!c.publishPlace || isAutoFilledRef.current) {
      const place = lookupPlace(value)
      if (place) {
        updateField('publishPlace', place)
        isAutoFilledRef.current = true
      } else if (isAutoFilledRef.current) {
        // 之前是自动填的，现在出版社不认识了，清空
        updateField('publishPlace', '')
        isAutoFilledRef.current = false
      }
    }
  }

  // 用户手动修改出版地时，标记为非自动补全
  const handlePublishPlaceChange = (value: string) => {
    updateField('publishPlace', value)
    isAutoFilledRef.current = false
  }
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
      {c.type !== 'ancient' && (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-ink-800">责任者(作者)</label>
          <button onClick={addAuthor} className="btn-ghost text-xs py-1 px-2">
            <IconPlus className="w-3 h-3" />添加
          </button>
        </div>
        {errorMap.authors && <p className="text-red-500 text-xs mb-1">{errorMap.authors}</p>}
        {c.authors.map((a, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={a.name}
              onChange={e => updateAuthor(i, 'name', e.target.value)}
              className={`input-field flex-1 ${errorMap.authors ? 'border-red-500 ring-1 ring-red-500' : ''}`}
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
      )}

      {/* Title */}
      {c.type !== 'ancient' && (
      <div>
        <label className="block text-sm font-medium text-ink-800 mb-1">文献题名</label>
        <input
          value={c.title}
          onChange={e => updateField('title', e.target.value)}
          className={`input-field ${errorMap.title ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder={c.language === 'zh' ? '如：中国古代史研究' : 'Title of the Work'}
        />
        {errorMap.title && <p className="text-red-500 text-xs mt-1">{errorMap.title}</p>}
      </div>
      )}

      {/* Book fields */}
      {(showBookFields || showChapterFields) && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版地点</label>
              <input value={c.publishPlace || ''} onChange={e => handlePublishPlaceChange(e.target.value)} className="input-field" placeholder="北京" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版社</label>
              <input value={c.publisher || ''} onChange={e => handlePublisherChange(e.target.value)} className="input-field" placeholder="人民出版社" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">出版年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="2004" />
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
            <input value={c.journalName || ''} onChange={e => updateField('journalName', e.target.value)} className="input-field" placeholder={c.language === 'en' ? 'Ecology and Society' : '中国史研究'} />
          </div>
          <div className={`grid gap-3 sm:gap-4 ${c.language === 'en' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="2004" />
            </div>
            {c.language === 'en' && (
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">卷号 Volume</label>
                <input value={c.volumeNumber || ''} onChange={e => updateField('volumeNumber', e.target.value)} className="input-field" placeholder="24" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">{c.language === 'en' ? '期号 Issue' : '期号'}</label>
              <input value={c.issue || ''} onChange={e => updateField('issue', e.target.value)} className="input-field" placeholder="3" />
            </div>
            {/* 中文期刊：卷号（可选） */}
            {c.language !== 'en' && (
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">卷号(可选)</label>
                <input value={c.volumeNumber || ''} onChange={e => updateField('volumeNumber', e.target.value)} className="input-field" placeholder="留空则不输出" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">页码(可选)</label>
            <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="默认不输出，可在结果区展开" />
          </div>
          {c.language === 'en' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="shrink-0 font-bold">!</span>
              <span>外文期刊文章题名在《历史研究》格式中需使用<em>斜体</em>，请在粘贴到 Word 后手动对题名部分设置斜体。</span>
            </div>
          )}
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
              <input value={c.publishDate || ''} onChange={e => updateField('publishDate', e.target.value)} className="input-field" placeholder="2004年10月31日" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">版次</label>
              <input value={c.pageSection || ''} onChange={e => updateField('pageSection', e.target.value)} className="input-field" placeholder="2" />
            </div>
          </div>
        </>
      )}

      {/* Thesis / Conference fields */}
      {showThesisFields && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">
                {c.type === 'conference' ? '论文类型' : '论文性质'}
              </label>
              {c.type === 'thesis' ? (
                <select
                  value={c.thesisType || ''}
                  onChange={e => updateField('thesisType', e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="">请选择</option>
                  <option value="博士学位论文">博士学位论文</option>
                  <option value="硕士学位论文">硕士学位论文</option>
                  <option value="本科学位论文">本科学位论文</option>
                  <option value="学位论文">学位论文（类型不详）</option>
                </select>
              ) : (
                <input value={c.thesisType || ''} onChange={e => updateField('thesisType', e.target.value)} className="input-field" placeholder="会议论文" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">
                {c.type === 'conference' ? '主办机构/地点' : '学校/机构'}
              </label>
              <input
                value={c.institution || ''}
                onChange={e => updateField('institution', e.target.value)}
                className="input-field"
                placeholder={c.type === 'conference' ? '中国人民大学清史研究所' : '北京师范大学历史系'}
              />
            </div>
          </div>
          {c.type === 'conference' && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">论文集名称</label>
              <input value={c.bookTitle || ''} onChange={e => updateField('bookTitle', e.target.value)} className="input-field" placeholder="中国地理学会百年庆典学术论文摘要集" />
            </div>
          )}
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
          {c.type === 'thesis' && (
            <p className="text-xs text-ink-400 dark:text-gray-500">注意：请在"学校/机构"中填写完整学院/系名称，如"东南大学历史系"</p>
          )}
        </>
      )}

      {/* Archive fields */}
      {showArchiveFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">档案日期</label>
            <input value={c.archiveDate || ''} onChange={e => updateField('archiveDate', e.target.value)} className="input-field" placeholder="2004年10月31日" />
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
              <input value={c.accessDate || ''} onChange={e => updateField('accessDate', e.target.value)} className="input-field" placeholder="2004年10月31日" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">年份</label>
              <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="2004" />
            </div>
          </div>
        </div>
      )}

      {/* Ancient text fields */}
      {showAncientFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">古籍类型</label>
            <select
              value={c.ancientSubType || ''}
              onChange={e => updateField('ancientSubType', e.target.value as Citation['ancientSubType'])}
              className="input-field cursor-pointer"
            >
              <option value="">请选择</option>
              <option value="blockprint">刻本</option>
              <option value="punctuated">点校本/整理本</option>
              <option value="reprint">影印本</option>
              <option value="extract">析出文献</option>
              <option value="gazetteer">地方志</option>
              <option value="classic">常用基本典籍</option>
              <option value="chronicle">编年体典籍</option>
            </select>
          </div>

          {/* 版本信息（刻本/点校本/影印本/典籍用） */}
          {(!c.ancientSubType || ['blockprint', 'punctuated', 'reprint', 'classic'].includes(c.ancientSubType)) && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">
                {c.ancientSubType === 'punctuated' ? '版本标注' : '版本信息'}
              </label>
              <input
                value={c.ancientEdition || ''}
                onChange={e => updateField('ancientEdition', e.target.value)}
                className="input-field"
                placeholder={c.ancientSubType === 'punctuated' ? '标点本/整理本' : '光绪三年苏州文学山房活字本'}
              />
            </div>
          )}

          {/* 篇名/部类（刻本/点校本/影印本/析出/典籍用） */}
          {(!c.ancientSubType || ['blockprint', 'punctuated', 'reprint', 'extract', 'classic'].includes(c.ancientSubType)) && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">篇名/部类</label>
              <input value={c.section || ''} onChange={e => updateField('section', e.target.value)} className="input-field" placeholder="首辅志" />
            </div>
          )}

          {/* 出版地/出版社/年份（点校本/影印本/析出/地方志用） */}
          {c.ancientSubType && ['punctuated', 'reprint', 'extract', 'gazetteer'].includes(c.ancientSubType) && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">出版地</label>
                <input value={c.publishPlace || ''} onChange={e => updateField('publishPlace', e.target.value)} className="input-field" placeholder="北京" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">出版社</label>
                <input value={c.publisher || ''} onChange={e => updateField('publisher', e.target.value)} className="input-field" placeholder="中华书局" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">年份</label>
                <input value={c.publishYear || ''} onChange={e => updateField('publishYear', e.target.value)} className="input-field" placeholder="2005" />
              </div>
            </div>
          )}

          {/* 文集责任者/文集题名（析出文献用） */}
          {c.ancientSubType === 'extract' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">文集责任者</label>
                <input value={c.bookAuthors?.[0]?.name || ''} onChange={e => updateField('bookAuthors', [{ name: e.target.value }])} className="input-field" placeholder="张三" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">文集题名</label>
                <input value={c.bookTitle || ''} onChange={e => updateField('bookTitle', e.target.value)} className="input-field" placeholder="文集名" />
              </div>
            </div>
          )}

          {/* 丛书项（析出/地方志用） */}
          {c.ancientSubType && ['extract', 'gazetteer'].includes(c.ancientSubType) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">丛书名</label>
                <input value={c.seriesName || ''} onChange={e => updateField('seriesName', e.target.value)} className="input-field" placeholder="四库全书存目丛书" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-800 mb-1">丛书册数</label>
                <input value={c.seriesVolume || ''} onChange={e => updateField('seriesVolume', e.target.value)} className="input-field" placeholder="第88册" />
              </div>
            </div>
          )}

          {/* 影印本栏 */}
          {c.ancientSubType === 'reprint' && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">栏（上/中/下，可选）</label>
              <input value={c.pageAB || ''} onChange={e => updateField('pageAB', e.target.value)} className="input-field" placeholder="下栏" />
            </div>
          )}

          {/* 编年体年月甲子 */}
          {c.ancientSubType === 'chronicle' && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">年月甲子（可选）</label>
              <input value={c.archiveDate || ''} onChange={e => updateField('archiveDate', e.target.value)} className="input-field" placeholder="光绪二十四年十二月上" />
            </div>
          )}

          {/* 地方志修纂年代 */}
          {c.ancientSubType === 'gazetteer' && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">修纂年代</label>
              <input value={c.edition || ''} onChange={e => updateField('edition', e.target.value)} className="input-field" placeholder="万历" />
            </div>
          )}

          {/* 卷次（典籍/编年体用） */}
          {c.ancientSubType && ['classic', 'chronicle'].includes(c.ancientSubType) && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">卷次</label>
              <input value={c.volume || ''} onChange={e => updateField('volume', e.target.value)} className="input-field" placeholder="卷一" />
            </div>
          )}

          {/* a/b面（刻本/点校本/影印本用） */}
          {c.ancientSubType && ['blockprint', 'punctuated', 'reprint'].includes(c.ancientSubType) && (
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1">a/b面</label>
              <input value={c.pageAB || ''} onChange={e => updateField('pageAB', e.target.value)} className="input-field" placeholder="a 或 b" />
            </div>
          )}

          {/* 页码 */}
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">页码</label>
            <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="可选" />
          </div>
        </div>
      )}

      {/* Transferred fields */}
      {showTransferredFields && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">原文献信息</label>
            <input value={c.originalCitation || ''} onChange={e => updateField('originalCitation', e.target.value)} className="input-field" placeholder="章太炎：《在长沙晨光学校演说》，1925年10月" />
            <p className="text-xs text-ink-400 mt-1">格式：责任者：《题名》，版本/日期信息</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">转引来源</label>
            <input value={c.transferredFrom || ''} onChange={e => updateField('transferredFrom', e.target.value)} className="input-field" placeholder="汤志钧：《章太炎年谱长编》下册，北京：中华书局，2004年" />
            <p className="text-xs text-ink-400 mt-1">格式：责任者：《题名》，出版地：出版社，年份</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1">页码</label>
            <input value={c.pages || ''} onChange={e => updateField('pages', e.target.value)} className="input-field" placeholder="823" />
          </div>
        </div>
      )}
    </div>
  )
}

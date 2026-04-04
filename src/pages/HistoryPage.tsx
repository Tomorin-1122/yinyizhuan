import { useState, useEffect, useCallback, useRef } from 'react'
import { ConversionRecord, TagGroup } from '../lib/types'
import {
  getHistory, deleteRecord, clearHistory, exportHistoryAsJSON, exportHistoryAsCSV,
  getTagGroups, createTagGroup, deleteTagGroup, updateTagGroup,
  addRecordToGroup, removeRecordFromGroup, updateRecordNote,
} from '../lib/storage'
import { copyToClipboard, downloadFile, formatTimestamp, getCitationTypeName, getFormatName } from '../lib/utils'
import { exportSelectedAsWord } from '../lib/export-word'
import { IconCopy, IconTrash, IconDownload, IconCheck, IconFile } from '../components/Icons'

function IconTag({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function IconPencil({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconX({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// 标签组 Word 导出（带编号）
function exportGroupAsWord(group: TagGroup, records: ConversionRecord[]) {
  const groupRecords = group.recordIds
    .map((id, i) => ({ record: records.find(r => r.id === id), index: i + 1 }))
    .filter(item => item.record) as { record: ConversionRecord; index: number }[]

  if (groupRecords.length === 0) return

  const selectedSet = new Set(groupRecords.map(item => item.record.id))
  // 复用 exportSelectedAsWord，用编号前缀重新构造 result 文本
  const numberedRecords = groupRecords.map(({ record, index }) => ({
    ...record,
    result: `[${index}] ${record.result}`,
  }))
  const fakeRecords = [...numberedRecords, ...records.filter(r => !selectedSet.has(r.id))]
  exportSelectedAsWord(fakeRecords, selectedSet)
}

// 添加到标签组的下拉组件
function AddToGroupDropdown({
  recordId,
  groups,
  onAdd,
  onCreateAndAdd,
}: {
  recordId: string
  groups: TagGroup[]
  onAdd: (groupId: string) => void
  onCreateAndAdd: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const alreadyInGroups = groups.filter(g => g.recordIds.includes(recordId))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
        title="添加到标签组"
      >
        <IconTag className="w-3.5 h-3.5" />
        标签
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border-2 border-ink-200 dark:border-gray-700 shadow-lg min-w-48 max-w-64">
          {alreadyInGroups.length > 0 && (
            <div className="p-2 border-b border-ink-100 dark:border-gray-700">
              <p className="text-xs text-ink-400 dark:text-gray-500 mb-1">已加入</p>
              {alreadyInGroups.map(g => (
                <div key={g.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-ink-700 dark:text-gray-300 truncate">{g.name}</span>
                  <span className="text-green-600 ml-2">✓</span>
                </div>
              ))}
            </div>
          )}
          {groups.filter(g => !g.recordIds.includes(recordId)).length > 0 && (
            <div className="p-1">
              {groups
                .filter(g => !g.recordIds.includes(recordId))
                .map(g => (
                  <button
                    key={g.id}
                    onClick={() => { onAdd(g.id); setOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-sm text-ink-800 dark:text-gray-200 hover:bg-parchment-100 dark:hover:bg-gray-700 transition-colors truncate"
                  >
                    {g.name}
                  </button>
                ))}
            </div>
          )}
          <div className="border-t border-ink-100 dark:border-gray-700 p-2">
            {creating ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newName.trim()) {
                      onCreateAndAdd(newName.trim())
                      setNewName('')
                      setCreating(false)
                      setOpen(false)
                    }
                    if (e.key === 'Escape') setCreating(false)
                  }}
                  className="flex-1 text-xs border border-ink-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-gray-700 text-ink-950 dark:text-gray-100 outline-none focus:border-ink-600"
                  placeholder="标签名称，回车确认"
                />
                <button onClick={() => setCreating(false)} className="text-ink-400 hover:text-ink-700 px-1">
                  <IconX className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left text-xs text-ink-500 dark:text-gray-400 hover:text-ink-950 dark:hover:text-gray-100 flex items-center gap-1.5 px-1 py-1 transition-colors"
              >
                <IconPlus className="w-3 h-3" />
                新建标签组
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 单条备注编辑
function NoteEditor({ initialNote, onSave }: { initialNote?: string; onSave: (note: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNote || '')

  if (!editing && !value) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-ink-400 dark:text-gray-500 hover:text-ink-700 dark:hover:text-gray-300 flex items-center gap-1 mt-1.5 transition-colors"
      >
        <IconPencil className="w-3 h-3" />
        添加备注
      </button>
    )
  }

  if (!editing) {
    return (
      <div className="mt-1.5 flex items-start gap-1.5 group">
        <p className="text-xs text-ink-500 dark:text-gray-400 italic flex-1">{value}</p>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-ink-700 transition-all"
        >
          <IconPencil className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1.5">
      <textarea
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full text-xs border border-ink-300 dark:border-gray-600 px-2 py-1.5 bg-white dark:bg-gray-700 text-ink-950 dark:text-gray-100 outline-none focus:border-ink-600 resize-none"
        rows={2}
        placeholder="添加备注（可为空）"
      />
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => { onSave(value); setEditing(false) }}
          className="text-xs text-ink-950 dark:text-gray-100 hover:text-vermilion-600 transition-colors"
        >
          保存
        </button>
        <button
          onClick={() => { setValue(initialNote || ''); setEditing(false) }}
          className="text-xs text-ink-400 dark:text-gray-500 hover:text-ink-700 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [records, setRecords] = useState<ConversionRecord[]>([])
  const [groups, setGroups] = useState<TagGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [editingGroupDesc, setEditingGroupDesc] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const refresh = useCallback(() => {
    setRecords(getHistory())
    setGroups(getTagGroups())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // 当前展示的记录（按标签组过滤）
  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null
  const displayedRecords = activeGroup
    ? activeGroup.recordIds.map(id => records.find(r => r.id === id)).filter(Boolean) as ConversionRecord[]
    : records

  const handleCopy = async (id: string, text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) { setCopiedId(id); setTimeout(() => setCopiedId(''), 1500) }
  }

  const handleDelete = (id: string) => {
    deleteRecord(id)
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    refresh()
    showToast('已删除')
  }

  const handleClearAll = () => {
    clearHistory()
    setSelected(new Set())
    setShowConfirm(false)
    setActiveGroupId(null)
    refresh()
    showToast('已清空全部历史记录')
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === displayedRecords.length) setSelected(new Set())
    else setSelected(new Set(displayedRecords.map(r => r.id)))
  }

  const handleDeleteSelected = () => {
    const count = selected.size
    selected.forEach(id => deleteRecord(id))
    setSelected(new Set())
    refresh()
    showToast(`已删除 ${count} 条记录`)
  }

  const handleExportJSON = () => {
    const data = selected.size > 0
      ? JSON.stringify(records.filter(r => selected.has(r.id)), null, 2)
      : exportHistoryAsJSON()
    downloadFile(data, `yinyizhuan_history_${Date.now()}.json`, 'application/json')
    showToast('已导出 JSON')
  }

  const handleExportCSV = () => {
    downloadFile('\uFEFF' + exportHistoryAsCSV(), `yinyizhuan_history_${Date.now()}.csv`, 'text/csv;charset=utf-8')
    showToast('已导出 CSV')
  }

  const handleExportWord = () => {
    if (selected.size === 0) { showToast('请先勾选要导出的记录'); return }
    exportSelectedAsWord(records, selected)
    showToast(`已导出 ${selected.size} 条到 Word`)
  }

  const handleExportGroupWord = (group: TagGroup) => {
    exportGroupAsWord(group, records)
    showToast(`已导出标签组"${group.name}"到 Word`)
  }

  const handleAddToGroup = (recordId: string, groupId: string) => {
    addRecordToGroup(groupId, recordId)
    refresh()
    showToast('已加入标签组')
  }

  const handleCreateAndAddToGroup = (recordId: string, name: string) => {
    const group = createTagGroup(name)
    addRecordToGroup(group.id, recordId)
    refresh()
    showToast(`已创建标签组"${name}"并加入`)
  }

  const handleRemoveFromGroup = (recordId: string, groupId: string) => {
    removeRecordFromGroup(groupId, recordId)
    refresh()
    showToast('已从标签组移除')
  }

  const handleSaveNote = (recordId: string, note: string) => {
    updateRecordNote(recordId, note)
    refresh()
  }

  const startEditGroup = (group: TagGroup) => {
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
    setEditingGroupDesc(group.description || '')
  }

  const saveEditGroup = () => {
    if (!editingGroupId || !editingGroupName.trim()) return
    updateTagGroup(editingGroupId, { name: editingGroupName.trim(), description: editingGroupDesc.trim() })
    setEditingGroupId(null)
    refresh()
  }

  const handleDeleteGroup = (groupId: string) => {
    deleteTagGroup(groupId)
    if (activeGroupId === groupId) setActiveGroupId(null)
    refresh()
    showToast('已删除标签组')
  }

  const handleCreateGroup = () => {
    const name = prompt('请输入标签组名称：')
    if (!name?.trim()) return
    createTagGroup(name.trim())
    refresh()
    showToast(`已创建标签组"${name.trim()}"`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink-950 dark:bg-gray-100 text-parchment-50 dark:text-gray-900 px-6 py-3 font-body text-sm animate-slide-up whitespace-nowrap">
          {toast}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 border-2 border-ink-200 dark:border-gray-700 p-8 max-w-sm w-full mx-4 animate-slide-up">
            <h3 className="font-display font-bold text-lg text-ink-950 dark:text-gray-100 mb-3">确认清空</h3>
            <p className="text-ink-600 dark:text-gray-300 text-sm mb-6">此操作将永久删除所有历史记录，且无法恢复。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">取消</button>
              <button onClick={handleClearAll} className="btn-primary flex-1 bg-vermilion-600 border-vermilion-600 hover:bg-vermilion-700 hover:border-vermilion-700">确认清空</button>
            </div>
          </div>
        </div>
      )}

      {/* 标题栏 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink-950 dark:text-gray-100">历史记录</h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm">
            共 {records.length} 条记录
            {activeGroup && <span className="ml-2 text-vermilion-600">· 当前：{activeGroup.name}（{displayedRecords.length} 条）</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => setShowGroupPanel(!showGroupPanel)}
            className={`btn-ghost text-sm flex items-center gap-1.5 ${showGroupPanel ? 'bg-ink-100 dark:bg-gray-700' : ''}`}
          >
            <IconTag className="w-4 h-4" />
            标签组
            {groups.length > 0 && <span className="bg-ink-200 dark:bg-gray-600 text-ink-700 dark:text-gray-200 text-xs px-1.5 rounded-full">{groups.length}</span>}
          </button>
          <button onClick={handleExportJSON} className="btn-ghost text-sm" disabled={records.length === 0}>
            <IconDownload className="w-4 h-4" />JSON
          </button>
          <button onClick={handleExportCSV} className="btn-ghost text-sm" disabled={records.length === 0}>
            <IconDownload className="w-4 h-4" />CSV
          </button>
          {selected.size > 0 && (
            <button onClick={handleExportWord} className="btn-ghost text-sm text-ink-700 dark:text-gray-200">
              <IconFile className="w-4 h-4" />Word({selected.size})
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={handleDeleteSelected} className="btn-ghost text-sm text-vermilion-600">
              <IconTrash className="w-4 h-4" />删除({selected.size})
            </button>
          )}
          <button onClick={() => setShowConfirm(true)} className="btn-ghost text-sm text-vermilion-600" disabled={records.length === 0}>
            <IconTrash className="w-4 h-4" />清空
          </button>
        </div>
      </div>

      {/* 标签组管理面板 */}
      {showGroupPanel && (
        <div className="mb-6 border-2 border-ink-200 dark:border-gray-700 bg-parchment-50 dark:bg-gray-800">
          <div className="flex items-center justify-between px-5 py-3 border-b border-ink-200 dark:border-gray-700">
            <h2 className="font-display font-bold text-ink-950 dark:text-gray-100 text-sm">标签组管理</h2>
            <button
              onClick={handleCreateGroup}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <IconPlus className="w-3.5 h-3.5" />新建标签组
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-400 dark:text-gray-500 text-center">暂无标签组，点击"新建标签组"创建</p>
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-gray-700">
              {groups.map(g => (
                <div key={g.id} className="px-5 py-3">
                  {editingGroupId === g.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingGroupName}
                        onChange={e => setEditingGroupName(e.target.value)}
                        className="w-full text-sm border border-ink-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-gray-700 text-ink-950 dark:text-gray-100 outline-none focus:border-ink-600"
                        placeholder="标签组名称"
                      />
                      <input
                        value={editingGroupDesc}
                        onChange={e => setEditingGroupDesc(e.target.value)}
                        className="w-full text-xs border border-ink-200 dark:border-gray-600 px-2 py-1 bg-white dark:bg-gray-700 text-ink-600 dark:text-gray-400 outline-none focus:border-ink-500"
                        placeholder="备注（可选）"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditGroup} className="text-xs text-ink-950 dark:text-gray-100 hover:text-vermilion-600 transition-colors">保存</button>
                        <button onClick={() => setEditingGroupId(null)} className="text-xs text-ink-400 hover:text-ink-700 transition-colors">取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-ink-950 dark:text-gray-100 truncate">{g.name}</span>
                          <span className="text-xs text-ink-400 dark:text-gray-500 shrink-0">{g.recordIds.length} 条</span>
                        </div>
                        {g.description && <p className="text-xs text-ink-400 dark:text-gray-500 truncate mt-0.5">{g.description}</p>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleExportGroupWord(g)}
                          className="btn-ghost px-2 py-1 text-xs"
                          disabled={g.recordIds.length === 0}
                          title="导出为 Word"
                        >
                          <IconFile className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startEditGroup(g)}
                          className="btn-ghost px-2 py-1 text-xs"
                          title="编辑"
                        >
                          <IconPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(g.id)}
                          className="btn-ghost px-2 py-1 text-xs text-vermilion-600"
                          title="删除"
                        >
                          <IconX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 标签筛选栏 */}
      {groups.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setActiveGroupId(null)}
            className={`px-3 py-1 text-sm border-2 transition-colors ${
              activeGroupId === null
                ? 'border-ink-950 dark:border-gray-100 bg-ink-950 dark:bg-gray-100 text-parchment-50 dark:text-gray-900'
                : 'border-ink-200 dark:border-gray-700 text-ink-600 dark:text-gray-400 hover:border-ink-400'
            }`}
          >
            全部 ({records.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupId(g.id === activeGroupId ? null : g.id)}
              className={`px-3 py-1 text-sm border-2 transition-colors flex items-center gap-1.5 ${
                activeGroupId === g.id
                  ? 'border-vermilion-500 bg-vermilion-50 dark:bg-vermilion-900/20 text-vermilion-700 dark:text-vermilion-300'
                  : 'border-ink-200 dark:border-gray-700 text-ink-600 dark:text-gray-400 hover:border-ink-400'
              }`}
            >
              <IconTag className="w-3.5 h-3.5" />
              {g.name} ({g.recordIds.filter(id => records.some(r => r.id === id)).length})
            </button>
          ))}
        </div>
      )}

      {/* 记录列表 */}
      {displayedRecords.length === 0 ? (
        <div className="text-center py-20 border-2 border-ink-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-ink-400 dark:text-gray-500 font-display text-lg">
            {activeGroup ? `标签组"${activeGroup.name}"暂无记录` : '暂无历史记录'}
          </p>
          <p className="text-ink-300 dark:text-gray-600 text-sm mt-2">
            {activeGroup ? '在转换结果页点击"标签"按钮将记录加入此标签组' : '开始转换后，记录将自动保存在这里'}
          </p>
        </div>
      ) : (
        <>
          {displayedRecords.length > 1 && (
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-600 dark:text-gray-400 hover:text-ink-950 dark:hover:text-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selected.size === displayedRecords.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer accent-ink-950 dark:accent-vermilion-500"
                />
                全选
              </label>
            </div>
          )}
          <div className="space-y-0">
            {displayedRecords.map((r, i) => {
              const seqNum = activeGroup ? (activeGroup.recordIds.indexOf(r.id) + 1) : null
              const recordGroups = groups.filter(g => g.recordIds.includes(r.id))

              return (
                <div
                  key={r.id}
                  className={`border-2 border-ink-200 dark:border-gray-700 -mt-[2px] first:mt-0 p-5 bg-white dark:bg-gray-800 transition-all duration-200 hover:border-ink-400 dark:hover:border-gray-500 ${
                    selected.has(r.id) ? 'border-vermilion-300 dark:border-vermilion-600 bg-vermilion-50/50 dark:bg-vermilion-900/10' : ''
                  } animate-slide-up opacity-0`}
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 w-4 h-4 cursor-pointer accent-ink-950 dark:accent-vermilion-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {/* 元信息行 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {seqNum && (
                          <span className="font-mono text-xs font-bold text-vermilion-600 dark:text-vermilion-400">[{seqNum}]</span>
                        )}
                        <span className="font-mono text-xs bg-ink-100 dark:bg-gray-700 text-ink-700 dark:text-gray-200 px-2 py-0.5">{getCitationTypeName(r.citation.type)}</span>
                        <span className="font-mono text-xs bg-vermilion-50 dark:bg-vermilion-900/30 text-vermilion-700 dark:text-vermilion-300 px-2 py-0.5">{getFormatName(r.targetFormat)}</span>
                        {/* 所属标签组标签 */}
                        {!activeGroup && recordGroups.map(g => (
                          <button
                            key={g.id}
                            onClick={() => handleRemoveFromGroup(r.id, g.id)}
                            title="点击移除"
                            className="flex items-center gap-1 font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <IconTag className="w-3 h-3" />
                            {g.name}
                          </button>
                        ))}
                        <span className="text-xs text-ink-400 dark:text-gray-500 ml-auto flex-shrink-0">{formatTimestamp(r.timestamp)}</span>
                      </div>

                      {/* 转换结果 */}
                      <p className="text-sm text-ink-950 dark:text-gray-100 leading-relaxed font-body break-all">{r.result}</p>

                      {/* 备注 */}
                      <NoteEditor
                        initialNote={r.note}
                        onSave={(note) => handleSaveNote(r.id, note)}
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => handleCopy(r.id, r.result)}
                        className="btn-ghost px-2 py-1"
                        title="复制"
                      >
                        {copiedId === r.id ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconCopy className="w-4 h-4" />}
                      </button>
                      <AddToGroupDropdown
                        recordId={r.id}
                        groups={groups}
                        onAdd={(groupId) => handleAddToGroup(r.id, groupId)}
                        onCreateAndAdd={(name) => handleCreateAndAddToGroup(r.id, name)}
                      />
                      {activeGroup && (
                        <button
                          onClick={() => handleRemoveFromGroup(r.id, activeGroup.id)}
                          className="btn-ghost px-2 py-1 text-xs text-ink-400"
                          title="从此标签组移除"
                        >
                          <IconX className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="btn-ghost px-2 py-1 text-vermilion-600"
                        title="删除"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

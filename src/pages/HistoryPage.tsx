import { useState, useEffect, useCallback } from 'react'
import { ConversionRecord } from '../lib/types'
import { getHistory, deleteRecord, clearHistory, exportHistoryAsJSON, exportHistoryAsCSV } from '../lib/storage'
import { copyToClipboard, downloadFile, formatTimestamp, getCitationTypeName, getFormatName } from '../lib/utils'
import { exportSelectedAsWord } from '../lib/export-word'
import { IconCopy, IconTrash, IconDownload, IconCheck, IconFile } from '../components/Icons'

export default function HistoryPage() {
  const [records, setRecords] = useState<ConversionRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const refresh = useCallback(() => {
    setRecords(getHistory())
  }, [])

  useEffect(() => { refresh() }, [refresh])

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
    if (selected.size === records.length) setSelected(new Set())
    else setSelected(new Set(records.map(r => r.id)))
  }

  const handleDeleteSelected = () => {
    selected.forEach(id => deleteRecord(id))
    setSelected(new Set())
    refresh()
    showToast(`已删除 ${selected.size} 条记录`)
  }

  const handleExportJSON = () => {
    const data = selected.size > 0
      ? JSON.stringify(records.filter(r => selected.has(r.id)), null, 2)
      : exportHistoryAsJSON()
    downloadFile(data, `yinyizhuan_history_${Date.now()}.json`, 'application/json')
    showToast('已导出 JSON')
  }

  const handleExportCSV = () => {
    const data = exportHistoryAsCSV()
    downloadFile('﻿' + data, `yinyizhuan_history_${Date.now()}.csv`, 'text/csv;charset=utf-8')
    showToast('已导出 CSV')
  }

  const handleExportWord = () => {
    if (selected.size === 0) {
      showToast('请先勾选要导出的记录')
      return
    }
    exportSelectedAsWord(records, selected)
    showToast(`已导出 ${selected.size} 条到 Word`)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink-950 dark:bg-gray-100 text-parchment-50 dark:text-gray-900 px-6 py-3 font-body text-sm animate-slide-up">
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

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink-950 dark:text-gray-100">历史记录</h1>
          <p className="text-ink-500 dark:text-gray-400 mt-2">共 {records.length} 条转换记录</p>
        </div>
        <div className="flex gap-2">
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

      {records.length === 0 ? (
        <div className="text-center py-20 border-2 border-ink-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-ink-400 dark:text-gray-500 font-display text-lg">暂无历史记录</p>
          <p className="text-ink-300 dark:text-gray-600 text-sm mt-2">开始转换后，记录将自动保存在这里</p>
        </div>
      ) : (
        <>
          {records.length > 1 && (
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-600 dark:text-gray-400 hover:text-ink-950 dark:hover:text-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selected.size === records.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer accent-ink-950 dark:accent-vermilion-500"
                />
                全选
              </label>
            </div>
          )}
          <div className="space-y-0">
            {records.map((r, i) => (
              <div
                key={r.id}
                className={`border-2 border-ink-200 dark:border-gray-700 -mt-[2px] first:mt-0 p-5 bg-white dark:bg-gray-800 transition-all duration-200 hover:border-ink-400 dark:hover:border-gray-500 ${
                  selected.has(r.id) ? 'border-vermilion-300 dark:border-vermilion-600 bg-vermilion-50/50 dark:bg-vermilion-900/10' : ''
                } animate-slide-up opacity-0`}
                style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="mt-1 w-4 h-4 cursor-pointer accent-ink-950 dark:accent-vermilion-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-xs bg-ink-100 dark:bg-gray-700 text-ink-700 dark:text-gray-200 px-2 py-0.5">{getCitationTypeName(r.citation.type)}</span>
                      <span className="font-mono text-xs bg-vermilion-50 dark:bg-vermilion-900/30 text-vermilion-700 dark:text-vermilion-300 px-2 py-0.5">{getFormatName(r.targetFormat)}</span>
                      <span className="text-xs text-ink-400 dark:text-gray-500 ml-auto flex-shrink-0">{formatTimestamp(r.timestamp)}</span>
                    </div>
                    <p className="text-sm text-ink-950 dark:text-gray-100 leading-relaxed font-body break-all">{r.result}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(r.id, r.result)}
                      className="btn-ghost px-2 py-1"
                      title="复制"
                    >
                      {copiedId === r.id ? <IconCheck className="w-4 h-4 text-green-600" /> : <IconCopy className="w-4 h-4" />}
                    </button>
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}

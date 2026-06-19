import { useState, useRef, useEffect } from 'react'
import { TagGroup } from '../lib/types'
import { getTagGroups, createTagGroup, addRecordToGroup } from '../lib/storage'

function IconTag({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

export default function AddToGroupButton({ recordId, onToast }: { recordId: string; onToast: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState<TagGroup[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setGroups(getTagGroups())
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAdd = (groupId: string, groupName: string) => {
    addRecordToGroup(groupId, recordId)
    setOpen(false)
    onToast(`已加入"${groupName}"`)
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    const g = createTagGroup(newName.trim())
    addRecordToGroup(g.id, recordId)
    setNewName('')
    setCreating(false)
    setOpen(false)
    onToast(`已创建标签组"${g.name}"并加入`)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost text-sm flex items-center gap-1.5"
        title="添加到标签组"
      >
        <IconTag className="w-4 h-4" />
        标签组
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-30 bg-white dark:bg-gray-800 border-2 border-ink-200 dark:border-gray-700 shadow-lg min-w-52">
          {groups.length === 0 && !creating && (
            <p className="px-4 py-3 text-xs text-ink-400 dark:text-gray-500">暂无标签组</p>
          )}
          {groups.length > 0 && (
            <div className="p-1 border-b border-ink-100 dark:border-gray-700">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleAdd(g.id, g.name)}
                  className="w-full text-left px-3 py-1.5 text-sm text-ink-800 dark:text-gray-200 hover:bg-parchment-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-xs text-ink-400 shrink-0">{g.recordIds.length}条</span>
                </button>
              ))}
            </div>
          )}
          <div className="p-2">
            {creating ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  className="flex-1 text-xs border border-ink-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-gray-700 text-ink-950 dark:text-gray-100 outline-none focus:border-ink-600"
                  placeholder="标签组名称，回车确认"
                />
              </div>
            ) : (
              <button
                onClick={() => { setCreating(true) }}
                className="w-full text-left text-xs text-ink-500 dark:text-gray-400 hover:text-ink-950 dark:hover:text-gray-100 flex items-center gap-1.5 px-1 py-1 transition-colors"
              >
                + 新建标签组
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

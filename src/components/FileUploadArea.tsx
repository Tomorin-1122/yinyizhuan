import { useState } from 'react'
import { Citation } from '../lib/types'
import { IconUpload } from './Icons'

interface FileUploadAreaProps {
  onProcessFile: (file: File) => void
  parsedItems: Partial<Citation>[]
  onSelectItem: (item: Partial<Citation>) => void
}

export default function FileUploadArea({ onProcessFile, parsedItems, onSelectItem }: FileUploadAreaProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onProcessFile(file)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onProcessFile(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-ink-800">上传 BibTeX (.bib)、RIS (.ris) 或文本 (.txt) 文件</label>
      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center h-48 border-2 border-dashed transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-ink-600 bg-parchment-200'
            : 'border-ink-300 bg-parchment-50 hover:border-ink-500 hover:bg-parchment-100'
        }`}
      >
        <IconUpload className="w-10 h-10 text-ink-400 mb-3" />
        <span className="text-ink-600 text-sm">点击或拖拽文件到此处</span>
        <span className="text-ink-400 text-xs mt-1">支持 .bib / .ris / .txt 格式</span>
        <input type="file" accept=".bib,.ris,.txt" onChange={handleFileUpload} className="hidden" />
      </label>
      {parsedItems.length > 1 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink-800">解析到 {parsedItems.length} 条引用，点击选择：</span>
          {parsedItems.map((item, i) => (
            <button
              key={i}
              onClick={() => onSelectItem(item)}
              className="w-full text-left p-3 border border-ink-200 hover:border-ink-400 hover:bg-ink-50 transition-all duration-200 cursor-pointer text-sm"
            >
              <span className="font-medium">{item.title || '未命名'}</span>
              {item.authors?.[0]?.name && <span className="text-ink-500 ml-2">- {item.authors[0].name}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

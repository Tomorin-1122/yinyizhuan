/**
 * pdf-storage.ts — IndexedDB 存储层
 *
 * 纯浏览器端持久化，存储三样东西：
 * 1. root-folders: 用户选择的 PDF 根文件夹句柄
 * 2. file-handles: 文件夹中每个 PDF 文件的句柄 + 元数据
 * 3. record-links: 引易转记录 ↔ PDF 文件的关联
 *
 * File System Access API 的 FileSystemFileHandle 支持 structured clone，
 * 可直接存入 IndexedDB。
 */

const DB_NAME = 'yinyizhuan_pdf_manager'
const DB_VERSION = 2

export interface RootFolder {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
  createdAt: number
}

export interface StoredFile {
  id: string
  relativePath: string     // 相对于根文件夹的路径，如 "明清/王汎森_2023.pdf"
  fileName: string         // 纯文件名
  size: number             // bytes
  lastModified: number     // timestamp
  handle: FileSystemFileHandle
  rootFolderId: string
}

export interface RecordLink {
  recordId: string         // 引易转 ConversionRecord.id
  fileId: string           // StoredFile.id
  linkedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('root-folders')) {
        db.createObjectStore('root-folders', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('file-handles')) {
        db.createObjectStore('file-handles', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('record-links')) {
        db.createObjectStore('record-links', { keyPath: 'recordId' })
      }

    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ──────── Root Folder ────────

export async function saveRootFolder(folder: RootFolder): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('root-folders', 'readwrite')
    tx.objectStore('root-folders').put(folder)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getRootFolder(): Promise<RootFolder | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('root-folders', 'readonly')
    const store = tx.objectStore('root-folders')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result[0])
    req.onerror = () => reject(req.error)
  })
}

export async function getRootFolders(): Promise<RootFolder[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('root-folders', 'readonly')
    const req = tx.objectStore('root-folders').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRootFolder(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('root-folders', 'readwrite')
    tx.objectStore('root-folders').clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteRootFolderById(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('root-folders', 'readwrite')
    tx.objectStore('root-folders').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ──────── File Handles ────────

export async function saveFile(file: StoredFile): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readwrite')
    tx.objectStore('file-handles').put(file)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveAllFiles(files: StoredFile[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readwrite')
    const store = tx.objectStore('file-handles')
    store.clear()
    for (const f of files) {
      store.put(f)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveFilesForRoot(files: StoredFile[], rootFolderId: string): Promise<void> {
  const db = await openDB()
  // Update in-place: preserve IDs by matching relativePath within this root
  const all = await getAllFiles()
  // Index new files by relativePath for fast lookup
  const newByPath: Record<string, StoredFile> = {}
  for (const f of files) { newByPath[f.relativePath] = f }
  // Build result: keep files from other roots + update existing files in this root
  const result: StoredFile[] = []
  const seenPaths = new Set<string>()
  for (const old of all) {
    if (old.rootFolderId !== rootFolderId) {
      result.push(old)  // other root, keep as-is
    } else if (newByPath[old.relativePath]) {
      // File exists in new scan: preserve ID, update rest
      const n = newByPath[old.relativePath]
      result.push({ ...n, id: old.id })
      seenPaths.add(old.relativePath)
    }
    // else: file was deleted, omit it
  }
  // Add truly new files (not matched by relativePath in existing data)
  for (const f of files) {
    if (!seenPaths.has(f.relativePath)) {
      result.push(f)  // new file gets its (already set) ID
    }
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readwrite')
    const store = tx.objectStore('file-handles')
    store.clear()
    for (const f of result) {
      store.put(f)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteFilesByRoot(rootFolderId: string): Promise<void> {
  const all = await getAllFiles()
  const remaining = all.filter(f => f.rootFolderId !== rootFolderId)
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readwrite')
    const store = tx.objectStore('file-handles')
    store.clear()
    for (const f of remaining) {
      store.put(f)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllFiles(): Promise<StoredFile[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readonly')
    const req = tx.objectStore('file-handles').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getFileById(id: string): Promise<StoredFile | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readonly')
    const req = tx.objectStore('file-handles').get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAllFiles(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('file-handles', 'readwrite')
    tx.objectStore('file-handles').clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ──────── Record Links ────────

export async function saveRecordLink(link: RecordLink): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('record-links', 'readwrite')
    tx.objectStore('record-links').put(link)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getRecordLink(recordId: string): Promise<RecordLink | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('record-links', 'readonly')
    const req = tx.objectStore('record-links').get(recordId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllRecordLinks(): Promise<RecordLink[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('record-links', 'readonly')
    const req = tx.objectStore('record-links').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRecordLink(recordId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('record-links', 'readwrite')
    tx.objectStore('record-links').delete(recordId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** 根据 fileId 查找所有关联它的记录 */
export async function getLinksByFileId(fileId: string): Promise<RecordLink[]> {
  const all = await getAllRecordLinks()
  return all.filter(l => l.fileId === fileId)
}

// ──────── File System Traversal ────────

let scanAbortController: AbortController | null = null

/** 取消正在进行的扫描 */
export function abortScan() {
  if (scanAbortController) {
    scanAbortController.abort()
    scanAbortController = null
  }
}

/**
 * 递归扫描根文件夹，收集所有 PDF 文件。
 * 将 handle 和相对路径一起存入 StoredFile 列表。
 */
export async function scanRootFolder(
  rootHandle: FileSystemDirectoryHandle,
  rootFolderId: string,
  onProgress?: (count: number, fileName: string) => void,
  existingIdMap?: Record<string, string>  // relativePath → existing id to preserve links
): Promise<StoredFile[]> {
  abortScan()
  scanAbortController = new AbortController()
  const signal = scanAbortController.signal

  const results: StoredFile[] = []

  async function walk(dirHandle: FileSystemDirectoryHandle, parentPath: string): Promise<void> {
    if (signal.aborted) return

    const entries = dirHandle.values()
    for await (const entry of entries) {
      if (signal.aborted) return

      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
        const fileHandle = entry as FileSystemFileHandle
        try {
          const file = await fileHandle.getFile()
          const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name
          results.push({
            id: existingIdMap?.[fullPath] || crypto.randomUUID(),
            relativePath: fullPath,
            fileName: entry.name,
            size: file.size,
            lastModified: file.lastModified,
            handle: fileHandle,
            rootFolderId,
          })
          onProgress?.(results.length, entry.name)
        } catch (e) {
          console.warn('跳过无法读取的文件:', entry.name, e)
        }
      } else if (entry.kind === 'directory') {
        const subPath = parentPath ? `${parentPath}/${entry.name}` : entry.name
        await walk(entry as FileSystemDirectoryHandle, subPath)
      }
    }
  }

  try {
    await walk(rootHandle, '')
  } catch (e: any) {
    if (e.name === 'AbortError') {
      // 用户取消了扫描，partial results 也可用
    } else {
      throw e
    }
  }

  scanAbortController = null
  return results
}

/**
 * 获取文件夹选择权限。如果之前已有句柄但权限失效，重新请求用户授权。
 */
export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = { mode: 'read' }
  if ((await handle.queryPermission(options)) === 'granted') return true
  if ((await handle.requestPermission(options)) === 'granted') return true
  return false
}

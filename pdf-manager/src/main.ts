/**
 * main.ts — 引易转 PDF 管理器
 *
 * 纯浏览器端，使用 File System Access API + IndexedDB。
 * 三栏布局：文件夹树 | 文件列表 | 详情面板。
 * 支持多个根文件夹。
 */

declare global {
  interface Window {
    __selectFolder: (id: string) => void; __selectFile: (id: string) => void;
    __onSearch: (q: string) => void; __onFilterChange: (val: string) => void;
    __openFile: (id: string) => void;
    __confirmLink: (fileId: string, recordId: string) => Promise<void>;
    __unlinkRecord: (fileId: string, recordId: string) => Promise<void>;
    __manualLink: (fileId: string, recordId: string) => Promise<void>;
    __copyCitation: (text: string, btn: HTMLElement) => void;
    __confirmRemove: (fileId: string) => void;
    __doRemove: (fileId: string) => Promise<void>; __pickFolder: () => Promise<void>;
    __filterRecords: (q: string) => void; __copyPath: (id: string) => void;
    __showToast: (msg: string) => void;
    __setStatusFilter: (val: 'all' | 'linked' | 'pending') => void;
    __rescanRoot: (rootId: string) => Promise<void>;
    __toggleRootExpand: (id: string) => void;
    __reauthorizeRoot: (rootId: string) => Promise<void>;
    __exportData: () => void;
    __importData: () => void;
    __editNote: (recordId: string) => void;
    __saveNote: (recordId: string, text: string) => Promise<void>;
    __editNoteCancel: (recordId: string) => void;
  }
}

import { RootFolder, StoredFile, RecordLink,
  saveRootFolder, getRootFolders,
  getAllFiles, saveFilesForRoot, saveAllFiles,
  getAllRecordLinks, saveRecordLink, deleteRecordLink,
  scanRootFolder, verifyPermission,
} from './pdf-storage'
import { parseFileName } from './filename-parser'

interface YinYiZhuanRecord {
  id: string; citation: { type: string; title: string; authors?: { name: string }[]; [k: string]: unknown }
  targetFormat: string; result: string; timestamp: number; rawInput?: string; note?: string; tags?: string[]
}
interface FileNode {
  id: string; stored: StoredFile; linked: boolean
  parseResult: ReturnType<typeof parseFileName>; ext: string
  linkedRecords: { record: YinYiZhuanRecord; suggested?: boolean }[]
}

const state = {
  ready: false, rootFolders: [] as RootFolder[], storedFiles: [] as StoredFile[],
  records: [] as YinYiZhuanRecord[], links: [] as RecordLink[],
  activeFolder: '', selectedFileId: '', searchQuery: '', folderFilter: '',
  statusFilter: 'all' as 'all' | 'linked' | 'pending',
  expandedRoots: new Set<string>(),
  invalidRoots: [] as RootFolder[], // roots that need re-authorization (full objects with handle)
}
let toastEl: HTMLElement

document.addEventListener('DOMContentLoaded', async () => {
  toastEl = document.getElementById('toast')!
  const allRoots = await getRootFolders()
  for (const r of allRoots) {
    const ok = await verifyPermission(r.handle).catch(() => false)
    if (ok) { state.rootFolders.push(r) } else { state.invalidRoots.push(r) }
  }
  state.storedFiles = (await getAllFiles()).filter(function(f) { return !state.invalidRoots.some(function(ir) { return ir.id === f.rootFolderId }) }); state.links = await getAllRecordLinks()
  try { const raw = localStorage.getItem('yinyizhuan_history'); if (raw) state.records = JSON.parse(raw).sort((a: YinYiZhuanRecord, b: YinYiZhuanRecord) => b.timestamp - a.timestamp) } catch { /* JSON 解析失败时忽略 */ }
  state.ready = true; render()
})

function countValidLinks(): string {
  const fileIds = new Set(state.storedFiles.map(function(f) { return f.id }))
  let count = 0
  for (let li = 0; li < state.links.length; li++) { if (fileIds.has(state.links[li].fileId)) count++ }
  return '' + count
}

function getFileExt(n: string): string { const m = n.match(/\.([^.]+)$/); const e = m?.[1]?.toLowerCase() || ''; return ['pdf','docx','epub','md','caj'].includes(e) ? e : 'pdf' }

function buildFileNodes(): FileNode[] {
  // Pre-build record search texts (cache for performance)
  const recordTexts: string[] = []
  for (let ri = 0; ri < state.records.length; ri++) {
    const rec = state.records[ri]
    recordTexts.push((rec.result + ' ' + rec.citation.title + ' ' + (rec.citation.journalName || '') + ' ' + (rec.citation.bookTitle || '') + ' ' + (rec.citation.authors?.map(function(a) { return a.name }).join(' ') || '')).toLowerCase())
  }
  return state.storedFiles.map(sf => {
    const linked = state.links.some(l => l.fileId === sf.id)
    const linkedRecs = state.links.filter(l => l.fileId === sf.id).map(l => { const r = state.records.find(x => x.id === l.recordId); return r ? { record: r, suggested: false } : null }).filter((x): x is NonNullable<typeof x> => x !== null)
    const parseRes = parseFileName(sf.fileName)
    const suggested: { record: YinYiZhuanRecord; suggested: boolean }[] = []
    if (!linked) {
      // Extract keywords from filename: remove extension, split by _-()[]（）【】\s
      const raw = sf.fileName.replace(/\.(pdf|docx|epub|md|caj)$/i, '')
      const keywords = raw.split(/[_\-\s（）()【\][]+/).filter(function(k) { return k.length > 1 }).map(function(k) { return k.toLowerCase() })
      const existing = new Set(linkedRecs.map(r => r.record.id))
      const scored: { rec: YinYiZhuanRecord; score: number }[] = []
      for (let ri = 0; ri < state.records.length; ri++) {
        if (existing.has(state.records[ri].id)) continue
        const searchText = recordTexts[ri]; let score = 0
        for (let k = 0; k < keywords.length; k++) { if (searchText.indexOf(keywords[k]) > -1) score++; if (score >= 3) break }
        if (score > 0) { scored.push({ rec: state.records[ri], score: score }); if (scored.length >= 15) break }
      }
      scored.sort(function(a, b) { return b.score - a.score })
      for (let i = 0; i < Math.min(scored.length, 5); i++) {
        suggested.push({ record: scored[i].rec, suggested: true })
      }
    }
    return { id: sf.id, stored: sf, linked, parseResult: parseRes, ext: getFileExt(sf.fileName), linkedRecords: [...linkedRecs, ...suggested] }
  })
}

function getFilteredNodes(): FileNode[] {
  let nodes = buildFileNodes()
  if (state.folderFilter) {
    let fid = ''; for (let i = 0; i < state.rootFolders.length; i++) { if (state.rootFolders[i].name === state.folderFilter) { fid = state.rootFolders[i].id; break } }
    if (fid) nodes = nodes.filter(function(n) { return n.stored.rootFolderId === fid })
    else nodes = nodes.filter(function(n) { return n.stored.relativePath.toLowerCase().startsWith(state.folderFilter.toLowerCase() + '/') })
  }
  if (state.activeFolder && state.activeFolder !== '__all__') {
    const parts = state.activeFolder.split('/')
    const rootId = parts[0], subFolder = parts.slice(1).join('/')
    nodes = nodes.filter(n => {
      if (n.stored.rootFolderId !== rootId) return false
      if (subFolder) return n.stored.relativePath.toLowerCase().startsWith(subFolder.toLowerCase() + '/')
      return true
    })
  }
  if (state.statusFilter === 'linked') nodes = nodes.filter(n => n.linked)
  else if (state.statusFilter === 'pending') nodes = nodes.filter(n => !n.linked)
  if (state.searchQuery) { const q = state.searchQuery.toLowerCase(); nodes = nodes.filter(n => n.stored.fileName.toLowerCase().includes(q)) }
  return nodes
}

function render() {
  if (!state.ready) return
  if (state.rootFolders.length === 0 && state.invalidRoots.length === 0) { document.getElementById('setupView')!.style.display = 'block'; document.getElementById('mainView')!.style.display = 'none'; return }
  document.getElementById('setupView')!.style.display = 'none'
  document.getElementById('mainView')!.style.display = 'block'; document.getElementById('mainView')!.innerHTML = mainHTML()
  // If all roots lost permission, prompt
  if (state.rootFolders.length === 0 && state.invalidRoots.length > 0) {
    showTimeoutToast('文件夹权限已过期，请重新选择文件夹', 5000)
  }
}

function showTimeoutToast(msg: string, duration: number) {
  toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer)
  toastTimer = setTimeout(function() { toastEl.classList.remove('show') }, duration)
}

function mainHTML(): string {
  const nodes = getFilteredNodes(), total = state.storedFiles.length
  const folderSet: Record<string,boolean> = {}, folderOpts = ''
  // Add root folder names as options
  for (let i = 0; i < state.rootFolders.length; i++) {
    const rn = state.rootFolders[i].name
    if (!folderSet[rn]) { folderSet[rn] = true; folderOpts += '<option value="' + escHtml(rn) + '"' + (state.folderFilter === rn ? ' selected' : '') + '>' + escHtml(rn) + '</option>' }
  }
  // Add subdirectory names from files
  for (let i2 = 0; i2 < state.storedFiles.length; i2++) {
    const p = state.storedFiles[i2].relativePath.split('/')
    if (p.length > 1 && !folderSet[p[0]]) { folderSet[p[0]] = true; folderOpts += '<option value="' + escHtml(p[0]) + '"' + (state.folderFilter === p[0] ? ' selected' : '') + '>' + escHtml(p[0]) + '</option>' }
  }
  return '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px"><div><h1 style="font-family:Noto Serif SC,serif;font-weight:700;font-size:28px;color:var(--ink-950);margin:0">文献管理</h1><p style="font-size:13px;color:var(--text-muted);margin-top:4px">共 ' + state.storedFiles.length + ' 个文件 · ' + countValidLinks() + ' 条关联</p></div><div style="display:flex;gap:6px"><button class="btn btn-sm btn-ghost" onclick="window.__exportData()" style="border:1px solid var(--border)">导出数据</button><button class="btn btn-sm btn-ghost" onclick="window.__importData()" style="border:1px solid var(--border)">导入数据</button></div></div><div class="top-bar fade-in"><div class="filter-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg><span>' + (state.folderFilter || '所有文件夹') + '</span><select onchange="window.__onFilterChange(this.value)"><option value="">所有文件夹</option>' + folderOpts + '</select></div><div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="搜索文件名..." value="' + escHtml(state.searchQuery) + '" oninput="window.__onSearch(this.value)" id="mainSearch"></div><div class="file-count">' + nodes.length + ' / ' + total + ' 个文件</div></div><div class="three-col">' + treeHTML() + centerHTML(nodes) + rightHTML() + '</div>'
}

function treeHTML(): string {
  let h = '<div class="col col-tree"><div class="tree-header">文件夹</div><div class="tree-scroll">'
  h += '<div class="tree-item' + (!state.activeFolder || state.activeFolder === '__all__' ? ' active' : '') + '" onclick="window.__selectFolder(\'__all__\')"><span>全部文件</span><span class="folder-count">' + state.storedFiles.length + '</span></div>'
  for (let i = 0; i < state.rootFolders.length; i++) {
    const root = state.rootFolders[i], rootFiles = state.storedFiles.filter(function(f) { return f.rootFolderId === root.id })
    if (rootFiles.length === 0) continue
    const rootExpanded = state.expandedRoots.has(root.id)
    const rootActive = state.activeFolder === root.id
    h += '<div class="tree-root-header" onclick="window.__selectFolder(\'' + root.id + '\')" style="background:' + (rootActive ? 'var(--accent-bg)' : '') + ';color:' + (rootActive ? 'var(--accent)' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;color:var(--ink-500);flex-shrink:0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>' + escHtml(root.name) + '</span>'
    // Show expand button only if root has subdirectories
    let hasSubs = false; for (let j = 0; j < rootFiles.length; j++) { if (rootFiles[j].relativePath.indexOf('/') > -1) { hasSubs = true; break } }
    if (hasSubs) h += '<span class="expand-icon' + (rootExpanded ? ' open' : '') + '" onclick="event.stopPropagation();window.__toggleRootExpand(\'' + root.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="9 18 15 12 9 6"/></svg></span>'
    h += '<span class="folder-count">' + rootFiles.length + '</span><span class="root-actions"><button class="btn-icon" title="重新扫描" onclick="event.stopPropagation();window.__rescanRoot(\'' + root.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button></span></div>'
    if (rootExpanded) {
      const subs = {} as Record<string, number>
      for (let j = 0; j < rootFiles.length; j++) {
        const parts = rootFiles[j].relativePath.split('/')
        if (parts.length > 1) subs[parts[0]] = (subs[parts[0]] || 0) + 1
      }
      const keys = Object.keys(subs).sort()
      if (keys.length === 0) {
        h += '<div class="tree-item indent2" style="color:var(--text-muted);font-size:12px;cursor:default;pointer-events:none">根目录文件</div>'
      } else {
        for (let k = 0; k < keys.length; k++) {
          const subActive = state.activeFolder === root.id + '/' + keys[k]
          h += '<div class="tree-item' + (subActive ? ' active' : '') + '" onclick="window.__selectFolder(\'' + root.id + '/' + escHtml(keys[k]) + '\')"><span>' + escHtml(keys[k]) + '</span><span class="folder-count">' + subs[keys[k]] + '</span></div>'
        }
      }
    }
  }
  h += '<div class="tree-add" onclick="window.__pickFolder()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>添加文件夹</span></div>'
  // Invalid roots (permission expired)
  for (let i = 0; i < state.invalidRoots.length; i++) {
    const ir = state.invalidRoots[i]
    h += '<div class="tree-root-header" style="opacity:0.6"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;color:var(--ink-400);flex-shrink:0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span style="color:var(--ink-400)">' + escHtml(ir.name) + '</span><span style="margin-left:auto;font-size:11px;color:var(--text-muted)">授权过期</span><span class="root-actions"><button class="btn-icon" title="重新授权" onclick="event.stopPropagation();window.__reauthorizeRoot(\'' + ir.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg></button></span></div>'
  }
  h += '</div></div>'
  return h
}

function centerHTML(nodes: FileNode[]): string {
  let pills = ''; const opts = [{ id: 'all', label: '全部' }, { id: 'linked', label: '已关联' }, { id: 'pending', label: '待关联' }]
  for (let i = 0; i < opts.length; i++) {
    const s = opts[i], active = state.statusFilter === s.id
    pills += '<span style="cursor:pointer;font-size:11px;padding:2px 10px;border-radius:10px;font-weight:' + (active ? '600' : '400') + ';color:' + (active ? 'var(--ink-950)' : 'var(--ink-400)') + ';background:' + (active ? 'var(--ink-200)' : 'transparent') + '" onclick="window.__setStatusFilter(\'' + s.id + '\')">' + s.label + '</span>'
  }
  let h = '<div class="col col-center"><div class="list-header"><span class="label">文件</span><div style="display:flex;gap:2px;margin-left:12px">' + pills + '</div><span class="count">' + nodes.length + ' 个文件</span></div><div class="list-scroll" id="fileList">'
  for (let i = 0; i < nodes.length; i++) {
    const fn = nodes[i], sel = state.selectedFileId === fn.id ? ' selected' : ''
    h += '<div class="list-item' + sel + '" onclick="window.__selectFile(\'' + fn.id + '\')" title="' + escHtml(fn.stored.fileName) + '">' + fileIconHTML(fn.ext) + '<div class="info"><div class="name">' + escHtml(fn.stored.fileName) + '</div><div class="meta">' + formatSize(fn.stored.size) + ' · ' + new Date(fn.stored.lastModified).toLocaleDateString('zh-CN') + '</div></div><span class="status ' + (fn.linked ? 'status-linked' : 'status-pending') + '">' + (fn.linked ? '已关联' : '待关联') + '</span></div>'
  }
  if (nodes.length === 0) h += '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px">无匹配文件</div>'
  h += '</div></div>'; return h
}

function fileIconHTML(ext: string): string {
  const map: Record<string,string> = {
    pdf: '<svg class="file-icon pdf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    docx: '<svg class="file-icon docx" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><path d="M12 18v-5"/><circle cx="12" cy="18" r="1"/></svg>',
    epub: '<svg class="file-icon epub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    md: '<svg class="file-icon md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l3-3 3 3"/></svg>',
    caj: '<svg class="file-icon caj" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-5"/><circle cx="12" cy="18" r="1"/></svg>',
  }; return map[ext] || map.pdf
}

function rightHTML(): string {
  let h = '<div class="col col-right" id="rightCol">'
  const nodes = getFilteredNodes(), fn = nodes.find(function(n) { return n.id === state.selectedFileId })
  if (!fn) { h += '<div class="empty-detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><p>选择一个文件查看详情</p></div>'; return h + '</div>' }
  const sf = fn.stored, linkedRecs = fn.linkedRecords.filter(function(r) { return !r.suggested }), suggestedRecs = fn.linkedRecords.filter(function(r) { return r.suggested }), pr = fn.parseResult
  const others = state.records.filter(function(r) { return !fn.linkedRecords.some(function(lr) { return lr.record.id === r.id }) })
  h += '<div class="detail-scroll slide-in" id="detailScroll">'
  h += '<div class="detail-section"><div class="section-title">文件信息</div><div class="info-grid"><span class="label">文件名</span><span class="value filename">' + escHtml(sf.fileName) + '</span><span class="label">格式</span><span class="value">' + fn.ext.toUpperCase() + '</span><span class="label">大小</span><span class="value">' + formatSize(sf.size) + '</span><span class="label">修改日期</span><span class="value">' + new Date(sf.lastModified).toLocaleDateString('zh-CN') + '</span></div>'
  if (!fn.linked && pr.confidence !== 'low') {
    h += '<div class="parsed-block"><div class="parsed-title">文件名解析</div><div class="parsed-grid"><span class="label">作者</span><span class="value">' + escHtml(pr.authors?.join(', ') || '—') + '</span><span class="label">标题</span><span class="value">' + escHtml(pr.title || '—') + '</span><span class="label">年份</span><span class="value">' + escHtml(pr.year || '—') + '</span><span class="label">可信度</span><span class="value"><span class="confidence"><span class="dot ' + pr.confidence + '"></span>' + (pr.confidence === 'high' ? '高' : '中') + '</span></span></div></div>'
  }
  h += '<div class="action-row"><button class="btn btn-sm btn-outline" onclick="window.__openFile(\'' + fn.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>打开文件</button><button class="btn btn-sm btn-ghost" onclick="window.__copyPath(\'' + fn.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制路径</button></div></div>'
  if (!fn.linked) {
    h += '<div class="detail-section" style="padding-top:8px;padding-bottom:4px"><button class="btn btn-xs btn-ghost" onclick="window.__confirmRemove(\'' + fn.id + '\')" style="color:var(--text-muted);padding:4px 8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>从索引中移除</button></div>'
  }
  if (!fn.linked) h += '<hr class="section-divider">'
  if (linkedRecs.length > 0) {
    h += '<div class="detail-section"><div class="section-title">关联记录</div>'
    for (let i = 0; i < linkedRecs.length; i++) {
      const r = linkedRecs[i].record
      h += '<div class="record-card linked"><div class="row1"><span class="type-tag">' + (r.citation.type || '?') + '</span><span style="font-size:11px;color:var(--text-secondary)">' + r.targetFormat + '</span></div><div class="result-text">' + escHtml(r.result) + '</div>'
      h += '<div class="note-area" id="note-' + r.id + '">'
      if (r.note) {
        h += '<div class="note-display" onclick="window.__editNote(\'' + r.id + '\')"><span class="note-label">备注</span><span class="note-text">' + escHtml(r.note) + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;flex-shrink:0;color:var(--ink-400)"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>'
      } else {
        h += '<div class="note-add" onclick="window.__editNote(\'' + r.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>添加备注</span></div>'
      }
      h += '</div>'
      h += '<div class="actions"><button class="btn btn-xs btn-ghost" onclick="window.__copyCitation(\'' + escHtml(r.result) + '\',this)" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制</button><button class="btn btn-xs btn-ghost" onclick="window.__unlinkRecord(\'' + fn.id + '\',\'' + r.id + '\')" style="color:var(--ink-400)">取消关联</button></div></div>'
    }
    h += '</div>'
  }
  if (!fn.linked && suggestedRecs.length > 0) {
    h += '<div class="detail-section"><div class="smart-banner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span class="text">文件名匹配到 ' + suggestedRecs.length + ' 条记录</span></div>'
    for (let i = 0; i < suggestedRecs.length; i++) {
      const sr = suggestedRecs[i], rec = sr.record, display = rec.result || rec.citation.title || '(无标题)'
      h += '<div class="suggested-card"><div class="row1"><span class="type-tag">' + (rec.citation.type || '?') + '</span><span style="font-size:11px;color:var(--ink-500)">' + rec.targetFormat + '</span></div><div class="title">' + (display.length > 50 ? display.slice(0, 50) + '...' : display) + '</div><div class="actions"><button class="btn btn-xs btn-accent" onclick="window.__confirmLink(\'' + fn.id + '\',\'' + rec.id + '\')">确认关联</button><button class="btn btn-xs btn-ghost" onclick="window.__showToast(\'已忽略\')">忽略</button></div></div>'
    }
    h += '</div>'
  }
  if (!fn.linked && others.length > 0) {
    h += '<div class="detail-section"><div class="section-title">所有记录</div><input type="text" placeholder="搜索记录..." oninput="window.__filterRecords(this.value)" style="width:100%;padding:6px 10px;border:1px solid var(--border-light);border-radius:4px;font-size:12px;font-family:inherit;outline:none;margin-bottom:6px"><div id="recordList">'
    for (let i = 0; i < others.length; i++) {
      const o = others[i]
      h += '<div class="record-list-item"><span class="type-tag">' + (o.citation.type || '?') + '</span><span class="title">' + escHtml(o.citation.title || '(无标题)') + '</span><button class="btn btn-xs btn-ghost" onclick="window.__manualLink(\'' + fn.id + '\',\'' + o.id + '\')" style="flex-shrink:0">关联</button></div>'
    }
    h += '</div></div>'
  }
  h += '</div></div>'; return h
}

// ─── Handlers ───

window.__selectFolder = function(id) { state.activeFolder = id; state.selectedFileId = ''; state.searchQuery = ''; document.getElementById('mainView')!.innerHTML = mainHTML() }
window.__selectFile = function(id) { state.selectedFileId = id; const nodes = getFilteredNodes(); const c = document.querySelector('.col-center'), r = document.getElementById('rightCol'); if (c) c.outerHTML = centerHTML(nodes); if (r) r.outerHTML = rightHTML() }
window.__onSearch = function(q) { state.searchQuery = q; refreshList() }
window.__onFilterChange = function(val) { state.folderFilter = val; refreshList(); const s = document.querySelector('.filter-box span'); if (s) s.textContent = val || '所有文件夹' }
window.__openFile = async function(id) { const sf = state.storedFiles.find(function(f) { return f.id === id }); if (!sf) return; try { const f = await sf.handle.getFile(); const m: Record<string,string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', epub: 'application/epub+zip', md: 'text/markdown', caj: 'application/octet-stream' }; const ext = (sf.fileName.match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase(); const blob = new Blob([f], { type: m[ext] || 'application/pdf' }); window.open(URL.createObjectURL(blob), '_blank') } catch { showToast('文件可能已被移动或删除，建议从索引中移除'); setTimeout(function() { window.__confirmRemove(id) }, 2000) } }
window.__confirmLink = async function(fid, rid) {
  let existing = null; for (let li = 0; li < state.links.length; li++) { if (state.links[li].recordId === rid) { existing = state.links[li]; break } }
  if (existing) {
    // Check if the existing link's fileId is still valid
    const fileStillExists = state.storedFiles.some(function(f) { return f.id === existing.fileId })
    if (fileStillExists) { showToast('该记录已关联'); return }
    // Orphaned link — remove it and re-link with current file
    await deleteRecordLink(rid)
  }
  await saveRecordLink({ recordId: rid, fileId: fid, linkedAt: Date.now() }); state.links = await getAllRecordLinks(); showToast('已关联'); refreshDetail()
}
window.__unlinkRecord = async function(fid, rid) { await deleteRecordLink(rid); state.links = await getAllRecordLinks(); showToast('已取消关联'); refreshDetail() }
window.__manualLink = async function(fid, rid) { await window.__confirmLink(fid, rid) }
window.__copyCitation = function(text, btn) { navigator.clipboard.writeText(text).then(function() { const orig = btn.innerHTML; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg> 已复制'; btn.style.color = 'var(--green)'; setTimeout(function() { btn.innerHTML = orig; btn.style.color = '' }, 1500) }).catch(function() { showToast('已复制') }) }
window.__confirmRemove = function(id) {
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay'
  overlay.innerHTML = '<div class="modal-box fade-in"><h3>从索引中移除？</h3><p>该文件将从管理器的索引中移除，不会删除原始文件。</p><div class="actions"><button class="btn btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="btn btn-sm" style="background:var(--vermilion-500);color:#fff;border-color:var(--vermilion-500)" onclick="window.__doRemove(\'' + id + '\')">确认移除</button></div></div>'
  document.body.appendChild(overlay)
}
window.__doRemove = async function(id) {
  document.querySelector('.modal-overlay')?.remove()
  const sf = state.storedFiles.find(function(f) { return f.id === id })
  if (sf) {
    for (let i = 0; i < state.links.length; i++) { if (state.links[i].fileId === id) await deleteRecordLink(state.links[i].recordId) }
    state.storedFiles = state.storedFiles.filter(function(f) { return f.id !== id }); await saveAllFiles(state.storedFiles); state.links = await getAllRecordLinks()
  }
  state.selectedFileId = state.storedFiles.length > 0 ? state.storedFiles[0].id : ''; document.getElementById('mainView')!.innerHTML = mainHTML(); showToast('已从索引中移除')
}
window.__pickFolder = async function() { await pickRootFolder() }
window.__filterRecords = function(q) { const list = document.getElementById('recordList'); if (!list) return; list.querySelectorAll('.record-list-item').forEach(function(item) { item.style.display = !q || (item.textContent || '').toLowerCase().includes(q.toLowerCase()) ? '' : 'none' }) }
window.__copyPath = function(id) { const sf = state.storedFiles.find(function(f) { return f.id === id }); if (!sf) return; let rootName = ''; for (let ri = 0; ri < state.rootFolders.length; ri++) { if (state.rootFolders[ri].id === sf.rootFolderId) { rootName = state.rootFolders[ri].name; break } }; const fullPath = rootName ? rootName + '/' + sf.relativePath : sf.relativePath; navigator.clipboard.writeText(fullPath).then(function() { showToast('已复制路径: ' + fullPath) }).catch(function() { showToast('复制失败') }) }
window.__showToast = function(msg) { showToast(msg) }
window.__setStatusFilter = function(val) { state.statusFilter = val; const nodes = getFilteredNodes(); const c = document.querySelector('.col-center'); if (c) c.outerHTML = centerHTML(nodes) }
window.__toggleRootExpand = function(id) { if (state.expandedRoots.has(id)) state.expandedRoots.delete(id); else state.expandedRoots.add(id); const t = document.querySelector('.col-tree'); if (t) t.outerHTML = treeHTML() }
window.__rescanRoot = async function(id) { const root = state.rootFolders.find(function(r) { return r.id === id }); if (root) await scanRoot(root) }
window.__reauthorizeRoot = async function(id) {
  const root = state.invalidRoots.find(function(r) { return r.id === id })
  if (!root) return
  const ok = await verifyPermission(root.handle)
  if (ok) {
    state.invalidRoots = state.invalidRoots.filter(function(r) { return r.id !== id })
    state.rootFolders.push(root)
    await scanRoot(root); render()
  } else { showToast('授权失败，请重试') }
}

window.__exportData = function() {
  const data = {
    exportedAt: new Date().toISOString(), version: 1,
    roots: state.rootFolders.concat(state.invalidRoots).map(function(r) { return { id: r.id, name: r.name, createdAt: r.createdAt } }),
    files: state.storedFiles.map(function(f) { return { id: f.id, relativePath: f.relativePath, fileName: f.fileName, size: f.size, lastModified: f.lastModified, rootFolderId: f.rootFolderId } }),
    links: state.links,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'yinyizhuan-pdf-' + new Date().toISOString().slice(0, 10) + '.json'; a.click()
  showToast('已导出 ' + data.links.length + ' 条关联')
}

window.__importData = function() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
  input.onchange = async function(e: Event) {
    const inputEl = e.target as HTMLInputElement
    const file = inputEl.files?.[0]; if (!file) return
    try {
      const text = await file.text(); const d = JSON.parse(text)
      if (!d.version || !d.roots) { showToast('无效的备份文件'); return }
      // Store pending links keyed by rootFolderId + relativePath
      const pending: { key: string; recordId: string }[] = []
      for (let i = 0; i < d.links.length; i++) {
        const fm = d.files.find(function(f: { id: string; rootFolderId: string; relativePath: string }) { return f.id === d.links[i].fileId })
        if (fm) pending.push({ key: fm.rootFolderId + '|' + fm.relativePath, recordId: d.links[i].recordId })
      }
      localStorage.setItem('yinyizhuan_pdf_pending_links', JSON.stringify(pending))
      showToast('导入 ' + pending.length + ' 条待关联记录，请重新扫描文件夹以恢复')
    } catch (e) { showToast('导入失败: ' + (e instanceof Error ? e.message : '未知错误')) }
  }
  input.click()
}

// ─── Note editing ───

window.__editNote = function(recordId: string) {
  const area = document.getElementById('note-' + recordId)
  if (!area) return
  let rec = null; for (let ri = 0; ri < state.records.length; ri++) { if (state.records[ri].id === recordId) { rec = state.records[ri]; break } }
  area.innerHTML = '<div class="note-editor"><textarea id="noteInput-' + recordId + '" class="note-textarea" placeholder="输入备注…">' + (rec ? escHtml(rec.note || '') : '') + '</textarea><div class="note-editor-actions"><button class="btn btn-xs" onclick="window.__saveNote(\'' + recordId + '\',document.getElementById(\'noteInput-' + recordId + '\').value)">保存</button><button class="btn btn-xs btn-ghost" onclick="window.__editNoteCancel(\'' + recordId + '\')">取消</button></div></div>'
}
window.__saveNote = async function(recordId: string, text: string) {
  try {
    const raw = localStorage.getItem('yinyizhuan_history')
    if (!raw) { showToast('无法读取历史记录'); return }
    const records = JSON.parse(raw)
    let found = false
    for (let ri = 0; ri < records.length; ri++) {
      if (records[ri].id === recordId) {
        if (text) { records[ri].note = text } else { delete records[ri].note }
        found = true; break
      }
    }
    if (!found) { showToast('未找到记录'); return }
    localStorage.setItem('yinyizhuan_history', JSON.stringify(records))
    for (let ri2 = 0; ri2 < state.records.length; ri2++) {
      if (state.records[ri2].id === recordId) {
        if (text) { state.records[ri2].note = text } else { delete state.records[ri2].note }
        break
      }
    }
    showToast('备注已保存'); refreshDetail()
  } catch (e) { showToast('保存失败: ' + (e instanceof Error ? e.message : '未知错误')) }
}
window.__editNoteCancel = function() { refreshDetail() }

// ─── File System ───

async function pickRootFolder() {
  try {
    const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()
    if (state.rootFolders.some(function(r) { return r.name === handle.name })) { showToast('该文件夹已添加'); return }
    const folder: RootFolder = { id: crypto.randomUUID(), name: handle.name, handle: handle, createdAt: Date.now() }
    await saveRootFolder(folder); state.rootFolders.push(folder); await scanRoot(folder); render()
  } catch (e) { const err = e as { name?: string; message?: string }; if (err.name !== 'AbortError' && err.name !== 'SecurityError') showToast('选择文件夹失败: ' + (err.message || '未知错误')) }
}

async function scanRoot(root: RootFolder) {
  state.scanning = true; showScanningOverlay()
  try {
    const ok = await verifyPermission(root.handle); if (!ok) { showToast('未获得权限'); state.scanning = false; hideScanningOverlay(); return }
    // Build existingIdMap from IDB so re-scanned files reuse old IDs
    const allStored = await getAllFiles()
    const existingIdMap: Record<string, string> = {}
    for (let si = 0; si < allStored.length; si++) {
      const sf = allStored[si]
      if (sf.rootFolderId === root.id) existingIdMap[sf.relativePath] = sf.id
    }
    const files = await scanRootFolder(root.handle, root.id, function(c) { updateScanningProgress(c) }, existingIdMap)
    // Detect deleted files
    const oldIds = new Set(allStored.filter(function(f) { return f.rootFolderId === root.id }).map(function(f) { return f.id }))
    const newIds = new Set(files.map(function(f) { return f.id }))
    for (const oldId of oldIds) { if (!newIds.has(oldId)) { for (let li = 0; li < state.links.length; li++) { if (state.links[li].fileId === oldId) await deleteRecordLink(state.links[li].recordId) } } }
    await saveFilesForRoot(files, root.id); state.storedFiles = await getAllFiles(); state.links = await getAllRecordLinks()
    // Recover orphaned links: match record keywords with parsed filenames
    const validFileIds = new Set(state.storedFiles.map(function(f) { return f.id }))
    let recovered = 0
    for (let li = 0; li < state.links.length; li++) {
      const link = state.links[li]
      if (validFileIds.has(link.fileId)) continue
      // Orphaned — find the record and try to match with a file
      let rec = null; for (let ri = 0; ri < state.records.length; ri++) { if (state.records[ri].id === link.recordId) { rec = state.records[ri]; break } }
      if (!rec) continue
      const searchText = (rec.result + ' ' + rec.citation.title + ' ' + rec.rawInput + ' ' + (rec.citation.authors || []).map(function(a) { return a.name }).join(' ')).toLowerCase()
      let best: { file: StoredFile; score: number } | null = null
      for (let si = 0; si < state.storedFiles.length; si++) {
        const sf = state.storedFiles[si]
        if (validFileIds.has(sf.id)) continue  // skip already-valid files (not needed but safe)
        // Match filename keywords against record
        const fname = sf.fileName.replace(/\.(pdf|docx|epub|md|caj)$/i, '')
        const keywords = fname.split(/[_\-\s（）()【\][]+/).filter(function(k) { return k.length > 1 }).map(function(k) { return k.toLowerCase() })
        let score = 0
        for (let k = 0; k < keywords.length; k++) { if (searchText.indexOf(keywords[k]) > -1) score++ }
        if (score > 0 && (!best || score > best.score)) { best = { file: sf, score: score } }
      }
      if (best && best.score >= 1) {
        await deleteRecordLink(link.recordId)
        await saveRecordLink({ recordId: link.recordId, fileId: best.file.id, linkedAt: link.linkedAt })
        validFileIds.add(best.file.id)
        recovered++
      }
    }
    if (recovered > 0) { state.links = await getAllRecordLinks(); showToast('已自动恢复 ' + recovered + ' 条关联') }
    // Match pending links from import
    const pendingRaw = localStorage.getItem('yinyizhuan_pdf_pending_links')
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw) as { key: string; recordId: string }[]
      let matched = 0
      for (let pi = 0; pi < pending.length; pi++) {
        const pRelPath = pending[pi].key.split('|').slice(1).join('|') // relativePath part
        for (let fi = 0; fi < files.length; fi++) {
          if (files[fi].relativePath === pRelPath && !state.links.some(function(l) { return l.recordId === pending[pi].recordId })) {
            await saveRecordLink({ recordId: pending[pi].recordId, fileId: files[fi].id, linkedAt: Date.now() })
            matched++; break
          }
        }
      }
      if (matched > 0) { state.links = await getAllRecordLinks(); showToast('已恢复 ' + matched + ' 条关联') }
      localStorage.removeItem('yinyizhuan_pdf_pending_links')
    }
    showToast('扫描完成，共 ' + files.length + ' 个文件' + (oldIds.size > files.length ? '，已清理 ' + (oldIds.size - files.length) + ' 个失效文件' : ''))
  } catch (e) { showToast('扫描失败: ' + (e instanceof Error ? e.message : '未知错误')) }
  state.scanning = false; hideScanningOverlay(); document.getElementById('mainView')!.innerHTML = mainHTML()
}

function showScanningOverlay() { const o = document.createElement('div'); o.className = 'scanning-overlay'; o.id = 'scanningOverlay'; o.innerHTML = '<div class="scanning-box"><div class="spinner"></div><p>正在扫描文件...</p></div>'; document.body.appendChild(o) }
function updateScanningProgress(c: number) { const o = document.getElementById('scanningOverlay'); if (o) o.querySelector('p')!.textContent = '已发现 ' + c + ' 个 PDF...' }
function hideScanningOverlay() { document.getElementById('scanningOverlay')?.remove() }

function refreshList() {
  const nodes = getFilteredNodes(), list = document.getElementById('fileList'); if (!list) return
  const ce = document.querySelector('.top-bar .file-count'); if (ce) ce.textContent = nodes.length + ' / ' + state.storedFiles.length + ' 个文件'
  const hc = document.querySelector('.list-header .count'); if (hc) hc.textContent = nodes.length + ' 个文件'
  list.innerHTML = nodes.map(function(fn) { return '<div class="list-item' + (state.selectedFileId === fn.id ? ' selected' : '') + '" onclick="window.__selectFile(\'' + fn.id + '\')" title="' + escHtml(fn.stored.fileName) + '">' + fileIconHTML(fn.ext) + '<div class="info"><div class="name">' + escHtml(fn.stored.fileName) + '</div><div class="meta">' + formatSize(fn.stored.size) + ' · ' + new Date(fn.stored.lastModified).toLocaleDateString('zh-CN') + '</div></div><span class="status ' + (fn.linked ? 'status-linked' : 'status-pending') + '">' + (fn.linked ? '已关联' : '待关联') + '</span></div>' }).join('')
}

function refreshDetail() { const r = document.getElementById('rightCol'); if (r) r.outerHTML = rightHTML() }

let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function() { toastEl.classList.remove('show') }, 2200) }
function escHtml(s: string): string { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }
function formatSize(bytes: number): string { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / (1024 * 1024)).toFixed(1) + ' MB' }

document.getElementById('btnPickFolder')?.addEventListener('click', pickRootFolder)

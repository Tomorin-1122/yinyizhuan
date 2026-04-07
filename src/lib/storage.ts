import { ConversionRecord } from './types';

const STORAGE_KEY = 'yinyizhuan_history';
const MAX_RECORDS = 500;

export function getHistory(): ConversionRecord[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const records: ConversionRecord[] = JSON.parse(data);
    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('Failed to parse history', e);
    return [];
  }
}

export function addRecord(record: ConversionRecord): void {
  const history = getHistory();
  const updatedHistory = [record, ...history].slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
}

export function deleteRecord(id: string): void {
  const history = getHistory();
  const updatedHistory = history.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportHistoryAsJSON(): string {
  const history = getHistory();
  return JSON.stringify(history, null, 2);
}

// 防止 Excel 公式注入的危险字符前缀
const DANGEROUS_PREFIXES = ['=', '+', '-', '@'];

/**
 * 净化字段以防止 Excel 公式注入
 * 如果字段以危险字符开头，则在前面添加单引号使其成为文本
 */
function sanitizeForCSV(field: string): string {
  const trimmed = field.trim();
  if (DANGEROUS_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    return "'" + field;
  }
  return field;
}

export function exportHistoryAsCSV(): string {
  const history = getHistory();
  const headers = ['时间', '类型', '标题', '目标格式', '转换结果'];
  
  const rows = history.map(record => {
    const date = new Date(record.timestamp).toLocaleString('zh-CN');
    const type = getCitationTypeName(record.citation.type);
    const title = record.citation.title;
    const format = getFormatName(record.targetFormat);
    const result = record.result;
    
    return [date, type, title, format, result].map(field => {
      const sanitized = sanitizeForCSV(String(field));
      const escaped = sanitized.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

export function getRecordById(id: string): ConversionRecord | undefined {
  const history = getHistory();
  return history.find(r => r.id === id);
}

// Internal helper functions or moved to utils?
// I'll put them here for simplicity or import them if I create utils first.
// The prompt says "import from ./types", but these helper names are in utils.ts as well.
// I'll define them in utils.ts and import here.

import { getCitationTypeName, getFormatName } from './utils';

// ─── 标签组 ───────────────────────────────────────────────────────
const TAG_GROUP_KEY = 'yinyizhuan_tag_groups';

export function getTagGroups(): import('./types').TagGroup[] {
  const data = localStorage.getItem(TAG_GROUP_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

function saveTagGroups(groups: import('./types').TagGroup[]): void {
  localStorage.setItem(TAG_GROUP_KEY, JSON.stringify(groups));
}

export function createTagGroup(name: string, description?: string): import('./types').TagGroup {
  const group: import('./types').TagGroup = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    description,
    recordIds: [],
    createdAt: Date.now(),
  };
  const groups = getTagGroups();
  saveTagGroups([...groups, group]);
  return group;
}

export function deleteTagGroup(groupId: string): void {
  saveTagGroups(getTagGroups().filter(g => g.id !== groupId));
}

export function updateTagGroup(groupId: string, patch: Partial<Pick<import('./types').TagGroup, 'name' | 'description'>>): void {
  saveTagGroups(getTagGroups().map(g => g.id === groupId ? { ...g, ...patch } : g));
}

export function addRecordToGroup(groupId: string, recordId: string): void {
  saveTagGroups(getTagGroups().map(g => {
    if (g.id !== groupId) return g;
    if (g.recordIds.includes(recordId)) return g;
    return { ...g, recordIds: [...g.recordIds, recordId] };
  }));
}

export function removeRecordFromGroup(groupId: string, recordId: string): void {
  saveTagGroups(getTagGroups().map(g =>
    g.id === groupId ? { ...g, recordIds: g.recordIds.filter(id => id !== recordId) } : g
  ));
}

// ─── 单条记录备注 ─────────────────────────────────────────────────
export function updateRecordNote(recordId: string, note: string): void {
  const history = getHistory();
  const updated = history.map(r => r.id === recordId ? { ...r, note } : r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

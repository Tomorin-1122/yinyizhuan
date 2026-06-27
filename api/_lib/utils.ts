import { CitationType, CitationLanguage, TargetFormat } from './types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function detectLanguage(text: string): CitationLanguage {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  return 'en';
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${Y}年${M}月${D}日 ${h}:${m}`;
}

export function getCitationTypeName(type: CitationType): string {
  const names: Record<CitationType, string> = {
    book: '专著',
    chapter: '论文集析出',
    journal: '期刊',
    newspaper: '报纸',
    thesis: '学位论文',
    archive: '档案',
    ancient: '古籍',
    electronic: '电子文献',
    conference: '会议论文',
    diary: '日记',
    transferred: '转引',
    classic: '经典'
  };
  return names[type] || '其他';
}

export function getFormatName(format: TargetFormat): string {
  const formats: Record<TargetFormat, string> = {
    lsyj: '《历史研究》格式',
    gbt7714: 'GB/T 7714',
    apa: 'APA 格式'
  };
  return formats[format] || format;
}

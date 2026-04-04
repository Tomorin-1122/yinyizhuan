import { CitationType, TargetFormat } from './types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

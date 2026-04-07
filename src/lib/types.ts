export type CitationType = 'book' | 'chapter' | 'journal' | 'newspaper' | 'thesis' | 'archive' | 'ancient' | 'electronic' | 'conference' | 'diary' | 'transferred' | 'classic' | 'ancient_unpublished' | 'ancient_published' | 'ancient_local_gazetteer'
export type CitationLanguage = 'zh' | 'en' | 'ja'

export interface Author {
  name: string;
  role?: string;
}

export interface Citation {
  id: string;
  type: CitationType;
  language: CitationLanguage;
  authors: Author[];
  title: string;
  publisher?: string;
  publishPlace?: string;
  publishYear?: string;
  pages?: string;
  edition?: string;
  volume?: string;
  bookTitle?: string;
  bookAuthors?: Author[];
  journalName?: string;
  issue?: string;
  volumeNumber?: string;
  newspaperName?: string;
  publishDate?: string;
  pageSection?: string;
  thesisType?: string;
  institution?: string;
  archiveDate?: string;
  archiveNumber?: string;
  archiveLocation?: string;
  ancientEdition?: string;
  section?: string;
  pageAB?: string;
  url?: string;
  accessDate?: string;
  originalCitation?: string;
  transferredFrom?: string;
  prefaceTitle?: string;
  seriesName?: string;
  seriesVolume?: string;
  translators?: Author[];
  notes?: string;
  rawText?: string;
  // 未出版古籍字段
  collectionInfo?: string; // 藏所
  volumeNumberStr?: string; // 卷次（如"三十卷"）
  // 已出版地方志字段
  eraName?: string; // 年号（如"万历"）
  seriesBookNumber?: string; // 丛书册数（如"第300册"）
}

export interface ConversionRecord {
  id: string;
  citation: Citation;
  targetFormat: TargetFormat;
  result: string;
  timestamp: number;
  rawInput?: string;
  note?: string;
  tags?: string[];
}

export interface TagGroup {
  id: string;
  name: string;
  description?: string;
  recordIds: string[];
  createdAt: number;
}

export type TargetFormat = 'lsyj' | 'gbt7714' | 'apa'

export interface FormatInfo {
  id: TargetFormat
  name: string
  description: string
}

export const FORMAT_LIST: FormatInfo[] = [
  { id: 'lsyj', name: '\u300A\u5386\u53F2\u7814\u7A76\u300B\u683C\u5F0F', description: '\u5386\u53F2\u7814\u7A76\u6742\u5FD7\u793E\u5F15\u6587\u6CE8\u91CA\u89C4\u8303' },
  { id: 'gbt7714', name: 'GB/T 7714-2015', description: '\u4FE1\u606F\u4E0E\u6587\u732E \u53C2\u8003\u6587\u732E\u8457\u5F55\u89C4\u5219' },
  { id: 'apa', name: 'APA \u7B2C7\u7248', description: '\u7F8E\u56FD\u5FC3\u7406\u5B66\u4F1A\u5F15\u7528\u683C\u5F0F' },
]

export type CitationType = 'book' | 'chapter' | 'journal' | 'newspaper' | 'thesis' | 'archive' | 'ancient' | 'electronic' | 'conference' | 'diary' | 'transferred' | 'classic'
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
  ancientSubType?: 'blockprint' | 'punctuated' | 'reprint' | 'extract' | 'gazetteer' | 'classic' | 'chronicle';
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
  { id: 'lsyj', name: '《历史研究》格式', description: '历史研究杂志社引文注释规范' },
  { id: 'gbt7714', name: 'GB/T 7714-2015', description: '信息与文献 参考文献著录规则' },
  { id: 'apa', name: 'APA 第7版', description: '美国心理学会引用格式' },
]

import { Citation, CitationType, CitationLanguage } from './types';

export function parseCitationText(text: string): Partial<Citation> {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const language = detectLanguage(normalizedText);

  // Try GB/T 7714 style first: [序号]作者.题名[标识].来源信息
  const gbt = parseGBT7714Style(normalizedText);
  if (gbt) {
    return { id, language, rawText: normalizedText, ...gbt };
  }

  const type = detectType(normalizedText, language);
  let result: Partial<Citation> = { id, language, type, rawText: normalizedText };

  if (language === 'zh') {
    result = { ...result, ...parseChineseCitation(normalizedText, type) };
  } else {
    result = { ...result, ...parseEnglishCitation(normalizedText, type) };
  }

  return result;
}

// 解析 GB/T 7714 格式：[序号]作者.题名[文献标识].出版信息
function parseGBT7714Style(text: string): Partial<Citation> | null {
  // 匹配开头的序号（可选），例如 [1] 或没有序号
  const withSeq = /^[\[\[【]?\d+[\]\]】]?\s*(.+)$/.exec(text);
  const body = withSeq ? withSeq[1].trim() : text;

  // 必须含有 [X] 文献类型标识才认定为 GB/T 格式
  const typeTagMatch = /\[(J|M|D|N|C|EB\/OL|G|R|A|Z|S|P)\]/i.exec(body);
  if (!typeTagMatch) return null;

  const typeTag = typeTagMatch[1].toUpperCase();
  const tagIndex = body.indexOf(typeTagMatch[0]);

  // 标识前面的内容：作者.题名
  const beforeTag = body.slice(0, tagIndex);
  // 标识后面的内容：出版信息
  const afterTag = body.slice(tagIndex + typeTagMatch[0].length).replace(/^[.\s]+/, '');

  // 从前半部分拆出 作者 和 题名
  // 格式：作者1,作者2.题名  或  作者.题名
  // 最后一个 . 之前是作者，之后是题名（但要排除作者名中间的点）
  const dotIdx = beforeTag.lastIndexOf('.');
  let authorsStr = '';
  let title = '';
  if (dotIdx > 0) {
    authorsStr = beforeTag.slice(0, dotIdx).trim();
    title = beforeTag.slice(dotIdx + 1).trim();
  } else {
    title = beforeTag.trim();
  }

  // 清理序号（如果 authorsStr 还带着）
  authorsStr = authorsStr.replace(/^[\[\[【]?\d+[\]\]】]\s*/, '').trim();

  const authors = authorsStr
    ? authorsStr.split(/[,，、;；]+/).map(a => ({ name: a.trim() })).filter(a => a.name)
    : [];

  // 确定文献类型
  const type = gbtTagToType(typeTag);

  // 解析出版信息（afterTag）
  const result: Partial<Citation> = { type, title, authors };

  if (type === 'journal') {
    // 期刊：期刊名,年份,卷(期):页码
    // 例：学术研究,2004,(06):89-94
    const journalMatch = /^([^,，]+)[,，]\s*(\d{4})[,，]?\s*(?:第?(\d+)卷)?[,，]?\s*[(\（]?(?:第?(\d+)[期号]?)[)\）]?\s*[:\：]\s*(\d[\d\-—~]*)/.exec(afterTag);
    if (journalMatch) {
      result.journalName = journalMatch[1].replace(/^[.\s]+/, '').trim();
      result.publishYear = journalMatch[2];
      if (journalMatch[3]) result.volumeNumber = journalMatch[3];
      if (journalMatch[4]) result.issue = journalMatch[4];
      if (journalMatch[5]) result.pages = journalMatch[5];
    } else {
      // 宽松匹配
      const nameMatch = /^([^,，]+)/.exec(afterTag);
      if (nameMatch) result.journalName = nameMatch[1].trim();
      const yearMatch = /(\d{4})/.exec(afterTag);
      if (yearMatch) result.publishYear = yearMatch[1];
      const issueMatch = /[(\（](\d+)[)\）]/.exec(afterTag);
      if (issueMatch) result.issue = issueMatch[1];
      const pageMatch = /[:\：]\s*(\d[\d\-—~]*)/.exec(afterTag);
      if (pageMatch) result.pages = pageMatch[1];
    }
  } else if (type === 'newspaper') {
    // 报纸：报纸名,日期(版次)
    const nameMatch = /^([^,，]+)/.exec(afterTag);
    if (nameMatch) result.newspaperName = nameMatch[1].trim();
    const dateMatch = /(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}日?)/.exec(afterTag);
    if (dateMatch) result.publishDate = dateMatch[1];
    const sectionMatch = /[(\（](\w+)[)\）]/.exec(afterTag);
    if (sectionMatch) result.pageSection = sectionMatch[1];
  } else if (type === 'thesis') {
    // 学位论文：地点:学校,年份
    const instMatch = /^([^,，:\：]+)[:\：]([^,，]+)/.exec(afterTag);
    if (instMatch) {
      result.publishPlace = instMatch[1].trim();
      result.institution = instMatch[2].trim();
    }
    const yearMatch = /(\d{4})/.exec(afterTag);
    if (yearMatch) result.publishYear = yearMatch[1];
  } else if (type === 'electronic') {
    const urlMatch = /(https?:\/\/[^\s,，。]+)/.exec(afterTag);
    if (urlMatch) result.url = urlMatch[1];
    const dateMatch = /\[(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\]/.exec(afterTag);
    if (dateMatch) result.accessDate = dateMatch[1];
    const yearMatch = /(\d{4})/.exec(afterTag);
    if (yearMatch) result.publishYear = yearMatch[1];
  } else {
    // 著作/书籍：出版地:出版社,年份:页码
    const bookMatch = /^([^:\：,，]+)[:\：]([^,，]+)[,，]\s*(\d{4})\s*[:\：]?\s*(\d[\d\-—~]*)?/.exec(afterTag);
    if (bookMatch) {
      result.publishPlace = bookMatch[1].trim();
      result.publisher = bookMatch[2].trim();
      result.publishYear = bookMatch[3];
      if (bookMatch[4]) result.pages = bookMatch[4];
    } else {
      const yearMatch = /(\d{4})/.exec(afterTag);
      if (yearMatch) result.publishYear = yearMatch[1];
      const pubMatch = /^([^:\：]+)[:\：]([^,，]+)/.exec(afterTag);
      if (pubMatch) {
        result.publishPlace = pubMatch[1].trim();
        result.publisher = pubMatch[2].trim();
      }
    }
  }

  return result;
}

function gbtTagToType(tag: string): CitationType {
  switch (tag.toUpperCase()) {
    case 'J': return 'journal';
    case 'M': return 'book';
    case 'D': return 'thesis';
    case 'N': return 'newspaper';
    case 'C': return 'conference';
    case 'EB/OL': return 'electronic';
    default: return 'book';
  }
}

function detectLanguage(text: string): CitationLanguage {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  return 'en';
}

function detectType(text: string, lang: CitationLanguage): CitationType {
  if (text.includes('转引自')) return 'transferred';
  if (/https?:\/\//.test(text)) return 'electronic';

  if (lang === 'zh') {
    if (/《[^》]+》.*?\d{4}年.*?第\d+期/.test(text)) return 'journal';
    if (/报.*?\d{4}年\d{1,2}月\d{1,2}日.*?第\d+版/.test(text)) return 'newspaper';
    if (/学位论文|硕士论文|博士论文/.test(text)) return 'thesis';
    if (/档案|卷宗|编号/.test(text)) return 'archive';
  } else {
    if (/\d{4}.*?Vol\.|No\.|pp\./i.test(text)) return 'journal';
    if (/dissertation|thesis/i.test(text)) return 'thesis';
    if (/archive/i.test(text)) return 'archive';
  }

  return 'book';
}

function parseChineseCitation(text: string, type: CitationType): Partial<Citation> {
  const result: Partial<Citation> = {};

  // 作者：第一个《之前，或第一个：之前
  const authorMatch = text.match(/^(.*?)[：《]/);
  if (authorMatch) {
    const authorStr = authorMatch[1].trim();
    result.authors = authorStr.split(/[、,，]/).filter(Boolean).map(name => ({ name: name.trim() }));
  }

  // 题名：《》内
  const titleMatch = text.match(/《([^》]+)》/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
    const secondTitleMatch = text.slice(text.indexOf('》') + 1).match(/《([^》]+)》/);
    if (secondTitleMatch) {
      if (type === 'journal') result.journalName = secondTitleMatch[1];
      else result.bookTitle = secondTitleMatch[1];
    }
  }

  const yearMatch = text.match(/(\d{4})年/);
  if (yearMatch) result.publishYear = yearMatch[1];

  const pageMatch = text.match(/第\s*(\d+[-—～~]?\d*)\s*页/);
  if (pageMatch) result.pages = pageMatch[1];

  const issueMatch = text.match(/第(\d+)期/);
  if (issueMatch) result.issue = issueMatch[1];

  const pubMatch = text.match(/([^\s：，。]+)：([^\s：，。]+)/);
  if (pubMatch && !text.startsWith(pubMatch[0])) {
    result.publishPlace = pubMatch[1];
    result.publisher = pubMatch[2];
  }

  return result;
}

function parseEnglishCitation(text: string, _type: CitationType): Partial<Citation> {
  const result: Partial<Citation> = {};

  const authorMatch = text.match(/^(.*?)[,.]/);
  if (authorMatch) {
    const authorStr = authorMatch[1].trim();
    result.authors = authorStr.split(/,|and/i).filter(Boolean).map(name => ({ name: name.trim() }));
  }

  const segments = text.split(/[,.]/);
  if (segments.length > 1) {
    result.title = segments[1].trim();
  }

  const yearMatch = text.match(/\((\d{4})\)|\b(\d{4})\b/);
  if (yearMatch) result.publishYear = yearMatch[1] || yearMatch[2];

  const pageMatch = text.match(/p+\.\s*(\d+[-—～~]?\d*)/i);
  if (pageMatch) result.pages = pageMatch[1];

  return result;
}

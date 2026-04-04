import { Citation, CitationType, CitationLanguage } from './types';

export function parseCitationText(text: string): Partial<Citation> {
  const normalizedText = text.trim();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // 豆瓣图书多行格式（优先检测，避免被 GB/T 误判）
  const douban = parseDoubanBook(normalizedText);
  if (douban) {
    return { id, rawText: normalizedText, language: 'zh', ...douban };
  }

  // GB/T 7714 格式
  const normalizedSingle = normalizedText.replace(/\s+/g, ' ');
  const gbt = parseGBT7714Style(normalizedSingle);
  if (gbt) {
    return { id, language: 'zh', rawText: normalizedSingle, ...gbt };
  }

  const language = detectLanguage(normalizedText);
  const singleLine = normalizedText.replace(/\s+/g, ' ');
  const type = detectType(singleLine, language);
  let result: Partial<Citation> = { id, language, type, rawText: singleLine };

  if (language === 'zh') {
    result = { ...result, ...parseChineseCitation(singleLine, type) };
  } else {
    result = { ...result, ...parseEnglishAPA(singleLine) };
  }

  return result;
}

// ─── 豆瓣图书多行格式 ──────────────────────────────────────────────
// 触发条件：含 "出版社:" 或 "出版年:" 或 "ISBN:" 关键词
function parseDoubanBook(text: string): Partial<Citation> | null {
  const hasPublisher = /出版社[:：]/.test(text);
  const hasYear = /出版年[:：]/.test(text);
  const hasISBN = /ISBN[:：]/.test(text);
  if (!hasPublisher && !(hasYear && hasISBN)) return null;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result: Partial<Citation> = { type: 'book' };

  // 提取结构化字段（key: value 行）
  const fields: Record<string, string> = {};
  const structuredIdx: Set<number> = new Set();
  lines.forEach((line, i) => {
    const m = /^(.{1,8})[:：](.+)$/.exec(line);
    if (m) {
      fields[m[1].trim()] = m[2].trim();
      structuredIdx.add(i);
    }
  });

  // 未被识别为结构化字段的前几行视为标题行
  const titleLines = lines.filter((_, i) => !structuredIdx.has(i)).slice(0, 2);

  // 提取作者（结构化字段优先）
  const authorField = fields['作者'] || fields['作  者'] || '';
  if (authorField) {
    // 去除括号内的国籍/朝代注释，如 (美) 或 [美]
    const cleanAuthor = authorField.replace(/^[\[(（【][^)\]）】]+[\]）】)]\s*/, '').trim();
    result.authors = cleanAuthor.split(/[,，、；;]/).map(n => ({ name: n.trim() })).filter(a => a.name);
  }

  // 从"作者"字段行（豆瓣有时写成 "卫所、军户与军役作者: 于志嘉"）提取
  if (!result.authors || result.authors.length === 0) {
    for (const [k, v] of Object.entries(fields)) {
      if (k.includes('作者')) {
        result.authors = [{ name: v.trim() }];
        break;
      }
    }
  }

  // 豆瓣特殊格式：某行同时含书名和"作者"（如 "书名作者: 于志嘉"）
  if (!result.authors || result.authors.length === 0) {
    const combinedAuthorLine = lines.find(l => /作者[:：]/.test(l));
    if (combinedAuthorLine) {
      const m = /作者[:：](.+)$/.exec(combinedAuthorLine);
      if (m) result.authors = [{ name: m[1].trim() }];
    }
  }

  // 标题：titleLines[0] 为主标题，[1] 为副标题，用——连接
  if (titleLines.length > 0) {
    let mainTitle = titleLines[0];
    // 若主标题行也含"作者:"，取冒号前的部分作为标题
    const authorInTitle = /作者[:：]/.exec(mainTitle);
    if (authorInTitle) {
      mainTitle = mainTitle.slice(0, authorInTitle.index).trim();
    }
    if (titleLines.length > 1 && titleLines[1] && !fields[titleLines[1]]) {
      result.title = `${mainTitle}——${titleLines[1]}`;
    } else {
      result.title = mainTitle;
    }
  }

  // 出版社
  result.publisher = fields['出版社'] || fields['出 版 社'] || '';

  // 出版年（取前4位数字）
  const yearRaw = fields['出版年'] || fields['出版年份'] || '';
  const yearM = /(\d{4})/.exec(yearRaw);
  if (yearM) result.publishYear = yearM[1];

  // 页数存入 notes 做提示
  if (fields['页数']) result.notes = `共${fields['页数']}页`;

  return result;
}

// ─── GB/T 7714 格式解析 ─────────────────────────────────────────────
function parseGBT7714Style(text: string): Partial<Citation> | null {
  const withSeq = /^[\[【]?\d+[\]】]?\s*(.+)$/.exec(text);
  const body = withSeq ? withSeq[1].trim() : text;

  const typeTagMatch = /\[(J|M|D|N|C|EB\/OL|G|R|A|Z|S|P)\]/i.exec(body);
  if (!typeTagMatch) return null;

  const typeTag = typeTagMatch[1].toUpperCase();
  const tagIndex = body.indexOf(typeTagMatch[0]);

  const beforeTag = body.slice(0, tagIndex);
  const afterTag = body.slice(tagIndex + typeTagMatch[0].length).replace(/^[.\s]+/, '');

  const dotIdx = beforeTag.lastIndexOf('.');
  let authorsStr = '';
  let title = '';
  if (dotIdx > 0) {
    authorsStr = beforeTag.slice(0, dotIdx).trim();
    title = beforeTag.slice(dotIdx + 1).trim();
  } else {
    title = beforeTag.trim();
  }

  authorsStr = authorsStr.replace(/^[\[【]?\d+[\]】]\s*/, '').trim();

  const authors = authorsStr
    ? authorsStr.split(/[,，、;；]+/).map(a => ({ name: a.trim() })).filter(a => a.name)
    : [];

  const type = gbtTagToType(typeTag);
  const result: Partial<Citation> = { type, title, authors };

  if (type === 'thesis') {
    // 学位论文：提取 thesisType
    const thesisTypeMatch = /博士|硕士|本科/.exec(afterTag + ' ' + title);
    if (thesisTypeMatch) {
      result.thesisType = thesisTypeMatch[0] + '学位论文';
    } else {
      result.thesisType = '学位论文';
    }
    // 地点:学校,年份
    const instMatch = /^([^,，:\：]+)[:\：]([^,，]+)/.exec(afterTag);
    if (instMatch) {
      result.publishPlace = instMatch[1].trim();
      result.institution = instMatch[2].trim();
    } else {
      // 无地点时直接取学校
      const schoolMatch = /^([^,，]+)/.exec(afterTag);
      if (schoolMatch) result.institution = schoolMatch[1].trim();
    }
    const yearMatch = /(\d{4})/.exec(afterTag);
    if (yearMatch) result.publishYear = yearMatch[1];
  } else if (type === 'conference') {
    // 会议论文：作者. 题名[C]//会议组织者. 论文集名. 会议地点:出版社, 年份:页码
    // afterTag 可能是 "//组织者. 论文集名. 地点:社, 年:页" 或 "论文集名. 地点, 年:页"
    const doubleSep = afterTag.replace(/^\/\//, '');

    // 论文集名（第一个 . 之前，若有组织者则跳过组织者行）
    const parts = doubleSep.split(/[.。]/).map(s => s.trim()).filter(Boolean);
    // parts[0] = 可能的组织者, parts[1] = 论文集名 或 parts[0]=论文集名
    if (parts.length >= 2) {
      result.bookTitle = parts[1] || parts[0];
    } else {
      result.bookTitle = parts[0] || '';
    }

    // 地点
    const placeMatch = /([^,.，。]+)[,，]\s*\d{4}/.exec(doubleSep);
    if (placeMatch) result.publishPlace = placeMatch[1].trim();

    const yearMatch = /(\d{4})/.exec(afterTag);
    if (yearMatch) result.publishYear = yearMatch[1];

    const pageMatch = /[:\：]\s*(\d[\d\-—~]*)/.exec(afterTag);
    if (pageMatch) result.pages = pageMatch[1];
  } else if (type === 'journal') {
    const journalMatch = /^([^,，]+)[,，]\s*(\d{4})[,，]?\s*(?:第?(\d+)卷)?[,，]?\s*[(\（]?(?:第?(\d+)[期号]?)[)\）]?\s*[:\：]\s*(\d[\d\-—~]*)/.exec(afterTag);
    if (journalMatch) {
      result.journalName = journalMatch[1].replace(/^[.\s]+/, '').trim();
      result.publishYear = journalMatch[2];
      if (journalMatch[3]) result.volumeNumber = journalMatch[3];
      if (journalMatch[4]) result.issue = journalMatch[4];
      if (journalMatch[5]) result.pages = journalMatch[5];
    } else {
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
    const nameMatch = /^([^,，]+)/.exec(afterTag);
    if (nameMatch) result.newspaperName = nameMatch[1].trim();
    const dateMatch = /(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}日?)/.exec(afterTag);
    if (dateMatch) result.publishDate = dateMatch[1];
    const sectionMatch = /[(\（](\w+)[)\）]/.exec(afterTag);
    if (sectionMatch) result.pageSection = sectionMatch[1];
  } else if (type === 'electronic') {
    const urlMatch = /(https?:\/\/[^\s,，。]+)/.exec(afterTag);
    if (urlMatch) result.url = urlMatch[1];
    const dateMatch = /\[(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\]/.exec(afterTag);
    if (dateMatch) result.accessDate = dateMatch[1];
    const yearMatch = /(\d{4})/.exec(afterTag);
    if (yearMatch) result.publishYear = yearMatch[1];
  } else {
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

// ─── 语言/类型检测 ────────────────────────────────────────────────
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
    if (/会议|论文集/.test(text)) return 'conference';
    if (/档案|卷宗|编号/.test(text)) return 'archive';
  } else {
    // APA/英文期刊特征
    if (/\(\d{4}\)\.\s/.test(text) || /jstor\.org/.test(text)) return 'journal';
    if (/Vol\.|No\.|pp\./i.test(text)) return 'journal';
    if (/dissertation|thesis/i.test(text)) return 'thesis';
    if (/archive/i.test(text)) return 'archive';
  }

  return 'book';
}

// ─── 中文解析 ────────────────────────────────────────────────────
function parseChineseCitation(text: string, type: CitationType): Partial<Citation> {
  const result: Partial<Citation> = {};

  const authorMatch = text.match(/^(.*?)[：《]/);
  if (authorMatch) {
    const authorStr = authorMatch[1].trim();
    result.authors = authorStr.split(/[、,，]/).filter(Boolean).map(name => ({ name: name.trim() }));
  }

  const titleMatch = text.match(/《([^》]+)》/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
    const secondTitleMatch = text.slice(text.indexOf('》') + 1).match(/《([^》]+)》/);
    if (secondTitleMatch) {
      if (type === 'journal') result.journalName = secondTitleMatch[1];
      else result.bookTitle = secondTitleMatch[1];
    }
  }

  // 学位论文特殊解析
  if (type === 'thesis') {
    const thesisTypeMatch = /博士|硕士|本科/.exec(text);
    if (thesisTypeMatch) {
      result.thesisType = thesisTypeMatch[0] + '学位论文';
    } else {
      result.thesisType = '学位论文';
    }
    // 学校：逗号分隔段中包含"大学"、"学院"、"研究所"
    const instMatch = /[,，]([^,，]+(?:大学|学院|研究所|研究院)[^,，]*)/.exec(text);
    if (instMatch) result.institution = instMatch[1].trim();
  }

  // 会议论文：分离论文集名和会议地点
  if (type === 'conference') {
    // 格式：作者：题名，《论文集名》，会议地点，年份。
    // journalName 存论文集名已由上面 secondTitleMatch 处理
    // 地点在《》后、年份前
    const afterTitle = text.slice((text.lastIndexOf('》') + 1) || 0);
    const placeMatch = /[,，]([^,，]+?(?:省|市|县|所|馆|校))[,，]/.exec(afterTitle);
    if (placeMatch) result.publishPlace = placeMatch[1].trim();
  }

  const yearMatch = text.match(/(\d{4})年/);
  if (yearMatch) result.publishYear = yearMatch[1];

  const pageMatch = text.match(/第\s*(\d+[-—～~]?\d*)\s*页/);
  if (pageMatch) result.pages = pageMatch[1];

  const issueMatch = text.match(/第(\d+)期/);
  if (issueMatch) result.issue = issueMatch[1];

  const pubMatch = text.match(/([^\s：，。]+)：([^\s：，。]+)/);
  if (pubMatch && !text.startsWith(pubMatch[0])) {
    result.publishPlace = result.publishPlace || pubMatch[1];
    result.publisher = pubMatch[2];
  }

  return result;
}

// ─── 英文/APA 解析 ────────────────────────────────────────────────
// 支持 APA 格式：Author, A. A., Author, B. B., & Author, C. C. (Year). Title. Journal, Vol(Issue), pages.
export function parseEnglishAPA(text: string): Partial<Citation> {
  const result: Partial<Citation> = {};

  // 尝试 APA 格式：(Year). 或 (Year, Month). 区分作者和年份
  const apaYearMatch = /\((\d{4})[^)]*\)\./.exec(text);
  if (apaYearMatch) {
    result.publishYear = apaYearMatch[1];
    const yearPos = apaYearMatch.index;

    // 作者：年份括号之前
    const authorsPart = text.slice(0, yearPos).trim().replace(/,\s*$/, '');
    result.authors = parseAPAAuthors(authorsPart);

    // 年份之后的内容
    const afterYear = text.slice(yearPos + apaYearMatch[0].length).trim();
    // 第一个句子是标题（到第一个 . 为止，但要跳过缩写）
    const titleMatch = /^([^.]+(?:\.[^.A-Z][^.]*)?)\.\s*(.*)$/.exec(afterYear);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
      const rest = titleMatch[2].trim();
      // 解析期刊信息：Journal, Volume(Issue), pages.
      // 或 Journal, Volume(Issue), startPage-endPage.
      const journalMatch = /^([^,]+),\s*(\d+)(?:\((\d+)\))?,?\s*([\d\-–]+)?/.exec(rest);
      if (journalMatch) {
        result.journalName = journalMatch[1].trim();
        result.volumeNumber = journalMatch[2];
        if (journalMatch[3]) result.issue = journalMatch[3];
        if (journalMatch[4]) result.pages = journalMatch[4];
        result.type = 'journal';
      }
    }
  } else {
    // 非标准APA，降级处理
    const authorMatch = text.match(/^(.*?)[,.]/);
    if (authorMatch) {
      const authorStr = authorMatch[1].trim();
      result.authors = authorStr.split(/,\s*(?:and|&)\s*|,\s+(?=[A-Z])/).filter(Boolean).map(name => ({ name: name.trim() }));
    }

    const segments = text.split(/[,.]/);
    if (segments.length > 1) {
      result.title = segments[1].trim();
    }

    const yearMatch = text.match(/\((\d{4})\)|\b(\d{4})\b/);
    if (yearMatch) result.publishYear = yearMatch[1] || yearMatch[2];

    const pageMatch = text.match(/p+\.\s*(\d+[-—～~]?\d*)/i);
    if (pageMatch) result.pages = pageMatch[1];

    const volMatch = /Vol\.\s*(\d+)/i.exec(text);
    if (volMatch) result.volumeNumber = volMatch[1];
    const noMatch = /No\.\s*(\d+)/i.exec(text);
    if (noMatch) result.issue = noMatch[1];
  }

  return result;
}

// 解析 APA 多作者格式：Wang, R., Eisenack, K., & Tan, R.
function parseAPAAuthors(authorsPart: string): { name: string }[] {
  if (!authorsPart.trim()) return [];
  // 分割 & 和 ,
  const normalized = authorsPart.replace(/\s*&\s*/g, ', ');
  // APA 格式 "Last, F. M." 以逗号+空格+单字母区分姓与名
  // 将 "Last, F. M., Next, G." 正确切分
  const authors: string[] = [];
  // 匹配 "Last, Initials" 模式
  const pattern = /([A-Z][a-z\-']+(?:\s[A-Z][a-z\-']+)*),\s([A-Z]\.(?:\s?[A-Z]\.)*)/g;
  let m;
  while ((m = pattern.exec(normalized)) !== null) {
    authors.push(`${m[1]}, ${m[2].trim()}`);
  }
  if (authors.length > 0) return authors.map(n => ({ name: n }));
  // 降级：简单按 & 和连续大写字母开头段切分
  return normalized.split(/,\s+(?=[A-Z])/).map(s => ({ name: s.trim() })).filter(a => a.name);
}

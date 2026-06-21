import { Citation, CitationType, CitationLanguage } from './types';
import { detectLanguage, generateId } from './utils';
import { lookupPlace } from './publisher-places';

function fillPublishPlace(c: Partial<Citation>): Partial<Citation> {
  if (c.type === 'book' && !c.publishPlace && c.publisher) {
    const place = lookupPlace(c.publisher);
    if (place) return { ...c, publishPlace: place };
  }
  return c;
}

export function parseCitationText(text: string): Partial<Citation> {
  const normalizedText = text.trim();
  const id = generateId();

  // 豆瓣图书多行格式（优先检测，避免被 GB/T 误判）
  const douban = parseDoubanBook(normalizedText);
  if (douban) {
    return fillPublishPlace({ id, rawText: normalizedText, language: 'zh', ...douban });
  }

  // GB/T 7714 格式
  const normalizedSingle = normalizedText.replace(/\s+/g, ' ');
  const gbt = parseGBT7714Style(normalizedSingle);
  if (gbt) {
    return fillPublishPlace({ id, language: 'zh', rawText: normalizedSingle, ...gbt });
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

  return fillPublishPlace(result);
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
  // 需要在标题解析前处理，提取作者并标记该行
  if (!result.authors || result.authors.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/作者[:：]/.test(line) && !structuredIdx.has(i)) {
        const m = /作者[:：](.+)$/.exec(line);
        if (m) {
          result.authors = [{ name: m[1].trim() }];
          break;
        }
      }
    }
  }

  // 译者
  const translatorField = fields['译者'] || '';
  if (translatorField) {
    result.translators = translatorField.split(/[,，、；;]/).map(n => ({ name: n.trim() })).filter(a => a.name);
  }

  // 标题：titleLines[0] 为主标题，[1] 为副标题，用——连接
  // 过滤掉含"作者:"的行（已处理为作者字段）
  const filteredTitleLines = titleLines.filter(line => {
    // 如果这行是"书名作者: xxx"格式，只取书名部分
    if (/作者[:：]/.test(line)) return false;
    return true;
  });

  if (filteredTitleLines.length > 0) {
    let mainTitle = filteredTitleLines[0];
    // 若主标题行也含"作者:"，取冒号前的部分作为标题
    const authorInTitle = /作者[:：]/.exec(mainTitle);
    if (authorInTitle) {
      mainTitle = mainTitle.slice(0, authorInTitle.index).trim();
    }
    if (filteredTitleLines.length > 1 && filteredTitleLines[1] && !fields[filteredTitleLines[1]]) {
      result.title = `${mainTitle}——${filteredTitleLines[1]}`;
    } else {
      result.title = mainTitle;
    }
  } else if (titleLines.length > 0) {
    // 降级：从含"作者:"的行中提取书名
    const lineWithAuthor = titleLines.find(l => /作者[:：]/.test(l));
    if (lineWithAuthor) {
      const m = /^(.+?)作者[:：]/.exec(lineWithAuthor);
      if (m) result.title = m[1].trim();
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
    // 会议论文：作者.题名[C]//组织者.论文集名.出版地:出版社,年份:页码
    // 或：作者.题名[C]//组织者.论文集名.出版社,年份:页码（无出版地）
    // 或：作者.题名[C]//论文集名.出版社,年份:页码（无组织者）
    const doubleSep = afterTag.replace(/^\/\//, '').trim();

    // 用句号分段（注意末尾可能没有句号）
    const parts = doubleSep.split(/[.。]/).map(s => s.trim()).filter(Boolean);
    // parts[0] = 组织者（可能含逗号分隔的多个机构）或论文集名
    // parts[1] = 论文集名 或 "出版地:出版社,年份:页码"
    // parts[2] = "出版地:出版社,年份:页码" 或 "出版社,年份:页码"

    // 判断 parts[0] 是否为组织者：如果 parts.length >= 3，则 parts[0]=组织者, parts[1]=论文集名, parts[2]=出版信息
    // 如果 parts.length == 2，则 parts[0]=论文集名, parts[1]=出版信息（无组织者）
    // 如果 parts.length == 1，则 parts[0]=论文集名（无出版信息）
    let orgPart = ''
    let titlePart = ''
    let pubPart = ''
    if (parts.length >= 3) {
      orgPart = parts[0]
      titlePart = parts[1]
      pubPart = parts.slice(2).join('. ')
    } else if (parts.length === 2) {
      titlePart = parts[0]
      pubPart = parts[1]
    } else {
      titlePart = parts[0] || ''
    }

    result.bookTitle = titlePart

    // 提取会议组织者（顿号分隔的多个机构）→ 存入 bookAuthors
    if (orgPart) {
      result.bookAuthors = orgPart.split(/[,，]/).map(s => s.trim()).filter(Boolean).map(name => ({ name }))
    }

    // 从 pubPart 提取出版地、出版社、年份、页码
    // 格式1：天津：天津古籍出版社,2005:12-23
    // 格式2：天津古籍出版社,2005:12-23（无出版地）
    // 格式3：[出版者不详],2012:101-114（无出版地无出版社）
    const pubPlaceMatch = /^([^:，,]+)[:：]([^,，]+)/.exec(pubPart)
    if (pubPlaceMatch) {
      result.publishPlace = pubPlaceMatch[1].trim()
      result.publisher = pubPlaceMatch[2].trim()
    } else {
      // 无出版地，只有出版社
      const pubOnlyMatch = /^([^,，]+)/.exec(pubPart)
      if (pubOnlyMatch) {
        const pubName = pubOnlyMatch[1].trim()
        // 检测 [出版者不详] 等标记
        if (/出版者不详|出版地不详|\[.*不详.*\]/.test(pubName)) {
          result.publisher = ''
          result.notes = '出版者不详，请手动填写'
        } else {
          result.publisher = pubName
        }
      }
    }

    const yearMatch = /(\d{4})/.exec(pubPart)
    if (yearMatch) result.publishYear = yearMatch[1]

    const pageMatch = /[:：]\s*(\d[\d\-—~]*)/.exec(pubPart)
    if (pageMatch) result.pages = pageMatch[1]
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

  // 提取 DOI（支持 https://doi.org/xxx、https:/doi.org/xxx 或 doi:xxx）
  const doiMatch = /https?:\/?\/?doi\.org\/([^\s]+)|doi:\s*([^\s]+)/i.exec(text);
  if (doiMatch) {
    const doi = doiMatch[1] || doiMatch[2];
    if (doi) {
      result.url = `https://doi.org/${doi}`;
    }
  }

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
    
    // 移除末尾的 DOI/URL 以便更好解析
    const withoutDOI = afterYear.replace(/\s*(?:https?:\/\/|https?:\/)[^\s]+|\s*doi\.org\/[^\s]+|doi:[^\s]+/gi, '').trim();
    
    // 标题：第一个句子（到第一个 . 为止，但需要正确处理期刊名中的缩写）
    // APA 标题通常只有一个句号，后面是期刊信息
    // 匹配模式：Title. Journal, Vol(Issue), pages.
    const titleMatch = /^([^.]+(?:\.[A-Z][a-z]*)?)\.\s+(.+)$/.exec(withoutDOI);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
      const rest = titleMatch[2].trim();
      
      // 解析期刊信息：Journal, Volume(Issue), pages.
      // 或 Journal, Volume(Issue), startPage-endPage.
      // 支持全角逗号
      const journalMatch = /^([^,，]+)[,，]\s*(\d+)(?:\((\d+)\))?,?\s*([-\d–—~]+)?/.exec(rest);
      if (journalMatch) {
        result.journalName = journalMatch[1].trim();
        result.volumeNumber = journalMatch[2];
        if (journalMatch[3]) result.issue = journalMatch[3];
        if (journalMatch[4]) result.pages = journalMatch[4];
        result.type = 'journal';
      } else {
        // 降级：仅提取期刊名
        const simpleJournalMatch = /^([^,，.]+)/.exec(rest);
        if (simpleJournalMatch) {
          result.journalName = simpleJournalMatch[1].trim();
          result.type = 'journal';
        }
      }
    } else {
      // 没有匹配到标题，整个 afterYear 可能是标题
      result.title = withoutDOI.trim();
    }
  } else {
    // 非标准 APA，降级处理
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

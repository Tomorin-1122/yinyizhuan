import { Citation, CitationType, Author } from './types';
import { detectLanguage, generateId } from './utils';

export function parseBibTeX(content: string): Partial<Citation>[] {
  const citations: Partial<Citation>[] = [];
  const entryRegex = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)\n\s*\}/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const bibType = match[1].toLowerCase();
    const key = match[2].trim();
    const fieldsText = match[3];
    
    const fields = parseBibFields(fieldsText);

    const type = mapBibType(bibType);
    const authors = parseBibAuthors(fields.author || '');
    const title = fields.title || '';
    const language = detectLanguage(title + (fields.author || ''));

    const citation: Partial<Citation> = {
      id: generateId() + '_' + key,
      type,
      language,
      authors,
      title,
      publisher: fields.publisher,
      publishPlace: fields.address,
      publishYear: fields.year,
      pages: fields.pages,
      journalName: fields.journal,
      bookTitle: fields.booktitle,
      volumeNumber: fields.volume,
      issue: fields.number,
      url: fields.url || fields.doi ? `https://doi.org/${fields.doi}` : undefined,
      notes: fields.note,
      rawText: match[0]
    };

    citations.push(citation);
  }

  return citations;
}

function mapBibType(bibType: string): CitationType {
  switch (bibType) {
    case 'article': return 'journal';
    case 'book': return 'book';
    case 'inproceedings':
    case 'proceedings': return 'conference';
    case 'phdthesis':
    case 'mastersthesis': return 'thesis';
    case 'incollection':
    case 'inbook': return 'chapter';
    case 'misc': return 'electronic';
    default: return 'book';
  }
}

function parseBibAuthors(authorStr: string): Author[] {
  if (!authorStr) return [];
  // BibTeX uses 'and' to separate authors
  return authorStr.split(/\s+and\s+/i).map(name => {
    // BibTeX often uses "Last, First"
    if (name.includes(',')) {
      const parts = name.split(',');
      return { name: `${parts[1].trim()} ${parts[0].trim()}` };
    }
    return { name: name.trim() };
  });
}

/**
 * 状态机解析 BibTeX 字段，支持嵌套花括号
 * 例：title = {A {Deeply} Nested {Example}} → 完整保留
 */
function parseBibFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  let i = 0
  while (i < text.length) {
    // 跳过空白和逗号
    while (i < text.length && /[\s,]/.test(text[i])) i++
    if (i >= text.length) break
    // 读字段名
    let name = ''
    while (i < text.length && /[a-zA-Z]/.test(text[i])) name += text[i++]
    if (!name) { i++; continue }
    // 跳过 = 和空白
    while (i < text.length && /[\s=]/.test(text[i])) i++
    // 读值（支持 { } 嵌套 和 " "）
    let value = ''
    const quote = text[i]
    if (quote === '{') {
      let depth = 1; i++
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') depth--
        if (depth > 0) value += text[i]
        i++
      }
    } else if (quote === '"') {
      i++
      while (i < text.length && text[i] !== '"') value += text[i++]
      i++
    } else {
      while (i < text.length && !/[\s,}]/.test(text[i])) value += text[i++]
    }
    if (name) fields[name.toLowerCase()] = value.trim().replace(/\s+/g, ' ')
  }
  return fields
}

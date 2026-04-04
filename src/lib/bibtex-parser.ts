import { Citation, CitationType, Author, CitationLanguage } from './types';

export function parseBibTeX(content: string): Partial<Citation>[] {
  const citations: Partial<Citation>[] = [];
  const entryRegex = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)\n\s*\}/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const bibType = match[1].toLowerCase();
    const key = match[2].trim();
    const fieldsText = match[3];
    
    const fields: Record<string, string> = {};
    const fieldRegex = /([a-zA-Z]+)\s*=\s*[\{"]?([\s\S]*?)[\}"]?[\s\n]*,/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(fieldsText + ',')) !== null) {
      fields[fieldMatch[1].toLowerCase()] = fieldMatch[2].trim().replace(/\s+/g, ' ');
    }

    const type = mapBibType(bibType);
    const authors = parseBibAuthors(fields.author || '');
    const title = fields.title || '';
    const language = detectLanguage(title + (fields.author || ''));

    const citation: Partial<Citation> = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '_' + key,
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

function detectLanguage(text: string): CitationLanguage {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  return 'en';
}

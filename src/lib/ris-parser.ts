import { Citation, CitationType, Author, CitationLanguage } from './types';

export function parseRIS(content: string): Partial<Citation>[] {
  const citations: Partial<Citation>[] = [];
  const entries = content.split(/ER\s+-\s+/);
  
  for (const entry of entries) {
    if (!entry.trim()) continue;
    
    const fields: Record<string, string[]> = {};
    const lines = entry.split(/\r?\n/);
    
    for (const line of lines) {
      const match = line.match(/^([A-Z0-9]{2})\s+-\s+(.*)$/);
      if (match) {
        const tag = match[1];
        const value = match[2].trim();
        if (!fields[tag]) fields[tag] = [];
        fields[tag].push(value);
      }
    }
    
    if (Object.keys(fields).length === 0) continue;

    const ty = fields['TY']?.[0] || 'GEN';
    const type = mapRISType(ty);
    const authors: Author[] = (fields['AU'] || []).map(name => ({ name }));
    const title = fields['TI']?.[0] || fields['T1']?.[0] || '';
    const language = detectLanguage(title + (fields['AU']?.[0] || ''));

    const citation: Partial<Citation> = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type,
      language,
      authors,
      title,
      publisher: fields['PB']?.[0],
      publishPlace: fields['CY']?.[0],
      publishYear: fields['PY']?.[0]?.slice(0, 4),
      pages: fields['SP'] && fields['EP'] ? `${fields['SP'][0]}-${fields['EP'][0]}` : fields['SP']?.[0],
      journalName: fields['JO']?.[0] || fields['T2']?.[0],
      bookTitle: fields['T2']?.[0],
      volumeNumber: fields['VL']?.[0],
      issue: fields['IS']?.[0],
      url: fields['UR']?.[0],
      notes: fields['N1']?.[0],
      rawText: entry + 'ER - '
    };

    citations.push(citation);
  }

  return citations;
}

function mapRISType(ty: string): CitationType {
  switch (ty) {
    case 'JOUR': return 'journal';
    case 'BOOK': return 'book';
    case 'CHAP': return 'chapter';
    case 'CONF': return 'conference';
    case 'THES': return 'thesis';
    case 'NEWS': return 'newspaper';
    case 'ELEC': return 'electronic';
    case 'ANCIENT': return 'ancient';
    case 'ARCHIVE': return 'archive';
    case 'DIARY': return 'diary';
    default: return 'book';
  }
}

function detectLanguage(text: string): CitationLanguage {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  return 'en';
}

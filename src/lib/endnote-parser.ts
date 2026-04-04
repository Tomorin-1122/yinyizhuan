import { Citation, CitationType, Author, CitationLanguage } from './types';

export function parseEndNoteXML(xmlString: string): Partial<Citation>[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const records = xmlDoc.getElementsByTagName('record');
    return Array.from(records).map(parseRecord);
}

function parseRecord(record: Element): Partial<Citation> {
    const citation: Partial<Citation> = {};
    citation.type = mapEndNoteType(record.getElementsByTagName('recordType')[0]?.textContent);
    citation.language = detectLanguage(record);
    citation.authors = getTextContent(record.getElementsByTagName('author'));
    return citation;
}

function getTextContent(elements: NodeListOf<Element>): string[] {
    return Array.from(elements).map(el => el.textContent || '').filter(Boolean);
}

function mapEndNoteType(type: string | null): CitationType | undefined {
    const typeMapping: Record<string, CitationType> = {
        'Journal Article': 'journal',
        'Book': 'book'
        // Add mapping for other types as needed
    };
    return type ? typeMapping[type] : undefined;
}

function detectLanguage(record: Element): CitationLanguage | undefined {
    const lang = record.getElementsByTagName('language')[0]?.textContent;
    return lang ? (lang as CitationLanguage) : undefined;
}
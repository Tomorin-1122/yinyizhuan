import { DOMParser } from 'xmldom';
import { Citation, EndNoteType } from './types';

function parseRecord(record: Element): Partial<Citation> {
    const citation: Partial<Citation> = {};
    citation.title = getTextContent(record, 'title');
    citation.authors = getTextContent(record, 'authors')?.split('; ');
    citation.journal = getTextContent(record, 'journal');
    citation.year = getTextContent(record, 'year');
    citation.volume = getTextContent(record, 'volume');
    citation.issue = getTextContent(record, 'issue');
    citation.pages = getTextContent(record, 'pages');
    citation.type = mapEndNoteType(getTextContent(record, 'type'));
    citation.language = detectLanguage(citation);
    return citation;
}

function getTextContent(element: Element, tagName: string): string | null {
    const child = element.getElementsByTagName(tagName)[0];
    return child ? child.textContent : null;
}

function mapEndNoteType(type: string | null): EndNoteType | null {
    const typeMapping: { [key: string]: EndNoteType } = {
        'Journal Article': EndNoteType.JournalArticle,
        'Book': EndNoteType.Book,
        // additional mappings...
    };
    return type ? typeMapping[type] || null : null;
}

function detectLanguage(citation: Partial<Citation>): string | null {
    // Implement language detection logic here
    return null;
}

export function parseEndNoteXML(xml: string): Partial<Citation>[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const records = Array.from(doc.getElementsByTagName('record'));
    return records.map(record => parseRecord(record as Element));
}
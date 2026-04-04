import { DOMParser } from 'xmldom';
import { Citation, CitationType, Author, CitationLanguage } from './types';

export function parseEndNoteXML(xmlString: string): Partial<Citation>[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const records = xmlDoc.getElementsByTagName('record');
    return Array.from(records).map(parseRecord);
}

function parseRecord(record: Element): Partial<Citation> {
    const citation: Partial<Citation> = {};
    
    // 使用统一的 getTextContent 函数
    citation.title = getTextContent(record, 'title');
    citation.journal = getTextContent(record, 'journal');
    citation.year = getTextContent(record, 'year');
    citation.volume = getTextContent(record, 'volume');
    citation.issue = getTextContent(record, 'issue');
    citation.pages = getTextContent(record, 'pages');
    
    // 处理作者 - 选择一种方式
    const authorsText = getTextContent(record, 'authors');
    citation.authors = authorsText ? authorsText.split('; ') : [];
    
    // 或者使用单独的 author 标签
    // citation.authors = Array.from(record.getElementsByTagName('author'))
    //     .map(el => el.textContent || '')
    //     .filter(Boolean);
    
    citation.type = mapEndNoteType(getTextContent(record, 'type') || 
                                  record.getElementsByTagName('recordType')[0]?.textContent);
    citation.language = detectLanguage(record);
    
    return citation;
}

function getTextContent(element: Element, tagName: string): string | null {
    const child = element.getElementsByTagName(tagName)[0];
    return child ? child.textContent : null;
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

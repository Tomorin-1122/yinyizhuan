function parseEndNoteXML(xmlString: string): Partial<Citation>[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const citations: Partial<Citation>[] = [];
    const records = xmlDoc.getElementsByTagName('record');

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const citation: Partial<Citation> = {};
        citation.title = record.getElementsByTagName('title')[0]?.textContent || '';
        citation.authors = Array.from(record.getElementsByTagName('author')).map(a => a.textContent) || [];
        citation.journal = record.getElementsByTagName('journal')[0]?.textContent || '';
        citation.publisher = record.getElementsByTagName('publisher')[0]?.textContent || '';
        citation.publicationYear = record.getElementsByTagName('year')[0]?.textContent || '';
        citation.volume = record.getElementsByTagName('volume')[0]?.textContent || '';
        citation.issue = record.getElementsByTagName('issue')[0]?.textContent || '';
        citation.pages = record.getElementsByTagName('pages')[0]?.textContent || '';
        citation.url = record.getElementsByTagName('url')[0]?.textContent || '';
        citation.doi = record.getElementsByTagName('doi')[0]?.textContent || '';
        citation.notes = record.getElementsByTagName('notes')[0]?.textContent || '';
        citations.push(citation);
    }
    return citations;
}

interface Citation {
    title?: string;
    authors?: string[];
    journal?: string;
    publisher?: string;
    publicationYear?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    url?: string;
    doi?: string;
    notes?: string;
}
function parseEndNoteXML(xmlString: string): EndNoteCitation[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Error parsing XML');
    }

    const citations: EndNoteCitation[] = [];
    const recordNodes = xmlDoc.getElementsByTagName('record');

    for (let i = 0; i < recordNodes.length; i++) {
        const record = recordNodes[i];
        const citation: EndNoteCitation = {} as EndNoteCitation;

        citation.title = getTextContent(record, 'title');
        citation.authors = getAuthors(record);
        citation.journal = getTextContent(record, 'source');
        citation.publisher = getTextContent(record, 'publisher');
        citation.publicationYear = getTextContent(record, 'year');
        citation.volume = getTextContent(record, 'volume');
        citation.issue = getTextContent(record, 'issue');
        citation.pages = getTextContent(record, 'pages');
        citation.url = getTextContent(record, 'url');
        citation.doi = getTextContent(record, 'doi');
        citation.notes = getTextContent(record, 'notes');

        citations.push(citation);
    }

    return citations;
}

function getTextContent(record: Element, tagName: string): string | undefined {
    const element = record.getElementsByTagName(tagName)[0];
    return element ? element.textContent : undefined;
}

function getAuthors(record: Element): string[] {
    const authors: string[] = [];
    const authorNodes = record.getElementsByTagName('author');
    for (let i = 0; i < authorNodes.length; i++) {
        authors.push(authorNodes[i].textContent || '');
    }
    return authors;
}

interface EndNoteCitation {
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
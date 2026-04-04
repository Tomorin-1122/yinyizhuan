// Updated implementation for parsing EndNote XML records using DOMParser

interface Citation {
    title: string;
    authors: string[];
    year: number;
}

function parseEndNoteXML(xmlString: string): Citation[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const citations: Citation[] = [];

    const records = xmlDoc.getElementsByTagName('record');
    for (let i = 0; i < records.length; i++) {
        const title = records[i].getElementsByTagName('title')[0]?.textContent || '';
        const authorsNode = records[i].getElementsByTagName('author');
        const authors: string[] = [];
        for (let j = 0; j < authorsNode.length; j++) {
            authors.push(authorsNode[j].textContent || '');
        }
        const year = parseInt(records[i].getElementsByTagName('year')[0]?.textContent || '0');
        citations.push({ title, authors, year });
    }

    return citations;
}

// Example usage: 
// const xmlString = '<records>...</records>';
// const citations = parseEndNoteXML(xmlString);
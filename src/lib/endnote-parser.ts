// Complete EndNote XML parser implementation using DOMParser

class EndNoteParser {
    constructor() {}

    parse(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        const citations = xmlDoc.getElementsByTagName('reference');
        const results = [];

        for (let i = 0; i < citations.length; i++) {
            const citation = citations[i];
            const entry = this.parseCitation(citation);
            results.push(entry);
        }

        return results;
    }

    parseCitation(citation) {
        const entry = {};
        const fields = citation.children;

        for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            entry[field.tagName] = field.textContent;
        }

        return entry;
    }
}

// Example usage:
const parser = new EndNoteParser();
const xml = `...`  // provide your EndNote XML string here
const result = parser.parse(xml);
console.log(result);
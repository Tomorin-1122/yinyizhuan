const { parseCitationText } = require('../lib/parser');
const { formatCitation } = require('../lib/formatters');

const VALID_FORMATS = ['lsyj', 'gbt7714', 'apa'];

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

module.exports = async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    const { text, format = 'lsyj' } = request.body;

    if (!text || typeof text !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Text field is required and must be a string'
      });
    }

    if (!VALID_FORMATS.includes(format)) {
      return response.status(400).json({
        success: false,
        error: 'Invalid format',
        message: `Format must be one of: ${VALID_FORMATS.join(', ')}`
      });
    }

    const citation = parseCitationText(text);
    const result = formatCitation(citation, format);

    return response.status(200).json({
      success: true,
      data: {
        original: text,
        format: format,
        result: result,
        citation: {
          id: citation.id,
          type: citation.type,
          language: citation.language,
          title: citation.title,
          authors: citation.authors,
          publisher: citation.publisher,
          publishYear: citation.publishYear,
          journalName: citation.journalName,
          pages: citation.pages
        },
        metadata: {
          language: citation.language,
          type: citation.type,
          authorCount: citation.authors?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to convert citation'
    });
  }
};

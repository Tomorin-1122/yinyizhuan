const { parseCitationText } = require('../lib/parser');

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
    const { text } = request.body;

    if (!text || typeof text !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Text field is required and must be a string'
      });
    }

    const citation = parseCitationText(text);

    return response.status(200).json({
      success: true,
      data: {
        original: text,
        citation: {
          id: citation.id,
          type: citation.type,
          language: citation.language,
          title: citation.title,
          authors: citation.authors,
          publisher: citation.publisher,
          publishPlace: citation.publishPlace,
          publishYear: citation.publishYear,
          pages: citation.pages,
          journalName: citation.journalName,
          rawText: citation.rawText
        },
        metadata: {
          language: citation.language,
          type: citation.type,
          authorCount: citation.authors?.length || 0,
          hasPublisher: !!citation.publisher,
          hasJournal: !!citation.journalName,
          hasYear: !!citation.publishYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Parse error:', error);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to parse citation'
    });
  }
};

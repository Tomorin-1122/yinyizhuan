const { parseCitationText } = require('../lib/parser');
const { formatCitation } = require('../lib/formatters');
const { rateLimitMiddleware } = require('../lib/rate-limit');
const { setCorsPost, handleOptions } = require('../lib/cors');

const VALID_FORMATS = ['lsyj', 'gbt7714', 'apa'];
const MAX_TEXT_LENGTH = 5000;
const checkLimit = rateLimitMiddleware({ max: 60, windowMs: 60_000 });

module.exports = async function handler(request, response) {
  const origin = request.headers['origin'] || '';
  setCorsPost(response, origin);
  if (handleOptions(request, response)) return;

  if (!checkLimit(request, response)) return;

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

    if (text.length > MAX_TEXT_LENGTH) {
      return response.status(400).json({
        success: false,
        error: 'Input too long',
        message: `Text must be ${MAX_TEXT_LENGTH} characters or less`
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

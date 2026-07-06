const { parseCitationText } = require('../lib/parser');
const { checkApiKey } = require('../lib/auth');
const { rateLimitMiddleware } = require('../lib/rate-limit');
const { setCorsPost, handleOptions } = require('../lib/cors');

const MAX_TEXT_LENGTH = 5000;
const checkLimit = rateLimitMiddleware({ max: 60, windowMs: 60_000 });

module.exports = async function handler(request, response) {
  const origin = request.headers['origin'] || '';
  setCorsPost(response, origin);
  if (handleOptions(request, response)) return;

  if (!checkApiKey(request, response)) return;
  if (!checkLimit(request, response)) return;

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

    if (text.length > MAX_TEXT_LENGTH) {
      return response.status(400).json({
        success: false,
        error: 'Input too long',
        message: `Text must be ${MAX_TEXT_LENGTH} characters or less`
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

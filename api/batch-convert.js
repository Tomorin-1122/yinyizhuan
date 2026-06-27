const { parseCitationText } = require('../lib/parser');
const { formatCitation } = require('../lib/formatters');

const VALID_FORMATS = ['lsyj', 'gbt7714', 'apa'];
const MAX_BATCH_SIZE = 50;

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
    const { items } = request.body;

    if (!Array.isArray(items) || items.length === 0) {
      return response.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Items array is required and must not be empty'
      });
    }

    if (items.length > MAX_BATCH_SIZE) {
      return response.status(400).json({
        success: false,
        error: 'Too many items',
        message: `Maximum ${MAX_BATCH_SIZE} items per batch`
      });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.text || typeof item.text !== 'string') {
        return response.status(400).json({
          success: false,
          error: 'Invalid item',
          message: `Item ${i}: text field is required and must be a string`
        });
      }
      if (item.format && !VALID_FORMATS.includes(item.format)) {
        return response.status(400).json({
          success: false,
          error: 'Invalid format',
          message: `Item ${i}: format must be one of: ${VALID_FORMATS.join(', ')}`
        });
      }
    }

    const results = items.map((item, index) => {
      try {
        const citation = parseCitationText(item.text);
        const format = item.format || 'lsyj';
        const result = formatCitation(citation, format);
        
        return {
          index,
          success: true,
          original: item.text,
          result,
          citation: {
            id: citation.id,
            type: citation.type,
            language: citation.language,
            title: citation.title,
            authors: citation.authors,
            publisher: citation.publisher,
            publishYear: citation.publishYear
          }
        };
      } catch (error) {
        return {
          index,
          success: false,
          original: item.text,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return response.status(200).json({
      success: true,
      data: {
        total: items.length,
        successful,
        failed,
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch conversion error:', error);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process batch conversion'
    });
  }
};

const { FORMAT_LIST } = require('../lib/types');
const { setCorsGet, handleOptions } = require('../lib/cors');

module.exports = async function handler(request, response) {
  const origin = request.headers['origin'] || '';
  setCorsGet(response, origin);
  if (handleOptions(request, response)) return;

  if (request.method !== 'GET') {
    return response.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    return response.status(200).json({
      success: true,
      data: {
        formats: FORMAT_LIST,
        supportedTypes: [
          'book',
          'chapter',
          'journal',
          'newspaper',
          'thesis',
          'archive',
          'ancient',
          'electronic',
          'conference',
          'diary',
          'transferred',
          'classic'
        ],
        supportedLanguages: ['zh', 'en', 'ja']
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get formats'
    });
  }
};

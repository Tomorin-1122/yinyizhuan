import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FORMAT_LIST } from '../_lib/types.js';

// CORS头设置
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  setCorsHeaders(response);

  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // 只允许GET请求
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
}

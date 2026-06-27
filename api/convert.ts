import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCitationText } from '../_lib/parser';
import { formatCitation } from '../_lib/formatters';
import { TargetFormat } from '../_lib/types';

// 支持的格式列表
const VALID_FORMATS: TargetFormat[] = ['lsyj', 'gbt7714', 'apa'];

// CORS头设置
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
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

  // 只允许POST请求
  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    const { text, format = 'lsyj' } = request.body;

    // 验证输入
    if (!text || typeof text !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Text field is required and must be a string'
      });
    }

    // 验证格式参数
    if (!VALID_FORMATS.includes(format)) {
      return response.status(400).json({
        success: false,
        error: 'Invalid format',
        message: `Format must be one of: ${VALID_FORMATS.join(', ')}`
      });
    }

    // 调用核心转换逻辑
    const citation = parseCitationText(text);
    const result = formatCitation(citation, format);

    // 返回结构化响应
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
}

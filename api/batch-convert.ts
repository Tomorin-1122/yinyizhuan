import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCitationText } from '../_lib/parser.js';
import { formatCitation } from '../_lib/formatters/index.js';
import { TargetFormat } from '../_lib/types.js';

// 支持的格式列表
const VALID_FORMATS: TargetFormat[] = ['lsyj', 'gbt7714', 'apa'];

// 最大批量数量
const MAX_BATCH_SIZE = 50;

// CORS头设置
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

interface BatchItem {
  text: string;
  format?: TargetFormat;
}

interface BatchResult {
  index: number;
  success: boolean;
  original: string;
  result?: string;
  citation?: any;
  error?: string;
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
    const { items } = request.body;

    // 验证输入
    if (!Array.isArray(items) || items.length === 0) {
      return response.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Items array is required and must not be empty'
      });
    }

    // 验证批量大小
    if (items.length > MAX_BATCH_SIZE) {
      return response.status(400).json({
        success: false,
        error: 'Too many items',
        message: `Maximum ${MAX_BATCH_SIZE} items per batch`
      });
    }

    // 验证每个项目的格式
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as BatchItem;
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

    // 批量处理
    const results: BatchResult[] = items.map((item: BatchItem, index: number) => {
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

    // 统计结果
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
}

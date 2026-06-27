import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCitationText } from '../_lib/parser.js';

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
    const { text } = request.body;

    // 验证输入
    if (!text || typeof text !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Text field is required and must be a string'
      });
    }

    // 调用解析逻辑
    const citation = parseCitationText(text);

    // 返回解析结果（不格式化）
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
          edition: citation.edition,
          volume: citation.volume,
          bookTitle: citation.bookTitle,
          bookAuthors: citation.bookAuthors,
          journalName: citation.journalName,
          issue: citation.issue,
          volumeNumber: citation.volumeNumber,
          newspaperName: citation.newspaperName,
          publishDate: citation.publishDate,
          pageSection: citation.pageSection,
          thesisType: citation.thesisType,
          institution: citation.institution,
          archiveDate: citation.archiveDate,
          archiveNumber: citation.archiveNumber,
          archiveLocation: citation.archiveLocation,
          ancientEdition: citation.ancientEdition,
          ancientSubType: citation.ancientSubType,
          section: citation.section,
          url: citation.url,
          accessDate: citation.accessDate,
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
}

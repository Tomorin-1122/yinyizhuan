/**
 * 古籍引用数据库 API
 * /api/ancient-db
 */

const { handleSearch, handleGetById } = require('../lib/ancient-db');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    const { action, id, q, limit } = request.query;

    // 根据ID获取
    if (action === 'get' && id) {
      return handleGetById({ params: { id } }, response);
    }

    // 搜索
    if (q) {
      return handleSearch({ query: { q, limit } }, response);
    }

    // 默认返回数据库统计
    const { loadDatabase } = require('../lib/ancient-db');
    const db = loadDatabase();
    
    return response.status(200).json({
      success: true,
      data: {
        total: db.length,
        series: '景印文渊阁四库全书',
        publisher: '台湾商务印书馆',
        publishYears: '1983-1986',
        categories: {
          '经': db.filter(r => r.category === '经').length,
          '史': db.filter(r => r.category === '史').length,
          '子': db.filter(r => r.category === '子').length,
          '集': db.filter(r => r.category === '集').length
        },
        endpoints: {
          search: '/api/ancient-db?q=关键词',
          get: '/api/ancient-db?action=get&id=1'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ancient DB API error:', error);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process request'
    });
  }
};

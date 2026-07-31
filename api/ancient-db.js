/**
 * 古籍引用数据库 API
 * /api/ancient-db
 */

const { handleSearch, handleGetById } = require('../lib/ancient-db');
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
    const { action, id, q, limit } = request.query;

    // 根据ID获取
    if (action === 'get' && id) {
      return handleGetById({ params: { id } }, response);
    }

    // 搜索
    if (q) {
      return handleSearch({ query: { q, limit } }, response);
    }

    // 默认返回数据库统计（动态聚合，避免硬编码过时）
    const { loadDatabase } = require('../lib/ancient-db');
    const db = loadDatabase();

    // 按丛书聚合统计
    const seriesCount = {};
    const publisherCount = {};
    const publishYears = new Set();
    for (const r of db) {
      const s = r.series || '未知丛书';
      seriesCount[s] = (seriesCount[s] || 0) + 1;
      if (r.publisher) publisherCount[r.publisher] = (publisherCount[r.publisher] || 0) + 1;
      if (r.publishYear && typeof r.publishYear === 'string') {
        for (const y of r.publishYear.match(/\d{4}/g) || []) publishYears.add(y);
      }
    }
    const topSeries = Object.entries(seriesCount).sort((a, b) => b[1] - a[1]);
    const topPublishers = Object.entries(publisherCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const yearRange = [...publishYears].sort();

    return response.status(200).json({
      success: true,
      data: {
        total: db.length,
        series: topSeries.map(([name, count]) => ({ name, count })),
        topPublishers: topPublishers.map(([name, count]) => ({ name, count })),
        publishYearRange: yearRange.length > 0 ? [yearRange[0], yearRange[yearRange.length - 1]] : [],
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

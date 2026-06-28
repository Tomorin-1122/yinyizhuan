const { checkApiKey } = require('../lib/auth');

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

  if (!checkApiKey(request, response)) return;

  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { records } = request.body;
    if (!Array.isArray(records)) {
      return response.status(400).json({ success: false, error: 'records 必须是数组' });
    }

    // 按格式统计
    const byFormat = {};
    // 按类型统计
    const byType = {};
    // 按语言统计
    const byLanguage = {};
    // 所有作者
    const authorSet = new Set();
    // 时间分布（按月）
    const byMonth = {};

    for (const r of records) {
      const fmt = r.targetFormat || 'unknown';
      byFormat[fmt] = (byFormat[fmt] || 0) + 1;

      const type = r.citationType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      const lang = r.language || 'unknown';
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;

      if (r.authors) {
        const authors = Array.isArray(r.authors) ? r.authors : [r.authors];
        authors.forEach(a => { if (a) authorSet.add(a); });
      }

      if (r.timestamp) {
        const m = new Date(r.timestamp).toISOString().slice(0, 7);
        byMonth[m] = (byMonth[m] || 0) + 1;
      }
    }

    return response.status(200).json({
      success: true,
      data: {
        total: records.length,
        uniqueAuthors: authorSet.size,
        byFormat,
        byType,
        byLanguage,
        byMonth,
        topFormats: Object.entries(byFormat).sort((a, b) => b[1] - a[1]).slice(0, 3),
        topTypes: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5),
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('History analyze error:', error);
    return response.status(500).json({ success: false, error: '分析失败' });
  }
};

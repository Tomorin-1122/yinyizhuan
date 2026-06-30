const { checkApiKey } = require('../lib/auth');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

// 类型英文 → 中文映射
const TYPE_NAMES = {
  book: '专著', chapter: '论文集析出', journal: '期刊', newspaper: '报纸',
  thesis: '学位论文', archive: '档案', ancient: '古籍', electronic: '电子文献',
  conference: '会议论文', diary: '日记', transferred: '转引', classic: '经典'
};

const FORMAT_NAMES = { lsyj: '《历史研究》', gbt7714: 'GB/T 7714', apa: 'APA' };
const LANG_NAMES = { zh: '中文', en: '英文', ja: '日文' };

module.exports = async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // history-analyze 不需要 API Key（纯统计分析，无敏感操作）
  // if (!checkApiKey(request, response)) return;

  try {
    const { records } = request.body;
    if (!Array.isArray(records)) {
      return response.status(400).json({ success: false, error: 'records 必须是数组' });
    }

    const byFormat = {};
    const byType = {};
    const byLanguage = {};
    const authorCount = {};
    const byMonth = {};
    const byDay = {};

    for (const r of records) {
      const fmt = FORMAT_NAMES[r.targetFormat] || r.targetFormat || '其他';
      byFormat[fmt] = (byFormat[fmt] || 0) + 1;

      const type = TYPE_NAMES[r.citationType] || r.citationType || '其他';
      byType[type] = (byType[type] || 0) + 1;

      const lang = LANG_NAMES[r.language] || r.language || '其他';
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;

      if (r.authors) {
        const authors = Array.isArray(r.authors) ? r.authors : [r.authors];
        authors.forEach(a => {
          if (a) authorCount[a] = (authorCount[a] || 0) + 1;
        });
      }

      if (r.timestamp) {
        const d = new Date(r.timestamp);
        const m = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
        byMonth[m] = (byMonth[m] || 0) + 1;
        const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        byDay[day] = (byDay[day] || 0) + 1;
      }
    }

    const topAuthors = Object.entries(authorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topFormats = Object.entries(byFormat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 找最忙碌日期（转换最多的那天）
    const topDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return response.status(200).json({
      success: true,
      data: {
        total: records.length,
        uniqueAuthors: Object.keys(authorCount).length,
        topAuthors,
        byFormat,
        byType,
        byLanguage,
        byMonth,
        topDays,
        topFormats,
        topTypes,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('History analyze error:', error);
    return response.status(500).json({ success: false, error: '分析失败' });
  }
};

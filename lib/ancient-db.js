/**
 * 古籍引用数据库 - API 接口
 * 用于引易转项目
 */

const fs = require('fs');
const path = require('path');

// 加载数据库
let ancientDB = null;

function loadDatabase() {
  if (ancientDB) return ancientDB;
  
  const dbPath = path.join(__dirname, 'siku-quanshu.json');
  if (!fs.existsSync(dbPath)) {
    console.error('数据库文件不存在:', dbPath);
    return [];
  }
  
  const data = fs.readFileSync(dbPath, 'utf-8');
  ancientDB = JSON.parse(data);
  console.log(`已加载 ${ancientDB.length} 条古籍记录`);
  return ancientDB;
}

// 搜索古籍
function searchAncient(query, limit = 10) {
  const db = loadDatabase();
  const results = [];
  const queryLower = query.trim().toLowerCase();
  
  for (const record of db) {
    // 搜索标题
    if (record.title.toLowerCase().includes(queryLower) || 
        record.fullTitle.toLowerCase().includes(queryLower)) {
      results.push(record);
      continue;
    }
    
    // 搜索作者
    for (const author of record.authors) {
      if (author.name.toLowerCase().includes(queryLower)) {
        results.push(record);
        break;
      }
    }
    
    if (results.length >= limit) break;
  }
  
  return results;
}

// 根据ID获取记录
function getAncientById(id) {
  const db = loadDatabase();
  return db.find(r => r.id === id) || null;
}

// 生成《历史研究》格式引用（丛书子目格式）
// volumeNum: 用户指定的引用卷次（1-总卷数）
function generateLSYJCitation(record, volumeNum = '', page = '') {
  const parts = [];
  
  // 责任者：(朝代)姓名+角色，多个责任者用逗号分隔，最后以冒号结尾
  let authorStr = '';
  if (record.authors && record.authors.length > 0) {
    const authorParts = record.authors.map(a => {
      const dynasty = a.dynasty ? `(${a.dynasty})` : '';
      const role = a.role || '撰';
      return `${dynasty}${a.name}${role}`;
    });
    authorStr = authorParts.join('，') + '：';
  }
  
  // 题名：《书名》
  const titlePart = `《${record.title}》`;
  
  // 卷次：用户指定或默认
  let volumePart = '';
  if (volumeNum) {
    volumePart = `卷${volumeNum}`;
  } else if (record.totalVolumes) {
    // 如果有总卷数，提示用户需要指定
    volumePart = `卷X`;
  }
  
  // 合并责任者、题名、卷次
  parts.push(authorStr + titlePart + volumePart);
  
  // 丛书名和册数
  if (record.series) {
    let seriesPart = `《${record.series}》`;
    if (record.volumes?.start) {
      seriesPart += `第${record.volumes.start}册`;
    }
    parts.push(seriesPart);
  }
  
  // 出版信息：出版地：出版社，出版年
  if (record.publisher) {
    // 出版地（默认台北）
    const place = record.publishPlace || '台北';
    let pubPart = `${place}：${record.publisher}`;
    if (record.publishYear) {
      // 提取年份（取最后一个年份）
      const years = record.publishYear.match(/\d{4}/g);
      if (years) {
        pubPart += `，${years[years.length - 1]}年`;
      }
    }
    parts.push(pubPart);
  }
  
  // 页码（用户提供）
  if (page) {
    parts.push(page);
  }
  
  return parts.join('，') + '。';
}

// 转换为引易转表单格式
function toYinYiZhuanFormat(record) {
  const authors = record.authors.map(a => ({
    name: a.name,
    dynasty: a.dynasty || '',
    role: a.role || '撰'
  }));
  
  return {
    type: 'ancient',
    subType: 'collection',  // 丛书
    title: record.title,
    authors: authors,
    dynasty: authors[0]?.dynasty || '',
    publisher: record.publisher || '',
    publishYear: record.publishYear || '',
    volumes: record.volumes?.raw || '',
    totalVolumes: record.totalVolumes || 0,  // 总卷数
    version: record.version || '影印本',
    series: record.series || '',
    notes: record.notes || ''
  };
}

// API 处理函数
function handleSearch(request, response) {
  const { q, limit = 10 } = request.query;
  
  if (!q) {
    return response.status(400).json({
      success: false,
      error: '缺少搜索参数 q'
    });
  }
  
  const results = searchAncient(q, parseInt(limit));
  
  return response.json({
    success: true,
    data: {
      query: q,
      total: results.length,
      results: results.map(r => ({
        id: r.id,
        title: r.fullTitle,
        authors: r.authors.map(a => `${a.dynasty ? `[${a.dynasty}]` : ''}${a.name}`).join('、'),
        category: r.category,
        volumes: r.volumes?.raw || '',
        citation: generateLSYJCitation(r),
        formData: toYinYiZhuanFormat(r)
      }))
    },
    timestamp: new Date().toISOString()
  });
}

function handleGetById(request, response) {
  const { id } = request.params;
  
  const record = getAncientById(parseInt(id));
  if (!record) {
    return response.status(404).json({
      success: false,
      error: '未找到记录'
    });
  }
  
  return response.json({
    success: true,
    data: {
      ...record,
      citation: generateLSYJCitation(record),
      formData: toYinYiZhuanFormat(record)
    },
    timestamp: new Date().toISOString()
  });
}

// 导出
module.exports = {
  loadDatabase,
  searchAncient,
  getAncientById,
  generateLSYJCitation,
  toYinYiZhuanFormat,
  handleSearch,
  handleGetById
};

// 如果直接运行，测试功能
if (require.main === module) {
  const db = loadDatabase();
  console.log(`数据库包含 ${db.length} 条记录`);
  
  // 测试搜索
  const testQueries = ['周易', '苏轼', '史记'];
  for (const q of testQueries) {
    const results = searchAncient(q, 3);
    console.log(`\n搜索 "${q}" 找到 ${results.length} 条：`);
    for (const r of results) {
      console.log(`  - ${r.fullTitle}`);
      console.log(`    引用: ${generateLSYJCitation(r)}`);
    }
  }
}

/**
 * 共享 CORS 配置
 * 只允许受信任的域名跨域访问 API
 */
const ALLOWED_ORIGINS = [
  'https://yinyizhuan.cn',
  'https://yinyizhuan.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getOrigin(request) {
  return request.headers['origin'] || '';
}

function setCorsHeaders(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // 无匹配时允许 localhost（方便本地开发），生产环境不发送
    res.setHeader('Access-Control-Allow-Origin', '');
  }
}

function setCorsPost(res, origin) {
  setCorsHeaders(res, origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function setCorsGet(res, origin) {
  setCorsHeaders(res, origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handleOptions(request, response) {
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return true;
  }
  return false;
}

module.exports = { setCorsPost, setCorsGet, handleOptions, ALLOWED_ORIGINS };

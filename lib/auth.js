// 简单的 X-API-Key 鉴权共享函数
// 如果 Vercel 环境变量 API_KEY 未设置，则允许所有请求（向后兼容）
function checkApiKey(request, response) {
  const requiredKey = process.env.API_KEY;
  
  // 未设置密钥 = 公开模式
  if (!requiredKey) return true;
  
  const providedKey = request.headers['x-api-key'];
  if (providedKey === requiredKey) return true;
  
  response.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: '无效或缺失的 API 密钥，请在请求头中提供 X-API-Key'
  });
  return false;
}

module.exports = { checkApiKey };

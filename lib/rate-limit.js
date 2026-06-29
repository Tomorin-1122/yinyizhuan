/**
 * 简单的内存速率限制器
 * 注意：Vercel Serverless 函数是无状态的，每次冷启动会重置计数器
 * 如需持久化限流，应使用 Vercel KV 或 Redis
 */

// IP → { count, resetTime }
const store = new Map();

const DEFAULT_WINDOW_MS = 60_000; // 1 分钟窗口
const DEFAULT_MAX = 60;           // 每窗口最大请求数

/**
 * 检查是否超出速率限制
 * @param {string} key - 限流键（通常是 IP 地址）
 * @param {number} max - 窗口内最大请求数
 * @param {number} windowMs - 窗口时长（毫秒）
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
function checkRateLimit(key, max = DEFAULT_MAX, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, resetMs: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, max - entry.count);
  const resetMs = entry.resetTime - now;

  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetMs };
  }

  return { allowed: true, remaining, resetMs };
}

/**
 * 从请求中提取客户端 IP
 */
function getClientIp(request) {
  return (
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.headers['x-real-ip'] ||
    request.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Express/Vercel 中间件：速率限制
 * @param {object} options
 * @param {number} options.max - 每窗口最大请求数（默认 60）
 * @param {number} options.windowMs - 窗口时长（默认 60000ms）
 */
function rateLimitMiddleware({ max = DEFAULT_MAX, windowMs = DEFAULT_WINDOW_MS } = {}) {
  return function checkLimit(request, response) {
    const ip = getClientIp(request);
    const { allowed, remaining, resetMs } = checkRateLimit(ip, max, windowMs);

    response.setHeader('X-RateLimit-Limit', max);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetMs / 1000));

    if (!allowed) {
      response.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `请求过于频繁，请在 ${Math.ceil(resetMs / 1000)} 秒后重试`,
      });
      return false;
    }
    return true;
  };
}

module.exports = { checkRateLimit, getClientIp, rateLimitMiddleware };

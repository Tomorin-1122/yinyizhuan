/**
 * Google Books API 代理
 * 在服务端调用 Google Books API，API Key 不暴露到前端
 */
const { setCorsGet, handleOptions } = require('../lib/cors');

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

module.exports = async function handler(request, response) {
  const origin = request.headers['origin'] || '';
  setCorsGet(response, origin);
  if (handleOptions(request, response)) return;

  if (request.method !== 'GET') {
    return response.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { q } = request.query;
  if (!q || typeof q !== 'string') {
    return response.status(400).json({ success: false, error: 'Missing query param "q"' });
  }

  try {
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&key=${GOOGLE_BOOKS_API_KEY}`;
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      return response.status(res.status).json({ success: false, error: `Google Books API returned ${res.status}` });
    }

    const json = await res.json();
    return response.status(200).json({ success: true, data: json });
  } catch (e) {
    return response.status(500).json({ success: false, error: e.message || 'Proxy error' });
  }
};

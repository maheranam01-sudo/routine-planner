/**
 * Maher Islamic Routine Planner — Backend Server
 * * Proxies DeepSeek API calls server-side to avoid CORS.
 * Run: node server.js
 * Open: http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-37b9465d09c54a778657f36bff61a42e';
const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/chat/completions';

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function deepseekRequest(payload, customApiKey) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const activeKey = customApiKey || DEEPSEEK_API_KEY; // Prioritize the user's key from the UI
    
    const options = {
      hostname: DEEPSEEK_HOST,
      path: DEEPSEEK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('DeepSeek request timed out after 30s'));
    });

    req.write(bodyStr);
    req.end();
  });
}

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

// ── Main server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── POST /api/ai ──────────────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/ai') {
    try {
      const rawBody = await readBody(req);
      const { message, systemPrompt, apiKey } = JSON.parse(rawBody);

      if (!message || typeof message !== 'string') {
        return sendJson(res, 400, { error: 'Missing or invalid "message" field' });
      }

      const systemContent = systemPrompt || 'You are an intelligent Islamic productivity and routine planning assistant.';

      const payload = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user',   content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      };

      console.log(`[AI] → DeepSeek: "${message.substring(0, 80)}..."`);

      const { status, body } = await deepseekRequest(payload, apiKey);
      
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch(e) {
        console.error('[AI] DeepSeek returned non-JSON:', body);
        return sendJson(res, 502, { error: 'DeepSeek API Error: Invalid response format' });
      }

      console.log(`[AI] ← DeepSeek status: ${status}`);

      if (status !== 200) {
        const errMsg = parsed?.error?.message || JSON.stringify(parsed?.error) || body;
        console.error('[AI] DeepSeek error:', errMsg);
        return sendJson(res, 502, { error: `DeepSeek error: ${errMsg}` });
      }

      const reply = parsed?.choices?.[0]?.message?.content;
      if (!reply) {
        return sendJson(res, 502, { error: 'DeepSeek returned no content', raw: parsed });
      }

      return sendJson(res, 200, { reply });

    } catch (err) {
      console.error('[AI] Exception:', err.message);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ── GET / → serve index.html ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const publicDir = path.join(__dirname, 'public');
    let filePath;

    if (url.pathname === '/' || url.pathname === '/index.html') {
      filePath = path.join(publicDir, 'index.html');
    } else {
      filePath = path.join(publicDir, url.pathname);
    }

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    return serveFile(res, filePath);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
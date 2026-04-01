// Simple proxy server for Anthropic API during local development
const http = require('http');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const PORT = 3021;
const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ VITE_ANTHROPIC_API_KEY not found in .env.local');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle /api/anthropic
  if (req.url !== '/api/anthropic' || req.method !== 'POST') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const requestData = JSON.parse(body);

    const postData = JSON.stringify(requestData);

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let responseData = '';

      proxyRes.on('data', (chunk) => {
        responseData += chunk;
      });

      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(responseData);
      });
    });

    proxyReq.on('error', (error) => {
      console.error('❌ Proxy error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Proxy error', details: error.message }));
    });

    proxyReq.write(postData);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`✅ Anthropic proxy server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key loaded: ${ANTHROPIC_API_KEY.substring(0, 20)}...`);
});

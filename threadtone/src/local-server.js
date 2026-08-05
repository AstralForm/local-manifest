'use strict';

/**
 * Standalone rewrite HTTP server for the Mac menu-bar companion.
 * Does not require Slack tokens.
 *
 *   ENABLE_LOCAL_API=true LOCAL_API_PORT=8787 node src/local-server.js
 */

require('dotenv').config();

const http = require('http');
const { analyzeThread } = require('./services/tone-analyzer');
const { rewriteMessage } = require('./services/rewriter');

const port = Number(process.env.LOCAL_API_PORT || 8787);
const token = process.env.LOCAL_API_TOKEN || '';

const server = http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(body));
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return send(200, { ok: true, service: 'threadtone-local' });
  }

  if (req.method === 'POST' && req.url === '/v1/rewrite') {
    if (token) {
      const auth = req.headers.authorization || '';
      if (auth !== `Bearer ${token}`) {
        return send(401, { ok: false, error: 'unauthorized' });
      }
    }

    let raw = '';
    for await (const chunk of req) raw += chunk;
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      return send(400, { ok: false, error: 'invalid_json' });
    }

    try {
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const draft = payload.draft || '';
      const analysis = analyzeThread(messages.length ? messages : [draft]);
      const result = await rewriteMessage({ draft, analysis, threadMessages: messages });
      return send(200, { ok: true, analysis, rewrite: result });
    } catch (error) {
      return send(500, { ok: false, error: error.message });
    }
  }

  return send(404, { ok: false, error: 'not_found' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ThreadTone local rewrite API → http://127.0.0.1:${port}`);
});

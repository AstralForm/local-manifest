'use strict';

require('dotenv').config();

const { App, LogLevel } = require('@slack/bolt');
const http = require('http');
const { registerShortcuts } = require('./listeners/shortcuts/rewrite');
const { registerCommands } = require('./listeners/commands/threadtone');
const { registerActions, registerViews } = require('./listeners/actions/rewrite');
const { registerEvents } = require('./listeners/events/app-home');
const { analyzeThread } = require('./services/tone-analyzer');
const { rewriteMessage } = require('./services/rewriter');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
});

registerShortcuts(app);
registerCommands(app);
registerActions(app);
registerViews(app);
registerEvents(app);

/**
 * Optional local HTTP API for the Mac menu-bar companion.
 * POST /v1/rewrite { draft, messages: string[] }
 */
function startLocalApi() {
  if (process.env.ENABLE_LOCAL_API !== 'true') return;

  const port = Number(process.env.LOCAL_API_PORT || 8787);
  const token = process.env.LOCAL_API_TOKEN || '';

  const server = http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { ok: true, service: 'threadtone' });
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
        const analysis = analyzeThread(messages.length ? messages : [payload.draft || '']);
        const result = await rewriteMessage({
          draft: payload.draft || '',
          analysis,
          threadMessages: messages,
        });
        return send(200, { ok: true, analysis, rewrite: result });
      } catch (error) {
        return send(500, { ok: false, error: error.message });
      }
    }

    return send(404, { ok: false, error: 'not_found' });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`ThreadTone local API on http://127.0.0.1:${port}`);
  });
}

(async () => {
  const port = Number(process.env.PORT || 3000);
  await app.start(port);
  console.log('⚡️ ThreadTone is running (Socket Mode)');
  startLocalApi();
})();

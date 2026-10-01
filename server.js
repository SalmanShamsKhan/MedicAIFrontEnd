const express = require('express');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const target = process.env.API_ORIGIN || 'http://localhost:8000';
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  const origin = new URL(target);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error('API_ORIGIN must be an HTTP(S) origin without credentials');
  }
  server.get('/healthz', (_req, res) => res.json({ status: 'ready' }));
  server.use('/api', createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 20000,
    timeout: 25000,
    onError: (_err, _req, res) => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Application API is unavailable.' }));
    },
  }));
  server.all('*', (req, res) => handle(req, res));
  server.listen(port, () => console.log(`Frontend listening on port ${port}`));
}).catch(error => {
  console.error('Frontend startup failed:', error.message);
  process.exitCode = 1;
});

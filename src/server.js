'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { gzipSync } = require('node:zlib');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon' };

function createServer({ basePath = '/' } = {}) {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(basePath)) throw new Error('BASE_PATH must be a path such as / or /Parking-Aero-WebApp/.');
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'");
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    let file;
    try {
      const url = new URL(req.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\\') || pathname.includes('\0')) throw new Error('Invalid path');
      if (basePath !== '/' && pathname === basePath.slice(0, -1)) {
        res.writeHead(308, { Location: basePath + url.search });
        res.end();
        return;
      }
      if (!pathname.startsWith(basePath)) { res.writeHead(404); res.end('Not found'); return; }
      pathname = '/' + pathname.slice(basePath.length);
      file = path.resolve(PUBLIC_DIR, '.' + pathname);
      if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) throw new Error('Invalid path');
      if (pathname.endsWith('/')) file = path.join(file, 'index.html');
    } catch (_) { res.writeHead(400); res.end('Bad request'); return; }
    if (!TYPES[path.extname(file)]) { res.writeHead(404); res.end('Not found'); return; }
    try {
      let data = await fs.readFile(file);
      const type = TYPES[path.extname(file)];
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-cache');
      if (/text|json|javascript/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        data = gzipSync(data);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
      }
      res.setHeader('Content-Length', data.length);
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (_) { res.writeHead(404); res.end('Not found'); }
  });
}

if (require.main === module) {
  const basePath = process.env.BASE_PATH || '/';
  const server = createServer({ basePath });
  server.listen(PORT, HOST, () => console.log(`CDG Parking: http://${HOST}:${PORT}${basePath}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
module.exports = { createServer };

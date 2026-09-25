// Static file server for public/. Library: createServer({ root }). CLI: node tools/serve.mjs [--open] [--port N]
import { createServer as httpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

export function createServer({ root }) {
  const base = path.resolve(root);
  return httpServer(async (req, res) => {
    const send = (code, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(body);
    };
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      return send(400, 'Bad request');
    }
    if (pathname.split(/[\/]/).includes('..') || pathname.includes('\0')) return send(403, 'Forbidden');
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(base, pathname);
    if (!file.startsWith(base + path.sep)) return send(403, 'Forbidden');
    try {
      if (!(await stat(file)).isFile()) return send(404, 'Not found');
      send(200, await readFile(file), MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    } catch {
      send(404, 'Not found');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--port');
  const port = Number((i >= 0 && args[i + 1]) || process.env.PORT || 5320);
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  const server = createServer({ root });
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${port} is already in use (is the game already running?)` : err.message);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => {
    const url = `http://localhost:${port}`;
    console.log(`3000 Miles: ${url}`);
    for (const list of Object.values(networkInterfaces()))
      for (const n of list || [])
        if (n.family === 'IPv4' && !n.internal) console.log(`On your phone (same Wi-Fi): http://${n.address}:${port}`);
    if (args.includes('--open')) {
      if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
      else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  });
}

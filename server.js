const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' https://cliffgroup-api-production.up.railway.app",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    'upgrade-insecure-requests'
  ].join('; ')
};

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, { ...securityHeaders, ...headers });
  res.end(body);
}

function resolveRequestPath(url) {
  const parsed = new URL(url, 'http://localhost');
  const pathname = decodeURIComponent(parsed.pathname);

  if (pathname === '/health' || pathname === '/api/health') {
    return { health: true };
  }

  if (pathname === '/') {
    return { filePath: path.join(rootDir, 'index.html'), fallback: false };
  }

  const requestedPath = path.normalize(path.join(rootDir, pathname));
  if (!requestedPath.startsWith(rootDir)) {
    return { forbidden: true };
  }

  return {
    filePath: requestedPath,
    fallback: !path.extname(pathname)
  };
}

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    'Content-Type': `${mimeTypes[ext] || 'application/octet-stream'}; charset=utf-8`
  };

  if (ext && ext !== '.html') {
    headers['Cache-Control'] = 'public, max-age=3600';
  } else {
    headers['Cache-Control'] = 'no-cache';
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Server Error');
      return;
    }

    send(res, statusCode, headers, content);
  });
}

const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    send(res, 405, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Method Not Allowed');
    return;
  }

  const route = resolveRequestPath(req.url || '/');

  if (route.health) {
    send(res, 200, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify({ ok: true }));
    return;
  }

  if (route.forbidden) {
    send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }

  fs.stat(route.filePath, (statError, stat) => {
    if (!statError && stat.isFile()) {
      serveFile(res, route.filePath);
      return;
    }

    if (route.fallback) {
      serveFile(res, path.join(rootDir, 'index.html'));
      return;
    }

    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
  });
});

server.listen(port, host, () => {
  console.log(`Cliff Group site listening on ${host}:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

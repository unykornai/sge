const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4444;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0] || '/');
  let filePath;

  if (urlPath === '/' || urlPath === '/index.html') {
    filePath = path.join(PUBLIC_DIR, 'announcement.html');
  } else {
    // sanitize path
    const safe = path.normalize(urlPath).replace(/^\.\./g, '');
    filePath = path.join(PUBLIC_DIR, safe);
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ct = contentType(filePath);
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Server error');
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Announcement server listening on http://localhost:${PORT}/`);
});

server.on('error', (e) => {
  console.error('Server error:', e.message);
  process.exit(1);
});

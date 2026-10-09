const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.bib': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const filename = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (!filename.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  fs.stat(filename, (statError, stats) => {
    if (statError) {
      response.writeHead(statError.code === 'ENOENT' ? 404 : 500).end();
      return;
    }
    fs.readFile(filename, (error, data) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
        return;
      }
      response.writeHead(200, {
        'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
        'Last-Modified': stats.mtime.toUTCString()
      });
      response.end(request.method === 'HEAD' ? undefined : data);
    });
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview: http://127.0.0.1:` + port + '/');
});

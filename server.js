const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8080;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  let filePath = '.' + req.url;

  if (filePath === './') {
    filePath = './index.html';
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile('./index.html', (fallbackErr, fallback) => {
        if (fallbackErr) {
          res.writeHead(500);
          res.end('Server Error');
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/html'
        });

        res.end(fallback);
      });

      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[ext] || 'text/plain'
    });

    res.end(content);
  });
}).listen(port, () => {
  console.log('Server running on port', port);
});

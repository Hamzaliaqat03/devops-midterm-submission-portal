import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSubmission } from '../public/validate.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = path.join(ROOT, 'public');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

export class SubmissionStore {
  constructor(file) {
    this.file = file;
  }
  all() {
    if (!fs.existsSync(this.file)) return [];
    return JSON.parse(fs.readFileSync(this.file, 'utf8'));
  }
  add(submission) {
    const list = this.all();
    const saved = { id: list.length + 1, ...submission, submittedAt: new Date().toISOString() };
    list.push(saved);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(list, null, 2));
    return saved;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function createApp(store) {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (pathname === '/api/submissions' && req.method === 'GET') {
      return sendJson(res, 200, store.all());
    }
    if (pathname === '/api/submissions' && req.method === 'POST') {
      let body;
      try {
        body = await readBody(req);
      } catch {
        return sendJson(res, 400, { errors: ['Request body must be JSON.'] });
      }
      const { valid, errors, data } = validateSubmission(body);
      if (!valid) return sendJson(res, 400, { errors });
      return sendJson(res, 201, store.add(data));
    }

    const file = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain' });
      return fs.createReadStream(file).pipe(res);
    }
    sendJson(res, 404, { error: 'Not found' });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const store = new SubmissionStore(path.join(ROOT, 'data', 'submissions.json'));
  createApp(store).listen(port, () => console.log(`Portal running at http://localhost:${port}`));
}

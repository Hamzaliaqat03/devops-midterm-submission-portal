// Local HTTP receiver: accepts the CI test report and saves it as test-report.json.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.RECEIVER_PORT) || 8000;
const TOKEN = process.env.RECEIVER_TOKEN || '';
const OUT_DIR = process.env.REPORT_DIR || path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(OUT_DIR, 'test-report.json');
const HISTORY_DIR = path.join(OUT_DIR, 'reports');

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Report receiver is running. POST reports to /report\n');
    }
    if (req.method !== 'POST' || req.url !== '/report') {
      res.writeHead(404);
      return res.end('Not found\n');
    }
    if (TOKEN && req.headers['x-report-token'] !== TOKEN) {
      res.writeHead(401);
      return res.end('Invalid token\n');
    }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let report;
      try {
        report = JSON.parse(raw);
      } catch {
        res.writeHead(400);
        return res.end('Body must be JSON\n');
      }
      const text = JSON.stringify(report, null, 2);
      fs.writeFileSync(OUT_FILE, text);
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
      fs.writeFileSync(path.join(HISTORY_DIR, `run-${report.pipelineRunId}-${report.status}.json`), text);
      const s = report.summary ?? {};
      console.log(
        `[${new Date().toISOString()}] Saved report: run ${report.pipelineRunId} commit ${String(report.commitSha).slice(0, 7)} ` +
          `-> ${String(report.status).toUpperCase()} (${s.passed}/${s.total} passed)`
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ saved: OUT_FILE }));
    });
  })
  .listen(PORT, () => console.log(`Receiver listening on http://localhost:${PORT} -> ${OUT_FILE}`));

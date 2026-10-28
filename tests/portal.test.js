import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, SubmissionStore } from '../src/app.js';

const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'portal-')), 'submissions.json');
const store = new SubmissionStore(dataFile);
let server;
let base;

before(async () => {
  server = createApp(store);
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const valid = {
  name: 'Ali Khan',
  regNo: 'FA22-BCS-001',
  title: 'Lab Midterm',
  url: 'https://github.com/alikhan/midterm',
};

async function submit(body) {
  const res = await fetch(`${base}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function list() {
  return (await fetch(`${base}/api/submissions`)).json();
}

test('Complete details and a valid submission URL are saved and listed', async () => {
  const { status, body } = await submit(valid);
  assert.equal(status, 201);
  assert.equal(body.regNo, valid.regNo);
  const saved = await list();
  assert.ok(saved.some((s) => s.regNo === valid.regNo && s.url === valid.url), 'submission should appear in list');
});

test('Missing registration number is rejected with a validation message', async () => {
  const before = (await list()).length;
  const { status, body } = await submit({ ...valid, regNo: '' });
  assert.equal(status, 400);
  assert.ok(body.errors.includes('Registration number is required.'));
  assert.equal((await list()).length, before);
});

test('Invalid submission URL is rejected and not saved', async () => {
  const before = (await list()).length;
  const { status, body } = await submit({ ...valid, regNo: 'FA22-BCS-999', url: 'not-a-url' });
  assert.equal(status, 400);
  assert.ok(body.errors.includes('Submission URL must be a valid http(s) link.'));
  const saved = await list();
  assert.equal(saved.length, before);
  assert.ok(!saved.some((s) => s.regNo === 'FA22-BCS-999'));
});

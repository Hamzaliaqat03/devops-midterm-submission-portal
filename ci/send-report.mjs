// Builds test-report.json from the test results and POSTs it to the local receiver.
import fs from 'node:fs';

const env = process.env;
let tests = [];
try {
  tests = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
} catch {
  tests = [{ name: 'Test run', result: 'failed', durationMs: 0, failureMessage: 'Test results file missing: tests did not run.' }];
}

const passed = tests.filter((t) => t.result === 'passed').length;
const failed = tests.length - passed;
const report = {
  repository: env.GITHUB_REPOSITORY ?? 'local',
  branch: env.GITHUB_REF_NAME ?? 'local',
  commitSha: env.GITHUB_SHA ?? 'local',
  pipelineRunId: env.GITHUB_RUN_ID ?? 'local',
  pipelineRunNumber: env.GITHUB_RUN_NUMBER ?? 'local',
  pipelineRunUrl: env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : null,
  executedAt: new Date().toISOString(),
  tests,
  summary: { total: tests.length, passed, failed },
  status: failed === 0 && tests.length > 0 ? 'passed' : 'failed',
};

fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (!env.RECEIVER_URL) {
  console.log('RECEIVER_URL not set; report written locally only.');
  process.exit(0);
}

const res = await fetch(`${env.RECEIVER_URL.replace(/\/$/, '')}/report`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Report-Token': env.RECEIVER_TOKEN ?? '' },
  body: JSON.stringify(report),
});
console.log(`Receiver responded ${res.status}: ${await res.text()}`);
if (!res.ok) process.exit(1);

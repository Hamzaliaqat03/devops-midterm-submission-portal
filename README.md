# Assignment Submission Portal (CSC418 DevOps Lab Midterm)

A simple portal where students submit their name, registration number, assignment title and a submission URL.
Every push runs automated tests in GitHub Actions. The test report is sent automatically to a local HTTP
receiver on the instructor's computer and saved as `test-report.json`. It is also emailed, and the static frontend is deployed to GitHub Pages only when all tests pass.

- **Live demo (GitHub Pages):** https://hamzaliaqat03.github.io/devops-midterm-submission-portal/
- **Requirements:** Node.js 20 or newer. There are no npm dependencies, so `npm install` is not needed.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app.js` | Node HTTP server: REST API (`GET/POST /api/submissions`) and the frontend |
| `public/` | Frontend (`index.html`, `app.js`), shared validation (`validate.js`), colours (`colors.css`) |
| `tests/portal.test.js` | The three required automated test cases (`node:test`) |
| `tests/json-reporter.mjs` | Test reporter that writes each test's name, result and failure message |
| `ci/send-report.mjs` | Builds `test-report.json` and POSTs it to the receiver |
| `receiver/server.mjs` | Local HTTP receiver that saves `receiver/test-report.json` |
| `.github/workflows/ci.yml` | CI pipeline: test, then report, email and Pages deploy |

## 1. Run the application

```bash
npm start
# open http://localhost:3000
```

Submissions are saved in `data/submissions.json`. Missing fields and invalid URLs are rejected with a message.

## 2. Run the tests

```bash
npm test
```

| Test case | Expected result |
| --- | --- |
| Complete details and a valid submission URL | Saved (HTTP 201) and appears in the list |
| Missing registration number | Rejected (HTTP 400) with "Registration number is required." |
| Invalid submission URL | Rejected (HTTP 400) and not saved |

`npm test` exits with a non-zero code if any test fails, so the CI test step fails too.

## 3. Start the local report receiver

```bash
RECEIVER_TOKEN=<your-secret> npm run receiver
# listens on http://localhost:8000, POST /report
```

Each report is saved to `receiver/test-report.json` (always the latest run). A copy of each run is also kept in `receiver/reports/`.

A GitHub-hosted runner cannot reach your `localhost`, so expose the receiver with a tunnel and keep it running:

```bash
brew install cloudflared          # one time
cloudflared tunnel --url http://localhost:8000
# copy the https://xxxx.trycloudflare.com URL it prints
```

Then set the repository secrets (Settings → Secrets and variables → Actions), or use the GitHub CLI:

```bash
gh secret set RECEIVER_URL   --body "https://xxxx.trycloudflare.com"
gh secret set RECEIVER_TOKEN --body "<your-secret>"
```

Quick tunnels get a new URL each time they start, so update `RECEIVER_URL` whenever you restart cloudflared.

### Report contents

```json
{
  "repository": "owner/repo", "branch": "main", "commitSha": "…", "pipelineRunId": "…",
  "pipelineRunNumber": "…", "pipelineRunUrl": "…", "executedAt": "2026-10-28T13:00:00.000Z",
  "tests": [{ "name": "…", "result": "passed|failed", "durationMs": 12, "failureMessage": null }],
  "summary": { "total": 3, "passed": 3, "failed": 0 },
  "status": "passed|failed"
}
```

The report step runs with `if: always()`, so reports are delivered for both passing and failing runs.

## Bonus: GitHub Pages deployment

The `deploy` job runs only on pushes to `main` and only when the `test` job succeeded. A failing run skips the deploy, so the previously published version stays live.
On Pages there is no backend, so the frontend saves submissions in the browser (`localStorage`) as a demo.

## Bonus: Email report

After every run (pass or fail), the pipeline emails the commit, overall result, test counts and the attached `test-report.json`.
Set these secrets. For Gmail, use an [App Password](https://myaccount.google.com/apppasswords):

```bash
gh secret set MAIL_USERNAME --body "you@gmail.com"
gh secret set MAIL_PASSWORD --body "<16-char app password>"
gh secret set MAIL_TO       --body "instructor@example.com"
# optional: gh secret set MAIL_SERVER --body "smtp.gmail.com"
```

If `MAIL_USERNAME` is not set, the email step is skipped.

## Demonstration steps

1. **Passing run:** push to `main`. All three tests pass, the receiver saves `status: "passed"`, and Pages deploys.
2. **Failing run:** introduce a defect. For example, in `public/validate.js` change `if (!data[key])` to `if (!data[key] && key !== 'regNo')`. Then push. The missing-registration-number test fails, the receiver saves `status: "failed"` with the failure message, and the deploy is skipped.
3. **Fixed run:** revert the defect and push again. All tests pass again.

## Evidence (screenshots)

| # | Step | File |
| --- | --- | --- |
| 1 | Portal running locally with a saved submission | [01-portal-local.png](screenshots/01-portal-local.png) |
| 2 | Demo 1: passing pipeline (tests pass, Pages deployed) | [02-pass-pipeline.png](screenshots/02-pass-pipeline.png) |
| 3 | Demo 1: `test-report.json` received locally (passed, 3/3) | [03-pass-test-report-json.png](screenshots/03-pass-test-report-json.png) |
| 4 | Bonus: portal deployed on GitHub Pages | [04-github-pages.png](screenshots/04-github-pages.png) |
| 5 | Demo 2: defect pushed, test stage fails, deploy skipped | [05-fail-pipeline.png](screenshots/05-fail-pipeline.png) |
| 6 | Demo 2: `test-report.json` received locally (failed, 2/3, with failure message) | [06-fail-test-report-json.png](screenshots/06-fail-test-report-json.png) |
| 7 | Demo 3: defect fixed, pipeline passes, Pages deployed | [07-fixed-pipeline.png](screenshots/07-fixed-pipeline.png) |
| 8 | Demo 3: `test-report.json` received locally (passed, 3/3) | [08-fixed-test-report-json.png](screenshots/08-fixed-test-report-json.png) |
| 9 | All pipeline runs | [09-all-runs.png](screenshots/09-all-runs.png) |

Copies of the received reports are in [`screenshots/report-pass.json`](screenshots/report-pass.json), [`report-fail.json`](screenshots/report-fail.json) and [`report-fixed.json`](screenshots/report-fixed.json).

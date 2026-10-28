// node:test reporter that writes each test's name, result and failure message as JSON.
export default async function* jsonReporter(source) {
  const tests = [];
  for await (const event of source) {
    if ((event.type === 'test:pass' || event.type === 'test:fail') && event.data.details?.type !== 'suite') {
      const error = event.data.details?.error;
      tests.push({
        name: event.data.name,
        result: event.type === 'test:pass' ? 'passed' : 'failed',
        durationMs: Math.round(event.data.details?.duration_ms ?? 0),
        failureMessage: error ? String(error.cause?.message ?? error.message) : null,
      });
    }
  }
  yield JSON.stringify(tests, null, 2);
}

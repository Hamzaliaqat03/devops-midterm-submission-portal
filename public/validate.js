// Shared validation used by both the browser and the server.
export const FIELDS = {
  name: 'Student name',
  regNo: 'Registration number',
  title: 'Assignment title',
  url: 'Submission URL',
};

export function isValidUrl(value) {
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function validateSubmission(input = {}) {
  const errors = [];
  const data = {};
  for (const [key, label] of Object.entries(FIELDS)) {
    data[key] = String(input[key] ?? '').trim();
    if (!data[key] && key !== 'regNo') errors.push(`${label} is required.`);
  }
  if (data.url && !isValidUrl(data.url)) {
    errors.push('Submission URL must be a valid http(s) link.');
  }
  return { valid: errors.length === 0, errors, data };
}

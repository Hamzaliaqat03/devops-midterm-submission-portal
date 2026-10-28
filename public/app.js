import { validateSubmission } from './validate.js';

// With the Node server the API is used; on GitHub Pages (static) the demo saves to localStorage.
const KEY = 'submissions-demo';
let useApi = true;

const api = {
  async list() {
    if (useApi) {
      try {
        const res = await fetch('api/submissions');
        if (res.ok) return res.json();
      } catch {}
      useApi = false;
    }
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  },
  async add(data) {
    if (useApi) {
      const res = await fetch('api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      return res.ok ? { ok: true } : { ok: false, errors: body.errors };
    }
    const list = await api.list();
    list.push({ id: list.length + 1, ...data, submittedAt: new Date().toISOString() });
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
    return { ok: true };
  },
};

const form = document.getElementById('form');
const msg = document.getElementById('msg');

function show(kind, text) {
  msg.className = `msg ${kind}`;
  msg.innerHTML = text;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function render() {
  const list = await api.list();
  document.getElementById('mode').textContent = useApi
    ? 'Saved on the server.'
    : 'Static demo (GitHub Pages): saved in this browser only.';
  document.getElementById('rows').innerHTML = list
    .map((s) => `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td>${esc(s.regNo)}</td><td>${esc(s.title)}</td>
      <td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></td></tr>`)
    .join('') || '<tr><td colspan="5">No submissions yet.</td></tr>';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = Object.fromEntries(new FormData(form));
  const check = validateSubmission(input);
  const result = check.valid ? await api.add(check.data) : { ok: false, errors: check.errors };
  if (result.ok) {
    show('ok', 'Submission saved.');
    form.reset();
    render();
  } else {
    show('err', result.errors.map(esc).join('<br>'));
  }
});

render();

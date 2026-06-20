const http = require('http');
const querystring = require('querystring');

const BASE = 'http://localhost:3000';

function fetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const isForm = opts.formUrlEncoded;
    const body = isForm ? querystring.stringify(opts.body) : (opts.body ? JSON.stringify(opts.body) : null);
    const headers = { ...opts.headers };
    if (body && !isForm) headers['Content-Type'] = 'application/json';
    if (body && isForm) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const req = http.request(url, { method: opts.method || 'GET', headers, timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const results = [];

  // Login
  const csrfRes = await fetch('/api/auth/csrf');
  const csrfToken = csrfRes.body.csrfToken;
  const csrfCookies = (csrfRes.headers['set-cookie'] || []).map(c => c.split(';')[0]);

  const loginRes = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Cookie': csrfCookies.join('; ') },
    formUrlEncoded: true,
    body: { csrfToken, email: 'dev@testhub.local', password: 'dev123456', json: 'true' },
  });
  const loginCookies = [...csrfCookies, ...((loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]))];
  const sessionCookie = loginCookies.join('; ');
  const H = { 'Cookie': sessionCookie };

  // Get project
  const projectsRes = await fetch('/api/projects', { headers: H });
  const PID = projectsRes.body[0]?.id;
  if (!PID) { console.log('FAIL: No project found. Login status:', loginRes.status); process.exit(1); }
  console.log('projectId:', PID);

  // 1. Save API Key
  const saveRes = await fetch(`/api/projects/${PID}/settings`, { method: 'PATCH', headers: H, body: { aiProvider: 'OPENAI', apiKey: 'sk-test-e2e-12345' } });
  console.log('\n1. SAVE apiKey:', saveRes.body.apiKey || '(empty)', '| status:', saveRes.status);

  // 2. Load API Key
  const loadRes = await fetch(`/api/projects/${PID}/settings`, { headers: H });
  console.log('2. LOAD apiKey:', loadRes.body.apiKey || '(empty)', '| status:', loadRes.status);

  // 3. AI generate (with project key — fake key → real call fails → meaningful error)
  const aiRes = await fetch('/api/ai/generate', { method: 'POST', headers: H, body: { projectId: PID, type: 'TEST_PLAN', requirement: { title: 'smoke test' } } });
  const aiMsg = aiRes.body.message || aiRes.body.content?.substring(0, 60) || 'unknown';
  console.log('3. AI gen:', aiMsg.substring(0, 80), '| status:', aiRes.status);

  // 4. Agent task
  const reqsRes = await fetch(`/api/projects/${PID}/requirements`, { headers: H });
  const REQ = reqsRes.body[0]?.id;
  if (REQ) {
    const agentRes = await fetch(`/api/projects/${PID}/agent/task`, { method: 'POST', headers: H, body: { requirementId: REQ, action: 'ANALYZE_REQUIREMENT' } });
    const agentMsg = agentRes.body.message || agentRes.body.content?.substring(0, 60) || 'unknown';
    console.log('4. Agent:', agentMsg.substring(0, 80), '| status:', agentRes.status);
  }

  // 5. Cleanup
  await fetch(`/api/projects/${PID}/settings`, { method: 'PATCH', headers: H, body: { apiKey: '' } });
  console.log('5. Cleanup: done');

  // 6. Pages
  console.log('\n6. Pages:');
  for (const p of ['/', '/agent', '/requirements', '/test-cases', '/defects', '/scripts', '/reports', '/settings', '/projects']) {
    const r = await fetch(p, { headers: H });
    console.log('   ' + p.padEnd(18) + r.status);
  }
})();

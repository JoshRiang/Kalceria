// API + security regression suite for the Kalceria backend.
//
// Runs against a THROWAWAY Postgres + Redis only. It refuses to start unless
// TEST_DATABASE_URL and TEST_REDIS_URL both point at a loopback host, so it can
// never touch a real database even if a production .env is present.
//
//   docker run -d --name kalceria-pt-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=kalceria_pt -p 127.0.0.1:55432:5432 postgres:16-alpine
//   docker run -d --name kalceria-pt-redis -p 127.0.0.1:56379:6379 redis:7-alpine
//   TEST_DATABASE_URL=postgresql://postgres:pw@127.0.0.1:55432/kalceria_pt \
//   TEST_REDIS_URL=redis://127.0.0.1:56379 npx prisma migrate deploy   # once
//   npm run test:api --workspace=backend
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
function loopbackOrNull(value) {
  try { return LOOPBACK.has(new URL(value).hostname) ? value : null; } catch { return null; }
}

const dbUrl = loopbackOrNull(process.env.TEST_DATABASE_URL || '');
const redisUrl = loopbackOrNull(process.env.TEST_REDIS_URL || '');
const enabled = Boolean(dbUrl && redisUrl);

if (!enabled) {
  console.warn('[api-tests] Skipped: set TEST_DATABASE_URL and TEST_REDIS_URL to loopback (throwaway) services.');
}

const PORT = 4010;
const BASE = `http://127.0.0.1:${PORT}`;
const FRONTEND = 'http://localhost:3001';
const PASSWORD = 'Str0ng!Passw0rd#1';
const JWT_SECRET = crypto.randomBytes(48).toString('hex');
const CRON_SECRET = crypto.randomBytes(24).toString('hex');

let prisma; let redis; let argon2;

// ─── tiny HTTP client with a cookie jar ──────────────────────────────────────
class Client {
  constructor() { this.cookies = {}; }
  async call(method, path, { body, headers = {}, csrf = true, raw } = {}) {
    const h = { ...headers };
    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      this.cookies.csrfToken ||= crypto.randomBytes(32).toString('hex');
      h['x-csrf-token'] = h['x-csrf-token'] ?? this.cookies.csrfToken;
    }
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) h.cookie = cookie;
    let payload;
    if (raw !== undefined) { payload = raw; h['content-type'] ||= 'application/json'; }
    else if (body !== undefined) { payload = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: 'manual' });
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      const [pair] = sc.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq); const value = pair.slice(eq + 1);
      if (/expires=Thu, 01 Jan 1970/i.test(sc) || value === '') delete this.cookies[name]; else this.cookies[name] = value;
    }
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, headers: res.headers, json, text, setCookie: res.headers.getSetCookie?.() ?? [] };
  }
  get(p, o) { return this.call('GET', p, o); }
  post(p, body, o) { return this.call('POST', p, { body, ...o }); }
  put(p, body, o) { return this.call('PUT', p, { body, ...o }); }
  patch(p, body, o) { return this.call('PATCH', p, { body, ...o }); }
  del(p, o) { return this.call('DELETE', p, o); }
}

async function makeUser(label, { role = 'USER', allowLiveLocation = false } = {}) {
  const user = await prisma.user.create({
    data: {
      name: `pt-${label}-${crypto.randomBytes(3).toString('hex')}`,
      email: `pt-${label}-${crypto.randomBytes(3).toString('hex')}@example.test`,
      dob: new Date('1999-01-01'), gender: 'OTHER', phone: '+620000000000',
      passwordHash: await argon2.hash(PASSWORD), domicileLat: -6.2, domicileLng: 106.8,
      role, isEmailVerified: true, allowLiveLocation,
    },
  });
  return user;
}

async function login(user) {
  const c = new Client();
  const r = await c.post('/api/auth/login', { email: user.email, password: PASSWORD });
  assert.equal(r.status, 200, `login failed for ${user.email}: ${r.text}`);
  return c;
}

async function jit(client) {
  const r = await client.post('/api/admin/verify-jit', { password: PASSWORD });
  assert.equal(r.status, 200, r.text);
  return r.json.jitToken;
}

describe('Kalceria API', { skip: !enabled }, () => {
  let admin; let userA; let userB;
  let adminC; let aC; let bC; let anon;

  before(async () => {
    process.env.TEST_MODE = '1';
    process.env.DATABASE_URL = dbUrl;
    process.env.DIRECT_URL = dbUrl;
    process.env.REDIS_URL = redisUrl;
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.FRONTEND_URL = FRONTEND;
    process.env.PORT = String(PORT);
    process.env.NODE_ENV = 'test';
    delete process.env.VERCEL;
    delete process.env.ENABLE_EMAIL_AUTH;
    delete process.env.ENABLE_PUBLIC_SIGNUP;

    argon2 = (await import('argon2')).default;
    prisma = (await import('../lib/prisma.js')).default;
    redis = (await import('../lib/redis.js')).redis;
    await import('../api/index.js');
    await new Promise((r) => setTimeout(r, 400));

    // Safety net: the Prisma client must be pointed at the throwaway DB.
    const [{ current_database }] = await prisma.$queryRaw`SELECT current_database()`;
    assert.equal(current_database, new URL(dbUrl).pathname.slice(1));
    await redis.flushdb();

    admin = await makeUser('admin', { role: 'ADMIN' });
    userA = await makeUser('a', { allowLiveLocation: true });
    userB = await makeUser('b', { allowLiveLocation: false });
    anon = new Client();
    adminC = await login(admin);
    aC = await login(userA);
    bC = await login(userB);
  });

  after(async () => {
    try { await redis?.flushdb(); } catch { /* ignore */ }
    try { await prisma?.$disconnect(); } catch { /* ignore */ }
    try { redis?.disconnect(); } catch { /* ignore */ }
    setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
  });

  // ─── Health + transport hardening ──────────────────────────────────────────
  describe('health and headers', () => {
    it('GET /api/health reports DB + Redis up', async () => {
      const r = await anon.get('/api/health');
      assert.equal(r.status, 200);
      assert.equal(r.json.status, 'ok');
    });
    it('sets security headers and hides x-powered-by', async () => {
      const r = await anon.get('/api/health');
      assert.equal(r.headers.get('x-powered-by'), null);
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(r.headers.get('x-frame-options'), 'DENY');
      assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
      assert.match(r.headers.get('cache-control'), /no-store/);
    });
    it('unknown route returns a clean 404 with no stack trace', async () => {
      const r = await anon.get('/api/definitely-not-a-route');
      assert.equal(r.status, 404);
      assert.doesNotMatch(r.text, /node_modules|at .*\(.*:\d+:\d+\)/);
    });
  });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  describe('CORS', () => {
    it('allows the configured frontend origin with credentials', async () => {
      const r = await anon.get('/api/health', { headers: { origin: FRONTEND } });
      assert.equal(r.headers.get('access-control-allow-origin'), FRONTEND);
      assert.equal(r.headers.get('access-control-allow-credentials'), 'true');
    });
    it('rejects an unknown origin', async () => {
      const r = await anon.get('/api/health', { headers: { origin: 'https://evil.example' } });
      assert.equal(r.status, 403);
      assert.equal(r.headers.get('access-control-allow-origin'), null);
    });
    it('never reflects the null origin or uses a wildcard', async () => {
      const r = await anon.get('/api/health', { headers: { origin: 'null' } });
      assert.notEqual(r.headers.get('access-control-allow-origin'), '*');
      assert.notEqual(r.headers.get('access-control-allow-origin'), 'null');
    });
  });

  // ─── CSRF ──────────────────────────────────────────────────────────────────
  describe('CSRF', () => {
    it('GET /auth/csrf issues a token and cookie', async () => {
      const c = new Client();
      const r = await c.get('/api/auth/csrf');
      assert.equal(r.status, 200);
      assert.match(r.json.csrfToken, /^[a-f0-9]{64}$/);
    });
    it('rejects state-changing requests without a CSRF token', async () => {
      const r = await aC.post('/api/broadcast', { message: 'hello' }, { csrf: false });
      assert.equal(r.status, 403);
    });
    it('rejects a mismatched CSRF header', async () => {
      const r = await aC.post('/api/broadcast', { message: 'hello' }, { headers: { 'x-csrf-token': 'x'.repeat(64) } });
      assert.equal(r.status, 403);
    });
  });

  // ─── Authentication ────────────────────────────────────────────────────────
  describe('authentication', () => {
    it('login sets httpOnly session cookie + csrf token, never returns the hash', async () => {
      const c = new Client();
      const r = await c.post('/api/auth/login', { email: userA.email, password: PASSWORD });
      assert.equal(r.status, 200);
      assert.ok(r.json.csrfToken);
      assert.equal(r.json.passwordHash, undefined);
      const session = r.setCookie.find((s) => s.startsWith('token='));
      assert.match(session, /HttpOnly/i);
      assert.match(session, /SameSite=Lax/i);
    });
    it('wrong password and unknown account are indistinguishable', async () => {
      const wrong = await anon.post('/api/auth/login', { email: userA.email, password: 'Wrong!Pass1' });
      const unknown = await anon.post('/api/auth/login', { email: 'nobody@example.test', password: 'Wrong!Pass1' });
      assert.equal(wrong.status, 401);
      assert.equal(unknown.status, 401);
      assert.deepEqual(wrong.json, unknown.json);
    });
    it('login timing does not reveal whether an account exists', async () => {
      const time = async (email) => {
        const t = process.hrtime.bigint();
        await new Client().post('/api/auth/login', { email, password: 'Wrong!Pass1' });
        return Number(process.hrtime.bigint() - t) / 1e6;
      };
      // Use distinct emails so the per-identity limiter (10/15min) is not hit.
      const known = []; const unknown = [];
      for (let i = 0; i < 3; i++) {
        known.push(await time(userB.email));
        unknown.push(await time(`ghost-${i}-${crypto.randomBytes(2).toString('hex')}@example.test`));
      }
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      assert.ok(avg(unknown) > avg(known) * 0.4, `unknown ${avg(unknown).toFixed(1)}ms vs known ${avg(known).toFixed(1)}ms`);
    });
    it('rejects non-string / object credentials without a 500 (NoSQL-style injection)', async () => {
      for (const body of [
        { email: { $ne: null }, password: PASSWORD },
        { email: userA.email, password: { $gt: '' } },
        { username: ['a'], password: PASSWORD },
        {},
      ]) {
        const r = await new Client().post('/api/auth/login', body);
        assert.ok([400, 401].includes(r.status), `status ${r.status} for ${JSON.stringify(body)}`);
      }
    });
    it('rejects oversized passwords', async () => {
      const r = await new Client().post('/api/auth/login', { email: userA.email, password: 'A1!'.repeat(100) });
      assert.equal(r.status, 401);
    });
    it('/users/me needs a session and never leaks sensitive fields', async () => {
      assert.equal((await anon.get('/api/users/me')).status, 401);
      const r = await aC.get('/api/users/me');
      assert.equal(r.status, 200);
      for (const k of ['passwordHash', 'email', 'phone', 'dob', 'role']) assert.equal(r.json.user[k], undefined, k);
    });
    it('public signup is closed by default', async () => {
      const r = await anon.post('/api/auth/register', { name: 'x', email: 'x@example.test', phone: '12345', dob: '2000-01-01', password: PASSWORD });
      assert.equal(r.status, 403);
    });
    it('email flows are disabled by default', async () => {
      for (const p of ['/api/auth/otp/request', '/api/auth/otp/verify', '/api/auth/password/reset-request', '/api/auth/password/reset']) {
        assert.equal((await anon.post(p, { email: 'a@example.test' })).status, 503, p);
      }
    });
    it('registration validates input once signup is enabled', async () => {
      // The signup limiter (10/h per IP) also counts the "closed" probe above.
      const stale = await redis.keys('rate:signup-ip:*');
      if (stale.length) await redis.del(...stale);
      process.env.ENABLE_PUBLIC_SIGNUP = 'true'; process.env.ENABLE_EMAIL_AUTH = 'true';
      try {
        const base = { name: 'Reg', email: `reg-${crypto.randomBytes(3).toString('hex')}@example.test`, phone: '+62812345', dob: '2000-01-01', password: PASSWORD };
        const bad = [
          { ...base, email: 'not-an-email' },
          { ...base, password: 'weak' },
          { ...base, password: 'alllowercase1!' },
          { ...base, domicileLat: 999 },
          { ...base, domicileLng: -999 },
          { ...base, gender: 'ROBOT' },
          { ...base, name: 'n'.repeat(81) },
          { ...base, dob: 'garbage' },
          { ...base, phone: '1' },
        ];
        for (const b of bad) {
          const r = await new Client().post('/api/auth/register', b);
          assert.equal(r.status, 400, JSON.stringify(b).slice(0, 80));
        }
        const dupe = await new Client().post('/api/auth/register', { ...base, email: userA.email });
        assert.equal(dupe.status, 409);
      } finally {
        delete process.env.ENABLE_PUBLIC_SIGNUP; delete process.env.ENABLE_EMAIL_AUTH;
      }
    });
    it('check-username handles injection-style input safely', async () => {
      for (const u of ["' OR '1'='1", '%00', '<script>alert(1)</script>', 'a'.repeat(200)]) {
        const r = await anon.get(`/api/auth/check-username/${encodeURIComponent(u)}`);
        assert.ok([200, 400].includes(r.status), `${u.slice(0, 20)} -> ${r.status}`);
      }
    });
  });

  // ─── JWT / session forgery ─────────────────────────────────────────────────
  describe('token forgery and session revocation', () => {
    const claims = () => ({ userId: userA.id, email: userA.email });
    const withToken = async (token) => {
      const c = new Client(); c.cookies.token = token; return c.get('/api/users/me');
    };
    it('rejects alg=none', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify({ ...claims(), iss: 'kalceria-api', aud: 'kalceria-web', jti: crypto.randomUUID() })).toString('base64url');
      assert.equal((await withToken(`${header}.${body}.`)).status, 401);
    });
    it('rejects a token signed with the wrong secret', async () => {
      const t = jwt.sign(claims(), 'attacker-secret', { algorithm: 'HS256', audience: 'kalceria-web', issuer: 'kalceria-api', jwtid: crypto.randomUUID() });
      assert.equal((await withToken(t)).status, 401);
    });
    it('rejects a correctly-signed token with no server-side session (jti not in Redis)', async () => {
      const t = jwt.sign(claims(), JWT_SECRET, { algorithm: 'HS256', audience: 'kalceria-web', issuer: 'kalceria-api', jwtid: crypto.randomUUID(), expiresIn: 600 });
      assert.equal((await withToken(t)).status, 401);
    });
    it('rejects wrong audience / issuer', async () => {
      const jti = crypto.randomUUID();
      await redis.set(`auth:session:${jti}`, userA.id, 'EX', 600);
      const wrongAud = jwt.sign(claims(), JWT_SECRET, { algorithm: 'HS256', audience: 'other', issuer: 'kalceria-api', jwtid: jti });
      const wrongIss = jwt.sign(claims(), JWT_SECRET, { algorithm: 'HS256', audience: 'kalceria-web', issuer: 'other', jwtid: jti });
      assert.equal((await withToken(wrongAud)).status, 401);
      assert.equal((await withToken(wrongIss)).status, 401);
    });
    it('rejects expired tokens', async () => {
      const jti = crypto.randomUUID();
      await redis.set(`auth:session:${jti}`, userA.id, 'EX', 600);
      const t = jwt.sign(claims(), JWT_SECRET, { algorithm: 'HS256', audience: 'kalceria-web', issuer: 'kalceria-api', jwtid: jti, expiresIn: -10 });
      assert.equal((await withToken(t)).status, 401);
    });
    it('a session for user A cannot be replayed as user B', async () => {
      const jti = crypto.randomUUID();
      await redis.set(`auth:session:${jti}`, userA.id, 'EX', 600);
      const t = jwt.sign({ userId: userB.id, email: userB.email }, JWT_SECRET, { algorithm: 'HS256', audience: 'kalceria-web', issuer: 'kalceria-api', jwtid: jti });
      assert.equal((await withToken(t)).status, 401);
    });
    it('a JIT token is not accepted as a session token', async () => {
      const t = await jit(adminC);
      assert.equal((await withToken(t)).status, 401);
    });
    it('logout revokes the server-side session', async () => {
      const c = await login(userB);
      const stolen = c.cookies.token;
      assert.equal((await c.get('/api/users/me')).status, 200);
      assert.equal((await c.post('/api/auth/logout')).status, 200);
      const replay = new Client(); replay.cookies.token = stolen;
      assert.equal((await replay.get('/api/users/me')).status, 401);
    });
  });

  // ─── Authorization matrix ──────────────────────────────────────────────────
  describe('authorization matrix', () => {
    const adminRoutes = [
      ['GET', '/api/admin/events'], ['POST', '/api/admin/events'], ['PUT', '/api/admin/events/x'], ['DELETE', '/api/admin/events/x'],
      ['GET', '/api/admin/merch'], ['POST', '/api/admin/merch'], ['PUT', '/api/admin/merch/x'], ['PATCH', '/api/admin/merch/x/soldout'],
      ['POST', '/api/admin/merch/x/sales'], ['DELETE', '/api/admin/merch/x'],
      ['GET', '/api/admin/registrations'], ['PATCH', '/api/admin/registrations/x/payment'], ['DELETE', '/api/admin/registrations/x'], ['PATCH', '/api/admin/registrations/x/pdf'],
      ['GET', '/api/admin/services'], ['PATCH', '/api/admin/services/x/payment'], ['PATCH', '/api/admin/services/x/status'], ['DELETE', '/api/admin/services/x'], ['PATCH', '/api/admin/services/x/pdf'],
      ['GET', '/api/admin/bookings'], ['PATCH', '/api/admin/bookings/x/payment'], ['DELETE', '/api/admin/bookings/x'], ['PATCH', '/api/admin/bookings/x/pdf'],
      ['GET', '/api/admin/users'], ['GET', '/api/admin/users/x'], ['PATCH', '/api/admin/users/x/role'], ['DELETE', '/api/admin/users/x'],
      ['GET', '/api/admin/comments'], ['PATCH', '/api/admin/comments/x/pin'], ['DELETE', '/api/admin/comments/x'],
      ['GET', '/api/admin/earnings'], ['GET', '/api/admin/logs'], ['GET', '/api/admin/system/logs'], ['POST', '/api/admin/system/reset'],
      ['POST', '/api/admin/verify-jit'], ['POST', '/api/email'], ['POST', '/api/media'],
    ];
    const userRoutes = [
      ['GET', '/api/users/me'], ['POST', '/api/events/x/register'], ['POST', '/api/location/update'], ['PATCH', '/api/location/visibility'],
      ['GET', '/api/location/nearby?lat=0&lng=0'], ['POST', '/api/mini-events'], ['GET', '/api/mini-events/active'], ['PUT', '/api/mini-events/x'],
      ['DELETE', '/api/mini-events/x'], ['POST', '/api/services/book'], ['POST', '/api/services/request'], ['DELETE', '/api/services/request/x'],
      ['POST', '/api/map/telemetry'], ['GET', '/api/map/users'], ['GET', '/api/map/kalcerians'],
      ['POST', '/api/broadcast'], ['GET', '/api/broadcast/me'], ['PUT', '/api/broadcast'], ['DELETE', '/api/broadcast'],
    ];
    it(`all ${adminRoutes.length} admin routes reject anonymous callers with 401`, async () => {
      for (const [m, p] of adminRoutes) {
        const r = await anon.call(m, p, { body: m === 'GET' ? undefined : {} });
        assert.equal(r.status, 401, `${m} ${p} -> ${r.status}`);
      }
    });
    it('all admin routes reject a normal user with 403 (never 200/500)', async () => {
      for (const [m, p] of adminRoutes) {
        const r = await aC.call(m, p, { body: m === 'GET' ? undefined : {} });
        assert.equal(r.status, 403, `${m} ${p} -> ${r.status}`);
      }
    });
    it(`all ${userRoutes.length} member routes reject anonymous callers with 401`, async () => {
      for (const [m, p] of userRoutes) {
        const r = await anon.call(m, p, { body: m === 'GET' ? undefined : {} });
        assert.equal(r.status, 401, `${m} ${p} -> ${r.status}`);
      }
    });
    it('destructive admin routes demand a JIT token even for admins', async () => {
      for (const [m, p] of [
        ['DELETE', '/api/admin/events/x'], ['DELETE', '/api/admin/merch/x'], ['DELETE', '/api/admin/registrations/x'],
        ['DELETE', '/api/admin/services/x'], ['DELETE', '/api/admin/bookings/x'], ['PATCH', '/api/admin/users/x/role'],
        ['DELETE', '/api/admin/users/x'], ['DELETE', '/api/admin/comments/x'], ['POST', '/api/admin/system/reset'],
      ]) {
        const r = await adminC.call(m, p, { body: {} });
        assert.equal(r.status, 403, `${m} ${p} -> ${r.status}`);
        assert.match(r.json.error, /JIT/i);
      }
    });
    it('a role stored only in the JWT cannot grant admin (role is re-read from the DB)', async () => {
      const jti = crypto.randomUUID();
      await redis.set(`auth:session:${jti}`, userA.id, 'EX', 600);
      const t = jwt.sign({ userId: userA.id, email: userA.email, role: 'ADMIN' }, JWT_SECRET, { algorithm: 'HS256', audience: 'kalceria-web', issuer: 'kalceria-api', jwtid: jti });
      const c = new Client(); c.cookies.token = t;
      assert.equal((await c.get('/api/admin/users')).status, 403);
    });
  });

  // ─── JIT ───────────────────────────────────────────────────────────────────
  describe('JIT step-up tokens', () => {
    it('refuses JIT issuance with a wrong password', async () => {
      assert.equal((await adminC.post('/api/admin/verify-jit', { password: 'Nope!Nope1' })).status, 401);
    });
    it('a JIT token works exactly once (replay is rejected)', async () => {
      const victim = await makeUser('jit-victim');
      const token = await jit(adminC);
      const first = await adminC.del(`/api/admin/users/${victim.id}`, { headers: { 'x-jit-token': token } });
      assert.equal(first.status, 200, first.text);
      const second = await adminC.del(`/api/admin/users/${victim.id}`, { headers: { 'x-jit-token': token } });
      assert.equal(second.status, 403);
    });
    it('a JIT token is bound to the admin who requested it', async () => {
      const otherAdmin = await makeUser('admin2', { role: 'ADMIN' });
      const otherC = await login(otherAdmin);
      const token = await jit(adminC);
      const r = await otherC.del(`/api/admin/users/${userB.id}`, { headers: { 'x-jit-token': token } });
      assert.equal(r.status, 403);
    });
    it('rejects forged JIT tokens', async () => {
      const t = jwt.sign({ userId: admin.id, isJit: true }, 'attacker', { algorithm: 'HS256', audience: 'kalceria-admin-action', issuer: 'kalceria-api', jwtid: crypto.randomUUID(), expiresIn: 600 });
      assert.equal((await adminC.del(`/api/admin/users/${userB.id}`, { headers: { 'x-jit-token': t } })).status, 403);
    });
    it('an admin cannot delete or demote themselves, and the last admin is protected', async () => {
      let t = await jit(adminC);
      assert.equal((await adminC.del(`/api/admin/users/${admin.id}`, { headers: { 'x-jit-token': t } })).status, 400);
      t = await jit(adminC);
      assert.equal((await adminC.patch(`/api/admin/users/${admin.id}/role`, { role: 'USER' }, { headers: { 'x-jit-token': t } })).status, 400);
    });
  });

  // ─── Object-level authorization (IDOR) ─────────────────────────────────────
  describe('object-level authorization (IDOR)', () => {
    it("user B cannot edit or delete user A's mini event", async () => {
      const created = await aC.post('/api/mini-events', { title: 'A ride', description: 'x', lat: -6.2, lng: 106.8 });
      assert.equal(created.status, 201, created.text);
      const id = created.json.event.id;
      assert.equal((await bC.put(`/api/mini-events/${id}`, { title: 'hijack', description: '', lat: 0, lng: 0 })).status, 404);
      assert.equal((await bC.del(`/api/mini-events/${id}`)).status, 404);
      const still = await prisma.miniEvent.findUnique({ where: { id } });
      assert.equal(still.title, 'A ride');
      assert.equal((await aC.del(`/api/mini-events/${id}`)).status, 200);
    });
    it("user B cannot delete user A's service request", async () => {
      const sb = await prisma.serviceBooking.create({
        data: { requestorId: userA.id, serviceType: 'SHOOTING', locationString: 'Depok' },
      });
      const r = await bC.del(`/api/services/request/${sb.id}`);
      assert.ok([403, 404].includes(r.status), String(r.status));
      assert.ok(await prisma.serviceBooking.findUnique({ where: { id: sb.id } }));
    });
    it('broadcasts are strictly per-user', async () => {
      assert.equal((await aC.post('/api/broadcast', { message: 'only mine' })).status, 201);
      const mine = await aC.get('/api/broadcast/me');
      const theirs = await bC.get('/api/broadcast/me');
      assert.equal(mine.json.broadcast.message, 'only mine');
      assert.equal(theirs.json.broadcast, null);
      assert.equal((await aC.del('/api/broadcast')).status, 200);
    });
    it('mass-assignment: users cannot set their own role via profile-style bodies', async () => {
      await aC.patch('/api/location/visibility', { allowLiveLocation: true, role: 'ADMIN', id: userB.id });
      const fresh = await prisma.user.findUnique({ where: { id: userA.id } });
      assert.equal(fresh.role, 'USER');
    });
  });

  // ─── Input validation ──────────────────────────────────────────────────────
  describe('input validation', () => {
    it('location/update rejects out-of-range and non-numeric coordinates', async () => {
      for (const b of [{ lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: 'abc', lng: 0 }, {}, { lat: null, lng: null }]) {
        assert.equal((await aC.post('/api/location/update', b)).status, 400, JSON.stringify(b));
      }
    });
    it('location/nearby bounds the radius', async () => {
      assert.equal((await aC.get('/api/location/nearby?lat=0&lng=0&radius=101')).status, 400);
      assert.equal((await aC.get('/api/location/nearby?lat=0&lng=0&radius=-1')).status, 400);
      assert.equal((await aC.get('/api/location/nearby?lat=999&lng=0')).status, 400);
    });
    it('mini-event and broadcast enforce length limits', async () => {
      assert.equal((await aC.post('/api/mini-events', { title: 't'.repeat(81), lat: 0, lng: 0 })).status, 400);
      assert.equal((await aC.post('/api/mini-events', { title: 'ok', description: 'd'.repeat(241), lat: 0, lng: 0 })).status, 400);
      assert.equal((await aC.post('/api/broadcast', { message: 'm'.repeat(121) })).status, 400);
      assert.equal((await aC.post('/api/broadcast', { message: 12345 })).status, 400);
    });
    it('pagination rejects hostile cursors and limits', async () => {
      for (const q of ['limit=abc', 'limit=-5', 'limit=100000', 'cursor=%00%00', 'cursor=not-base64!!']) {
        const r = await aC.get(`/api/mini-events/active?${q}`);
        assert.ok([200, 400].includes(r.status), `${q} -> ${r.status}`);
        assert.notEqual(r.status, 500, q);
      }
    });
    it('media filter is allow-listed', async () => {
      assert.equal((await anon.get('/api/media?filter=recent')).status, 200);
      assert.equal((await anon.get('/api/media?filter=%27%3B%20DROP%20TABLE%20users%3B--')).status, 400);
    });
    it('comments validate length, type and identity', async () => {
      assert.equal((await anon.post('/api/comments', { content: 'hey', type: 'IDEA' })).status, 400);
      assert.equal((await anon.post('/api/comments', { content: 'long enough', type: 'HACK' })).status, 400);
      assert.equal((await anon.post('/api/comments', { content: 'long enough', type: 'IDEA', identity: 'User' })).status, 401);
    });
    it('malformed JSON and oversized bodies do not crash the server', async () => {
      const bad = await new Client().call('POST', '/api/auth/login', { raw: '{"email":' });
      assert.ok([400, 403].includes(bad.status), String(bad.status));
      const big = await new Client().call('POST', '/api/auth/login', { raw: JSON.stringify({ email: 'a', password: 'x'.repeat(1_200_000) }) });
      assert.ok([413, 403].includes(big.status), String(big.status));
      assert.equal((await anon.get('/api/health')).status, 200);
    });
    it('prototype-pollution style bodies are harmless', async () => {
      const r = await new Client().call('POST', '/api/auth/login', { raw: '{"__proto__":{"isAdmin":true},"email":"a@example.test","password":"x"}' });
      assert.ok([400, 401].includes(r.status));
      assert.equal(({}).isAdmin, undefined);
    });
    it('admin media creation only accepts https or site-relative URLs', async () => {
      for (const imageUrl of ['javascript:alert(1)', 'http://insecure.example/x.png', '//evil.example/x.png', 'data:text/html,hi', '/ok\\..\\x']) {
        assert.equal((await adminC.post('/api/media', { title: 't', imageUrl })).status, 400, imageUrl);
      }
      assert.equal((await adminC.post('/api/media', { title: 't', imageUrl: 'https://cdn.example/x.png' })).status, 201);
      assert.equal((await adminC.post('/api/media', { title: 't', imageUrl: '/uploads/x.png' })).status, 201);
    });
  });

  // ─── Location privacy ──────────────────────────────────────────────────────
  describe('location privacy', () => {
    const EXACT = { lat: -6.200123456, lng: 106.816789012 };
    before(async () => {
      // Clear only location state; flushing everything would also drop the sessions.
      for (const pattern of ['live:*', 'cache:*', 'telemetry:*']) {
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(...keys);
      }
      await redis.del('active_users');
      await aC.post('/api/location/update', EXACT);
    });
    it('opted-out users cannot publish a location', async () => {
      assert.equal((await bC.post('/api/location/update', EXACT)).status, 403);
    });
    it('exact coordinates never appear in map or nearby responses', async () => {
      const map = await bC.get('/api/map/users');
      const nearby = await bC.get(`/api/location/nearby?lat=${EXACT.lat}&lng=${EXACT.lng}&radius=5`);
      for (const r of [map, nearby]) {
        assert.equal(r.status, 200);
        assert.ok(!r.text.includes('6.200123'), 'raw latitude leaked');
        assert.ok(!r.text.includes('106.816789'), 'raw longitude leaked');
      }
      const mine = map.json.users.find((u) => u.id === userA.id);
      assert.ok(mine, 'opted-in user should be listed');
      const grid = 0.012;
      assert.ok(Math.abs(mine.lat / grid - Math.round(mine.lat / grid)) < 1e-6, 'lat should be snapped to the privacy grid');
    });
    it('responses never include private account fields', async () => {
      const kal = await bC.get('/api/map/kalcerians');
      const map = await bC.get('/api/map/users');
      for (const r of [kal, map]) {
        for (const field of ['email', 'phone', 'passwordHash', 'dob', 'domicileLat', 'domicileLng', 'role']) {
          assert.doesNotMatch(r.text, new RegExp(`"${field}"`), field);
        }
      }
    });
    it('turning visibility off removes the user from the map immediately', async () => {
      assert.equal((await aC.patch('/api/location/visibility', { allowLiveLocation: false })).status, 200);
      await redis.del('cache:map_users_enriched');
      const map = await bC.get('/api/map/users');
      assert.ok(!map.json.users.some((u) => u.id === userA.id));
      assert.equal(await redis.get(`live:user:${userA.id}`), null);
      await aC.patch('/api/location/visibility', { allowLiveLocation: true });
    });
    it('telemetry is refused for users who have not opted in, and stores nothing', async () => {
      const before = await redis.llen(`telemetry:${userB.id}`);
      assert.equal((await bC.post('/api/map/telemetry', EXACT)).status, 403);
      assert.equal(await redis.llen(`telemetry:${userB.id}`), before);
    });
    it('telemetry retention is capped at 24 hours for opted-in users', async () => {
      assert.equal((await aC.post('/api/map/telemetry', EXACT)).status, 200);
      const ttl = await redis.ttl(`telemetry:${userA.id}`);
      assert.ok(ttl > 0 && ttl <= 24 * 60 * 60, `ttl ${ttl}`);
    });
    it('rapid location updates are throttled per user', async () => {
      await redis.del(`live:cooldown:${userA.id}`);
      assert.equal((await aC.post('/api/location/update', EXACT)).status, 200);
      assert.equal((await aC.post('/api/location/update', EXACT)).status, 429);
    });
  });

  // ─── Public endpoints ──────────────────────────────────────────────────────
  describe('public endpoints', () => {
    it('GET /events and /media and /services/bookings respond without auth', async () => {
      for (const p of ['/api/events', '/api/media', '/api/services/bookings']) {
        const r = await anon.get(p);
        assert.equal(r.status, 200, `${p} -> ${r.status} ${r.text.slice(0, 120)}`);
      }
    });
    it('public booking listing does not expose requester identity', async () => {
      await prisma.serviceBooking.create({
        data: { requestorId: userA.id, serviceType: 'EO', locationString: 'Jakarta', contactPerson: 'Secret Person', whatsapp: '+6299999999' },
      });
      const r = await anon.get('/api/services/bookings');
      assert.equal(r.status, 200);
      for (const needle of ['Secret Person', '+6299999999', userA.email, userA.id]) {
        assert.ok(!r.text.includes(needle), `leaked ${needle}`);
      }
    });
    it('GET /events/:id returns 404 (not 500) for unknown or hostile ids', async () => {
      for (const id of ['nope', "' OR 1=1 --", '../../etc/passwd', '%00']) {
        const r = await anon.get(`/api/events/${encodeURIComponent(id)}`);
        assert.ok([400, 404].includes(r.status), `${id} -> ${r.status}`);
      }
    });
    it('redirect endpoint only ever targets the configured frontend (no open redirect)', async () => {
      for (const id of ['abc', 'https://evil.example', '//evil.example', '..%2f..%2fevil']) {
        const r = await anon.get(`/api/redirect/event/${encodeURIComponent(id)}`);
        assert.equal(r.status, 302);
        assert.equal(new URL(r.headers.get('location')).origin, FRONTEND, id);
      }
    });
  });

  // ─── Cron ──────────────────────────────────────────────────────────────────
  describe('cron endpoint', () => {
    it('rejects missing and wrong secrets, accepts the right one', async () => {
      assert.equal((await anon.get('/api/cron/cleanup')).status, 401);
      assert.equal((await anon.get('/api/cron/cleanup', { headers: { authorization: 'Bearer wrong' } })).status, 401);
      assert.equal((await anon.get('/api/cron/cleanup', { headers: { authorization: `Bearer ${CRON_SECRET.slice(0, -1)}x` } })).status, 401);
      const ok = await anon.get('/api/cron/cleanup', { headers: { authorization: `Bearer ${CRON_SECRET}` } });
      assert.equal(ok.status, 200);
    });
    it('is disabled when no secret is configured', async () => {
      const saved = process.env.CRON_SECRET; delete process.env.CRON_SECRET;
      try { assert.equal((await anon.get('/api/cron/cleanup', { headers: { authorization: 'Bearer ' } })).status, 503); }
      finally { process.env.CRON_SECRET = saved; }
    });
  });

  // ─── Admin happy paths ─────────────────────────────────────────────────────
  describe('admin functionality', () => {
    it('admin can read lists without leaking password hashes', async () => {
      for (const p of ['/api/admin/users', '/api/admin/events', '/api/admin/merch', '/api/admin/registrations', '/api/admin/services', '/api/admin/bookings', '/api/admin/comments', '/api/admin/earnings', '/api/admin/logs']) {
        const r = await adminC.get(p);
        assert.equal(r.status, 200, `${p} -> ${r.status} ${r.text.slice(0, 120)}`);
        assert.doesNotMatch(r.text, /passwordHash|\$argon2/);
      }
    });
    it('user detail never includes the password hash', async () => {
      const r = await adminC.get(`/api/admin/users/${userA.id}`);
      assert.equal(r.status, 200);
      assert.doesNotMatch(r.text, /passwordHash|\$argon2/);
    });
    it('destructive admin actions are written to the audit log', async () => {
      const victim = await makeUser('audit-victim');
      const t = await jit(adminC);
      assert.equal((await adminC.del(`/api/admin/users/${victim.id}`, { headers: { 'x-jit-token': t } })).status, 200);
      const log = await prisma.auditLog.findFirst({ where: { action: 'USER_DELETED', details: { contains: victim.id } } });
      assert.ok(log, 'audit entry missing');
    });
  });

  // ─── Rate limiting (kept last: it exhausts limiter budgets) ────────────────
  describe('rate limiting', () => {
    it('throttles repeated logins for one identity with 429 + Retry-After', async () => {
      const target = `ratelimit-${crypto.randomBytes(3).toString('hex')}@example.test`;
      let limited = null;
      for (let i = 0; i < 14; i++) {
        const r = await new Client().post('/api/auth/login', { email: target, password: 'Wrong!Pass1' });
        if (r.status === 429) { limited = r; break; }
      }
      assert.ok(limited, 'expected a 429 within 14 attempts');
      assert.ok(limited.headers.get('retry-after'));
    });
    it('a throttled identity does not block other accounts', async () => {
      // Every login in this suite shares one IP, so reset only the per-IP budget.
      const ipKeys = await redis.keys('rate:login-ip:*');
      if (ipKeys.length) await redis.del(...ipKeys);
      const r = await new Client().post('/api/auth/login', { email: userA.email, password: PASSWORD });
      assert.equal(r.status, 200);
    });
    it('anonymous comment posting is throttled', async () => {
      let limited = false;
      for (let i = 0; i < 14; i++) {
        const r = await anon.post('/api/comments', { content: 'throttle probe comment', type: 'IDEA', identity: 'Guest' });
        if (r.status === 429) { limited = true; break; }
      }
      assert.ok(limited);
    });
    it('/admin/verify-jit brute force is throttled', async () => {
      let limited = false;
      for (let i = 0; i < 14; i++) {
        const r = await adminC.post('/api/admin/verify-jit', { password: 'Bad!Guess1' });
        if (r.status === 429) { limited = true; break; }
      }
      assert.ok(limited);
    });
  });
});


import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createJwtToken, verifyJwtToken } from '../src/auth.js';
import { AtlasDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

test('auth.js: password hashing and verification', () => {
  const password = 'SuperSecretPassword123!';
  const hash = hashPassword(password);

  assert.ok(hash.includes(':'), 'Hash must contain salt:key delimiter');
  assert.equal(verifyPassword(password, hash), true, 'Correct password must verify');
  assert.equal(verifyPassword('WrongPassword', hash), false, 'Wrong password must fail');
  assert.equal(verifyPassword('', hash), false, 'Empty password must fail');
  assert.equal(verifyPassword(password, 'invalid:hash'), false, 'Corrupted hash must fail safely');
});

test('auth.js: stateless JWT token creation and verification', () => {
  const secret = 'test-secret-key-999';
  const payload = { sub: 'user-123', email: 'test@atlaslabs.dev', role: 'pro' };

  const token = createJwtToken(payload, secret, 3600);
  assert.ok(typeof token === 'string' && token.split('.').length === 3, 'Token must have 3 segments');

  const decoded = verifyJwtToken(token, secret);
  assert.equal(decoded.sub, 'user-123');
  assert.equal(decoded.email, 'test@atlaslabs.dev');
  assert.equal(decoded.role, 'pro');
  assert.ok(decoded.exp > decoded.iat);

  // Tampered token
  const tamperedToken = token.slice(0, -4) + 'abcd';
  assert.throws(() => verifyJwtToken(tamperedToken, secret), /Invalid token signature/);

  // Wrong secret
  assert.throws(() => verifyJwtToken(token, 'different-secret'), /Invalid token signature/);

  // Expired token
  const expiredToken = createJwtToken(payload, secret, -10);
  assert.throws(() => verifyJwtToken(expiredToken, secret), /Token expired/);
});

test('db.js: user creation, retrieval, and usage aggregation', () => {
  const db = new AtlasDatabase(':memory:');

  const user = db.createUser({
    id: 'usr-1',
    email: 'alex@atlaslabs.dev',
    password_hash: 'hash-abc',
    subscription_status: 'pro',
  });

  assert.equal(user.id, 'usr-1');
  assert.equal(user.email, 'alex@atlaslabs.dev');
  assert.equal(user.subscription_status, 'pro');

  const fetched = db.getUserByEmail('ALEX@atlaslabs.dev'); // case-insensitive
  assert.equal(fetched.id, 'usr-1');

  // Insert usage logs for web and desktop
  db.insertUsageLog({
    id: 'log-1',
    user_id: 'usr-1',
    action_performed: 'ai_completion',
    tokens_used_or_duration: 150,
    platform: 'web',
  });

  db.insertUsageLog({
    id: 'log-2',
    user_id: 'usr-1',
    action_performed: 'desktop_mouse_action',
    tokens_used_or_duration: 1,
    platform: 'desktop',
  });

  db.insertUsageLog({
    id: 'log-3',
    user_id: 'usr-1',
    action_performed: 'ai_completion',
    tokens_used_or_duration: 350,
    platform: 'desktop',
  });

  const summary = db.getUserUsageSummary('usr-1');
  assert.equal(summary.total_actions, 3);
  assert.equal(summary.total_consumption, 501);
  assert.equal(summary.usage_by_platform.web.actions, 1);
  assert.equal(summary.usage_by_platform.web.consumption, 150);
  assert.equal(summary.usage_by_platform.desktop.actions, 2);
  assert.equal(summary.usage_by_platform.desktop.consumption, 351);

  assert.equal(summary.top_actions[0].action_performed, 'ai_completion');
  assert.equal(summary.top_actions[0].count, 2);
  assert.equal(summary.recent_logs.length, 3);

  db.close();
});

test('HTTP API: Full integration signup -> login -> usage tracking -> dashboard', async () => {
  const db = new AtlasDatabase(':memory:');
  const { server } = createApp(db, 'integration-test-secret');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    assert.equal(healthRes.status, 200);
    assert.equal(health.status, 'ok');

    // 2. Signup
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'daniel@theo.site',
        password: 'password123',
        subscription_status: 'pro',
      }),
    });
    const signupData = await signupRes.json();
    assert.equal(signupRes.status, 201);
    assert.equal(signupData.success, true);
    assert.ok(signupData.token);
    assert.equal(signupData.user.email, 'daniel@theo.site');
    assert.equal(signupData.user.subscription_status, 'pro');

    const token = signupData.token;

    // 2b. Duplicate signup rejection
    const dupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'DANIEL@theo.site', password: 'password123' }),
    });
    assert.equal(dupRes.status, 409);

    // 3. Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'daniel@theo.site', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    assert.equal(loginData.success, true);
    assert.ok(loginData.token);

    // 4. Unauthorized track attempt (no token)
    const noAuthRes = await fetch(`${baseUrl}/api/usage/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_performed: 'system_tool_exec', tokens_used_or_duration: 1 }),
    });
    assert.equal(noAuthRes.status, 401);

    // 5. Track usage from desktop
    const trackResDesktop = await fetch(`${baseUrl}/api/usage/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action_performed: 'jarvis_routine_morning',
        tokens_used_or_duration: 3,
        platform: 'desktop',
        metadata: { routineId: 'routine-morning-standup' },
      }),
    });
    const trackDataDesktop = await trackResDesktop.json();
    assert.equal(trackResDesktop.status, 201);
    assert.equal(trackDataDesktop.success, true);
    assert.ok(trackDataDesktop.logId);

    // 6. Track usage from web (Theo site)
    const trackResWeb = await fetch(`${baseUrl}/api/usage/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action_performed: 'web_ai_prompt',
        tokens_used_or_duration: 450,
        platform: 'web',
      }),
    });
    const trackDataWeb = await trackResWeb.json();
    assert.equal(trackResWeb.status, 201);
    assert.equal(trackDataWeb.success, true);

    // 7. Get user dashboard stats
    const dashRes = await fetch(`${baseUrl}/api/user/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData = await dashRes.json();
    assert.equal(dashRes.status, 200);
    assert.equal(dashData.success, true);
    assert.equal(dashData.user.email, 'daniel@theo.site');
    assert.equal(dashData.usage.total_actions, 2);
    assert.equal(dashData.usage.total_consumption, 453);
    assert.equal(dashData.usage.usage_by_platform.desktop.actions, 1);
    assert.equal(dashData.usage.usage_by_platform.web.actions, 1);
    assert.equal(dashData.usage.recent_logs.length, 2);
  } finally {
    server.close();
    db.close();
  }
});

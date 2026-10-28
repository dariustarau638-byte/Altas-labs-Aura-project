import test from 'node:test';
import assert from 'node:assert/strict';
import { AtlasDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

test('Tier-Gating: Free tier restrictions vs Pro capabilities', async (t) => {
  const db = new AtlasDatabase(':memory:');
  const jwtSecret = 'tier-gating-test-secret-key';
  const { server } = createApp(db, jwtSecret);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
    db.close();
  });

  // 1. Create a Free user
  const freeSignup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'freeuser@atlas.dev',
      password: 'password123',
      tier: 'free',
    }),
  });
  const freeData = await freeSignup.json();
  assert.equal(freeSignup.status, 201);
  assert.equal(freeData.user.tier, 'free');
  const freeToken = freeData.token;

  // 2. Query /api/user/tier for Free user
  const tierInfoRes = await fetch(`${baseUrl}/api/user/tier`, {
    headers: { Authorization: `Bearer ${freeToken}` },
  });
  const tierInfo = await tierInfoRes.json();
  assert.equal(tierInfoRes.status, 200);
  assert.equal(tierInfo.tier, 'free');
  assert.equal(tierInfo.dailyLimit, 50);
  assert.equal(tierInfo.dailyUsed, 0);
  assert.equal(tierInfo.remainingActions, 50);
  assert.equal(tierInfo.features.screenVision, false);
  assert.equal(tierInfo.features.cloudLlms, false);

  // 3. Pre-flight check /api/tier/check
  const visionCheck = await fetch(`${baseUrl}/api/tier/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({ feature: 'screenVision' }),
  });
  const visionCheckData = await visionCheck.json();
  assert.equal(visionCheckData.allowed, false);
  assert.equal(visionCheckData.upgradeRequired, true);

  // 4. Feature Restriction: Free user blocked from screen_vision
  const blockedVisionRes = await fetch(`${baseUrl}/api/usage/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      action_performed: 'screen_vision',
      tokens_used_or_duration: 1,
      metadata: { feature: 'screenVision' },
    }),
  });
  const blockedVision = await blockedVisionRes.json();
  assert.equal(blockedVisionRes.status, 403);
  assert.equal(blockedVision.code, 'PRO_FEATURE_REQUIRED');
  assert.equal(blockedVision.feature, 'screenVision');
  assert.equal(blockedVision.upgradeRequired, true);

  // 5. Feature Restriction: Free user blocked from cloud_llm
  const blockedCloudRes = await fetch(`${baseUrl}/api/usage/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      action_performed: 'cloud_llm',
      tokens_used_or_duration: 100,
      metadata: { modelType: 'cloud' },
    }),
  });
  const blockedCloud = await blockedCloudRes.json();
  assert.equal(blockedCloudRes.status, 403);
  assert.equal(blockedCloud.code, 'PRO_FEATURE_REQUIRED');
  assert.equal(blockedCloud.feature, 'cloudLlms');
  assert.equal(blockedCloud.upgradeRequired, true);

  // 6. Free user can successfully log local model and system actions
  for (let i = 1; i <= 50; i++) {
    const res = await fetch(`${baseUrl}/api/usage/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        action_performed: 'local_llm_inference',
        tokens_used_or_duration: 10,
        metadata: { index: i },
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201, `Action #${i} should succeed`);
    assert.equal(data.dailyRemaining, 50 - i);
  }

  // 7. Action 51 must be rejected by Daily Quota Limit
  const quotaBlockedRes = await fetch(`${baseUrl}/api/usage/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      action_performed: 'local_llm_inference',
      tokens_used_or_duration: 10,
    }),
  });
  const quotaBlocked = await quotaBlockedRes.json();
  assert.equal(quotaBlockedRes.status, 403);
  assert.equal(quotaBlocked.code, 'DAILY_LIMIT_EXCEEDED');
  assert.equal(quotaBlocked.limit, 50);
  assert.equal(quotaBlocked.used, 50);
  assert.equal(quotaBlocked.upgradeRequired, true);

  // 8. User upgrades to Pro via /api/user/tier
  const upgradeRes = await fetch(`${baseUrl}/api/user/tier`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({ tier: 'pro' }),
  });
  const upgradeData = await upgradeRes.json();
  assert.equal(upgradeRes.status, 200);
  assert.equal(upgradeData.tier, 'pro');

  // 9. Now as Pro, screen_vision, cloud_llm, and action 51+ immediately succeed
  const proVisionRes = await fetch(`${baseUrl}/api/usage/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      action_performed: 'screen_vision',
      tokens_used_or_duration: 1,
    }),
  });
  const proVisionData = await proVisionRes.json();
  assert.equal(proVisionRes.status, 201);
  assert.equal(proVisionData.tier, 'pro');
  assert.equal(proVisionData.dailyRemaining, -1);

  const proCloudRes = await fetch(`${baseUrl}/api/usage/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      action_performed: 'cloud_llm',
      tokens_used_or_duration: 250,
    }),
  });
  assert.equal(proCloudRes.status, 201);

  // 10. Dashboard reflects enriched tier structure
  const dashRes = await fetch(`${baseUrl}/api/user/dashboard`, {
    headers: { Authorization: `Bearer ${freeToken}` },
  });
  const dash = await dashRes.json();
  assert.equal(dashRes.status, 200);
  assert.equal(dash.tier.current, 'pro');
  assert.equal(dash.tier.dailyLimit, -1);
  assert.equal(dash.tier.features.screenVision, true);
  assert.equal(dash.tier.features.cloudLlms, true);
});

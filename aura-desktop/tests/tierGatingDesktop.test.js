import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AtlasDatabase } from '../../backend-server/src/db.js';
import { createApp } from '../../backend-server/src/app.js';
import { apiClient } from '../electron/services/apiClient.js';
import { saveSession, clearSession } from '../electron/services/tokenStorage.js';
import { trackDesktopUsage, flushTelemetry } from '../electron/services/telemetryTracker.js';

test('Aura Desktop Tier-Gating & Upgrade Alert Integration', async (t) => {
  // 1. Verify shared plans.json configuration
  const plansRaw = fs.readFileSync(new URL('../shared/plans.json', import.meta.url), 'utf-8');
  const plans = JSON.parse(plansRaw);

  assert.equal(plans.tiers.free.dailyActionLimit, 50);
  assert.equal(plans.tiers.free.features.screenVision, false);
  assert.equal(plans.tiers.free.features.cloudLlms, false);
  assert.equal(plans.tiers.pro.dailyActionLimit, -1);
  assert.equal(plans.tiers.pro.features.screenVision, true);
  assert.equal(plans.tiers.pro.features.cloudLlms, true);

  // 2. Spin up test backend
  const db = new AtlasDatabase(':memory:');
  const jwtSecret = 'desktop-tier-gating-test-secret';
  const { server } = createApp(db, jwtSecret);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  apiClient.setApiBaseUrl(baseUrl);

  t.after(() => {
    server.close();
    db.close();
    clearSession();
  });

  // 3. Authenticate as Free User
  const signupRes = await apiClient.signup('desktop-free@atlaslabs.dev', 'password123', 'free');
  assert.equal(signupRes.success, true);
  assert.equal(signupRes.user.tier, 'free');

  // 4. Query /api/user/tier through apiClient
  const tierInfo = await apiClient.getTier();
  assert.equal(tierInfo.tier, 'free');
  assert.equal(tierInfo.dailyLimit, 50);
  assert.equal(tierInfo.remainingActions, 50);

  // 5. Check pre-flight permission
  const checkVision = await apiClient.checkTier('screenVision');
  assert.equal(checkVision.allowed, false);
  assert.equal(checkVision.upgradeRequired, true);

  // 6. Free user attempting Screen Vision is rejected with 403 & upgradeRequired
  await assert.rejects(
    async () => {
      await apiClient.trackUsage('screen_vision', 1, { feature: 'screenVision' });
    },
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.data.code, 'PRO_FEATURE_REQUIRED');
      assert.equal(err.data.feature, 'screenVision');
      assert.equal(err.data.upgradeRequired, true);
      return true;
    }
  );

  // 7. Telemetry does not explode or re-queue poison 403s indefinitely
  trackDesktopUsage('screen_vision', 1, { feature: 'screenVision' });
  await flushTelemetry();

  // 8. Execute actions up to 50
  for (let i = 1; i <= 50; i++) {
    const res = await apiClient.trackUsage('local_action', 1, { index: i });
    assert.equal(res.success, true);
  }

  // 9. 51st action hits daily limit
  await assert.rejects(
    async () => {
      await apiClient.trackUsage('local_action', 1);
    },
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.data.code, 'DAILY_LIMIT_EXCEEDED');
      assert.equal(err.data.limit, 50);
      assert.equal(err.data.upgradeRequired, true);
      return true;
    }
  );
});

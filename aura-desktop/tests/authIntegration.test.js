import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSession, getAuthToken, getAuthUser, isAuthenticated, clearSession } from '../electron/services/tokenStorage.js';
import { apiClient, fetchWithAuth } from '../electron/services/apiClient.js';
import { trackDesktopUsage, flushTelemetry } from '../electron/services/telemetryTracker.js';
import { createApp } from '../../backend-server/src/app.js';
import { AtlasDatabase } from '../../backend-server/src/db.js';

test('tokenStorage: securely stores, retrieves, and clears auth tokens and sessions', () => {
  clearSession();
  assert.equal(isAuthenticated(), false);
  assert.equal(getAuthToken(), null);

  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_share';
  const sampleUser = { id: 'usr-42', email: 'theo@atlaslabs.dev', subscription_status: 'pro' };

  saveSession(sampleToken, sampleUser);
  assert.equal(isAuthenticated(), true);
  assert.equal(getAuthToken(), sampleToken);
  assert.equal(getAuthUser().email, 'theo@atlaslabs.dev');

  clearSession();
  assert.equal(isAuthenticated(), false);
  assert.equal(getAuthToken(), null);
});

test('apiClient & Telemetry: End-to-end integration between Aura Desktop and Backend Server', async () => {
  // 1. Boot local backend server
  const db = new AtlasDatabase(':memory:');
  const { server } = createApp(db, 'integration-test-secret-42');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  apiClient.setApiBaseUrl(baseUrl);

  try {
    clearSession();

    // 2. Unauthenticated request without token to protected endpoint fails with 401
    await assert.rejects(
      async () => {
        await apiClient.getDashboard();
      },
      (err) => {
        assert.equal(err.status, 401);
        return true;
      }
    );

    // 3. Desktop Signup via apiClient
    const signupRes = await apiClient.signup('desktop-user@theo.site', 'SecurePassword987!', 'pro');
    assert.equal(signupRes.success, true);
    assert.ok(signupRes.token);
    assert.equal(isAuthenticated(), true);
    assert.equal(getAuthUser().email, 'desktop-user@theo.site');

    // 4. Test fetchWithAuth automatically attached Bearer token
    const dashInitial = await apiClient.getDashboard();
    assert.equal(dashInitial.success, true);
    assert.equal(dashInitial.user.email, 'desktop-user@theo.site');
    assert.equal(dashInitial.usage.total_actions, 0);

    // 5. Track desktop actions via telemetryTracker
    trackDesktopUsage('jarvis_tool:sys_health_overview', 1, { toolId: 'sys_health_overview' });
    trackDesktopUsage('routine_run:Daily Morning Briefing', 3, { routineId: 'routine-1' });
    trackDesktopUsage('ai_chat_prompt', 320, { model: 'llama3.2' });

    // Flush telemetry queue
    await flushTelemetry();
    // Allow microtask processing
    await new Promise((r) => setTimeout(r, 200));

    // 6. Verify dashboard aggregates in backend
    const dashUpdated = await apiClient.getDashboard();
    assert.equal(dashUpdated.success, true);
    assert.ok(dashUpdated.usage.total_actions >= 3);
    assert.ok(dashUpdated.usage.total_consumption >= 324);
    assert.ok(dashUpdated.usage.usage_by_platform.desktop.actions >= 3);

    // 7. Desktop Logout clears token and disables authenticated calls
    await apiClient.logout();
    assert.equal(isAuthenticated(), false);
    assert.equal(getAuthToken(), null);

    await assert.rejects(async () => {
      await apiClient.getDashboard();
    }, /Unauthorized/);
  } finally {
    clearSession();
    server.close();
    db.close();
  }
});

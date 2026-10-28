import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AtlasDatabase } from './db.js';
import { hashPassword, verifyPassword, createJwtToken, verifyJwtToken } from './auth.js';

const plansConfig = JSON.parse(
  fs.readFileSync(new URL('./plans.json', import.meta.url), 'utf-8')
);

export function createApp(db = new AtlasDatabase(':memory:'), jwtSecret = process.env.JWT_SECRET) {
  function sendJson(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    });
    res.end(body);
  }

  function parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) {
          req.destroy();
          reject(new Error('Payload Too Large'));
        }
      });
      req.on('end', () => {
        if (!body) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON format'));
        }
      });
      req.on('error', reject);
    });
  }

  function authenticateRequest(req) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice(7).trim();
    try {
      return verifyJwtToken(token, jwtSecret);
    } catch {
      return null;
    }
  }

  const server = http.createServer(async (req, res) => {
    // Enable CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
        'Access-Control-Max-Age': '86400',
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    try {
      // 1. Health check
      if (method === 'GET' && (pathname === '/api/health' || pathname === '/health')) {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'atlas-auth-usage-server',
          version: '2.0.0',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Auth: Signup
      if (method === 'POST' && pathname === '/api/auth/signup') {
        const body = await parseBody(req);
        const { email, password, subscription_status, tier } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return sendJson(res, 400, { success: false, error: 'A valid email address is required.' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
          return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters.' });
        }

        const existing = db.getUserByEmail(email);
        if (existing) {
          return sendJson(res, 409, { success: false, error: 'An account with this email already exists.' });
        }

        const userId = crypto.randomUUID();
        const password_hash = hashPassword(password);
        const userTier = (tier || subscription_status || 'free').toLowerCase();
        const user = db.createUser({
          id: userId,
          email,
          password_hash,
          subscription_status: userTier,
          tier: userTier,
        });

        const token = createJwtToken(
          { sub: user.id, email: user.email, subscription_status: user.subscription_status, tier: user.tier },
          jwtSecret
        );

        return sendJson(res, 201, {
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            subscription_status: user.subscription_status,
            tier: user.tier,
            created_at: user.created_at,
          },
        });
      }

      // 3. Auth: Login
      if (method === 'POST' && pathname === '/api/auth/login') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJson(res, 400, { success: false, error: 'Email and password are required.' });
        }

        const user = db.getUserByEmail(email);
        if (!user || !verifyPassword(password, user.password_hash)) {
          return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
        }

        const token = createJwtToken(
          { sub: user.id, email: user.email, subscription_status: user.subscription_status, tier: user.tier },
          jwtSecret
        );

        return sendJson(res, 200, {
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            subscription_status: user.subscription_status,
            tier: user.tier,
            created_at: user.created_at,
          },
        });
      }

      // Protected routes requirement
      if (pathname.startsWith('/api/usage') || pathname.startsWith('/api/user') || pathname.startsWith('/api/tier')) {
        const session = authenticateRequest(req);
        if (!session) {
          return sendJson(res, 401, {
            success: false,
            error: 'Unauthorized: Missing or invalid Bearer token.',
          });
        }
        req.user = session;
      }

      // 4. Usage: Track Action (with Tier-Gating)
      if (method === 'POST' && pathname === '/api/usage/track') {
        const body = await parseBody(req);
        const { action_performed, tokens_used_or_duration, platform, metadata = {} } = body;

        if (!action_performed || typeof action_performed !== 'string') {
          return sendJson(res, 400, { success: false, error: 'Field action_performed is required.' });
        }

        const user = db.getUserById(req.user.sub);
        if (!user) {
          return sendJson(res, 404, { success: false, error: 'User account not found.' });
        }

        const userTier = (user.tier || req.user.tier || 'free').toLowerCase();
        const tierConfig = plansConfig.tiers[userTier] || plansConfig.tiers.free;
        const normalizedAction = action_performed.trim().toLowerCase();

        // Feature Restriction: Screen Vision
        const isVisionAction =
          normalizedAction === 'screen_vision' ||
          normalizedAction === 'screen_capture' ||
          normalizedAction.includes('vision') ||
          metadata?.requiresVision === true ||
          metadata?.feature === 'screenVision';

        if (isVisionAction && !tierConfig.features.screenVision) {
          return sendJson(res, 403, {
            success: false,
            error: 'Screen Vision is a Pro feature. Upgrade to Aura Pro to unlock visual screen intelligence.',
            code: 'PRO_FEATURE_REQUIRED',
            feature: 'screenVision',
            tier: userTier,
            upgradeRequired: true,
          });
        }

        // Feature Restriction: Cloud LLMs
        const isCloudLlmAction =
          normalizedAction === 'cloud_llm' ||
          normalizedAction.includes('cloud_llm') ||
          metadata?.modelType === 'cloud' ||
          metadata?.requiresCloudLlm === true ||
          metadata?.feature === 'cloudLlms';

        if (isCloudLlmAction && !tierConfig.features.cloudLlms) {
          return sendJson(res, 403, {
            success: false,
            error: 'Cloud LLMs are reserved for Pro and Enterprise subscribers. Free tier uses local models.',
            code: 'PRO_FEATURE_REQUIRED',
            feature: 'cloudLlms',
            tier: userTier,
            upgradeRequired: true,
          });
        }

        // Rate Restriction: Daily Action Limit (Rolling 24 Hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const dailyCount = db.getDailyUsageCount(user.id, twentyFourHoursAgo);

        if (tierConfig.dailyActionLimit > 0 && dailyCount >= tierConfig.dailyActionLimit) {
          return sendJson(res, 403, {
            success: false,
            error: `Daily limit reached (${dailyCount}/${tierConfig.dailyActionLimit} actions). Upgrade to Pro for unlimited actions.`,
            code: 'DAILY_LIMIT_EXCEEDED',
            limit: tierConfig.dailyActionLimit,
            used: dailyCount,
            tier: userTier,
            upgradeRequired: true,
          });
        }

        const validPlatform = platform === 'web' ? 'web' : 'desktop';
        const logId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const logEntry = db.insertUsageLog({
          id: logId,
          user_id: user.id,
          action_performed: action_performed.trim(),
          tokens_used_or_duration: Number(tokens_used_or_duration) || 1,
          timestamp,
          platform: validPlatform,
          metadata: metadata || {},
        });

        const remaining = tierConfig.dailyActionLimit === -1 ? -1 : Math.max(0, tierConfig.dailyActionLimit - (dailyCount + 1));

        return sendJson(res, 201, {
          success: true,
          logId: logEntry.id,
          recordedAt: logEntry.timestamp,
          tier: userTier,
          dailyRemaining: remaining,
        });
      }

      // 5. User: Get Current Tier & Limitations
      if (method === 'GET' && (pathname === '/api/user/tier' || pathname === '/api/tier')) {
        const user = db.getUserById(req.user.sub);
        if (!user) {
          return sendJson(res, 404, { success: false, error: 'User account not found.' });
        }
        const userTier = (user.tier || 'free').toLowerCase();
        const tierConfig = plansConfig.tiers[userTier] || plansConfig.tiers.free;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const dailyCount = db.getDailyUsageCount(user.id, twentyFourHoursAgo);
        const limit = tierConfig.dailyActionLimit;

        return sendJson(res, 200, {
          success: true,
          tier: userTier,
          tierName: tierConfig.name,
          dailyLimit: limit,
          dailyUsed: dailyCount,
          remainingActions: limit === -1 ? -1 : Math.max(0, limit - dailyCount),
          features: tierConfig.features,
          rateLimits: tierConfig.rateLimits,
        });
      }

      // 6. User: Update Tier (e.g. Upgrade / Switch)
      if ((method === 'POST' || method === 'PUT') && pathname === '/api/user/tier') {
        const body = await parseBody(req);
        const { tier } = body;
        if (!tier || !plansConfig.tiers[tier.toLowerCase()]) {
          return sendJson(res, 400, { success: false, error: 'Invalid or unsupported tier.' });
        }
        const updated = db.updateTier(req.user.sub, tier.toLowerCase());
        return sendJson(res, 200, {
          success: true,
          tier: updated.tier,
          subscription_status: updated.subscription_status,
        });
      }

      // 7. Tier: Feature Permission Check Pre-flight
      if (method === 'POST' && pathname === '/api/tier/check') {
        const body = await parseBody(req);
        const { feature } = body;
        const user = db.getUserById(req.user.sub);
        if (!user) {
          return sendJson(res, 404, { success: false, error: 'User account not found.' });
        }
        const userTier = (user.tier || 'free').toLowerCase();
        const tierConfig = plansConfig.tiers[userTier] || plansConfig.tiers.free;
        const allowed = Boolean(tierConfig.features[feature]);

        return sendJson(res, 200, {
          success: true,
          feature,
          allowed,
          tier: userTier,
          upgradeRequired: !allowed,
        });
      }

      // 8. User: Dashboard Stats & Profile
      if (method === 'GET' && pathname === '/api/user/dashboard') {
        const user = db.getUserById(req.user.sub);
        if (!user) {
          return sendJson(res, 404, { success: false, error: 'User account not found.' });
        }

        const usageSummary = db.getUserUsageSummary(req.user.sub);
        const userTier = (user.tier || 'free').toLowerCase();
        const tierConfig = plansConfig.tiers[userTier] || plansConfig.tiers.free;

        return sendJson(res, 200, {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            subscription_status: user.subscription_status,
            tier: user.tier,
            created_at: user.created_at,
          },
          tier: {
            current: userTier,
            name: tierConfig.name,
            dailyLimit: tierConfig.dailyActionLimit,
            dailyUsed: usageSummary.daily_actions_24h,
            remainingActions: tierConfig.dailyActionLimit === -1 ? -1 : Math.max(0, tierConfig.dailyActionLimit - usageSummary.daily_actions_24h),
            features: tierConfig.features,
          },
          usage: usageSummary,
        });
      }

      // Route not found
      return sendJson(res, 404, { success: false, error: `Endpoint not found: ${method} ${pathname}` });
    } catch (err) {
      console.error(`[Server Error] ${method} ${pathname}:`, err);
      return sendJson(res, 500, { success: false, error: err.message || 'Internal server error' });
    }
  });

  return { server, db };
}

// Auto-start listener if executed directly via CLI (e.g. `node src/app.js` on Render)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const PORT = parseInt(process.env.PORT || '5000', 10);
  const HOST = process.env.HOST || '0.0.0.0';
  const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dirname, '../data/atlas.sqlite');

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new AtlasDatabase(DB_PATH);
  const { server } = createApp(db, process.env.JWT_SECRET);

  server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Atlas Backend Server running`);
    console.log(`📍 Listening on:   http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`💾 Database:       ${DB_PATH}`);
    console.log(`🔐 Auth:           Stateless HMAC-SHA256 JWT`);
    console.log(`=======================================================`);
  });

  process.on('SIGINT', () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}

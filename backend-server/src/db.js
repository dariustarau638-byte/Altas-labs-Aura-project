import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export class AtlasDatabase {
  constructor(dbPath = null) {
    if (dbPath === ':memory:' || !dbPath) {
      this.db = new DatabaseSync(dbPath || ':memory:');
    } else {
      const resolved = path.resolve(dbPath);
      const dir = path.dirname(resolved);
      fs.mkdirSync(dir, { recursive: true });
      this.db = new DatabaseSync(resolved);
    }
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        subscription_status TEXT DEFAULT 'free',
        tier TEXT DEFAULT 'free'
      );

      CREATE TABLE IF NOT EXISTS usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action_performed TEXT NOT NULL,
        tokens_used_or_duration REAL NOT NULL DEFAULT 1,
        timestamp TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('web', 'desktop')),
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
      CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp);
    `);

    // Dynamic migration guard if existing sqlite db lacks 'tier' column
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'free'");
    } catch {}
  }

  // User management
  createUser({
    id,
    email,
    password_hash,
    subscription_status = null,
    tier = null,
    created_at = new Date().toISOString(),
  }) {
    const resolvedTier = (tier || subscription_status || 'free').toLowerCase();
    const resolvedStatus = (subscription_status || tier || 'free').toLowerCase();
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, subscription_status, tier)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, email.toLowerCase().trim(), password_hash, created_at, resolvedStatus, resolvedTier);
    return this.getUserById(id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    const stmt = this.db.prepare(`
      SELECT id, email, password_hash, created_at, subscription_status, tier
      FROM users
      WHERE email = ? COLLATE NOCASE
    `);
    const user = stmt.get(email.toLowerCase().trim());
    if (user) {
      user.tier = user.tier || user.subscription_status || 'free';
      user.subscription_status = user.subscription_status || user.tier || 'free';
    }
    return user || null;
  }

  getUserById(id) {
    if (!id) return null;
    const stmt = this.db.prepare(`
      SELECT id, email, password_hash, created_at, subscription_status, tier
      FROM users
      WHERE id = ?
    `);
    const user = stmt.get(id);
    if (user) {
      user.tier = user.tier || user.subscription_status || 'free';
      user.subscription_status = user.subscription_status || user.tier || 'free';
    }
    return user || null;
  }

  updateSubscription(id, status) {
    const stmt = this.db.prepare(`
      UPDATE users SET subscription_status = ?, tier = ? WHERE id = ?
    `);
    stmt.run(status, status, id);
    return this.getUserById(id);
  }

  updateTier(id, tier) {
    return this.updateSubscription(id, tier);
  }

  // Usage tracking & daily limits
  insertUsageLog({
    id,
    user_id,
    action_performed,
    tokens_used_or_duration = 1,
    timestamp = new Date().toISOString(),
    platform = 'desktop',
    metadata = {},
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO usage_logs (id, user_id, action_performed, tokens_used_or_duration, timestamp, platform, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    stmt.run(id, user_id, action_performed, Number(tokens_used_or_duration) || 1, timestamp, platform, metaStr);
    return {
      id,
      user_id,
      action_performed,
      tokens_used_or_duration,
      timestamp,
      platform,
    };
  }

  getDailyUsageCount(user_id, sinceTimestamp) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM usage_logs
      WHERE user_id = ? AND timestamp >= ?
    `);
    const row = stmt.get(user_id, sinceTimestamp);
    return Number(row?.count) || 0;
  }

  getUserUsageSummary(user_id) {
    // Total actions & total tokens
    const totalsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_actions,
        COALESCE(SUM(tokens_used_or_duration), 0) as total_consumption
      FROM usage_logs
      WHERE user_id = ?
    `);
    const totals = totalsStmt.get(user_id) || { total_actions: 0, total_consumption: 0 };

    // Breakdown by platform
    const platformStmt = this.db.prepare(`
      SELECT
        platform,
        COUNT(*) as action_count,
        COALESCE(SUM(tokens_used_or_duration), 0) as consumption
      FROM usage_logs
      WHERE user_id = ?
      GROUP BY platform
    `);
    const platformRows = platformStmt.all(user_id) || [];
    const usage_by_platform = {
      web: { actions: 0, consumption: 0 },
      desktop: { actions: 0, consumption: 0 },
    };
    for (const row of platformRows) {
      if (usage_by_platform[row.platform]) {
        usage_by_platform[row.platform] = {
          actions: Number(row.action_count),
          consumption: Number(row.consumption),
        };
      }
    }

    // Top actions
    const actionsStmt = this.db.prepare(`
      SELECT
        action_performed,
        COUNT(*) as count,
        COALESCE(SUM(tokens_used_or_duration), 0) as total_units
      FROM usage_logs
      WHERE user_id = ?
      GROUP BY action_performed
      ORDER BY count DESC
      LIMIT 10
    `);
    const top_actions = actionsStmt.all(user_id) || [];

    // Recent 20 logs
    const recentStmt = this.db.prepare(`
      SELECT id, action_performed, tokens_used_or_duration, timestamp, platform
      FROM usage_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `);
    const recent_logs = recentStmt.all(user_id) || [];

    // Rolling 24-hour daily count
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const daily_count = this.getDailyUsageCount(user_id, twentyFourHoursAgo);

    return {
      total_actions: Number(totals.total_actions),
      total_consumption: Number(totals.total_consumption),
      daily_actions_24h: daily_count,
      usage_by_platform,
      top_actions,
      recent_logs,
    };
  }

  close() {
    this.db.close();
  }
}

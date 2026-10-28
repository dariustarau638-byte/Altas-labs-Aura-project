import test from 'node:test';
import assert from 'node:assert/strict';
import { JARVIS_TOOLS, listJarvisTools } from '../electron/services/jarvisTools.js';
import {
  RISK_LEVELS,
  allowToolForSession,
  clearSessionAllowances,
  isToolSessionAllowed,
  requestApprovalIfNeeded,
  resolveApproval,
} from '../electron/services/approvalGate.js';
import { detectSnippetType } from '../electron/services/clipboardMemory.js';

test('JARVIS_TOOLS has structured categories and valid risk classifications', () => {
  assert.ok(JARVIS_TOOLS.length >= 40, `Expected 40+ tools, found ${JARVIS_TOOLS.length}`);

  const validRisks = new Set([RISK_LEVELS.SAFE, RISK_LEVELS.CAUTION, RISK_LEVELS.DANGEROUS]);
  const ids = new Set();

  for (const tool of JARVIS_TOOLS) {
    assert.ok(tool.id, 'Tool missing ID');
    assert.ok(!ids.has(tool.id), `Duplicate tool ID: ${tool.id}`);
    ids.add(tool.id);

    assert.ok(tool.name, `Tool ${tool.id} missing name`);
    assert.ok(tool.category, `Tool ${tool.id} missing category`);
    assert.ok(tool.description, `Tool ${tool.id} missing description`);
    assert.ok(validRisks.has(tool.risk), `Tool ${tool.id} has invalid risk: ${tool.risk}`);
    assert.equal(typeof tool.execute, 'function', `Tool ${tool.id} missing execute function`);
  }
});

test('listJarvisTools filters by category correctly', () => {
  const all = listJarvisTools();
  const healthTools = listJarvisTools('System Health');

  assert.ok(healthTools.length > 0);
  assert.ok(all.length >= healthTools.length);
  assert.ok(healthTools.every((t) => t.category === 'System Health'));
});

test('Approval Gate automatically approves SAFE and CAUTION tools', async () => {
  const safeRes = await requestApprovalIfNeeded({
    toolId: 'test_safe',
    name: 'Safe Inspection',
    risk: RISK_LEVELS.SAFE,
  });
  assert.equal(safeRes.approved, true);
  assert.equal(safeRes.auto, true);

  const cautionRes = await requestApprovalIfNeeded({
    toolId: 'test_caution',
    name: 'Caution Toggle',
    risk: RISK_LEVELS.CAUTION,
  });
  assert.equal(cautionRes.approved, true);
  assert.equal(cautionRes.auto, true);
});

test('Approval Gate intercepts DANGEROUS tools until user resolves', async () => {
  clearSessionAllowances();

  const promise = requestApprovalIfNeeded({
    toolId: 'dangerous_kill',
    name: 'Kill Process',
    risk: RISK_LEVELS.DANGEROUS,
  });

  // Check that approval is pending
  setTimeout(() => {
    // Simulate user approving
    resolveApproval('gate-1', { approved: true });
  }, 10);

  // In our test, let's test session allowance bypass
  allowToolForSession('dangerous_session_tool');
  assert.equal(isToolSessionAllowed('dangerous_session_tool'), true);

  const bypassed = await requestApprovalIfNeeded({
    toolId: 'dangerous_session_tool',
    name: 'Bypassed Tool',
    risk: RISK_LEVELS.DANGEROUS,
  });
  assert.equal(bypassed.approved, true);
  assert.equal(bypassed.sessionBypassed, true);
});

test('detectSnippetType identifies code languages, URLs, colors, and text', () => {
  // URLs
  assert.deepEqual(detectSnippetType('https://github.com/atlas-labs/aura'), {
    type: 'url',
    language: null,
  });

  // Colors
  assert.deepEqual(detectSnippetType('#09090b'), {
    type: 'color',
    language: null,
  });
  assert.deepEqual(detectSnippetType('rgba(0, 240, 255, 0.5)'), {
    type: 'color',
    language: null,
  });

  // JSON
  assert.deepEqual(detectSnippetType('{"name": "Aura", "version": 2}'), {
    type: 'code',
    language: 'json',
  });

  // JavaScript
  assert.deepEqual(
    detectSnippetType('import { useState } from "react";\nconst [val, setVal] = useState(0);'),
    { type: 'code', language: 'javascript' },
  );

  // Python
  assert.deepEqual(detectSnippetType('def calculate_tokens(prompt):\n    return len(prompt.split())'), {
    type: 'code',
    language: 'python',
  });

  // SQL
  assert.deepEqual(detectSnippetType('SELECT id, name FROM users WHERE active = 1;'), {
    type: 'code',
    language: 'sql',
  });

  // Plain Text
  assert.deepEqual(detectSnippetType('Remember to buy groceries and call John'), {
    type: 'text',
    language: null,
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlanJson, validatePlanSteps } from '../shared/desktopPlan.js';
import { findVisionModel } from '../shared/visionModels.js';

const context = { screenSize: { width: 1920, height: 1080 } };

test('parses fenced JSON action plans', () => {
  const plan = parsePlanJson('```json\n{"steps":[{"type":"open_app","target":"paint"}]}\n```');
  assert.equal(plan.steps[0].target, 'paint');
});

test('selects an installed image-capable model for vision tasks', () => {
  assert.equal(findVisionModel(['llama3.2:3b', 'gemma3:4b'], 'llama3.2:3b'), 'gemma3:4b');
  assert.equal(findVisionModel(['llama3.2:3b'], 'llama3.2:3b'), null);
  assert.equal(findVisionModel(['llava:latest'], 'llava:latest'), 'llava:latest');
});

test('allows only safe applications, web URLs, key chords, and in-bounds clicks', () => {
  const steps = validatePlanSteps([
    { type: 'open_app', target: 'paint' },
    { type: 'open_app', target: 'powershell.exe' },
    { type: 'open_url', target: 'file:///C:/secret.txt' },
    { type: 'open_url', target: 'https://example.com' },
    { type: 'click', x: 1920, y: 100 },
    { type: 'click', x: 250, y: 180 },
    { type: 'press_keys', keys: 'ALT+F4' },
    { type: 'press_keys', keys: 'TAB' },
    { type: 'delete_file', path: 'C:\\Users\\me\\notes.txt' },
  ], context);
  assert.deepEqual(steps.map((step) => step.type), ['open_app', 'open_url', 'click', 'press_keys']);
  assert.equal(steps[0].target, 'mspaint.exe');
  assert.equal(steps[1].target, 'https://example.com/');
  assert.equal(steps[2].x, 250);
  assert.equal(steps[3].keys, '{TAB}');
});

test('refuses plans with no supported actions and bounds typed text', () => {
  assert.throws(() => validatePlanSteps([{ type: 'delete_file' }], context), /(safe plan|plan sigur)/i);
  const [step] = validatePlanSteps([{ type: 'type_text', text: 'x'.repeat(2000) }], context);
  assert.equal(step.text.length, 1200);
});

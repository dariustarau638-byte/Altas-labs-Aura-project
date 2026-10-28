import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePromoDiscount,
  detectCardBrand,
  formatCardNumber,
  formatExpDate,
  generateMsOneTimeKey,
} from '../shared/billingUtils.js';
import { MASTER_LICENSE_KEY, getPlan } from '../shared/settings.js';

test('detectCardBrand recognizes major credit card providers', () => {
  assert.equal(detectCardBrand('4242424242424242'), 'Visa');
  assert.equal(detectCardBrand('5555555555554444'), 'Mastercard');
  assert.equal(detectCardBrand('378282246310005'), 'American Express');
  assert.equal(detectCardBrand('6011111111111117'), 'Discover');
  assert.equal(detectCardBrand('1234567890123456'), 'Credit Card');
});

test('generateMsOneTimeKey produces valid 5x5 product keys', () => {
  const proKey = generateMsOneTimeKey('pro');
  const teamKey = generateMsOneTimeKey('team');

  assert.match(proKey, /^PRO20-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  assert.match(teamKey, /^MAX50-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
});

test('formatCardNumber and formatExpDate format user inputs cleanly', () => {
  assert.equal(formatCardNumber('4242424242424242'), '4242 4242 4242 4242');
  assert.equal(formatExpDate('1228'), '12/28');
  assert.equal(formatExpDate('08'), '08');
});

test('calculatePromoDiscount correctly calculates discount tiers', () => {
  assert.deepEqual(calculatePromoDiscount(240, 'AURA100'), {
    finalAmount: 0,
    discountPercent: 100,
    valid: true,
  });
  assert.deepEqual(calculatePromoDiscount(240, 'WELCOME50'), {
    finalAmount: 120,
    discountPercent: 50,
    valid: true,
  });
  assert.deepEqual(calculatePromoDiscount(240, 'LAUNCH20'), {
    finalAmount: 192,
    discountPercent: 20,
    valid: true,
  });
  assert.deepEqual(calculatePromoDiscount(240, 'INVALID'), {
    finalAmount: 240,
    discountPercent: 0,
    valid: false,
  });
});

test('getPlan correctly returns pricing and device limits', () => {
  const free = getPlan('free');
  assert.equal(free.id, 'free');
  assert.equal(free.monthlyPrice, 0);

  const pro = getPlan('pro');
  assert.equal(pro.id, 'pro');
  assert.equal(pro.monthlyPrice, 20);
  assert.equal(pro.maxDevices, 3);

  const team = getPlan('team');
  assert.equal(team.id, 'team');
  assert.equal(team.monthlyPrice, 50);
  assert.equal(team.maxDevices, 10);
});

test('MASTER_LICENSE_KEY is defined and valid', () => {
  assert.ok(MASTER_LICENSE_KEY);
  assert.equal(typeof MASTER_LICENSE_KEY, 'string');
  assert.ok(MASTER_LICENSE_KEY.length > 10);
});

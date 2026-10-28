/**
 * Pure billing utilities for card brand detection, validation, formatting,
 * and authentic 5x5 product key generation.
 */

export function randomBlock5() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateMsOneTimeKey(planId) {
  const prefix = planId === 'team' ? 'MAX50' : 'PRO20';
  return `${prefix}-${randomBlock5()}-${randomBlock5()}-${randomBlock5()}-${randomBlock5()}`;
}

export function detectCardBrand(number) {
  const clean = String(number || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^6(011|5)/.test(clean)) return 'Discover';
  return 'Credit Card';
}

export function formatCardNumber(value) {
  const v = String(value || '').replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < v.length; i += 4) {
    parts.push(v.slice(i, i + 4));
  }
  return parts.join(' ');
}

export function formatExpDate(value) {
  const v = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (v.length <= 2) return v;
  return `${v.slice(0, 2)}/${v.slice(2)}`;
}

export function calculatePromoDiscount(baseAmount, promoCode) {
  const code = String(promoCode || '').trim().toUpperCase();
  if (['AURA100', 'FREE100', 'DEV100'].includes(code)) {
    return { finalAmount: 0, discountPercent: 100, valid: true };
  }
  if (['WELCOME50', 'HALF50', 'AURA50'].includes(code)) {
    return { finalAmount: Math.round(baseAmount * 0.5), discountPercent: 50, valid: true };
  }
  if (['LAUNCH20', 'AURA20'].includes(code)) {
    return { finalAmount: Math.round(baseAmount * 0.8), discountPercent: 20, valid: true };
  }
  return { finalAmount: baseAmount, discountPercent: 0, valid: false };
}

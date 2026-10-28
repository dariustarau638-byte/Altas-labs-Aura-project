import os from 'node:os';
import { ipcMain } from 'electron';
import { MASTER_LICENSE_KEY, getPlan } from '../../shared/settings.js';
import { getSettings, updateSettings } from '../services/settingsStore.js';

/**
 * IPC Handlers for Account, Subscriptions, Payments & Licensing.
 * - Supports instant Stripe-style card checkout, coupon discounts, auto-renewal calculation,
 *   authentic Microsoft 5x5 product license generation, and itemized invoice management.
 * - Master License Key unlocks full permanent access to all tiers.
 * - Standard product keys are One-Time Use and tracked in `consumedKeys`.
 */
const MS_KEY_PATTERN = /^(PRO20|MAX50|ULTRA)-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i;
const LEGACY_KEY_PATTERN = /^AURA-(PRO|ULTRA|MAX|TEAM)-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

import {
  calculatePromoDiscount,
  detectCardBrand,
  generateMsOneTimeKey,
} from '../../shared/billingUtils.js';

export { detectCardBrand, generateMsOneTimeKey };

function computeNextRenewal(cycle) {
  const d = new Date();
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function computeTrialEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function registerBillingIpc() {
  ipcMain.handle('billing:info', () => {
    const { account } = getSettings();
    const plan = getPlan(account?.plan);
    return {
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      maxDevices: account?.isMasterKey ? 99 : plan.maxDevices,
      activeDevices: [
        {
          id: 'current-pc',
          name: os.hostname(),
          os: `${os.type()} (${os.arch()})`,
          lastActive: 'Active now (this PC)',
          current: true,
        },
      ],
      invoices: Array.isArray(account?.invoices) ? account.invoices : [],
    };
  });

  ipcMain.handle('billing:activate-license', (_event, rawKey) => {
    const key = String(rawKey ?? '').trim().toUpperCase();
    const current = getSettings().account || {};
    const consumed = Array.isArray(current.consumedKeys) ? current.consumedKeys : [];

    // 1. Verify Founder Master License Key (Permanent, unlimited)
    if (key === MASTER_LICENSE_KEY) {
      const next = updateSettings({
        account: {
          plan: 'team',
          licenseKey: MASTER_LICENSE_KEY,
          isMasterKey: true,
          licenseStatus: 'active',
          renewsAt: 'Permanent (Master License)',
        },
      });
      return next.account;
    }

    // 2. Validate Microsoft 5x5 or legacy Aura key format
    const msMatch = key.match(MS_KEY_PATTERN);
    const legacyMatch = key.match(LEGACY_KEY_PATTERN);
    if (!msMatch && !legacyMatch) {
      throw new Error(
        'Invalid product key format. Please use the 5x5 format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (e.g. PRO20-XXXXX-XXXXX-XXXXX-XXXXX or MAX50-XXXXX-XXXXX-XXXXX-XXXXX).',
      );
    }

    if (consumed.includes(key)) {
      throw new Error(
        `License key ${key} has already been consumed! Standard customer keys are single-use.`,
      );
    }

    const rawTier = (msMatch ? msMatch[1] : legacyMatch[1]).toUpperCase();
    const tier = rawTier === 'PRO' || rawTier === 'PRO20' ? 'pro' : 'team';

    const next = updateSettings({
      account: {
        plan: tier,
        licenseKey: key,
        isMasterKey: false,
        licenseStatus: 'active',
        renewsAt: computeNextRenewal(current.billingCycle || 'yearly'),
        consumedKeys: [...consumed, key],
      },
    });
    return next.account;
  });

  ipcMain.handle('billing:checkout', async (_event, payload) => {
    const {
      planId,
      billingCycle = 'yearly',
      cardholderName = 'Aura Subscriber',
      cardNumber = '',
      cardExp = '',
      cardCvc = '',
      promoCode = '',
      country = 'United States',
      postalCode = '',
    } = payload || {};

    const plan = getPlan(planId);
    if (plan.id === 'free') {
      const next = updateSettings({
        account: {
          plan: 'free',
          licenseStatus: 'trialing',
          trialEndsAt: computeTrialEnd(),
        },
      });
      return next.account;
    }

    // Card validation
    const cleanNumber = String(cardNumber || '').replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      throw new Error('Please enter a valid credit or debit card number (15 or 16 digits).');
    }

    const cleanExp = String(cardExp || '').trim();
    if (!/^\d{2}\s*\/\s*\d{2,4}$/.test(cleanExp)) {
      throw new Error('Please enter a valid expiration date (MM/YY).');
    }

    const cleanCvc = String(cardCvc || '').trim();
    if (cleanCvc.length < 3 || cleanCvc.length > 4) {
      throw new Error('Please enter a valid 3 or 4-digit security code (CVC).');
    }

    // Determine charge amount & discounts
    const cycle = billingCycle === 'monthly' ? 'monthly' : 'yearly';
    let baseAmount = cycle === 'yearly' ? plan.yearlyTotal : plan.monthlyPrice;
    const cleanPromo = String(promoCode || '').trim().toUpperCase();

    if (['AURA100', 'FREE100', 'DEV100'].includes(cleanPromo)) {
      baseAmount = 0;
    } else if (['WELCOME50', 'HALF50', 'AURA50'].includes(cleanPromo)) {
      baseAmount = Math.round(baseAmount * 0.5);
    } else if (['LAUNCH20', 'AURA20'].includes(cleanPromo)) {
      baseAmount = Math.round(baseAmount * 0.8);
    }

    const current = getSettings().account || {};
    const consumed = Array.isArray(current.consumedKeys) ? current.consumedKeys : [];
    const generatedKey = generateMsOneTimeKey(plan.id);
    const cardBrand = detectCardBrand(cleanNumber);
    const cardLast4 = cleanNumber.slice(-4);

    const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice = {
      id: invoiceId,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      plan: `${plan.name} (${cycle === 'yearly' ? 'Annual' : 'Monthly'})`,
      amount: `$${baseAmount}.00 USD`,
      status: 'PAID',
      cardBrand,
      cardLast4,
      cardholderName,
      country,
      postalCode,
      promoCode: cleanPromo || undefined,
    };

    const existingInvoices = Array.isArray(current.invoices) ? current.invoices : [];

    const next = updateSettings({
      account: {
        plan: plan.id,
        billingCycle: cycle,
        licenseKey: current.isMasterKey ? MASTER_LICENSE_KEY : generatedKey,
        licenseStatus: 'active',
        trialEndsAt: computeTrialEnd(),
        renewsAt: current.isMasterKey ? 'Permanent (Master License)' : computeNextRenewal(cycle),
        cardBrand,
        cardLast4,
        cardExp: cleanExp,
        cardholderName,
        consumedKeys: generatedKey ? [...consumed, generatedKey] : consumed,
        invoices: [newInvoice, ...existingInvoices],
      },
    });

    return next.account;
  });

  ipcMain.handle('billing:update-card', (_event, { cardNumber, cardExp, cardholderName }) => {
    const cleanNumber = String(cardNumber || '').replace(/\D/g, '');
    if (cleanNumber.length < 13) {
      throw new Error('Please enter a valid card number.');
    }
    const cardBrand = detectCardBrand(cleanNumber);
    const cardLast4 = cleanNumber.slice(-4);
    const next = updateSettings({
      account: {
        cardBrand,
        cardLast4,
        cardExp: String(cardExp || '').trim(),
        cardholderName: String(cardholderName || '').trim(),
      },
    });
    return next.account;
  });

  ipcMain.handle('billing:cancel', () => {
    const current = getSettings().account || {};
    const next = updateSettings({
      account: {
        plan: 'free',
        licenseKey: current.isMasterKey ? MASTER_LICENSE_KEY : '',
        licenseStatus: 'trialing',
        trialEndsAt: computeTrialEnd(),
      },
    });
    return next.account;
  });
}

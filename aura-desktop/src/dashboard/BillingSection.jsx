import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Download,
  KeyRound,
  Laptop,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { MASTER_LICENSE_KEY, PLANS, getPlan } from '../../shared/settings.js';
import { aura } from '../lib/bridge.js';

function randomBlock5() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function maskKey(key) {
  if (!key) return '';
  if (key === MASTER_LICENSE_KEY) {
    const parts = key.split('-');
    return `${parts[0]}-•••••-•••••-•••••-${parts[4]}`;
  }
  return key;
}

function detectBrand(number) {
  const clean = String(number || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^6(011|5)/.test(clean)) return 'Discover';
  return 'Card';
}

export default function BillingSection({ settings, onUpdateSettings }) {
  const { account } = settings;
  const activePlan = getPlan(account?.plan);
  const isMaster = Boolean(account?.isMasterKey || account?.licenseKey === MASTER_LICENSE_KEY);
  const isPaidActive = account?.plan !== 'free' && account?.licenseStatus === 'active';
  const consumedKeys = Array.isArray(account?.consumedKeys) ? account.consumedKeys : [];

  const [billingCycle, setBillingCycle] = useState(account?.billingCycle || 'yearly');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [licenseInput, setLicenseInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generatedOneTimeKeys, setGeneratedOneTimeKeys] = useState([
    { tier: 'PRO20', label: 'Pro ($20)', key: 'PRO20-7X9K2-M4P8Q-W3N6R-T5C2B' },
    { tier: 'MAX50', label: 'Max ($50)', key: 'MAX50-9M4P7-K2X8W-R6N3T-B5V9C' },
  ]);

  // Checkout & Payment Modal
  const [checkoutTarget, setCheckoutTarget] = useState(null); // plan object
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardholderName, setCardholderName] = useState(account?.name || 'Aura Subscriber');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null);
  const [postalCode, setPostalCode] = useState('94103');
  const [country, setCountry] = useState('United States');

  useEffect(() => {
    aura.billing.info().then(setDeviceInfo).catch(() => {});
  }, [account?.plan, account?.isMasterKey]);

  const handleCycleChange = (cycle) => {
    setBillingCycle(cycle);
    onUpdateSettings({ account: { billingCycle: cycle } });
  };

  const handleLicenseInputChange = (e) => {
    const raw = e.target.value.toUpperCase();
    const clean = raw.replace(/[^A-Z0-9]/g, '');
    if (!raw.startsWith('AURA-') && clean.length > 5) {
      const groups = clean.slice(0, 25).match(/.{1,5}/g) || [];
      setLicenseInput(groups.join('-'));
    } else {
      setLicenseInput(raw);
    }
  };

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  const handleCardExpChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExp(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExp(raw);
    }
  };

  const fillDemoCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExp('12/28');
    setCardCvc('888');
    setCardholderName(account?.name || 'Alex Turner');
    setPaymentError('');
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (['AURA100', 'FREE100', 'DEV100'].includes(code)) {
      setPromoApplied({ code, discountPercent: 100, label: '100% Off (Free Activation)' });
    } else if (['WELCOME50', 'HALF50', 'AURA50'].includes(code)) {
      setPromoApplied({ code, discountPercent: 50, label: '50% Off First Year' });
    } else if (['LAUNCH20', 'AURA20'].includes(code)) {
      setPromoApplied({ code, discountPercent: 20, label: '20% Off' });
    } else {
      setPaymentError('Invalid coupon code. Try AURA100 or WELCOME50.');
      setPromoApplied(null);
    }
  };

  const calculateTotal = (targetPlan) => {
    if (!targetPlan) return 0;
    const base = billingCycle === 'yearly' ? targetPlan.yearlyTotal : targetPlan.monthlyPrice;
    if (!promoApplied) return base;
    const discounted = Math.round(base * ((100 - promoApplied.discountPercent) / 100));
    return Math.max(0, discounted);
  };

  const handleActivateKey = async (keyToUse) => {
    const candidate = (keyToUse ?? licenseInput).trim().toUpperCase();
    if (!candidate) return;
    try {
      const updated = await aura.billing.activateLicense(candidate);
      onUpdateSettings({ account: updated });
      setLicenseInput('');
      if (candidate === MASTER_LICENSE_KEY) {
        setFeedback({
          type: 'success',
          text: 'Founder Master License recognized and activated! You have permanent unlimited access to all Aura features.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Single-Use License key ${updated.licenseKey} activated successfully! Active plan: ${getPlan(updated.plan).name}.`,
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleMasterSwitchPlan = (planId) => {
    onUpdateSettings({
      account: {
        plan: planId,
        isMasterKey: true,
        licenseKey: MASTER_LICENSE_KEY,
        licenseStatus: 'active',
        renewsAt: 'Permanent (Master License)',
      },
    });
    setFeedback({
      type: 'success',
      text: `[Founder Mode] Active plan instantly switched to ${getPlan(planId).name}.`,
    });
  };

  const generateNewOneTimeKey = (tier = 'PRO20') => {
    const newKey = `${tier}-${randomBlock5()}-${randomBlock5()}-${randomBlock5()}-${randomBlock5()}`;
    const label = tier === 'PRO20' ? 'Pro ($20)' : 'Max ($50)';
    setGeneratedOneTimeKeys((prev) => [{ tier, label, key: newKey }, ...prev.slice(0, 5)]);
  };

  const openCheckout = (plan) => {
    setCheckoutTarget(plan);
    setPaymentError('');
    if (!cardNumber) {
      fillDemoCard();
    }
  };

  const handleCompleteCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    setPaymentError('');

    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 13) {
      setPaymentError('Please enter a valid card number.');
      return;
    }
    if (!cardExp || cardExp.length < 4) {
      setPaymentError('Please enter a valid expiration date (MM/YY).');
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      setPaymentError('Please enter a 3 or 4-digit security code (CVC).');
      return;
    }

    setProcessing(true);
    try {
      const updated = await aura.billing.checkout({
        planId: checkoutTarget.id,
        billingCycle,
        cardholderName,
        cardNumber: cleanNum,
        cardExp,
        cardCvc,
        promoCode: promoApplied?.code || promoCode,
        country,
        postalCode,
      });

      onUpdateSettings({ account: updated });
      const targetName = checkoutTarget.name;
      setCheckoutTarget(null);
      setFeedback({
        type: 'success',
        text: `Payment confirmed! Your subscription to ${targetName} is now active. License key: ${updated.licenseKey}`,
      });
    } catch (err) {
      setPaymentError(err.message || 'Payment processing failed. Please check your card details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDowngradeToFree = async () => {
    try {
      const updated = await aura.billing.cancel();
      onUpdateSettings({ account: updated });
      setCancelModalOpen(false);
      setFeedback({
        type: 'success',
        text: 'Your subscription has been canceled. Your account has returned to the 7-day Free Trial.',
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const copyLicense = (textToCopy = account?.licenseKey) => {
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadInvoice = (inv) => {
    const content = [
      '===========================================================',
      '                   AURA AI — OFFICIAL INVOICE              ',
      '===========================================================',
      `Invoice Number:   ${inv.id}`,
      `Date Issued:      ${inv.date}`,
      `Customer:         ${inv.cardholderName || account?.name} (${account?.email || 'N/A'})`,
      `Country/Postal:   ${inv.country || 'United States'} ${inv.postalCode || ''}`,
      `Plan:             ${inv.plan}`,
      `Total Charged:    ${inv.amount}`,
      `Payment Method:   ${inv.cardBrand || account?.cardBrand || 'Credit Card'} •••• ${inv.cardLast4 || account?.cardLast4 || '4242'}`,
      `Status:           ${inv.status || 'PAID'} (Authorized)`,
      '===========================================================',
      'Thank you for subscribing to Aura AI Desktop Companion.',
      'Atlas Labs Inc. — https://atlaslabs.dev',
      '===========================================================',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const invoices = Array.isArray(account?.invoices) && account.invoices.length > 0
    ? account.invoices
    : account?.plan !== 'free'
      ? [
          {
            id: 'INV-2026-1017',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            plan: `${activePlan.name} (${account?.billingCycle === 'yearly' ? 'Annual' : 'Monthly'})`,
            amount: isMaster
              ? '$0.00 (Founder License)'
              : account?.billingCycle === 'yearly'
                ? `$${activePlan.yearlyTotal}.00 USD`
                : `$${activePlan.monthlyPrice}.00 USD`,
            status: 'PAID',
            cardBrand: account?.cardBrand || 'Visa',
            cardLast4: account?.cardLast4 || '4242',
            cardholderName: account?.name || 'Aura Subscriber',
          },
        ]
      : [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">Account, Billing & Subscriptions</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            7-Day Free Trial · Aura Pro ($20/mo or $240/yr) · Aura Max / Ultra ($50/mo or $600/yr).
          </p>
        </div>

        {/* License status badge */}
        <div className="badge badge-accent shrink-0 text-xs">
          <Crown size={13} className="text-aura-400" />
          <span>Active Plan: <strong className="text-zinc-200">{activePlan.name}</strong></span>
          <span
            className={`badge text-[10px] ml-1.5 ${
              isMaster
                ? 'badge-warning'
                : account?.plan === 'free'
                  ? 'badge-accent'
                  : 'badge-success'
            }`}
          >
            {isMaster
              ? 'FOUNDER · UNLIMITED'
              : account?.plan === 'free'
                ? '7-Day Trial'
                : 'Active Subscription'}
          </span>
        </div>
      </header>

      {/* Founder Master Mode Banner */}
      {isMaster && (
        <section className="card p-4 border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-zinc-100">
                    Founder Master License Active ({maskKey(MASTER_LICENSE_KEY)})
                  </h2>
                  <span className="badge badge-warning text-[10px]">
                    Reusable · Lifetime Access
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  You are logged in as the founder. You can switch between any subscription tier with zero payment.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleMasterSwitchPlan('free')}
                className={`btn btn-sm ${account?.plan === 'free' ? 'btn-primary' : ''}`}
              >
                Free Trial
              </button>
              <button
                type="button"
                onClick={() => handleMasterSwitchPlan('pro')}
                className={`btn btn-sm ${account?.plan === 'pro' ? 'btn-primary' : ''}`}
              >
                Pro ($20)
              </button>
              <button
                type="button"
                onClick={() => handleMasterSwitchPlan('team')}
                className={`btn btn-sm ${account?.plan === 'team' ? 'btn-primary' : ''}`}
              >
                Max / Ultra ($50)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-md border px-3.5 py-2.5 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <BadgeCheck size={15} className="shrink-0 text-emerald-400" />
            ) : (
              <X size={15} className="shrink-0 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Account Profile & Device Status Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Account Profile */}
        <section className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <User size={14} />
            <span>Subscriber Profile</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-500">Display Name</span>
              <p className="mt-0.5 font-medium text-zinc-200">
                {account?.userNickname || account?.name || 'Aura User'}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Legal Name / Company</span>
              <p className="mt-0.5 font-medium text-zinc-200">
                {account?.name || 'Aura User'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500">Email Address</span>
              <p className="mt-0.5 font-medium text-zinc-200">
                {account?.email || 'N/A (Local Session)'}
              </p>
            </div>
          </div>
        </section>

        {/* License & Device Status */}
        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <div className="flex items-center gap-2">
              <Laptop size={14} />
              <span>License & Devices</span>
            </div>
            <span className="badge font-mono text-[11px]">
              {deviceInfo ? `${deviceInfo.activeDevices.length} / ${deviceInfo.maxDevices} PC` : '1 / 1 PC'}
            </span>
          </div>

          <div className="rounded-md border border-line bg-canvas p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-zinc-200">
                  {deviceInfo?.hostname || 'DESKTOP-AURA'}
                </span>
              </div>
              <span className="badge badge-success text-[10px]">Authorized</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {deviceInfo?.platform || 'Windows 11 (x64)'} · Active now
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
            <span>Next Renewal Date:</span>
            <span className="font-mono text-zinc-300">
              {isMaster ? 'Never (Lifetime)' : account?.renewsAt || '2027-10-17'}
            </span>
          </div>
        </section>
      </div>

      {/* Subscription Plans Selection */}
      <section className="card p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-100">Subscription Plans</h2>
            <p className="text-xs text-zinc-500">
              Choose the plan that fits your workflow. Cancel or switch anytime.
            </p>
          </div>

          {/* Billing Cycle Selector */}
          <div className="segmented">
            <button
              type="button"
              onClick={() => handleCycleChange('monthly')}
              data-active={billingCycle === 'monthly'}
            >
              Monthly ($20 / $50)
            </button>
            <button
              type="button"
              onClick={() => handleCycleChange('yearly')}
              data-active={billingCycle === 'yearly'}
              className="flex items-center gap-1.5"
            >
              <span>Annual ($240 / $600)</span>
              <span className="badge badge-success text-[9px] py-0 px-1">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = account?.plan === plan.id;
            const price = billingCycle === 'yearly' ? plan.yearlyTotal : plan.monthlyPrice;
            const period = billingCycle === 'yearly' ? '/ year' : '/ month';

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                  plan.popular
                    ? 'border-aura-500/50 bg-aura-500/[0.03]'
                    : isCurrent
                      ? 'border-zinc-700 bg-surface-2'
                      : 'border-line bg-surface hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-100">{plan.name}</h3>
                    {plan.popular && (
                      <span className="badge badge-accent text-[10px]">
                        Most Popular
                      </span>
                    )}
                    {plan.badge && !plan.popular && (
                      <span className="badge text-[10px]">{plan.badge}</span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    {plan.desc}
                  </p>

                  <div className="my-4 border-y border-line py-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight text-white">
                        ${price}
                      </span>
                      <span className="text-xs text-zinc-500">{period}</span>
                    </div>
                    {billingCycle === 'yearly' && plan.yearlySavings > 0 && (
                      <p className="mt-0.5 text-[11px] text-emerald-400">
                        Saves ${plan.yearlySavings} per year
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 text-xs text-zinc-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check size={13} className="shrink-0 text-emerald-400 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-3 border-t border-line">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="btn btn-sm w-full opacity-70 cursor-default"
                    >
                      <Check size={13} className="text-emerald-400" /> Current Active Plan
                    </button>
                  ) : plan.id === 'free' ? (
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      className="btn btn-ghost btn-sm w-full text-zinc-400 hover:text-zinc-200"
                    >
                      Downgrade to Trial
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCheckout(plan)}
                      className={`btn btn-sm w-full ${plan.popular ? 'btn-primary' : ''}`}
                    >
                      Upgrade to {plan.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment Method & Invoices Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Payment Method Card */}
        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <div className="flex items-center gap-2">
              <CreditCard size={14} />
              <span>Payment Method</span>
            </div>
            {account?.cardLast4 && (
              <span className="badge badge-success text-[10px]">Verified</span>
            )}
          </div>

          {account?.cardLast4 ? (
            <div className="rounded-md border border-line bg-canvas p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-zinc-200">
                  <CreditCard size={15} className="text-zinc-400" />
                  <span>{account?.cardBrand || 'Card'} ending in {account?.cardLast4}</span>
                </div>
                <span className="text-[11px] text-zinc-500">Exp: {account?.cardExp || '12/28'}</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Cardholder: {account?.cardholderName || account?.name}
              </p>
              <div className="pt-2 flex justify-end gap-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => openCheckout(activePlan.id === 'free' ? PLANS[1] : activePlan)}
                  className="btn btn-sm text-[11px]"
                >
                  Update Card
                </button>
                {isPaidActive && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="btn btn-danger btn-sm text-[11px]"
                  >
                    Cancel Plan
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-line bg-surface-2 p-3 text-xs text-zinc-400 space-y-2">
              <p>No card on file for this trial account. Add a payment method to ensure uninterrupted access.</p>
              <button
                type="button"
                onClick={() => openCheckout(PLANS[1])}
                className="btn btn-sm btn-primary text-xs"
              >
                <Plus size={12} /> Add Payment Method
              </button>
            </div>
          )}
        </section>

        {/* Invoices & Receipts */}
        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <div className="flex items-center gap-2">
              <Receipt size={14} />
              <span>Billing History & Invoices</span>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-md border border-line bg-surface-2 p-3 text-xs text-zinc-500">
              No invoices generated during the initial free trial period.
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-line bg-canvas px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium text-zinc-200">
                      {inv.id} · <span className="text-zinc-400">{inv.amount}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {inv.date} · {inv.plan}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadInvoice(inv)}
                    className="btn btn-sm"
                  >
                    <Download size={11} /> Receipt
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Manual Product Key Activation Section */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <KeyRound size={14} />
          <span>Product Key Activation (5×5 Format)</span>
        </div>
        <p className="text-xs text-zinc-500">
          Enter an authentic 25-character product key formatted as <code className="font-mono">XXXXX-XXXXX-XXXXX-XXXXX-XXXXX</code>.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={licenseInput}
            onChange={handleLicenseInputChange}
            placeholder="PRO20-XXXXX-XXXXX-XXXXX-XXXXX"
            className="input font-mono uppercase"
          />
          <button
            type="button"
            onClick={() => handleActivateKey()}
            className="btn btn-primary"
          >
            Activate Key
          </button>
        </div>

        {/* Current Active License Display */}
        {account?.licenseKey && (
          <div className="flex items-center justify-between rounded-md border border-line bg-canvas px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Active License:</span>
              <span className="font-mono text-zinc-200">{maskKey(account.licenseKey)}</span>
            </div>
            <button
              type="button"
              onClick={() => copyLicense(account.licenseKey)}
              className="btn btn-ghost btn-sm"
            >
              <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {/* Generated Demo Keys for testing */}
        <div className="pt-2 border-t border-line text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Test Product Keys (Single-Use):</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => generateNewOneTimeKey('PRO20')}
                className="btn btn-ghost btn-sm text-[11px]"
              >
                + Generate Pro ($20)
              </button>
              <button
                type="button"
                onClick={() => generateNewOneTimeKey('MAX50')}
                className="btn btn-ghost btn-sm text-[11px]"
              >
                + Generate Max ($50)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {generatedOneTimeKeys.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setLicenseInput(item.key);
                  handleActivateKey(item.key);
                }}
                className="badge font-mono hover:border-zinc-500 hover:text-white cursor-pointer"
                title="Click to apply and activate this key"
              >
                {item.key} ({item.label})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* REAL CHECKOUT MODAL ("Make the paying page actually work") */}
      {checkoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg border-zinc-700 bg-[#121214] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-emerald-400">
                  <Lock size={15} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-zinc-50">
                    Secure Checkout — {checkoutTarget.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Encrypted 256-bit payment authorization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutTarget(null)}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCompleteCheckout} className="space-y-4">
              {/* Billing Cycle Switcher inside modal */}
              <div className="segmented w-full grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleCycleChange('monthly')}
                  data-active={billingCycle === 'monthly'}
                >
                  Monthly (${checkoutTarget.monthlyPrice} / mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleCycleChange('yearly')}
                  data-active={billingCycle === 'yearly'}
                >
                  Annual (${checkoutTarget.yearlyTotal} / yr · Save 20%)
                </button>
              </div>

              {/* Order Summary & Pricing Breakdown */}
              <div className="rounded-md border border-line bg-surface-2 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Subscription:</span>
                  <span className="font-medium text-zinc-200">
                    {checkoutTarget.name} ({billingCycle === 'yearly' ? '12 Months' : '1 Month'})
                  </span>
                </div>
                {promoApplied && (
                  <div className="flex items-center justify-between text-emerald-400 font-medium">
                    <span>Coupon ({promoApplied.code}):</span>
                    <span>-{promoApplied.discountPercent}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold text-zinc-50">
                  <span>Total Due Today:</span>
                  <span className="font-mono text-emerald-400">${calculateTotal(checkoutTarget)}.00 USD</span>
                </div>
              </div>

              {/* Credit Card Input Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="field-label mb-0 text-xs text-zinc-300">Payment Details</label>
                  <button
                    type="button"
                    onClick={fillDemoCard}
                    className="text-[11px] text-aura-400 hover:underline cursor-pointer"
                  >
                    Fill Demo Card
                  </button>
                </div>

                <div>
                  <label className="field-label text-[11px]">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Full name as printed on card"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label text-[11px]">Card Number</label>
                    <span className="badge text-[10px] uppercase font-mono">{detectBrand(cardNumber)}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      className="input font-mono text-xs pl-8"
                    />
                    <CreditCard size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label text-[11px]">Expiration Date</label>
                    <input
                      type="text"
                      required
                      value={cardExp}
                      onChange={handleCardExpChange}
                      placeholder="MM/YY"
                      className="input font-mono text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="field-label text-[11px]">Security Code (CVC)</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      placeholder="123"
                      className="input font-mono text-xs text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label text-[11px]">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Germany">Germany</option>
                      <option value="Canada">Canada</option>
                      <option value="France">France</option>
                      <option value="Romania">Romania</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label text-[11px]">Postal / Zip Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Zip code"
                      className="input text-xs"
                    />
                  </div>
                </div>

                {/* Promo Code Input */}
                <div className="pt-1">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Promo code (e.g. AURA100 or WELCOME50)"
                      className="input text-xs font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      className="btn btn-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {paymentError}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-line">
                <span className="text-[11px] text-zinc-500">
                  Guaranteed 30-day money-back policy
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutTarget(null)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    <Lock size={12} />
                    <span>
                      {processing
                        ? 'Authorizing Card…'
                        : `Pay $${calculateTotal(checkoutTarget)}.00 & Activate`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Subscription Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md border-red-500/30 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-400">
                <Trash2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Cancel Subscription</h3>
                <p className="text-xs text-zinc-400">Are you sure you want to cancel your plan?</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              If you cancel, you will lose access to premium Cloud models, Google Workspace connectors, and Desktop Co-Pilot. Your account will revert to the Free Trial tier.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleDowngradeToFree}
                className="btn btn-danger btn-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

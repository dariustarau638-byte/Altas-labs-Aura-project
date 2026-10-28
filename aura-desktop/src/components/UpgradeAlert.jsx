import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Sparkles, X, ArrowRight, Zap } from 'lucide-react';
import { onUpgradeAlert, aura } from '../lib/bridge.js';

/**
 * Premium Linear/Vercel styled Non-Intrusive Upgrade Alert.
 * Appears when a Free user hits a Pro feature limit (Screen Vision, Cloud LLMs, Daily 50-action limit).
 * - Matte dark surface (#121214) with subtle amber/gold accent (#F59E0B / #D97706)
 * - 100% English, zero Romanian words
 * - Dismissible via button or Esc key
 * - Smooth entrance and exit animations
 * - Never locks modals or blocks typing
 */
export default function UpgradeAlert({
  alert: controlledAlert = null,
  onClose = null,
  onUpgrade = null,
  compact = false,
  className = '',
}) {
  const [internalAlert, setInternalAlert] = useState(null);

  useEffect(() => {
    // Listen to global upgrade events from backend, bridge, or local dispatch
    const unsubscribe = onUpgradeAlert((data) => {
      if (data && (data.upgradeRequired || data.code)) {
        setInternalAlert(data);
      }
    });
    return () => unsubscribe();
  }, []);

  const currentAlert = controlledAlert || internalAlert;

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalAlert(null);
    }
  };

  useEffect(() => {
    if (!currentAlert) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAlert]);

  if (!currentAlert) return null;

  const isDailyLimit = currentAlert.code === 'DAILY_LIMIT_EXCEEDED';
  const isVision =
    currentAlert.feature === 'screenVision' ||
    currentAlert.code === 'PRO_FEATURE_REQUIRED' && currentAlert.feature === 'screenVision';
  const isCloudLlm = currentAlert.feature === 'cloudLlms';

  const badgeText = isDailyLimit
    ? 'DAILY QUOTA REACHED'
    : isVision
      ? 'PRO VISION'
      : isCloudLlm
        ? 'PRO CLOUD LLM'
        : 'PRO FEATURE';

  const titleText = isDailyLimit
    ? 'Daily 50-Action Limit Reached'
    : isVision
      ? 'Screen Vision Requires Aura Pro'
      : isCloudLlm
        ? 'Cloud LLMs are Reserved for Pro'
        : 'Upgrade to Aura Pro';

  const messageText =
    currentAlert.error ||
    currentAlert.message ||
    (isDailyLimit
      ? 'Free tier includes 50 daily actions. Upgrade to Pro for unlimited actions, priority inference, and full cloud models.'
      : isVision
        ? 'Visual screen context and image analysis are unlocked with Aura Pro ($20/month).'
        : 'Unlock premier Cloud models (GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Pro) with Aura Pro.');

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      try {
        aura.app?.openDashboard?.();
        window.dispatchEvent(
          new CustomEvent('aura:navigate-dashboard', { detail: { section: 'billing' } })
        );
      } catch {}
    }
    handleDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="upgrade-alert-banner"
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-lg border border-amber-500/25 bg-[#121214] p-3 text-xs text-zinc-200 shadow-xl shadow-black/40 ${className}`}
        role="alert"
        aria-live="polite"
      >
        {/* Subtle amber gradient hairline at top */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="grid size-6 shrink-0 place-items-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
              {isDailyLimit ? <Zap size={13} /> : <Crown size={13} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                <span className="font-semibold text-zinc-100">{titleText}</span>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-medium tracking-wide text-amber-300 uppercase">
                  {badgeText}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
                {messageText}
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUpgradeClick}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-950 transition-colors hover:bg-white active:scale-[0.98]"
                >
                  <Sparkles size={11} className="text-amber-600" />
                  <span>Upgrade to Pro — $20/mo</span>
                  <ArrowRight size={11} />
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss upgrade alert"
            className="grid size-5 shrink-0 place-items-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { displayName } from '../../shared/settings.js';
import { aura, emitUpgradeAlert } from '../lib/bridge.js';
import { useSettings } from '../lib/useSettings.js';
import { useVoice } from '../lib/useVoice.js';
import TopNotch from './components/TopNotch.jsx';
import Header from './components/Header.jsx';
import MessageList from './components/MessageList.jsx';
import Composer from './components/Composer.jsx';
import UpgradeAlert from '../components/UpgradeAlert.jsx';
import { useAiStatus } from './hooks/useAiStatus.js';
import { useChat } from './hooks/useChat.js';

/**
 * MacBook-style Dynamic Notch at the top edge of the display.
 * - Collapsed: A discreet 180x32px black notch pinned to the top screen border.
 * - Hover / Expanded: Smoothly expands downward (420x590px) revealing the full Aura companion.
 */
const SHAPES = {
  collapsed: {
    width: 180,
    height: 32,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  expanded: {
    width: 420,
    height: 590,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
};

const SPRING = { type: 'spring', stiffness: 360, damping: 28, mass: 0.85 };

const fade = {
  initial: { opacity: 0, filter: 'blur(4px)' },
  animate: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.2, delay: 0.04 } },
  exit: { opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } },
};

export default function Widget() {
  const { settings, update: updateSettings } = useSettings();
  const status = useAiStatus();
  const activeModel = settings.ai.model || status.model;

  const voice = useVoice(settings.voice, settings.assistant.language);

  const handleAddMemoryFact = useCallback(
    (newFact) => {
      const existing = Array.isArray(settings.memory?.facts) ? settings.memory.facts : [];
      if (!existing.includes(newFact)) {
        updateSettings({ memory: { facts: [newFact, ...existing].slice(0, 50) } });
      }
    },
    [settings.memory?.facts, updateSettings],
  );

  const chat = useChat(activeModel, {
    autoSave: settings.memory?.autoSaveChats !== false,
    memoryFacts: settings.memory?.facts || [],
    onAddMemoryFact: handleAddMemoryFact,
    onAssistantDone: (msg) => {
      if (settings.voice?.enabled && settings.voice?.autoSpeak) {
        voice.speak(msg.content, msg.id);
      }
    },
  });

  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copilot, setCopilot] = useState({
    active: false,
    mode: 'idle',
    activeWindowTitle: 'Desktop Windows',
    cursorX: 0,
    cursorY: 0,
  });

  useEffect(() => {
    aura.copilot
      ?.status()
      .then((s) => {
        if (s) setCopilot((prev) => ({ ...prev, ...s }));
      })
      .catch(() => {});
    const offCopilot = aura.copilot?.onStatus((s) => {
      if (s) setCopilot((prev) => ({ ...prev, ...s }));
    });
    return () => offCopilot?.();
  }, []);

  const shellRef = useRef(null);
  const inputRef = useRef(null);
  const hoveredRef = useRef(false);
  const expandTimer = useRef(null);
  const collapseTimer = useRef(null);
  const state = useRef({});
  state.current = { expanded, pinned, behavior: settings.behavior };

  const clearTimers = () => {
    clearTimeout(expandTimer.current);
    clearTimeout(collapseTimer.current);
  };

  const expand = useCallback((focusInput = false) => {
    clearTimers();
    setExpanded(true);
    aura.widget.setInteractive(true);
    if (focusInput) {
      aura.widget.focus();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, []);

  const collapse = useCallback(() => {
    clearTimers();
    setExpanded(false);
    setHistoryOpen(false);
    inputRef.current?.blur();
    aura.widget.setInteractive(false);
  }, []);

  const shouldStayOpen = useCallback(
    () =>
      state.current.pinned ||
      (document.hasFocus() && document.activeElement === inputRef.current),
    [],
  );

  const scheduleCollapse = useCallback(
    (delay = 400) => {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = setTimeout(() => {
        if (!hoveredRef.current && !shouldStayOpen()) {
          collapse();
        }
      }, delay);
    },
    [collapse, shouldStayOpen],
  );

  // Hover
  const handleMouseEnter = () => {
    hoveredRef.current = true;
    aura.widget.setInteractive(true);
    clearTimeout(collapseTimer.current);
    if (!state.current.expanded) {
      expandTimer.current = setTimeout(() => {
        expand(false);
      }, 90);
    }
  };

  const handleMouseLeave = () => {
    hoveredRef.current = false;
    clearTimeout(expandTimer.current);
    if (state.current.expanded) {
      scheduleCollapse(350);
    } else {
      aura.widget.setInteractive(false);
    }
  };

  // Keyboard shortcut, Escape, blur
  useEffect(() => {
    const offToggle = aura.widget.onToggle(() => {
      if (state.current.expanded) collapse();
      else expand(true);
    });
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (copilot.pendingPlans?.some((p) => p.status === 'executing')) {
          chat.stopDesktopControl();
        } else if (state.current.expanded) {
          collapse();
        }
      }
    };
    const onBlur = () => {
      if (state.current.expanded && !hoveredRef.current) scheduleCollapse(250);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      offToggle();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [collapse, expand, scheduleCollapse, copilot.pendingPlans, chat]);

  const togglePin = () => {
    setPinned((p) => {
      if (p && !hoveredRef.current) scheduleCollapse();
      return !p;
    });
  };

  const handleToggleAutoSpeak = () => {
    if (voice.speaking) {
      voice.stopSpeaking();
      return;
    }
    updateSettings({ voice: { autoSpeak: !settings.voice?.autoSpeak } });
  };

  const [screenAttached, setScreenAttached] = useState(null);

  const handleToggleScreen = async () => {
    if (screenAttached) {
      setScreenAttached(null);
      return;
    }
    const currentPlan = settings.account?.plan || 'free';
    if (currentPlan === 'free') {
      emitUpgradeAlert({
        code: 'PRO_FEATURE_REQUIRED',
        feature: 'screenVision',
        error: 'Screen Vision requires an Aura Pro subscription. Upgrade to unlock visual screen intelligence.',
        tier: 'free',
        upgradeRequired: true,
      });
      return;
    }
    try {
      const snap = await aura.connectors?.captureScreen?.();
      if (snap?.dataUrl) {
        setScreenAttached(snap.dataUrl);
      }
    } catch {}
  };

  const handleSend = () => {
    if (chat.send(input, { control: copilot.active, imageDataUrl: screenAttached })) {
      setInput('');
      setScreenAttached(null);
    }
  };

  const pickPrompt = (prompt) => {
    setInput(prompt);
    expand(true);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(prompt.length, prompt.length);
    });
  };

  const handleToggleDictation = () => {
    voice.toggleDictation((transcript) => {
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      inputRef.current?.focus();
    });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    aura.widget.contextMenu();
  };

  const name = displayName(settings);

  return (
    <div className="flex h-screen w-screen items-start justify-center pt-0 select-none">
      <motion.div
        ref={shellRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        initial={false}
        animate={expanded ? SHAPES.expanded : SHAPES.collapsed}
        transition={SPRING}
        style={{
          borderBottomLeftRadius: expanded ? 26 : 16,
          borderBottomRightRadius: expanded ? 26 : 16,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
        className={`relative overflow-hidden transition-colors ${
          expanded
            ? 'border-x border-b border-zinc-800/80 bg-[#121214]'
            : 'border-x border-b border-zinc-800/80 bg-black'
        }`}
      >
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div
              key="expanded-panel"
              {...fade}
              className="flex h-full w-full flex-col"
            >
              <Header
                name={name}
                personality={settings.assistant.personality}
                status={status}
                streaming={chat.streaming}
                speaking={voice.speaking}
                autoSpeak={settings.voice?.autoSpeak}
                onToggleAutoSpeak={handleToggleAutoSpeak}
                copilotActive={copilot.active}
                onToggleCopilot={() => aura.copilot.toggle()}
                onCaptureScreen={() => {
                  setHistoryOpen(false);
                  const currentPlan = settings.account?.plan || 'free';
                  if (currentPlan === 'free') {
                    emitUpgradeAlert({
                      code: 'PRO_FEATURE_REQUIRED',
                      feature: 'screenVision',
                      error: 'Screen Vision requires an Aura Pro subscription. Upgrade to unlock visual screen intelligence.',
                      tier: 'free',
                      upgradeRequired: true,
                    });
                    return;
                  }
                  chat.captureAndAnalyzeScreen('');
                }}
                historyOpen={historyOpen}
                onToggleHistory={() => setHistoryOpen((v) => !v)}
                savedCount={chat.savedChats?.length || 0}
                pinned={pinned}
                onTogglePin={togglePin}
                onOpenDashboard={() => aura.app.openDashboard()}
                onClear={() => {
                  voice.stopSpeaking();
                  setHistoryOpen(false);
                  chat.clear();
                }}
                onCollapse={collapse}
              />

              {/* Mouse Control Active Banner */}
              {copilot.active && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-aura-500/20 bg-aura-500/10 px-3.5 py-1.5 text-[11px]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-aura-400" />
                    <span className="truncate font-medium text-aura-300">
                      🖱️ Mouse Control active: type what you want Aura to perform
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryOpen(false);
                      pickPrompt('/control open Notepad and write an executive summary');
                    }}
                    className="btn btn-sm h-5 rounded px-2 text-[10px] bg-aura-500/20 text-aura-300 hover:bg-aura-500/30"
                  >
                    Example
                  </button>
                </div>
              )}

              <div className="relative min-h-0 flex-1">
                {historyOpen ? (
                  <div className="scroll-thin h-full space-y-4 overflow-y-auto px-4 py-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-100">
                          Saved Conversations ({chat.savedChats.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setHistoryOpen(false)}
                          className="text-[11px] font-medium text-aura-400 transition-colors hover:text-aura-300"
                        >
                          Back to chat
                        </button>
                      </div>
                      {chat.savedChats.length === 0 ? (
                        <div className="mt-2 rounded-lg border border-zinc-800/60 bg-[#161619] p-3 text-xs text-zinc-400">
                          No saved conversations yet.
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {chat.savedChats.map((s) => (
                            <li
                              key={s.id}
                              className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-[#161619] px-3 py-2"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  chat.loadSession(s);
                                  setHistoryOpen(false);
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="truncate text-xs font-medium text-zinc-200">
                                  {s.title}
                                </div>
                                <div className="truncate font-mono text-[10px] text-zinc-500">
                                  {s.messageCount} messages · {s.preview}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => chat.deleteSession(s.id)}
                                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-300"
                                title="Delete conversation"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <MessageList
                    messages={chat.messages}
                    userNickname={settings.account?.userNickname || settings.account?.name}
                    onPickPrompt={pickPrompt}
                    onSendImmediate={(p) => chat.send(p, { control: copilot.active })}
                    onAnalyzeFile={chat.analyzeFile}
                    onAnalyzeContext={chat.analyzeContext}
                    onExecuteLocalAction={chat.executeQuickLocalAction}
                    onCaptureMomentNow={chat.captureMomentNow}
                    onApproveDesktopPlan={chat.approveDesktopPlan}
                    onRejectDesktopPlan={chat.rejectDesktopPlan}
                    speakingId={voice.speakingId}
                    onToggleSpeak={voice.toggleSpeak}
                    voiceEnabled={settings.voice?.enabled}
                  />
                )}
              </div>

              <div className="px-3 pb-1">
                <UpgradeAlert />
              </div>

              <Composer
                inputRef={inputRef}
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={chat.stop}
                streaming={chat.streaming}
                canDictate={voice.canDictate}
                listening={voice.listening}
                onToggleDictation={handleToggleDictation}
                controlMode={copilot.active}
                controlBusy={copilot.pendingPlans?.some((p) => p.status === 'executing')}
                onExitControlMode={() => aura.copilot.toggle(false)}
                onStopControl={chat.stopDesktopControl}
                onAttachScreen={handleToggleScreen}
                screenAttached={Boolean(screenAttached)}
                onBlur={() => !hoveredRef.current && state.current.expanded && scheduleCollapse()}
              />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-notch"
              {...fade}
              className="flex h-full w-full items-center justify-center"
            >
              <TopNotch
                name={name}
                status={status}
                streaming={chat.streaming || voice.speaking}
                onClick={() => expand(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

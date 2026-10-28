import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Terminal,
  MessageSquare,
  ShieldCheck,
  Settings,
  RefreshCw,
  Power,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  Square,
  FolderGit2,
  ExternalLink,
  Send,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Wifi,
  WifiOff,
  Globe,
  KeyRound,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  Maximize2,
  Code2,
  Lock
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('screen');

  // Detectare inițială URL server (poate fi local Wi-Fi sau URL-ul public Cloudflare)
  const [serverUrl, setServerUrl] = useState(() => {
    const saved = localStorage.getItem('aura_mobile_server_url');
    // Dacă utilizatorul a deschis aplicația direct pe linkul Cloudflare (*.trycloudflare.com), folosește direct originea
    if (window.location.hostname.includes('trycloudflare.com') || window.location.port === '5190') {
      return window.location.origin;
    }
    if (saved) return saved;
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5190`;
  });

  // Cod PIN de Securitate
  const [pin, setPin] = useState(() => {
    // Verifică hash-ul URL (#pin=123456) sau query-ul (?pin=123456)
    const hash = window.location.hash;
    if (hash && hash.includes('pin=')) {
      const match = hash.match(/pin=([0-9a-zA-Z]+)/);
      if (match) {
        localStorage.setItem('aura_mobile_pin', match[1]);
        return match[1];
      }
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('pin')) {
      localStorage.setItem('aura_mobile_pin', params.get('pin'));
      return params.get('pin');
    }
    return localStorage.getItem('aura_mobile_pin') || '';
  });

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [screenUrl, setScreenUrl] = useState('');
  const [screenTimestamp, setScreenTimestamp] = useState(Date.now());
  const [isStreaming, setIsStreaming] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  // Chat State
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'aura',
      text: 'Salut! Sunt Aura. Te poți conecta de oriunde (4G/5G sau orice Wi-Fi). Controlez PC-ul tău de la distanță, transmit ecranul live și pot lansa sesiuni de codare.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Coding State
  const [selectedProject, setSelectedProject] = useState('atlas-web');
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [customCommand, setCustomCommand] = useState('git status');

  const logsEndRef = useRef(null);

  const isGlobalConnection =
    serverUrl.includes('trycloudflare.com') || window.location.hostname.includes('trycloudflare.com');

  const getHeaders = () => {
    const h = { 'Content-Type': 'application/json' };
    if (pin) h['x-aura-pin'] = pin;
    return h;
  };

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Polling status
  useEffect(() => {
    localStorage.setItem('aura_mobile_server_url', serverUrl);
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/status`, {
          headers: getHeaders(),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setStatus(data);
            setConnected(true);
            setPinError('');
          }
        } else if (res.status === 401) {
          if (isMounted) {
            setConnected(false);
            setPinModalOpen(true);
            setPinError('PIN invalid sau expirat.');
          }
        } else {
          if (isMounted) setConnected(false);
        }
      } catch {
        if (isMounted) setConnected(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [serverUrl, pin]);

  // Screen streaming loop
  useEffect(() => {
    if (!connected || !isStreaming || activeTab !== 'screen') return;

    const tick = () => {
      setScreenTimestamp(Date.now());
      setScreenUrl(`${serverUrl}/api/screen?t=${Date.now()}&scale=0.8&q=65&pin=${encodeURIComponent(pin)}`);
    };

    tick();
    const streamInterval = setInterval(tick, 1800);
    return () => clearInterval(streamInterval);
  }, [connected, isStreaming, activeTab, serverUrl, pin]);

  // SSE Events connection
  useEffect(() => {
    if (!connected) return;

    let eventSource;
    try {
      eventSource = new EventSource(`${serverUrl}/api/events?pin=${encodeURIComponent(pin)}`);
      eventSource.addEventListener('terminal', (e) => {
        const data = JSON.parse(e.data);
        setTerminalLogs((prev) => [...prev.slice(-100), data.text]);
      });
      eventSource.addEventListener('log', (e) => {
        const data = JSON.parse(e.data);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'system',
            text: `[${data.source}] ${data.message}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      });
    } catch {}

    return () => {
      eventSource?.close();
    };
  }, [connected, serverUrl, pin]);

  // Handlers
  const handleToggleVision = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/copilot/toggle`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus((prev) => ({
          ...prev,
          copilot: data.status,
        }));
      }
    } catch (e) {
      alert(`Eroare comunicare: ${e.message}`);
    }
  };

  const handleExecuteAction = async (actionId) => {
    setLoadingAction(true);
    try {
      const res = await fetch(`${serverUrl}/api/action`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'aura',
            text: `✅ Acțiune executată pe PC: ${data.message || data.result?.message || actionId}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (e) {
      alert(`Eroare acțiune: ${e.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSendCommand = async (e) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    const recentConversation = messages
      .filter((message) => message.sender === 'user' || message.sender === 'aura')
      .slice(-18)
      .map((message) => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text,
      }));
    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');

    try {
      const res = await fetch(`${serverUrl}/api/command`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompt: text, messages: [...recentConversation, { role: 'user', content: text }] }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'aura',
            text: data.response || (data.type === 'action' ? `Executat: ${data.result?.message}` : `Plan creat pentru: ${text}`),
            plan: data.plan,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        if (data.plan) {
          setActiveTab('plans');
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'aura',
            text: data.error || 'Aura nu a putut procesa comanda.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'aura',
          text: `⚠️ Nu am putut contacta PC-ul: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleCodingAction = async (action, commandText) => {
    try {
      setTerminalLogs((prev) => [...prev, `> [AURA REMOTE] Trimitere comandă: ${action}...`]);
      const res = await fetch(`${serverUrl}/api/coding-session`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action,
          projectKey: selectedProject,
          command: commandText,
          sessionId: activeSessionId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.sessionId) setActiveSessionId(data.sessionId);
        if (data.output) setTerminalLogs((prev) => [...prev, data.output]);
        if (data.message) setTerminalLogs((prev) => [...prev, `[PC] ${data.message}`]);
      } else {
        setTerminalLogs((prev) => [...prev, `[EROARE] ${data.error}`]);
      }
    } catch (err) {
      setTerminalLogs((prev) => [...prev, `[EROARE REȚEA] ${err.message}`]);
    }
  };

  const handleApprovePlan = async (planId) => {
    try {
      const res = await fetch(`${serverUrl}/api/plan/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.ok) {
        alert('Plan aprobat! Aura execută acțiunea pe desktop.');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRejectPlan = async (planId) => {
    try {
      await fetch(`${serverUrl}/api/plan/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ planId }),
      });
      alert('Plan respins.');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSavePin = () => {
    const clean = pinInput.trim();
    if (clean) {
      setPin(clean);
      localStorage.setItem('aura_mobile_pin', clean);
      setPinModalOpen(false);
      setPinError('');
    }
  };

  const handleCopyDirectLink = () => {
    if (status?.tunnel?.directLink) {
      navigator.clipboard.writeText(status.tunnel.directLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b12] text-slate-100 select-none overflow-hidden font-sans">
      {/* 1. TOP STATUS BAR */}
      <header className="flex-none px-4 py-3 bg-[#0c121e]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`} />
            {connected && <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-60" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-white">AURA MOBILE</span>
              {isGlobalConnection ? (
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 font-mono rounded border border-indigo-500/30 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" /> 4G/5G GLOBAL
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-mono rounded border border-cyan-500/30 flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" /> WI-FI LOCAL
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              {connected ? (
                <>
                  <span>{status?.hostname || 'PC'}</span>
                  {status?.systemStats?.cpu?.loadPercent !== undefined && (
                    <span className="text-cyan-400 font-mono ml-1">CPU {status.systemStats.cpu.loadPercent}%</span>
                  )}
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400 inline" />
                  <span className="text-rose-400">Deconectat de la PC</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vision Cursor Toggle Quick Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleVision}
            disabled={!connected}
            title="Comută Cursor Neon & Live Vision pe PC"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              status?.copilot?.active
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            {status?.copilot?.active ? (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Cursor Neon ON</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Vision OFF</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT (BODY) */}
      <main className="flex-1 overflow-y-auto relative p-3">
        {/* TAB 1: ECRAN PC LIVE */}
        {activeTab === 'screen' && (
          <div className="flex flex-col gap-3 h-full">
            {/* Viewport Ecran */}
            <div className="relative flex-1 bg-black/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[260px]">
              {screenUrl && connected ? (
                <img
                  src={screenUrl}
                  alt="Live Desktop"
                  className="w-full h-full object-contain pointer-events-none"
                  onError={() => setConnected(false)}
                />
              ) : (
                <div className="text-center p-6 flex flex-col items-center gap-3">
                  <Monitor className="w-12 h-12 text-slate-600 animate-pulse" />
                  <div className="text-sm text-slate-400 font-medium">Așteptare flux ecran de la PC...</div>
                  <div className="text-xs text-slate-500">Asigură-te că Aura Desktop rulează pe PC.</div>
                </div>
              )}

              {/* Badges deasupra imaginii */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-cyan-300 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>{status?.copilot?.activeWindowTitle?.slice(0, 30) || 'Desktop Windows'}</span>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                    isStreaming
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isStreaming ? 'Live • Auto' : 'Pauză'}
                </button>
                <button
                  onClick={() => setScreenTimestamp(Date.now())}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded text-slate-300 border border-slate-700"
                  title="Reîmprospătează ecranul"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bara de Acțiuni Rapide Desktop */}
            <div className="flex-none bg-[#0e1626] rounded-xl p-3 border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                <span>COMENZI RAPIDE PC</span>
                {loadingAction && <span className="text-cyan-400 text-[10px] animate-pulse">Se execută...</span>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleExecuteAction('lock_pc')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-all active:scale-95"
                >
                  <Power className="w-4 h-4 text-rose-400 mb-1" />
                  <span>Blochează</span>
                </button>
                <button
                  onClick={() => handleExecuteAction('minimize_all')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-all active:scale-95"
                >
                  <Layers className="w-4 h-4 text-indigo-400 mb-1" />
                  <span>Minimizează</span>
                </button>
                <button
                  onClick={() => handleExecuteAction('clean_temp')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
                  <span>Curăță Temp</span>
                </button>
                <button
                  onClick={() => handleExecuteAction('volume_mute')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-all active:scale-95"
                >
                  <VolumeX className="w-4 h-4 text-emerald-400 mb-1" />
                  <span>Mute Audio</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHAT & COMENZI AURA AI */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full gap-2">
            {/* Mesaje */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col max-w-[85%] ${
                    m.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-[0_2px_12px_rgba(0,180,255,0.25)]'
                        : m.sender === 'system'
                        ? 'bg-slate-800/90 text-slate-300 text-xs font-mono border border-slate-700 rounded-bl-none'
                        : 'bg-[#131b2e] text-slate-200 border border-slate-700/80 rounded-bl-none shadow-md'
                    }`}
                  >
                    {m.text}

                    {/* Card plan de acțiune dacă e atașat */}
                    {m.plan && (
                      <div className="mt-2.5 p-2 bg-slate-900/90 rounded-xl border border-cyan-500/40 text-xs">
                        <div className="font-semibold text-cyan-300 flex items-center gap-1 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Plan Desktop Generat
                        </div>
                        <div className="text-slate-300 mb-2">{m.plan.instruction}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprovePlan(m.plan.id)}
                            className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-center"
                          >
                            Aprobă
                          </button>
                          <button
                            onClick={() => handleRejectPlan(m.plan.id)}
                            className="flex-1 py-1 px-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg text-center"
                          >
                            Refuză
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{m.time}</span>
                </div>
              ))}
            </div>

            {/* Quick Prompts */}
            <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none flex-none">
              {[
                'Deschide VS Code',
                'Curăță %TEMP%',
                'Ce ferestre am deschise?',
                'Mute sunet',
                'Diagnostic PC',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setPrompt(chip)}
                  className="flex-none px-2.5 py-1 bg-slate-800/70 hover:bg-slate-800 text-[11px] text-slate-300 rounded-full border border-slate-700/60 active:scale-95 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendCommand} className="flex-none flex items-center gap-2 pt-1">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Comandă-i ceva lui Aura..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#11192b] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,240,255,0.3)] active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: SESIUNI DE CODARE (CODING STUDIO) */}
        {activeTab === 'coding' && (
          <div className="flex flex-col h-full gap-3">
            {/* Selector Proiect */}
            <div className="flex-none bg-[#0e1626] p-3 rounded-xl border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                <span>PROIECT PE PC</span>
                <span className="text-[10px] text-cyan-400 font-mono">VS CODE REMOTE</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'atlas-web', label: 'Atlas Web', desc: 'Site & SaaS' },
                  { id: 'aura-desktop', label: 'Aura PC', desc: 'Electron Co-Pilot' },
                  { id: 'aura-mobile', label: 'Aura Mobil', desc: 'App Telefon' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p.id)}
                    className={`p-2 rounded-lg text-left transition-all border ${
                      selectedProject === p.id
                        ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{p.label}</div>
                    <div className="text-[10px] opacity-75">{p.desc}</div>
                  </button>
                ))}
              </div>

              {/* Butoane Acțiuni de Codare */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => handleCodingAction('open_vscode')}
                  className="py-2 px-3 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Deschide VS Code</span>
                </button>
                <button
                  onClick={() => handleCodingAction('start_dev')}
                  className="py-2 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Dev Server</span>
                </button>
              </div>
            </div>

            {/* Consola Terminal Live */}
            <div className="flex-1 flex flex-col bg-black/90 rounded-xl border border-slate-800 p-2.5 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Terminal PC Output</span>
                </div>
                {activeSessionId && (
                  <button
                    onClick={() => handleCodingAction('stop_process')}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                  >
                    <Square className="w-3 h-3" /> Stop Server
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed select-text">
                {terminalLogs.length === 0 ? (
                  <span className="text-slate-600">// Ieșirea comenzilor de pe PC va apărea aici în timp real...</span>
                ) : (
                  terminalLogs.map((log, i) => <div key={i}>{log}</div>)
                )}
                <div ref={logsEndRef} />
              </div>

              {/* Rulare comandă custom */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="ex: git status, npm test..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleCodingAction('run_terminal', customCommand)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700"
                >
                  Execută
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PLANURI AGENT (APROBĂRI) */}
        {activeTab === 'plans' && (
          <div className="flex flex-col gap-3 h-full">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>PLANURI DE ACȚIUNE AURA</span>
              <span className="text-[10px] text-cyan-400">SIGURANȚĂ CU CONFIRMARE</span>
            </div>

            {status?.copilot?.pendingPlans && status.copilot.pendingPlans.length > 0 ? (
              <div className="flex flex-col gap-3 overflow-y-auto">
                {status.copilot.pendingPlans.map((plan) => (
                  <div key={plan.id} className="bg-[#0f172a] rounded-xl border border-cyan-500/40 p-3.5 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Așteaptă Aprobare
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{plan.createdAt}</span>
                    </div>

                    <div className="text-sm font-semibold text-white mb-2">{plan.instruction}</div>

                    <div className="text-xs text-slate-400 space-y-1 mb-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div>Fereastră: <span className="text-slate-200">{plan.activeWindow}</span></div>
                      <div>Proces: <span className="font-mono text-cyan-300">{plan.activeProcess}</span></div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePlan(plan.id)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobă și Execută</span>
                      </button>
                      <button
                        onClick={() => handleRejectPlan(plan.id)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Refuză</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ShieldCheck className="w-12 h-12 text-slate-600 mb-2" />
                <div className="text-sm font-medium text-slate-400">Nu există planuri în așteptare</div>
                <div className="text-xs mt-1">Când îi ceri lui Aura să execute acțiuni complexe pe PC, le poți aproba de aici.</div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CONEXIUNE & INTERNET GLOBAL */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-3 h-full overflow-y-auto">
            {/* Card Acces Global 4G/5G */}
            <div className="bg-gradient-to-br from-[#121c33] to-[#0c1424] p-3.5 rounded-xl border border-indigo-500/40 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>ACCES GLOBAL 4G / 5G / ORICE WI-FI</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                  status?.tunnel?.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {status?.tunnel?.status === 'active' ? '● ACTIV (CLOUDFLARE)' : 'SE CONECTEAZĂ...'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                Poți folosi acest link de pe telefon oricând ești plecat de acasă (pe date mobile sau alt Wi-Fi):
              </p>

              {status?.tunnel?.publicUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 bg-black/50 p-2 rounded-lg border border-slate-700">
                    <span className="font-mono text-xs text-cyan-300 flex-1 truncate select-all">
                      {status.tunnel.directLink || status.tunnel.publicUrl}
                    </span>
                    <button
                      onClick={handleCopyDirectLink}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 font-semibold"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* QR Code */}
                  {status?.tunnel?.qrCodeUrl && (
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner my-2">
                      <img
                        src={status.tunnel.qrCodeUrl}
                        alt="QR Code Acces Rapid Telefon"
                        className="w-48 h-48 object-contain"
                      />
                      <span className="text-[10px] text-slate-800 font-semibold mt-1">
                        Scanează cu camera telefonului pentru conectare automată
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">PIN de Securitate PC:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">{status.tunnel.pin}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono animate-pulse">
                  Generare tunel securizat Cloudflare...
                </div>
              )}
            </div>

            {/* Setare Manuală Server & IP Local */}
            <div className="bg-[#0e1626] p-3.5 rounded-xl border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2">CONEXIUNE SERVER CURENT</div>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Adresă Activă</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  {status?.tunnel?.publicUrl && (
                    <button
                      onClick={() => setServerUrl(status.tunnel.publicUrl)}
                      className="flex-1 py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 rounded text-xs font-semibold border border-indigo-500/40"
                    >
                      Comută pe Global
                    </button>
                  )}
                  {status?.networkIps?.[0] && (
                    <button
                      onClick={() => setServerUrl(status.networkIps[0].url)}
                      className="flex-1 py-1.5 px-2 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 rounded text-xs font-semibold border border-cyan-500/40"
                    >
                      Comută pe Wi-Fi Local
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PIN de acces */}
            <div className="bg-[#0e1626] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Cod PIN Introdus</div>
                <div className="text-[11px] text-slate-400 font-mono">{pin ? `•••••• (${pin})` : 'Niciun PIN setat'}</div>
              </div>
              <button
                onClick={() => {
                  setPinInput(pin);
                  setPinModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Schimbă PIN</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. MODAL INTRODUCERE PIN */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
              <Lock className="w-4 h-4" /> Securitate Acces PC
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Introdu codul PIN din 6 cifre afișat în Aura pe PC pentru a autoriza conexiunea de la distanță.
            </p>
            {pinError && <div className="text-rose-400 text-xs font-medium mb-2">{pinError}</div>}
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="ex: 742918"
              className="w-full text-center tracking-widest font-mono text-xl py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePin}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs"
              >
                Salvează și Conectează
              </button>
              <button
                onClick={() => setPinModalOpen(false)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM NAVIGATION BAR (FIXED) */}
      <nav className="flex-none bg-[#0a0f1a]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 flex items-center justify-around z-20 pb-[calc(0.5rem+var(--sab))]">
        <button
          onClick={() => setActiveTab('screen')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'screen' ? 'text-cyan-400 scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Monitor className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Ecran Live</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'chat' ? 'text-cyan-400 scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Comenzi</span>
        </button>

        <button
          onClick={() => setActiveTab('coding')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'coding' ? 'text-cyan-400 scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Terminal className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Codare</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'plans' ? 'text-cyan-400 scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Aprobări</span>
          {status?.copilot?.pendingPlans?.length > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'settings' ? 'text-cyan-400 scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Conexiune</span>
        </button>
      </nav>
    </div>
  );
}

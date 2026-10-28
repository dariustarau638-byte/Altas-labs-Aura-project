import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Strips markdown symbols and code blocks so Text-to-Speech (TTS)
 * does not read asterisks, backticks, or raw URLs aloud.
 */
export function cleanTextForSpeech(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/```[\s\S]*?```/g, ' [code block] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hook for Text-to-Speech (TTS) based on the Web Speech API
 * and Speech-to-Text dictation.
 */
export function useVoice(voiceSettings = {}, languagePref = 'en') {
  const [voices, setVoices] = useState([]);
  const [speakingId, setSpeakingId] = useState(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    if (!synth) return;
    const loadVoices = () => {
      const list = synth.getVoices() || [];
      setVoices(list);
    };
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    return () => synth.removeEventListener?.('voiceschanged', loadVoices);
  }, [synth]);

  const pickBestVoice = useCallback(
    (text) => {
      if (!voices.length) return null;
      if (voiceSettings.voiceURI) {
        const exact = voices.find((v) => v.voiceURI === voiceSettings.voiceURI);
        if (exact) return exact;
      }
      const targetPrefix = languagePref === 'en' ? 'en' : 'en';
      return (
        voices.find((v) => v.lang?.toLowerCase().startsWith(targetPrefix) && v.localService) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith(targetPrefix)) ||
        voices.find((v) => v.default) ||
        voices[0]
      );
    },
    [voices, voiceSettings.voiceURI, languagePref],
  );

  const stopSpeaking = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    setSpeakingId(null);
  }, [synth]);

  const speak = useCallback(
    (text, id = 'preview') => {
      if (!synth || voiceSettings.enabled === false) return;
      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      synth.cancel();
      const utter = new SpeechSynthesisUtterance(cleaned);
      const chosen = pickBestVoice(cleaned);
      if (chosen) {
        utter.voice = chosen;
        utter.lang = chosen.lang;
      } else {
        utter.lang = 'en-US';
      }
      utter.rate = voiceSettings.rate ?? 1.0;
      utter.pitch = voiceSettings.pitch ?? 1.0;
      utter.volume = voiceSettings.volume ?? 0.9;

      utter.onstart = () => setSpeakingId(id);
      utter.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      utter.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));

      setSpeakingId(id);
      synth.speak(utter);
    },
    [synth, voiceSettings, pickBestVoice, languagePref],
  );

  const toggleSpeak = useCallback(
    (text, id) => {
      if (speakingId === id) {
        stopSpeaking();
      } else {
        speak(text, id);
      }
    },
    [speakingId, stopSpeaking, speak],
  );

  // ---- Speech-to-Text Dictation ----
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const toggleDictation = useCallback(
    (onTranscript) => {
      if (!SpeechRecognition) return false;
      if (listening && recognitionRef.current) {
        recognitionRef.current.stop();
        setListening(false);
        return true;
      }

      try {
        const rec = new SpeechRecognition();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onstart = () => setListening(true);
        rec.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) onTranscript?.(transcript);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);

        recognitionRef.current = rec;
        rec.start();
        return true;
      } catch {
        setListening(false);
        return false;
      }
    },
    [SpeechRecognition, listening],
  );

  return {
    voices,
    speaking: Boolean(speakingId),
    speakingId,
    speak,
    toggleSpeak,
    stopSpeaking,
    canDictate: Boolean(SpeechRecognition),
    listening,
    toggleDictation,
  };
}

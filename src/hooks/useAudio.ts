import { useState, useCallback, useEffect, useRef } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const MUTE_KEY = "world-explorers-muted";

// Detect whether native Capacitor TTS is available (i.e. we're running inside a Capacitor app).
const isCapacitor = typeof (window as unknown as Record<string, unknown>)["Capacitor"] !== "undefined";

export interface AudioControls {
  isMuted: boolean;
  toggleMute: () => void;
  speakHebrew: (text: string) => void;
  /** Speak in any language; falls back to Hebrew (`fallbackHebrew`) if the voice is missing. */
  speakLang: (text: string, lang: string, fallbackHebrew?: string) => void;
}

function sanitize(text: string): string {
  // Strip quotation marks that confuse Hebrew TTS (e.g. ארה"ב)
  return text.replace(/["""״׳']/g, "");
}

export function useAudio(): AudioControls {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Languages the native TTS engine supports (Capacitor only), lazily fetched.
  const supportedLangsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!isCapacitor) return;
    TextToSpeech.getSupportedLanguages()
      .then(({ languages }) => {
        supportedLangsRef.current = new Set(
          (languages ?? []).map((l: string) => l.toLowerCase().replace("_", "-"))
        );
      })
      .catch(() => {
        supportedLangsRef.current = null; // unknown — just try and let it fail silently
      });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MUTE_KEY, String(isMuted));
    } catch {
      // ignore
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const speakWith = useCallback(
    (text: string, lang: string, rate: number, onError?: () => void) => {
      const sanitized = sanitize(text);

      if (isCapacitor) {
        TextToSpeech.stop().catch(() => {});
        TextToSpeech.speak({
          text: sanitized,
          lang,
          rate,
          pitch: 1.1,
          volume: 1.0,
          category: "ambient",
        }).catch(() => onError?.());
      } else if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sanitized);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices();
        const prefix = lang.split("-")[0];
        const voice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
        if (voice) utterance.voice = voice;
        else if (onError) {
          // No matching voice in the browser — use the fallback path.
          onError();
          return;
        }
        window.speechSynthesis.speak(utterance);
      }
    },
    []
  );

  const speakHebrew = useCallback(
    (text: string) => {
      if (isMuted) return;
      speakWith(text, "he-IL", 0.85);
    },
    [isMuted, speakWith]
  );

  const speakLang = useCallback(
    (text: string, lang: string, fallbackHebrew?: string) => {
      if (isMuted) return;

      const fallback = () => {
        if (fallbackHebrew) speakWith(fallbackHebrew, "he-IL", 0.8);
      };

      // If we know the native engine's languages and this one is missing → fallback.
      const known = supportedLangsRef.current;
      if (isCapacitor && known && known.size > 0) {
        const lower = lang.toLowerCase();
        const prefix = lower.split("-")[0];
        const ok = [...known].some((l) => l === lower || l.startsWith(prefix));
        if (!ok) {
          fallback();
          return;
        }
      }

      speakWith(text, lang, 0.75, fallback);
    },
    [isMuted, speakWith]
  );

  // Pre-load browser voices (no-op on Android WebView)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
  }, []);

  return { isMuted, toggleMute, speakHebrew, speakLang };
}

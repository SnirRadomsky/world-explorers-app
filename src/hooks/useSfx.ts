// Synthesized sound effects via WebAudio — zero audio assets, fully offline.

import { useCallback, useEffect, useRef } from "react";

export type SfxName =
  | "pop"        // tap on anything
  | "chime"      // new discovery
  | "tada"       // quiz correct / milestone
  | "boing"      // quiz wrong (gentle, funny)
  | "whoosh"     // rocket launch
  | "sparkle";   // sticker unlock

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const AC = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      sharedCtx = new AC();
    }
    if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
    return sharedCtx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  gainPeak = 0.18,
  freqEnd?: number,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ac.currentTime + start + dur);
  }
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

function noiseBurst(ac: AudioContext, start: number, dur: number, gainPeak = 0.12) {
  const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, ac.currentTime + start);
  filter.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + start + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainPeak, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(ac.currentTime + start);
}

const PLAYERS: Record<SfxName, (ac: AudioContext) => void> = {
  pop(ac) {
    tone(ac, 520, 0, 0.09, "sine", 0.2, 780);
  },
  chime(ac) {
    tone(ac, 523.25, 0,    0.22, "sine", 0.16); // C5
    tone(ac, 659.25, 0.08, 0.22, "sine", 0.16); // E5
    tone(ac, 783.99, 0.16, 0.3,  "sine", 0.16); // G5
  },
  tada(ac) {
    tone(ac, 523.25, 0,    0.15, "triangle", 0.18);
    tone(ac, 659.25, 0.1,  0.15, "triangle", 0.18);
    tone(ac, 783.99, 0.2,  0.15, "triangle", 0.18);
    tone(ac, 1046.5, 0.3,  0.45, "triangle", 0.2);
  },
  boing(ac) {
    tone(ac, 300, 0, 0.28, "sine", 0.16, 140);
  },
  whoosh(ac) {
    noiseBurst(ac, 0, 0.7, 0.16);
    tone(ac, 120, 0, 0.7, "sawtooth", 0.05, 40);
  },
  sparkle(ac) {
    tone(ac, 1318.5, 0,    0.12, "sine", 0.12);
    tone(ac, 1567.98, 0.07, 0.12, "sine", 0.12);
    tone(ac, 2093, 0.14,  0.2,  "sine", 0.12);
    tone(ac, 2637, 0.21,  0.25, "sine", 0.1);
  },
};

export function useSfx(isMuted: boolean) {
  const mutedRef = useRef(isMuted);
  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  const play = useCallback((name: SfxName) => {
    if (mutedRef.current) return;
    const ac = ctx();
    if (!ac) return;
    try {
      PLAYERS[name](ac);
    } catch {
      // never let sound break gameplay
    }
  }, []);

  return { play };
}

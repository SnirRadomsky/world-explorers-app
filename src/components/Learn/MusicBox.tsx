// תיבת הנגינה — a colorful 8-key xylophone (WebAudio, zero samples) with a
// "play after me" mode: the keys light up in sequence and the child repeats
// note-by-note through three children's songs.

import { useCallback, useEffect, useRef, useState } from "react";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

const NOTES = [
  { name: "דו", freq: 523.25, color: "#ef4444" },
  { name: "רה", freq: 587.33, color: "#f97316" },
  { name: "מי", freq: 659.25, color: "#eab308" },
  { name: "פה", freq: 698.46, color: "#22c55e" },
  { name: "סול", freq: 783.99, color: "#06b6d4" },
  { name: "לה", freq: 880.0, color: "#3b82f6" },
  { name: "סי", freq: 987.77, color: "#8b5cf6" },
  { name: "דו גבוה", freq: 1046.5, color: "#ec4899" },
];

// note-index sequences (0 = do)
const SONGS: { id: string; nameHebrew: string; emoji: string; seq: number[] }[] = [
  { id: "yonatan", nameHebrew: "יונתן הקטן", emoji: "🧒", seq: [4, 2, 2, 3, 1, 1, 0, 1, 2, 3, 4, 4, 4] },
  { id: "twinkle", nameHebrew: "כוכב קטן",    emoji: "⭐", seq: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0] },
  { id: "scale",   nameHebrew: "סולם שמח",    emoji: "🌈", seq: [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0] },
];

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

/** A soft xylophone-ish pluck. */
function playNote(freq: number) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc2.type = "triangle";
  osc.frequency.value = freq;
  osc2.frequency.value = freq * 2;
  const g2 = ac.createGain();
  g2.gain.value = 0.18;
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.22, ac.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.7);
  osc.connect(gain);
  osc2.connect(g2).connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc2.start();
  osc.stop(ac.currentTime + 0.75);
  osc2.stop(ac.currentTime + 0.75);
}

interface MusicBoxProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function MusicBox({ learning, speakHebrew, playSfx }: MusicBoxProps) {
  const [litKey, setLitKey] = useState<number | null>(null);
  const [song, setSong] = useState<(typeof SONGS)[number] | null>(null);
  const [step, setStep] = useState(0);
  const [demoing, setDemoing] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const flash = useCallback((idx: number, delay: number, dur = 380) => {
    timersRef.current.push(setTimeout(() => {
      setLitKey(idx);
      playNote(NOTES[idx].freq);
      timersRef.current.push(setTimeout(() => setLitKey((k) => (k === idx ? null : k)), dur));
    }, delay));
  }, []);

  /** Demo the next chunk (3 notes) of the song, then wait for the child. */
  const demoChunk = useCallback((s: (typeof SONGS)[number], from: number) => {
    setDemoing(true);
    const chunk = s.seq.slice(from, from + 3);
    chunk.forEach((noteIdx, i) => flash(noteIdx, i * 550));
    timersRef.current.push(setTimeout(() => setDemoing(false), chunk.length * 550 + 150));
  }, [flash]);

  const startSong = useCallback((s: (typeof SONGS)[number]) => {
    playSfx("pop");
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSong(s);
    setStep(0);
    speakHebrew(`${s.nameHebrew}! הקשיבו ונגנו אחריי`);
    timersRef.current.push(setTimeout(() => demoChunk(s, 0), 1400));
  }, [demoChunk, playSfx, speakHebrew]);

  const stopSong = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSong(null);
    setStep(0);
    setDemoing(false);
  }, []);

  const tapKey = useCallback((idx: number) => {
    setLitKey(idx);
    playNote(NOTES[idx].freq);
    setTimeout(() => setLitKey((k) => (k === idx ? null : k)), 240);

    if (!song || demoing) return;
    const expected = song.seq[step];
    if (idx === expected) {
      const nextStep = step + 1;
      if (nextStep >= song.seq.length) {
        // finished the whole song!
        setConfetti((c) => c + 1);
        learning.markSongDone(song.id);
        playSfx("tada");
        speakHebrew(`ניגנתם את ${song.nameHebrew} לבד! מוזיקאים אמיתיים!`);
        setSong(null);
        setStep(0);
      } else {
        setStep(nextStep);
        // finished a chunk of 3 → demo the next chunk
        if (nextStep % 3 === 0) {
          timersRef.current.push(setTimeout(() => demoChunk(song, nextStep), 550));
        }
      }
    } else {
      playSfx("boing");
      // replay the current chunk as a reminder
      const chunkStart = Math.floor(step / 3) * 3;
      setStep(chunkStart);
      timersRef.current.push(setTimeout(() => demoChunk(song, chunkStart), 700));
    }
  }, [song, demoing, step, learning, playSfx, speakHebrew, demoChunk]);

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "0 14px", overflowY: "auto" }}>
      {/* songs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", padding: "2px 0 8px" }}>
        {SONGS.map((s) => (
          <button
            key={s.id}
            data-testid={`music-song-${s.id}`}
            onClick={() => (song?.id === s.id ? stopSong() : startSong(s))}
            style={{
              border: "none",
              borderRadius: 999,
              background: song?.id === s.id ? "linear-gradient(135deg,#06b6d4,#0e7490)" : "white",
              color: song?.id === s.id ? "white" : "#334155",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 13.5,
              padding: "8px 14px",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
            }}
          >
            {s.emoji} {s.nameHebrew}
            {learning.data.songsDone.includes(s.id) && " ✅"}
          </button>
        ))}
      </div>

      {song && (
        <div data-testid="music-progress" style={{ fontWeight: 800, fontSize: 13.5, color: "#0e7490", background: "#cffafe", borderRadius: 999, padding: "5px 14px", marginBottom: 8 }}>
          {demoing ? "🎧 הקשיבו..." : "🎵 תורכם! נגנו אחריי"} · {step}/{song.seq.length}
        </div>
      )}

      {/* the xylophone */}
      <div style={{ display: "flex", gap: 7, alignItems: "flex-end", justifyContent: "center", flex: 1, width: "100%", maxWidth: 460, paddingBottom: 18 }}>
        {NOTES.map((n, i) => (
          <button
            key={n.name}
            data-testid={`music-key-${i}`}
            onClick={() => tapKey(i)}
            style={{
              flex: 1,
              height: `${78 - i * 6}%`,
              minHeight: 130,
              border: "none",
              borderRadius: 14,
              background: n.color,
              cursor: "pointer",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 900,
              fontSize: 13,
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "center",
              paddingBottom: 10,
              boxShadow: litKey === i ? `0 0 26px ${n.color}, 0 6px 14px rgba(0,0,0,0.25)` : "0 6px 14px rgba(0,0,0,0.2)",
              transform: litKey === i ? "scale(1.06)" : "scale(1)",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
              filter: litKey === i ? "brightness(1.25)" : "none",
              writingMode: "vertical-rl",
            }}
          >
            {n.name}
          </button>
        ))}
      </div>

      <ConfettiEffect trigger={confetti} originX={0.5} originY={0.35} />
    </div>
  );
}

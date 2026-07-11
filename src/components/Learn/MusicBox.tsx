// תיבת הנגינה — a colorful 8-key xylophone (WebAudio, zero samples) with:
// • 8 "play after me" songs + a full-song listen mode + a live note sheet
// • 4 instruments (xylophone / piano / flute / bells)
// • an echo (Simon) game with a persistent best score
// • a tiny recording studio: record a melody and play it back

import { useCallback, useEffect, useRef, useState } from "react";
import { NOTES, SONGS, INSTRUMENTS, type SongSpec, type InstrumentId } from "../../data/songs";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

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

/** One synthesized note; each instrument mixes its own harmonics/envelope. */
function playNote(freq: number, instrument: InstrumentId) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.connect(ac.destination);

  const voice = (type: OscillatorType, mult: number, vol: number, dur: number) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq * mult;
    g.gain.value = vol;
    osc.connect(g).connect(gain);
    osc.start(now);
    osc.stop(now + dur);
  };

  switch (instrument) {
    case "xylophone":
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      voice("sine", 1, 1, 0.75);
      voice("triangle", 2, 0.18, 0.75);
      break;
    case "piano":
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      voice("triangle", 1, 1, 1.05);
      voice("sine", 2, 0.25, 1.05);
      voice("sine", 3, 0.08, 1.05);
      break;
    case "flute":
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
      gain.gain.setValueAtTime(0.2, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      voice("sine", 1, 1, 0.8);
      voice("sine", 2, 0.06, 0.8);
      break;
    case "bells":
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      voice("sine", 1, 1, 1.65);
      voice("sine", 2.76, 0.35, 1.65);
      voice("sine", 5.4, 0.12, 1.65);
      break;
  }
}

type MusicMode = "songs" | "echo" | "record";

interface MusicBoxProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function MusicBox({ learning, speakHebrew, playSfx }: MusicBoxProps) {
  const [mode, setMode] = useState<MusicMode>("songs");
  const [instrument, setInstrument] = useState<InstrumentId>("xylophone");
  const [litKey, setLitKey] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const instrumentRef = useRef(instrument);
  useEffect(() => {
    instrumentRef.current = instrument;
  }, [instrument]);

  // ── songs (play-after-me) ──
  const [song, setSong] = useState<SongSpec | null>(null);
  const [step, setStep] = useState(0);
  const [demoing, setDemoing] = useState(false);

  // ── echo (Simon) game ──
  const [echoSeq, setEchoSeq] = useState<number[]>([]);
  const [echoStep, setEchoStep] = useState(0);
  const [echoState, setEchoState] = useState<"idle" | "listen" | "repeat" | "over">("idle");

  // ── recording studio ──
  const [recording, setRecording] = useState(false);
  const [track, setTrack] = useState<{ note: number; at: number }[]>([]);
  const [playingBack, setPlayingBack] = useState(false);
  const recStartRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const flash = useCallback((idx: number, delay: number, dur = 380) => {
    timersRef.current.push(setTimeout(() => {
      setLitKey(idx);
      playNote(NOTES[idx].freq, instrumentRef.current);
      timersRef.current.push(setTimeout(() => setLitKey((k) => (k === idx ? null : k)), dur));
    }, delay));
  }, []);

  // ─── songs mode ───────────────────────────────────────────────────────────

  /** Demo the next chunk (3 notes) of the song, then wait for the child. */
  const demoChunk = useCallback((s: SongSpec, from: number) => {
    setDemoing(true);
    const chunk = s.seq.slice(from, from + 3);
    chunk.forEach((noteIdx, i) => flash(noteIdx, i * 550));
    timersRef.current.push(setTimeout(() => setDemoing(false), chunk.length * 550 + 150));
  }, [flash]);

  const startSong = useCallback((s: SongSpec) => {
    playSfx("pop");
    clearTimers();
    setSong(s);
    setStep(0);
    speakHebrew(`${s.nameHebrew}! הקשיבו ונגנו אחריי`);
    timersRef.current.push(setTimeout(() => demoChunk(s, 0), 1400));
  }, [clearTimers, demoChunk, playSfx, speakHebrew]);

  const stopSong = useCallback(() => {
    clearTimers();
    setSong(null);
    setStep(0);
    setDemoing(false);
  }, [clearTimers]);

  /** Listen mode: the whole song plays with the keys lighting up. */
  const listenToSong = useCallback(() => {
    if (!song) return;
    playSfx("pop");
    clearTimers();
    setStep(0);
    setDemoing(true);
    song.seq.forEach((noteIdx, i) => flash(noteIdx, i * 480));
    timersRef.current.push(setTimeout(() => {
      setDemoing(false);
      demoChunk(song, 0);
    }, song.seq.length * 480 + 500));
  }, [song, clearTimers, flash, demoChunk, playSfx]);

  // ─── echo game ────────────────────────────────────────────────────────────

  const playEchoSeq = useCallback((seq: number[]) => {
    setEchoState("listen");
    setEchoStep(0);
    seq.forEach((noteIdx, i) => flash(noteIdx, 500 + i * 600, 420));
    timersRef.current.push(setTimeout(() => setEchoState("repeat"), 500 + seq.length * 600));
  }, [flash]);

  const startEcho = useCallback(() => {
    playSfx("pop");
    clearTimers();
    const seq = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
    setEchoSeq(seq);
    speakHebrew("הקשיבו טוב וחזרו אחריי!");
    timersRef.current.push(setTimeout(() => playEchoSeq(seq), 1200));
  }, [clearTimers, playEchoSeq, playSfx, speakHebrew]);

  const echoRight = useCallback(() => {
    // sequence complete → grow by one and replay
    const next = [...echoSeq, Math.floor(Math.random() * 8)];
    setEchoSeq(next);
    playSfx("chime");
    learning.recordEchoBest(echoSeq.length);
    timersRef.current.push(setTimeout(() => playEchoSeq(next), 900));
  }, [echoSeq, learning, playEchoSeq, playSfx]);

  const echoWrong = useCallback(() => {
    playSfx("boing");
    setEchoState("over");
    learning.recordEchoBest(echoSeq.length - 1);
    speakHebrew(`הגעתם לרצף של ${echoSeq.length - 1} צלילים! כל הכבוד`);
  }, [echoSeq.length, learning, playSfx, speakHebrew]);

  // ─── key taps ─────────────────────────────────────────────────────────────

  const tapKey = useCallback((idx: number) => {
    setLitKey(idx);
    playNote(NOTES[idx].freq, instrumentRef.current);
    setTimeout(() => setLitKey((k) => (k === idx ? null : k)), 240);

    if (recording) {
      setTrack((t) => [...t, { note: idx, at: performance.now() - recStartRef.current }]);
    }

    if (mode === "echo") {
      if (echoState !== "repeat") return;
      if (idx === echoSeq[echoStep]) {
        const nextStep = echoStep + 1;
        if (nextStep >= echoSeq.length) {
          setConfetti((c) => c + 1);
          echoRight();
        } else {
          setEchoStep(nextStep);
        }
      } else {
        echoWrong();
      }
      return;
    }

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
  }, [recording, mode, echoState, echoSeq, echoStep, echoRight, echoWrong, song, demoing, step, learning, playSfx, speakHebrew, demoChunk]);

  // ─── recording studio ─────────────────────────────────────────────────────

  const toggleRecord = useCallback(() => {
    if (recording) {
      setRecording(false);
      playSfx("chime");
      speakHebrew("ההקלטה נשמרה! לחצו על נגן כדי לשמוע");
    } else {
      playSfx("pop");
      setTrack([]);
      recStartRef.current = performance.now();
      setRecording(true);
      speakHebrew("מקליטים! נגנו מה שבא לכם");
    }
  }, [recording, playSfx, speakHebrew]);

  const playBack = useCallback(() => {
    if (track.length === 0 || playingBack) return;
    playSfx("pop");
    setPlayingBack(true);
    const t0 = track[0].at;
    for (const ev of track) {
      flash(ev.note, Math.min((ev.at - t0) * 0.9, 30_000));
    }
    const last = (track[track.length - 1].at - t0) * 0.9;
    timersRef.current.push(setTimeout(() => setPlayingBack(false), last + 600));
  }, [track, playingBack, flash, playSfx]);

  const switchMode = useCallback((m: MusicMode) => {
    playSfx("pop");
    clearTimers();
    stopSong();
    setEchoState("idle");
    setEchoSeq([]);
    setRecording(false);
    setPlayingBack(false);
    setMode(m);
    if (m === "echo") speakHebrew("משחק ההד! אני מנגן ואתם חוזרים אחריי");
    if (m === "record") speakHebrew("אולפן ההקלטות! הקליטו מנגינה משלכם");
  }, [clearTimers, stopSong, playSfx, speakHebrew]);

  const chip = (active: boolean): React.CSSProperties => ({
    border: "none",
    borderRadius: 999,
    background: active ? "linear-gradient(135deg,#06b6d4,#0e7490)" : "white",
    color: active ? "white" : "#334155",
    fontFamily: "Heebo, sans-serif",
    fontWeight: 800,
    fontSize: 13,
    padding: "7px 13px",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
  });

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "0 14px", overflowY: "auto" }}>
      {/* mode + instrument chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: "2px 0 6px" }}>
        <button data-testid="music-mode-songs" onClick={() => switchMode("songs")} style={chip(mode === "songs")}>🎵 שירים</button>
        <button data-testid="music-mode-echo" onClick={() => switchMode("echo")} style={chip(mode === "echo")}>🦜 משחק ההד</button>
        <button data-testid="music-mode-record" onClick={() => switchMode("record")} style={chip(mode === "record")}>⏺️ אולפן</button>
        <span style={{ width: 10 }} />
        {INSTRUMENTS.map((ins) => (
          <button
            key={ins.id}
            data-testid={`music-instrument-${ins.id}`}
            title={ins.nameHebrew}
            onClick={() => { playSfx("pop"); setInstrument(ins.id); playNote(NOTES[0].freq, ins.id); }}
            style={{ ...chip(instrument === ins.id), padding: "7px 10px" }}
          >
            {ins.emoji}
          </button>
        ))}
      </div>

      {/* songs mode */}
      {mode === "songs" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", paddingBottom: 6, maxWidth: 500 }}>
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
                fontSize: 12.5,
                padding: "7px 12px",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
              }}
            >
              {s.emoji} {s.nameHebrew}
              {learning.data.songsDone.includes(s.id) && " ✅"}
            </button>
          ))}
        </div>
      )}

      {mode === "songs" && song && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div data-testid="music-progress" style={{ fontWeight: 800, fontSize: 13.5, color: "#0e7490", background: "#cffafe", borderRadius: 999, padding: "5px 14px" }}>
              {demoing ? "🎧 הקשיבו..." : "🎵 תורכם! נגנו אחריי"} · {step}/{song.seq.length}
            </div>
            <button data-testid="music-listen" onClick={listenToSong} style={chip(false)}>🎧 השמעה מלאה</button>
          </div>
          {/* the note sheet — colored dots, progress-lit */}
          <div
            data-testid="music-sheet"
            style={{
              direction: "ltr",
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 470,
              background: "rgba(255,255,255,0.75)",
              borderRadius: 14,
              padding: "8px 10px",
              marginBottom: 8,
              boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
            }}
          >
            {song.seq.map((noteIdx, i) => (
              <span
                key={i}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: NOTES[noteIdx].color,
                  opacity: i < step ? 1 : 0.35,
                  transform: i === step ? "scale(1.25)" : "scale(1)",
                  border: i === step ? "2.5px solid #0f172a" : "2.5px solid transparent",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9.5,
                  fontWeight: 900,
                  color: "white",
                  fontFamily: "Heebo, sans-serif",
                  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}
              >
                {NOTES[noteIdx].name.replace(" גבוה", "׳")}
              </span>
            ))}
          </div>
        </>
      )}

      {/* echo mode */}
      {mode === "echo" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingBottom: 8 }}>
          <div data-testid="echo-status" style={{ fontWeight: 800, fontSize: 14, color: "#0e7490", background: "#cffafe", borderRadius: 999, padding: "6px 16px" }}>
            {echoState === "idle" && "🦜 אני מנגן — ואתם חוזרים אחריי!"}
            {echoState === "listen" && "🎧 הקשיבו..."}
            {echoState === "repeat" && `🎵 תורכם! ${echoStep}/${echoSeq.length}`}
            {echoState === "over" && `🏁 הגעתם לרצף של ${Math.max(0, echoSeq.length - 1)} צלילים!`}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              data-testid="echo-start"
              onClick={startEcho}
              style={{ border: "none", borderRadius: 999, background: "linear-gradient(135deg,#06b6d4,#0e7490)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 15, padding: "9px 22px", cursor: "pointer", boxShadow: "0 4px 14px rgba(6,182,212,0.4)" }}
            >
              {echoState === "idle" || echoState === "over" ? "▶️ התחילו" : "🔄 מהתחלה"}
            </button>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#475569" }}>
              🏆 שיא: {learning.data.echoBest ?? 0}
            </div>
          </div>
        </div>
      )}

      {/* record mode */}
      {mode === "record" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0e7490", background: "#cffafe", borderRadius: 999, padding: "5px 14px" }}>
            {recording ? `🔴 מקליטים... ${track.length} צלילים` : track.length > 0 ? `💾 הוקלטו ${track.length} צלילים` : "⏺️ לחצו הקלטה ונגנו מנגינה!"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid="record-toggle"
              onClick={toggleRecord}
              style={{ border: "none", borderRadius: 999, background: recording ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "white", color: recording ? "white" : "#b91c1c", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 14, padding: "9px 18px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            >
              {recording ? "⏹️ עצרו" : "⏺️ הקלטה"}
            </button>
            <button
              data-testid="record-play"
              onClick={playBack}
              disabled={track.length === 0 || recording || playingBack}
              style={{ border: "none", borderRadius: 999, background: "white", color: track.length === 0 || recording ? "#94a3b8" : "#0e7490", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 14, padding: "9px 18px", cursor: track.length === 0 || recording ? "default" : "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            >
              {playingBack ? "🎶 מנגן..." : "▶️ נגנו חזרה"}
            </button>
          </div>
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
              minHeight: 120,
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

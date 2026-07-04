import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  Volume1,
  VolumeX,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Palette (from the supplied swatch)
//   Orange   #EC5E27
//   Graphite #403D39
// Everything else below is derived from those two anchors.
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#181512",
  bgVignette: "#221E19",
  surface: "#403D39",
  surfaceRaised: "#4C4842",
  orange: "#EC5E27",
  orangeLight: "#FF8A50",
  orangeDim: "#8A3B1B",
  cream: "#F5F1E8",
  muted: "#A79E92",
  faint: "#6E6760",
};

const TRACKS = [
  {
    id: 1,
    title: "Copper Skyline",
    artist: "Marigold Static",
    album: "Kiln",
    duration: 222,
  },
  {
    id: 2,
    title: "Slow Combustion",
    artist: "Ember & Vine",
    album: "Firebreak",
    duration: 197,
  },
  {
    id: 3,
    title: "Terracotta Nights",
    artist: "Marigold Static",
    album: "Kiln",
    duration: 251,
  },
  {
    id: 4,
    title: "Ash & Amber",
    artist: "Low Coal",
    album: "Furnace Room",
    duration: 184,
  },
];

const BAR_COUNT = 40;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Deterministic base heights so the equalizer has a "shape" rather than
// looking like pure noise, even before animation kicks in.
function baseBarHeight(i) {
  const wave =
    Math.sin(i * 0.35) * 0.5 +
    Math.sin(i * 0.13 + 1.5) * 0.3 +
    Math.sin(i * 0.7 + 3) * 0.2;
  return 0.28 + Math.abs(wave) * 0.6;
}

export default function MusicPlayer() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(38);
  const [volume, setVolume] = useState(72);
  const [prevVolume, setPrevVolume] = useState(72);
  const [repeatMode, setRepeatMode] = useState("off"); // off | all | one
  const [shuffle, setShuffle] = useState(false);
  const [barHeights, setBarHeights] = useState(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => baseBarHeight(i))
  );

  const track = TRACKS[trackIndex];
  const intervalRef = useRef(null);
  const barIntervalRef = useRef(null);

  const goToNext = useCallback(() => {
    setProgress(0);
    setTrackIndex((prev) => {
      if (shuffle) {
        let next = Math.floor(Math.random() * TRACKS.length);
        if (TRACKS.length > 1 && next === prev) {
          next = (next + 1) % TRACKS.length;
        }
        return next;
      }
      return (prev + 1) % TRACKS.length;
    });
  }, [shuffle]);

  // Restart the current track if we're more than 4s in (like most real
  // players); otherwise jump back to the previous track.
  const handlePrev = () => {
    if (progress > 4) {
      setProgress(0);
    } else {
      setProgress(0);
      setTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    }
  };

  // Playback progress ticker
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= track.duration) {
            if (repeatMode === "one") {
              return 0;
            }
            if (repeatMode === "off" && trackIndex === TRACKS.length - 1 && !shuffle) {
              setIsPlaying(false);
              return track.duration;
            }
            goToNext();
            return 0;
          }
          return p + 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, track.duration, repeatMode, trackIndex, shuffle, goToNext]);

  // Equalizer animation
  useEffect(() => {
    if (isPlaying) {
      barIntervalRef.current = setInterval(() => {
        setBarHeights((prev) =>
          prev.map((h, i) => {
            const base = baseBarHeight(i);
            const jitter = (Math.random() - 0.5) * 0.5;
            const target = Math.min(1, Math.max(0.08, base + jitter));
            return h + (target - h) * 0.6;
          })
        );
      }, 120);
    } else {
      // settle bars down to a calm resting state when paused
      barIntervalRef.current = setInterval(() => {
        setBarHeights((prev) =>
          prev.map((h) => h + (0.12 - h) * 0.15)
        );
      }, 120);
    }
    return () => clearInterval(barIntervalRef.current);
  }, [isPlaying]);

  const cycleRepeat = () => {
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"));
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 50);
    }
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;

  const pct = (progress / track.duration) * 100;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Ambient glow behind the disc */}
        <div style={styles.glow} aria-hidden="true" />

        {/* Album disc */}
        <div style={styles.discWrap}>
          <div
            style={{
              ...styles.disc,
              animationPlayState: isPlaying ? "running" : "paused",
            }}
          >
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <defs>
                <radialGradient id="vinylGrad" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#2b2825" />
                  <stop offset="70%" stopColor="#181512" />
                  <stop offset="100%" stopColor="#0f0d0b" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="98" fill="url(#vinylGrad)" />
              {[92, 80, 68, 56, 44].map((r) => (
                <circle
                  key={r}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke="#000000"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                />
              ))}
              <circle cx="100" cy="100" r="34" fill={COLORS.orange} />
              <circle cx="100" cy="100" r="34" fill="none" stroke="#00000022" strokeWidth="1" />
              <circle cx="100" cy="100" r="6" fill={COLORS.bg} />
            </svg>
          </div>
        </div>

        {/* Track info */}
        <div style={styles.trackInfo}>
          <h2 style={styles.title}>{track.title}</h2>
          <p style={styles.artist}>
            {track.artist} <span style={styles.dot}>&middot;</span> {track.album}
          </p>
        </div>

        {/* Equalizer */}
        <div style={styles.eqWrap} aria-hidden="true">
          {barHeights.map((h, i) => (
            <div
              key={i}
              style={{
                ...styles.eqBar,
                height: `${8 + h * 46}px`,
                background:
                  i % 2 === 0
                    ? `linear-gradient(180deg, ${COLORS.orangeLight}, ${COLORS.orange})`
                    : `linear-gradient(180deg, ${COLORS.orange}, ${COLORS.orangeDim})`,
                opacity: isPlaying ? 1 : 0.35,
              }}
            />
          ))}
        </div>

        {/* Scrubber */}
        <div style={styles.scrubRow}>
          <span style={styles.time}>{formatTime(progress)}</span>
          <div
            style={styles.scrubTrack}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              setProgress(Math.round(ratio * track.duration));
            }}
          >
            <div style={{ ...styles.scrubFill, width: `${pct}%` }} />
            <div style={{ ...styles.scrubThumb, left: `${pct}%` }} />
          </div>
          <span style={styles.time}>{formatTime(track.duration)}</span>
        </div>

        {/* Transport controls */}
        <div style={styles.controlsRow}>
          <button
            aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
            aria-pressed={shuffle}
            onClick={() => setShuffle((s) => !s)}
            style={{
              ...styles.iconBtn,
              color: shuffle ? COLORS.orange : COLORS.muted,
            }}
          >
            <Shuffle size={18} />
          </button>

          <button aria-label="Previous track" onClick={handlePrev} style={styles.iconBtn}>
            <SkipBack size={24} fill={COLORS.cream} />
          </button>

          <button
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => setIsPlaying((p) => !p)}
            style={styles.playBtn}
          >
            {isPlaying ? (
              <Pause size={30} fill={COLORS.bg} color={COLORS.bg} />
            ) : (
              <Play size={30} fill={COLORS.bg} color={COLORS.bg} style={{ marginLeft: 3 }} />
            )}
          </button>

          <button aria-label="Next track" onClick={goToNext} style={styles.iconBtn}>
            <SkipForward size={24} fill={COLORS.cream} />
          </button>

          <button
            aria-label={`Repeat: ${repeatMode}`}
            aria-pressed={repeatMode !== "off"}
            onClick={cycleRepeat}
            style={{
              ...styles.iconBtn,
              color: repeatMode !== "off" ? COLORS.orange : COLORS.muted,
            }}
          >
            <RepeatIcon size={18} />
          </button>
        </div>

        {/* Volume */}
        <div style={styles.volumeRow}>
          <button aria-label="Mute" onClick={toggleMute} style={styles.volumeIconBtn}>
            <VolumeIcon size={16} color={COLORS.muted} />
          </button>
          <div
            style={styles.volumeTrack}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              setVolume(Math.round(Math.min(1, Math.max(0, ratio)) * 100));
            }}
          >
            <div style={{ ...styles.volumeFill, width: `${volume}%` }} />
          </div>
        </div>

        {/* Up next list */}
        <div style={styles.queue}>
          <p style={styles.queueLabel}>Up next</p>
          {TRACKS.filter((_, i) => i !== trackIndex)
            .slice(0, 2)
            .map((t) => {
              const i = TRACKS.findIndex((x) => x.id === t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTrackIndex(i);
                    setProgress(0);
                  }}
                  style={styles.queueRow}
                >
                  <span style={styles.queueDash} />
                  <span style={styles.queueTitle}>{t.title}</span>
                  <span style={styles.queueArtist}>{t.artist}</span>
                </button>
              );
            })}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: `radial-gradient(circle at 50% 0%, ${COLORS.bgVignette} 0%, ${COLORS.bg} 65%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    fontFamily:
      "'Manrope', 'Segoe UI', system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
  },
  card: {
    position: "relative",
    width: 360,
    maxWidth: "100%",
    background: COLORS.surface,
    borderRadius: 28,
    padding: "32px 28px 24px",
    boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -60,
    left: "50%",
    transform: "translateX(-50%)",
    width: 260,
    height: 260,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${COLORS.orange}33 0%, transparent 70%)`,
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  discWrap: {
    position: "relative",
    width: 168,
    height: 168,
    marginBottom: 20,
  },
  disc: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    animation: "spin 9s linear infinite",
    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
  },
  trackInfo: {
    textAlign: "center",
    marginBottom: 18,
    width: "100%",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: COLORS.cream,
    letterSpacing: "-0.01em",
  },
  artist: {
    margin: "6px 0 0",
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: 500,
  },
  dot: {
    color: COLORS.orange,
    margin: "0 2px",
  },
  eqWrap: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    height: 54,
    width: "100%",
    marginBottom: 18,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
    transition: "opacity 0.3s ease",
  },
  scrubRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  time: {
    fontSize: 11,
    color: COLORS.muted,
    fontVariantNumeric: "tabular-nums",
    width: 34,
    flexShrink: 0,
  },
  scrubTrack: {
    position: "relative",
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: "rgba(255,255,255,0.12)",
    cursor: "pointer",
  },
  scrubFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 2,
    background: `linear-gradient(90deg, ${COLORS.orangeDim}, ${COLORS.orange})`,
  },
  scrubThumb: {
    position: "absolute",
    top: "50%",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: COLORS.orangeLight,
    transform: "translate(-50%, -50%)",
    boxShadow: "0 0 0 3px rgba(236,94,39,0.25)",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    width: "100%",
    marginBottom: 20,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.cream,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  playBtn: {
    width: 62,
    height: 62,
    borderRadius: "50%",
    border: "none",
    background: `linear-gradient(160deg, ${COLORS.orangeLight}, ${COLORS.orange})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 10px 24px -6px rgba(236,94,39,0.7)",
  },
  volumeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginBottom: 22,
  },
  volumeIconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    padding: 4,
  },
  volumeTrack: {
    position: "relative",
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: "rgba(255,255,255,0.12)",
    cursor: "pointer",
  },
  volumeFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 2,
    background: COLORS.faint,
  },
  queue: {
    width: "100%",
    borderTop: `1px solid rgba(255,255,255,0.08)`,
    paddingTop: 14,
  },
  queueLabel: {
    margin: "0 0 10px",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: COLORS.faint,
    fontWeight: 700,
  },
  queueRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    background: "transparent",
    border: "none",
    padding: "7px 4px",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  queueDash: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: COLORS.orange,
    flexShrink: 0,
  },
  queueTitle: {
    fontSize: 13,
    color: COLORS.cream,
    fontWeight: 600,
    flexShrink: 0,
  },
  queueArtist: {
    fontSize: 12,
    color: COLORS.muted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

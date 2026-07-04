'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Share2,
} from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface MusicPlayerProps {
  files: DriveFile[];
}

const COLORS = {
  bg: '#181512',
  bgVignette: '#221E19',
  surface: '#403D39',
  surfaceRaised: '#4C4842',
  orange: '#EC5E27',
  orangeLight: '#FF8A50',
  orangeDim: '#8A3B1B',
  cream: '#F5F1E8',
  muted: '#A79E92',
  faint: '#6E6760',
};

const BAR_COUNT = 40;

function formatTime(totalSeconds: number) {
  if (!isFinite(totalSeconds)) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function trackTitle(name: string) {
  return name.replace(/\.mp3$/i, '');
}

function baseBarHeight(i: number) {
  const wave =
    Math.sin(i * 0.35) * 0.5 +
    Math.sin(i * 0.13 + 1.5) * 0.3 +
    Math.sin(i * 0.7 + 3) * 0.2;
  return 0.28 + Math.abs(wave) * 0.6;
}

export default function MusicPlayer({ files }: MusicPlayerProps) {
  const tracks = files.filter(
    (f) => f.mimeType.startsWith('audio/') || /\.mp3$/i.test(f.name)
  );

  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(72);
  const [prevVolume, setPrevVolume] = useState(72);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffle, setShuffle] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [barHeights, setBarHeights] = useState(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => baseBarHeight(i))
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const barIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const track = tracks[trackIndex];

  const goToNext = useCallback(() => {
    if (tracks.length === 0) return;
    setProgress(0);
    setTrackIndex((prev) => {
      if (shuffle) {
        let next = Math.floor(Math.random() * tracks.length);
        if (tracks.length > 1 && next === prev) {
          next = (next + 1) % tracks.length;
        }
        return next;
      }
      return (prev + 1) % tracks.length;
    });
  }, [shuffle, tracks.length]);

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      setProgress(0);
    } else {
      setProgress(0);
      setTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    }
  };

  // Apply volume to the audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Auto-play when the track changes while playing
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

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
      barIntervalRef.current = setInterval(() => {
        setBarHeights((prev) => prev.map((h) => h + (0.12 - h) * 0.15));
      }, 120);
    }
    return () => {
      if (barIntervalRef.current) clearInterval(barIntervalRef.current);
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }
    if (
      repeatMode === 'off' &&
      trackIndex === tracks.length - 1 &&
      !shuffle
    ) {
      setIsPlaying(false);
      return;
    }
    goToNext();
  };

  const cycleRepeat = () => {
    setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'));
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
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  // Check URL params for shared track on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedTrackId = params.get('track');
    if (sharedTrackId && tracks.length > 0) {
      const sharedIndex = tracks.findIndex((t) => t.id === sharedTrackId);
      if (sharedIndex !== -1) {
        setTrackIndex(sharedIndex);
        setProgress(0);
        setIsPlaying(true);
      }
    }
  }, [tracks]);

  const handleShare = async () => {
    if (!track) return;
    const url = new URL(window.location.href);
    url.searchParams.set('track', track.id);
    await navigator.clipboard.writeText(url.toString());
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (tracks.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: COLORS.cream, textAlign: 'center' }}>
            No MP3 files found in your Google Drive.
          </p>
          <p style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center' }}>
            Share a folder containing MP3 files with your service account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <audio
        ref={audioRef}
        src={track ? `/api/drive/file/${track.id}` : undefined}
        onPlay={() => {
          setIsPlaying(true);
          setAudioError(null);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={(e) => {
          const err = e.currentTarget.error;
          setAudioError(
            err
              ? `Audio error (code ${err.code}): ${err.message || 'cannot play this file'}`
              : 'Unknown audio error'
          );
          setIsPlaying(false);
        }}
      />

      <div style={styles.card}>
        {/* Share button */}
        <button
          onClick={handleShare}
          style={styles.shareBtn}
          aria-label="Share track"
        >
          <Share2 size={16} />
          {shareCopied ? 'Copied!' : 'Share'}
        </button>

        {/* Ambient glow behind the disc */}
        <div style={styles.glow} aria-hidden="true" />

        {/* Album disc */}
        <div style={styles.discWrap}>
          <div
            style={{
              ...styles.disc,
              animationPlayState: isPlaying ? 'running' : 'paused',
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
          <h2 style={styles.title}>{track ? trackTitle(track.name) : 'MUSIC'}</h2>
          <p style={styles.artist}>
            Google Drive <span style={styles.dot}>&middot;</span>{' '}
            {trackIndex + 1} / {tracks.length}
          </p>
          {audioError && (
            <p style={{ color: COLORS.orangeLight, fontSize: 12, margin: '6px 0 0' }}>
              {audioError}
            </p>
          )}
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
              const audio = audioRef.current;
              if (!audio || duration === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              audio.currentTime = ratio * duration;
              setProgress(ratio * duration);
            }}
          >
            <div style={{ ...styles.scrubFill, width: `${pct}%` }} />
            <div style={{ ...styles.scrubThumb, left: `${pct}%` }} />
          </div>
          <span style={styles.time}>{formatTime(duration)}</span>
        </div>

        {/* Transport controls */}
        <div style={styles.controlsRow}>
          <button
            aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
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
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={handlePlayPause}
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
            aria-pressed={repeatMode !== 'off'}
            onClick={cycleRepeat}
            style={{
              ...styles.iconBtn,
              color: repeatMode !== 'off' ? COLORS.orange : COLORS.muted,
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
          <p style={styles.queueLabel}>Tracks</p>
          <div style={styles.queueScroll}>
            {tracks.map((t, i) => (
              <button
                key={t.id}
                onClick={() => {
                  setProgress(0);
                  setTrackIndex(i);
                  setIsPlaying(true);
                }}
                style={styles.queueRow}
              >
                <span
                  style={{
                    ...styles.queueDash,
                    background: i === trackIndex ? COLORS.orangeLight : COLORS.orange,
                    boxShadow:
                      i === trackIndex ? `0 0 6px ${COLORS.orange}` : 'none',
                  }}
                />
                <span
                  style={{
                    ...styles.queueTitle,
                    color: i === trackIndex ? COLORS.orange : COLORS.cream,
                  }}
                >
                  {trackTitle(t.name)}
                </span>
              </button>
            ))}
          </div>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    width: '100%',
    background: `radial-gradient(circle at 50% 0%, ${COLORS.bgVignette} 0%, ${COLORS.bg} 65%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    fontFamily: "'Manrope', 'Segoe UI', system-ui, -apple-system, sans-serif",
    boxSizing: 'border-box',
  },
  card: {
    position: 'relative',
    width: 360,
    maxWidth: '100%',
    background: COLORS.surface,
    borderRadius: 28,
    padding: '32px 28px 24px',
    boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${COLORS.orange}33 0%, transparent 70%)`,
    filter: 'blur(10px)',
    pointerEvents: 'none',
  },
  discWrap: {
    position: 'relative',
    width: 168,
    height: 168,
    marginBottom: 20,
  },
  disc: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    animation: 'spin 9s linear infinite',
    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
  },
  trackInfo: {
    textAlign: 'center',
    marginBottom: 18,
    width: '100%',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: COLORS.cream,
    letterSpacing: '-0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artist: {
    margin: '6px 0 0',
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: 500,
  },
  dot: {
    color: COLORS.orange,
    margin: '0 2px',
  },
  eqWrap: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: 54,
    width: '100%',
    marginBottom: 18,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
    transition: 'opacity 0.3s ease',
  },
  scrubRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  time: {
    fontSize: 11,
    color: COLORS.muted,
    fontVariantNumeric: 'tabular-nums',
    width: 34,
    flexShrink: 0,
  },
  scrubTrack: {
    position: 'relative',
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.12)',
    cursor: 'pointer',
  },
  scrubFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
    background: `linear-gradient(90deg, ${COLORS.orangeDim}, ${COLORS.orange})`,
  },
  scrubThumb: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: COLORS.orangeLight,
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 0 3px rgba(236,94,39,0.25)',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    width: '100%',
    marginBottom: 20,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: COLORS.cream,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  playBtn: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    border: 'none',
    background: `linear-gradient(160deg, ${COLORS.orangeLight}, ${COLORS.orange})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 10px 24px -6px rgba(236,94,39,0.7)',
  },
  volumeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 22,
  },
  volumeIconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    padding: 4,
  },
  volumeTrack: {
    position: 'relative',
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.12)',
    cursor: 'pointer',
  },
  volumeFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
    background: COLORS.faint,
  },
  queue: {
    width: '100%',
    borderTop: `1px solid rgba(255,255,255,0.08)`,
    paddingTop: 14,
  },
  queueLabel: {
    margin: '0 0 10px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: COLORS.faint,
    fontWeight: 700,
  },
  queueScroll: {
    maxHeight: 180,
    overflowY: 'auto',
  },
  queueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '7px 4px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
  },
  queueDash: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: COLORS.orange,
    flexShrink: 0,
  },
  queueTitle: {
    fontSize: 13,
    color: COLORS.cream,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  shareBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'transparent',
    border: 'none',
    color: COLORS.muted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    transition: 'color 0.2s ease, background 0.2s ease',
  },
  shareBtnHover: {
    color: COLORS.orange,
    background: 'rgba(236,94,39,0.1)',
  },
};

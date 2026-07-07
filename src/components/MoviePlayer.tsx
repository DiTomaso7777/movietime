'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  X,
  Subtitles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface MoviePlayerProps {
  movie: DriveFile;
  subtitleFiles: DriveFile[];
  onBack: () => void;
}

const COLORS = {
  bg: '#000000',
  bgVignette: '#1a1a1a',
  surface: '#403D39',
  surfaceRaised: '#4C4842',
  orange: '#EC5E27',
  orangeLight: '#FF8A50',
  orangeDim: '#8A3B1B',
  cream: '#F5F1E8',
  muted: '#A79E92',
  faint: '#6E6760',
};

function formatTime(totalSeconds: number) {
  if (!isFinite(totalSeconds)) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getMovieTitle(name: string): string {
  return name.replace(/\.(mp4|mkv|webm|avi|mov)$/i, '');
}

export default function MoviePlayer({ movie, subtitleFiles, onBack }: MoviePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubDraggingRef = useRef(false);

  const ratioFromPointer = (
    e: React.PointerEvent<HTMLDivElement>,
    el: HTMLDivElement
  ) => {
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    e.preventDefault();
    scrubDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ratio = ratioFromPointer(e, e.currentTarget);
    setProgress(ratio * duration);
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubDraggingRef.current || duration === 0) return;
    const ratio = ratioFromPointer(e, e.currentTarget);
    setProgress(ratio * duration);
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubDraggingRef.current) return;
    scrubDraggingRef.current = false;
    const video = videoRef.current;
    if (video && duration > 0) {
      const ratio = ratioFromPointer(e, e.currentTarget);
      video.currentTime = ratio * duration;
      setProgress(ratio * duration);
    }
  };

  const volumeDraggingRef = useRef(false);

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    volumeDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setMuted(false);
    setVolume(Math.round(ratioFromPointer(e, e.currentTarget) * 100));
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!volumeDraggingRef.current) return;
    setVolume(Math.round(ratioFromPointer(e, e.currentTarget) * 100));
  };

  const handleVolumePointerUp = () => {
    volumeDraggingRef.current = false;
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    }
  };

  const toggleMute = () => {
    setMuted((m) => !m);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.muted = muted || volume === 0;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!scrubDraggingRef.current) {
        setProgress(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (selectedSubtitle) {
      const subtitleFile = subtitleFiles.find(f => f.id === selectedSubtitle);
      if (subtitleFile) {
        if (video.textTracks[0]) {
          video.textTracks[0].mode = 'hidden';
        }
        const track = video.addTextTrack('captions', 'Subtitles', 'en');
        // In a real implementation, you'd fetch and parse the subtitle file
        // For now, we'll use the track element approach
      }
    } else {
      Array.from(video.textTracks).forEach(track => {
        track.mode = 'hidden';
      });
    }
  }, [selectedSubtitle, subtitleFiles]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleContainerClick = () => {
    handlePlayPause();
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={`/api/drive/file/${movie.id}`}
        style={styles.video}
        onClick={handleContainerClick}
        controls={false}
        autoPlay
      />

      {selectedSubtitle && (
        <track
          kind="captions"
          src={`/api/drive/file/${selectedSubtitle}`}
          srcLang="en"
          label="English"
          default
        />
      )}

      {/* Back button */}
      <button onClick={onBack} style={styles.backBtn}>
        <X size={24} />
      </button>

      {/* Controls overlay */}
      <div style={{ ...styles.controls, opacity: showControls ? 1 : 0 }}>
        {/* Progress bar */}
        <div style={styles.scrubRow}>
          <div
            style={styles.scrubHit}
            onPointerDown={handleScrubPointerDown}
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            onPointerCancel={handleScrubPointerUp}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(progress)}
          >
            <div style={styles.scrubTrack}>
              <div style={{ ...styles.scrubFill, width: `${pct}%` }} />
              <div style={{ ...styles.scrubThumb, left: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div style={styles.controlsRow}>
          <div style={styles.leftControls}>
            <button
              aria-label="Play/Pause"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              style={styles.iconBtn}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              aria-label="Rewind 10s"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip(-10);
              }}
              style={styles.iconBtn}
            >
              <SkipBack size={20} />
            </button>

            <button
              aria-label="Forward 10s"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip(10);
              }}
              style={styles.iconBtn}
            >
              <SkipForward size={20} />
            </button>

            <div style={styles.volumeRow}>
              <button
                aria-label="Mute"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                style={styles.volumeIconBtn}
              >
                <VolumeIcon size={18} />
              </button>
              <div
                style={styles.volumeHit}
                onPointerDown={handleVolumePointerDown}
                onPointerMove={handleVolumePointerMove}
                onPointerUp={handleVolumePointerUp}
                onPointerCancel={handleVolumePointerUp}
                role="slider"
                aria-label="Volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={volume}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.volumeTrack}>
                  <div
                    style={{
                      ...styles.volumeFill,
                      width: `${muted ? 0 : volume}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <span style={styles.timeDisplay}>
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>

          <div style={styles.rightControls}>
            {/* Subtitle button */}
            {subtitleFiles.length > 0 && (
              <div style={styles.subtitleMenuContainer}>
                <button
                  aria-label="Subtitles"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubtitleMenu(!showSubtitleMenu);
                  }}
                  style={{
                    ...styles.iconBtn,
                    color: selectedSubtitle ? COLORS.orange : COLORS.cream,
                  }}
                >
                  <Subtitles size={20} />
                </button>

                {showSubtitleMenu && (
                  <div style={styles.subtitleMenu}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubtitle(null);
                        setShowSubtitleMenu(false);
                      }}
                      style={{
                        ...styles.subtitleOption,
                        color: !selectedSubtitle ? COLORS.orange : COLORS.cream,
                      }}
                    >
                      Off
                    </button>
                    {subtitleFiles.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubtitle(sub.id);
                          setShowSubtitleMenu(false);
                        }}
                        style={{
                          ...styles.subtitleOption,
                          color: selectedSubtitle === sub.id ? COLORS.orange : COLORS.cream,
                        }}
                      >
                        {sub.name.replace(/\.(vtt|srt)$/i, '')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              aria-label="Fullscreen"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              style={styles.iconBtn}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Movie title overlay */}
      <div style={{ ...styles.titleOverlay, opacity: showControls ? 1 : 0 }}>
        <h2 style={styles.movieTitle}>{getMovieTitle(movie.name)}</h2>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    background: COLORS.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    background: 'rgba(0,0,0,0.6)',
    border: 'none',
    color: COLORS.cream,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 50,
    transition: 'background 0.2s ease',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
    padding: '60px 32px 32px',
    transition: 'opacity 0.3s ease',
    zIndex: 5,
  },
  scrubRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  scrubHit: {
    flex: 1,
    padding: '14px 0',
    cursor: 'pointer',
    touchAction: 'none',
  },
  scrubTrack: {
    position: 'relative',
    width: '100%',
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.3)',
    pointerEvents: 'none',
  },
  scrubFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    background: COLORS.orange,
  },
  scrubThumb: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: COLORS.orangeLight,
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 0 4px rgba(236,94,39,0.3)',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: COLORS.cream,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 8,
    transition: 'background 0.2s ease',
    touchAction: 'manipulation',
  },
  volumeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  volumeIconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    minWidth: 40,
    minHeight: 40,
    touchAction: 'manipulation',
  },
  volumeHit: {
    width: 100,
    padding: '14px 0',
    cursor: 'pointer',
    touchAction: 'none',
  },
  volumeTrack: {
    position: 'relative',
    width: '100%',
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.3)',
    pointerEvents: 'none',
  },
  volumeFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    background: COLORS.cream,
  },
  timeDisplay: {
    fontSize: 14,
    color: COLORS.cream,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
  },
  subtitleMenuContainer: {
    position: 'relative',
  },
  subtitleMenu: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 8,
    background: 'rgba(0,0,0,0.95)',
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  subtitleOption: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: COLORS.cream,
    cursor: 'pointer',
    padding: '10px 12px',
    textAlign: 'left',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.2s ease',
  },
  titleOverlay: {
    position: 'absolute',
    top: 20,
    left: 80,
    right: 20,
    transition: 'opacity 0.3s ease',
    zIndex: 5,
  },
  movieTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.cream,
    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

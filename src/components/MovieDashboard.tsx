'use client';

import React, { useState } from 'react';
import { Play, Film } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

interface MovieDashboardProps {
  files: DriveFile[];
  onSelectMovie: (file: DriveFile) => void;
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

function getMovieTitle(name: string): string {
  return name.replace(/\.(mp4|mkv|webm|avi|mov)$/i, '');
}

function getMovieYear(name: string): string | null {
  const match = name.match(/\((\d{4})\)/);
  return match ? match[1] : null;
}

export default function MovieDashboard({ files, onSelectMovie }: MovieDashboardProps) {
  const movies = files.filter(
    (f) => f.mimeType.startsWith('video/') || /\.(mp4|mkv|webm|avi|mov)$/i.test(f.name)
  );

  const [hoveredMovie, setHoveredMovie] = useState<string | null>(null);

  if (movies.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <Film size={64} color={COLORS.muted} />
          <p style={styles.emptyTitle}>No movies found</p>
          <p style={styles.emptyText}>
            Upload video files (MP4, MKV, WebM, AVI, MOV) to your Google Drive
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>MovieTime</h1>
        <p style={styles.subtitle}>
          {movies.length} {movies.length === 1 ? 'movie' : 'movies'} available
        </p>
      </div>

      <div style={styles.grid}>
        {movies.map((movie) => {
          const title = getMovieTitle(movie.name);
          const year = getMovieTitle(movie.name);
          const isHovered = hoveredMovie === movie.id;

          return (
            <button
              key={movie.id}
              onClick={() => onSelectMovie(movie)}
              onMouseEnter={() => setHoveredMovie(movie.id)}
              onMouseLeave={() => setHoveredMovie(null)}
              style={{
                ...styles.movieCard,
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isHovered ? '0 20px 40px -10px rgba(236,94,39,0.3)' : '0 10px 30px -10px rgba(0,0,0,0.5)',
              }}
            >
              <div style={styles.thumbnail}>
                <div style={styles.thumbnailBg}>
                  <Film size={48} color={COLORS.muted} />
                </div>
                <div style={{ ...styles.playOverlay, opacity: isHovered ? 1 : 0 }}>
                  <Play size={32} fill={COLORS.bg} color={COLORS.bg} />
                </div>
              </div>
              <div style={styles.movieInfo}>
                <h3 style={styles.movieTitle}>{title}</h3>
                <p style={styles.movieMeta}>
                  {movie.size && `${(parseInt(movie.size) / 1024 / 1024).toFixed(0)} MB`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    width: '100%',
    background: `radial-gradient(circle at 50% 0%, ${COLORS.bgVignette} 0%, ${COLORS.bg} 65%)`,
    padding: '40px 32px',
    fontFamily: "'Manrope', 'Segoe UI', system-ui, -apple-system, sans-serif",
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: 40,
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 48,
    fontWeight: 800,
    color: COLORS.cream,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: 500,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24,
    maxWidth: 1400,
    margin: '0 auto',
  },
  movieCard: {
    position: 'relative',
    background: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  thumbnail: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    background: COLORS.surfaceRaised,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailBg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.3s ease',
  },
  movieInfo: {
    padding: 16,
  },
  movieTitle: {
    margin: '0 0 4px',
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.cream,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  movieMeta: {
    margin: 0,
    fontSize: 13,
    color: COLORS.muted,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
  },
  emptyTitle: {
    margin: '20px 0 8px',
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.cream,
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: COLORS.muted,
    maxWidth: 400,
  },
};

'use client';

import { useEffect, useState } from 'react';
import MovieDashboard from '@/components/MovieDashboard';
import MoviePlayer from '@/components/MoviePlayer';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

export default function Home() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<DriveFile | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch('/api/drive');
        const data = await response.json();
        
        if (response.ok) {
          setFiles(data.files || []);
        } else {
          setError(data.error || 'Failed to fetch files');
        }
      } catch (err) {
        setError('An error occurred while fetching files');
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  const subtitleFiles = files.filter(
    (f) => f.mimeType.includes('text') || /\.(vtt|srt)$/i.test(f.name)
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#181512', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            '--color-1': '#EC5E27',
            '--size': '2px',
            height: 'calc(30 * var(--size))',
            width: 'calc(10 * var(--size))',
            borderRadius: 'calc(4 * var(--size))',
            color: 'var(--color-1)',
            background: 'currentColor',
            position: 'relative',
            animation: 'ht 1s ease-in infinite alternate',
            boxShadow: 'calc(15 * var(--size)) 0 0 calc(-1 * var(--size)), calc(-15 * var(--size)) 0 0 calc(-1 * var(--size)), calc(30 * var(--size)) 0 0 calc(-2 * var(--size)), calc(-30 * var(--size)) 0 0 calc(-2 * var(--size)), calc(45 * var(--size)) 0 0 calc(-3 * var(--size)), calc(-45 * var(--size)) 0 0 calc(-3 * var(--size))',
          } as any} />
          <p style={{ color: '#F5F1E8', marginTop: 20 }}>Loading files from Google Drive...</p>
        </div>
        <style>{`
          @keyframes ht {
            100% {
              height: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (selectedMovie) {
    return (
      <MoviePlayer
        movie={selectedMovie}
        subtitleFiles={subtitleFiles}
        onBack={() => setSelectedMovie(null)}
      />
    );
  }

  return <MovieDashboard files={files} onSelectMovie={setSelectedMovie} />;
}

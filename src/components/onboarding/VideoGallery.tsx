'use client';

import { useState } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import VideoModal from './VideoModal';
import { onboardingVideos, OnboardingVideo, isVideoWatched } from '@/lib/onboarding-videos';

/**
 * Full gallery of onboarding videos — used on the help/videos page.
 * Only shows videos that have a URL configured.
 */
export default function VideoGallery() {
  const [activeVideo, setActiveVideo] = useState<OnboardingVideo | null>(null);

  const available = Object.values(onboardingVideos).filter(v => v.url);

  if (available.length === 0) {
    return (
      <div className="text-center py-12 text-white/40">
        <Play className="w-10 h-10 mx-auto mb-3" />
        <p>Tutorial videos coming soon.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {available.map(video => {
          const watched = isVideoWatched(video.key);
          return (
            <button
              key={video.key}
              onClick={() => setActiveVideo(video)}
              className="glass-card p-0 overflow-hidden text-left hover:border-accent/30 transition-colors group"
            >
              {/* Thumbnail / play area */}
              <div className="aspect-video bg-black/40 flex items-center justify-center relative">
                <Play className="w-10 h-10 text-white/30 group-hover:text-accent group-hover:scale-110 transition-all" />
                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-xs text-white/70">
                  {video.duration}
                </span>
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm text-white group-hover:text-accent transition-colors">
                    {video.title}
                  </h3>
                  {watched && (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  )}
                </div>
                <p className="text-xs text-white/50 mt-1 line-clamp-2">
                  {video.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {activeVideo && (
        <VideoModal
          video={activeVideo}
          isOpen={!!activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}

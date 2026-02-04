'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import VideoModal from './VideoModal';
import { OnboardingVideo, isVideoWatched } from '@/lib/onboarding-videos';

interface VideoHelpButtonProps {
  video: OnboardingVideo;
  /** Compact mode renders a smaller icon button */
  compact?: boolean;
  /** Label text next to the icon (only in non-compact mode) */
  label?: string;
}

export default function VideoHelpButton({ video, compact, label }: VideoHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if the video has no URL yet
  if (!video.url) return null;

  const watched = isVideoWatched(video.key);

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="p-1 rounded-md hover:bg-white/10 text-green-400 hover:text-green-300 transition-colors"
          title={`Watch: ${video.title}`}
        >
          <Play className="w-3.5 h-3.5" />
        </button>
        <VideoModal video={video} isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
        title={`Watch: ${video.title}`}
      >
        <Play className="w-3.5 h-3.5" />
        <span>{label || video.duration}</span>
        {!watched && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
      </button>
      <VideoModal video={video} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

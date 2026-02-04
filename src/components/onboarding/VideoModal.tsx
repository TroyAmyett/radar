'use client';

import { useEffect, useRef } from 'react';
import { X, Play } from 'lucide-react';
import { OnboardingVideo, markVideoWatched, getYouTubeEmbedUrl } from '@/lib/onboarding-videos';

interface VideoModalProps {
  video: OnboardingVideo;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoModal({ video, isOpen, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      markVideoWatched(video.key);
    }
  }, [isOpen, video.key]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Pause video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-card w-full max-w-5xl mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video player */}
        {video.url ? (
          (() => {
            const youtubeEmbed = getYouTubeEmbedUrl(video.url!);
            if (youtubeEmbed) {
              return (
                <iframe
                  src={youtubeEmbed}
                  className="w-full aspect-video bg-black"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }
            return (
              <video
                ref={videoRef}
                src={video.url!}
                controls
                autoPlay
                className="w-full aspect-video bg-black"
                playsInline
              />
            );
          })()
        ) : (
          <div className="w-full aspect-video bg-black/50 flex items-center justify-center">
            <div className="text-center text-white/40">
              <Play className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Video coming soon</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white mb-1">{video.title}</h3>
          <p className="text-sm text-white/60">{video.description}</p>
        </div>
      </div>
    </div>
  );
}

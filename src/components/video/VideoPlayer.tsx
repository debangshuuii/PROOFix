'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { VideoProcessingStatus, VideoResolution } from '@/lib/types/video';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  AlertCircle,
  Clock,
  Download,
  Film,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface VideoPlayerProps {
  videoUrl?: string;
  /** Storage path is passed internally for metadata but MUST NOT be rendered to DOM */
  storagePath?: string;
  status?: VideoProcessingStatus;
  title?: string;
  durationMs?: number;
  resolution?: VideoResolution;
  downloadUrl?: string;
  autoPlay?: boolean;
  className?: string;
  onPlaybackError?: (errorMessage: string) => void;
}

export function VideoPlayer({
  videoUrl,
  status = 'ready',
  title,
  durationMs,
  resolution,
  downloadUrl,
  autoPlay = false,
  className = '',
  onPlaybackError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState((durationMs ? durationMs / 1000 : 0));
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setPlaybackError(null);
    setCurrentTime(0);
  }, [videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          const msg = `Playback error: ${err.message || 'Codec or browser restriction'}`;
          setPlaybackError(msg);
          if (onPlaybackError) onPlaybackError(msg);
        });
    }
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    if (videoRef.current) {
      if (!duration || duration === 0) {
        setDuration(videoRef.current.duration || (durationMs ? durationMs / 1000 : 0));
      }
      if (autoPlay) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handleError = () => {
    setIsLoading(false);
    const msg = 'Unable to decode Playwright WebM recording in this browser. Please download the file to inspect.';
    setPlaybackError(msg);
    if (onPlaybackError) onPlaybackError(msg);
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const remainingS = s % 60;
    return `${m}:${remainingS < 10 ? '0' : ''}${remainingS}`;
  };

  // -------------------------------------------------------------
  // STATE 1: UNAVAILABLE STATE
  // -------------------------------------------------------------
  if (status === 'initializing' || status === 'recording' || status === 'finalizing') {
    return (
      <div
        data-testid="video-unavailable-state"
        className={`rounded-xl border border-sky-900/60 bg-slate-900/80 p-8 text-center flex flex-col items-center justify-center min-h-[260px] ${className}`}
      >
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
        <h4 className="text-sm font-semibold text-white">
          {status === 'recording' ? 'Session Recording in Progress' : 'Finalizing Video Stream'}
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Playwright browser context is active. Recording will become playable once the test finishes and context flushes.
        </p>
      </div>
    );
  }

  if (status === 'discarded' || status === 'cleaned_up' || !videoUrl) {
    return (
      <div
        data-testid="video-unavailable-state"
        className={`rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center flex flex-col items-center justify-center min-h-[260px] ${className}`}
      >
        <Film className="w-8 h-8 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">Recording Unavailable</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          {status === 'discarded'
            ? 'Video was discarded per recording policy (test passed without retries).'
            : status === 'cleaned_up'
            ? 'Recording expired and was safely purged under the retention limit policy.'
            : 'No video recording artifact attached to this test result.'}
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: PLAYBACK ERROR STATE
  // -------------------------------------------------------------
  if (playbackError || status === 'failed') {
    return (
      <div
        data-testid="video-playback-error-state"
        className={`rounded-xl border border-rose-900/60 bg-rose-950/20 p-6 text-center flex flex-col items-center justify-center min-h-[260px] ${className}`}
      >
        <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
        <h4 className="text-sm font-semibold text-rose-200">Video Playback Error</h4>
        <p className="text-xs text-rose-300/80 mt-1 max-w-md">
          {playbackError || 'Video stream could not be decoded.'}
        </p>

        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="mt-4 px-3 py-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-800/60 border border-rose-700/60 text-xs font-medium text-rose-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download WebM Recording Directly
          </a>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 3: PLAYABLE VIDEO PLAYER
  // -------------------------------------------------------------
  return (
    <div
      data-testid="video-player-container"
      className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      {/* Header bar */}
      <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-200 truncate max-w-sm">
            {title || 'Playwright Session Recording'}
          </span>
          {resolution && (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
              {resolution.width}x{resolution.height}
            </span>
          )}
        </div>

        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            title="Download verified recording"
          >
            <Download className="w-3 h-3" />
            Download
          </a>
        )}
      </div>

      {/* Video display area */}
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {isLoading && (
          <div
            data-testid="video-loading-state"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-xs text-slate-400 z-10"
          >
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin mb-2" />
            <span>Buffering test session recording...</span>
          </div>
        )}

        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-sky-400 fill-sky-400" />}
          </button>

          <button
            onClick={handleRestart}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Restart"
            title="Restart from beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="text-[11px] font-mono text-slate-400 ml-1">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed and tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 rounded-md border border-slate-800 p-0.5 text-[10px]">
            {[1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

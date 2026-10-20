import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Unified Shadowing Player Hook
 * Supports both YouTube IFrame API and native HTML5 video/audio elements with:
 * - High-precision timestamp synchronization
 * - 0.75x, 1x, 1.25x speed adjustments
 * - Single-sentence looping
 * - Active transcript segment detection
 */
export function useShadowingPlayer({
  mediaSource = 'youtube',
  youtubeId = '',
  _mediaFileUrl = '',
  segments = [],
  initialSegmentIndex = 0,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.75, 1, 1.25
  const [isLooping, setIsLooping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const isYouTube = mediaSource === 'youtube' || Boolean(youtubeId);
  const youtubeContainerId = useMemo(
    () => `youtube-player-${youtubeId || 'default'}`,
    [youtubeId]
  );

  const ytPlayerRef = useRef(null);
  const mediaRef = useRef(null);
  const timerRef = useRef(null);
  const snippetTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (snippetTimerRef.current) {
        clearInterval(snippetTimerRef.current);
        snippetTimerRef.current = null;
      }
    };
  }, []);
  const isLoopingRef = useRef(isLooping);
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const playbackSpeedRef = useRef(playbackSpeed);
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  const segmentsRef = useRef(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const initialSegmentIndexRef = useRef(initialSegmentIndex);
  useEffect(() => {
    initialSegmentIndexRef.current = initialSegmentIndex;
  }, [initialSegmentIndex]);

  // Active segment calculation
  const activeSegmentIndex = useMemo(() => {
    if (!segments || segments.length === 0) return -1;
    // Buffer 0.15s for smooth transitions
    const idx = segments.findIndex(
      (s) => currentTime >= s.start - 0.05 && currentTime <= s.end + 0.1
    );
    if (idx !== -1) return idx;
    // Fallback: segment whose start is closest but <= currentTime
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].start) return i;
    }
    return 0;
  }, [segments, currentTime]);

  const activeSegment = segments[activeSegmentIndex] || null;
  const activeSegmentRef = useRef(activeSegment);
  useEffect(() => {
    activeSegmentRef.current = activeSegment;
  }, [activeSegment]);

  /* ==================== YouTube Player Integration ==================== */

  useEffect(() => {
    if (!isYouTube || !youtubeId) return;

    let destroyed = false;

    function initYouTube() {
      if (destroyed || !window.YT || !window.YT.Player) return;

      try {
        if (ytPlayerRef.current?.destroy) {
          ytPlayerRef.current.destroy();
        }

        ytPlayerRef.current = new window.YT.Player(youtubeContainerId, {
          videoId: youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (destroyed) return;
              setIsReady(true);
              const dur = event.target.getDuration();
              if (dur) setDuration(dur);
              event.target.setPlaybackRate(playbackSpeedRef.current);

              const initIdx = initialSegmentIndexRef.current;
              const segs = segmentsRef.current;
              if (initIdx > 0 && segs[initIdx]) {
                const startTime = segs[initIdx].start;
                event.target.seekTo(startTime, true);
                setCurrentTime(startTime);
              }
            },
            onStateChange: (event) => {
              if (destroyed) return;
              // 1: PLAYING, 2: PAUSED, 0: ENDED
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
              }
            },
            onError: (event) => {
              if (destroyed) return;
              const errCode = event.data;
              setError(`Lỗi phát YouTube (mã ${errCode})`);
              setIsReady(false);
            },
          },
        });
      } catch {
        // Player creation fallback
      }
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        if (!destroyed) {
          setError('Không thể tải YouTube Player API.');
          setIsReady(false);
        }
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initYouTube();
      };
    } else {
      initYouTube();
    }

    return () => {
      destroyed = true;
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [isYouTube, youtubeId, youtubeContainerId]);

  /* ==================== YouTube Polling & Loop Tick ==================== */

  useEffect(() => {
    if (!isYouTube || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (!ytPlayerRef.current?.getCurrentTime) return;
      try {
        const cur = ytPlayerRef.current.getCurrentTime();
        setCurrentTime(cur);

        // Check single sentence loop
        const seg = activeSegmentRef.current;
        if (isLoopingRef.current && seg && typeof seg.end === 'number') {
          if (cur >= seg.end) {
            ytPlayerRef.current.seekTo(seg.start, true);
            setCurrentTime(seg.start);
          }
        }
      } catch {
        // ignore
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isYouTube, isPlaying]);

  /* ==================== HTML5 Video/Audio Integration ==================== */

  useEffect(() => {
    const el = mediaRef.current;
    if (isYouTube || !el) return;

    function handleTimeUpdate() {
      const cur = el.currentTime;
      setCurrentTime(cur);

      const seg = activeSegmentRef.current;
      if (isLoopingRef.current && seg && typeof seg.end === 'number') {
        if (cur >= seg.end) {
          el.currentTime = seg.start;
          if (el.paused) el.play();
        }
      }
    }

    function handleLoadedMetadata() {
      setDuration(el.duration || 0);
      setIsReady(true);
      el.playbackRate = playbackSpeed;
      if (initialSegmentIndex > 0 && segments[initialSegmentIndex]) {
        el.currentTime = segments[initialSegmentIndex].start;
      }
    }

    function handlePlay() {
      setIsPlaying(true);
    }

    function handlePause() {
      setIsPlaying(false);
    }

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
    };
  }, [isYouTube, playbackSpeed, initialSegmentIndex, segments]);

  /* ==================== Player Actions ==================== */

  const play = useCallback(() => {
    if (isYouTube) {
      ytPlayerRef.current?.playVideo?.();
    } else {
      mediaRef.current?.play?.();
    }
  }, [isYouTube]);

  const pause = useCallback(() => {
    if (isYouTube) {
      ytPlayerRef.current?.pauseVideo?.();
    } else {
      mediaRef.current?.pause?.();
    }
  }, [isYouTube]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(
    (seconds, autoPlay = true) => {
      const target = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
      setCurrentTime(target);

      if (isYouTube) {
        ytPlayerRef.current?.seekTo?.(target, true);
        if (autoPlay) {
          ytPlayerRef.current?.playVideo?.();
        }
      } else if (mediaRef.current) {
        mediaRef.current.currentTime = target;
        if (autoPlay) {
          mediaRef.current.play?.();
        }
      }
    },
    [isYouTube]
  );

  const setSpeed = useCallback(
    (speed) => {
      const validSpeed = Number(speed);
      setPlaybackSpeed(validSpeed);
      if (isYouTube) {
        ytPlayerRef.current?.setPlaybackRate?.(validSpeed);
      } else if (mediaRef.current) {
        mediaRef.current.playbackRate = validSpeed;
      }
    },
    [isYouTube]
  );

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (isYouTube) {
        if (next) ytPlayerRef.current?.mute?.();
        else ytPlayerRef.current?.unMute?.();
      } else if (mediaRef.current) {
        mediaRef.current.muted = next;
      }
      return next;
    });
  }, [isYouTube]);

  // Play a specific segment snippet once (for pronunciation/listening modes)
  const playSegmentSnippet = useCallback(
    (seg, onComplete) => {
      if (!seg) return;
      seekTo(seg.start, true);

      if (snippetTimerRef.current) {
        clearInterval(snippetTimerRef.current);
        snippetTimerRef.current = null;
      }

      snippetTimerRef.current = setInterval(() => {
        let cur = 0;
        if (isYouTube) {
          cur = ytPlayerRef.current?.getCurrentTime?.() || 0;
        } else if (mediaRef.current) {
          cur = mediaRef.current.currentTime;
        }

        if (cur >= seg.end) {
          if (snippetTimerRef.current) {
            clearInterval(snippetTimerRef.current);
            snippetTimerRef.current = null;
          }
          pause();
          if (onComplete) onComplete();
        }
      }, 80);
    },
    [seekTo, pause, isYouTube]
  );

  const setMediaRef = useCallback((node) => {
    mediaRef.current = node;
  }, []);

  return {
    currentTime,
    duration,
    isPlaying,
    playbackSpeed,
    isLooping,
    isMuted,
    isReady,
    error,
    activeSegmentIndex,
    activeSegment,
    isYouTube,
    youtubeContainerId,
    setMediaRef,
    play,
    pause,
    togglePlay,
    seekTo,
    setSpeed,
    toggleLoop,
    setIsLooping,
    toggleMute,
    playSegmentSnippet,
    SUPPORTED_SPEEDS: [0.75, 1, 1.25],
  };
}

export default useShadowingPlayer;

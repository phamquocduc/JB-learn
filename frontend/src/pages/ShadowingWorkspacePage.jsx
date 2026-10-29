import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
  useOutletContext,
} from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlayCircleIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ClipboardDocumentCheckIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ShadowingModeStage from '../components/shadowing/modes/ShadowingModeStage';
import PronunciationModeStage from '../components/shadowing/modes/PronunciationModeStage';
import ListeningModeStage from '../components/shadowing/modes/ListeningModeStage';
import ExerciseModeStage from '../components/shadowing/modes/ExerciseModeStage';
import TranscriptPanel from '../components/shadowing/controls/TranscriptPanel';
import { useAuth } from '../context/useAuth';
import { fetchShadowingVideo, updateVideoProgress } from '../services/shadowingApi';
import {
  saveLastShadowingSession,
  getShadowingStatusMap,
  saveShadowingSegmentStatus,
} from '../services/shadowingProgress';
import { useShadowingPlayer } from '../hooks/useShadowingPlayer';

const MODES = [
  { id: 'Shadowing', label: 'Shadowing', icon: PlayCircleIcon },
  { id: 'Phát âm', label: 'Phát âm', icon: MicrophoneIcon },
  { id: 'Luyện nghe', label: 'Luyện nghe', icon: SpeakerWaveIcon },
  { id: 'Bài tập', label: 'Bài tập', icon: ClipboardDocumentCheckIcon },
];

export default function ShadowingWorkspacePage() {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active study mode & sentence index
  const [activeMode, setActiveMode] = useState(
    searchParams.get('mode') || 'Shadowing'
  );
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(
    Number(searchParams.get('seg')) || 0
  );

  // Subtitle view toggles
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showFurigana, setShowFurigana] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);

  // Segment ratings map
  const [segmentRatings, setSegmentRatings] = useState(() =>
    getShadowingStatusMap(user)
  );

  useEffect(() => {
    let ignore = false;
    if (!videoId) return;
    fetchShadowingVideo(videoId)
      .then((data) => {
        if (!ignore) {
          setVideo(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Không thể tải video Shadowing này.');
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [videoId]);

  const segments = useMemo(() => video?.segments || [], [video]);

  // Unified Player Hook
  const player = useShadowingPlayer({
    mediaSource: video?.media_source || 'youtube',
    youtubeId: video?.youtube_id || '',
    mediaFileUrl: video?.media_file_url || video?.media_file || '',
    segments,
    initialSegmentIndex: currentSegmentIndex,
  });

  // Keep URL query params synchronized
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeMode) params.set('mode', activeMode);
    if (currentSegmentIndex !== undefined) {
      params.set('seg', String(currentSegmentIndex));
    }
    setSearchParams(params, { replace: true });
  }, [activeMode, currentSegmentIndex, setSearchParams]);

  // Record session state for "Tiếp tục Shadowing"
  useEffect(() => {
    if (!video) return;
    saveLastShadowingSession(user, {
      videoId: video.id,
      segmentIndex: currentSegmentIndex,
      segmentId: segments[currentSegmentIndex]?.id || null,
      videoTitle: video.title,
      topic: video.topic,
      level: video.level,
      mode: activeMode,
    });
  }, [video, currentSegmentIndex, activeMode, segments, user]);

  // Save segment rating
  const handleRateSegment = useCallback(
    (segmentKey, statusValue) => {
      const updatedMap = saveShadowingSegmentStatus(user, segmentKey, statusValue);
      setSegmentRatings(updatedMap);

      if (user?.id && video?.id) {
        updateVideoProgress(video.id, {
          current_segment_index: currentSegmentIndex,
          ratings: { [String(segmentKey)]: statusValue },
        }).catch(() => { });
      }
    },
    [user, video, currentSegmentIndex]
  );

  const handleSeek = (startSeconds) => {
    player.seekTo(startSeconds, true);
  };

  if (isLoading) {
    return (
      <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        <Skeleton variant="shadowing-workspace" />
      </main>
    );
  }

  if (error || !video) {
    return (
      <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        <EmptyState
          title="Không tìm thấy bài học Shadowing"
          description={error || 'Video này có thể đã bị xóa hoặc bạn không có quyền truy cập.'}
          actionLabel="Quay lại Thư viện"
          onAction={() => navigate('/shadowing')}
        />
      </main>
    );
  }

  return (
    <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
      {/* 1. Top Header Toolbar (synchronized with FilterBar on HomePage) */}
      <Card
        rounded="xl"
        className="p-2.5 sm:p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5"
      >
        {/* Left: Back button, Video title, Level badge, and Mobile Sidebar button */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to="/shadowing"
              aria-label="Quay lại thư viện Shadowing"
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 shrink-0"
            >
              <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            </Link>

            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {video.title}
            </h1>
            <Badge variant="level">{video.level || 'N3'}</Badge>
          </div>

          {openSidebar && (
            <button
              type="button"
              onClick={openSidebar}
              aria-label="Mở menu điều hướng"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Right: 4 Mode Switcher Pill Buttons */}
        <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setActiveMode(mode.id);
                  player.pause();
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2. Main Study Workspace (synchronized flex-1 container with HomePage) */}
      <div className="flex-1 flex flex-col">
        {/* Persistent player mounted across all modes with hidden class to preserve player.youtubeContainerId iframe and snippet playback */}
        <div className={activeMode === 'Shadowing' ? 'flex-1 flex flex-col' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
            {/* Left Video Player & Subtitles Stage (lg:col-span-8) */}
            <div
              className={`flex flex-col gap-3 transition-all duration-150 ${isTranscriptOpen ? 'lg:col-span-8' : 'lg:col-span-12'
                }`}
            >
              <ShadowingModeStage
                video={video}
                player={player}
                setMediaRef={player.setMediaRef}
                showSubtitle={showSubtitle}
                onToggleSubtitle={() => setShowSubtitle((prev) => !prev)}
                showTranslation={showTranslation}
                onToggleTranslation={() => setShowTranslation((prev) => !prev)}
                showFurigana={showFurigana}
                onToggleFurigana={() => setShowFurigana((prev) => !prev)}
                isFavorite={isFavorite}
                onToggleFavorite={() => setIsFavorite((prev) => !prev)}
                isTranscriptOpen={isTranscriptOpen}
                onToggleTranscript={() => setIsTranscriptOpen((prev) => !prev)}
                currentUser={user}
              />
            </div>

            {/* Right Synchronized Transcript Panel (lg:col-span-4) */}
            {isTranscriptOpen && (
              <div className="lg:col-span-4 w-full lg:sticky lg:top-4">
                <TranscriptPanel
                  segments={segments}
                  activeSegmentIndex={player.activeSegmentIndex}
                  onSeek={handleSeek}
                  onClose={() => setIsTranscriptOpen(false)}
                  showFurigana={showFurigana}
                  videoTitle={video.title}
                />
              </div>
            )}
          </div>
        </div>

        {activeMode === 'Phát âm' && (
          <PronunciationModeStage
            video={video}
            player={player}
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            onSelectSegment={(idx) => setCurrentSegmentIndex(idx)}
            onRateSegment={handleRateSegment}
            segmentRatings={segmentRatings}
          />
        )}

        {activeMode === 'Luyện nghe' && (
          <ListeningModeStage
            video={video}
            player={player}
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            onSelectSegment={(idx) => setCurrentSegmentIndex(idx)}
          />
        )}

        {activeMode === 'Bài tập' && (
          <ExerciseModeStage
            video={video}
            player={player}
            exercises={video.exercises || []}
          />
        )}
      </div>
    </main>
  );
}

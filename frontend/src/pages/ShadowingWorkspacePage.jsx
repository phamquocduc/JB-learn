import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
  useOutletContext,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ShadowingModeStage from '../components/shadowing/modes/ShadowingModeStage';
import PronunciationModeStage from '../components/shadowing/modes/PronunciationModeStage';
import ListeningModeStage from '../components/shadowing/modes/ListeningModeStage';
import ExerciseModeStage from '../components/shadowing/modes/ExerciseModeStage';
import TranscriptPanel from '../components/shadowing/controls/TranscriptPanel';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { fetchShadowingVideo, updateVideoProgress } from '../services/shadowingApi';
import {
  saveLastShadowingSession,
  getShadowingStatusMap,
  saveShadowingSegmentStatus,
} from '../services/shadowingProgress';
import { useShadowingPlayer } from '../hooks/useShadowingPlayer';

// Keep internal mode IDs invariant for URL query params & saved progress compatibility.
const MODES = [
  { id: 'Shadowing', labelKey: 'shadowing:modes.shadowing', moduleKey: '' },
  {
    id: 'Phát âm',
    labelKey: 'shadowing:modes.pronunciation',
    moduleKey: 'shadowing.pronunciation',
  },
  {
    id: 'Luyện nghe',
    labelKey: 'shadowing:modes.listening',
    moduleKey: 'shadowing.listening',
  },
  {
    id: 'Bài tập',
    labelKey: 'shadowing:modes.exercise',
    moduleKey: 'shadowing.exercise',
  },
];

export default function ShadowingWorkspacePage() {
  const { t, i18n } = useTranslation(['shadowing', 'common']);
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isGuest, hasAnyPermission } = useAuth();
  const { isModuleEnabled, getModuleBlockReason, getModuleInfo } =
    useSystemConfig();

  const shadowingEnabled = isModuleEnabled('shadowing');
  const canViewShadowing = Boolean(
    shadowingEnabled &&
      (isGuest ||
        hasAnyPermission([
          'shadowing.view',
          'shadowing.view_all',
          'shadowing.edit',
          'shadowing.delete',
        ]))
  );
  const availableModes = useMemo(
    () => MODES.filter((m) => !m.moduleKey || isModuleEnabled(m.moduleKey)),
    [isModuleEnabled]
  );

  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active study mode & sentence index
  const [activeMode, setActiveMode] = useState(
    searchParams.get('mode') || 'Shadowing'
  );
  const effectiveMode = availableModes.some((m) => m.id === activeMode)
    ? activeMode
    : 'Shadowing';
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
    document.title = video?.title
      ? t('shadowing:pageTitles.workspace', { title: video.title })
      : t('shadowing:pageTitles.workspaceFallback');
  }, [video?.title, i18n.language, t]);

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
          setError(err.message || t('shadowing:workspace.loadError'));
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [videoId, i18n.language, t]);

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
    if (effectiveMode) params.set('mode', effectiveMode);
    if (currentSegmentIndex !== undefined) {
      params.set('seg', String(currentSegmentIndex));
    }
    setSearchParams(params, { replace: true });
  }, [effectiveMode, currentSegmentIndex, setSearchParams]);

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
      mode: effectiveMode,
    });
  }, [video, currentSegmentIndex, effectiveMode, segments, user]);

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

  if (!canViewShadowing) {
    const isRoleRestricted =
      !shadowingEnabled
        ? getModuleBlockReason('shadowing') === 'role_restricted'
        : true;
    const note = getModuleInfo('shadowing')?.maintenance_note;
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5">
        <EmptyState
          title={
            isRoleRestricted
              ? t('shadowing:library.blockedRoleTitle')
              : t('shadowing:library.blockedMaintenanceTitle')
          }
          description={
            isRoleRestricted
              ? t('shadowing:library.blockedRoleDesc')
              : note || t('shadowing:library.blockedMaintenanceFallback')
          }
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        <Skeleton variant="shadowing-workspace" />
      </main>
    );
  }

  if (error || !video) {
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
        <EmptyState
          title={t('shadowing:workspace.notFoundTitle')}
          description={error || t('shadowing:workspace.notFoundDesc')}
          actionLabel={t('shadowing:workspace.backToLibrary')}
          onAction={() => navigate('/shadowing')}
        />
      </main>
    );
  }

  return (
    <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-20 sm:pb-5 flex-1 flex flex-col gap-3">
      {/* 1. Top Header Toolbar */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Back button, Video title, Level badge, and Mobile Sidebar button */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <Link
              to="/shadowing"
              aria-label={t('shadowing:workspace.backToLibraryAria')}
              className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-control text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors duration-150 border border-slate-200 shrink-0"
            >
              <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            </Link>

            <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate min-w-0 flex-1">
              {video.title}
            </h1>
            <Badge variant="level" className="shrink-0">
              {video.level || 'N3'}
            </Badge>
          </div>

          {openSidebar && (
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common:nav.openMenu')}
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Right: Mode Switcher Segmented Tabs */}
        <div
          role="tablist"
          aria-label={t('shadowing:workspace.modesTabAria')}
          className={`grid ${
            availableModes.length === 4
              ? 'grid-cols-4'
              : availableModes.length === 3
                ? 'grid-cols-3'
                : availableModes.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
          } sm:flex sm:items-center gap-1 bg-white border border-slate-200 p-1 rounded-control shrink-0`}
        >
          {availableModes.map((mode) => {
            const isActive = effectiveMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveMode(mode.id);
                  player.pause();
                }}
                className={`inline-flex items-center justify-center h-8 px-2 sm:px-3 rounded-control text-xs font-medium leading-tight transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="whitespace-nowrap">{t(mode.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Main Study Workspace (synchronized flex-1 container with HomePage) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Persistent player mounted across all modes with hidden class to preserve player.youtubeContainerId iframe and snippet playback */}
        <div className={effectiveMode === 'Shadowing' ? 'flex-1 flex flex-col min-w-0' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start flex-1 min-w-0">
            {/* Left Video Player & Subtitles Stage (lg:col-span-8) */}
            <div
              className={`min-w-0 flex flex-col gap-3 transition-all duration-150 ${isTranscriptOpen ? 'lg:col-span-8' : 'lg:col-span-12'
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
              <div className="lg:col-span-4 w-full min-w-0 lg:sticky lg:top-4">
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

        {effectiveMode === 'Phát âm' && (
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

        {effectiveMode === 'Luyện nghe' && (
          <ListeningModeStage
            video={video}
            player={player}
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            onSelectSegment={(idx) => setCurrentSegmentIndex(idx)}
          />
        )}

        {effectiveMode === 'Bài tập' && (
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

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ShadowingResumeHero from '../components/shadowing/ShadowingResumeHero';
import ShadowingFilterBottomSheet from '../components/shadowing/ShadowingFilterBottomSheet';
import ShadowingVideoCard from '../components/shadowing/ShadowingVideoCard';
import AddVideoModal from '../components/shadowing/AddVideoModal';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { fetchShadowingVideos } from '../services/shadowingApi';
import { getShadowingStatusMap } from '../services/shadowingProgress';
import { formatNumber } from '../utils/formatters';

const TOPIC_TABS = [
  { value: '', labelKey: 'shadowing:topics.all' },
  { value: 'life', labelKey: 'shadowing:topics.life' },
  { value: 'conversation', labelKey: 'shadowing:topics.conversation' },
  { value: 'business', labelKey: 'shadowing:topics.business' },
  { value: 'news', labelKey: 'shadowing:topics.news' },
  { value: 'culture', labelKey: 'shadowing:topics.culture' },
];

const LEVEL_TABS = [
  { value: '', labelKey: 'shadowing:levels.all' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const SOURCE_LABEL_KEYS = {
  youtube: 'shadowing:sources.youtube',
  upload: 'shadowing:sources.upload',
};

export default function ShadowingLibraryPage() {
  const { t, i18n } = useTranslation(['shadowing', 'common']);
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const { user, isGuest, openAuthModal, hasPermission, hasAnyPermission } =
    useAuth();
  const { isModuleEnabled, getModuleBlockReason, getModuleInfo } =
    useSystemConfig();
  const navigate = useNavigate();

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
  const extractionEnabled = isModuleEnabled('shadowing.extraction');
  const canAddVideo = Boolean(
    hasPermission('shadowing.create') ||
      (extractionEnabled && (isGuest || hasPermission('shadowing.create_own')))
  );

  const handleOpenAddVideo = () => {
    if (isGuest) {
      openAuthModal('login');
      return;
    }
    setIsAddModalOpen(true);
  };

  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  // Modals & Sheets
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Study progress map
  const statusMap = useMemo(() => getShadowingStatusMap(user), [user]);

  useEffect(() => {
    document.title = t('shadowing:pageTitles.library');
  }, [i18n.language, t]);

  const loadVideos = () => {
    setIsLoading(true);
    setError(null);
    fetchShadowingVideos({
      topic: selectedTopic || undefined,
      level: selectedLevel || undefined,
      media_source: selectedSource || undefined,
      search: searchQuery.trim() || undefined,
    })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        setVideos(list);
      })
      .catch((err) => {
        setError(err.message || t('shadowing:library.loadError'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    fetchShadowingVideos({
      topic: selectedTopic || undefined,
      level: selectedLevel || undefined,
      media_source: selectedSource || undefined,
      search: searchQuery.trim() || undefined,
    })
      .then((data) => {
        if (!ignore) {
          const list = Array.isArray(data) ? data : data?.results || [];
          setVideos(list);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || t('shadowing:library.loadError'));
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedTopic, selectedLevel, selectedSource, searchQuery, i18n.language, t]);

  // Statistics
  const totalVideos = videos.length;
  const totalStudiedSegments = Object.keys(statusMap).length;
  const totalSegmentsAcrossVideos = useMemo(() => {
    return videos.reduce((acc, v) => acc + (v.total_segments || v.segments?.length || 0), 0);
  }, [videos]);
  const overallCompletionRate =
    totalSegmentsAcrossVideos > 0
      ? Math.min(100, Math.round((totalStudiedSegments / totalSegmentsAcrossVideos) * 100))
      : 0;

  const handleApplyMobileFilters = ({ topic, level, mediaSource }) => {
    setSelectedTopic(topic);
    setSelectedLevel(level);
    setSelectedSource(mediaSource);
  };

  const activeFilterChips = [];
  if (selectedTopic) {
    const matchedTopic = TOPIC_TABS.find((tab) => tab.value === selectedTopic);
    activeFilterChips.push({
      key: 'topic',
      label: matchedTopic ? t(matchedTopic.labelKey) : selectedTopic,
      onRemove: () => setSelectedTopic(''),
    });
  }
  if (selectedLevel) {
    activeFilterChips.push({
      key: 'level',
      label: selectedLevel,
      onRemove: () => setSelectedLevel(''),
    });
  }
  if (selectedSource) {
    activeFilterChips.push({
      key: 'source',
      label: SOURCE_LABEL_KEYS[selectedSource]
        ? t(SOURCE_LABEL_KEYS[selectedSource])
        : selectedSource,
      onRemove: () => setSelectedSource(''),
    });
  }

  if (!canViewShadowing) {
    const isRoleRestricted =
      !shadowingEnabled
        ? getModuleBlockReason('shadowing') === 'role_restricted'
        : true;
    const note = getModuleInfo('shadowing')?.maintenance_note;
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
        {openSidebar && (
          <div className="flex lg:hidden items-center justify-end">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common:nav.openMenu')}
              className="w-9 h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
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

  return (
    <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
      {isLoading && videos.length === 0 ? (
        <Skeleton variant="shadowing" count={6} />
      ) : (
        <>
          {/* 1. Resume Hero Card */}
          <ShadowingResumeHero
            currentUser={user}
            fallbackVideo={videos[0] || null}
            onOpenAddVideo={canAddVideo ? handleOpenAddVideo : undefined}
            onOpenSidebar={openSidebar}
          />

          {/* 2. Three-Column Metric Stats Bar (synchronized with CoursesPage) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-3.5 sm:p-4 flex flex-col gap-1 min-w-0">
              <span className="text-xs font-medium text-slate-500 truncate">
                {t('shadowing:library.stats.videos')}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {formatNumber(totalVideos)}
              </span>
            </Card>

            <Card className="p-3.5 sm:p-4 flex flex-col gap-1 min-w-0">
              <span className="text-xs font-medium text-slate-500 truncate">
                {t('shadowing:library.stats.practicedSegments')}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {formatNumber(totalStudiedSegments)}
              </span>
            </Card>

            <Card className="p-3.5 sm:p-4 flex flex-col gap-1 min-w-0">
              <span className="text-xs font-medium text-slate-500 truncate">
                {t('shadowing:library.stats.completion')}
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {overallCompletionRate}%
              </span>
            </Card>
          </div>

          {/* 3. Filter Toolbar */}
          <div className="flex flex-col gap-2.5">
            {/* Row 1: Desktop Topic Tabs + Mobile/Desktop Search + Mobile Filter Trigger */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Desktop Topic filter tabs */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0">
                <span className="text-xs font-medium text-slate-500 mr-1 shrink-0">
                  {t('shadowing:library.filters.topicLabel')}
                </span>
                {TOPIC_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setSelectedTopic(tab.value)}
                    className={`h-8 px-3 rounded-control text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                      selectedTopic === tab.value
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              {/* Search Box (flex-1 on mobile, fixed width on desktop) */}
              <div className="relative flex-1 sm:flex-none sm:w-64 min-w-0">
                <MagnifyingGlassIcon
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label={t('shadowing:library.filters.searchAria')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('shadowing:library.filters.searchPlaceholder')}
                  className="w-full h-9 pl-9 pr-8 py-1.5 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label={t('shadowing:library.filters.clearSearchAria')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-control hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors duration-150"
                  >
                    <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Bottom Sheet Trigger */}
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(true)}
                aria-expanded={isBottomSheetOpen}
                aria-haspopup="dialog"
                aria-label={t('shadowing:library.filters.filterAria')}
                className={`sm:hidden relative w-9 h-9 rounded-control border inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                  activeFilterChips.length > 0 || isBottomSheetOpen
                    ? 'bg-sky-50 border-sky-300 text-sky-800'
                    : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4" aria-hidden="true" />
                {activeFilterChips.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-badge bg-sky-700 text-white text-[11px] font-medium tabular-nums">
                    {activeFilterChips.length}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Active Filter Chips */}
            {activeFilterChips.length > 0 && (
              <div className="flex sm:hidden flex-wrap items-center gap-1.5">
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-control bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      aria-label={t('shadowing:library.filters.removeFilterAria', {
                        label: chip.label,
                      })}
                      className="w-4 h-4 rounded-badge hover:bg-sky-100 inline-flex items-center justify-center text-sky-800 cursor-pointer"
                    >
                      <XMarkIcon className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => handleApplyMobileFilters({ topic: '', level: '', mediaSource: '' })}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 px-1.5 py-0.5 cursor-pointer"
                >
                  {t('shadowing:library.filters.clearAll')}
                </button>
              </div>
            )}

            {/* Desktop Filter Row 2: Level Tabs */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-xs font-medium text-slate-500 mr-1 shrink-0">
                {t('shadowing:library.filters.levelLabel')}
              </span>
              {LEVEL_TABS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.value)}
                  className={`h-7 px-3 rounded-control text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                    selectedLevel === lvl.value
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {lvl.labelKey ? t(lvl.labelKey) : lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Main Video Card Grid / Empty State */}
          {error ? (
            <Card className="p-8 text-center text-red-600 bg-red-50 border border-red-200">
              <p className="text-sm font-semibold">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadVideos}
                className="mt-3 mx-auto"
              >
                {t('common:actions.retry')}
              </Button>
            </Card>
          ) : videos.length === 0 ? (
            <EmptyState
              title={t('shadowing:library.empty.title')}
              description={t('shadowing:library.empty.description')}
              actionLabel={
                canAddVideo ? t('shadowing:library.empty.actionLabel') : undefined
              }
              onAction={canAddVideo ? handleOpenAddVideo : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => {
                const studiedCount = Array.isArray(video.segments)
                  ? video.segments.filter((s, idx) => Boolean(statusMap[String(s.id ?? idx)])).length
                  : video.studied_segments_count || 0;
                return (
                  <ShadowingVideoCard
                    key={video.id}
                    video={video}
                    studiedSegmentsCount={studiedCount}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 6. Mobile Filter Bottom Sheet (< 640px) */}
      {isBottomSheetOpen && (
        <ShadowingFilterBottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          currentFilters={{
            topic: selectedTopic,
            level: selectedLevel,
            mediaSource: selectedSource,
          }}
          onApply={handleApplyMobileFilters}
        />
      )}

      {/* 7. Add Video Modal */}
      <AddVideoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(created) => {
          loadVideos();
          if (created?.id) {
            navigate(`/shadowing/${created.id}`);
          }
        }}
        currentUser={user}
      />
    </main>
  );
}

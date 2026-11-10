import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ChartBarIcon,
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
import { fetchShadowingVideos } from '../services/shadowingApi';
import { getShadowingStatusMap } from '../services/shadowingProgress';

const TOPIC_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'life', label: 'Đời sống' },
  { value: 'conversation', label: 'Hội thoại' },
  { value: 'business', label: 'Công việc' },
  { value: 'news', label: 'Tin tức' },
  { value: 'culture', label: 'Văn hóa' },
];

const LEVEL_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const SOURCE_LABELS = {
  youtube: 'YouTube',
  upload: 'File tải lên',
};

export default function ShadowingLibraryPage() {
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const loadVideos = useCallback(() => {
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
        setError(err.message || 'Không thể tải danh sách video Shadowing.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedTopic, selectedLevel, selectedSource, searchQuery]);

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
          setError(err.message || 'Không thể tải danh sách video Shadowing.');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedTopic, selectedLevel, selectedSource, searchQuery]);

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
    const matchedTopic = TOPIC_TABS.find((t) => t.value === selectedTopic);
    activeFilterChips.push({
      key: 'topic',
      label: matchedTopic?.label || selectedTopic,
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
      label: SOURCE_LABELS[selectedSource] || selectedSource,
      onRemove: () => setSelectedSource(''),
    });
  }

  return (
    <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-16 flex flex-col gap-4 sm:gap-5">
      {isLoading && videos.length === 0 ? (
        <Skeleton variant="shadowing" count={6} />
      ) : (
        <>
          {/* 1. "Tiếp tục Shadowing" Resume Hero Card (with integrated Add Video & Mobile Menu buttons) */}
          <ShadowingResumeHero
            currentUser={user}
            fallbackVideo={videos[0] || null}
            onOpenAddVideo={() => setIsAddModalOpen(true)}
            onOpenSidebar={openSidebar}
          />

          {/* 2. Three-Column Metric Stats Bar (synchronized with CoursesPage) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <Card rounded="xl" className="p-3 sm:p-4 flex flex-col gap-1.5 min-w-0">
              <VideoCameraIcon className="w-5 h-5 text-sky-700 shrink-0" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {totalVideos}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                Video
              </span>
            </Card>

            <Card rounded="xl" className="p-3 sm:p-4 flex flex-col gap-1.5 min-w-0">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {totalStudiedSegments}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                Câu đã luyện
              </span>
            </Card>

            <Card rounded="xl" className="p-3 sm:p-4 flex flex-col gap-1.5 min-w-0">
              <ChartBarIcon className="w-5 h-5 text-sky-700 shrink-0" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {overallCompletionRate}%
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                Hoàn thành
              </span>
            </Card>
          </div>

          {/* 3. Filter Toolbar */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Row 1: Desktop Topic Pills + Mobile/Desktop Search + Mobile Filter Trigger */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Desktop Topic filter tabs */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1 min-w-0">
                <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Chủ đề:</span>
                {TOPIC_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setSelectedTopic(tab.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${selectedTopic === tab.value
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box (flex-1 on mobile, fixed width on desktop) */}
              <div className="relative flex-1 sm:flex-none sm:w-64 min-w-0">
                <MagnifyingGlassIcon
                  className="w-4 h-4 text-slate-400 absolute left-3.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Tìm kiếm video Shadowing"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm video..."
                  className="w-full h-10 sm:h-9 pl-9 pr-8 py-1.5 rounded-xl sm:rounded-lg border border-slate-200 bg-white text-sm sm:text-xs text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-md bg-slate-200/70 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors duration-150"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Bottom Sheet Trigger */}
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(true)}
                aria-expanded={isBottomSheetOpen}
                aria-haspopup="dialog"
                aria-label="Bộ lọc"
                className="sm:hidden relative w-10 h-10 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" aria-hidden="true" />
                {activeFilterChips.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-sky-700 text-white text-[10px] font-bold">
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
                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      aria-label={`Xóa lọc ${chip.label}`}
                      className="w-4 h-4 rounded-full hover:bg-sky-200/70 inline-flex items-center justify-center text-sky-700 cursor-pointer"
                    >
                      <XMarkIcon className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => handleApplyMobileFilters({ topic: '', level: '', mediaSource: '' })}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-1.5 py-0.5 cursor-pointer"
                >
                  Xóa lọc
                </button>
              </div>
            )}

            {/* Desktop Filter Row 2: Level Pills */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Trình độ:</span>
              {LEVEL_TABS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${selectedLevel === lvl.value
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {lvl.label}
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
                Thử lại
              </Button>
            </Card>
          ) : videos.length === 0 ? (
            <EmptyState
              title="Không tìm thấy video Shadowing phù hợp"
              description="Hãy thử đổi bộ lọc chủ đề hoặc thêm bài học mới từ YouTube hoặc tệp âm thanh/video của bạn."
              actionLabel="Thêm Video mới"
              onAction={() => setIsAddModalOpen(true)}
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

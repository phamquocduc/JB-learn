import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
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

  return (
    <main className="w-full mx-auto px-3 sm:px-6 pt-3 pb-16 flex flex-col gap-5">
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
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card rounded="xl" className="p-3.5 sm:p-4 flex flex-col gap-1.5">
              <VideoCameraIcon className="w-5 h-5 text-sky-700" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {totalVideos}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Video
              </span>
            </Card>

            <Card rounded="xl" className="p-3.5 sm:p-4 flex flex-col gap-1.5">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {totalStudiedSegments}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Câu đã luyện
              </span>
            </Card>

            <Card rounded="xl" className="p-3.5 sm:p-4 flex flex-col gap-1.5">
              <ChartBarIcon className="w-5 h-5 text-sky-700" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {overallCompletionRate}%
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Hoàn thành
              </span>
            </Card>
          </div>

          {/* 3. Filter Toolbar */}
          <div className="flex flex-col gap-3">
            {/* Desktop Filter Row 1: Topic Pills & Mobile Filter Button */}
            <div className="flex items-center justify-between gap-3">
              {/* Topic filter tabs */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1">
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

              {/* Mobile Filter Button */}
              <div className="flex sm:hidden items-center justify-between w-full gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsBottomSheetOpen(true)}
                  className="flex-1 justify-center"
                >
                  <FunnelIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
                  <span>
                    Bộ lọc {selectedTopic || selectedLevel ? '(Đang bật)' : ''}
                  </span>
                </Button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64 shrink-0">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm video..."
                  className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-sky-600 bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

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
              {videos.map((video) => (
                <ShadowingVideoCard
                  key={video.id}
                  video={video}
                  studiedSegmentsCount={0}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 6. Mobile Filter Bottom Sheet (< 640px) */}
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

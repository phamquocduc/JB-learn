import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  RectangleStackIcon,
  SpeakerWaveIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import ProgressBar from './ui/ProgressBar';
import { useAuth } from '../context/useAuth';
import {
  CARD_TYPES,
  CARD_TYPE_LABELS,
  JLPT_LEVELS,
  STUDY_STATUSES,
  STUDY_STATUS_LABELS,
} from '../constants/cards';

const MODE_TABS = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', shortLabel: 'Thẻ nhớ', icon: RectangleStackIcon },
  { id: 'practice', label: 'Luyện nghe', shortLabel: 'Luyện nghe', icon: SpeakerWaveIcon },
  { id: 'table', label: 'Bảng tra cứu', shortLabel: 'Tra cứu', icon: TableCellsIcon },
];

export default function FilterBar({
  activeTab = 'flashcards',
  setActiveTab,
  onOpenCreateCard,
  onOpenSidebar,
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedLevel,
  setSelectedLevel,
  selectedCourse,
  setSelectedCourse,
  selectedLesson,
  setSelectedLesson,
  selectedStatus = '',
  setSelectedStatus,
  scope = 'all',
  setScope,
  courses = [],
  lessons = [],
  hideScopeToggle = false,
  currentCardNumber = 0,
  totalCount = 0,
  learnedCount = 0,
  rememberedCount = 0,
  masteredCount = 0,
  loadingProgress = false,
}) {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Draft state for the popup / bottom sheet "Bộ lọc nâng cao"
  const [draftType, setDraftType] = useState(selectedType);
  const [draftLevel, setDraftLevel] = useState(selectedLevel);
  const [draftCourse, setDraftCourse] = useState(selectedCourse);
  const [draftLesson, setDraftLesson] = useState(selectedLesson);
  const [draftStatus, setDraftStatus] = useState(selectedStatus);
  const [draftScope, setDraftScope] = useState(scope);

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterOpen]);

  const handleToggleFilterPanel = () => {
    if (!isFilterOpen) {
      setDraftType(selectedType);
      setDraftLevel(selectedLevel);
      setDraftCourse(selectedCourse);
      setDraftLesson(selectedLesson);
      setDraftStatus(selectedStatus);
      setDraftScope(scope);
    }
    setIsFilterOpen((prev) => !prev);
  };

  const handleResetDraft = () => {
    setDraftType('');
    setDraftLevel('');
    setDraftCourse('');
    setDraftLesson('');
    setDraftStatus('');
    setDraftScope('all');
  };

  const handleApplyFilters = () => {
    setSelectedType?.(draftType);
    setSelectedLevel?.(draftLevel);
    if (String(draftCourse) !== String(selectedCourse)) {
      setSelectedCourse?.(draftCourse);
    }
    setSelectedLesson?.(draftLesson);
    setSelectedStatus?.(draftStatus);
    if (!isGuest && !hideScopeToggle && setScope) {
      setScope(draftScope);
    }
    setIsFilterOpen(false);
  };

  const handleClearAll = () => {
    setSelectedType?.('');
    setSelectedLevel?.('');
    if (selectedCourse) {
      setSelectedCourse?.('');
    }
    setSelectedLesson?.('');
    setSelectedStatus?.('');
    if (!isGuest && !hideScopeToggle && scope !== 'all') {
      setScope?.('all');
    }
    handleResetDraft();
  };

  // Build active filter chips for quick inspection & 1-click removal
  const activeChips = [];

  if (selectedLevel) {
    activeChips.push({
      key: 'level',
      label: selectedLevel,
      onRemove: () => {
        setSelectedLevel?.('');
        setDraftLevel('');
      },
    });
  }

  if (selectedCourse) {
    const matchedCourse = courses.find(
      (c) => String(c.id) === String(selectedCourse)
    );
    activeChips.push({
      key: 'course',
      label: matchedCourse ? matchedCourse.title : `Khoá học #${selectedCourse}`,
      onRemove: () => {
        setSelectedCourse?.('');
        setDraftCourse('');
      },
    });
  }

  if (selectedType) {
    activeChips.push({
      key: 'type',
      label: CARD_TYPE_LABELS[selectedType] || selectedType,
      onRemove: () => {
        setSelectedType?.('');
        setDraftType('');
      },
    });
  }

  if (selectedLesson) {
    activeChips.push({
      key: 'lesson',
      label: selectedLesson,
      onRemove: () => {
        setSelectedLesson?.('');
        setDraftLesson('');
      },
    });
  }

  if (selectedStatus) {
    activeChips.push({
      key: 'status',
      label: STUDY_STATUS_LABELS[selectedStatus] || selectedStatus,
      onRemove: () => {
        setSelectedStatus?.('');
        setDraftStatus('');
      },
    });
  }

  if (!isGuest && !hideScopeToggle && scope === 'mine') {
    activeChips.push({
      key: 'scope',
      label: 'Bộ thẻ của tôi',
      onRemove: () => {
        setScope?.('all');
        setDraftScope('all');
      },
    });
  }

  const activeModeObj =
    MODE_TABS.find((t) => t.id === activeTab) || MODE_TABS[0];
  const ActiveModeIcon = activeModeObj.icon;

  return (
    <div className="relative">
      {/* Unified Filter & Progress Container */}
      <div className="bg-white sm:bg-slate-100/80 border border-slate-200 rounded-2xl sm:rounded-xl p-3 sm:p-2.5 flex flex-col gap-2.5 sm:gap-2 shadow-sm sm:shadow-none">
        {/* Mobile Header Row (Icon + Mode Title + Menu trigger) */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0">
              <ActiveModeIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-base font-bold text-slate-900">
              {activeModeObj.label}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {!isGuest && user && onOpenCreateCard && (
              <button
                type="button"
                onClick={onOpenCreateCard}
                aria-label="Thêm thẻ mới"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
              >
                <PlusIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label="Mở menu điều hướng"
                className="w-9 h-9 rounded-xl text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
              >
                <EllipsisHorizontalIcon className="w-6 h-6" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Row 1: Compact 3-Column Study Mode Tabs */}
        {setActiveTab && (
          <div
            className="hidden sm:grid grid-cols-3 gap-2"
            role="tablist"
            aria-label="Chế độ học"
          >
            {MODE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                    isActive
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Row 2: Search Input + Filter Trigger (+ Desktop Add Card) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <MagnifyingGlassIcon
              className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Tìm kiếm nội dung"
              placeholder="Tìm từ, ngữ pháp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 sm:h-9 pl-9 pr-8 py-1.5 rounded-xl sm:rounded-lg border border-slate-200 bg-slate-50/70 sm:bg-white text-slate-900 placeholder:text-slate-500 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2 w-6 h-6 inline-flex items-center justify-center rounded-md bg-slate-200/70 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors duration-150"
              >
                <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {!isGuest && user && onOpenCreateCard && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenCreateCard}
              className="hidden sm:inline-flex h-9 rounded-lg shrink-0"
            >
              <PlusIcon className="w-4 h-4" aria-hidden="true" />
              <span>Thêm thẻ</span>
            </Button>
          )}

          <button
            type="button"
            onClick={handleToggleFilterPanel}
            aria-expanded={isFilterOpen}
            aria-haspopup="dialog"
            aria-label="Bộ lọc"
            className="relative w-10 h-10 sm:w-auto sm:h-9 sm:px-3.5 rounded-xl sm:rounded-lg bg-sky-50 hover:bg-sky-100 sm:bg-sky-700 sm:hover:bg-sky-800 border border-sky-200 sm:border-transparent text-sky-700 sm:text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Bộ lọc</span>
            {activeChips.length > 0 && (
              <span className="absolute -top-1 -right-1 sm:static inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-sky-700 sm:bg-white/20 text-white text-[10px] sm:text-[11px] font-bold">
                {activeChips.length}
              </span>
            )}
            <ChevronDownIcon
              className={`hidden sm:inline w-3.5 h-3.5 transition-transform duration-150 ${
                isFilterOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Row 3: Reserved Badge Chip Space between Filter Bar and Progress Bar */}
        <div className="min-h-6 flex flex-wrap items-center gap-1.5 px-0.5">
          {activeChips.length > 0 ? (
            <>
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-medium"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Bỏ bộ lọc ${chip.label}`}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-sky-200/80 text-sky-800 cursor-pointer transition-colors duration-150"
                  >
                    <XMarkIcon className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-1.5 py-0.5 cursor-pointer transition-colors duration-150"
              >
                Xóa tất cả
              </button>
            </>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-medium">
              Tất cả khoá học
            </span>
          )}
        </div>

        {/* Row 4: Integrated Progress Bar (or 100% matching Skeleton while loading) */}
        {totalCount > 0 ? (
          <div className="sm:bg-white sm:border sm:border-slate-200/90 sm:rounded-lg sm:px-3 sm:py-2">
            <ProgressBar
              current={currentCardNumber}
              total={totalCount}
              learnedCount={learnedCount}
              rememberedCount={rememberedCount}
              masteredCount={masteredCount}
            />
          </div>
        ) : loadingProgress ? (
          <div
            className="sm:bg-white sm:border sm:border-slate-200/90 sm:rounded-lg sm:px-3 sm:py-2 flex flex-col gap-2"
            aria-hidden="true"
          >
            <div className="hidden sm:flex items-center justify-between">
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-56 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full animate-pulse" />
          </div>
        ) : null}
      </div>

      {/* Backdrop for Filter Bottom Sheet (Mobile) & Popover (Desktop) */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/35 sm:bg-slate-900/15 transition-opacity duration-300 ${
          isFilterOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsFilterOpen(false)}
        aria-hidden="true"
      />

      {/* Responsive Filter Panel:
          - Mobile (< 640px): Bottom Sheet sliding up from bottom of screen
          - Desktop (sm:): Floating Dropdown Popover anchored below filter bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white border-t border-slate-200 shadow-lg p-5 flex flex-col gap-4 transition-transform duration-300 ease-out sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[540px] sm:max-h-none sm:overflow-visible sm:rounded-2xl sm:border sm:origin-top-right sm:transition-all sm:duration-200 ${
          isFilterOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto sm:scale-100'
            : 'translate-y-full opacity-0 pointer-events-none sm:-translate-y-2 sm:scale-95'
        }`}
        role="dialog"
        aria-modal={isFilterOpen}
        aria-hidden={!isFilterOpen}
        aria-label="Bộ lọc nâng cao"
      >
        {/* Mobile Bottom Sheet Drag Handle */}
        <div
          className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-0.5 sm:hidden"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Bộ lọc nâng cao
          </h2>
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            aria-label="Đóng bộ lọc nâng cao"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors duration-150"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Loại thẻ */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="adv-filter-type"
              className="text-xs font-medium text-slate-600"
            >
              Loại thẻ
            </label>
            <select
              id="adv-filter-type"
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
              className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-900 text-sm font-medium cursor-pointer transition-colors duration-150 focus:bg-white focus:border-sky-700"
            >
              <option value="">Tất cả loại thẻ</option>
              {CARD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cấp độ */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="adv-filter-level"
              className="text-xs font-medium text-slate-600"
            >
              Cấp độ
            </label>
            <select
              id="adv-filter-level"
              value={draftLevel}
              onChange={(e) => setDraftLevel(e.target.value)}
              className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-900 text-sm font-medium cursor-pointer transition-colors duration-150 focus:bg-white focus:border-sky-700"
            >
              <option value="">Tất cả cấp độ</option>
              {JLPT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Bài học */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="adv-filter-lesson"
              className="text-xs font-medium text-slate-600"
            >
              Bài học
            </label>
            <select
              id="adv-filter-lesson"
              value={draftLesson}
              onChange={(e) => setDraftLesson(e.target.value)}
              className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-900 text-sm font-medium cursor-pointer transition-colors duration-150 focus:bg-white focus:border-sky-700"
            >
              <option value="">Tất cả bài học</option>
              {lessons.map((lesson) => (
                <option key={lesson} value={lesson}>
                  {lesson}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="adv-filter-status"
              className="text-xs font-medium text-slate-600"
            >
              Trạng thái
            </label>
            <select
              id="adv-filter-status"
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
              className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-900 text-sm font-medium cursor-pointer transition-colors duration-150 focus:bg-white focus:border-sky-700"
            >
              <option value="">Mọi trạng thái</option>
              <option value="unseen">Chưa học</option>
              {STUDY_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Khoá học (nếu có) */}
          {courses.length > 0 && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="adv-filter-course"
                className="text-xs font-medium text-slate-600"
              >
                Khoá học / Bộ thẻ
              </label>
              <select
                id="adv-filter-course"
                value={draftCourse}
                onChange={(e) => setDraftCourse(e.target.value)}
                className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-900 text-sm font-medium cursor-pointer transition-colors duration-150 focus:bg-white focus:border-sky-700"
              >
                <option value="">Tất cả khoá học</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nguồn thẻ (khi đã đăng nhập) */}
          {!isGuest && !hideScopeToggle && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="adv-filter-scope"
                className="text-xs font-medium text-slate-600"
              >
                Nguồn thẻ
              </label>
              <select
                id="adv-filter-scope"
                value={draftScope}
                onChange={(e) => setDraftScope(e.target.value)}
                className="w-full h-11 sm:h-10 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-900 text-sm font-medium cursor-pointer transition-colors duration-150 focus:bg-white focus:border-sky-700"
              >
                <option value="all">Tất cả công khai</option>
                <option value="mine">Bộ thẻ của tôi</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            variant="secondary"
            size="md"
            onClick={handleResetDraft}
            className="flex-1 sm:flex-initial rounded-xl px-4"
          >
            Đặt lại
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApplyFilters}
            className="flex-1 sm:flex-initial rounded-xl px-5"
          >
            Áp dụng
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (matches mobile layout screenshot) */}
      {setActiveTab && (
        <nav
          aria-label="Chế độ học trên di động"
          className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-4 gap-1"
        >
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'text-sky-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors duration-150"
          >
            <BookOpenIcon className="w-5 h-5" aria-hidden="true" />
            <span>Khoá học</span>
          </button>
        </nav>
      )}
    </div>
  );
}

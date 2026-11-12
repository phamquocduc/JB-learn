import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  HomeIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Dropdown from './ui/Dropdown';
import ProgressBar from './ui/ProgressBar';
import { useAuth } from '../context/useAuth';
import {
  getCardTypeLabel,
  getCardTypeOptions,
  getStudyStatusLabel,
  getStudyStatusOptions,
  JLPT_LEVELS,
} from '../constants/cards';

const MODE_TABS = [
  {
    id: 'flashcards',
    labelKey: 'study:modes.flashcard',
    shortLabelKey: 'study:modes.flashcardShort',
    icon: RectangleStackIcon,
  },
  {
    id: 'practice',
    labelKey: 'study:modes.practice',
    shortLabelKey: 'study:modes.practiceShort',
    icon: SpeakerWaveIcon,
  },
  {
    id: 'table',
    labelKey: 'study:modes.table',
    shortLabelKey: 'study:modes.tableShort',
    icon: TableCellsIcon,
  },
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
  dueCount = 0,
  loadingProgress = false,
}) {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { t } = useTranslation(['study', 'common']);

  // Draft state for advanced filter popover / mobile bottom sheet
  const [draftType, setDraftType] = useState(selectedType);
  const [draftLevel, setDraftLevel] = useState(selectedLevel);
  const [draftCourse, setDraftCourse] = useState(selectedCourse);
  const [draftLesson, setDraftLesson] = useState(selectedLesson);
  const [draftStatus, setDraftStatus] = useState(selectedStatus);
  const [draftScope, setDraftScope] = useState(scope);

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleKeyDown = (e) => {
      if (
        e.defaultPrevented ||
        document.querySelector('[data-dropdown-open="true"]')
      ) {
        return;
      }
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
      label: matchedCourse
        ? matchedCourse.title
        : t('study:filter.courseFallback', { id: selectedCourse }),
      onRemove: () => {
        setSelectedCourse?.('');
        setDraftCourse('');
      },
    });
  }

  if (selectedType) {
    activeChips.push({
      key: 'type',
      label: getCardTypeLabel(selectedType) || selectedType,
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
      label: getStudyStatusLabel(selectedStatus) || selectedStatus,
      onRemove: () => {
        setSelectedStatus?.('');
        setDraftStatus('');
      },
    });
  }

  if (!isGuest && !hideScopeToggle && scope === 'mine') {
    activeChips.push({
      key: 'scope',
      label: t('study:filter.myDeck'),
      onRemove: () => {
        setScope?.('all');
        setDraftScope('all');
      },
    });
  }

  const activeModeObj =
    MODE_TABS.find((mode) => mode.id === activeTab) || MODE_TABS[0];

  return (
    <div className="relative">
      {/* Unified Filter & Progress Container (Flat UI, matches classic layout) */}
      <div className="bg-white sm:bg-slate-100/80 border border-slate-200 rounded-surface p-3 sm:p-2.5 flex flex-col gap-2.5 sm:gap-2">
        {/* Mobile Header Row (Mode Title + Action triggers) */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">
            {t(activeModeObj.labelKey)}
          </h1>

          <div className="flex items-center gap-1.5">
            {!isGuest && user && onOpenCreateCard && (
              <button
                type="button"
                onClick={onOpenCreateCard}
                aria-label={t('study:filter.addCardAria')}
                className="w-9 h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
              >
                <PlusIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label={t('common:nav.openMenu')}
                className="w-9 h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Row 1: Compact 3-Column Study Mode Tabs */}
        {setActiveTab && (
          <div
            className="hidden sm:grid grid-cols-3 gap-2"
            role="tablist"
            aria-label={t('study:filter.modeNavAria')}
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
                  className={`inline-flex items-center justify-center gap-2 h-9 px-3 rounded-control border text-xs sm:text-sm font-semibold cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                    isActive
                      ? 'bg-sky-700 border-sky-700 text-white'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Row 2: Search Input + Filter Trigger (+ Desktop Add Card) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <MagnifyingGlassIcon
              className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label={t('study:filter.searchAria')}
              placeholder={t('study:filter.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 py-1.5 rounded-control border border-slate-200 bg-slate-50/70 sm:bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:bg-white focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('common:actions.clearSearch')}
                className="absolute right-1.5 w-6 h-6 inline-flex items-center justify-center rounded-control hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors duration-150"
              >
                <XMarkIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {!isGuest && user && onOpenCreateCard && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenCreateCard}
              className="hidden sm:inline-flex h-9 shrink-0"
            >
              <PlusIcon className="w-4 h-4" aria-hidden="true" />
              <span>{t('study:filter.addCardButton')}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={handleToggleFilterPanel}
            aria-expanded={isFilterOpen}
            aria-haspopup="dialog"
            aria-label={t('study:filter.filterAria')}
            className="relative w-9 h-9 sm:w-auto sm:h-9 sm:px-3.5 rounded-control border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700 sm:bg-sky-700 sm:hover:bg-sky-800 sm:border-sky-700 sm:text-white"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('study:filter.filterButton')}</span>
            {activeChips.length > 0 && (
              <span className="absolute -top-1 -right-1 sm:static inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-badge bg-sky-700 sm:bg-white/20 text-white text-[11px] font-semibold tabular-nums">
                {activeChips.length}
              </span>
            )}
            <ChevronDownIcon
              className={`hidden sm:inline w-4 h-4 transition-transform duration-150 ${
                isFilterOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Row 3: Reserved Badge / Filter Chip Space */}
        <div className="min-h-6 flex flex-wrap items-center gap-1.5 px-0.5">
          {activeChips.length > 0 ? (
            <>
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-badge bg-sky-100 text-sky-800 border border-sky-200 text-xs font-medium"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={t('study:filter.removeChipAria', { label: chip.label })}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-badge hover:bg-sky-200/80 text-sky-800 cursor-pointer transition-colors duration-150"
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
                {t('study:filter.clearAll')}
              </button>
            </>
          ) : (
            <span className="inline-flex items-center h-6 px-2.5 rounded-badge bg-sky-100 text-sky-800 border border-sky-200 text-xs font-medium">
              {t('study:filter.allCoursesBadge')}
            </span>
          )}

          {dueCount > 0 && selectedStatus !== 'due' && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatus?.('due');
                setDraftStatus('due');
              }}
              aria-label={t('study:filter.dueChipAria', { count: dueCount })}
              className="inline-flex items-center gap-1 h-6 px-2.5 rounded-badge bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold tabular-nums cursor-pointer transition-colors duration-150"
            >
              <span>{t('study:filter.dueChipLabel', { count: dueCount })}</span>
            </button>
          )}
        </div>

        {/* Row 4: Integrated Progress Bar (or 100% matching Skeleton while loading) */}
        {totalCount > 0 ? (
          <div className="sm:bg-white sm:border sm:border-slate-200 sm:rounded-control sm:px-3 sm:py-2">
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
            className="sm:bg-white sm:border sm:border-slate-200 sm:rounded-control sm:px-3 sm:py-2 flex flex-col gap-2"
            aria-hidden="true"
          >
            <div className="hidden sm:flex items-center justify-between">
              <div className="h-4 w-36 bg-slate-100 rounded-control animate-pulse" />
              <div className="h-4 w-56 bg-slate-100 rounded-control animate-pulse" />
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
        className={`fixed inset-x-0 bottom-0 z-50 w-full max-h-[85vh] overflow-y-auto rounded-t-surface bg-white border-t border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col gap-4 transition-transform duration-300 ease-out sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-[520px] sm:max-h-none sm:overflow-visible sm:rounded-surface sm:border sm:origin-top-right sm:transition-all sm:duration-150 ${
          isFilterOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto sm:scale-100'
            : 'translate-y-full opacity-0 pointer-events-none sm:-translate-y-1 sm:scale-95'
        }`}
        role="dialog"
        aria-modal={isFilterOpen}
        aria-hidden={!isFilterOpen}
        aria-label={t('study:filter.advancedTitle')}
      >
        {/* Mobile Bottom Sheet Drag Handle */}
        <div
          className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">
            {t('study:filter.advancedTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            aria-label={t('study:filter.closeSheetAria')}
            className="w-8 h-8 inline-flex items-center justify-center rounded-control text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors duration-150"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Loại thẻ */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="adv-filter-type"
              className="text-xs font-medium text-slate-700"
            >
              {t('study:filter.typeLabel')}
            </label>
            <Dropdown
              id="adv-filter-type"
              value={draftType}
              onChange={setDraftType}
              options={[
                { value: '', label: t('study:filter.allTypes') },
                ...getCardTypeOptions(),
              ]}
            />
          </div>

          {/* Cấp độ */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="adv-filter-level"
              className="text-xs font-medium text-slate-700"
            >
              {t('study:filter.levelLabel')}
            </label>
            <Dropdown
              id="adv-filter-level"
              value={draftLevel}
              onChange={setDraftLevel}
              options={[
                { value: '', label: t('study:filter.allLevels') },
                ...JLPT_LEVELS.map((lvl) => ({ value: lvl, label: lvl })),
              ]}
            />
          </div>

          {/* Bài học */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="adv-filter-lesson"
              className="text-xs font-medium text-slate-700"
            >
              {t('study:filter.lessonLabel')}
            </label>
            <Dropdown
              id="adv-filter-lesson"
              value={draftLesson}
              onChange={setDraftLesson}
              options={[
                { value: '', label: t('study:filter.allLessons') },
                ...lessons.map((lesson) => ({ value: lesson, label: lesson })),
              ]}
            />
          </div>

          {/* Trạng thái */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="adv-filter-status"
              className="text-xs font-medium text-slate-700"
            >
              {t('study:filter.statusLabel')}
            </label>
            <Dropdown
              id="adv-filter-status"
              value={draftStatus}
              onChange={setDraftStatus}
              options={[
                { value: '', label: t('study:filter.allStatuses') },
                { value: 'due', label: t('study:filter.dueStatus') },
                { value: 'again', label: t('study:filter.relearnStatus') },
                { value: 'unseen', label: t('study:filter.unseenStatus') },
                ...getStudyStatusOptions(),
              ]}
            />
          </div>

          {/* Khoá học */}
          {courses.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="adv-filter-course"
                className="text-xs font-medium text-slate-700"
              >
                {t('study:filter.courseLabel')}
              </label>
              <Dropdown
                id="adv-filter-course"
                value={draftCourse}
                onChange={setDraftCourse}
                options={[
                  { value: '', label: t('study:filter.allCourses') },
                  ...courses.map((c) => ({
                    value: String(c.id),
                    label: c.title,
                  })),
                ]}
              />
            </div>
          )}

          {/* Nguồn thẻ */}
          {!isGuest && !hideScopeToggle && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="adv-filter-scope"
                className="text-xs font-medium text-slate-700"
              >
                {t('study:filter.sourceLabel')}
              </label>
              <Dropdown
                id="adv-filter-scope"
                value={draftScope}
                onChange={setDraftScope}
                options={[
                  { value: 'all', label: t('study:filter.allPublic') },
                  { value: 'mine', label: t('study:filter.myDeck') },
                ]}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <Button
            variant="secondary"
            size="md"
            onClick={handleResetDraft}
            className="flex-1 sm:flex-initial px-4"
          >
            {t('study:filter.reset')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApplyFilters}
            className="flex-1 sm:flex-initial px-5"
          >
            {t('study:filter.apply')}
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {setActiveTab && (
        <nav
          aria-label={t('study:filter.mobileModeNavAria')}
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
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-control text-xs font-medium cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'text-sky-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{t(tab.shortLabelKey)}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-control text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors duration-150"
          >
            <HomeIcon className="w-5 h-5" aria-hidden="true" />
            <span>{t('study:filter.mobileCourses')}</span>
          </button>
        </nav>
      )}
    </div>
  );
}

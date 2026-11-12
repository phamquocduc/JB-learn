import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';

const TOPIC_OPTIONS = [
  { value: '', labelKey: 'shadowing:topics.allTopics' },
  { value: 'life', labelKey: 'shadowing:topics.life' },
  { value: 'conversation', labelKey: 'shadowing:topics.conversation' },
  { value: 'business', labelKey: 'shadowing:topics.business' },
  { value: 'news', labelKey: 'shadowing:topics.news' },
  { value: 'culture', labelKey: 'shadowing:topics.culture' },
];

const LEVEL_OPTIONS = [
  { value: '', labelKey: 'shadowing:levels.allLevels' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const SOURCE_OPTIONS = [
  { value: '', labelKey: 'shadowing:sources.all' },
  { value: 'youtube', labelKey: 'shadowing:sources.youtube' },
  { value: 'upload', labelKey: 'shadowing:sources.upload' },
];

export default function ShadowingFilterBottomSheet({
  isOpen,
  onClose,
  currentFilters = {},
  onApply,
}) {
  const { t } = useTranslation('shadowing');
  const [topic, setTopic] = useState(currentFilters.topic || '');
  const [level, setLevel] = useState(currentFilters.level || '');
  const [mediaSource, setMediaSource] = useState(currentFilters.mediaSource || '');
  const touchStartY = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 60) {
      touchStartY.current = null;
      onClose?.();
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const handleReset = () => {
    setTopic('');
    setLevel('');
    setMediaSource('');
    onApply?.({ topic: '', level: '', mediaSource: '' });
    onClose?.();
  };

  const handleApply = () => {
    onApply?.({ topic, level, mediaSource });
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('filterSheet.dialogAria')}
      className="fixed inset-0 z-50 flex flex-col justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto bg-white rounded-t-surface border-t border-slate-200 px-4 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom duration-150"
      >
        {/* Drag-to-close Handle + Header */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex flex-col gap-2.5"
        >
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto shrink-0" />

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              {t('filterSheet.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('filterSheet.closeAria')}
              className="w-8 h-8 inline-flex items-center justify-center rounded-control text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filter Section: Topic */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-700">
            {t('filterSheet.topicLabel')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={topic === opt.value}
                onClick={() => setTopic(opt.value)}
                className={`h-8 px-3 rounded-control text-xs font-medium border transition-colors cursor-pointer ${
                  topic === opt.value
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section: JLPT Level */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-700">
            {t('filterSheet.levelLabel')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={level === opt.value}
                onClick={() => setLevel(opt.value)}
                className={`h-8 px-3 rounded-control text-xs font-medium border transition-colors cursor-pointer ${
                  level === opt.value
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.labelKey ? t(opt.labelKey) : opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section: Source */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-700">
            {t('filterSheet.sourceLabel')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={mediaSource === opt.value}
                onClick={() => setMediaSource(opt.value)}
                className={`h-8 px-3 rounded-control text-xs font-medium border transition-colors cursor-pointer ${
                  mediaSource === opt.value
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 justify-center"
            onClick={handleReset}
          >
            {t('filterSheet.reset')}
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 justify-center"
            onClick={handleApply}
          >
            {t('filterSheet.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}

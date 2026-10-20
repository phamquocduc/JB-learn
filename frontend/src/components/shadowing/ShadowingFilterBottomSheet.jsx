import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';

const TOPIC_OPTIONS = [
  { value: '', label: 'Tất cả chủ đề' },
  { value: 'life', label: 'Đời sống' },
  { value: 'conversation', label: 'Hội thoại' },
  { value: 'business', label: 'Công việc' },
  { value: 'news', label: 'Tin tức' },
  { value: 'culture', label: 'Văn hóa' },
];

const LEVEL_OPTIONS = [
  { value: '', label: 'Tất cả trình độ' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'upload', label: 'File tải lên' },
];

export default function ShadowingFilterBottomSheet({
  isOpen,
  onClose,
  currentFilters = {},
  onApply,
}) {
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
      aria-label="Bộ lọc Shadowing"
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl border-t border-slate-200 p-5 shadow-lg flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-sky-700" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              Bộ lọc
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Filter Section: Topic */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Chủ đề
          </span>
          <div className="flex flex-wrap gap-2">
            {TOPIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTopic(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  topic === opt.value
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section: JLPT Level */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Trình độ JLPT
          </span>
          <div className="flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLevel(opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  level === opt.value
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Section: Source */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Nguồn
          </span>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMediaSource(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  mediaSource === opt.value
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 justify-center"
            onClick={handleReset}
          >
            Đặt lại
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 justify-center"
            onClick={handleApply}
          >
            Áp dụng
          </Button>
        </div>
      </div>
    </div>
  );
}

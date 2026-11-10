import React, { useState, useEffect, useRef } from 'react';
import {
  PlayIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import Card from '../../ui/Card';
import RubyText from '../../ui/RubyText';
import { BilingualIconSvg } from '../../ui/SvgIcons';

/**
 * TranscriptPanel
 * Right synchronized "Phụ đề" transcript panel:
 * - Header with title, export transcript, bilingual toggle (AB), and close button
 * - Scrollable list of segments with active highlight (bg-sky-50 border-sky-200)
 * - Auto-scrolls active segment into view
 * - Click-to-seek interaction via onSeek
 */
export default function TranscriptPanel({
  segments = [],
  activeSegmentIndex = 0,
  onSeek,
  onClose,
  showFurigana = true,
  isOpen = true,
  videoTitle = 'transcript',
}) {
  const [isBilingual, setIsBilingual] = useState(true);
  const listRef = useRef(null);
  const activeItemRef = useRef(null);

  // Auto-scroll active segment inside the transcript container only (never hijack window scroll on mobile)
  useEffect(() => {
    const container = listRef.current;
    const item = activeItemRef.current;
    if (!container || !item) return;

    const itemTop = item.offsetTop - container.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (itemTop < viewTop || itemBottom > viewBottom) {
      const targetTop = Math.max(
        0,
        itemTop - container.clientHeight / 2 + item.offsetHeight / 2
      );
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [activeSegmentIndex]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (!segments || segments.length === 0) return;
    const content = segments
      .map((s, idx) => {
        const time = `[${s.start.toFixed(2)}s -> ${s.end.toFixed(2)}s]`;
        const jp = s.text;
        const vi = s.meaning ? `\n   ${s.meaning}` : '';
        return `${idx + 1}. ${time} ${jp}${vi}`;
      })
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoTitle.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_')}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      rounded="2xl"
      className="flex flex-col h-full max-h-[320px] sm:max-h-[420px] lg:max-h-[calc(100vh-140px)] bg-white border border-slate-200 overflow-hidden shadow-sm"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
            Phụ đề ({segments.length})
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Export Transcript */}
          <button
            type="button"
            onClick={handleExport}
            title="Tải phụ đề (.txt)"
            aria-label="Tải xuống phụ đề"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Bilingual Toggle (AB) */}
          <button
            type="button"
            onClick={() => setIsBilingual((prev) => !prev)}
            title={isBilingual ? 'Tắt bản dịch song ngữ' : 'Bật bản dịch song ngữ'}
            aria-label="Bật tắt song ngữ"
            aria-pressed={isBilingual}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isBilingual
                ? 'bg-sky-50 text-sky-700'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BilingualIconSvg className="w-4 h-4" />
          </button>

          {/* Close Panel */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng phụ đề"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Segment List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-2.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2"
      >
        {segments.map((seg, idx) => {
          const isActive = idx === activeSegmentIndex;
          return (
            <button
              key={seg.id || idx}
              type="button"
              ref={isActive ? activeItemRef : null}
              onClick={() => onSeek?.(seg.start)}
              className={`w-full p-2.5 sm:p-3 rounded-xl border transition-colors duration-150 cursor-pointer flex items-start gap-2.5 sm:gap-3 text-left ${
                isActive
                  ? 'bg-sky-50 border-sky-200 shadow-xs'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              {/* Play Icon Indicator */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <PlayIcon className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
              </div>

              {/* Japanese & Vietnamese text */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div
                  className={`text-sm font-jp break-words ${
                    showFurigana && seg.ruby_text ? 'leading-loose' : 'leading-relaxed'
                  } ${
                    isActive ? 'font-bold text-sky-950' : 'text-slate-900 font-medium'
                  }`}
                >
                  {showFurigana && seg.ruby_text ? (
                    <RubyText text={seg.ruby_text} />
                  ) : (
                    seg.text
                  )}
                </div>

                {/* Vietnamese Meaning */}
                {isBilingual && seg.meaning && (
                  <p className="text-xs text-slate-500 leading-snug break-words">
                    {seg.meaning}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

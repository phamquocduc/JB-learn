import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import Card from '../../ui/Card';
import RubyText from '../../ui/RubyText';
import { BilingualIconSvg } from '../../ui/SvgIcons';
import { formatNumber } from '../../../utils/formatters';

/**
 * TranscriptPanel
 * Right synchronized transcript panel:
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
  const { t } = useTranslation('shadowing');
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
    <Card className="flex flex-col h-full max-h-[320px] sm:max-h-[420px] lg:max-h-[calc(100vh-140px)] overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight truncate tabular-nums">
            {t('transcriptPanel.title', { count: formatNumber(segments.length) })}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Export Transcript */}
          <button
            type="button"
            onClick={handleExport}
            title={t('transcriptPanel.exportTitle')}
            aria-label={t('transcriptPanel.exportAria')}
            className="w-8 h-8 inline-flex items-center justify-center rounded-control text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Bilingual Toggle (AB) */}
          <button
            type="button"
            onClick={() => setIsBilingual((prev) => !prev)}
            title={
              isBilingual
                ? t('transcriptPanel.disableBilingual')
                : t('transcriptPanel.enableBilingual')
            }
            aria-label={t('transcriptPanel.toggleBilingualAria')}
            aria-pressed={isBilingual}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-control transition-colors cursor-pointer ${
              isBilingual
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
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
              aria-label={t('transcriptPanel.closeAria')}
              className="w-8 h-8 inline-flex items-center justify-center rounded-control text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Segment List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-2.5 sm:p-3 flex flex-col gap-1.5"
      >
        {segments.map((seg, idx) => {
          const isActive = idx === activeSegmentIndex;
          return (
            <button
              key={seg.id || idx}
              type="button"
              ref={isActive ? activeItemRef : null}
              onClick={() => onSeek?.(seg.start)}
              className={`w-full p-2.5 sm:p-3 rounded-control border transition-colors duration-150 cursor-pointer flex items-start gap-2.5 text-left ${
                isActive
                  ? 'bg-sky-50 border-sky-200'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              {/* Play Icon Indicator */}
              <div
                className={`w-7 h-7 rounded-control flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isActive
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <PlayIcon className="w-4 h-4" aria-hidden="true" />
              </div>

              {/* Japanese & Vietnamese text */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div
                  className={`text-sm font-jp break-words ${
                    showFurigana && seg.ruby_text ? 'leading-loose' : 'leading-relaxed'
                  } ${
                    isActive ? 'font-semibold text-sky-950' : 'text-slate-900 font-medium'
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

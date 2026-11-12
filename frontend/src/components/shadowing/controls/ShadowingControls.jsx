import { useTranslation } from 'react-i18next';
import {
  HeartIcon,
  ArrowPathIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';

/**
 * ShadowingControls
 * Bottom subtitle & playback control bar:
 * - Left pill toggles: Subtitles, Translation, Furigana
 * - Right controls: Favorite, Single sentence loop, Speed (0.75x, 1x, 1.25x), Transcript panel toggle
 */
export default function ShadowingControls({
  showSubtitle = true,
  onToggleSubtitle,
  showTranslation = true,
  onToggleTranslation,
  showFurigana = true,
  onToggleFurigana,
  isLooping = false,
  onToggleLoop,
  playbackSpeed = 1,
  onSpeedChange,
  isFavorite = false,
  onToggleFavorite,
  isTranscriptOpen = true,
  onToggleTranscript,
  SUPPORTED_SPEEDS = [0.75, 1, 1.25],
}) {
  const { t } = useTranslation('shadowing');

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 p-2.5 bg-white border border-slate-200 rounded-surface">
      {/* Row 1 on mobile / Left group on desktop: Display Toggles */}
      <div className="grid grid-cols-3 sm:flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSubtitle}
          aria-pressed={showSubtitle}
          className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-control text-xs font-medium inline-flex items-center justify-center transition-colors duration-150 cursor-pointer border ${
            showSubtitle
              ? 'bg-sky-50 text-sky-800 border-sky-300'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {t('controls.subtitle')}
        </button>

        <button
          type="button"
          onClick={onToggleTranslation}
          aria-pressed={showTranslation}
          className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-control text-xs font-medium inline-flex items-center justify-center transition-colors duration-150 cursor-pointer border ${
            showTranslation
              ? 'bg-sky-50 text-sky-800 border-sky-300'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {t('controls.translation')}
        </button>

        <button
          type="button"
          onClick={onToggleFurigana}
          aria-pressed={showFurigana}
          className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-control text-xs font-medium inline-flex items-center justify-center transition-colors duration-150 cursor-pointer border ${
            showFurigana
              ? 'bg-sky-50 text-sky-800 border-sky-300'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {t('controls.furigana')}
        </button>
      </div>

      {/* Row 2 on mobile / Right group on desktop: Speed & Utility Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:ml-auto">
        {/* Speed Selector */}
        <div
          role="group"
          aria-label={t('controls.speedGroupAria')}
          className="flex items-center h-8 sm:h-9 rounded-control border border-slate-200 bg-slate-100 p-0.5"
        >
          {SUPPORTED_SPEEDS.map((spd) => {
            const isSelected = playbackSpeed === spd;
            return (
              <button
                key={spd}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSpeedChange?.(spd)}
                className={`h-7 px-2.5 rounded-control text-xs font-medium tabular-nums transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Single-Sentence Loop */}
          <button
            type="button"
            onClick={onToggleLoop}
            title={t('controls.loopSentenceAria')}
            aria-label={t('controls.loopSentenceAria')}
            aria-pressed={isLooping}
            className={`h-8 sm:h-9 min-w-8 sm:min-w-9 px-2.5 inline-flex items-center justify-center gap-1 rounded-control border text-xs font-medium transition-colors duration-150 cursor-pointer ${
              isLooping
                ? 'bg-sky-700 text-white border-sky-700'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ArrowPathIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">{t('controls.loopSentenceShort')}</span>
          </button>

          {/* Favorite */}
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? t('controls.unfavoriteAria') : t('controls.favoriteAria')}
            aria-pressed={isFavorite}
            className={`w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-control border transition-colors duration-150 cursor-pointer ${
              isFavorite
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isFavorite ? (
              <HeartIcon className="w-4 h-4 text-red-500 fill-current" aria-hidden="true" />
            ) : (
              <HeartIcon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Transcript Panel Toggle */}
          <button
            type="button"
            onClick={onToggleTranscript}
            title={isTranscriptOpen ? t('controls.hideTranscript') : t('controls.showTranscript')}
            aria-label={t('controls.toggleTranscriptAria')}
            aria-pressed={isTranscriptOpen}
            className={`w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-control border transition-colors duration-150 cursor-pointer ${
              isTranscriptOpen
                ? 'bg-sky-50 text-sky-800 border-sky-300'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <QueueListIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

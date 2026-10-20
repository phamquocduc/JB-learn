import {
  HeartIcon,
  ArrowPathIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';

/**
 * ShadowingControls
 * Bottom subtitle & playback control bar:
 * - Left pill toggles: Phụ đề, Bản dịch, Furigana
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
      {/* Left Pill Toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={onToggleSubtitle}
          aria-pressed={showSubtitle}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
            showSubtitle
              ? 'bg-sky-50 text-sky-700 border-sky-300'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Phụ đề
        </button>

        <button
          type="button"
          onClick={onToggleTranslation}
          aria-pressed={showTranslation}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
            showTranslation
              ? 'bg-sky-50 text-sky-700 border-sky-300'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Bản dịch
        </button>

        <button
          type="button"
          onClick={onToggleFurigana}
          aria-pressed={showFurigana}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
            showFurigana
              ? 'bg-sky-50 text-sky-700 border-sky-300'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Furigana
        </button>
      </div>

      {/* Right Utility & Speed Controls */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Favorite */}
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích bài này'}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            isFavorite
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {isFavorite ? (
            <HeartIcon className="w-4 h-4 text-red-500 fill-current" aria-hidden="true" />
          ) : (
            <HeartIcon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Single-Sentence Loop */}
        <button
          type="button"
          onClick={onToggleLoop}
          title="Lặp lại câu hiện tại"
          aria-label="Lặp lại câu hiện tại"
          aria-pressed={isLooping}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
            isLooping
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Lặp câu</span>
        </button>

        {/* Speed Selector */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          {SUPPORTED_SPEEDS.map((spd) => {
            const isSelected = playbackSpeed === spd;
            return (
              <button
                key={spd}
                type="button"
                onClick={() => onSpeedChange?.(spd)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            );
          })}
        </div>

        {/* Transcript Panel Toggle */}
        <button
          type="button"
          onClick={onToggleTranscript}
          title={isTranscriptOpen ? 'Ẩn bảng phụ đề' : 'Hiện bảng phụ đề'}
          aria-label="Đóng mở bảng phụ đề"
          aria-pressed={isTranscriptOpen}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            isTranscriptOpen
              ? 'bg-sky-50 text-sky-700 border-sky-300'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <QueueListIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

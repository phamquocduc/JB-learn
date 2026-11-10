import React, { useState } from 'react';
import Card from '../../ui/Card';
import RubyText from '../../ui/RubyText';
import WordTokenPopover from '../WordTokenPopover';
import ShadowingControls from '../controls/ShadowingControls';

/**
 * ShadowingModeStage
 * The primary stage for Shadowing mode matching the reference mockup:
 * - 16:9 Video Player (YouTube or HTML5)
 * - Centered Tokenized Japanese Subtitle Box (bg-slate-800 text-white)
 * - Underlined, clickable word tokens opening WordTokenPopover
 * - Bold Vietnamese translation underneath
 * - Bottom control bar with Phụ đề, Bản dịch, Furigana toggles and speed/loop controls
 */
export default function ShadowingModeStage({
  video,
  player,
  setMediaRef,
  showSubtitle = true,
  onToggleSubtitle,
  showTranslation = true,
  onToggleTranslation,
  showFurigana = true,
  onToggleFurigana,
  isFavorite = false,
  onToggleFavorite,
  isTranscriptOpen = true,
  onToggleTranscript,
  currentUser = null,
}) {
  const [selectedToken, setSelectedToken] = useState(null);

  const activeSegment = player?.activeSegment;

  const handleTokenClick = (tokenObj) => {
    setSelectedToken(tokenObj);
  };

  // Determine tokens to render: prefer segment.words, else derive from text
  const tokens = React.useMemo(() => {
    if (!activeSegment) return [];
    if (Array.isArray(activeSegment.words) && activeSegment.words.length > 0) {
      return activeSegment.words;
    }
    // Fallback: tokenize by Japanese words/particles
    const raw = activeSegment.text || '';
    const parts = raw.split(/(\s+|[、。！？]+)/).filter(Boolean);
    return parts.map((part) => ({
      token: part,
      text: part,
      reading: part,
      meaning: '',
      level: video?.level || 'N3',
    }));
  }, [activeSegment, video]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. 16:9 Video/Audio Player Stage */}
      <Card
        rounded="2xl"
        className="overflow-hidden bg-slate-950 aspect-video w-full relative flex items-center justify-center border border-slate-900 shadow-sm"
      >
        {player.isYouTube ? (
          <div
            id={player.youtubeContainerId}
            className="w-full h-full"
          />
        ) : (
          <video
            ref={setMediaRef}
            src={video.media_file_url || video.media_file}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        )}
      </Card>

      {/* 2. Centered Tokenized Japanese Subtitle Box (stable min-height prevents layout jump) */}
      {showSubtitle && (
        <div className="min-h-[76px] sm:min-h-[88px] flex flex-col items-center justify-center gap-1.5 px-0.5 sm:px-2">
          <div className="bg-slate-800 text-white rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3 text-center max-w-3xl w-full shadow-sm">
            {activeSegment ? (
              <div
                className={`text-base sm:text-lg md:text-xl font-jp ${
                  showFurigana ? 'leading-loose' : 'leading-relaxed'
                } flex flex-wrap items-center justify-center gap-x-1.5 sm:gap-x-2 gap-y-1`}
              >
                {tokens.map((tokenObj, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTokenClick(tokenObj)}
                    className="inline-block px-1 py-0.5 rounded underline decoration-slate-400 underline-offset-4 cursor-pointer hover:bg-slate-700 active:bg-slate-700 hover:text-sky-300 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-sky-400"
                    title="Bấm để tra từ & lưu vào bộ thẻ"
                  >
                    {showFurigana && tokenObj.ruby ? (
                      <RubyText text={tokenObj.ruby} />
                    ) : showFurigana &&
                      tokenObj.reading &&
                      tokenObj.reading !== tokenObj.token ? (
                      <RubyText text={tokenObj.token} reading={tokenObj.reading} />
                    ) : (
                      tokenObj.token || tokenObj.text
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-300 py-1">
                Bấm phát video để hiển thị phụ đề tương ứng
              </p>
            )}
          </div>

          {/* Bold Vietnamese Translation underneath */}
          {showTranslation && activeSegment?.meaning && (
            <p className="text-xs sm:text-base font-bold text-slate-900 text-center max-w-2xl leading-snug px-1">
              {activeSegment.meaning}
            </p>
          )}
        </div>
      )}

      {/* 3. Bottom Subtitle & Playback Controls */}
      <ShadowingControls
        showSubtitle={showSubtitle}
        onToggleSubtitle={onToggleSubtitle}
        showTranslation={showTranslation}
        onToggleTranslation={onToggleTranslation}
        showFurigana={showFurigana}
        onToggleFurigana={onToggleFurigana}
        isLooping={player.isLooping}
        onToggleLoop={player.toggleLoop}
        playbackSpeed={player.playbackSpeed}
        onSpeedChange={player.setSpeed}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        isTranscriptOpen={isTranscriptOpen}
        onToggleTranscript={onToggleTranscript}
        SUPPORTED_SPEEDS={player.SUPPORTED_SPEEDS}
      />

      {/* Word Token Dictionary Popover */}
      {selectedToken && (
        <WordTokenPopover
          tokenData={selectedToken}
          onClose={() => setSelectedToken(null)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

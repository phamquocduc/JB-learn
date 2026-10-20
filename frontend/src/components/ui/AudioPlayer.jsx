import React, { useState, useEffect, useCallback } from 'react';
import {
  SpeakerWaveIcon,
  PauseIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const SPEEDS = [0.75, 1, 1.25];

function cleanSpeechText(raw = '') {
  return raw
    .replace(/^[~〜]+/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/[（(][ぁ-んァ-ンー・]+[）)]/g, '')
    .trim();
}

export default function AudioPlayer({
  text = '',
  compact = false,
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rateIndex, setRateIndex] = useState(1); // default 1x
  const rate = SPEEDS[rateIndex];

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported, text]);

  const speak = useCallback(
    (customRate = rate) => {
      if (!isSupported || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const cleaned = cleanSpeechText(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'ja-JP';
      utterance.rate = customRate;

      const voices = synth.getVoices();
      const jpVoice = voices.find((v) => v.lang && v.lang.startsWith('ja'));
      if (jpVoice) {
        utterance.voice = jpVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      synth.speak(utterance);
    },
    [isSupported, text, rate]
  );

  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (!isSupported) return;
    const synth = window.speechSynthesis;
    if (isPlaying) {
      synth.cancel();
      setIsPlaying(false);
    } else {
      speak(rate);
    }
  };

  const handleReplay = (e) => {
    e.stopPropagation();
    speak(rate);
  };

  const handleCycleSpeed = (e) => {
    e.stopPropagation();
    const nextIdx = (rateIndex + 1) % SPEEDS.length;
    setRateIndex(nextIdx);
    if (isPlaying) {
      speak(SPEEDS[nextIdx]);
    }
  };

  if (!isSupported || !text) return null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-label={isPlaying ? 'Dừng phát âm' : `Nghe phát âm ${text}`}
        className={`inline-flex items-center gap-1 min-h-8 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
          isPlaying
            ? 'bg-sky-700 text-white border-sky-700'
            : 'bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border-slate-200'
        } ${className}`}
      >
        {isPlaying ? (
          <PauseIcon className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <SpeakerWaveIcon className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>{isPlaying ? 'Đang phát' : 'Nghe'}</span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 ${className}`}
    >
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-label={isPlaying ? 'Tạm dừng' : 'Phát âm tiếng Nhật'}
        className={`inline-flex items-center gap-1.5 min-h-8 px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
          isPlaying
            ? 'bg-sky-700 text-white'
            : 'bg-white hover:bg-sky-50 text-slate-800 border border-slate-200'
        }`}
      >
        {isPlaying ? (
          <PauseIcon className="w-4 h-4" aria-hidden="true" />
        ) : (
          <SpeakerWaveIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
        )}
        <span>{isPlaying ? 'Dừng' : 'Nghe phát âm'}</span>
      </button>

      <button
        type="button"
        onClick={handleReplay}
        aria-label="Phát lại từ đầu"
        className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors duration-150 cursor-pointer"
      >
        <ArrowPathIcon className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label={`Tốc độ đọc hiện tại ${rate}x. Bấm để đổi tốc độ.`}
        className="min-h-8 px-2 py-1 rounded-md hover:bg-slate-200/70 text-xs font-semibold text-slate-700 transition-colors duration-150 cursor-pointer"
      >
        {rate}x
      </button>
    </div>
  );
}

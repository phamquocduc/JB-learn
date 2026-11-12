import React, { useState, useEffect, useCallback } from 'react';
import {
  SpeakerWaveIcon,
  PauseIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('common');
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
        aria-label={
          isPlaying ? t('audio.stopCompactAria') : t('audio.listenTextAria', { text })
        }
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-control border text-xs font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
          isPlaying
            ? 'bg-sky-700 text-white border-sky-700'
            : 'bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border-slate-300 hover:border-sky-300'
        } ${className}`}
      >
        {isPlaying ? (
          <PauseIcon className="w-4 h-4" aria-hidden="true" />
        ) : (
          <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
        )}
        <span>{isPlaying ? t('audio.playingCompact') : t('audio.playCompact')}</span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-surface p-1 ${className}`}
    >
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-label={isPlaying ? t('audio.pause') : t('audio.playJapaneseAria')}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
          isPlaying
            ? 'bg-sky-700 text-white border border-sky-700'
            : 'bg-white hover:bg-sky-50 text-slate-800 border border-slate-300 hover:border-sky-300'
        }`}
      >
        {isPlaying ? (
          <PauseIcon className="w-4 h-4" aria-hidden="true" />
        ) : (
          <SpeakerWaveIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
        )}
        <span>{isPlaying ? t('audio.stopButton') : t('audio.playButton')}</span>
      </button>

      <button
        type="button"
        onClick={handleReplay}
        aria-label={t('audio.replay')}
        className="w-8 h-8 inline-flex items-center justify-center rounded-control hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors duration-150 cursor-pointer"
      >
        <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label={t('audio.speedAria', { rate })}
        className="h-8 px-2 rounded-control hover:bg-slate-200/70 text-xs font-medium text-slate-700 tabular-nums transition-colors duration-150 cursor-pointer"
      >
        {rate}x
      </button>
    </div>
  );
}

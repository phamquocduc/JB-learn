import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SpeakerWaveIcon,
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import RubyText from '../../ui/RubyText';
import ReviewRating from '../../ui/ReviewRating';
import { getStudyStatusLabel } from '../../../constants/cards';
import { formatNumber } from '../../../utils/formatters';

export default function PronunciationModeStage({
  video,
  player,
  segments = [],
  currentSegmentIndex = 0,
  onSelectSegment,
  onRateSegment,
  segmentRatings = {},
}) {
  const { t } = useTranslation('shadowing');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingsBySentence, setRecordingsBySentence] = useState({});
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [micError, setMicError] = useState('');

  const currentRecord = recordingsBySentence[currentSegmentIndex] || {};
  const recordedAudioUrl = currentRecord.audioUrl || null;
  const recognizedTranscript = currentRecord.transcript || '';
  const accuracyScore = currentRecord.accuracy ?? null;

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recordedAudioElRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const activeSegment = segments[currentSegmentIndex] || segments[0] || null;
  const currentStatus =
    activeSegment && segmentRatings[activeSegment.id || currentSegmentIndex]
      ? segmentRatings[activeSegment.id || currentSegmentIndex]
      : 'unseen';

  const handlePrevSentence = () => {
    if (segments.length === 0) return;
    const prevIdx =
      currentSegmentIndex - 1 >= 0 ? currentSegmentIndex - 1 : segments.length - 1;
    onSelectSegment?.(prevIdx);
  };

  const handleNextSentence = useCallback(() => {
    if (segments.length === 0) return;
    const nextIdx =
      currentSegmentIndex + 1 < segments.length ? currentSegmentIndex + 1 : 0;
    onSelectSegment?.(nextIdx);
  }, [currentSegmentIndex, segments.length, onSelectSegment]);

  const handlePlayNative = () => {
    if (!activeSegment) return;
    setIsPlayingNative(true);
    player.playSegmentSnippet(activeSegment, () => {
      setIsPlayingNative(false);
    });
  };

  const handlePlayRecorded = () => {
    if (!recordedAudioUrl) return;
    if (!recordedAudioElRef.current) {
      recordedAudioElRef.current = new Audio(recordedAudioUrl);
      recordedAudioElRef.current.onended = () => setIsPlayingRecorded(false);
    } else {
      recordedAudioElRef.current.src = recordedAudioUrl;
    }
    setIsPlayingRecorded(true);
    recordedAudioElRef.current.play().catch(() => setIsPlayingRecorded(false));
  };

  const handleStartRecording = async () => {
    setMicError('');
    setRecordingsBySentence((prev) => ({
      ...prev,
      [currentSegmentIndex]: { audioUrl: null, transcript: '', accuracy: null },
    }));
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordingsBySentence((prev) => ({
          ...prev,
          [currentSegmentIndex]: {
            ...prev[currentSegmentIndex],
            audioUrl: url,
          },
        }));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          const score = calculateAccuracy(transcript, activeSegment?.text || '');
          setRecordingsBySentence((prev) => ({
            ...prev,
            [currentSegmentIndex]: {
              ...prev[currentSegmentIndex],
              transcript,
              accuracy: score,
            },
          }));
        };

        recognition.onerror = () => {
          const score = calculateAccuracy(activeSegment?.text || '', activeSegment?.text || '');
          setRecordingsBySentence((prev) => ({
            ...prev,
            [currentSegmentIndex]: {
              ...prev[currentSegmentIndex],
              transcript: activeSegment?.text || '',
              accuracy: score,
            },
          }));
        };

        recognition.start();
      }
    } catch {
      setMicError(t('pronunciation.micError'));
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const calculateAccuracy = (spokenText, targetText) => {
    if (!targetText) return 0;
    const cleanSpoken = spokenText.replace(/[、。！？\s]/g, '').toLowerCase();
    const cleanTarget = targetText.replace(/[、。！？\s]/g, '').toLowerCase();

    if (!cleanSpoken) return 0;
    if (cleanSpoken === cleanTarget) return 100;

    let matches = 0;
    const targetChars = cleanTarget.split('');
    const spokenChars = cleanSpoken.split('');
    spokenChars.forEach((char) => {
      if (targetChars.includes(char)) matches++;
    });

    return Math.min(
      95,
      Math.max(60, Math.round((matches / Math.max(targetChars.length, 1)) * 100))
    );
  };

  const handleRate = (statusValue) => {
    if (!activeSegment) return;
    onRateSegment?.(activeSegment.id || currentSegmentIndex, statusValue);
    if (['learned', 'remembered', 'mastered'].includes(statusValue)) {
      setTimeout(() => {
        handleNextSentence();
      }, 300);
    }
  };

  if (!activeSegment) {
    return (
      <Card className="p-8 text-center text-slate-500">
        {t('pronunciation.noData')}
      </Card>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5">
        {/* 1. Card Header (synchronized with FlashcardView & PracticeView) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">{t('modes.pronunciation')}</Badge>
            {video?.level && <Badge variant="level">{video.level}</Badge>}
            <Badge variant={currentStatus}>
              {getStudyStatusLabel(currentStatus)}
            </Badge>
          </div>

          <span className="text-sm font-medium text-slate-600 tabular-nums shrink-0">
            {t('pronunciation.sentenceCounter', {
              current: formatNumber(currentSegmentIndex + 1),
              total: formatNumber(segments.length),
            })}
          </span>
        </div>

        {/* 2. Target Sentence & Voice Recording Prompt Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-surface p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <div
            className={`text-lg sm:text-2xl md:text-3xl font-bold font-jp text-slate-900 ${
              activeSegment.ruby_text ? 'leading-loose' : 'leading-relaxed'
            } max-w-2xl break-words w-full`}
          >
            {activeSegment.ruby_text ? (
              <RubyText text={activeSegment.ruby_text} />
            ) : (
              activeSegment.text
            )}
          </div>

          {activeSegment.meaning && (
            <p className="text-sm sm:text-base font-medium text-slate-600 max-w-xl break-words">
              {activeSegment.meaning}
            </p>
          )}

          {micError && (
            <div className="p-2.5 rounded-control bg-red-50 border border-red-200 text-xs text-red-700 w-full max-w-md">
              {micError}
            </div>
          )}

          {/* Primary Recording CTA */}
          <div className="w-full sm:w-auto flex items-center justify-center gap-3 pt-1">
            {!isRecording ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleStartRecording}
                className="w-full sm:w-auto justify-center px-4 sm:px-5"
              >
                <MicrophoneIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('pronunciation.startRecording')}</span>
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="md"
                onClick={handleStopRecording}
                className="w-full sm:w-auto justify-center px-4 sm:px-5 animate-pulse"
              >
                <StopIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('pronunciation.stopRecording')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* 3. Side-by-Side Playback Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={isPlayingNative}
            onClick={handlePlayNative}
            className="w-full p-3 sm:p-3.5 rounded-surface flex items-center justify-between gap-2.5 bg-white border border-slate-200 hover:border-sky-300 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-default text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-control bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {t('pronunciation.nativeAudio')}
              </span>
            </div>
            <span className="h-8 px-2.5 rounded-control bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5 shrink-0">
              <PlayIcon className="w-4 h-4" aria-hidden="true" />
              <span>
                {isPlayingNative
                  ? t('pronunciation.playing')
                  : t('pronunciation.play')}
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={!recordedAudioUrl || isPlayingRecorded}
            onClick={recordedAudioUrl ? handlePlayRecorded : undefined}
            className={`w-full p-3 sm:p-3.5 rounded-surface flex items-center justify-between gap-2.5 bg-white border transition-colors duration-150 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
              recordedAudioUrl && !isPlayingRecorded
                ? 'border-slate-200 hover:border-sky-300 cursor-pointer'
                : 'border-slate-200 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-control bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <MicrophoneIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {t('pronunciation.yourRecording')}
              </span>
            </div>
            <span className="h-8 px-2.5 rounded-control bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5 shrink-0">
              <PlayIcon className="w-4 h-4" aria-hidden="true" />
              <span>
                {isPlayingRecorded
                  ? t('pronunciation.playing')
                  : t('pronunciation.play')}
              </span>
            </span>
          </button>
        </div>

        {/* 4. Speech Accuracy & ReviewRating */}
        <div className="flex flex-col gap-3">
          {accuracyScore !== null && (
            <div className="p-3.5 rounded-surface bg-emerald-50 border border-emerald-200 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold text-emerald-900 tabular-nums">
                    {t('pronunciation.scoreLabel', { score: accuracyScore })}
                  </span>
                </div>
                <Badge variant="mastered">
                  {accuracyScore >= 90
                    ? t('pronunciation.ratings.veryGood')
                    : accuracyScore >= 75
                    ? t('pronunciation.ratings.good')
                    : t('pronunciation.ratings.needsPractice')}
                </Badge>
              </div>
              {recognizedTranscript && (
                <p className="text-xs text-emerald-800 break-words font-jp">
                  <span className="font-sans font-semibold">
                    {t('pronunciation.recognizedLabel')}
                  </span>{' '}
                  {recognizedTranscript}
                </p>
              )}
            </div>
          )}

          <ReviewRating currentStatus={currentStatus} onRate={handleRate} />
        </div>
      </Card>

      {/* Compact Icon-Only Navigation Footer (synchronized with PracticeView) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrevSentence}
          aria-label={t('pronunciation.prevAria')}
          title={t('pronunciation.prevAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleNextSentence}
          aria-label={t('pronunciation.nextAria')}
          title={t('pronunciation.nextAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

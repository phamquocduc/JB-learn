import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { STUDY_STATUS_LABELS } from '../../../constants/cards';

export default function PronunciationModeStage({
  video,
  player,
  segments = [],
  currentSegmentIndex = 0,
  onSelectSegment,
  onRateSegment,
  segmentRatings = {},
}) {
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
        streamRef.current.getTracks().forEach((t) => t.stop());
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
      setMicError(
        'Không thể truy cập microphone. Vui lòng cho phép quyền ghi âm trong trình duyệt.'
      );
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
        Không có dữ liệu câu phụ đề cho video này.
      </Card>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card
        rounded="2xl"
        className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6"
      >
        {/* 1. Card Header (synchronized with FlashcardView & PracticeView) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">Phát âm</Badge>
            {video?.level && <Badge variant="level">{video.level}</Badge>}
            <Badge variant={currentStatus}>
              {STUDY_STATUS_LABELS[currentStatus] || 'Chưa học'}
            </Badge>
          </div>

          <span className="text-sm font-semibold text-slate-600">
            Câu {currentSegmentIndex + 1} / {segments.length}
          </span>
        </div>

        {/* 2. Target Sentence & Voice Recording Prompt Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <div className="text-2xl sm:text-3xl font-bold font-jp text-slate-900 leading-relaxed max-w-2xl">
            {activeSegment.ruby_text ? (
              <RubyText text={activeSegment.ruby_text} />
            ) : (
              activeSegment.text
            )}
          </div>

          {activeSegment.meaning && (
            <p className="text-sm sm:text-base font-medium text-slate-600 max-w-xl">
              {activeSegment.meaning}
            </p>
          )}

          {micError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 w-full max-w-md">
              {micError}
            </div>
          )}

          {/* Primary Recording CTA */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {!isRecording ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleStartRecording}
                className="font-bold px-5"
              >
                <MicrophoneIcon className="w-4 h-4" aria-hidden="true" />
                <span>Bắt đầu thu âm giọng đọc</span>
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="md"
                onClick={handleStopRecording}
                className="font-bold px-5 animate-pulse"
              >
                <StopIcon className="w-4 h-4" aria-hidden="true" />
                <span>Dừng thu âm & chấm điểm</span>
              </Button>
            )}
          </div>
        </div>

        {/* 3. Side-by-Side Playback Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={handlePlayNative}
            className="p-3.5 rounded-xl flex items-center justify-between gap-3 bg-white border border-slate-200 hover:border-sky-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                Phát âm mẫu
              </span>
            </div>
            <Button variant="secondary" size="sm" disabled={isPlayingNative}>
              <PlayIcon className="w-4 h-4" aria-hidden="true" />
              <span>{isPlayingNative ? 'Đang phát...' : 'Nghe'}</span>
            </Button>
          </div>

          <div
            onClick={recordedAudioUrl ? handlePlayRecorded : undefined}
            className={`p-3.5 rounded-xl flex items-center justify-between gap-3 bg-white border transition-colors ${
              recordedAudioUrl
                ? 'border-slate-200 hover:border-sky-300 cursor-pointer'
                : 'border-slate-100 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <MicrophoneIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                Bản thu của bạn
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!recordedAudioUrl || isPlayingRecorded}
            >
              <PlayIcon className="w-4 h-4" aria-hidden="true" />
              <span>{isPlayingRecorded ? 'Đang phát...' : 'Nghe'}</span>
            </Button>
          </div>
        </div>

        {/* 4. Speech Accuracy & ReviewRating */}
        <div className="flex flex-col gap-3">
          {accuracyScore !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-bold text-emerald-900">
                    Điểm phát âm: {accuracyScore}%
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {accuracyScore >= 90
                    ? 'Rất chuẩn!'
                    : accuracyScore >= 75
                    ? 'Khá tốt'
                    : 'Cần luyện thêm'}
                </span>
              </div>
              {recognizedTranscript && (
                <p className="text-xs text-emerald-800">
                  <span className="font-semibold">Nhận diện:</span> {recognizedTranscript}
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
          aria-label="Câu trước"
          title="Câu trước"
          className="h-9 sm:h-10 sm:w-12 rounded-xl"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleNextSentence}
          aria-label="Câu tiếp theo"
          title="Câu tiếp theo"
          className="h-9 sm:h-10 sm:w-12 rounded-xl"
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  SpeakerWaveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import AnswerOption from '../../ui/AnswerOption';
import RubyText from '../../ui/RubyText';

const DISTRACTOR_FALLBACKS = [
  '大切', '習慣', '節約', '将来', '理由', '普通', '経験', '特別',
  '気持ち', '仕事', '方法', '目標', '生活', '時間', '毎日', '勉強'
];

export default function ListeningModeStage({
  video,
  player,
  segments = [],
  currentSegmentIndex = 0,
  onSelectSegment,
}) {
  const [answeredState, setAnsweredState] = useState({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const activeSegment = segments[currentSegmentIndex] || segments[0] || null;

  const currentAnswer = answeredState[currentSegmentIndex];
  const selectedOptionIndex = currentAnswer?.selectedOptionIndex ?? null;
  const isAnswered = currentAnswer?.isAnswered ?? false;

  const clozeData = useMemo(() => {
    if (!activeSegment) return null;

    let target = '';
    if (Array.isArray(activeSegment.words) && activeSegment.words.length > 0) {
      const meaningful = activeSegment.words.filter(
        (w) => (w.token || w.text || '').length >= 2
      );
      target = meaningful[0]?.token || meaningful[0]?.text || activeSegment.words[0].token;
    }

    if (!target) {
      const match = activeSegment.text.match(/[\u4e00-\u9faf]{2,}/);
      target = match ? match[0] : 'お金';
    }

    const distractors = [];
    segments.forEach((s) => {
      if (s.words && Array.isArray(s.words)) {
        s.words.forEach((w) => {
          const t = w.token || w.text;
          if (t && t !== target && t.length >= 2 && !distractors.includes(t)) {
            distractors.push(t);
          }
        });
      }
    });

    DISTRACTOR_FALLBACKS.forEach((d) => {
      if (d !== target && !distractors.includes(d)) {
        distractors.push(d);
      }
    });

    const chosenDistractors = distractors.slice(0, 3);
    const rawOptions = [target, ...chosenDistractors];
    const shift = (currentSegmentIndex + (activeSegment?.id || 1)) % rawOptions.length;
    const options = [...rawOptions.slice(shift), ...rawOptions.slice(0, shift)];
    const correctIndex = options.indexOf(target);
    const blankedSentence = activeSegment.text.replace(target, '[ ______ ]');

    return {
      target,
      blankedSentence,
      options,
      correctIndex,
    };
  }, [activeSegment, segments, currentSegmentIndex]);

  const handleSelectOption = (index) => {
    if (isAnswered) return;
    setAnsweredState((prev) => ({
      ...prev,
      [currentSegmentIndex]: { selectedOptionIndex: index, isAnswered: true },
    }));
  };

  const handlePlayAudio = () => {
    if (!activeSegment) return;
    setIsPlayingAudio(true);
    player.playSegmentSnippet(activeSegment, () => {
      setIsPlayingAudio(false);
    });
  };

  const handlePrevSentence = () => {
    if (segments.length === 0) return;
    const prevIdx =
      currentSegmentIndex - 1 >= 0 ? currentSegmentIndex - 1 : segments.length - 1;
    onSelectSegment?.(prevIdx);
  };

  const handleNextSentence = () => {
    if (segments.length === 0) return;
    const nextIdx =
      currentSegmentIndex + 1 < segments.length ? currentSegmentIndex + 1 : 0;
    onSelectSegment?.(nextIdx);
  };

  if (!activeSegment || !clozeData) {
    return (
      <Card className="p-8 text-center text-slate-500">
        Không có dữ liệu bài luyện nghe cho video này.
      </Card>
    );
  }

  const isCorrect = isAnswered && selectedOptionIndex === clozeData.correctIndex;

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card
        rounded="2xl"
        className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6"
      >
        {/* 1. Card Header (synchronized with PracticeView) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">Luyện nghe</Badge>
            {video?.level && <Badge variant="level">{video.level}</Badge>}
          </div>

          <span className="text-sm font-semibold text-slate-600">
            Câu {currentSegmentIndex + 1} / {segments.length}
          </span>
        </div>

        {/* 2. Prompt & Listening Section (synchronized with PracticeView) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <div className="text-xl sm:text-2xl font-bold font-jp text-slate-900 leading-relaxed max-w-2xl">
            {clozeData.blankedSentence}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handlePlayAudio}
            disabled={isPlayingAudio}
            className="font-bold px-5"
          >
            <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
            <span>{isPlayingAudio ? 'Đang phát âm thanh...' : 'Nghe âm thanh'}</span>
          </Button>
        </div>

        {/* 3. Options (vertical list synchronized with PracticeView) */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {clozeData.options.map((opt, idx) => {
            let state = 'idle';
            if (isAnswered) {
              if (idx === clozeData.correctIndex) {
                state = 'correct';
              } else if (idx === selectedOptionIndex) {
                state = 'incorrect';
              }
            } else if (idx === selectedOptionIndex) {
              state = 'selected';
            }

            return (
              <AnswerOption
                key={idx}
                index={idx}
                label={opt}
                state={state}
                disabled={isAnswered}
                onSelect={() => handleSelectOption(idx)}
              />
            );
          })}
        </div>

        {/* 4. Feedback / Explanation Box */}
        {isAnswered && (
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
            <div
              className={`p-4 rounded-xl border flex flex-col gap-1.5 text-left ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Chính xác! Từ cần điền là "{clozeData.target}".</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                    <span>Chưa chính xác. Đáp án đúng là "{clozeData.target}".</span>
                  </>
                )}
              </div>

              <div className="text-sm font-jp text-slate-800 pt-1">
                <span className="font-semibold text-slate-600">Câu hoàn chỉnh: </span>
                {activeSegment.ruby_text ? (
                  <RubyText text={activeSegment.ruby_text} />
                ) : (
                  activeSegment.text
                )}
              </div>
              {activeSegment.meaning && (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold">Dịch nghĩa:</span> {activeSegment.meaning}
                </p>
              )}
            </div>
          </div>
        )}
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

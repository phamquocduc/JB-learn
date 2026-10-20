import React, { useState } from 'react';
import {
  SpeakerWaveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import AnswerOption from '../../ui/AnswerOption';

export default function ExerciseModeStage({
  video,
  player,
  exercises = [],
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);

  const questionList = React.useMemo(() => {
    if (Array.isArray(exercises) && exercises.length > 0) {
      return exercises;
    }
    if (Array.isArray(video?.exercises) && video.exercises.length > 0) {
      return video.exercises;
    }
    const segs = video?.segments || [];
    return [
      {
        id: 1,
        question: 'Chủ đề chính được thảo luận trong đoạn video này là gì?',
        options: [
          'Cách quản lý và sử dụng tiền bạc hợp lý',
          'Phương pháp học ngoại ngữ nhanh chóng',
          'Du lịch vòng quanh nước Nhật',
          'Kỹ năng nấu ăn các món truyền thống',
        ],
        correct_index: 0,
        explanation: 'Video chia sẻ về góc nhìn và tư duy quản lý tài chính cá nhân.',
        context_timestamp: segs[0]?.start ?? 0,
      },
      {
        id: 2,
        question: 'Người nói nhấn mạnh điều gì đối với việc chi tiêu hàng ngày?',
        options: [
          'Chi tiêu tùy hứng theo cảm xúc',
          'Phân biệt rõ giữa lãng phí và đầu tư cho bản thân',
          'Tuyệt đối không mua bất kỳ món đồ nào',
          'Chỉ vay mượn từ bạn bè',
        ],
        correct_index: 1,
        explanation: 'Người nói khuyên nên suy nghĩ kỹ trước khi mua để tránh lãng phí (無駄遣い).',
        context_timestamp: segs[4]?.start ?? 10,
      },
    ];
  }, [exercises, video]);

  const currentQuestion = questionList[currentQuestionIndex] || questionList[0];
  const hasAnsweredCurrent = selectedAnswers[currentQuestionIndex] !== undefined;
  const currentSelection = selectedAnswers[currentQuestionIndex];
  const isCurrentCorrect =
    hasAnsweredCurrent && currentSelection === currentQuestion?.correct_index;

  const handleSelectOption = (optIndex) => {
    if (hasAnsweredCurrent) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optIndex,
    }));
  };

  const handleSeekContext = () => {
    const timestamp =
      currentQuestion?.context_timestamp ??
      currentQuestion?.start ??
      0;
    player?.seekTo?.(timestamp, true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questionList.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
  };

  const correctCount = Object.entries(selectedAnswers).filter(
    ([qIdx, selectedIdx]) =>
      selectedIdx === questionList[Number(qIdx)]?.correct_index
  ).length;
  const totalQuestions = questionList.length;
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  if (isFinished) {
    return (
      <div className="flex-1 w-full flex flex-col justify-between gap-3">
        <Card
          rounded="2xl"
          className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-8 flex flex-col items-center justify-center text-center gap-5"
        >
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center">
            <TrophyIcon className="w-8 h-8" aria-hidden="true" />
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Hoàn thành bài tập
          </h2>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl w-full max-w-md">
            <div className="text-3xl font-black text-sky-700">
              {correctCount} / {totalQuestions} ({scorePercent}%)
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleRestart}
          >
            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
            <span>Làm lại bài tập</span>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card
        rounded="2xl"
        className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6"
      >
        {/* 1. Card Header (synchronized with PracticeView) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">Bài tập</Badge>
            {video?.level && <Badge variant="level">{video.level}</Badge>}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSeekContext}
              className="text-xs text-sky-700"
            >
              <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              <span>Nghe đoạn hội thoại</span>
            </Button>
          </div>

          <span className="text-sm font-semibold text-slate-600">
            Câu {currentQuestionIndex + 1} / {questionList.length}
          </span>
        </div>

        {/* 2. Question Prompt Box (synchronized with PracticeView) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed whitespace-pre-line">
            {currentQuestion.question}
          </h3>
        </div>

        {/* 3. Multiple Choice Options via AnswerOption.jsx */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {currentQuestion.options.map((opt, idx) => {
            let state = 'idle';
            if (hasAnsweredCurrent) {
              if (idx === currentQuestion.correct_index) {
                state = 'correct';
              } else if (idx === currentSelection) {
                state = 'incorrect';
              }
            } else if (idx === currentSelection) {
              state = 'selected';
            }

            return (
              <AnswerOption
                key={idx}
                index={idx}
                label={opt}
                state={state}
                disabled={hasAnsweredCurrent}
                onSelect={() => handleSelectOption(idx)}
              />
            );
          })}
        </div>

        {/* 4. Instant Explanation Reveal Card */}
        {hasAnsweredCurrent && currentQuestion.explanation && (
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
            <div
              className={`p-4 rounded-xl border flex flex-col gap-1.5 text-left ${
                isCurrentCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCurrentCorrect ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Chính xác!</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                    <span>Chưa đúng!</span>
                  </>
                )}
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                <span className="font-bold">Giải thích: </span>
                {currentQuestion.explanation}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Compact Icon-Only Navigation Footer (synchronized with PracticeView) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          aria-label="Câu trước"
          title="Câu trước"
          className="h-9 sm:h-10 sm:w-12 rounded-xl"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleNext}
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

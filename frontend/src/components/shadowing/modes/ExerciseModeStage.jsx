import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatNumber } from '../../../utils/formatters';

export default function ExerciseModeStage({
  video,
  player,
  exercises = [],
}) {
  const { t } = useTranslation('shadowing');
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
    const defaults = t('exercise.defaultQuestions', { returnObjects: true });
    if (!Array.isArray(defaults)) return [];
    return defaults.map((q, idx) => ({
      ...q,
      context_timestamp:
        (idx === 0 ? segs[0]?.start : segs[4]?.start) ?? q.fallbackStart ?? 0,
    }));
  }, [exercises, video, t]);

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

  const handleToggleContextAudio = () => {
    if (player?.isPlaying) {
      player.pause?.();
      return;
    }
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
        <Card className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-12 h-12 rounded-surface bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
            <TrophyIcon className="w-5 h-5" aria-hidden="true" />
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            {t('exercise.completedTitle')}
          </h2>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-surface w-full max-w-md">
            <div className="text-2xl sm:text-3xl font-bold text-sky-700 tabular-nums">
              {formatNumber(correctCount)} / {formatNumber(totalQuestions)} ({scorePercent}%)
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleRestart}
          >
            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
            <span>{t('exercise.retryButton')}</span>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5">
        {/* 1. Card Header (synchronized with PracticeView) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">{t('modes.exercise')}</Badge>
            {video?.level && <Badge variant="level">{video.level}</Badge>}
          </div>

          <span className="text-sm font-medium text-slate-600 tabular-nums shrink-0">
            {t('exercise.questionCounter', {
              current: formatNumber(currentQuestionIndex + 1),
              total: formatNumber(questionList.length),
            })}
          </span>
        </div>

        {/* 2. Question Prompt Box (synchronized with PracticeView) */}
        <div className="bg-slate-50 border border-slate-200 rounded-surface p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed whitespace-pre-line break-words w-full max-w-2xl">
            {currentQuestion.question}
          </h3>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleContextAudio}
            className="w-full sm:w-auto justify-center"
          >
            <SpeakerWaveIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {player?.isPlaying
                ? t('exercise.pauseDialogue')
                : t('exercise.listenDialogue')}
            </span>
          </Button>
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
          <div className="flex flex-col gap-3">
            <div
              className={`p-3.5 sm:p-4 rounded-surface border flex flex-col gap-1.5 text-left ${
                isCurrentCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {isCurrentCorrect ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>{t('exercise.correctBadge')}</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                    <span>{t('exercise.incorrectBadge')}</span>
                  </>
                )}
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed break-words">
                <span className="font-semibold">{t('exercise.explanationLabel')}</span>
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
          aria-label={t('exercise.prevAria')}
          title={t('exercise.prevAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleNext}
          aria-label={t('exercise.nextAria')}
          title={t('exercise.nextAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

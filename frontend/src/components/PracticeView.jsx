import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import RubyText from './ui/RubyText';
import AudioPlayer from './ui/AudioPlayer';
import AnswerOption from './ui/AnswerOption';
import GrammarExample from './ui/GrammarExample';
import ReviewRating from './ui/ReviewRating';
import EmptyState from './ui/EmptyState';
import {
  getCardTypeLabel,
  getStudyStatusLabel,
  getEffectiveCardStatus,
  parseExamples,
} from '../constants/cards';
import {
  isCardDue,
  isValidStudyRating,
  precomputeNextStudyPlan,
  resolveStudyTransition,
} from '../services/ankiScheduler';

export default function PracticeView({
  cards = [],
  currentIndex = 0,
  onIndexChange,
  statusMap = {},
  srsMap = {},
  onStatusChange,
  initialReturnCardId = null,
}) {
  const { t } = useTranslation(['study', 'common']);
  const [selectedAnswerByCard, setSelectedAnswerByCard] = useState({});
  const [returnState, setReturnState] = useState(() => ({
    baseProp: initialReturnCardId,
    value: initialReturnCardId,
  }));
  const [skippedDueIds, setSkippedDueIds] = useState([]);
  const pendingNextCardIdRef = useRef(null);
  const returnCardIdRef = useRef(initialReturnCardId);
  const skippedDueIdsRef = useRef([]);
  const srsMapRef = useRef(srsMap);

  const effectiveReturnCardId =
    returnState.baseProp === initialReturnCardId
      ? returnState.value
      : initialReturnCardId;

  const setReturnCardId = (nextVal) => {
    setReturnState({ baseProp: initialReturnCardId, value: nextVal });
  };

  useEffect(() => {
    srsMapRef.current = srsMap;
  }, [srsMap]);

  useEffect(() => {
    returnCardIdRef.current = effectiveReturnCardId;
  }, [effectiveReturnCardId]);
  const activeIndex =
    cards.length === 0 ? 0 : Math.min(currentIndex, cards.length - 1);
  const currentCard = cards[activeIndex] || cards[0] || null;
  const currentCardId = currentCard?.id ?? null;

  // Pre-compute the next study card plan in advance whenever deck, SRS state, or current position updates
  const precomputedPlan = useMemo(
    () =>
      precomputeNextStudyPlan(
        cards,
        srsMap,
        activeIndex,
        currentCardId,
        {
          returnCardId: effectiveReturnCardId,
          excludedDueCardIds: skippedDueIds,
        }
      ),
    [cards, srsMap, activeIndex, currentCardId, effectiveReturnCardId, skippedDueIds]
  );
  const precomputedPlanRef = useRef(precomputedPlan);
  useEffect(() => {
    precomputedPlanRef.current = precomputedPlan;
  }, [precomputedPlan]);

  // Keep index aligned with target card ID if a status filter removes the rated card from `cards`
  useEffect(() => {
    if (pendingNextCardIdRef.current != null) {
      const targetId = pendingNextCardIdRef.current;
      pendingNextCardIdRef.current = null;
      if (
        cards.length > 0 &&
        String(cards[activeIndex]?.id) !== String(targetId)
      ) {
        const idx = cards.findIndex((c) => String(c.id) === String(targetId));
        if (idx >= 0) {
          onIndexChange?.(idx, targetId);
        } else {
          onIndexChange?.(0, cards[0]?.id ?? null);
        }
      }
    }
  }, [cards, activeIndex, onIndexChange]);

  const cardKey = currentCard ? String(currentCard.id || activeIndex) : '';
  const selectedIdx = cardKey ? selectedAnswerByCard[cardKey] : undefined;
  const isAnswered = typeof selectedIdx === 'number';

  const options = useMemo(() => {
    if (!currentCard || cards.length === 0) return [];
    const correctMeaning =
      currentCard.meaning || t('study:practice.fallbackMeaning');
    const otherMeanings = [];
    const seen = new Set([correctMeaning]);

    const seed = Number(currentCard.id || activeIndex) + 7;
    for (let i = 0; i < cards.length && otherMeanings.length < 3; i += 1) {
      const idx = (activeIndex + 1 + i * 3 + seed) % cards.length;
      const candidate = cards[idx]?.meaning;
      if (candidate && !seen.has(candidate)) {
        seen.add(candidate);
        otherMeanings.push(candidate);
      }
    }

    const pool = [
      { text: correctMeaning, isCorrect: true },
      ...otherMeanings.map((m) => ({ text: m, isCorrect: false })),
    ];

    // Deterministic rotation based on card id / index
    const shift = seed % pool.length;
    return [...pool.slice(shift), ...pool.slice(0, shift)];
  }, [currentCard, cards, activeIndex, t]);

  if (!cards || cards.length === 0) {
    return (
      <EmptyState
        title={t('study:flashcard.emptyTitle')}
        description={t('study:flashcard.emptyDesc')}
      />
    );
  }

  const frontText = currentCard.front_text || currentCard.grammar;
  const reading = currentCard.extra_data?.reading || '';
  const isKanjiCard = currentCard.card_type === 'kanji';
  const currentSrs = srsMap[String(currentCard.id)] || null;
  const currentStatus =
    statusMap[String(currentCard.id)] || currentSrs?.status || 'unseen';
  const displayStatus = getEffectiveCardStatus(currentStatus, currentSrs);
  const isCurrentDue = Boolean(
    currentSrs &&
      currentSrs.state !== 'new' &&
      (currentSrs.is_due || isCardDue(currentSrs))
  );
  const examples = parseExamples(currentCard.examples);

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedAnswerByCard((prev) => ({
      ...prev,
      [cardKey]: idx,
    }));
  };

  const clearCardAnswers = (extraCardId = null) => {
    const extraKey = extraCardId != null ? String(extraCardId) : '';
    if (!cardKey && !extraKey) return;
    setSelectedAnswerByCard((prev) => {
      if (!(cardKey in prev) && (!extraKey || !(extraKey in prev))) return prev;
      const next = { ...prev };
      if (cardKey) delete next[cardKey];
      if (extraKey) delete next[extraKey];
      return next;
    });
  };

  const applyImmediatePracticeChange = (
    targetIndex,
    targetCardId = null,
    nextReturnCardId = undefined
  ) => {
    if (cards.length === 0) return;
    let resolvedIdx = targetIndex;
    if (targetCardId != null) {
      const foundIdx = cards.findIndex(
        (c) => String(c.id) === String(targetCardId)
      );
      if (foundIdx >= 0) {
        resolvedIdx = foundIdx;
      }
    }
    resolvedIdx = Math.max(0, Math.min(resolvedIdx, cards.length - 1));
    clearCardAnswers(targetCardId ?? cards[resolvedIdx]?.id);
    pendingNextCardIdRef.current = targetCardId;
    onIndexChange?.(resolvedIdx, targetCardId, nextReturnCardId);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    const transition = resolveStudyTransition(
      precomputedPlan,
      'prev',
      cards,
      srsMapRef.current,
      activeIndex,
      currentCardId,
      {
        returnCardId: returnCardIdRef.current,
        excludedDueCardIds: skippedDueIdsRef.current,
      }
    );
    skippedDueIdsRef.current = transition.nextSkippedDueIds;
    setSkippedDueIds(transition.nextSkippedDueIds);
    returnCardIdRef.current = transition.resumeCardId;
    setReturnCardId(transition.resumeCardId);
    applyImmediatePracticeChange(
      transition.targetIndex,
      transition.targetCardId,
      transition.resumeCardId
    );
  };

  const handleNext = () => {
    if (cards.length === 0) return;
    const transition = resolveStudyTransition(
      precomputedPlan,
      'next',
      cards,
      srsMapRef.current,
      activeIndex,
      currentCardId,
      {
        returnCardId: returnCardIdRef.current,
        excludedDueCardIds: skippedDueIdsRef.current,
      }
    );
    skippedDueIdsRef.current = transition.nextSkippedDueIds;
    setSkippedDueIds(transition.nextSkippedDueIds);
    returnCardIdRef.current = transition.resumeCardId;
    setReturnCardId(transition.resumeCardId);
    applyImmediatePracticeChange(
      transition.targetIndex,
      transition.targetCardId,
      transition.resumeCardId
    );
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">
              {currentCard.lesson || t('study:flashcard.generalLesson')}
            </Badge>
            {currentCard.level && (
              <Badge variant="level">{currentCard.level}</Badge>
            )}
            {currentCard.card_type && getCardTypeLabel(currentCard.card_type) && (
              <Badge variant="type">
                {getCardTypeLabel(currentCard.card_type)}
              </Badge>
            )}
            <Badge variant={displayStatus}>
              {getStudyStatusLabel(displayStatus)}
            </Badge>
            {currentSrs && currentSrs.state !== 'new' && (
              <Badge variant={isCurrentDue ? 'due' : 'srs'}>
                {isCurrentDue
                  ? t('study:flashcard.dueBadge')
                  : t('study:flashcard.cycleBadge', { interval: currentSrs.interval_display })}
              </Badge>
            )}
          </div>

          <span className="text-sm font-medium text-slate-600 tabular-nums">
            {t('study:practice.counter', { current: activeIndex + 1, total: cards.length })}
          </span>
        </div>

        {/* Prompt & Listening Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-surface p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <span className="text-xs font-medium text-slate-500">
            {isKanjiCard ? t('study:practice.kanjiPrompt') : t('study:practice.audioPrompt')}
          </span>
          {isKanjiCard && !isAnswered ? (
            <div className="text-3xl sm:text-5xl font-bold text-slate-900 font-jp py-2">
              {frontText}
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                <RubyText text={frontText} reading={reading} />
              </div>
              {currentCard.conjugation &&
                (isAnswered || currentCard.card_type !== 'vocabulary') && (
                  <div className="text-sm text-sky-800 font-medium font-jp">
                    {currentCard.conjugation}
                  </div>
                )}
              <AudioPlayer text={frontText} />
            </>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {options.map((opt, idx) => {
            let optState = 'idle';
            if (isAnswered) {
              if (opt.isCorrect) {
                optState = 'correct';
              } else if (selectedIdx === idx) {
                optState = 'incorrect';
              }
            }
            return (
              <AnswerOption
                key={`${cardKey}-${idx}`}
                index={idx}
                label={opt.text}
                state={optState}
                disabled={isAnswered}
                onSelect={() => handleSelectOption(idx, opt)}
              />
            );
          })}
        </div>

        {/* Explanation & Review Rating after answering */}
        {isAnswered && (
          <div
            className={`flex flex-col gap-4 ${
              currentCard.usage_notes || examples.length > 0 ? 'pt-4 border-t border-slate-200' : ''
            }`}
          >
            {currentCard.usage_notes && (
              <div className="bg-sky-50 border border-sky-200 rounded-surface p-4 text-sm text-slate-800">
                <span className="block text-xs font-medium text-sky-800 mb-1">
                  {t('study:practice.usageNotesHeading')}
                </span>
                {currentCard.usage_notes}
              </div>
            )}

            {examples.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {t('study:practice.examplesHeading')}
                </span>
                <GrammarExample example={examples[0]} index={0} />
              </div>
            )}

            <ReviewRating
              currentStatus={currentStatus}
              srsState={currentSrs}
              showIntervals
              onRate={(nextStatus) => {
                const preRatePlan =
                  precomputedPlanRef.current || precomputedPlan;
                const result = onStatusChange?.(currentCard.id, nextStatus);
                const latestSrsMap =
                  result?.srsMap || srsMapRef.current || srsMap;
                srsMapRef.current = latestSrsMap;

                if (isValidStudyRating(nextStatus) && cards.length > 0) {
                  const transition = resolveStudyTransition(
                    preRatePlan,
                    'rate',
                    cards,
                    latestSrsMap,
                    activeIndex,
                    currentCard.id,
                    {
                      returnCardId: returnCardIdRef.current,
                      excludedDueCardIds: [],
                    }
                  );
                  skippedDueIdsRef.current = [];
                  setSkippedDueIds([]);
                  returnCardIdRef.current = transition.resumeCardId;
                  setReturnCardId(transition.resumeCardId);
                  applyImmediatePracticeChange(
                    transition.targetIndex,
                    transition.targetCardId,
                    transition.resumeCardId
                  );
                }
              }}
            />
          </div>
        )}
      </Card>

      {/* Compact Icon-Only Navigation Footer (Câu trước / Câu tiếp theo) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrev}
          aria-label={t('study:practice.prevAria')}
          title={t('study:practice.prevAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleNext}
          aria-label={t('study:practice.nextAria')}
          title={t('study:practice.nextAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

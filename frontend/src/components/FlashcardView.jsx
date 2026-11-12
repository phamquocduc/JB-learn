import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import RubyText from './ui/RubyText';
import AudioPlayer from './ui/AudioPlayer';
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

const SLIDE_CLASS_MAP = {
  'out-left': 'flashcard-slide-out-left',
  'in-right': 'flashcard-slide-in-right',
  'out-second': 'flashcard-slide-out-right',
  'out-right': 'flashcard-slide-out-right',
  'in-left': 'flashcard-slide-in-left',
};

export default function FlashcardView({
  cards = [],
  currentIndex = 0,
  onIndexChange,
  statusMap = {},
  srsMap = {},
  onStatusChange,
  onEditCard,
  onDeleteCard,
  disabledShortcuts = false,
  initialReturnCardId = null,
}) {
  const { t } = useTranslation(['study', 'common']);
  const [isFlipped, setIsFlipped] = useState(false);
  const [suppressFlipTransition, setSuppressFlipTransition] = useState(false);
  const [slidePhase, setSlidePhase] = useState(null);
  const [returnState, setReturnState] = useState(() => ({
    baseProp: initialReturnCardId,
    value: initialReturnCardId,
  }));
  const [skippedDueIds, setSkippedDueIds] = useState([]);
  const slideInTimerRef = useRef(null);
  const returnCardIdRef = useRef(initialReturnCardId);
  const skippedDueIdsRef = useRef([]);
  const pendingNextCardIdRef = useRef(null);
  const srsMapRef = useRef(srsMap);

  const effectiveReturnCardId =
    returnState.baseProp === initialReturnCardId
      ? returnState.value
      : initialReturnCardId;

  const setReturnCardId = useCallback(
    (nextVal) => {
      setReturnState({ baseProp: initialReturnCardId, value: nextVal });
    },
    [initialReturnCardId]
  );

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
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

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

  const clearSlideTimers = useCallback(() => {
    if (slideInTimerRef.current) {
      clearTimeout(slideInTimerRef.current);
      slideInTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearSlideTimers, [clearSlideTimers]);

  const handleToggleFlip = useCallback(() => {
    setSuppressFlipTransition(false);
    setIsFlipped((prev) => !prev);
  }, []);

  // Immediately bring up the next card on screen without any pre-change delay
  const applyImmediateCardChange = useCallback(
    (
      targetIndex,
      targetCardId = null,
      direction = 'next',
      nextReturnCardId = undefined
    ) => {
      const latestCards = cardsRef.current;
      if (!latestCards || latestCards.length === 0) return;
      clearSlideTimers();

      let resolvedIdx = targetIndex;
      if (targetCardId != null) {
        const foundIdx = latestCards.findIndex(
          (c) => String(c.id) === String(targetCardId)
        );
        if (foundIdx >= 0) {
          resolvedIdx = foundIdx;
        }
      }
      resolvedIdx = Math.max(0, Math.min(resolvedIdx, latestCards.length - 1));

      pendingNextCardIdRef.current = targetCardId;
      setSuppressFlipTransition(true);
      setIsFlipped(false);
      onIndexChange?.(resolvedIdx, targetCardId, nextReturnCardId);

      const inPhase = direction === 'prev' ? 'in-left' : 'in-right';
      setSlidePhase(inPhase);

      slideInTimerRef.current = setTimeout(() => {
        setSlidePhase(null);
        setSuppressFlipTransition(false);
      }, 180);
    },
    [clearSlideTimers, onIndexChange]
  );

  const handleNext = useCallback(() => {
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
    applyImmediateCardChange(
      transition.targetIndex,
      transition.targetCardId,
      'next',
      transition.resumeCardId
    );
  }, [
    cards,
    activeIndex,
    currentCardId,
    precomputedPlan,
    applyImmediateCardChange,
    setReturnCardId,
  ]);

  const handlePrev = useCallback(() => {
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
    applyImmediateCardChange(
      transition.targetIndex,
      transition.targetCardId,
      transition.hasDueLearningCard ? 'next' : 'prev',
      transition.resumeCardId
    );
  }, [
    cards,
    activeIndex,
    currentCardId,
    precomputedPlan,
    applyImmediateCardChange,
    setReturnCardId,
  ]);

  const handleShuffle = useCallback(() => {
    if (cards.length <= 1) return;
    const transition = resolveStudyTransition(
      precomputedPlan,
      'shuffle',
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
    applyImmediateCardChange(
      transition.targetIndex,
      transition.targetCardId,
      'next',
      transition.resumeCardId
    );
  }, [
    cards,
    activeIndex,
    currentCardId,
    precomputedPlan,
    applyImmediateCardChange,
    setReturnCardId,
  ]);

  const handleRate = useCallback(
    (nextRating) => {
      if (!currentCardId) return;
      const preRatePlan = precomputedPlanRef.current || precomputedPlan;
      const result = onStatusChange?.(currentCardId, nextRating);
      const latestSrsMap = result?.srsMap || srsMapRef.current || srsMap;
      srsMapRef.current = latestSrsMap;

      if (isValidStudyRating(nextRating) && cards.length > 0) {
        const transition = resolveStudyTransition(
          preRatePlan,
          'rate',
          cards,
          latestSrsMap,
          activeIndex,
          currentCardId,
          {
            returnCardId: returnCardIdRef.current,
            excludedDueCardIds: [],
          }
        );
        skippedDueIdsRef.current = [];
        setSkippedDueIds([]);
        returnCardIdRef.current = transition.resumeCardId;
        setReturnCardId(transition.resumeCardId);
        applyImmediateCardChange(
          transition.targetIndex,
          transition.targetCardId,
          'next',
          transition.resumeCardId
        );
      }
    },
    [
      currentCardId,
      cards,
      activeIndex,
      precomputedPlan,
      onStatusChange,
      srsMap,
      applyImmediateCardChange,
      setReturnCardId,
    ]
  );

  useEffect(() => {
    if (disabledShortcuts) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'A' ||
          target.closest?.('[role="dialog"]'))
      ) {
        return;
      }

      if (e.code === 'Space') {
        if (target?.tagName === 'BUTTON') return;
        e.preventDefault();
        handleToggleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (isFlipped) {
        if (e.key === '1') {
          e.preventDefault();
          handleRate('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleRate('learned');
        } else if (e.key === '3') {
          e.preventDefault();
          handleRate('remembered');
        } else if (e.key === '4') {
          e.preventDefault();
          handleRate('mastered');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNext,
    handlePrev,
    handleToggleFlip,
    handleRate,
    isFlipped,
    disabledShortcuts,
  ]);

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

  const renderCardHeader = () => (
    <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="lesson">
          {currentCard.lesson || t('study:flashcard.generalLesson')}
        </Badge>
        {currentCard.level && <Badge variant="level">{currentCard.level}</Badge>}
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
              : t('study:flashcard.cycleBadge', {
                  interval: currentSrs.interval_display,
                })}
          </Badge>
        )}
        {!currentCard.is_public && (
          <Badge variant="private">{t('study:flashcard.privateBadge')}</Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {((currentCard.can_edit ??
          (currentCard.can_manage || currentCard.is_owner)) ||
          (currentCard.can_delete ??
            (currentCard.can_manage || currentCard.is_owner))) && (
          <div
            className="inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {(currentCard.can_edit ??
              (currentCard.can_manage || currentCard.is_owner)) &&
              onEditCard && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onEditCard(currentCard)}
                  aria-label={t('study:flashcard.editAria', { frontText })}
                >
                  <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            {(currentCard.can_delete ??
              (currentCard.can_manage || currentCard.is_owner)) &&
              onDeleteCard && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDeleteCard(currentCard)}
                  aria-label={t('study:flashcard.deleteAria', { frontText })}
                >
                  <TrashIcon className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
          </div>
        )}
        <span className="text-sm text-slate-600 font-medium tabular-nums">
          {activeIndex + 1} / {cards.length}
        </span>
      </div>
    </div>
  );

  const slideAnimClass = slidePhase ? SLIDE_CLASS_MAP[slidePhase] || '' : '';

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full gap-3">
      {/* 3D Flip Scene */}
      <div
        role="button"
        tabIndex={0}
        aria-label={
          isFlipped
            ? t('study:flashcard.backAria', { frontText })
            : t('study:flashcard.frontAria', { frontText })
        }
        onClick={handleToggleFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleFlip();
          }
        }}
        className={`flashcard-scene relative w-full flex-1 min-h-[524px] sm:min-h-[622px] flex flex-col cursor-pointer select-none rounded-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${slideAnimClass}`}
      >
        <div
          className={`flashcard-inner absolute inset-0 w-full h-full min-h-0 ${
            isFlipped ? 'is-flipped' : ''
          } ${suppressFlipTransition ? 'no-flip-transition' : ''}`}
        >
          {/* Front Face */}
          <Card
            aria-hidden={isFlipped}
            className={`flashcard-face w-full h-full min-h-0 max-h-full overflow-hidden p-4 sm:p-6 flex flex-col justify-between bg-white hover:border-slate-300 transition-colors duration-150 ${
              isFlipped ? 'pointer-events-none' : ''
            }`}
          >
            {renderCardHeader()}

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center py-4 sm:py-6 gap-4">
              {isKanjiCard ? (
                <div className="text-4xl sm:text-6xl font-bold text-slate-900 leading-tight font-jp">
                  {frontText}
                </div>
              ) : (
                <>
                  <div className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight">
                    <RubyText text={frontText} reading={reading} />
                  </div>

                  {currentCard.conjugation &&
                    currentCard.card_type !== 'vocabulary' && (
                      <div className="inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-control text-sky-800 text-sm sm:text-base font-medium font-jp">
                        {currentCard.conjugation}
                      </div>
                    )}

                  <AudioPlayer text={frontText} />
                </>
              )}
            </div>
          </Card>

          {/* Back Face */}
          <Card
            aria-hidden={!isFlipped}
            className={`flashcard-face flashcard-face-back w-full h-full min-h-0 max-h-full overflow-hidden p-4 sm:p-6 flex flex-col justify-between bg-white border-sky-300 transition-colors duration-150 ${
              !isFlipped ? 'pointer-events-none' : ''
            }`}
          >
            {renderCardHeader()}

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col my-3 sm:my-4 pr-1">
              <div className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center text-center gap-3.5 sm:gap-4 py-2">
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight font-jp">
                  <RubyText text={frontText} reading={reading} />
                </div>

                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  {currentCard.conjugation && (
                    <div className="inline-flex items-center bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-control text-sky-800 text-sm sm:text-base font-medium font-jp">
                      {currentCard.conjugation}
                    </div>
                  )}
                  <AudioPlayer text={frontText} />
                </div>

                <div className="w-full bg-sky-50 border border-sky-200 rounded-surface px-4 py-3.5 sm:px-6 sm:py-4 text-sky-900 font-semibold text-base sm:text-lg text-center">
                  {currentCard.meaning}
                </div>

                {currentCard.usage_notes && (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-surface p-3.5 sm:p-4 text-sm text-slate-700 text-center">
                    <span className="block text-xs font-medium text-slate-500 mb-1">
                          {isKanjiCard
                      ? t('study:flashcard.kanjiDetailsHeading')
                      : t('study:flashcard.usageNotesHeading')}
                    </span>
                    <div className="leading-relaxed">{currentCard.usage_notes}</div>
                  </div>
                )}

                {examples.length > 0 && (
                  <div
                    className="w-full flex flex-col gap-2 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="block text-xs font-medium text-slate-500 text-center tabular-nums">
                      {t('study:flashcard.examplesCount', { count: examples.length })}
                    </span>
                    <div className="flex flex-col gap-2">
                      {examples.map((ex, idx) => (
                        <GrammarExample key={idx} example={ex} index={idx} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <ReviewRating
                currentStatus={currentStatus}
                srsState={currentSrs}
                showIntervals
                onRate={handleRate}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Compact Icon-Only Control Buttons (Trước / Lật thẻ / Ngẫu nhiên / Tiếp) */}
      <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-between w-full gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrev}
          aria-label={t('study:flashcard.prevAria')}
          title={t('study:flashcard.prevAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <div className="col-span-2 grid grid-cols-2 sm:flex sm:items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleToggleFlip}
            aria-label={
              isFlipped
                ? t('study:flashcard.hide')
                : t('study:flashcard.reveal')
            }
            title={
              isFlipped
                ? t('study:flashcard.hide')
                : t('study:flashcard.reveal')
            }
            className="h-9 sm:h-10 sm:w-12"
          >
            <ArrowPathIcon
              className={`w-4 h-4 transition-transform duration-300 ${
                isFlipped ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShuffle}
            aria-label={t('study:flashcard.shuffleAria')}
            title={t('study:flashcard.shuffleAria')}
            className="h-9 sm:h-10 sm:w-12"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleNext}
          aria-label={t('study:flashcard.nextAria')}
          title={t('study:flashcard.nextAria')}
          className="h-9 sm:h-10 sm:w-12"
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

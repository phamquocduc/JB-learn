import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  CARD_TYPE_LABELS,
  STUDY_STATUS_LABELS,
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [suppressFlipTransition, setSuppressFlipTransition] = useState(false);
  const [slidePhase, setSlidePhase] = useState(null);
  const [returnCardId, setReturnCardId] = useState(initialReturnCardId);
  const [skippedDueIds, setSkippedDueIds] = useState([]);
  const slideInTimerRef = useRef(null);
  const returnCardIdRef = useRef(initialReturnCardId);
  const skippedDueIdsRef = useRef([]);
  const pendingNextCardIdRef = useRef(null);
  const srsMapRef = useRef(srsMap);

  useEffect(() => {
    srsMapRef.current = srsMap;
  }, [srsMap]);

  useEffect(() => {
    if (initialReturnCardId != null && returnCardIdRef.current == null) {
      returnCardIdRef.current = initialReturnCardId;
    }
  }, [initialReturnCardId]);

  const effectiveReturnCardId = returnCardId ?? initialReturnCardId;
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
    (targetIndex, targetCardId = null, direction = 'next') => {
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
      onIndexChange?.(resolvedIdx, targetCardId);

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
      'next'
    );
  }, [
    cards,
    activeIndex,
    currentCardId,
    precomputedPlan,
    applyImmediateCardChange,
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
      transition.hasDueLearningCard ? 'next' : 'prev'
    );
  }, [
    cards,
    activeIndex,
    currentCardId,
    precomputedPlan,
    applyImmediateCardChange,
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
      'next'
    );
  }, [
    cards,
    activeIndex,
    currentCardId,
    precomputedPlan,
    applyImmediateCardChange,
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
          'next'
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
        title="Không tìm thấy thẻ học phù hợp"
        description="Hãy thử đổi bộ lọc cấp độ, bài học hoặc từ khóa tìm kiếm."
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
        <Badge variant="lesson">{currentCard.lesson || 'Chung'}</Badge>
        {currentCard.level && <Badge variant="level">{currentCard.level}</Badge>}
        {currentCard.card_type && CARD_TYPE_LABELS[currentCard.card_type] && (
          <Badge variant="type">
            {CARD_TYPE_LABELS[currentCard.card_type]}
          </Badge>
        )}
        <Badge variant={displayStatus}>
          {STUDY_STATUS_LABELS[displayStatus] || 'Chưa học'}
        </Badge>
        {currentSrs && currentSrs.state !== 'new' && (
          <Badge variant={isCurrentDue ? 'due' : 'srs'}>
            {isCurrentDue
              ? 'Đến hạn ôn'
              : `Chu kỳ: ${currentSrs.interval_display}`}
          </Badge>
        )}
        {!currentCard.is_public && <Badge variant="private">Riêng tư</Badge>}
      </div>

      <div className="flex items-center gap-2">
        {currentCard.is_owner && (
          <div
            className="inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onEditCard && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onEditCard(currentCard)}
                aria-label={`Sửa thẻ ${frontText}`}
              >
                <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            {onDeleteCard && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDeleteCard(currentCard)}
                aria-label={`Xóa thẻ ${frontText}`}
              >
                <TrashIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
        <span className="text-sm text-slate-600 font-semibold">
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
            ? `Mặt sau thẻ ${frontText}. Bấm để xem mặt trước.`
            : `Mặt trước thẻ ${frontText}. Bấm để lật xem ý nghĩa.`
        }
        onClick={handleToggleFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleFlip();
          }
        }}
        className={`flashcard-scene relative w-full flex-1 min-h-[524px] sm:min-h-[622px] flex flex-col cursor-pointer select-none rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${slideAnimClass}`}
      >
        <div
          className={`flashcard-inner absolute inset-0 w-full h-full min-h-0 ${
            isFlipped ? 'is-flipped' : ''
          } ${suppressFlipTransition ? 'no-flip-transition' : ''}`}
        >
          {/* Front Face */}
          <Card
            rounded="2xl"
            aria-hidden={isFlipped}
            className={`flashcard-face w-full h-full min-h-0 max-h-full overflow-hidden p-4 sm:p-8 flex flex-col justify-between bg-white hover:border-slate-300 transition-colors duration-150 ${
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
                      <div className="inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sky-800 text-sm sm:text-base font-medium font-jp">
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
            rounded="2xl"
            aria-hidden={!isFlipped}
            className={`flashcard-face flashcard-face-back w-full h-full min-h-0 max-h-full overflow-hidden p-4 sm:p-8 flex flex-col justify-between bg-white border-sky-300 transition-colors duration-150 ${
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
                    <div className="inline-flex items-center bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sky-800 text-sm sm:text-base font-medium font-jp">
                      {currentCard.conjugation}
                    </div>
                  )}
                  <AudioPlayer text={frontText} />
                </div>

                <div className="w-full bg-sky-50 border border-sky-200 rounded-xl px-4 py-3.5 sm:px-6 sm:py-4 text-sky-900 font-bold text-base sm:text-lg text-center">
                  {currentCard.meaning}
                </div>

                {currentCard.usage_notes && (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-sm text-slate-700 text-center">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {isKanjiCard ? 'Chi tiết Hán tự' : 'Cách dùng & Chú ý'}
                    </span>
                    <div className="leading-relaxed">{currentCard.usage_notes}</div>
                  </div>
                )}

                {examples.length > 0 && (
                  <div
                    className="w-full flex flex-col gap-2 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                      Ví dụ ({examples.length})
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
          aria-label="Thẻ trước"
          title="Thẻ trước"
          className="h-9 sm:h-10 sm:w-12 rounded-xl"
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>

        <div className="col-span-2 grid grid-cols-2 sm:flex sm:items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleToggleFlip}
            aria-label={isFlipped ? 'Xem mặt trước' : 'Lật thẻ'}
            title={isFlipped ? 'Xem mặt trước' : 'Lật thẻ'}
            className="h-9 sm:h-10 sm:w-12 rounded-xl"
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
            aria-label="Thẻ ngẫu nhiên"
            title="Thẻ ngẫu nhiên"
            className="h-9 sm:h-10 sm:w-12 rounded-xl"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleNext}
          aria-label="Thẻ tiếp theo"
          title="Thẻ tiếp theo"
          className="h-9 sm:h-10 sm:w-12 rounded-xl"
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

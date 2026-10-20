import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  parseExamples,
} from '../constants/cards';

const SLIDE_CLASS_MAP = {
  'out-left': 'flashcard-slide-out-left',
  'in-right': 'flashcard-slide-in-right',
  'out-right': 'flashcard-slide-out-right',
  'in-left': 'flashcard-slide-in-left',
};

export default function FlashcardView({
  cards = [],
  currentIndex = 0,
  onIndexChange,
  statusMap = {},
  onStatusChange,
  onEditCard,
  onDeleteCard,
  disabledShortcuts = false,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [suppressFlipTransition, setSuppressFlipTransition] = useState(false);
  const [slidePhase, setSlidePhase] = useState(null);
  const slideOutTimerRef = useRef(null);
  const slideInTimerRef = useRef(null);

  const activeIndex =
    cards.length === 0 ? 0 : Math.min(currentIndex, cards.length - 1);

  const clearSlideTimers = useCallback(() => {
    if (slideOutTimerRef.current) {
      clearTimeout(slideOutTimerRef.current);
      slideOutTimerRef.current = null;
    }
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

  const triggerSlideToIndex = useCallback(
    (targetIdx, direction = 'next') => {
      if (cards.length === 0) return;
      clearSlideTimers();

      const outPhase = direction === 'prev' ? 'out-right' : 'out-left';
      const inPhase = direction === 'prev' ? 'in-left' : 'in-right';

      setSlidePhase(outPhase);

      slideOutTimerRef.current = setTimeout(() => {
        setSuppressFlipTransition(true);
        setIsFlipped(false);
        onIndexChange?.(targetIdx);
        setSlidePhase(inPhase);

        slideInTimerRef.current = setTimeout(() => {
          setSlidePhase(null);
          setSuppressFlipTransition(false);
        }, 220);
      }, 140);
    },
    [cards.length, clearSlideTimers, onIndexChange]
  );

  const handleNext = useCallback(() => {
    if (cards.length === 0) return;
    const nextIdx = activeIndex + 1 < cards.length ? activeIndex + 1 : 0;
    triggerSlideToIndex(nextIdx, 'next');
  }, [cards.length, activeIndex, triggerSlideToIndex]);

  const handlePrev = useCallback(() => {
    if (cards.length === 0) return;
    const prevIdx = activeIndex - 1 >= 0 ? activeIndex - 1 : cards.length - 1;
    triggerSlideToIndex(prevIdx, 'prev');
  }, [cards.length, activeIndex, triggerSlideToIndex]);

  const handleShuffle = useCallback(() => {
    if (cards.length <= 1) return;
    const randomIndex = Math.floor(Math.random() * cards.length);
    triggerSlideToIndex(randomIndex, 'next');
  }, [cards.length, triggerSlideToIndex]);

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
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.closest?.('[role="dialog"]'))
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleToggleFlip, disabledShortcuts]);

  if (!cards || cards.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy thẻ học phù hợp"
        description="Hãy thử đổi bộ lọc cấp độ, bài học hoặc từ khóa tìm kiếm."
      />
    );
  }

  const currentCard = cards[activeIndex] || cards[0];
  const frontText = currentCard.front_text || currentCard.grammar;
  const reading = currentCard.extra_data?.reading || '';
  const currentStatus = statusMap[String(currentCard.id)] || 'unseen';
  const examples = parseExamples(currentCard.examples);

  const handleRate = (nextStatus) => {
    if (currentCard?.id) {
      onStatusChange?.(currentCard.id, nextStatus);
      if (nextStatus && nextStatus !== 'unseen') {
        handleNext();
      }
    }
  };

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
        <Badge variant={currentStatus}>
          {STUDY_STATUS_LABELS[currentStatus] || 'Chưa học'}
        </Badge>
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
              <div className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight">
                <RubyText text={frontText} reading={reading} />
              </div>

              {currentCard.conjugation && (
                <div className="inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sky-800 text-sm sm:text-base font-medium font-jp">
                  {currentCard.conjugation}
                </div>
              )}

              <AudioPlayer text={frontText} />
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

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5 sm:gap-4 my-3 sm:my-4 pr-1">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xl font-bold text-slate-900">
                  <RubyText text={frontText} reading={reading} />
                </div>
                <AudioPlayer text={frontText} />
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 sm:p-4 text-sky-900 font-semibold text-base">
                {currentCard.meaning}
              </div>

              {currentCard.usage_notes && (
                <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-sky-700 p-3.5 sm:p-4 text-sm text-slate-700 rounded-lg">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cách dùng & Chú ý
                  </span>
                  <div>{currentCard.usage_notes}</div>
                </div>
              )}

              {examples.length > 0 && (
                <div
                  className="flex flex-col gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
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

            <div className="shrink-0">
              <ReviewRating
                currentStatus={currentStatus}
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

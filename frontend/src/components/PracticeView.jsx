import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  CARD_TYPE_LABELS,
  STUDY_STATUS_LABELS,
  getEffectiveCardStatus,
  parseExamples,
} from '../constants/cards';
import {
  getNextStudyCardIndex,
  isCardDue,
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
  const [selectedAnswerByCard, setSelectedAnswerByCard] = useState({});
  const pendingNextCardIdRef = useRef(null);
  const returnCardIdRef = useRef(initialReturnCardId);
  const prevDueLearningIdsRef = useRef(null);

  useEffect(() => {
    if (initialReturnCardId != null) {
      returnCardIdRef.current = initialReturnCardId;
    }
  }, [initialReturnCardId]);

  const activeIndex =
    cards.length === 0 ? 0 : Math.min(currentIndex, cards.length - 1);
  const currentCard = cards[activeIndex] || cards[0];

  useEffect(() => {
    if (pendingNextCardIdRef.current != null) {
      const targetId = pendingNextCardIdRef.current;
      pendingNextCardIdRef.current = null;
      const idx = cards.findIndex((c) => String(c.id) === String(targetId));
      if (idx >= 0) {
        onIndexChange?.(idx);
      } else if (cards.length > 0) {
        onIndexChange?.(0);
      }
    }
  }, [cards, statusMap, srsMap, onIndexChange]);

  const cardKey = currentCard ? String(currentCard.id || activeIndex) : '';
  const selectedIdx = cardKey ? selectedAnswerByCard[cardKey] : undefined;
  const isAnswered = typeof selectedIdx === 'number';

  useEffect(() => {
    const currentDueLearningIds = new Set();
    for (const c of cards) {
      const s = srsMap[c.id] || srsMap[String(c.id)];
      if (
        s &&
        (s.state === 'learning' || s.state === 'relearning') &&
        (s.is_due || isCardDue(s))
      ) {
        currentDueLearningIds.add(String(c.id));
      }
    }

    if (prevDueLearningIdsRef.current === null) {
      prevDueLearningIdsRef.current = currentDueLearningIds;
      return;
    }

    const newlyDueIds = [...currentDueLearningIds].filter(
      (id) => !prevDueLearningIdsRef.current.has(id)
    );
    if (newlyDueIds.length === 0) {
      prevDueLearningIdsRef.current = currentDueLearningIds;
      return;
    }

    if (isAnswered || !currentCard) {
      return;
    }

    prevDueLearningIdsRef.current = currentDueLearningIds;

    if (!newlyDueIds.includes(String(currentCard.id))) {
      const { nextIndex, resumeCardId } = getNextStudyCardIndex(
        cards,
        srsMap,
        activeIndex,
        currentCard.id,
        {
          returnCardId: returnCardIdRef.current,
          isCurrentCardUnrated: true,
        }
      );
      if (nextIndex !== activeIndex) {
        returnCardIdRef.current = resumeCardId;
        onIndexChange?.(nextIndex);
      }
    }
  }, [cards, srsMap, isAnswered, currentCard, activeIndex, onIndexChange]);

  const options = useMemo(() => {
    if (!currentCard || cards.length === 0) return [];
    const correctMeaning = currentCard.meaning || 'Ý nghĩa chính xác';
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
  }, [currentCard, cards, activeIndex]);

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

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedAnswerByCard((prev) => ({
      ...prev,
      [cardKey]: idx,
    }));
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    returnCardIdRef.current = null;
    const prevIdx = activeIndex - 1 >= 0 ? activeIndex - 1 : cards.length - 1;
    onIndexChange?.(prevIdx);
  };

  const handleNext = () => {
    if (cards.length === 0) return;
    returnCardIdRef.current = null;
    const nextIdx = activeIndex + 1 < cards.length ? activeIndex + 1 : 0;
    onIndexChange?.(nextIdx);
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-between gap-3">
      <Card rounded="2xl" className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">{currentCard.lesson || 'Chung'}</Badge>
            {currentCard.level && (
              <Badge variant="level">{currentCard.level}</Badge>
            )}
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
          </div>

          <span className="text-sm font-semibold text-slate-600">
            Câu {activeIndex + 1} / {cards.length}
          </span>
        </div>

        {/* Prompt & Listening Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isKanjiCard ? 'Chọn ý nghĩa đúng của Hán tự' : 'Nghe và chọn ý nghĩa đúng'}
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
              {currentCard.conjugation && (
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
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
            {currentCard.usage_notes && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-slate-800">
                <span className="block text-xs font-semibold text-sky-800 uppercase tracking-wider mb-1">
                  Ghi chú cách dùng
                </span>
                {currentCard.usage_notes}
              </div>
            )}

            {examples.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ví dụ minh họa
                </span>
                <GrammarExample example={examples[0]} index={0} />
              </div>
            )}

            <ReviewRating
              currentStatus={currentStatus}
              srsState={currentSrs}
              showIntervals
              onRate={(nextStatus) => {
                setSelectedAnswerByCard((prev) => {
                  const next = { ...prev };
                  delete next[cardKey];
                  return next;
                });
                const result = onStatusChange?.(currentCard.id, nextStatus);
                const latestSrsMap = result?.srsMap || srsMap;
                if (nextStatus && nextStatus !== 'unseen' && cards.length > 0) {
                  const { nextCardId, resumeCardId } = getNextStudyCardIndex(
                    cards,
                    latestSrsMap,
                    activeIndex,
                    currentCard.id,
                    {
                      returnCardId: returnCardIdRef.current,
                      isCurrentCardUnrated: false,
                    }
                  );
                  returnCardIdRef.current = resumeCardId;
                  if (nextCardId != null) {
                    pendingNextCardIdRef.current = nextCardId;
                  }
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

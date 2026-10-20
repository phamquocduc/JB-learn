import React, { useState, useMemo } from 'react';
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
  parseExamples,
} from '../constants/cards';

export default function PracticeView({
  cards = [],
  currentIndex = 0,
  onIndexChange,
  statusMap = {},
  onStatusChange,
}) {
  const [selectedAnswerByCard, setSelectedAnswerByCard] = useState({});

  const activeIndex =
    cards.length === 0 ? 0 : Math.min(currentIndex, cards.length - 1);
  const currentCard = cards[activeIndex] || cards[0];

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

  const cardKey = String(currentCard.id || activeIndex);
  const selectedIdx = selectedAnswerByCard[cardKey];
  const isAnswered = typeof selectedIdx === 'number';
  const frontText = currentCard.front_text || currentCard.grammar;
  const reading = currentCard.extra_data?.reading || '';
  const currentStatus = statusMap[String(currentCard.id)] || 'unseen';
  const examples = parseExamples(currentCard.examples);

  const handleSelectOption = (idx, option) => {
    if (isAnswered) return;
    setSelectedAnswerByCard((prev) => ({
      ...prev,
      [cardKey]: idx,
    }));

    if (option.isCorrect && currentCard.id) {
      if (currentStatus === 'unseen') {
        onStatusChange?.(currentCard.id, 'learned');
      } else if (currentStatus === 'learned') {
        onStatusChange?.(currentCard.id, 'remembered');
      }
    }
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    const prevIdx = activeIndex - 1 >= 0 ? activeIndex - 1 : cards.length - 1;
    onIndexChange?.(prevIdx);
  };

  const handleNext = () => {
    if (cards.length === 0) return;
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
            <Badge variant={currentStatus}>
              {STUDY_STATUS_LABELS[currentStatus] || 'Chưa học'}
            </Badge>
          </div>

          <span className="text-sm font-semibold text-slate-600">
            Câu {activeIndex + 1} / {cards.length}
          </span>
        </div>

        {/* Prompt & Listening Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center gap-2.5 sm:gap-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Nghe và chọn ý nghĩa đúng
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            <RubyText text={frontText} reading={reading} />
          </div>
          {currentCard.conjugation && (
            <div className="text-sm text-sky-800 font-medium font-jp">
              {currentCard.conjugation}
            </div>
          )}
          <AudioPlayer text={frontText} />
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
              onRate={(nextStatus) => {
                onStatusChange?.(currentCard.id, nextStatus);
                if (nextStatus && nextStatus !== 'unseen') {
                  handleNext();
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

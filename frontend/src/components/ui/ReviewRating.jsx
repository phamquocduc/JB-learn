import React from 'react';
import Button from './Button';
import { ANKI_RATINGS, STUDY_STATUSES } from '../../constants/cards';
import { getIntervalPreviews } from '../../services/ankiScheduler';

const ACTIVE_BADGE_CLASSES = {
  again: '!bg-rose-50 !text-rose-800 !border-rose-300 hover:!bg-rose-100',
  learned: '!bg-sky-100 !text-sky-900 !border-sky-400 hover:!bg-sky-200/70',
  remembered: '!bg-sky-700 !text-white !border-sky-700 hover:!bg-sky-800',
  mastered: '!bg-emerald-600 !text-white !border-emerald-600 hover:!bg-emerald-700',
};

export default function ReviewRating({
  currentStatus = 'unseen',
  srsState,
  showIntervals = false,
  onRate,
  className = '',
}) {
  const isAnkiMode = showIntervals || srsState !== undefined;
  const previews = isAnkiMode
    ? srsState?.next_intervals || getIntervalPreviews(srsState)
    : null;

  if (!isAnkiMode) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center justify-center gap-2 flex-wrap pt-2.5 border-t border-slate-200 ${className}`}
      >
        {STUDY_STATUSES.map((item) => {
          const isSelected = currentStatus === item.value;
          const activeCls =
            ACTIVE_BADGE_CLASSES[item.value] || ACTIVE_BADGE_CLASSES.learned;

          return (
            <Button
              key={item.value}
              variant="badge"
              size="badge"
              onClick={() => onRate?.(isSelected ? 'unseen' : item.value)}
              aria-pressed={isSelected}
              className={isSelected ? activeCls : ''}
            >
              {item.label}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center justify-center gap-2 flex-wrap pt-2.5 border-t border-slate-200 ${className}`}
    >
      {ANKI_RATINGS.map((item) => {
        const hasLastRating = Number(srsState?.last_rating) > 0;
        const isSelected = hasLastRating
          ? Number(srsState?.last_rating) === item.rating
          : currentStatus !== 'unseen' && currentStatus === item.value;
        const activeCls =
          ACTIVE_BADGE_CLASSES[item.value] || ACTIVE_BADGE_CLASSES.learned;
        const intervalText = previews?.[item.previewKey] || '';

        return (
          <Button
            key={item.value}
            variant="badge"
            size="badge"
            onClick={() => onRate?.(item.value)}
            aria-pressed={isSelected}
            aria-label={
              intervalText ? `${item.label} (${intervalText})` : item.label
            }
            className={`gap-1.5 ${isSelected ? activeCls : ''}`}
          >
            <span>{item.label}</span>
            {intervalText && (
              <span
                className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                  isSelected
                    ? 'bg-black/10 text-current'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {intervalText}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}


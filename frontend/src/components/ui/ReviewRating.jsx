import React from 'react';
import Button from './Button';
import { STUDY_STATUSES } from '../../constants/cards';

const ACTIVE_BADGE_CLASSES = {
  learned: '!bg-sky-100 !text-sky-900 !border-sky-400 hover:!bg-sky-200/70',
  remembered: '!bg-sky-700 !text-white !border-sky-700 hover:!bg-sky-800',
  mastered: '!bg-emerald-600 !text-white !border-emerald-600 hover:!bg-emerald-700',
};

export default function ReviewRating({
  currentStatus = 'unseen',
  onRate,
  className = '',
}) {
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

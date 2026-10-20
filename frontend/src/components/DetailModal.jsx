import React, { useEffect } from 'react';
import {
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Badge from './ui/Badge';
import RubyText from './ui/RubyText';
import AudioPlayer from './ui/AudioPlayer';
import GrammarExample from './ui/GrammarExample';
import ReviewRating from './ui/ReviewRating';
import {
  CARD_TYPE_LABELS,
  STUDY_STATUS_LABELS,
  parseExamples,
} from '../constants/cards';

export default function DetailModal({
  card,
  status = 'unseen',
  onStatusChange,
  onClose,
  onEditCard,
  onDeleteCard,
}) {
  useEffect(() => {
    if (!card) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  const frontText = card.front_text || card.grammar;
  const reading = card.extra_data?.reading || '';
  const examples = parseExamples(card.examples);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-backdrop-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 rounded-t-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">{card.lesson || 'Chung'}</Badge>
            {card.level && <Badge variant="level">{card.level}</Badge>}
            {card.card_type && CARD_TYPE_LABELS[card.card_type] && (
              <Badge variant="type">{CARD_TYPE_LABELS[card.card_type]}</Badge>
            )}
            <Badge variant={status}>
              {STUDY_STATUS_LABELS[status] || 'Chưa học'}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {card.is_owner && onEditCard && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  onClose();
                  onEditCard(card);
                }}
                aria-label={`Sửa thẻ ${frontText}`}
              >
                <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            {card.is_owner && onDeleteCard && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDeleteCard(card)}
                aria-label={`Xóa thẻ ${frontText}`}
              >
                <TrashIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              aria-label="Đóng chi tiết"
            >
              <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2
              id="detail-modal-title"
              className="text-2xl font-bold text-slate-900"
            >
              <RubyText text={frontText} reading={reading} />
            </h2>
            <AudioPlayer text={frontText} />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Ý nghĩa
            </span>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-900 font-semibold text-base">
              {card.meaning}
            </div>
          </div>

          {card.conjugation && (
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Cách chia / Cách đọc
              </span>
              <div className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sky-800 text-base font-medium font-jp">
                {card.conjugation}
              </div>
            </div>
          )}

          {card.usage_notes && (
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Cách dùng & Ghi chú
              </span>
              <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-sky-700 p-4 text-sm text-slate-700 rounded-lg">
                {card.usage_notes}
              </div>
            </div>
          )}

          {examples.length > 0 && (
            <div className="flex flex-col gap-2">
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

        <div className="px-6 pb-4 shrink-0">
          <ReviewRating
            currentStatus={status}
            onRate={(nextStatus) => onStatusChange?.(card.id, nextStatus)}
          />
        </div>
      </div>
    </div>
  );
}

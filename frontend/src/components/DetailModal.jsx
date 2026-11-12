import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  getCardTypeLabel,
  getStudyStatusLabel,
  getEffectiveCardStatus,
  parseExamples,
} from '../constants/cards';
import { isCardDue } from '../services/ankiScheduler';

export default function DetailModal({
  card,
  status = 'unseen',
  srsState = null,
  onStatusChange,
  onClose,
  onEditCard,
  onDeleteCard,
}) {
  const { t } = useTranslation(['study', 'common']);
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
  const displayStatus = getEffectiveCardStatus(status, srsState);
  const isDue = Boolean(
    srsState &&
      srsState.state !== 'new' &&
      (srsState.is_due || isCardDue(srsState))
  );
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
        className="bg-white border border-slate-200 rounded-surface shadow-sm max-w-2xl w-full max-h-[85vh] flex flex-col animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 rounded-t-surface flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="lesson">
              {card.lesson || t('study:flashcard.generalLesson')}
            </Badge>
            {card.level && <Badge variant="level">{card.level}</Badge>}
            {card.card_type && getCardTypeLabel(card.card_type) && (
              <Badge variant="type">{getCardTypeLabel(card.card_type)}</Badge>
            )}
            <Badge variant={displayStatus}>
              {getStudyStatusLabel(displayStatus)}
            </Badge>
            {srsState && srsState.state !== 'new' && (
              <Badge variant={isDue ? 'due' : 'srs'}>
                {isDue
                  ? t('study:flashcard.dueBadge')
                  : t('study:detail.cycleBadge', {
                      interval: srsState.interval_display,
                    })}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {(card.can_edit ?? (card.can_manage || card.is_owner)) &&
              onEditCard && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    onClose();
                    onEditCard(card);
                  }}
                  aria-label={t('study:detail.editAria', { frontText })}
                >
                  <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            {(card.can_delete ?? (card.can_manage || card.is_owner)) &&
              onDeleteCard && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDeleteCard(card)}
                  aria-label={t('study:detail.deleteAria', { frontText })}
                >
                  <TrashIcon className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            <Button
              variant="secondary"
              size="icon"
              onClick={onClose}
              aria-label={t('study:detail.closeAria')}
            >
              <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 sm:gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2
              id="detail-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              <RubyText text={frontText} reading={reading} />
            </h2>
            <AudioPlayer text={frontText} />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">
              {t('study:detail.meaningLabel')}
            </span>
            <div className="bg-sky-50 border border-sky-200 rounded-surface p-4 text-sky-900 font-semibold text-base">
              {card.meaning}
            </div>
          </div>

          {card.conjugation && (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                {t('study:detail.conjugationLabel')}
              </span>
              <div className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-surface text-sky-800 text-base font-medium font-jp">
                {card.conjugation}
              </div>
            </div>
          )}

          {card.usage_notes && (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                {t('study:detail.usageNotesLabel')}
              </span>
              <div className="bg-slate-50 border border-slate-200 border-l-2 border-l-sky-700 p-4 text-sm text-slate-700 rounded-surface">
                {card.usage_notes}
              </div>
            </div>
          )}

          {examples.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="block text-xs font-medium text-slate-500 tabular-nums">
                {t('study:detail.examplesCount', { count: examples.length })}
              </span>
              <div className="flex flex-col gap-2">
                {examples.map((ex, idx) => (
                  <GrammarExample key={idx} example={ex} index={idx} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 pb-4 shrink-0">
          <ReviewRating
            currentStatus={status}
            srsState={srsState}
            showIntervals
            onRate={(nextStatus) => onStatusChange?.(card.id, nextStatus)}
          />
        </div>
      </div>
    </div>
  );
}

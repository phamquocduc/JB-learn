import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import CommonTable from './ui/CommonTable';
import Button from './ui/Button';
import Badge from './ui/Badge';
import RubyText from './ui/RubyText';
import AudioPlayer from './ui/AudioPlayer';
import EmptyState from './ui/EmptyState';
import {
  getStudyStatusLabel,
  getEffectiveCardStatus,
} from '../constants/cards';
import { isCardDue } from '../services/ankiScheduler';

export default function TableView({
  cards = [],
  statusMap = {},
  srsMap = {},
  onSelectCard,
  onEditCard,
  onDeleteCard,
}) {
  const { t } = useTranslation(['study', 'common']);
  const getCardMeta = (card) => {
    const frontText = card.front_text || card.grammar;
    const reading = card.extra_data?.reading || '';
    const cardSrs = srsMap[String(card.id)] || null;
    const status = statusMap[String(card.id)] || cardSrs?.status || 'unseen';
    const displayStatus = getEffectiveCardStatus(status, cardSrs);
    const isDue = Boolean(
      cardSrs &&
        cardSrs.state !== 'new' &&
        (cardSrs.is_due || isCardDue(cardSrs))
    );
    const canEdit = Boolean(card.can_edit ?? (card.can_manage || card.is_owner));
    const canDelete = Boolean(
      card.can_delete ?? (card.can_manage || card.is_owner)
    );

    return {
      frontText,
      reading,
      cardSrs,
      displayStatus,
      isDue,
      canEdit,
      canDelete,
    };
  };

  const renderRowActions = (card, meta) => (
    <div
      className="inline-flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <AudioPlayer text={meta.frontText} compact />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onSelectCard(card)}
      >
        {t('study:table.detailButton')}
      </Button>
      {meta.canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEditCard(card)}
          aria-label={t('study:table.editAria', { frontText: meta.frontText })}
        >
          <PencilSquareIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
      {meta.canDelete && (
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDeleteCard(card)}
          aria-label={t('study:table.deleteAria', { frontText: meta.frontText })}
        >
          <TrashIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );

  const columns = [
    {
      key: 'lesson',
      header: t('study:table.columns.lesson'),
      headerClassName: 'w-24',
      render: (card) => (
        <Badge variant="lesson">
          {card.lesson || t('study:table.generalLesson')}
        </Badge>
      ),
    },
    {
      key: 'front',
      header: t('study:table.columns.front'),
      headerClassName: 'w-52',
      cellClassName: 'font-semibold text-sm sm:text-base text-slate-900',
      render: (card) => {
        const { frontText, reading } = getCardMeta(card);
        return <RubyText text={frontText} reading={reading} />;
      },
    },
    {
      key: 'meaning',
      header: t('study:table.columns.meaning'),
      cellClassName: 'text-sm text-slate-900',
      render: (card) => card.meaning,
    },
    {
      key: 'conjugation',
      header: t('study:table.columns.conjugation'),
      headerClassName: 'w-44',
      cellClassName: 'text-sm text-sky-800 font-jp',
      render: (card) => card.conjugation || '—',
    },
    {
      key: 'status',
      header: t('study:table.columns.status'),
      align: 'center',
      headerClassName: 'w-36',
      render: (card) => {
        const { cardSrs, displayStatus, isDue } = getCardMeta(card);
        return (
          <div className="inline-flex flex-col items-center gap-1">
            <Badge variant={displayStatus}>
              {getStudyStatusLabel(displayStatus)}
            </Badge>
            {cardSrs && cardSrs.state !== 'new' && (
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  isDue ? 'text-amber-700' : 'text-slate-500'
                }`}
              >
                {isDue ? t('study:table.dueBadge') : cardSrs.interval_display}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('study:table.columns.actions'),
      align: 'right',
      headerClassName: 'w-40',
      render: (card) => renderRowActions(card, getCardMeta(card)),
    },
  ];

  return (
    <CommonTable
      columns={columns}
      data={cards}
      getRowKey={(card, idx) => card.id || card.front_text || card.grammar || idx}
      onRowClick={onSelectCard}
      mobileRowClassName="flex flex-col gap-2.5"
      renderMobileRow={(card) => {
        const meta = getCardMeta(card);
        return (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="font-semibold text-base text-slate-900">
                  <RubyText text={meta.frontText} reading={meta.reading} />
                </div>
                <span className="text-sm text-slate-700">{card.meaning}</span>
                {card.conjugation && (
                  <span className="text-xs text-sky-800 font-jp">
                    {card.conjugation}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={meta.displayStatus}>
                  {getStudyStatusLabel(meta.displayStatus)}
                </Badge>
                {meta.cardSrs && meta.cardSrs.state !== 'new' && (
                  <span
                    className={`text-[11px] font-medium tabular-nums ${
                      meta.isDue ? 'text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    {meta.isDue ? t('study:table.dueBadge') : meta.cardSrs.interval_display}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <Badge variant="lesson">
                {card.lesson || t('study:table.generalLesson')}
              </Badge>
              {renderRowActions(card, meta)}
            </div>
          </>
        );
      }}
      emptyState={
        <EmptyState
          title={t('study:flashcard.emptyTitle')}
          description={t('study:flashcard.emptyDesc')}
        />
      }
      ariaLabel={t('study:table.ariaLabel')}
    />
  );
}

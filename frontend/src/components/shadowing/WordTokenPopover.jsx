import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookmarkSquareIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import RubyText from '../ui/RubyText';
import { useAuth } from '../../context/useAuth';
import { useSystemConfig } from '../../context/useSystemConfig';
import { createCard } from '../../services/api';
import { getCardTypeLabel } from '../../constants/cards';

/**
 * WordTokenPopover
 * Interactive dictionary popover displayed when clicking an underlined Japanese token.
 * Provides Furigana readings, meanings, JLPT level, audio utterance,
 * and 1-click card creation into /api/cards/.
 */
export default function WordTokenPopover({
  tokenData,
  onClose,
  _position = { top: 0, left: 0 },
  _currentUser = null,
}) {
  const { t } = useTranslation(['shadowing', 'common']);
  const { isGuest, openAuthModal, hasPermission } = useAuth();
  const { isModuleEnabled } = useSystemConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const personalCardsVisible = isModuleEnabled('study.personal_cards');
  const canSaveCard = Boolean(
    (isGuest && personalCardsVisible) ||
      hasPermission('cards.create') ||
      (hasPermission('cards.create_own') && personalCardsVisible)
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!tokenData) return null;

  const frontText = tokenData.token || tokenData.text || '';
  const reading = tokenData.reading || tokenData.furigana || '';
  const meaning = tokenData.meaning || tokenData.vietnamese || '';
  const level = tokenData.level || 'N3';

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(frontText);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveCard = async () => {
    if (isSaving || savedSuccess) return;
    if (isGuest) {
      onClose?.();
      openAuthModal('login');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await createCard({
        front_text: frontText,
        reading: reading,
        meaning: meaning || frontText,
        card_type: 'vocabulary',
        level: level,
        is_public: false,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (err) {
      // If unauthenticated guest, save locally or notify
      setErrorMessage(
        err.message || t('shadowing:wordPopover.saveError')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('shadowing:wordPopover.dialogAria')}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white border-t sm:border border-slate-200 rounded-t-surface sm:rounded-surface p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-sm flex flex-col gap-3.5 sm:gap-4 text-slate-900 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <Badge variant="level">{level}</Badge>
            <Badge variant="type">{getCardTypeLabel('vocabulary')}</Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shadowing:wordPopover.closeAria')}
            className="w-8 h-8 inline-flex items-center justify-center rounded-control text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Word Display */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-slate-900 font-jp">
              {reading ? (
                <RubyText text={frontText} reading={reading} />
              ) : (
                frontText
              )}
            </div>
            {reading && reading !== frontText && (
              <span className="text-xs text-slate-500 mt-0.5 font-jp">{reading}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSpeak}
            aria-label={t('shadowing:wordPopover.speakAria')}
            className="w-9 h-9 inline-flex items-center justify-center rounded-control bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer shrink-0"
          >
            <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Meaning */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-surface">
          <span className="text-xs font-medium text-slate-500 block mb-0.5">
            {t('shadowing:wordPopover.meaningLabel')}
          </span>
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {meaning || t('shadowing:wordPopover.noMeaning')}
          </p>
        </div>

        {/* Error alert if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-control bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {canSaveCard && (
            <Button
              variant={savedSuccess ? 'secondary' : 'primary'}
              size="md"
              className="flex-1 justify-center"
              disabled={isSaving || savedSuccess}
              onClick={handleSaveCard}
            >
              {savedSuccess ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>{t('shadowing:wordPopover.savedButton')}</span>
                </>
              ) : (
                <>
                  <BookmarkSquareIcon className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isSaving
                      ? t('shadowing:wordPopover.savingButton')
                      : t('shadowing:wordPopover.saveButton')}
                  </span>
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            className={canSaveCard ? '' : 'w-full justify-center'}
            onClick={onClose}
          >
            {t('common:actions.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}

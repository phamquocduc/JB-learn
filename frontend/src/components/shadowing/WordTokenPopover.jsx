import React, { useState, useEffect } from 'react';
import {
  BookmarkSquareIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import RubyText from '../ui/RubyText';
import { createCard } from '../../services/api';

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
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        err.message || 'Không thể lưu thẻ. Vui lòng đăng nhập để đồng bộ!'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Thông tin từ vựng"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col gap-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Badge variant="level">{level}</Badge>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Từ vựng
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tra từ"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
              <span className="text-xs text-slate-500 mt-0.5">{reading}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSpeak}
            aria-label="Phát âm từ này"
            className="p-2.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <SpeakerWaveIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Meaning */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <span className="text-xs font-medium text-slate-500 block mb-0.5">
            Ý nghĩa:
          </span>
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {meaning || 'Chưa có bản dịch chi tiết'}
          </p>
        </div>

        {/* Error alert if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
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
                <span>Đã lưu vào bộ thẻ</span>
              </>
            ) : (
              <>
                <BookmarkSquareIcon className="w-4 h-4" aria-hidden="true" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu vào bộ thẻ'}</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

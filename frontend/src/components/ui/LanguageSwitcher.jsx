import { useState } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';

const LANGUAGE_OPTIONS = [
  { code: 'vi', shortLabelKey: 'language.shortVi', labelKey: 'language.vi' },
  { code: 'en', shortLabelKey: 'language.shortEn', labelKey: 'language.en' },
];

export default function LanguageSwitcher({
  variant = 'segmented',
  className = '',
  showIcon = true,
}) {
  const { t, i18n } = useTranslation('common');
  const { user, isGuest, changeLanguage } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const isAuthenticated = Boolean(user && !isGuest);
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  const handleSelect = async (nextLang) => {
    if (nextLang === currentLang || saving) return;
    setSaving(true);
    try {
      if (changeLanguage) {
        const result = await changeLanguage(nextLang);
        if (isAuthenticated && result && result.synced === false) {
          showToast(t('language.saveFailed'), 'error');
        }
      } else {
        await i18n.changeLanguage(nextLang);
      }
    } finally {
      setSaving(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div
        role="group"
        aria-label={t('language.selectAria')}
        className={`inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-control shadow-none ${className}`}
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const isActive = currentLang === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              disabled={saving}
              aria-pressed={isActive}
              aria-label={t(opt.labelKey)}
              className={`px-2 py-1 text-xs font-medium rounded-badge transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                isActive
                  ? 'bg-white text-sky-700 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              {t(opt.shortLabelKey)}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={`flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          {showIcon && (
            <GlobeAltIcon className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          )}
          <span className="text-xs font-medium text-slate-700 truncate">
            {t('language.label')}
          </span>
        </div>
        <div
          role="group"
          aria-label={t('language.selectAria')}
          className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-control shrink-0"
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const isActive = currentLang === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                disabled={saving}
                aria-pressed={isActive}
                aria-label={t(opt.labelKey)}
                className={`px-2 py-1 text-xs font-medium rounded-badge transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                  isActive
                    ? 'bg-white text-sky-700 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                {t(opt.shortLabelKey)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('language.selectAria')}
      className={`grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-control shadow-none ${className}`}
    >
      {LANGUAGE_OPTIONS.map((opt) => {
        const isActive = currentLang === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => handleSelect(opt.code)}
            disabled={saving}
            aria-pressed={isActive}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-badge transition-colors duration-150 flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
              isActive
                ? 'bg-white text-sky-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 border border-transparent'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

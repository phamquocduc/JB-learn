import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import { formatNumber } from '../../utils/formatters';

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}) {
  const { t } = useTranslation(['admin', 'common']);
  const resolvedPlaceholder = placeholder ?? t('admin:shared.searchPlaceholder');
  const resolvedAriaLabel = ariaLabel ?? t('common:actions.search');

  return (
    <div className="relative flex-1 min-w-0 flex items-center">
      <MagnifyingGlassIcon
        className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        aria-label={resolvedAriaLabel}
        className="w-full h-9 sm:h-10 pl-9 pr-8 py-1.5 rounded-control border border-slate-200 bg-white hover:border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('admin:shared.clearSearchAria')}
          className="absolute right-1.5 w-6 h-6 inline-flex items-center justify-center rounded-control text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
        >
          <XMarkIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function AdminFilterPopover({
  title,
  sections = [],
  values = {},
  onApply,
  onReset,
}) {
  const { t } = useTranslation(['admin', 'common']);
  const resolvedTitle = title ?? t('admin:shared.filters');
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const touchStartY = useRef(null);

  const activeCount = sections.reduce(
    (acc, sec) => acc + (values[sec.key] ? 1 : 0),
    0
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setDraft({ ...values });
      setIsOpen(true);
    }
  };

  const handleReset = () => {
    const cleared = {};
    sections.forEach((sec) => {
      cleared[sec.key] = '';
    });
    setDraft(cleared);
    onReset?.(cleared);
    setIsOpen(false);
  };

  const handleApply = () => {
    onApply?.(draft);
    setIsOpen(false);
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    if (e.touches[0].clientY - touchStartY.current > 60) {
      touchStartY.current = null;
      setIsOpen(false);
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={resolvedTitle}
        className={`relative h-9 sm:h-10 w-9 sm:w-auto sm:px-3.5 rounded-control border text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
          activeCount > 0 || isOpen
            ? 'bg-sky-50 border-sky-300 text-sky-800'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
        }`}
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{t('admin:shared.filters')}</span>
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 sm:static inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-badge bg-sky-700 text-white text-[11px] font-medium leading-none tabular-nums">
            {formatNumber(activeCount)}
          </span>
        )}
        <ChevronDownIcon
          className={`hidden sm:inline w-4 h-4 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 sm:bg-slate-900/5 transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={resolvedTitle}
            className={`fixed inset-x-0 bottom-0 z-50 w-full max-h-[85dvh] overflow-y-auto rounded-t-surface bg-white border-t border-slate-200 shadow-sm p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 flex flex-col gap-4 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1.5 ${
              sections.length > 1 ? 'sm:w-[460px]' : 'sm:w-80'
            } sm:max-h-none sm:overflow-visible sm:rounded-surface sm:border animate-popup-in`}
          >
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex flex-col gap-3"
            >
              <div
                className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden"
                aria-hidden="true"
              />
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900">{resolvedTitle}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('admin:shared.closeFiltersAria')}
                >
                  <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div
              className={`grid grid-cols-1 ${
                sections.length > 1 ? 'sm:grid-cols-2' : ''
              } gap-4`}
            >
              {sections.map((sec) => (
                <div key={sec.key} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`admin-filter-${sec.key}`}
                    className="text-xs font-medium text-slate-700"
                  >
                    {sec.label}
                  </label>
                  <Dropdown
                    id={`admin-filter-${sec.key}`}
                    value={draft[sec.key] ?? ''}
                    onChange={(val) =>
                      setDraft((prev) => ({ ...prev, [sec.key]: val }))
                    }
                    options={sec.options}
                    ariaLabel={sec.label}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                size="md"
                onClick={handleReset}
                className="flex-1 sm:flex-initial"
              >
                {t('admin:shared.reset')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleApply}
                className="flex-1 sm:flex-initial"
              >
                {t('admin:shared.apply')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminFilterChips({ chips = [], onClearAll }) {
  const { t } = useTranslation('admin');
  if (!chips.length) return null;

  return (
    <div className="px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-control bg-sky-50 text-sky-800 border border-sky-200 text-xs font-medium"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={t('admin:shared.removeFilterAria', { label: chip.label })}
            className="w-4 h-4 rounded-badge inline-flex items-center justify-center hover:bg-sky-100 text-sky-800 transition-colors duration-150 cursor-pointer"
          >
            <XMarkIcon className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded-control transition-colors duration-150 cursor-pointer"
        >
          {t('admin:shared.clearAll')}
        </button>
      )}
    </div>
  );
}

export function AdminPagination({
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  embedded = true,
}) {
  const { t } = useTranslation(['admin', 'common']);
  if (totalPages <= 1 && total === 0) return null;

  return (
    <div
      className={
        embedded
          ? 'px-3 sm:px-4 py-2.5 bg-slate-50 border-t border-slate-200 rounded-b-surface flex items-center justify-between gap-4'
          : 'flex items-center justify-between gap-4 pt-2'
      }
    >
      <span className="text-xs sm:text-sm font-normal text-slate-600 tabular-nums">
        {t('admin:shared.pageLabel')}{' '}
        <strong className="font-semibold text-slate-900">
          {formatNumber(page)}
        </strong>{' '}
        / {formatNumber(totalPages)}
        {' • '}
        <strong className="font-semibold text-slate-900">
          {formatNumber(total)}
        </strong>{' '}
        {t('admin:shared.itemsUnit')}
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          aria-label={t('common:pagination.prevPage')}
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          aria-label={t('common:pagination.nextPage')}
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function AdminModalShell({
  isOpen,
  onClose,
  title,
  maxWidthClass = 'sm:max-w-lg',
  children,
}) {
  const { t } = useTranslation('admin');

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-in"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 w-full ${maxWidthClass} max-h-[90dvh] bg-white rounded-t-surface sm:rounded-surface border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-popup-in`}
      >
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            disabled={!onClose}
            onClick={onClose}
            aria-label={t('admin:shared.closeDialogAria')}
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 flex-1 min-h-0 overflow-y-auto space-y-3.5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message = '',
  confirmLabel,
  variant = 'destructive',
  submitting = false,
}) {
  const { t } = useTranslation('admin');
  const resolvedTitle = title ?? t('admin:shared.confirmTitle');
  const resolvedConfirmLabel = confirmLabel ?? t('admin:shared.confirmAction');

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={resolvedTitle}
      maxWidthClass="sm:max-w-md"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-surface bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
          <ExclamationTriangleIcon className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{message}</p>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          {t('admin:shared.cancel')}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={submitting}>
          {submitting ? t('admin:shared.processing') : resolvedConfirmLabel}
        </Button>
      </div>
    </AdminModalShell>
  );
}

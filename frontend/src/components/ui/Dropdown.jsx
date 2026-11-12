import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import {
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

function foldSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export default function Dropdown({
  id,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  searchable,
  searchPlaceholder,
  ariaLabel,
  className = '',
  triggerClassName = '',
}) {
  const { t } = useTranslation('common');
  const resolvedPlaceholder = placeholder ?? t('dropdown.placeholder');
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('dropdown.searchPlaceholder');
  const fallbackId = useId();
  const baseId = id || fallbackId;
  const listboxId = `${baseId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'object' && opt !== null
          ? {
              value: String(opt.value ?? ''),
              label: opt.label ?? String(opt.value ?? ''),
            }
          : { value: String(opt), label: String(opt) }
      ),
    [options]
  );

  const isSearchable = searchable ?? normalizedOptions.length >= 8;

  const selectedIndex = useMemo(
    () =>
      normalizedOptions.findIndex(
        (opt) => opt.value === String(value ?? '')
      ),
    [normalizedOptions, value]
  );

  const selectedOption =
    selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  const filteredOptions = useMemo(() => {
    if (!isSearchable) return normalizedOptions;
    const q = foldSearchText(searchQuery);
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) =>
        foldSearchText(opt.label).includes(q) ||
        foldSearchText(opt.value).includes(q)
    );
  }, [isSearchable, normalizedOptions, searchQuery]);

  const computeShouldOpenUpward = () => {
    const triggerEl = triggerRef.current;
    if (
      !triggerEl ||
      typeof window === 'undefined' ||
      typeof triggerEl.getBoundingClientRect !== 'function'
    ) {
      return false;
    }
    const rect = triggerEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    const scrollParent = triggerEl.closest?.('.overflow-y-auto, [role="dialog"]');
    const parentRect =
      scrollParent && typeof scrollParent.getBoundingClientRect === 'function'
        ? scrollParent.getBoundingClientRect()
        : null;

    const bottomBoundary =
      parentRect && parentRect.height > 0
        ? Math.min(window.innerHeight, parentRect.bottom)
        : window.innerHeight;
    const topBoundary =
      parentRect && parentRect.height > 0
        ? Math.max(0, parentRect.top)
        : 0;

    const spaceBelow = bottomBoundary - rect.bottom;
    const spaceAbove = rect.top - topBoundary;
    const estimatedMenuHeight =
      Math.min(208, normalizedOptions.length * 38 + 12) +
      (isSearchable ? 48 : 0);

    return spaceBelow < estimatedMenuHeight + 12 && spaceAbove > spaceBelow;
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDownOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleCaptureEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, {
      passive: true,
    });
    window.addEventListener('keydown', handleCaptureEscape, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      window.removeEventListener('keydown', handleCaptureEscape, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || focusedIndex < 0 || !listRef.current) return;
    const itemEl = listRef.current.children[focusedIndex];
    if (itemEl && typeof itemEl.scrollIntoView === 'function') {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, focusedIndex]);

  const openMenu = () => {
    setSearchQuery('');
    setOpenUpward(computeShouldOpenUpward());
    setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
    if (
      isSearchable &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: fine)').matches
    ) {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      openMenu();
    }
  };

  const handleSelect = (nextVal) => {
    onChange?.(nextVal);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleNavigationKeyDown = (e, fromSearchInput = false) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'Enter' ||
        e.key === ' '
      ) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setFocusedIndex((prev) =>
          prev + 1 < filteredOptions.length ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setFocusedIndex((prev) =>
          prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (!fromSearchInput && e.key === 'Home') {
      e.preventDefault();
      if (filteredOptions.length > 0) setFocusedIndex(0);
    } else if (!fromSearchInput && e.key === 'End') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setFocusedIndex(filteredOptions.length - 1);
      }
    } else if (e.key === 'Enter' || (!fromSearchInput && e.key === ' ')) {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[focusedIndex].value);
      }
    }
  };

  const activeDescendantId =
    isOpen && focusedIndex >= 0 && focusedIndex < filteredOptions.length
      ? `${baseId}-option-${focusedIndex}`
      : undefined;

  return (
    <div
      ref={containerRef}
      data-dropdown-open={isOpen ? 'true' : undefined}
      className={`relative ${className}`}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        aria-label={ariaLabel}
        onClick={handleToggle}
        onKeyDown={(e) => handleNavigationKeyDown(e, false)}
        className={`w-full min-h-10 px-3.5 py-2 rounded-control border text-sm font-normal inline-flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
          isOpen
            ? 'bg-white border-sky-700 text-slate-900'
            : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
        } ${triggerClassName}`}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : resolvedPlaceholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-sky-700' : 'text-slate-500'
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && normalizedOptions.length > 0 && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-surface bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-popup-in ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {isSearchable && (
            <div className="p-2 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="relative flex items-center">
                <MagnifyingGlassIcon
                  className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(0);
                  }}
                  onKeyDown={(e) => handleNavigationKeyDown(e, true)}
                  placeholder={resolvedSearchPlaceholder}
                  aria-label={resolvedSearchPlaceholder}
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendantId}
                  className="w-full h-8 pl-8 pr-7 rounded-control bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFocusedIndex(0);
                      searchInputRef.current?.focus();
                    }}
                    aria-label={t('dropdown.clearSearchAria')}
                    className="absolute right-1 w-6 h-6 rounded-control inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-56 overflow-y-auto p-1 flex flex-col gap-0.5"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500 select-none">
                {t('dropdown.empty')}
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === String(value ?? '');
                const isFocused = idx === focusedIndex;
                return (
                  <li
                    key={opt.value}
                    id={`${baseId}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 rounded-control text-left text-sm flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-sky-50 text-sky-800 font-medium'
                        : isFocused
                          ? 'bg-slate-100 text-slate-900 font-normal'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-normal'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <CheckIcon
                        className="w-4 h-4 text-sky-700 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

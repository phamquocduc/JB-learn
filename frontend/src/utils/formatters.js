import i18n, { normalizeLanguage } from '../i18n';

const LOCALE_MAP = {
  vi: 'vi-VN',
  en: 'en-US',
};

export function getIntlLocale(lang) {
  const normalized = normalizeLanguage(lang || i18n.language);
  return LOCALE_MAP[normalized] || LOCALE_MAP.vi;
}

export function formatNumber(value, options = {}, lang) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  return new Intl.NumberFormat(getIntlLocale(lang), options).format(Number(value));
}

export function formatDate(value, options = {}, lang) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return date.toLocaleDateString(getIntlLocale(lang), { ...defaultOptions, ...options });
}

export function formatDateTime(value, options = {}, lang) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleString(getIntlLocale(lang), { ...defaultOptions, ...options });
}

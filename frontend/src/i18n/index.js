import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import viCommon from '../locales/vi/common.json';
import viAuth from '../locales/vi/auth.json';
import viStudy from '../locales/vi/study.json';
import viShadowing from '../locales/vi/shadowing.json';
import viAdmin from '../locales/vi/admin.json';
import viRbac from '../locales/vi/rbac.json';
import viErrors from '../locales/vi/errors.json';

import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enStudy from '../locales/en/study.json';
import enShadowing from '../locales/en/shadowing.json';
import enAdmin from '../locales/en/admin.json';
import enRbac from '../locales/en/rbac.json';
import enErrors from '../locales/en/errors.json';

export const LANGUAGE_STORAGE_KEY = 'jb_app_language';
export const SUPPORTED_LANGUAGES = ['vi', 'en'];
export const DEFAULT_LANGUAGE = 'vi';

export function normalizeLanguage(lang) {
  if (!lang || typeof lang !== 'string') return DEFAULT_LANGUAGE;
  const code = lang.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE;
}

function getInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) return normalizeLanguage(stored);
  } catch {
    // Ignore storage access errors in private contexts
  }
  return DEFAULT_LANGUAGE;
}

export function getActiveLanguage() {
  return normalizeLanguage(i18n.language);
}

export function syncDocumentLanguage(lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeLanguage(lang);
  }
}

export const resources = {
  vi: {
    common: viCommon,
    auth: viAuth,
    study: viStudy,
    shadowing: viShadowing,
    admin: viAdmin,
    rbac: viRbac,
    errors: viErrors,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    study: enStudy,
    shadowing: enShadowing,
    admin: enAdmin,
    rbac: enRbac,
    errors: enErrors,
  },
};

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ['common', 'auth', 'study', 'shadowing', 'admin', 'rbac', 'errors'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

syncDocumentLanguage(initialLanguage);

i18n.on('languageChanged', (lng) => {
  const normalized = normalizeLanguage(lng);
  syncDocumentLanguage(normalized);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage access errors
    }
  }
});

export default i18n;

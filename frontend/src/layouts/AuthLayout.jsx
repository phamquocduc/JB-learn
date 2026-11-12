import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChartBarIcon,
  FlagIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import {
  AppleLogoSvg,
  BotanicalLeavesSvg,
  GoogleLogoSvg,
  JlptStepsCloudsSvg,
  MountFujiSvg,
} from '../components/ui/SvgIcons';

function LoginIllustration() {
  return (
    <div
      className="relative w-full max-w-[280px] h-52 mx-auto my-2 flex items-center justify-center select-none"
      aria-hidden="true"
    >
      {/* Decorative soft background circles */}
      <div className="absolute -left-3 bottom-2 w-24 h-24 rounded-full bg-sky-100/80" />
      <div className="absolute right-2 top-2 w-16 h-16 rounded-full bg-sky-100/60" />

      {/* Decorative botanical leaves */}
      <BotanicalLeavesSvg className="absolute left-7 top-12 w-10 h-12 text-sky-600" />

      {/* Back card: 日本語 + Mount Fuji */}
      <div className="relative z-10 translate-x-7 -translate-y-2 w-36 h-36 rounded-surface bg-white border border-sky-200 p-3.5 flex flex-col justify-between overflow-hidden">
        <div className="flex items-start justify-between">
          <span className="text-lg font-bold font-jp text-sky-700 tracking-wide mt-2">
            日本語
          </span>
          <span className="w-5 h-5 rounded-full bg-orange-300 shrink-0" />
        </div>

        <MountFujiSvg className="w-full h-16 -mx-3.5 -mb-3.5 text-sky-600" />
      </div>

      {/* Front tilted study notebook card */}
      <div className="absolute z-20 left-5 bottom-3 w-36 h-28 -rotate-12 rounded-surface bg-white border border-slate-200 p-3 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="flex flex-col gap-1.5">
            <span className="h-1.5 w-full rounded-full bg-sky-200" />
            <span className="h-1.5 w-4/5 rounded-full bg-slate-200" />
            <span className="h-1.5 w-full rounded-full bg-slate-200" />
            <span className="h-1.5 w-3/4 rounded-full bg-sky-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="h-1.5 w-full rounded-full bg-slate-200" />
            <span className="h-1.5 w-full rounded-full bg-sky-200" />
            <span className="h-1.5 w-3/4 rounded-full bg-slate-200" />
            <span className="h-1.5 w-4/5 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="h-2.5 w-full rounded-badge bg-sky-700" />
      </div>
    </div>
  );
}

function RegisterIllustration() {
  return (
    <div
      className="relative w-full max-w-[280px] h-52 mx-auto my-2 flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <JlptStepsCloudsSvg className="w-full h-full" />

      {/* Flag at summit */}
      <div className="absolute top-3 right-[74px] flex flex-col items-center">
        <FlagIcon className="w-5 h-5 text-sky-700 fill-sky-700" />
      </div>

      {/* JLPT Milestone Badges */}
      <span className="absolute top-10 right-[58px] px-2.5 py-1 rounded-badge bg-sky-700 text-white text-xs font-semibold">
        N3
      </span>
      <span className="absolute top-[86px] left-[86px] px-2 py-0.5 rounded-badge bg-sky-700 text-white text-[11px] font-medium">
        N2
      </span>
      <span className="absolute bottom-[54px] left-[38px] px-2 py-0.5 rounded-badge bg-sky-700 text-white text-[11px] font-medium">
        N1
      </span>
      <span className="absolute bottom-[30px] right-[42px] px-2 py-0.5 rounded-badge bg-sky-700 text-white text-[11px] font-medium">
        N5
      </span>
    </div>
  );
}

export function AuthBrandPanel({ mode = 'login' }) {
  const { t } = useTranslation('auth');
  const isLogin = mode === 'login';

  return (
    <div className="hidden md:flex md:col-span-5 h-full bg-sky-50 border-r border-slate-200 p-6 lg:p-8 flex-col justify-between relative overflow-hidden">
      {/* Brand header */}
      <div className="relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 rounded-control focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
        >
          <div className="w-8 h-8 rounded-control bg-sky-700 text-white flex items-center justify-center">
            <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold text-slate-900 tracking-tight">
            {t('brand.name')}
          </span>
        </Link>

        <div className="mt-6">
          <h2 className="text-lg lg:text-xl font-semibold text-slate-900 leading-snug tracking-tight">
            {isLogin ? (
              <>
                {t('brand.loginHeadline1')}
                <br />
                {t('brand.loginHeadline2')}
              </>
            ) : (
              <>
                {t('brand.registerHeadline1')}
                <br />
                {t('brand.registerHeadline2')}
              </>
            )}
          </h2>
        </div>
      </div>

      {/* Center visual illustration */}
      <div className="relative z-10 my-auto py-2">
        {isLogin ? <LoginIllustration /> : <RegisterIllustration />}
      </div>

      {/* Bottom 3 value highlights */}
      <div className="relative z-10 grid grid-cols-3 divide-x divide-sky-200 pt-4 border-t border-sky-200">
        <div className="pr-3 flex flex-col gap-1.5">
          <SparklesIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600 leading-tight">
            {t('brand.highlight1Line1')}
            <br />
            {t('brand.highlight1Line2')}
          </span>
        </div>
        <div className="px-3 flex flex-col gap-1.5">
          <BookOpenIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600 leading-tight">
            {t('brand.highlight2Line1')}
            <br />
            {t('brand.highlight2Line2')}
          </span>
        </div>
        <div className="pl-3 flex flex-col gap-1.5">
          <ChartBarIcon className="w-4 h-4 text-sky-700" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600 leading-tight">
            {t('brand.highlight3Line1')}
            <br />
            {t('brand.highlight3Line2')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AuthFormTopBar({ onClose, showBackLink = false }) {
  const { t } = useTranslation('auth');

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 md:hidden rounded-control focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
        >
          <div className="w-8 h-8 rounded-control bg-sky-700 text-white flex items-center justify-center shrink-0">
            <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {t('brand.name')}
          </span>
        </Link>

        {showBackLink && (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
          >
            <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('topBar.home')}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <LanguageSwitcher variant="compact" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('topBar.closeAria')}
            className="w-8 h-8 inline-flex items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthOAuthSection({ mode = 'login', onOAuthClick }) {
  const { t } = useTranslation('auth');
  const dividerText =
    mode === 'login' ? t('oauth.loginDivider') : t('oauth.registerDivider');

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="relative px-3 bg-white text-xs text-slate-400 shrink-0">
          {dividerText}
        </span>
        <div className="w-full border-t border-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onOAuthClick?.('Google')}
          className="min-h-10 px-3 py-2 rounded-control border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
        >
          <GoogleLogoSvg />
          <span>{t('oauth.google')}</span>
        </button>

        <button
          type="button"
          onClick={() => onOAuthClick?.('Apple')}
          className="min-h-10 px-3 py-2 rounded-control border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
        >
          <AppleLogoSvg />
          <span>{t('oauth.apple')}</span>
        </button>
      </div>
    </div>
  );
}

export default function AuthLayout() {
  return (
    <div className="min-h-screen md:h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto md:overflow-hidden">
      <main className="w-full max-w-4xl md:h-[80vh] flex items-center justify-center my-auto">
        <Outlet />
      </main>
    </div>
  );
}

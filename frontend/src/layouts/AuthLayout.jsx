import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChevronDownIcon,
  FlagIcon,
  GlobeAltIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
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
      <div className="relative z-10 translate-x-7 -translate-y-2 w-36 h-36 rounded-2xl bg-white border border-sky-100 shadow-sm p-3.5 flex flex-col justify-between overflow-hidden">
        <div className="flex items-start justify-between">
          <span className="text-lg font-extrabold text-sky-700 tracking-wide mt-2">
            日本語
          </span>
          <span className="w-5 h-5 rounded-full bg-orange-300 shrink-0" />
        </div>

        <MountFujiSvg className="w-full h-16 -mx-3.5 -mb-3.5 text-sky-600" />
      </div>

      {/* Front tilted study notebook card */}
      <div className="absolute z-20 left-5 bottom-3 w-36 h-28 -rotate-12 rounded-xl bg-white shadow-sm p-3 flex flex-col justify-between">
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
        <div className="h-2.5 w-full rounded-md bg-sky-600" />
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
        <FlagIcon className="w-6 h-6 text-sky-600 fill-sky-600" />
      </div>

      {/* JLPT Milestone Badges */}
      <span className="absolute top-10 right-[58px] px-3.5 py-1 rounded-full bg-sky-600 text-white text-xs font-bold shadow-sm">
        N3
      </span>
      <span className="absolute top-[86px] left-[86px] px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-bold shadow-sm">
        N2
      </span>
      <span className="absolute bottom-[54px] left-[38px] px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-bold shadow-sm">
        N1
      </span>
      <span className="absolute bottom-[30px] right-[42px] px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-bold shadow-sm">
        N5
      </span>
    </div>
  );
}

export function AuthBrandPanel({ mode = 'login' }) {
  const isLogin = mode === 'login';

  return (
    <div className="hidden md:flex md:col-span-5 h-full bg-sky-50/80 p-7 lg:p-10 flex-col justify-between relative overflow-hidden">
      {/* Decorative top corner shape */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-sky-100/70"
        aria-hidden="true"
      />

      {/* Brand header */}
      <div className="relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
            <BookOpenIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">
            JB Learn
          </span>
        </Link>

        <div className="mt-8">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 leading-snug">
            {isLogin ? (
              <>
                Học ngôn ngữ
                <br />
                với lộ trình rõ ràng
              </>
            ) : (
              <>
                Bắt đầu hành trình
                <br />
                học ngôn ngữ của bạn
              </>
            )}
          </h2>
          <p className="mt-2.5 text-xs lg:text-sm text-slate-600 leading-relaxed">
            {isLogin
              ? 'Từ vựng, ngữ pháp, nghe, nói — tất cả trong một nơi.'
              : 'Cùng JB Learn xây dựng thói quen học tập tốt hơn mỗi ngày.'}
          </p>
        </div>
      </div>

      {/* Center visual illustration */}
      <div className="relative z-10 my-auto py-2">
        {isLogin ? <LoginIllustration /> : <RegisterIllustration />}
      </div>

      {/* Bottom 3 value highlights */}
      <div className="relative z-10 grid grid-cols-3 divide-x divide-sky-200/80 pt-4">
        <div className="pr-3 flex flex-col gap-1.5">
          <SparklesIcon className="w-5 h-5 text-sky-600" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600 leading-tight">
            Lộ trình
            <br />
            cá nhân hóa
          </span>
        </div>
        <div className="px-3 flex flex-col gap-1.5">
          <BookOpenIcon className="w-5 h-5 text-sky-600" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600 leading-tight">
            Học mọi lúc
            <br />
            mọi nơi
          </span>
        </div>
        <div className="pl-3 flex flex-col gap-1.5">
          <ChartBarIcon className="w-5 h-5 text-sky-600" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600 leading-tight">
            Theo dõi
            <br />
            tiến độ
          </span>
        </div>
      </div>
    </div>
  );
}

export function AuthFormTopBar({ onClose, showBackLink = false }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 md:hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
            <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-slate-900">JB Learn</span>
        </Link>

        {showBackLink && (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded-lg"
          >
            <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 select-none"
          aria-label="Ngôn ngữ hiển thị: Tiếng Việt"
        >
          <GlobeAltIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>VI</span>
          <ChevronDownIcon className="w-3 h-3 text-slate-400" aria-hidden="true" />
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthOAuthSection({ mode = 'login', onOAuthClick }) {
  const dividerText =
    mode === 'login' ? 'Hoặc đăng nhập với' : 'Hoặc đăng ký với';

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
          className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <GoogleLogoSvg />
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={() => onOAuthClick?.('Apple')}
          className="min-h-10 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <AppleLogoSvg />
          <span>Apple</span>
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

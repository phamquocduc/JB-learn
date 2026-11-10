import React from 'react';
import Card from './Card';

export default function Skeleton({ variant = 'flashcard', count = 6 }) {
  if (variant === 'table') {
    return (
      <Card
        className="overflow-x-auto"
        aria-busy="true"
        aria-label="Đang tải bảng tra cứu"
      >
        <div className="bg-slate-50 border-b border-slate-200 py-3.5 px-4 grid grid-cols-6 gap-4">
          <div className="h-4 w-12 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-4 w-32 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-4 w-28 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse mx-auto" />
          <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse ml-auto" />
        </div>
        <div className="divide-y divide-slate-200">
          {Array.from({ length: count }).map((_, idx) => (
            <div
              key={idx}
              className="py-3.5 px-4 grid grid-cols-6 items-center gap-4"
            >
              <div className="h-6 w-14 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-6 w-32 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-5 w-44 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-5 w-28 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-6 w-20 bg-slate-100 rounded-md animate-pulse mx-auto" />
              <div className="flex items-center justify-end gap-1.5">
                <div className="h-9 w-9 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-9 w-16 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (variant === 'shadowing') {
    return (
      <div
        className="flex flex-col gap-4 sm:gap-5"
        aria-busy="true"
        aria-label="Đang tải thư viện shadowing"
      >
        {/* 1. Resume Hero Card Skeleton */}
        <Card rounded="2xl" className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
              <div className="hidden sm:block h-5 w-10 bg-slate-100 rounded-md animate-pulse" />
              <div className="hidden sm:block h-5 w-16 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="h-9 w-24 sm:w-36 bg-slate-100 rounded-lg animate-pulse" />
              <div className="lg:hidden w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-slate-100 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="h-5 w-3/4 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-full h-11 rounded-lg bg-slate-200 animate-pulse" />
        </Card>

        {/* 2. 3-Column Statistics Bar Skeleton */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card
              key={idx}
              rounded="xl"
              className="p-3 sm:p-4 flex flex-col gap-1.5 min-w-0"
            >
              <div className="w-5 h-5 bg-slate-100 rounded animate-pulse shrink-0" />
              <div className="h-6 sm:h-7 w-10 sm:w-12 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-3.5 sm:h-4 w-14 sm:w-20 bg-slate-100 rounded animate-pulse" />
            </Card>
          ))}
        </div>

        {/* 3. Filter Controls Skeleton */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1 min-w-0">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-8 w-20 rounded-full bg-slate-100 animate-pulse shrink-0"
                />
              ))}
            </div>
            <div className="flex-1 sm:flex-none sm:w-64 h-10 sm:h-9 rounded-xl sm:rounded-lg bg-slate-100 animate-pulse" />
            <div className="sm:hidden w-10 h-10 rounded-xl bg-slate-100 animate-pulse shrink-0" />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-0.5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-7 w-14 rounded-full bg-slate-100 animate-pulse shrink-0"
              />
            ))}
          </div>
        </div>

        {/* 4. Responsive Video Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, idx) => (
            <Card
              key={idx}
              rounded="2xl"
              className="rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-video w-full bg-slate-100 animate-pulse" />
              <div className="p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 bg-slate-100 rounded-md animate-pulse" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
                <div className="h-5 w-full bg-slate-100 rounded-md animate-pulse" />
                <div className="w-full h-1.5 bg-slate-100 rounded-full animate-pulse mt-1" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'shadowing-workspace') {
    return (
      <div
        className="flex-1 flex flex-col gap-3 min-w-0"
        aria-busy="true"
        aria-label="Đang tải phòng luyện shadowing"
      >
        {/* Workspace Top Bar Card */}
        <Card rounded="xl" className="p-2.5 sm:p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse shrink-0" />
              <div className="h-5 flex-1 max-w-48 sm:max-w-64 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-5 w-10 bg-slate-100 rounded-md animate-pulse shrink-0" />
            </div>
            <div className="lg:hidden w-9 h-9 rounded-lg bg-slate-100 animate-pulse shrink-0" />
          </div>
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 bg-slate-100 p-1 rounded-xl sm:rounded-lg shrink-0">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="min-h-11 sm:min-h-9 sm:w-24 rounded-lg sm:rounded-md bg-slate-200/80 animate-pulse"
              />
            ))}
          </div>
        </Card>

        {/* 2-Column Stage & Transcript Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start min-w-0">
          {/* Left Stage */}
          <div className="lg:col-span-8 min-w-0 flex flex-col gap-3">
            <Card rounded="2xl" className="rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse" />
            </Card>
            {/* Dark Subtitle Box */}
            <div className="min-h-[76px] sm:min-h-[88px] bg-slate-800 rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 text-center flex flex-col items-center justify-center gap-2">
              <div className="h-5 sm:h-6 w-3/4 bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-700 rounded animate-pulse" />
            </div>
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl">
              <div className="grid grid-cols-3 sm:flex items-center gap-1.5">
                <div className="min-h-9 sm:w-20 bg-slate-100 rounded-lg animate-pulse" />
                <div className="min-h-9 sm:w-20 bg-slate-100 rounded-lg animate-pulse" />
                <div className="min-h-9 sm:w-20 bg-slate-100 rounded-lg animate-pulse" />
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-1.5">
                <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse" />
                <div className="flex items-center gap-1.5">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Synchronized Transcript Panel */}
          <div className="lg:col-span-4 w-full min-w-0 flex flex-col gap-3">
            <Card rounded="2xl" className="rounded-2xl flex flex-col max-h-[320px] sm:max-h-[420px] lg:min-h-[500px] overflow-hidden">
              <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 shrink-0">
                <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="flex items-center gap-1">
                  <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="p-2.5 sm:p-3 flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5"
                  >
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-3.5 w-2/3 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'courses') {
    return (
      <div
        className="flex flex-col gap-5"
        aria-busy="true"
        aria-label="Đang tải danh sách khoá học"
      >
        {/* 1. Recent Course Hero Card Skeleton */}
        <Card rounded="2xl" className="p-4 sm:p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
              <div className="hidden sm:block h-5 w-10 bg-slate-100 rounded-md animate-pulse" />
              <div className="hidden sm:block h-5 w-16 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="h-8 sm:h-9 w-28 bg-slate-100 rounded-lg animate-pulse shrink-0" />
          </div>
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="h-5 w-48 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
              <div className="w-full h-1.5 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-3.5 w-28 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-full min-h-10 sm:min-h-11 rounded-xl bg-slate-200 animate-pulse" />
        </Card>

        {/* 2. Summary Statistics Row Skeleton */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card
              key={idx}
              rounded="xl"
              className="p-3.5 sm:p-4 flex flex-col gap-1.5"
            >
              <div className="w-5 h-5 bg-slate-100 rounded animate-pulse" />
              <div className="h-7 w-12 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
            </Card>
          ))}
        </div>

        {/* 3. Course Library List Skeleton */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="h-6 w-36 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-8 w-24 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-8 w-24 rounded-full bg-slate-100 animate-pulse" />
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card
                key={idx}
                rounded="2xl"
                className="p-4 sm:p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="h-5 w-44 bg-slate-100 rounded-md animate-pulse" />
                    <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-5 h-5 bg-slate-100 rounded animate-pulse shrink-0" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'practice') {
    return (
      <div
        className="flex-1 w-full flex flex-col justify-between gap-3"
        aria-busy="true"
        aria-label="Đang tải bài luyện nghe"
      >
        <Card
          rounded="2xl"
          className="flex-1 min-h-[524px] sm:min-h-[622px] p-4 sm:p-8 flex flex-col justify-between gap-4 sm:gap-6"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-14 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-6 w-10 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-6 w-20 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-6 w-20 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center gap-2.5 sm:gap-4">
            <div className="h-4 w-44 bg-slate-200/70 rounded animate-pulse" />
            <div className="h-9 w-56 bg-slate-200/70 rounded-lg animate-pulse" />
            <div className="h-10 w-48 bg-slate-200/70 rounded-xl animate-pulse" />
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-md bg-slate-200/70 animate-pulse shrink-0" />
                <div className="h-4 w-2/3 bg-slate-200/70 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="h-9 sm:h-10 sm:w-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-9 sm:h-10 sm:w-12 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Default: 'flashcard' variant — matches FlashcardView 100%
  return (
    <div
      className="flex-1 flex flex-col items-center justify-between w-full gap-3"
      aria-busy="true"
      aria-label="Đang tải thẻ học"
    >
      <Card
        rounded="2xl"
        className="w-full flex-1 min-h-[524px] sm:min-h-[622px] overflow-hidden p-4 sm:p-8 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-14 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-6 w-10 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-6 w-20 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-6 w-20 bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className="h-5 w-14 bg-slate-100 rounded animate-pulse" />
        </div>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center py-4 sm:py-6 gap-4">
          <div className="h-10 w-64 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 w-52 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </Card>

      <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-between w-full gap-2 sm:gap-3">
        <div className="h-9 sm:h-10 sm:w-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="col-span-2 grid grid-cols-2 sm:flex sm:items-center gap-2">
          <div className="h-9 sm:h-10 sm:w-12 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-9 sm:h-10 sm:w-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-9 sm:h-10 sm:w-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

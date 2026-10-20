import React from 'react';

export default function ProgressBar({
  current = 0,
  total = 0,
  learnedCount = 0,
  rememberedCount = 0,
  masteredCount = 0,
  label = 'Tiến độ học tập',
}) {
  const safeTotal = Math.max(total, 1);
  const studiedTotal = learnedCount + rememberedCount + masteredCount;
  const studiedPercent = Math.min(100, Math.round((studiedTotal / safeTotal) * 100));

  const masteredPct = Math.min(100, (masteredCount / safeTotal) * 100);
  const rememberedPct = Math.min(100 - masteredPct, (rememberedCount / safeTotal) * 100);
  const learnedPct = Math.min(
    100 - masteredPct - rememberedPct,
    (learnedCount / safeTotal) * 100
  );

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <span>{label}</span>
          {current > 0 && total > 0 && (
            <span className="text-slate-500">
              • Thẻ {current}/{total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-300" aria-hidden="true" />
            <span>Đã học: {learnedCount}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-600" aria-hidden="true" />
            <span>Đã nhớ: {rememberedCount}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
            <span>Thành thạo: {masteredCount}</span>
          </span>
          <span className="font-semibold text-slate-800">{studiedPercent}%</span>
        </div>
      </div>

      <div
        className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex"
        role="progressbar"
        aria-valuenow={studiedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {masteredPct > 0 && (
          <div
            style={{ width: `${masteredPct}%` }}
            className="h-full bg-emerald-600 transition-all duration-150"
          />
        )}
        {rememberedPct > 0 && (
          <div
            style={{ width: `${rememberedPct}%` }}
            className="h-full bg-sky-600 transition-all duration-150"
          />
        )}
        {learnedPct > 0 && (
          <div
            style={{ width: `${learnedPct}%` }}
            className="h-full bg-sky-300 transition-all duration-150"
          />
        )}
      </div>
    </div>
  );
}

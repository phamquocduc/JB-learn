import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function AnswerOption({
  index,
  label,
  state = 'idle', // 'idle' | 'selected' | 'correct' | 'incorrect'
  disabled = false,
  onSelect,
}) {
  const letters = ['A', 'B', 'C', 'D'];
  const badgeLetter = letters[index] || String(index + 1);

  let styleCls =
    'bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-900';
  let badgeCls = 'bg-slate-100 text-slate-700 border-slate-200';

  if (state === 'selected') {
    styleCls = 'bg-sky-50 border-sky-600 text-sky-900';
    badgeCls = 'bg-sky-700 text-white border-sky-700';
  } else if (state === 'correct') {
    styleCls = 'bg-emerald-50 border-emerald-500 text-emerald-950';
    badgeCls = 'bg-emerald-600 text-white border-emerald-600';
  } else if (state === 'incorrect') {
    styleCls = 'bg-red-50 border-red-400 text-red-900';
    badgeCls = 'bg-red-600 text-white border-red-600';
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full min-h-12 p-3.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${styleCls}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-7 h-7 rounded-md border text-xs font-bold inline-flex items-center justify-center shrink-0 ${badgeCls}`}
        >
          {badgeLetter}
        </span>
        <span className="text-sm sm:text-base font-medium leading-snug">
          {label}
        </span>
      </div>

      {state === 'correct' && (
        <CheckCircleIcon
          className="w-5 h-5 text-emerald-600 shrink-0"
          aria-hidden="true"
        />
      )}
      {state === 'incorrect' && (
        <XCircleIcon
          className="w-5 h-5 text-red-600 shrink-0"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

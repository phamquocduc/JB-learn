import React from 'react';

const BADGE_VARIANTS = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  level: 'bg-sky-700 text-white border-sky-700',
  lesson: 'bg-sky-50 text-sky-800 border-sky-200',
  type: 'bg-white text-slate-700 border-slate-200',
  unseen: 'bg-slate-50 text-slate-600 border-slate-200',
  learned: 'bg-sky-50 text-sky-700 border-sky-200',
  remembered: 'bg-sky-100 text-sky-900 border-sky-300',
  mastered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  public: 'bg-slate-50 text-slate-600 border-slate-200',
  private: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function Badge({
  variant = 'default',
  className = '',
  children,
}) {
  const styleCls = BADGE_VARIANTS[variant] || BADGE_VARIANTS.default;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap ${styleCls} ${className}`}
    >
      {children}
    </span>
  );
}

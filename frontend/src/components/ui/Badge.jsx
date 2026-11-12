import React from 'react';

const BADGE_VARIANTS = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  level: 'bg-sky-700 text-white border-sky-700',
  lesson: 'bg-sky-50 text-sky-800 border-sky-200',
  type: 'bg-slate-100 text-slate-600 border-slate-200',
  unseen: 'bg-slate-100 text-slate-600 border-slate-200',
  again: 'bg-rose-50 text-rose-800 border-rose-200',
  learned: 'bg-sky-50 text-sky-800 border-sky-200',
  remembered: 'bg-sky-100 text-sky-900 border-sky-300',
  mastered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  due: 'bg-amber-50 text-amber-800 border-amber-200',
  srs: 'bg-slate-100 text-slate-600 border-slate-200',
  public: 'bg-slate-100 text-slate-600 border-slate-200',
  private: 'bg-amber-50 text-amber-800 border-amber-200',
};

const DOT_COLORS = {
  default: 'bg-slate-500',
  secondary: 'bg-slate-500',
  level: 'bg-white',
  lesson: 'bg-sky-600',
  type: 'bg-slate-500',
  unseen: 'bg-slate-400',
  again: 'bg-rose-600',
  learned: 'bg-sky-600',
  remembered: 'bg-sky-700',
  mastered: 'bg-emerald-600',
  due: 'bg-amber-500',
  srs: 'bg-slate-400',
  public: 'bg-slate-500',
  private: 'bg-amber-500',
};

const BADGE_SIZES = {
  sm: 'h-5 px-1.5 text-[11px] gap-1',
  md: 'h-[22px] px-2 text-[11px] gap-1.5',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  children,
}) {
  const styleCls = BADGE_VARIANTS[variant] || BADGE_VARIANTS.default;
  const sizeCls = BADGE_SIZES[size] || BADGE_SIZES.md;
  const dotCls = DOT_COLORS[variant] || DOT_COLORS.default;

  return (
    <span
      className={`inline-flex items-center rounded-badge font-medium leading-none border whitespace-nowrap select-none ${sizeCls} ${styleCls} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

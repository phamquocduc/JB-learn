import React from 'react';

const VARIANT_CLASSES = {
  primary:
    'bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-contrast font-semibold border border-primary hover:border-primary-hover',
  secondary:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-medium border border-slate-300 hover:border-slate-400',
  ghost:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200/70 text-slate-700 hover:text-slate-900 font-medium border border-transparent',
  destructive:
    'bg-red-50 hover:bg-red-100 active:bg-red-200/70 text-red-700 font-medium border border-red-200 hover:border-red-300',
  badge:
    'bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 font-medium border border-slate-300 hover:border-sky-300',
};

const SIZE_CLASSES = {
  badge: 'h-8 px-3 text-xs gap-1.5 rounded-control',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-control',
  md: 'h-9 sm:h-10 px-3.5 sm:px-4 text-sm gap-2 rounded-control',
  lg: 'h-10 sm:h-11 px-4 sm:px-5 text-sm gap-2 rounded-control',
  icon: 'w-8 h-8 sm:w-9 sm:h-9 p-0 justify-center rounded-control',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  children,
  ...props
}) {
  const variantCls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeCls = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${variantCls} ${sizeCls} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

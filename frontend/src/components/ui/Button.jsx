import React from 'react';

const VARIANT_CLASSES = {
  primary:
    'bg-sky-700 hover:bg-sky-800 text-white border border-sky-700 hover:border-sky-800 shadow-sm',
  secondary:
    'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 shadow-sm',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-transparent',
  destructive:
    'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
  badge:
    'bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 hover:border-sky-300',
};

const SIZE_CLASSES = {
  badge: 'px-2.5 py-1 text-xs gap-1 rounded-md',
  sm: 'min-h-8 px-3 py-1 text-xs gap-1',
  md: 'min-h-10 px-4 py-2 text-sm gap-2',
  lg: 'min-h-11 px-5 py-2.5 text-sm gap-2',
  icon: 'w-9 h-9 p-0 justify-center',
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
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${variantCls} ${sizeCls} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

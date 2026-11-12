import React from 'react';

export default function Card({
  as = 'div',
  rounded: _rounded,
  className = '',
  children,
  ...props
}) {
  const Tag = as;

  return (
    <Tag
      className={`bg-white border border-slate-200 rounded-surface ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

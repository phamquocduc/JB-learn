import React from 'react';

export default function Card({
  as = 'div',
  rounded = 'xl',
  className = '',
  children,
  ...props
}) {
  const Tag = as;
  const radiusCls = rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl';

  return (
    <Tag
      className={`bg-white border border-slate-200 shadow-sm ${radiusCls} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

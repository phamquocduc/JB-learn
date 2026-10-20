import React from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import Card from './Card';
import Button from './Button';

export default function EmptyState({
  icon: Icon = BookOpenIcon,
  title = 'Chưa có nội dung phù hợp',
  description = 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',
  actionLabel,
  onAction,
}) {
  return (
    <Card className="p-8 sm:p-12 text-center flex flex-col items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h2 className="text-base sm:text-lg font-bold text-slate-900">{title}</h2>
      {description && (
        <p className="text-sm text-slate-600 max-w-md">{description}</p>
      )}
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </Card>
  );
}

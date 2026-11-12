import React from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Card from './Card';
import Button from './Button';

export default function EmptyState({
  icon: Icon = BookOpenIcon,
  title,
  description = '',
  actionLabel,
  onAction,
}) {
  const { t } = useTranslation('common');
  const resolvedTitle = title || t('emptyState.defaultTitle');

  return (
    <Card className="p-6 sm:p-10 text-center flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-surface bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h2 className="text-sm sm:text-base font-semibold text-slate-900">
        {resolvedTitle}
      </h2>
      {description && (
        <p className="text-sm text-slate-600 max-w-md">{description}</p>
      )}
      {actionLabel && onAction && (
        <div className="pt-1">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </Card>
  );
}

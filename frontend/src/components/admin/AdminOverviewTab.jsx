import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleStackIcon,
  FolderIcon,
  MicrophoneIcon,
  CpuChipIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { fetchAdminOverview } from '../../services/adminApi';
import { formatNumber } from '../../utils/formatters';
import { getModuleLabel, getRoleLabel } from '../../utils/rbacLabels';
import {
  formatDateTimeVi,
  getActionLabel,
  getTargetTypeLabel,
} from './adminConstants';

export default function AdminOverviewTab({
  onNavigateTab,
  hasPermission,
  hasAnyPermission,
}) {
  const { t, i18n } = useTranslation(['admin', 'rbac', 'common']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const checkAny = (codes) =>
    hasAnyPermission
      ? hasAnyPermission(codes)
      : codes.some((c) => hasPermission?.(c));

  const loadOverview = useCallback(
    async (isSilent = false) => {
      if (isSilent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const res = await fetchAdminOverview();
        setData(res);
      } catch (err) {
        setError(err.message || t('admin:overview.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  useEffect(() => {
    let ignore = false;
    fetchAdminOverview()
      .then((res) => {
        if (!ignore) {
          setData(res);
          setError('');
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || t('admin:overview.loadError'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [i18n.language, t]);

  if (loading && !data) {
    return <Skeleton variant="admin-overview" />;
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={ExclamationCircleIcon}
        title={t('admin:overview.loadErrorTitle')}
        description={error}
        actionLabel={t('common:actions.retry')}
        onAction={() => loadOverview(false)}
      />
    );
  }

  const health = data?.health || {};
  const counts = data?.counts || {};
  const modulesSummary = data?.modules_summary || {
    total: 0,
    enabled: 0,
    disabled: 0,
    disabled_items: [],
  };
  const recentLogs = data?.recent_logs || [];

  const systemHealthy =
    Boolean(health.database?.ok) && Boolean(health.media_storage?.ok);

  const canOpenUsersOrRoles = checkAny([
    'users.view',
    'users.create',
    'users.edit',
    'users.lock',
    'users.reset_password',
    'users.delete',
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
  ]);
  const canOpenCoursesOrCards = checkAny([
    'courses.view_all',
    'courses.create',
    'courses.edit',
    'courses.delete',
    'cards.view_all',
    'cards.create',
    'cards.edit',
    'cards.delete',
  ]);
  const canOpenShadowing = checkAny([
    'shadowing.view_all',
    'shadowing.create',
    'shadowing.edit',
    'shadowing.delete',
  ]);
  const canOpenModules = checkAny([
    'modules.view',
    'modules.toggle',
    'modules.assign_roles',
    'roles.edit',
  ]);

  const metricCards = [
    {
      key: 'users',
      value: counts.users?.total ?? 0,
      label: t('admin:overview.metrics.usersTitle'),
      targetTab: canOpenUsersOrRoles ? 'users' : null,
    },
    {
      key: 'cards',
      value: counts.cards?.total ?? 0,
      label: t('admin:overview.metrics.cardsTitle'),
      targetTab: canOpenCoursesOrCards ? 'content' : null,
    },
    {
      key: 'shadowing',
      value: counts.shadowing?.total ?? 0,
      label: t('admin:overview.metrics.shadowingTitle'),
      targetTab: canOpenShadowing ? 'content' : null,
    },
    {
      key: 'reviews',
      value: counts.learning?.total_reviews ?? 0,
      label: t('admin:overview.metrics.reviewsTitle'),
      targetTab: null,
    },
  ];

  const healthCells = [
    {
      key: 'db',
      icon: CircleStackIcon,
      title: t('admin:overview.infra.dbTitle'),
      badgeVariant: health.database?.ok ? 'mastered' : 'again',
      dot: true,
      badgeText: health.database?.ok
        ? t('admin:overview.infra.dbOk')
        : t('admin:overview.infra.dbDown'),
      primary: health.database?.engine || 'SQL',
    },
    {
      key: 'media',
      icon: FolderIcon,
      title: t('admin:overview.infra.mediaTitle'),
      badgeVariant: health.media_storage?.ok ? 'mastered' : 'again',
      dot: true,
      badgeText: health.media_storage?.ok
        ? t('admin:overview.infra.mediaReady')
        : t('admin:overview.infra.mediaReadOnly'),
      primary: t('admin:overview.infra.mediaFilesCount', {
        count: formatNumber(health.media_storage?.files_count ?? 0),
      }),
    },
    {
      key: 'speech',
      icon: MicrophoneIcon,
      title: t('admin:overview.infra.speechTitle'),
      badgeVariant:
        health.speech_engine?.whisper_available ||
        health.speech_engine?.youtube_transcript_available
          ? 'mastered'
          : 'due',
      dot: true,
      badgeText: health.speech_engine?.whisper_available
        ? t('admin:overview.infra.speechFull')
        : t('admin:overview.infra.speechBasic'),
      primary: health.speech_engine?.whisper_available
        ? t('admin:overview.infra.speechEnabled')
        : t('admin:overview.infra.speechDisabled'),
    },
    {
      key: 'runtime',
      icon: CpuChipIcon,
      title: t('admin:overview.infra.runtimeTitle'),
      badgeVariant: 'lesson',
      dot: false,
      badgeText: health.runtime?.timezone || 'UTC',
      primary: `Django ${health.runtime?.django_version || '4.2'}`,
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4">
      {/* 1. Balanced 4-Column SaaS KPI Metrics (Zero Subtitles, Zero Decorative Icons) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {metricCards.map((item) => {
          const isInteractive = Boolean(item.targetTab && onNavigateTab);
          return (
            <Card
              key={item.key}
              as={isInteractive ? 'button' : 'div'}
              type={isInteractive ? 'button' : undefined}
              onClick={
                isInteractive ? () => onNavigateTab(item.targetTab) : undefined
              }
              className={`p-3 sm:p-3.5 flex flex-col items-start text-left gap-1 min-w-0 ${
                isInteractive
                  ? 'group hover:border-sky-300 hover:bg-sky-50/40 transition-colors duration-150 cursor-pointer'
                  : ''
              }`}
            >
              <div className="w-full flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-500 truncate">
                  {item.label}
                </span>
                {isInteractive && (
                  <ArrowRightIcon
                    className="w-4 h-4 text-slate-400 group-hover:text-sky-700 transition-colors duration-150 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>

              <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight tabular-nums">
                {formatNumber(item.value)}
              </span>
            </Card>
          );
        })}
      </div>

      {/* 2. Unified SaaS System Infrastructure Card */}
      <Card className="overflow-hidden">
        <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={systemHealthy ? 'mastered' : 'due'} dot>
              {systemHealthy
                ? t('admin:overview.infra.healthyBadge')
                : t('admin:overview.infra.degradedBadge')}
            </Badge>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              {t('admin:overview.infra.title')}
            </h2>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadOverview(true)}
            disabled={refreshing}
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{t('admin:overview.infra.refresh')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {healthCells.map((cell) => {
            const Icon = cell.icon;
            return (
              <div key={cell.key} className="p-3.5 sm:p-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className="w-4 h-4 text-slate-500 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {cell.title}
                    </span>
                  </div>
                  <Badge variant={cell.badgeVariant} dot={cell.dot}>
                    {cell.badgeText}
                  </Badge>
                </div>

                <span className="text-sm font-semibold text-slate-900 truncate tabular-nums">
                  {cell.primary}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Two-Column Divided SaaS Panels: Roles & Modules + Recent Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Left: Role Distribution & Module Summary */}
        <Card className="overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col">
            <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                {t('admin:overview.rolesCard.title')}
              </h2>
              {canOpenModules && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab?.('modules')}
                >
                  {t('admin:overview.rolesCard.configure')}
                </Button>
              )}
            </div>

            {(() => {
              const allRoles = counts.users?.by_role || [];
              const topRoles = allRoles.slice(0, 6);
              const extraRoleCount = Math.max(0, allRoles.length - 6);

              return (
                <div className="divide-y divide-slate-200">
                  {topRoles.map((r) => (
                    <div
                      key={r.id || r.slug}
                      className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {getRoleLabel(r.slug, r.name)}
                        </span>
                        {r.is_system && (
                          <Badge size="sm" variant="lesson">
                            {t('admin:overview.rolesCard.defaultBadge')}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="default" className="tabular-nums">
                        {t('admin:overview.rolesCard.accountsCount', {
                          count: formatNumber(r.user_count || 0),
                        })}
                      </Badge>
                    </div>
                  ))}

                  {extraRoleCount > 0 && (
                    <div className="px-3.5 sm:px-4 py-2 bg-slate-50 flex items-center justify-between gap-3">
                      <Badge variant="default" className="tabular-nums">
                        {t('admin:overview.rolesCard.moreRoles', {
                          count: formatNumber(extraRoleCount),
                        })}
                      </Badge>
                      {canOpenUsersOrRoles && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateTab?.('users')}
                        >
                          {t('common:actions.viewAll')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                {t('admin:overview.modulesCard.title')}
              </span>
              <Badge
                variant={modulesSummary.disabled > 0 ? 'due' : 'mastered'}
                dot
                className="tabular-nums"
              >
                {t('admin:overview.modulesCard.enabledCount', {
                  enabled: formatNumber(modulesSummary.enabled || 0),
                  total: formatNumber(modulesSummary.total || 0),
                })}
              </Badge>
            </div>
            {modulesSummary.disabled_items?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {modulesSummary.disabled_items.map((m) => (
                  <Badge key={m.key} variant="again" dot>
                    {getModuleLabel(m.key, m.name)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right: Recent Administrative Audit Feed */}
        <Card className="overflow-hidden flex flex-col">
          <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              {t('admin:overview.recentAuditCard.title')}
            </h2>
            {hasPermission('system.audit.view') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab?.('audit')}
              >
                {t('common:actions.viewAll')}
              </Button>
            )}
          </div>

          {recentLogs.length === 0 ? (
            <div className="flex-1 min-h-40 p-4 flex items-center justify-center text-sm text-slate-500">
              {t('admin:overview.recentAuditCard.empty')}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors duration-150"
                >
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {getActionLabel(log.action)}
                      </span>
                      <Badge size="sm" variant="default">
                        {getTargetTypeLabel(log.target_type)}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500 truncate">
                      {log.actor_username || t('admin:audit.systemActor')}
                      {log.target_repr ? ` • ${log.target_repr}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                    {formatDateTimeVi(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

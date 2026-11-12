import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import CommonTable from '../ui/CommonTable';
import Badge from '../ui/Badge';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { fetchAdminAuditLogs } from '../../services/adminApi';
import {
  AdminSearchInput,
  AdminFilterPopover,
  AdminFilterChips,
  AdminPagination,
} from './adminShared';
import {
  formatDateTimeVi,
  getActionLabel,
  getTargetTypeLabel,
  summarizeAuditDetails,
} from './adminConstants';

export default function AdminAuditLogsTab() {
  const { t, i18n } = useTranslation(['admin', 'rbac', 'common']);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [targetType, setTargetType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const targetTypeOptions = useMemo(
    () => [
      { value: '', label: t('admin:audit.targetTypes.all') },
      { value: 'user', label: t('admin:audit.targetTypes.user') },
      { value: 'role', label: t('admin:audit.targetTypes.role') },
      { value: 'module', label: t('admin:audit.targetTypes.module') },
      { value: 'course', label: t('admin:audit.targetTypes.course') },
      { value: 'card', label: t('admin:audit.targetTypes.card') },
      { value: 'video', label: t('admin:audit.targetTypes.video') },
    ],
    [t]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;
    fetchAdminAuditLogs({
      page,
      target_type: targetType,
      search: debouncedSearch,
    })
      .then((res) => {
        if (ignore) return;
        setLogs(Array.isArray(res?.results) ? res.results : []);
        setTotalPages(res?.total_pages || 1);
        setTotal(res?.total || 0);
        setError('');
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || t('admin:audit.loadError'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, targetType, debouncedSearch, reloadTick, i18n.language, t]);

  const handleTargetChange = (nextVal) => {
    setLoading(true);
    setTargetType(nextVal);
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setLoading(true);
    setPage(nextPage);
  };

  const activeChips = useMemo(() => {
    if (!targetType) return [];
    return [
      {
        key: 'targetType',
        label: t('admin:audit.targetChip', {
          label: getTargetTypeLabel(targetType),
        }),
        onRemove: () => handleTargetChange(''),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, t]);

  return (
    <Card className="flex flex-col">
      {/* Integrated SaaS Toolbar */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200 flex items-center justify-between gap-2 sm:gap-3">
        <AdminSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder={t('admin:audit.searchPlaceholder')}
          ariaLabel={t('admin:audit.searchAria')}
        />

        <AdminFilterPopover
          title={t('admin:audit.filterTitle')}
          sections={[
            {
              key: 'targetType',
              label: t('admin:audit.filterTargetSection'),
              options: targetTypeOptions,
            },
          ]}
          values={{ targetType }}
          onApply={(vals) => handleTargetChange(vals.targetType || '')}
          onReset={() => handleTargetChange('')}
        />
      </div>

      <AdminFilterChips
        chips={activeChips}
        onClearAll={() => handleTargetChange('')}
      />

      {loading && logs.length === 0 ? (
        <Skeleton variant="admin-list" count={6} embedded />
      ) : error && logs.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={ExclamationCircleIcon}
            title={t('admin:audit.loadErrorTitle')}
            description={error}
            actionLabel={t('common:actions.retry')}
            onAction={() => {
              setLoading(true);
              setReloadTick((prev) => prev + 1);
            }}
          />
        </div>
      ) : (
        <CommonTable
          embedded
          columns={[
            {
              key: 'created_at',
              header: t('admin:audit.columns.time'),
              cellClassName:
                'text-xs text-slate-500 whitespace-nowrap tabular-nums',
              render: (log) => formatDateTimeVi(log.created_at),
            },
            {
              key: 'actor',
              header: t('admin:audit.columns.actor'),
              cellClassName: 'font-medium text-slate-900 whitespace-nowrap',
              render: (log) =>
                log.actor_username || t('admin:audit.systemActor'),
            },
            {
              key: 'action',
              header: t('admin:audit.columns.action'),
              cellClassName: 'whitespace-nowrap',
              render: (log) => (
                <Badge variant="lesson">{getActionLabel(log.action)}</Badge>
              ),
            },
            {
              key: 'target',
              header: t('admin:audit.columns.target'),
              cellClassName: 'max-w-64',
              render: (log) => (
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="default">
                    {getTargetTypeLabel(log.target_type)}
                  </Badge>
                  <span className="text-slate-900 font-medium truncate">
                    {log.target_repr || '—'}
                  </span>
                </div>
              ),
            },
            {
              key: 'details',
              header: t('admin:audit.columns.details'),
              cellClassName: 'text-xs text-slate-600 max-w-72 truncate',
              render: (log) => {
                const detailSummary = summarizeAuditDetails(log);
                return (
                  detailSummary ||
                  (log.ip_address
                    ? t('admin:audit.ipAddress', { ip: log.ip_address })
                    : '—')
                );
              },
            },
          ]}
          data={logs}
          getRowKey={(log) => log.id}
          mobileRowClassName="flex flex-col gap-2"
          renderMobileRow={(log) => {
            const detailSummary = summarizeAuditDetails(log);
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="lesson">{getActionLabel(log.action)}</Badge>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {formatDateTimeVi(log.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="default">
                    {getTargetTypeLabel(log.target_type)}
                  </Badge>
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {log.target_repr || '—'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {t('admin:audit.mobileActor', {
                      actor:
                        log.actor_username || t('admin:audit.systemActor'),
                    })}
                  </span>
                  {detailSummary && <span>• {detailSummary}</span>}
                </div>
              </>
            );
          }}
          emptyState={
            <EmptyState
              icon={ClipboardDocumentListIcon}
              title={t('admin:audit.emptyTitle')}
            />
          }
          footer={
            <AdminPagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={handlePageChange}
            />
          }
          ariaLabel={t('admin:audit.tableAria')}
        />
      )}
    </Card>
  );
}

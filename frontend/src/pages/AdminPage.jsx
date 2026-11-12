import React, { useMemo, useEffect } from 'react';
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LockClosedIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import AdminOverviewTab from '../components/admin/AdminOverviewTab';
import AdminUsersRolesTab from '../components/admin/AdminUsersRolesTab';
import AdminContentTab from '../components/admin/AdminContentTab';
import AdminModulesTab from '../components/admin/AdminModulesTab';
import AdminAuditLogsTab from '../components/admin/AdminAuditLogsTab';
import { useAuth } from '../context/useAuth';
import { getRoleLabel } from '../utils/rbacLabels';

const USERS_ROLES_PERMS = [
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
];

const CONTENT_PERMS = [
  'courses.view_all',
  'courses.create',
  'courses.edit',
  'courses.delete',
  'cards.view_all',
  'cards.create',
  'cards.edit',
  'cards.delete',
  'shadowing.view_all',
  'shadowing.create',
  'shadowing.edit',
  'shadowing.delete',
];

const MODULES_PERMS = [
  'modules.view',
  'modules.toggle',
  'modules.assign_roles',
  'roles.edit',
];

export default function AdminPage() {
  const { t, i18n } = useTranslation(['admin', 'rbac', 'common']);
  const outletContext = useOutletContext() || {};
  const { openSidebar } = outletContext;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    document.title = t('admin:pageTitle');
  }, [t, i18n.language]);

  const {
    user,
    isGuest,
    loading: authLoading,
    canAccessAdmin,
    hasPermission,
    hasAnyPermission,
    refreshUser,
    openAuthModal,
  } = useAuth();

  const permittedTabs = useMemo(() => {
    if (!canAccessAdmin) return [];
    const tabs = [];
    if (hasPermission('system.status.view')) {
      tabs.push({
        id: 'overview',
        label: t('admin:tabs.overview'),
      });
    }
    if (hasAnyPermission(USERS_ROLES_PERMS)) {
      tabs.push({
        id: 'users',
        label: t('admin:tabs.users'),
      });
    }
    if (hasAnyPermission(CONTENT_PERMS)) {
      tabs.push({
        id: 'content',
        label: t('admin:tabs.content'),
      });
    }
    if (hasAnyPermission(MODULES_PERMS)) {
      tabs.push({
        id: 'modules',
        label: t('admin:tabs.modules'),
      });
    }
    if (hasPermission('system.audit.view')) {
      tabs.push({
        id: 'audit',
        label: t('admin:tabs.logs'),
      });
    }
    return tabs;
  }, [canAccessAdmin, hasPermission, hasAnyPermission, t]);

  const requestedTab = searchParams.get('tab') || '';
  const activeTab = useMemo(() => {
    if (permittedTabs.some((tab) => tab.id === requestedTab)) {
      return requestedTab;
    }
    return permittedTabs[0]?.id || '';
  }, [permittedTabs, requestedTab]);

  const handleSelectTab = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    setSearchParams(nextParams, { replace: true });
  };

  if (authLoading) {
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
        <Skeleton variant="admin" />
      </main>
    );
  }

  if (isGuest || !canAccessAdmin || permittedTabs.length === 0) {
    return (
      <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
        {openSidebar && (
          <div className="flex justify-end lg:hidden">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('admin:page.openNavAria')}
              className="w-9 h-9 inline-flex items-center justify-center rounded-control border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-150 cursor-pointer"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
        <EmptyState
          icon={LockClosedIcon}
          title={t('admin:page.restrictedTitle')}
          actionLabel={
            isGuest ? t('admin:page.loginAction') : t('admin:page.homeAction')
          }
          onAction={() => (isGuest ? openAuthModal('login') : navigate('/'))}
        />
      </main>
    );
  }

  return (
    <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5 sm:gap-4">
      {/* Unified SaaS Workspace Header & Segmented Navigation */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight truncate">
              {t('admin:heading')}
            </h1>
            <Badge variant="lesson" className="shrink-0">
              {getRoleLabel(
                user?.role_slug,
                user?.role_name || t('admin:page.defaultRoleFallback')
              )}
            </Badge>
          </div>

          {openSidebar && (
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('admin:page.openNavAria')}
              className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-control border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-150 cursor-pointer shrink-0"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label={t('admin:page.tablistAria')}
          className="bg-white border border-slate-200 p-1 rounded-control flex items-center gap-1 overflow-x-auto max-w-full shrink-0"
        >
          {permittedTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectTab(tab.id)}
                className={`h-8 px-3 rounded-control text-xs sm:text-sm font-medium inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                  isSelected
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Active Subsystem Panel */}
      <div role="tabpanel" className="flex-1 flex flex-col min-w-0">
        {activeTab === 'overview' && (
          <AdminOverviewTab
            onNavigateTab={handleSelectTab}
            hasPermission={hasPermission}
            hasAnyPermission={hasAnyPermission}
          />
        )}
        {activeTab === 'users' && (
          <AdminUsersRolesTab
            currentUser={user}
            hasPermission={hasPermission}
            hasAnyPermission={hasAnyPermission}
            refreshCurrentUser={refreshUser}
          />
        )}
        {activeTab === 'content' && (
          <AdminContentTab
            hasPermission={hasPermission}
            hasAnyPermission={hasAnyPermission}
          />
        )}
        {activeTab === 'modules' && (
          <AdminModulesTab
            hasPermission={hasPermission}
            refreshCurrentUser={refreshUser}
          />
        )}
        {activeTab === 'audit' && <AdminAuditLogsTab />}
      </div>
    </main>
  );
}

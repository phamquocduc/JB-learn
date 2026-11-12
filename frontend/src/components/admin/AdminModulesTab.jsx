import React, {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExclamationCircleIcon,
  CheckIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useSystemConfig } from '../../context/useSystemConfig';
import { useToast } from '../../context/useToast';
import {
  fetchAdminModules,
  updateAdminModule,
} from '../../services/adminApi';
import { formatNumber } from '../../utils/formatters';
import {
  getModuleGroupLabel,
  getModuleLabel,
  getPermissionLabel,
  getRoleLabel,
} from '../../utils/rbacLabels';
import { AdminSearchInput, AdminModalShell } from './adminShared';
import { normalizeSearchText } from './adminConstants';

const FALLBACK_SUBJECTS = [
  { slug: 'guest', name: 'Khách chưa đăng nhập', is_system: true, locked: false, user_count: null },
  { slug: 'admin', name: 'Quản trị viên', is_system: true, locked: true, user_count: 0 },
  { slug: 'moderator', name: 'Biên tập viên', is_system: true, locked: false, user_count: 0 },
  { slug: 'learner', name: 'Học viên', is_system: true, locked: false, user_count: 0 },
];

const ACTIONS_ROLES_PER_PAGE = 8;
const VISIBILITY_ROLES_PER_PAGE = 10;

function AccessFilterToolbar({
  searchInput,
  onSearchChange,
  filterTabs,
  viewFilter,
  onFilterChange,
  canBulk,
  onBulkSelect,
  onBulkClear,
}) {
  const { t } = useTranslation('admin');
  return (
    <>
      <AdminSearchInput
        value={searchInput}
        onChange={onSearchChange}
        placeholder={t('admin:modules.searchPlaceholder')}
        ariaLabel={t('admin:modules.searchAria')}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-control">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterChange(tab.key)}
              className={`h-7 px-2.5 rounded-control text-xs font-medium tabular-nums transition-colors duration-150 cursor-pointer ${
                viewFilter === tab.key
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {canBulk && (
          <div className="flex items-center gap-3 text-xs font-medium">
            <button
              type="button"
              onClick={onBulkSelect}
              className="text-sky-700 hover:text-sky-800 cursor-pointer"
            >
              {t('admin:modules.selectAll')}
            </button>
            <span className="text-slate-300" aria-hidden="true">
              •
            </span>
            <button
              type="button"
              onClick={onBulkClear}
              className="text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {t('admin:modules.deselectAll')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function AccessPaginationBar({ page, totalPages, totalItems, onPageChange }) {
  const { t } = useTranslation(['admin', 'common']);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-600">
      <span className="tabular-nums">
        {t('admin:modules.rolesPaginationSummary', {
          page: formatNumber(page),
          totalPages: formatNumber(totalPages),
          total: formatNumber(totalItems),
        })}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2.5"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label={t('common:pagination.prevPage')}
        >
          <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2.5"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label={t('common:pagination.nextPage')}
        >
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ModuleActionsAccessModalBody({
  moduleItem,
  parentMod,
  parentAllowedSet,
  availableRoles,
  roles,
  actionCatalog,
  viewPermCode,
  onSave,
  onClose,
  submitting,
}) {
  const { t } = useTranslation(['admin', 'rbac', 'common']);
  const actionCodes = useMemo(
    () => actionCatalog.map((a) => a.code),
    [actionCatalog]
  );
  const actionCodeSet = useMemo(() => new Set(actionCodes), [actionCodes]);
  const allSubjectSlugs = useMemo(
    () => availableRoles.map((r) => r.slug),
    [availableRoles]
  );

  const editableRoles = useMemo(() => {
    if (Array.isArray(roles) && roles.length > 0) {
      return roles.filter((r) => r.slug !== 'admin');
    }
    return availableRoles
      .filter((r) => r.slug !== 'guest' && r.slug !== 'admin')
      .map((r) => ({ ...r, permissions: [] }));
  }, [roles, availableRoles]);

  const guestBlockedByParent = Boolean(
    parentAllowedSet && !parentAllowedSet.has('guest')
  );

  const [guestAllowed, setGuestAllowed] = useState(() => {
    if (guestBlockedByParent) return false;
    return (
      !Array.isArray(moduleItem?.allowed_roles) ||
      moduleItem.allowed_roles.includes('guest')
    );
  });

  const [rolePermsMap, setRolePermsMap] = useState(() => {
    const initialMap = {};
    const moduleAllowedSet = Array.isArray(moduleItem?.allowed_roles)
      ? new Set(moduleItem.allowed_roles)
      : null;

    editableRoles.forEach((role) => {
      const rawPerms = Array.isArray(role.permissions)
        ? role.permissions.filter((code) => actionCodeSet.has(code))
        : [];
      const roleBlocked =
        Boolean(parentAllowedSet && !parentAllowedSet.has(role.slug)) ||
        Boolean(moduleAllowedSet && !moduleAllowedSet.has(role.slug));
      initialMap[role.slug] =
        roleBlocked && viewPermCode
          ? rawPerms.filter((code) => code !== viewPermCode)
          : rawPerms;
    });
    return initialMap;
  });

  const [searchInput, setSearchInput] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedOverrides, setExpandedOverrides] = useState({});

  const deferredSearch = useDeferredValue(searchInput);

  const isRoleBlocked = (slug) =>
    Boolean(parentAllowedSet && !parentAllowedSet.has(slug));

  const rolesWithAccessCount = useMemo(
    () =>
      editableRoles.reduce((acc, role) => {
        if (isRoleBlocked(role.slug)) return acc;
        const perms = rolePermsMap[role.slug] || [];
        return acc + (perms.length > 0 ? 1 : 0);
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editableRoles, parentAllowedSet, rolePermsMap]
  );

  const effectiveViewSubjectCount = useMemo(() => {
    let count = 1; // admin luôn có quyền
    if (guestAllowed && !guestBlockedByParent) count += 1;
    editableRoles.forEach((role) => {
      if (isRoleBlocked(role.slug)) return;
      const perms = rolePermsMap[role.slug] || [];
      const canView = viewPermCode
        ? perms.includes(viewPermCode)
        : perms.length > 0;
      if (canView) count += 1;
    });
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editableRoles,
    guestAllowed,
    guestBlockedByParent,
    parentAllowedSet,
    rolePermsMap,
    viewPermCode,
  ]);

  const filteredRoles = useMemo(() => {
    const q = normalizeSearchText(deferredSearch);
    return editableRoles.filter((role) => {
      if (q) {
        const displayName = getRoleLabel(role.slug, role.name);
        const matchedDisplay = normalizeSearchText(displayName).includes(q);
        const matchedName = normalizeSearchText(role.name).includes(q);
        const matchedSlug = normalizeSearchText(role.slug).includes(q);
        if (!matchedDisplay && !matchedName && !matchedSlug) return false;
      }
      const perms = isRoleBlocked(role.slug)
        ? []
        : rolePermsMap[role.slug] || [];
      if (viewFilter === 'allowed') return perms.length > 0;
      if (viewFilter === 'hidden') return perms.length === 0;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableRoles, deferredSearch, viewFilter, parentAllowedSet, rolePermsMap]);

  const editableFilteredSlugs = useMemo(
    () =>
      filteredRoles
        .filter((role) => !isRoleBlocked(role.slug))
        .map((role) => role.slug),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredRoles, parentAllowedSet]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ACTIONS_ROLES_PER_PAGE)
  );
  const safePage = Math.min(page, totalPages);
  const paginatedRoles = useMemo(() => {
    const start = (safePage - 1) * ACTIONS_ROLES_PER_PAGE;
    return filteredRoles.slice(start, start + ACTIONS_ROLES_PER_PAGE);
  }, [filteredRoles, safePage]);

  const autoExpandAll = filteredRoles.length <= 6;

  const toggleRoleAction = (roleSlug, code) => {
    if (isRoleBlocked(roleSlug)) return;
    setRolePermsMap((prev) => {
      const cur = prev[roleSlug] || [];
      const next = cur.includes(code)
        ? cur.filter((c) => c !== code)
        : actionCodes.filter((c) => c === code || cur.includes(c));
      return { ...prev, [roleSlug]: next };
    });
  };

  const toggleAllActionsForRole = (roleSlug) => {
    if (isRoleBlocked(roleSlug)) return;
    setRolePermsMap((prev) => {
      const cur = prev[roleSlug] || [];
      const allChecked =
        actionCodes.length > 0 && actionCodes.every((c) => cur.includes(c));
      return { ...prev, [roleSlug]: allChecked ? [] : [...actionCodes] };
    });
  };

  const handleBulkSelectFiltered = (shouldSelect) => {
    if (editableFilteredSlugs.length === 0) return;
    setRolePermsMap((prev) => {
      const next = { ...prev };
      editableFilteredSlugs.forEach((slug) => {
        next[slug] = shouldSelect ? [...actionCodes] : [];
      });
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allowedSet = new Set(['admin']);
    if (guestAllowed && !guestBlockedByParent) {
      allowedSet.add('guest');
    }
    const rolePermissionsPayload = {};
    editableRoles.forEach((role) => {
      const blocked = isRoleBlocked(role.slug);
      const selected = blocked
        ? []
        : actionCodes.filter((code) =>
            (rolePermsMap[role.slug] || []).includes(code)
          );
      rolePermissionsPayload[role.slug] = selected;
      const canView = viewPermCode
        ? selected.includes(viewPermCode)
        : selected.length > 0;
      if (canView && !blocked) {
        allowedSet.add(role.slug);
      }
    });

    const isEverySubjectSelected = allSubjectSlugs.every((slug) =>
      allowedSet.has(slug)
    );
    const allowedRolesPayload = isEverySubjectSelected
      ? null
      : allSubjectSlugs.filter((slug) => allowedSet.has(slug));

    onSave?.(moduleItem, {
      allowed_roles: allowedRolesPayload,
      role_permissions: rolePermissionsPayload,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {parentAllowedSet && (
        <div className="p-3 rounded-control bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 tabular-nums">
          {t('admin:modules.parentLimitingActions', {
            name: getModuleLabel(parentMod?.key, parentMod?.name),
            allowed: formatNumber(parentAllowedSet.size),
            total: formatNumber(availableRoles.length),
          })}
        </div>
      )}

      {/* Guest View Toggle + Admin Note */}
      <div className="px-3.5 py-2.5 rounded-surface bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-900">
            {t('admin:modules.guestRowTitle')}
          </span>
          {guestBlockedByParent ? (
            <Badge size="sm" variant="due">
              {t('admin:modules.hiddenByParentBadge')}
            </Badge>
          ) : (
            <Badge size="sm" variant={guestAllowed ? 'mastered' : 'default'}>
              {guestAllowed
                ? t('admin:modules.guestCanView')
                : t('admin:modules.guestHidden')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge size="sm" variant="lesson">
            {t('admin:modules.adminFullAccess')}
          </Badge>
          <button
            type="button"
            role="switch"
            aria-checked={guestAllowed && !guestBlockedByParent}
            aria-label={t('admin:modules.guestToggleAria')}
            disabled={guestBlockedByParent || submitting}
            onClick={() => setGuestAllowed((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
              guestAllowed && !guestBlockedByParent
                ? 'bg-sky-700 border-sky-700'
                : 'bg-slate-200 border-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150 ${
                guestAllowed && !guestBlockedByParent
                  ? 'translate-x-5'
                  : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <AccessFilterToolbar
        searchInput={searchInput}
        onSearchChange={(val) => {
          setSearchInput(val);
          setPage(1);
        }}
        filterTabs={[
          {
            key: 'all',
            label: t('admin:modules.filterAll', {
              count: formatNumber(editableRoles.length),
            }),
          },
          {
            key: 'allowed',
            label: t('admin:modules.filterHasAccess', {
              count: formatNumber(rolesWithAccessCount),
            }),
          },
          {
            key: 'hidden',
            label: t('admin:modules.filterRestricted', {
              count: formatNumber(editableRoles.length - rolesWithAccessCount),
            }),
          },
        ]}
        viewFilter={viewFilter}
        onFilterChange={(tabKey) => {
          setViewFilter(tabKey);
          setPage(1);
        }}
        canBulk={editableFilteredSlugs.length > 0}
        onBulkSelect={() => handleBulkSelectFiltered(true)}
        onBulkClear={() => handleBulkSelectFiltered(false)}
      />

      {/* Paginated Role Cards with Granular Module Actions */}
      <div className="space-y-2.5 max-h-[44dvh] sm:max-h-[420px] overflow-y-auto pr-1">
        {paginatedRoles.length === 0 ? (
          <div className="p-6 rounded-surface border border-slate-200 bg-white text-center text-xs sm:text-sm text-slate-500">
            {t('admin:modules.noRolesFound')}
          </div>
        ) : (
          paginatedRoles.map((role) => {
            const blockedByParent = isRoleBlocked(role.slug);
            const checkedActions = blockedByParent
              ? []
              : rolePermsMap[role.slug] || [];
            const allChecked =
              actionCodes.length > 0 &&
              actionCodes.every((c) => checkedActions.includes(c));
            const isExpanded = expandedOverrides[role.slug] ?? autoExpandAll;

            return (
              <div
                key={role.slug}
                className={`rounded-surface border overflow-hidden transition-colors duration-150 ${
                  blockedByParent
                    ? 'border-slate-200 bg-slate-50 opacity-70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="px-3.5 py-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOverrides((prev) => ({
                        ...prev,
                        [role.slug]: !isExpanded,
                      }))
                    }
                    aria-expanded={isExpanded}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon
                        className="w-4 h-4 text-slate-500 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDownIcon
                        className="w-4 h-4 text-slate-500 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {getRoleLabel(role.slug, role.name)}
                    </span>
                    {role.is_system && (
                      <Badge size="sm" variant="lesson">
                        {t('admin:modules.systemRoleBadge')}
                      </Badge>
                    )}
                    {typeof role.user_count === 'number' && (
                      <Badge
                        size="sm"
                        variant="default"
                        className="tabular-nums"
                      >
                        {t('admin:modules.accountsCount', {
                          count: formatNumber(role.user_count),
                        })}
                      </Badge>
                    )}
                    {blockedByParent ? (
                      <Badge size="sm" variant="due">
                        {t('admin:modules.hiddenByParentBadge')}
                      </Badge>
                    ) : (
                      <Badge
                        size="sm"
                        variant={
                          checkedActions.length > 0 ? 'learned' : 'default'
                        }
                        className="tabular-nums"
                      >
                        {t('admin:modules.actionCount', {
                          checked: formatNumber(checkedActions.length),
                          total: formatNumber(actionCodes.length),
                        })}
                      </Badge>
                    )}
                  </button>

                  {!blockedByParent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs shrink-0"
                      onClick={() => toggleAllActionsForRole(role.slug)}
                    >
                      {allChecked
                        ? t('admin:modules.deselectAll')
                        : t('admin:modules.selectAll')}
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {actionCatalog.map((act) => {
                      const checked = checkedActions.includes(act.code);
                      return (
                        <label
                          key={act.code}
                          className={`h-9 px-3 rounded-control border flex items-center gap-2.5 transition-colors duration-150 ${
                            blockedByParent
                              ? 'cursor-not-allowed opacity-70 bg-slate-50 border-slate-200'
                              : checked
                                ? 'bg-sky-50 border-sky-300 cursor-pointer'
                                : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={blockedByParent || submitting}
                            onChange={() =>
                              toggleRoleAction(role.slug, act.code)
                            }
                            className="w-4 h-4 accent-sky-700 rounded-control shrink-0"
                          />
                          <span className="text-xs font-medium text-slate-800 truncate">
                            {getPermissionLabel(act.code, act.label)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AccessPaginationBar
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredRoles.length}
        onPageChange={setPage}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <Badge variant="learned" className="tabular-nums">
          {t('admin:modules.viewCountSummary', {
            allowed: formatNumber(effectiveViewSubjectCount),
            total: formatNumber(availableRoles.length),
          })}
        </Badge>

        <div className="flex items-center gap-2.5 ml-auto">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : t('admin:modules.savePermissions')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ModuleVisibilityAccessModalBody({
  moduleItem,
  parentMod,
  parentAllowedSet,
  availableRoles,
  onSave,
  onClose,
  submitting,
}) {
  const { t } = useTranslation(['admin', 'rbac', 'common']);
  const allSubjectSlugs = useMemo(
    () => availableRoles.map((r) => r.slug),
    [availableRoles]
  );

  const [scopeMode, setScopeMode] = useState(() =>
    Array.isArray(moduleItem?.raw_allowed_roles) ? 'custom' : 'all'
  );
  const [selectedSlugs, setSelectedSlugs] = useState(() => {
    const initial = Array.isArray(moduleItem?.raw_allowed_roles)
      ? moduleItem.raw_allowed_roles
      : allSubjectSlugs;
    return Array.from(new Set(['admin', ...initial]));
  });
  const [searchInput, setSearchInput] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(searchInput);
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const isSubjectEffectivelyAllowed = (slug) => {
    if (slug === 'admin') return true;
    if (parentAllowedSet && !parentAllowedSet.has(slug)) return false;
    return scopeMode === 'all' ? true : selectedSet.has(slug);
  };

  const effectiveAllowedCount = useMemo(
    () =>
      availableRoles.reduce(
        (acc, subj) =>
          acc + (isSubjectEffectivelyAllowed(subj.slug) ? 1 : 0),
        0
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableRoles, parentAllowedSet, scopeMode, selectedSet]
  );

  const filteredSubjects = useMemo(() => {
    const q = normalizeSearchText(deferredSearch);
    return availableRoles.filter((subj) => {
      if (q) {
        const displayName = getRoleLabel(subj.slug, subj.name);
        const matchedDisplay = normalizeSearchText(displayName).includes(q);
        const matchedName = normalizeSearchText(subj.name).includes(q);
        const matchedSlug = normalizeSearchText(subj.slug).includes(q);
        if (!matchedDisplay && !matchedName && !matchedSlug) return false;
      }
      const allowed = isSubjectEffectivelyAllowed(subj.slug);
      if (viewFilter === 'allowed') return allowed;
      if (viewFilter === 'hidden') return !allowed;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    availableRoles,
    deferredSearch,
    viewFilter,
    parentAllowedSet,
    scopeMode,
    selectedSet,
  ]);

  const editableFilteredSlugs = useMemo(
    () =>
      filteredSubjects
        .filter(
          (subj) =>
            subj.slug !== 'admin' &&
            !subj.locked &&
            !(parentAllowedSet && !parentAllowedSet.has(subj.slug))
        )
        .map((subj) => subj.slug),
    [filteredSubjects, parentAllowedSet]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubjects.length / VISIBILITY_ROLES_PER_PAGE)
  );
  const safePage = Math.min(page, totalPages);
  const paginatedSubjects = useMemo(() => {
    const start = (safePage - 1) * VISIBILITY_ROLES_PER_PAGE;
    return filteredSubjects.slice(start, start + VISIBILITY_ROLES_PER_PAGE);
  }, [filteredSubjects, safePage]);

  const toggleSingleRole = (slug) => {
    if (slug === 'admin') return;
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      next.add('admin');
      return Array.from(next);
    });
  };

  const handleBulkSelectFiltered = (shouldSelect) => {
    if (editableFilteredSlugs.length === 0) return;
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      editableFilteredSlugs.forEach((slug) => {
        if (shouldSelect) {
          next.add(slug);
        } else {
          next.delete(slug);
        }
      });
      next.add('admin');
      return Array.from(next);
    });
  };

  const handleSwitchMode = (nextMode) => {
    if (nextMode === 'custom' && scopeMode === 'all') {
      const eligibleSlugs = allSubjectSlugs.filter(
        (slug) =>
          slug === 'admin' || !parentAllowedSet || parentAllowedSet.has(slug)
      );
      setSelectedSlugs(Array.from(new Set(['admin', ...eligibleSlugs])));
    }
    setPage(1);
    setScopeMode(nextMode);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (scopeMode === 'all') {
      onSave?.(moduleItem, { allowed_roles: null });
      return;
    }
    const normalizedSet = new Set(['admin', ...selectedSlugs]);
    const isEverySubjectSelected = allSubjectSlugs.every((slug) =>
      normalizedSet.has(slug)
    );
    const payload = isEverySubjectSelected
      ? null
      : allSubjectSlugs.filter((slug) => normalizedSet.has(slug));
    onSave?.(moduleItem, { allowed_roles: payload });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {parentAllowedSet && (
        <div className="p-3 rounded-control bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 tabular-nums">
          {t('admin:modules.parentLimitingVisibility', {
            name: getModuleLabel(parentMod?.key, parentMod?.name),
            allowed: formatNumber(parentAllowedSet.size),
            total: formatNumber(availableRoles.length),
          })}
        </div>
      )}

      {/* Scope Segmented Switch */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200 rounded-control p-1">
        <button
          type="button"
          onClick={() => handleSwitchMode('all')}
          className={`h-8 px-3 rounded-control text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
            scopeMode === 'all'
              ? 'bg-sky-700 text-white'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
        >
          {t('admin:modules.scopeAll')}
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMode('custom')}
          className={`h-8 px-3 rounded-control text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
            scopeMode === 'custom'
              ? 'bg-sky-700 text-white'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
        >
          {t('admin:modules.scopeCustom')}
        </button>
      </div>

      {scopeMode === 'all' ? (
        <div className="p-3.5 rounded-surface bg-sky-50 border border-sky-200 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-900 tabular-nums">
            {t('admin:modules.scopeAllNotice', {
              allowed: formatNumber(effectiveAllowedCount),
              total: formatNumber(availableRoles.length),
            })}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AccessFilterToolbar
            searchInput={searchInput}
            onSearchChange={(val) => {
              setSearchInput(val);
              setPage(1);
            }}
            filterTabs={[
              {
                key: 'all',
                label: t('admin:modules.filterAll', {
                  count: formatNumber(availableRoles.length),
                }),
              },
              {
                key: 'allowed',
                label: t('admin:modules.filterVisible', {
                  count: formatNumber(effectiveAllowedCount),
                }),
              },
              {
                key: 'hidden',
                label: t('admin:modules.filterHidden', {
                  count: formatNumber(
                    availableRoles.length - effectiveAllowedCount
                  ),
                }),
              },
            ]}
            viewFilter={viewFilter}
            onFilterChange={(tabKey) => {
              setViewFilter(tabKey);
              setPage(1);
            }}
            canBulk={editableFilteredSlugs.length > 0}
            onBulkSelect={() => handleBulkSelectFiltered(true)}
            onBulkClear={() => handleBulkSelectFiltered(false)}
          />

          <div className="max-h-72 overflow-y-auto rounded-surface border border-slate-200 divide-y divide-slate-200 bg-white">
            {paginatedSubjects.length === 0 ? (
              <div className="p-6 text-center text-xs sm:text-sm text-slate-500">
                {t('admin:modules.noSubjectsFound')}
              </div>
            ) : (
              paginatedSubjects.map((subj) => {
                const blockedByParentRole = Boolean(
                  parentAllowedSet && !parentAllowedSet.has(subj.slug)
                );
                const isAdminLocked =
                  subj.slug === 'admin' || Boolean(subj.locked);
                const isChecked =
                  !blockedByParentRole &&
                  (isAdminLocked || selectedSet.has(subj.slug));
                const rowDisabled = isAdminLocked || blockedByParentRole;

                return (
                  <label
                    key={subj.slug}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors duration-150 ${
                      blockedByParentRole
                        ? 'bg-slate-50 opacity-65 cursor-not-allowed'
                        : isAdminLocked
                          ? 'bg-sky-50/40 cursor-default'
                          : isChecked
                            ? 'bg-sky-50/40 hover:bg-sky-50/70 cursor-pointer'
                            : 'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={rowDisabled}
                        onChange={() => toggleSingleRole(subj.slug)}
                        className="w-4 h-4 accent-sky-700 rounded-control shrink-0"
                      />
                      <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {getRoleLabel(subj.slug, subj.name)}
                        </span>
                        {subj.slug === 'guest' ? (
                          <Badge size="sm" variant="default">
                            {t('admin:modules.guestBadge')}
                          </Badge>
                        ) : subj.is_system ? (
                          <Badge size="sm" variant="lesson">
                            {t('admin:modules.systemRoleBadge')}
                          </Badge>
                        ) : null}
                      </span>
                    </span>

                    {blockedByParentRole ? (
                      <Badge size="sm" variant="due">
                        {t('admin:modules.hiddenByParentBadge')}
                      </Badge>
                    ) : isAdminLocked ? (
                      <Badge size="sm" variant="lesson">
                        {t('admin:modules.alwaysEnabledBadge')}
                      </Badge>
                    ) : typeof subj.user_count === 'number' ? (
                      <Badge size="sm" variant="default" className="tabular-nums">
                        {t('admin:modules.accountsCount', {
                          count: formatNumber(subj.user_count),
                        })}
                      </Badge>
                    ) : null}
                  </label>
                );
              })
            )}
          </div>

          <AccessPaginationBar
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredSubjects.length}
            onPageChange={setPage}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <Badge variant="learned" className="tabular-nums">
          {t('admin:modules.viewCountSummary', {
            allowed: formatNumber(effectiveAllowedCount),
            total: formatNumber(availableRoles.length),
          })}
        </Badge>

        <div className="flex items-center gap-2.5 ml-auto">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : t('admin:modules.savePermissions')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ModuleRoleAccessModal({
  isOpen,
  onClose,
  moduleItem,
  parentMod,
  availableRoles,
  roles,
  actionCatalog,
  viewPermCode,
  onSave,
  submitting,
}) {
  const { t } = useTranslation(['admin', 'rbac']);
  const hasActions = Array.isArray(actionCatalog) && actionCatalog.length > 0;
  const parentAllowedSet = useMemo(
    () =>
      Array.isArray(parentMod?.allowed_roles)
        ? new Set(parentMod.allowed_roles)
        : null,
    [parentMod]
  );

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={t('admin:modules.modalTitle', {
        name: getModuleLabel(moduleItem?.key, moduleItem?.name),
      })}
      maxWidthClass={hasActions ? 'sm:max-w-2xl' : 'sm:max-w-xl'}
    >
      {hasActions ? (
        <ModuleActionsAccessModalBody
          moduleItem={moduleItem}
          parentMod={parentMod}
          parentAllowedSet={parentAllowedSet}
          availableRoles={availableRoles}
          roles={roles}
          actionCatalog={actionCatalog}
          viewPermCode={viewPermCode}
          onSave={onSave}
          onClose={onClose}
          submitting={submitting}
        />
      ) : (
        <ModuleVisibilityAccessModalBody
          moduleItem={moduleItem}
          parentMod={parentMod}
          parentAllowedSet={parentAllowedSet}
          availableRoles={availableRoles}
          onSave={onSave}
          onClose={onClose}
          submitting={submitting}
        />
      )}
    </AdminModalShell>
  );
}

export default function AdminModulesTab({
  hasPermission,
  refreshCurrentUser,
}) {
  const { t, i18n } = useTranslation(['admin', 'rbac', 'common']);
  const { refreshSystemConfig, updateModulesSnapshot } = useSystemConfig();
  const { showToast } = useToast();

  const canToggleGlobal = hasPermission
    ? Boolean(hasPermission('modules.toggle'))
    : true;
  const canEditRoleVisibility = hasPermission
    ? Boolean(
        hasPermission('modules.assign_roles') || hasPermission('roles.edit')
      )
    : true;

  const [groups, setGroups] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(FALLBACK_SUBJECTS);
  const [rolesList, setRolesList] = useState([]);
  const [actionCatalogByKey, setActionCatalogByKey] = useState({});
  const [moduleViewPermByKey, setModuleViewPermByKey] = useState({});
  const [draftNotes, setDraftNotes] = useState({});
  const [expandedNoteKeys, setExpandedNoteKeys] = useState({});
  const [roleAccessTargetKey, setRoleAccessTargetKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const applyServerPayload = useCallback(
    (res) => {
      if (Array.isArray(res?.module_groups)) {
        setGroups(res.module_groups);
      }
      if (
        Array.isArray(res?.available_roles) &&
        res.available_roles.length > 0
      ) {
        setAvailableRoles(res.available_roles);
      }
      if (Array.isArray(res?.roles)) {
        setRolesList(res.roles);
      }
      if (
        res?.action_catalog_by_key &&
        typeof res.action_catalog_by_key === 'object'
      ) {
        setActionCatalogByKey(res.action_catalog_by_key);
      }
      if (
        res?.module_view_perm_by_key &&
        typeof res.module_view_perm_by_key === 'object'
      ) {
        setModuleViewPermByKey(res.module_view_perm_by_key);
      }
      if (Array.isArray(res?.results)) {
        setModulesList(res.results);
        const nextDrafts = {};
        res.results.forEach((item) => {
          nextDrafts[item.key] = item.maintenance_note || '';
        });
        setDraftNotes(nextDrafts);
      }
      if (res?.modules_map) {
        updateModulesSnapshot(res.modules_map);
      }
    },
    [updateModulesSnapshot]
  );

  const reloadModules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminModules();
      applyServerPayload(res);
    } catch (err) {
      setError(err.message || t('admin:modules.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetchAdminModules()
      .then((res) => {
        if (!ignore) {
          applyServerPayload(res);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || t('admin:modules.loadError'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [applyServerPayload, i18n.language, t]);

  const subjectNameBySlug = useMemo(() => {
    const map = {};
    availableRoles.forEach((r) => {
      map[r.slug] = getRoleLabel(r.slug, r.name);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRoles, i18n.language]);

  const modulesByKey = useMemo(() => {
    const map = {};
    modulesList.forEach((m) => {
      map[m.key] = m;
    });
    return map;
  }, [modulesList]);

  const groupedModules = useMemo(() => {
    const groupList =
      groups.length > 0
        ? groups
        : [
            { key: 'access', label: getModuleGroupLabel('access') },
            { key: 'cards', label: getModuleGroupLabel('cards') },
            { key: 'shadowing', label: getModuleGroupLabel('shadowing') },
          ];

    return groupList
      .map((grp) => {
        const itemsInGroup = modulesList.filter((m) => m.group === grp.key);
        const roots = itemsInGroup.filter((m) => !m.parent_key);
        const ordered = [];
        roots.forEach((root) => {
          ordered.push(root);
          itemsInGroup
            .filter((child) => child.parent_key === root.key)
            .forEach((child) => ordered.push(child));
        });
        itemsInGroup
          .filter((m) => m.parent_key && !ordered.includes(m))
          .forEach((orphan) => ordered.push(orphan));
        return {
          ...grp,
          label: getModuleGroupLabel(grp.key, grp.label),
          items: ordered,
        };
      })
      .filter((grp) => grp.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, modulesList, i18n.language]);

  const handleToggleModule = async (mod) => {
    if (busyKey || !canToggleGlobal) return;
    const nextEnabled = !mod.raw_enabled;
    const note = (draftNotes[mod.key] ?? mod.maintenance_note ?? '').trim();
    const modName = getModuleLabel(mod.key, mod.name);
    setBusyKey(mod.key);
    try {
      const res = await updateAdminModule(mod.key, {
        is_enabled: nextEnabled,
        maintenance_note: note,
      });
      applyServerPayload(res);
      await Promise.all([refreshSystemConfig?.(), refreshCurrentUser?.()]);
      showToast(
        nextEnabled
          ? t('admin:modules.toggleEnabledToast', { name: modName })
          : t('admin:modules.toggleDisabledToast', { name: modName }),
        'success'
      );
    } catch (err) {
      showToast(err.message || t('admin:modules.toggleFailed'), 'error');
    } finally {
      setBusyKey('');
    }
  };

  const handleSaveNote = async (mod) => {
    if (busyKey || !canToggleGlobal) return;
    const note = (draftNotes[mod.key] ?? '').trim();
    const modName = getModuleLabel(mod.key, mod.name);
    setBusyKey(mod.key);
    try {
      const res = await updateAdminModule(mod.key, {
        is_enabled: mod.raw_enabled,
        maintenance_note: note,
      });
      applyServerPayload(res);
      if (mod.raw_enabled) {
        setExpandedNoteKeys((prev) => ({ ...prev, [mod.key]: false }));
      }
      showToast(
        t('admin:modules.noteSavedToast', { name: modName }),
        'success'
      );
    } catch (err) {
      showToast(err.message || t('admin:modules.noteSaveFailed'), 'error');
    } finally {
      setBusyKey('');
    }
  };

  const handleSaveRoleAccess = async (mod, payload) => {
    if (!mod || busyKey || !canEditRoleVisibility) return;
    const modName = getModuleLabel(mod.key, mod.name);
    setBusyKey(mod.key);
    try {
      const res = await updateAdminModule(mod.key, payload);
      applyServerPayload(res);
      await Promise.all([refreshSystemConfig?.(), refreshCurrentUser?.()]);
      setRoleAccessTargetKey(null);
      showToast(
        payload?.role_permissions
          ? t('admin:modules.permissionsSavedToast', { name: modName })
          : payload?.allowed_roles === null
            ? t('admin:modules.visibilityAllToast', { name: modName })
            : t('admin:modules.visibilitySavedToast', { name: modName }),
        'success'
      );
    } catch (err) {
      showToast(
        err.message || t('admin:modules.permissionsSaveFailed'),
        'error'
      );
    } finally {
      setBusyKey('');
    }
  };

  if (loading && modulesList.length === 0) {
    return <Skeleton variant="admin-modules" />;
  }

  if (error && modulesList.length === 0) {
    return (
      <EmptyState
        icon={ExclamationCircleIcon}
        title={t('admin:modules.loadErrorTitle')}
        description={error}
        actionLabel={t('common:actions.retry')}
        onAction={reloadModules}
      />
    );
  }

  const activeModalModule = roleAccessTargetKey
    ? modulesByKey[roleAccessTargetKey] || null
    : null;
  const activeModalParent = activeModalModule?.parent_key
    ? modulesByKey[activeModalModule.parent_key] || null
    : null;

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4">
      {groupedModules.map((group) => {
        const enabledCount = group.items.filter(
          (i) => i.effective_enabled
        ).length;
        return (
          <Card key={group.key} className="overflow-hidden">
            {/* Group Header */}
            <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                {group.label}
              </h2>
              <Badge
                variant={
                  enabledCount === group.items.length ? 'mastered' : 'default'
                }
                className="tabular-nums"
              >
                {t('admin:modules.groupActiveCount', {
                  enabled: formatNumber(enabledCount),
                  total: formatNumber(group.items.length),
                })}
              </Badge>
            </div>

            {/* Single-Row SaaS Feature Controls: Badges Left, Actions Right */}
            <div className="divide-y divide-slate-200">
              {group.items.map((mod) => {
                const modName = getModuleLabel(mod.key, mod.name);
                const isChild = Boolean(mod.parent_key);
                const blockedByParent =
                  mod.raw_enabled && !mod.effective_enabled;
                const isBusy = busyKey === mod.key;
                const currentDraft = draftNotes[mod.key] ?? '';
                const savedNote = (mod.maintenance_note || '').trim();
                const noteDirty = currentDraft.trim() !== savedNote;
                const isNoteExpanded = Boolean(expandedNoteKeys[mod.key]);
                const showNoteEditor =
                  canToggleGlobal && (!mod.raw_enabled || isNoteExpanded);

                const parentMod = mod.parent_key
                  ? modulesByKey[mod.parent_key]
                  : null;
                const isRestrictedEffective = Array.isArray(mod.allowed_roles);
                const inheritedFromParentOnly =
                  !Array.isArray(mod.raw_allowed_roles) &&
                  Array.isArray(parentMod?.allowed_roles);
                const previewRoleSlugs = isRestrictedEffective
                  ? mod.allowed_roles.slice(0, 2)
                  : [];
                const extraRoleCount = isRestrictedEffective
                  ? Math.max(0, mod.allowed_roles.length - 2)
                  : 0;
                const moduleActions = actionCatalogByKey[mod.key] || [];

                return (
                  <div
                    key={mod.key}
                    className={`py-2.5 flex flex-col gap-2 transition-colors duration-150 ${
                      isChild
                        ? 'pl-6 sm:pl-8 pr-3.5 sm:pr-4 bg-slate-50/50'
                        : 'px-3.5 sm:px-4 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                      {/* Left: Title + Non-interactive Informational Badges */}
                      <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {modName}
                        </span>

                        {blockedByParent ? (
                          <Badge variant="due" dot>
                            {t('admin:modules.blockedByParentBadge')}
                          </Badge>
                        ) : mod.effective_enabled ? (
                          <Badge variant="mastered" dot>
                            {t('admin:modules.enabledBadge')}
                          </Badge>
                        ) : (
                          <Badge variant="again" dot>
                            {t('admin:modules.disabledBadge')}
                          </Badge>
                        )}

                        {mod.role_scoped &&
                          (!isRestrictedEffective ? (
                            <Badge variant="default">
                              {t('admin:modules.allRolesAndGuest')}
                            </Badge>
                          ) : (
                            <>
                              {previewRoleSlugs.map((slug) => (
                                <Badge key={slug} variant="learned">
                                  {subjectNameBySlug[slug] || slug}
                                </Badge>
                              ))}
                              {extraRoleCount > 0 && (
                                <Badge variant="default" className="tabular-nums">
                                  {t('admin:modules.extraRolesCount', {
                                    count: formatNumber(extraRoleCount),
                                  })}
                                </Badge>
                              )}
                              {inheritedFromParentOnly && (
                                <Badge variant="due">
                                  {t('admin:modules.inheritedFromParentBadge')}
                                </Badge>
                              )}
                            </>
                          ))}

                        {moduleActions.length > 0 && (
                          <Badge variant="default" className="tabular-nums">
                            {t('admin:modules.actionsCountBadge', {
                              count: formatNumber(moduleActions.length),
                            })}
                          </Badge>
                        )}

                        {mod.raw_enabled && savedNote && !showNoteEditor && (
                          <Badge variant="due">
                            {t('admin:modules.hasNoteBadge')}
                          </Badge>
                        )}
                      </div>

                      {/* Right: Interactive Buttons & Toggle Switch */}
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {canToggleGlobal && mod.raw_enabled && (
                          <Button
                            variant={isNoteExpanded ? 'secondary' : 'ghost'}
                            size="icon"
                            disabled={isBusy}
                            onClick={() =>
                              setExpandedNoteKeys((prev) => ({
                                ...prev,
                                [mod.key]: !prev[mod.key],
                              }))
                            }
                            aria-label={t('admin:modules.noteButtonAria', {
                              name: modName,
                            })}
                            title={t('admin:modules.noteButtonTitle')}
                          >
                            <ChatBubbleLeftEllipsisIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </Button>
                        )}

                        {mod.role_scoped && canEditRoleVisibility && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => setRoleAccessTargetKey(mod.key)}
                          >
                            {t('admin:modules.permissionsButton')}
                          </Button>
                        )}

                        <button
                          type="button"
                          role="switch"
                          aria-checked={mod.raw_enabled}
                          aria-label={t('admin:modules.toggleAria', {
                            name: modName,
                          })}
                          disabled={isBusy || !canToggleGlobal}
                          onClick={() => handleToggleModule(mod)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                            mod.raw_enabled
                              ? 'bg-sky-700 border-sky-700'
                              : 'bg-slate-200 border-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150 ${
                              mod.raw_enabled
                                ? 'translate-x-5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {showNoteEditor && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5">
                        <input
                          type="text"
                          maxLength={255}
                          value={currentDraft}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [mod.key]: e.target.value,
                            }))
                          }
                          placeholder={t(
                            'admin:modules.maintenanceNotePlaceholder'
                          )}
                          aria-label={t('admin:modules.maintenanceNoteAria', {
                            name: modName,
                          })}
                          className="flex-1 h-9 px-3 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                        />

                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {mod.raw_enabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDraftNotes((prev) => ({
                                  ...prev,
                                  [mod.key]: mod.maintenance_note || '',
                                }));
                                setExpandedNoteKeys((prev) => ({
                                  ...prev,
                                  [mod.key]: false,
                                }));
                              }}
                            >
                              {t('common:actions.close')}
                            </Button>
                          )}
                          {noteDirty && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleSaveNote(mod)}
                            >
                              <CheckIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                              <span>{t('common:actions.save')}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {activeModalModule && (
        <ModuleRoleAccessModal
          key={`role-access-${activeModalModule.key}-${String(activeModalModule.updated_at || '')}`}
          isOpen={Boolean(activeModalModule)}
          onClose={() => setRoleAccessTargetKey(null)}
          moduleItem={activeModalModule}
          parentMod={activeModalParent}
          availableRoles={availableRoles}
          roles={rolesList}
          actionCatalog={actionCatalogByKey[activeModalModule.key] || []}
          viewPermCode={moduleViewPermByKey[activeModalModule.key] || ''}
          onSave={handleSaveRoleAccess}
          submitting={busyKey === activeModalModule.key}
        />
      )}
    </div>
  );
}

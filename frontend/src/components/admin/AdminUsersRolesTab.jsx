import React, {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  UsersIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import CommonTable from '../ui/CommonTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useSystemConfig } from '../../context/useSystemConfig';
import { useToast } from '../../context/useToast';
import { formatNumber } from '../../utils/formatters';
import {
  getRoleLabel,
  getModuleLabel,
  getPermissionGroupLabel,
  getPermissionLabel,
} from '../../utils/rbacLabels';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleAdminUserActive,
  resetAdminUserPassword,
  deleteAdminUser,
  fetchAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
} from '../../services/adminApi';
import {
  AdminSearchInput,
  AdminFilterPopover,
  AdminFilterChips,
  AdminPagination,
  AdminModalShell,
  AdminConfirmDialog,
} from './adminShared';
import { formatDateTimeVi, normalizeSearchText } from './adminConstants';

const FALLBACK_VISIBILITY_KEYS = {
  courses: ['courses'],
  cards: ['study.cards'],
  personal_cards: ['study.personal_cards'],
  shadowing: [
    'shadowing',
    'shadowing.pronunciation',
    'shadowing.listening',
    'shadowing.exercise',
    'shadowing.extraction',
  ],
  users: [],
  roles: [],
  modules: [],
  system: [],
};

const VIEW_PERM_BY_MODULE_KEY = {
  courses: 'courses.view',
  'study.cards': 'cards.view',
  'study.personal_cards': 'personal_cards.view',
  shadowing: 'shadowing.view',
};

const MODULE_KEY_BY_VIEW_PERM = Object.fromEntries(
  Object.entries(VIEW_PERM_BY_MODULE_KEY).map(([modKey, permCode]) => [
    permCode,
    modKey,
  ])
);

const DEFAULT_LEARNER_PERMS = [
  'courses.view',
  'courses.create_own',
  'courses.edit_own',
  'courses.delete_own',
  'cards.view',
  'personal_cards.view',
  'cards.create_own',
  'cards.edit_own',
  'cards.delete_own',
  'shadowing.view',
  'shadowing.create_own',
  'shadowing.edit_own',
  'shadowing.delete_own',
];

const ROLES_PAGE_SIZE = 12;

function getRoleBadgeVariant(slug) {
  if (slug === 'admin') return 'level';
  if (slug === 'moderator') return 'lesson';
  return 'default';
}

function getUserInitials(user) {
  const raw =
    (user?.first_name || '').trim() ||
    (user?.username || '').trim() ||
    'U';
  return raw.slice(0, 2).toUpperCase();
}

function UserFormModal({
  isOpen,
  onClose,
  editingUser,
  roles,
  currentUserId,
  canTouchAdminRole,
  canLockUser,
  canResetPassword,
  onSaved,
}) {
  const { t } = useTranslation(['admin', 'rbac', 'common']);
  const isEditing = Boolean(editingUser);
  const isSelf = isEditing && editingUser.id === currentUserId;
  const canChangeActive = !isSelf && (!isEditing || canLockUser);
  const canChangePassword = !isEditing || canResetPassword;

  const [username, setUsername] = useState(editingUser?.username || '');
  const [email, setEmail] = useState(editingUser?.email || '');
  const [firstName, setFirstName] = useState(editingUser?.first_name || '');
  const [lastName, setLastName] = useState(editingUser?.last_name || '');
  const [roleSlug, setRoleSlug] = useState(
    editingUser?.role_slug || 'learner'
  );
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(
    editingUser ? Boolean(editingUser.is_active) : true
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = roles
    .filter((r) => canTouchAdminRole || r.slug !== 'admin')
    .map((r) => ({ value: r.slug, label: getRoleLabel(r.slug, r.name) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!username.trim()) {
      nextErrors.username = t('admin:usersRoles.userModal.errors.usernameRequired');
    }
    if (!email.trim()) {
      nextErrors.email = t('admin:usersRoles.userModal.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = t('admin:usersRoles.userModal.errors.emailInvalid');
    }
    if (!isEditing && !password) {
      nextErrors.password = t('admin:usersRoles.userModal.errors.passwordRequired');
    } else if (canChangePassword && password && password.length < 8) {
      nextErrors.password = t('admin:usersRoles.userModal.errors.passwordTooShort');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      if (!isSelf) {
        payload.role_slug = roleSlug;
      }
      if (canChangeActive) {
        payload.is_active = isActive;
      }
      if (canChangePassword && password) {
        payload.password = password;
      }

      const saved = isEditing
        ? await updateAdminUser(editingUser.id, payload)
        : await createAdminUser(payload);

      onSaved?.(saved, isEditing);
      onClose?.();
    } catch (err) {
      setFormError(
        err.message || t('admin:usersRoles.userModal.errors.saveFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={
        isEditing
          ? t('admin:usersRoles.userModal.editTitle')
          : t('admin:usersRoles.userModal.createTitle')
      }
      maxWidthClass="sm:max-w-lg"
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <div className="p-3 rounded-control bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-user-username"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:usersRoles.userModal.usernameLabel')}
            </label>
            <input
              id="admin-user-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`h-10 px-3.5 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                errors.username
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
              }`}
            />
            {errors.username && (
              <span className="text-xs font-medium text-red-600">
                {errors.username}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-user-email"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:usersRoles.userModal.emailLabel')}
            </label>
            <input
              id="admin-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`h-10 px-3.5 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                errors.email
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
              }`}
            />
            {errors.email && (
              <span className="text-xs font-medium text-red-600">
                {errors.email}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-user-lastname"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:usersRoles.userModal.lastNameLabel')}
            </label>
            <input
              id="admin-user-lastname"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 px-3.5 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-user-firstname"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:usersRoles.userModal.firstNameLabel')}
            </label>
            <input
              id="admin-user-firstname"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 px-3.5 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:usersRoles.userModal.roleLabel')}
            </span>
            <Dropdown
              value={roleSlug}
              onChange={setRoleSlug}
              options={roleOptions}
              disabled={isSelf}
              ariaLabel={t('admin:usersRoles.userModal.roleAria')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">
              {t('admin:usersRoles.userModal.statusLabel')}
            </span>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200 rounded-control p-1 h-10">
              <button
                type="button"
                disabled={!canChangeActive}
                onClick={() => setIsActive(true)}
                className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                {t('admin:usersRoles.userModal.activeOption')}
              </button>
              <button
                type="button"
                disabled={!canChangeActive}
                onClick={() => setIsActive(false)}
                className={`rounded-control text-xs font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  !isActive
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                {t('admin:usersRoles.userModal.lockedOption')}
              </button>
            </div>
          </div>
        </div>

        {canChangePassword && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-user-password"
              className="text-xs font-medium text-slate-700"
            >
              {isEditing
                ? t('admin:usersRoles.userModal.passwordLabelEdit')
                : t('admin:usersRoles.userModal.passwordLabelCreate')}
            </label>
            <input
              id="admin-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isEditing
                  ? t('admin:usersRoles.userModal.passwordPlaceholderEdit')
                  : t('admin:usersRoles.userModal.passwordPlaceholderCreate')
              }
              className={`h-10 px-3.5 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                errors.password
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
              }`}
            />
            {errors.password && (
              <span className="text-xs font-medium text-red-600">
                {errors.password}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : isEditing
                ? t('common:actions.saveChanges')
                : t('admin:usersRoles.userModal.submitCreate')}
          </Button>
        </div>
      </form>
    </AdminModalShell>
  );
}

function ResetPasswordModal({ isOpen, onClose, targetUser, onSuccess }) {
  const { t } = useTranslation(['admin', 'common']);
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError(t('admin:usersRoles.resetPwdModal.errors.tooShort'));
      return;
    }
    if (password !== confirmPwd) {
      setError(t('admin:usersRoles.resetPwdModal.errors.mismatch'));
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await resetAdminUserPassword(targetUser.id, password);
      onSuccess?.(targetUser);
      onClose?.();
    } catch (err) {
      setError(
        err.message || t('admin:usersRoles.resetPwdModal.errors.failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={t('admin:usersRoles.resetPwdModal.title', {
        username: targetUser?.username || '',
      })}
      maxWidthClass="sm:max-w-md"
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-control bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reset-pwd-input"
            className="text-xs font-medium text-slate-700"
          >
            {t('admin:usersRoles.resetPwdModal.newPasswordLabel')}
          </label>
          <input
            id="reset-pwd-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('admin:usersRoles.resetPwdModal.newPasswordPlaceholder')}
            className="h-10 px-3.5 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reset-pwd-confirm"
            className="text-xs font-medium text-slate-700"
          >
            {t('admin:usersRoles.resetPwdModal.confirmPasswordLabel')}
          </label>
          <input
            id="reset-pwd-confirm"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder={t('admin:usersRoles.resetPwdModal.confirmPasswordPlaceholder')}
            className="h-10 px-3.5 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : t('admin:usersRoles.resetPwdModal.submit')}
          </Button>
        </div>
      </form>
    </AdminModalShell>
  );
}

function RoleFormModal({
  isOpen,
  onClose,
  editingRole,
  permissionGroups,
  permissionCatalog,
  roleScopedModules,
  onSaved,
}) {
  const { t } = useTranslation(['admin', 'rbac', 'common']);
  const isEditing = Boolean(editingRole);
  const isAdminSystemRole = editingRole?.slug === 'admin';

  const allModuleKeys = useMemo(
    () => roleScopedModules.map((m) => m.key),
    [roleScopedModules]
  );
  const allPermCodes = useMemo(
    () => permissionCatalog.map((p) => p.code),
    [permissionCatalog]
  );
  const roleScopedModulesByKey = useMemo(() => {
    const map = {};
    roleScopedModules.forEach((m) => {
      map[m.key] = m;
    });
    return map;
  }, [roleScopedModules]);

  const [name, setName] = useState(editingRole?.name || '');
  const [slug, setSlug] = useState(editingRole?.slug || '');
  const [selectedPerms, setSelectedPerms] = useState(() =>
    Array.isArray(editingRole?.permissions)
      ? [...editingRole.permissions]
      : [...DEFAULT_LEARNER_PERMS]
  );
  const [selectedModules, setSelectedModules] = useState(() =>
    Array.isArray(editingRole?.visible_modules)
      ? [...editingRole.visible_modules]
      : roleScopedModules.map((m) => m.key)
  );
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const unifiedModules = useMemo(
    () =>
      permissionGroups
        .map((grp) => {
          const visKeys = Array.isArray(grp.visibility_keys)
            ? grp.visibility_keys
            : FALLBACK_VISIBILITY_KEYS[grp.key] || [];
          const visItems = visKeys
            .map((k) => roleScopedModulesByKey[k])
            .filter(Boolean);
          const actItems = permissionCatalog.filter((p) => p.group === grp.key);
          const actCodeSet = new Set(actItems.map((p) => p.code));
          const displayVisItems = visItems.filter((mod) => {
            const viewPerm = VIEW_PERM_BY_MODULE_KEY[mod.key];
            return !(viewPerm && actCodeSet.has(viewPerm));
          });
          return {
            ...grp,
            visItems,
            displayVisItems,
            actItems,
          };
        })
        .filter((grp) => grp.visItems.length > 0 || grp.actItems.length > 0),
    [permissionGroups, permissionCatalog, roleScopedModulesByKey]
  );

  const togglePerm = (code) => {
    if (isAdminSystemRole) return;
    const isTurningOff = selectedPerms.includes(code);
    setSelectedPerms((prev) =>
      isTurningOff ? prev.filter((c) => c !== code) : [...prev, code]
    );

    const syncedModuleKey = MODULE_KEY_BY_VIEW_PERM[code];
    if (syncedModuleKey) {
      setSelectedModules((prev) => {
        const next = new Set(prev);
        if (isTurningOff) {
          next.delete(syncedModuleKey);
          roleScopedModules.forEach((item) => {
            if (item.parent_key === syncedModuleKey) {
              next.delete(item.key);
            }
          });
        } else {
          next.add(syncedModuleKey);
          roleScopedModules.forEach((item) => {
            if (item.parent_key === syncedModuleKey) {
              next.add(item.key);
            }
          });
        }
        return allModuleKeys.filter((k) => next.has(k));
      });
    }
  };

  const toggleModuleVisibility = (mod) => {
    if (isAdminSystemRole) return;
    const isTurningOff = selectedModules.includes(mod.key);
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (isTurningOff) {
        next.delete(mod.key);
        roleScopedModules.forEach((item) => {
          if (item.parent_key === mod.key) {
            next.delete(item.key);
          }
        });
      } else {
        next.add(mod.key);
        if (mod.parent_key) {
          next.add(mod.parent_key);
        } else {
          roleScopedModules.forEach((item) => {
            if (item.parent_key === mod.key) {
              next.add(item.key);
            }
          });
        }
      }
      return allModuleKeys.filter((k) => next.has(k));
    });

    if (!isTurningOff && mod.parent_key) {
      const parentViewPerm = VIEW_PERM_BY_MODULE_KEY[mod.parent_key];
      if (parentViewPerm) {
        setSelectedPerms((prev) =>
          prev.includes(parentViewPerm) ? prev : [...prev, parentViewPerm]
        );
      }
    }
  };

  const toggleWholeModule = (grp) => {
    if (isAdminSystemRole) return;
    const visKeys = grp.visItems.map((m) => m.key);
    const displayVisKeys = grp.displayVisItems.map((m) => m.key);
    const actCodes = grp.actItems.map((p) => p.code);
    const allVisChecked = displayVisKeys.every((k) =>
      selectedModules.includes(k)
    );
    const allActChecked = actCodes.every((c) => selectedPerms.includes(c));
    const shouldUncheck = allVisChecked && allActChecked;

    if (visKeys.length > 0) {
      setSelectedModules((prev) => {
        const next = new Set(prev);
        if (shouldUncheck) {
          visKeys.forEach((k) => next.delete(k));
        } else {
          grp.visItems.forEach((m) => {
            next.add(m.key);
            if (m.parent_key) next.add(m.parent_key);
          });
        }
        return allModuleKeys.filter((k) => next.has(k));
      });
    }

    if (actCodes.length > 0) {
      setSelectedPerms((prev) => {
        if (shouldUncheck) {
          return prev.filter((c) => !actCodes.includes(c));
        }
        return Array.from(new Set([...prev, ...actCodes]));
      });
    }
  };

  const isEverythingSelected =
    allModuleKeys.every((k) => selectedModules.includes(k)) &&
    allPermCodes.every((c) => selectedPerms.includes(c));

  const toggleEverything = () => {
    if (isAdminSystemRole) return;
    if (isEverythingSelected) {
      setSelectedModules([]);
      setSelectedPerms([]);
    } else {
      setSelectedModules([...allModuleKeys]);
      setSelectedPerms([...allPermCodes]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(t('admin:usersRoles.roleModal.errors.nameRequired'));
      return;
    }
    setNameError('');
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: '',
        permissions: selectedPerms,
        visible_modules: selectedModules,
      };
      if (!editingRole?.is_system && slug.trim()) {
        payload.slug = slug.trim().toLowerCase();
      }

      const saved = isEditing
        ? await updateAdminRole(editingRole.id, payload)
        : await createAdminRole(payload);
      onSaved?.(saved, isEditing);
      onClose?.();
    } catch (err) {
      setFormError(
        err.message || t('admin:usersRoles.roleModal.errors.saveFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={
        isEditing
          ? t('admin:usersRoles.roleModal.editTitle')
          : t('admin:usersRoles.roleModal.createTitle')
      }
      maxWidthClass="sm:max-w-3xl"
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <div className="p-3 rounded-control bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="role-name-input"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:usersRoles.roleModal.nameLabel')}
            </label>
            <input
              id="role-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin:usersRoles.roleModal.namePlaceholder')}
              className={`h-10 px-3.5 rounded-control bg-white border text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                nameError
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
              }`}
            />
            {nameError && (
              <span className="text-xs font-medium text-red-600">
                {nameError}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="role-slug-input"
              className="text-xs font-medium text-slate-700"
            >
              {t('admin:usersRoles.roleModal.slugLabel')}
            </label>
            <input
              id="role-slug-input"
              type="text"
              disabled={Boolean(editingRole?.is_system)}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t('admin:usersRoles.roleModal.slugPlaceholder')}
              className="h-10 px-3.5 rounded-control bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-900 transition-colors duration-150 focus:outline-none focus:border-sky-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 disabled:opacity-60 disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* Single Unified Module -> Actions Matrix (Zero Descriptions) */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-700">
                {t('admin:usersRoles.roleModal.matrixTitle')}
              </span>
              {allModuleKeys.length > 0 && (
                <Badge size="sm" variant="learned" className="tabular-nums">
                  {t('admin:usersRoles.roleModal.visibleBadge', {
                    selected: formatNumber(selectedModules.length),
                    total: formatNumber(allModuleKeys.length),
                  })}
                </Badge>
              )}
              <Badge size="sm" variant="default" className="tabular-nums">
                {t('admin:usersRoles.roleModal.actionsBadge', {
                  selected: formatNumber(selectedPerms.length),
                  total: formatNumber(allPermCodes.length),
                })}
              </Badge>
            </div>

            {isAdminSystemRole ? (
              <Badge variant="lesson">
                {t('admin:usersRoles.roleModal.adminFullAccess')}
              </Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={toggleEverything}>
                {isEverythingSelected
                  ? t('admin:usersRoles.roleModal.deselectAll')
                  : t('admin:usersRoles.roleModal.selectAll')}
              </Button>
            )}
          </div>

          <div className="rounded-surface border border-slate-200 divide-y divide-slate-200 overflow-hidden bg-white">
            {unifiedModules.map((grp) => {
              const checkedVisCount = grp.displayVisItems.filter((m) =>
                selectedModules.includes(m.key)
              ).length;
              const checkedActCount = grp.actItems.filter((p) =>
                selectedPerms.includes(p.code)
              ).length;
              const totalCount =
                grp.displayVisItems.length + grp.actItems.length;
              const checkedCount = checkedVisCount + checkedActCount;
              const allInModuleChecked =
                totalCount > 0 && checkedCount === totalCount;

              return (
                <div key={grp.key} className="flex flex-col">
                  {/* Module Header */}
                  <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-slate-900">
                        {getPermissionGroupLabel(grp.key, grp.label)}
                      </span>
                      <Badge
                        size="sm"
                        variant={checkedCount > 0 ? 'learned' : 'default'}
                        className="tabular-nums"
                      >
                        {formatNumber(checkedCount)}/{formatNumber(totalCount)}
                      </Badge>
                    </div>

                    {!isAdminSystemRole && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => toggleWholeModule(grp)}
                      >
                        {allInModuleChecked
                          ? t('admin:usersRoles.roleModal.deselectShort')
                          : t('admin:usersRoles.roleModal.selectAll')}
                      </Button>
                    )}
                  </div>

                  {/* Module Body: Sub-features + Granular Actions */}
                  <div className="p-3 sm:p-4 flex flex-col gap-3">
                    {grp.displayVisItems.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-medium text-slate-500">
                          {t('admin:usersRoles.roleModal.subFeaturesLabel')}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {grp.displayVisItems.map((mod) => {
                            const checked = selectedModules.includes(mod.key);
                            return (
                              <label
                                key={mod.key}
                                className={`h-9 px-3 rounded-control border flex items-center gap-2.5 transition-colors duration-150 ${
                                  isAdminSystemRole
                                    ? 'cursor-not-allowed opacity-80'
                                    : 'cursor-pointer'
                                } ${
                                  checked
                                    ? 'bg-sky-50 border-sky-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isAdminSystemRole}
                                  onChange={() => toggleModuleVisibility(mod)}
                                  className="w-4 h-4 accent-sky-700 rounded-control shrink-0"
                                />
                                <span className="text-xs font-medium text-slate-800 truncate">
                                  {getModuleLabel(
                                    mod.key,
                                    mod.short_label || mod.name
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {grp.actItems.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {grp.displayVisItems.length > 0 && (
                          <span className="text-[11px] font-medium text-slate-500">
                            {t('admin:usersRoles.roleModal.allowedActionsLabel')}
                          </span>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {grp.actItems.map((perm) => {
                            const checked = selectedPerms.includes(perm.code);
                            return (
                              <label
                                key={perm.code}
                                className={`h-9 px-3 rounded-control border flex items-center gap-2.5 transition-colors duration-150 ${
                                  isAdminSystemRole
                                    ? 'cursor-not-allowed opacity-80'
                                    : 'cursor-pointer'
                                } ${
                                  checked
                                    ? 'bg-sky-50 border-sky-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isAdminSystemRole}
                                  onChange={() => togglePerm(perm.code)}
                                  className="w-4 h-4 accent-sky-700 rounded-control shrink-0"
                                />
                                <span className="text-xs font-medium text-slate-800 truncate">
                                  {getPermissionLabel(perm.code, perm.label)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? t('common:actions.saving')
              : isEditing
                ? t('admin:usersRoles.roleModal.submitSave')
                : t('admin:usersRoles.roleModal.submitCreate')}
          </Button>
        </div>
      </form>
    </AdminModalShell>
  );
}

export default function AdminUsersRolesTab({
  currentUser,
  hasPermission,
  hasAnyPermission,
  refreshCurrentUser,
}) {
  const { t, i18n } = useTranslation(['admin', 'rbac', 'common']);
  const { refreshSystemConfig } = useSystemConfig();
  const { showToast } = useToast();

  const checkAny = (codes) =>
    hasAnyPermission
      ? hasAnyPermission(codes)
      : codes.some((c) => hasPermission?.(c));

  const canAccessUsers = checkAny([
    'users.view',
    'users.create',
    'users.edit',
    'users.lock',
    'users.reset_password',
    'users.delete',
  ]);
  const canCreateUser = Boolean(hasPermission('users.create'));
  const canEditUser = Boolean(hasPermission('users.edit'));
  const canLockUser = Boolean(hasPermission('users.lock'));
  const canResetPassword = Boolean(hasPermission('users.reset_password'));
  const canDeleteUser = Boolean(hasPermission('users.delete'));
  const canAnyUserRowAction =
    canEditUser || canLockUser || canResetPassword || canDeleteUser;

  const canAccessRoles = checkAny([
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
  ]);
  const canCreateRole = Boolean(hasPermission('roles.create'));
  const canEditRole = Boolean(hasPermission('roles.edit'));
  const canDeleteRole = Boolean(hasPermission('roles.delete'));
  const canAnyRoleRowAction = canEditRole || canDeleteRole;
  const canTouchAdminRole = Boolean(
    currentUser?.role_slug === 'admin' || canEditRole
  );

  const [subTab, setSubTab] = useState(() =>
    canAccessUsers ? 'users' : 'roles'
  );
  const activeSubTab =
    !canAccessUsers && subTab === 'users'
      ? 'roles'
      : !canAccessRoles && subTab === 'roles'
        ? 'users'
        : subTab;

  const [roles, setRoles] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [roleScopedModules, setRoleScopedModules] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const [rolesReloadTick, setRolesReloadTick] = useState(0);

  const [roleSearchInput, setRoleSearchInput] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState('');
  const [roleModuleFilter, setRoleModuleFilter] = useState('');
  const [rolePermFilter, setRolePermFilter] = useState('');
  const [rolePage, setRolePage] = useState(1);
  const deferredRoleSearch = useDeferredValue(roleSearchInput);

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersReloadTick, setUsersReloadTick] = useState(0);

  const [userModalState, setUserModalState] = useState({
    open: false,
    user: null,
  });
  const [resetPwdTarget, setResetPwdTarget] = useState(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);
  const [roleModalState, setRoleModalState] = useState({
    open: false,
    role: null,
  });
  const [deleteRoleTarget, setDeleteRoleTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!canAccessRoles && !canAccessUsers) return undefined;
    let ignore = false;
    fetchAdminRoles()
      .then((res) => {
        if (ignore) return;
        setRoles(Array.isArray(res?.results) ? res.results : []);
        setPermissionGroups(
          Array.isArray(res?.permission_groups) ? res.permission_groups : []
        );
        setPermissionCatalog(
          Array.isArray(res?.permission_catalog) ? res.permission_catalog : []
        );
        setRoleScopedModules(
          Array.isArray(res?.role_scoped_modules)
            ? res.role_scoped_modules
            : []
        );
        setRolesError('');
      })
      .catch((err) => {
        if (!ignore) {
          setRolesError(
            err.message || t('admin:usersRoles.rolesTable.loadError')
          );
        }
      })
      .finally(() => {
        if (!ignore) setRolesLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canAccessRoles, canAccessUsers, rolesReloadTick, i18n.language, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!canAccessUsers) return undefined;
    let ignore = false;
    fetchAdminUsers({
      page,
      search: debouncedSearch,
      role: roleFilter,
      status: statusFilter,
    })
      .then((res) => {
        if (ignore) return;
        setUsers(Array.isArray(res?.results) ? res.results : []);
        setTotalPages(res?.total_pages || 1);
        setTotal(res?.total || 0);
        setUsersError('');
      })
      .catch((err) => {
        if (!ignore) {
          setUsersError(
            err.message || t('admin:usersRoles.usersTable.loadError')
          );
        }
      })
      .finally(() => {
        if (!ignore) setUsersLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [
    canAccessUsers,
    page,
    debouncedSearch,
    roleFilter,
    statusFilter,
    usersReloadTick,
    i18n.language,
    t,
  ]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('admin:usersRoles.statusAll') },
      { value: 'active', label: t('admin:usersRoles.statusActive') },
      { value: 'inactive', label: t('admin:usersRoles.statusInactive') },
    ],
    [t]
  );

  const roleTypeOptions = useMemo(
    () => [
      { value: '', label: t('admin:usersRoles.roleTypeAll') },
      { value: 'system', label: t('admin:usersRoles.roleTypeSystem') },
      { value: 'custom', label: t('admin:usersRoles.roleTypeCustom') },
    ],
    [t]
  );

  const permissionLabelMap = {};
  permissionCatalog.forEach((p) => {
    permissionLabelMap[p.code] = getPermissionLabel(p.code, p.label);
  });

  const moduleLabelMap = {};
  roleScopedModules.forEach((m) => {
    moduleLabelMap[m.key] = getModuleLabel(m.key, m.short_label || m.name);
  });

  const roleFilterOptions = [
    { value: '', label: t('admin:usersRoles.usersTable.allRolesOption') },
    ...roles.map((r) => ({
      value: r.slug,
      label: getRoleLabel(r.slug, r.name),
    })),
  ];

  const roleModuleFilterOptions = [
    { value: '', label: t('admin:usersRoles.rolesTable.allModulesOption') },
    ...roleScopedModules.map((m) => ({
      value: m.key,
      label: getModuleLabel(m.key, m.name),
    })),
  ];

  const rolePermFilterOptions = [
    { value: '', label: t('admin:usersRoles.rolesTable.allPermsOption') },
    ...permissionCatalog.map((p) => ({
      value: p.code,
      label: getPermissionLabel(p.code, p.label),
    })),
  ];

  const q = normalizeSearchText(deferredRoleSearch);
  const allModKeys = roleScopedModules.map((m) => m.key);
  const filteredRoles = roles.filter((role) => {
    if (q) {
      const displayName = getRoleLabel(role.slug, role.name);
      const hitDisplay = normalizeSearchText(displayName).includes(q);
      const hitName = normalizeSearchText(role.name).includes(q);
      const hitSlug = normalizeSearchText(role.slug).includes(q);
      if (!hitDisplay && !hitName && !hitSlug) return false;
    }
    if (roleTypeFilter === 'system' && !role.is_system) return false;
    if (roleTypeFilter === 'custom' && role.is_system) return false;
    if (roleModuleFilter) {
      const vis = Array.isArray(role.visible_modules)
        ? role.visible_modules
        : allModKeys;
      if (!vis.includes(roleModuleFilter)) return false;
    }
    if (rolePermFilter) {
      const perms = Array.isArray(role.permissions) ? role.permissions : [];
      if (!perms.includes(rolePermFilter)) return false;
    }
    return true;
  });

  const roleTotalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ROLES_PAGE_SIZE)
  );
  const safeRolePage = Math.min(rolePage, roleTotalPages);
  const paginatedRoles = filteredRoles.slice(
    (safeRolePage - 1) * ROLES_PAGE_SIZE,
    safeRolePage * ROLES_PAGE_SIZE
  );

  const activeRoleChips = [];
  if (roleTypeFilter) {
    const typeLabel =
      roleTypeFilter === 'system'
        ? t('admin:usersRoles.roleTypeSystem')
        : roleTypeFilter === 'custom'
          ? t('admin:usersRoles.roleTypeCustom')
          : roleTypeFilter;
    activeRoleChips.push({
      key: 'type',
      label: t('admin:usersRoles.rolesTable.typeChip', { label: typeLabel }),
      onRemove: () => {
        setRoleTypeFilter('');
        setRolePage(1);
      },
    });
  }
  if (roleModuleFilter) {
    activeRoleChips.push({
      key: 'module',
      label: t('admin:usersRoles.rolesTable.moduleChip', {
        label: moduleLabelMap[roleModuleFilter] || roleModuleFilter,
      }),
      onRemove: () => {
        setRoleModuleFilter('');
        setRolePage(1);
      },
    });
  }
  if (rolePermFilter) {
    activeRoleChips.push({
      key: 'perm',
      label: t('admin:usersRoles.rolesTable.permChip', {
        label: permissionLabelMap[rolePermFilter] || rolePermFilter,
      }),
      onRemove: () => {
        setRolePermFilter('');
        setRolePage(1);
      },
    });
  }

  const handleJumpToUsersOfRole = (targetRoleSlug) => {
    if (!canAccessUsers) return;
    setUsersLoading(true);
    setRoleFilter(targetRoleSlug);
    setPage(1);
    setSubTab('users');
  };

  const activeUserChips = [];
  if (roleFilter) {
    const matched = roles.find((r) => r.slug === roleFilter);
    const roleDisplay = getRoleLabel(
      matched?.slug || roleFilter,
      matched?.name || roleFilter
    );
    activeUserChips.push({
      key: 'role',
      label: t('admin:usersRoles.usersTable.roleChip', {
        label: roleDisplay,
      }),
      onRemove: () => {
        setUsersLoading(true);
        setRoleFilter('');
        setPage(1);
      },
    });
  }
  if (statusFilter) {
    const statusLabel =
      statusFilter === 'active'
        ? t('admin:usersRoles.statusActive')
        : statusFilter === 'inactive'
          ? t('admin:usersRoles.statusInactive')
          : statusFilter;
    activeUserChips.push({
      key: 'status',
      label: statusLabel,
      onRemove: () => {
        setUsersLoading(true);
        setStatusFilter('');
        setPage(1);
      },
    });
  }

  const handleToggleLock = async (targetUser) => {
    if (actionBusy || !canLockUser) return;
    setActionBusy(true);
    try {
      const updated = await toggleAdminUserActive(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      showToast(
        updated.is_active
          ? t('admin:usersRoles.usersTable.unlockedToast', {
              username: updated.username,
            })
          : t('admin:usersRoles.usersTable.lockedToast', {
              username: updated.username,
            }),
        'success'
      );
    } catch (err) {
      showToast(
        err.message || t('admin:usersRoles.usersTable.toggleLockFailed'),
        'error'
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget || actionBusy || !canDeleteUser) return;
    setActionBusy(true);
    try {
      await deleteAdminUser(deleteUserTarget.id);
      showToast(
        t('admin:usersRoles.usersTable.deletedToast', {
          username: deleteUserTarget.username,
        }),
        'success'
      );
      setDeleteUserTarget(null);
      setUsersLoading(true);
      setUsersReloadTick((prev) => prev + 1);
      setRolesReloadTick((prev) => prev + 1);
    } catch (err) {
      showToast(
        err.message || t('admin:usersRoles.usersTable.deleteFailed'),
        'error'
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!deleteRoleTarget || actionBusy || !canDeleteRole) return;
    setActionBusy(true);
    try {
      await deleteAdminRole(deleteRoleTarget.id);
      const roleName = getRoleLabel(
        deleteRoleTarget.slug,
        deleteRoleTarget.name
      );
      showToast(
        t('admin:usersRoles.rolesTable.deletedToast', { name: roleName }),
        'success'
      );
      setDeleteRoleTarget(null);
      setRolesLoading(true);
      setRolesReloadTick((prev) => prev + 1);
      setUsersReloadTick((prev) => prev + 1);
      refreshSystemConfig?.();
    } catch (err) {
      showToast(
        err.message || t('admin:usersRoles.rolesTable.deleteFailed'),
        'error'
      );
    } finally {
      setActionBusy(false);
    }
  };

  const segmentedNav = (
    <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-control self-start shrink-0">
      {canAccessUsers && (
        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`h-8 px-3 rounded-control text-xs sm:text-sm font-medium inline-flex items-center justify-center transition-colors duration-150 cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-sky-700 text-white'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
        >
          {t('admin:usersRoles.tabs.users')}
        </button>
      )}
      {canAccessRoles && (
        <button
          type="button"
          onClick={() => setSubTab('roles')}
          className={`h-8 px-3 rounded-control text-xs sm:text-sm font-medium inline-flex items-center justify-center transition-colors duration-150 cursor-pointer ${
            activeSubTab === 'roles'
              ? 'bg-sky-700 text-white'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
        >
          {t('admin:usersRoles.tabs.roles')}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* SUB-TAB 1: COHESIVE SAAS DATA TABLE FOR USERS */}
      {activeSubTab === 'users' && canAccessUsers && (
        <Card className="flex flex-col">
          {/* Integrated Toolbar */}
          <div className="p-2.5 sm:p-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {segmentedNav}

            <div className="flex items-center gap-2 flex-1 lg:max-w-xl lg:justify-end">
              <AdminSearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder={t('admin:usersRoles.usersTable.searchPlaceholder')}
                ariaLabel={t('admin:usersRoles.usersTable.searchAria')}
              />

              <AdminFilterPopover
                title={t('admin:usersRoles.usersTable.filterTitle')}
                sections={[
                  ...(roles.length > 0
                    ? [
                        {
                          key: 'role',
                          label: t('admin:usersRoles.usersTable.filterRoleSection'),
                          options: roleFilterOptions,
                        },
                      ]
                    : []),
                  {
                    key: 'status',
                    label: t('admin:usersRoles.usersTable.filterStatusSection'),
                    options: statusOptions,
                  },
                ]}
                values={{ role: roleFilter, status: statusFilter }}
                onApply={(vals) => {
                  setUsersLoading(true);
                  setRoleFilter(vals.role || '');
                  setStatusFilter(vals.status || '');
                  setPage(1);
                }}
                onReset={() => {
                  setUsersLoading(true);
                  setRoleFilter('');
                  setStatusFilter('');
                  setPage(1);
                }}
              />

              {canCreateUser && (
                <Button
                  variant="primary"
                  size="md"
                  className="shrink-0"
                  onClick={() => setUserModalState({ open: true, user: null })}
                >
                  <PlusIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t('admin:usersRoles.usersTable.createButton')}
                  </span>
                  <span className="sm:hidden">
                    {t('admin:usersRoles.usersTable.createButtonShort')}
                  </span>
                </Button>
              )}
            </div>
          </div>

          <AdminFilterChips
            chips={activeUserChips}
            onClearAll={() => {
              setUsersLoading(true);
              setRoleFilter('');
              setStatusFilter('');
              setPage(1);
            }}
          />

          {usersLoading && users.length === 0 ? (
            <Skeleton variant="admin-list" count={6} embedded />
          ) : usersError && users.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ExclamationCircleIcon}
                title={t('admin:usersRoles.usersTable.loadErrorTitle')}
                description={usersError}
                actionLabel={t('common:actions.retry')}
                onAction={() => {
                  setUsersLoading(true);
                  setUsersReloadTick((prev) => prev + 1);
                }}
              />
            </div>
          ) : (
            <CommonTable
              embedded
              columns={[
                {
                  key: 'account',
                  header: t('admin:usersRoles.usersTable.columns.account'),
                  cellClassName: 'max-w-72',
                  render: (u) => {
                    const isSelf = u.id === currentUser?.id;
                    const fullName = [u.last_name, u.first_name]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-control bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                          {getUserInitials(u)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-slate-900 truncate">
                              {u.username}
                            </span>
                            {isSelf && (
                              <Badge size="sm" variant="learned">
                                {t('admin:usersRoles.usersTable.selfBadge')}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 truncate">
                            {u.email || t('admin:usersRoles.usersTable.noEmail')}
                            {fullName ? ` • ${fullName}` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'role',
                  header: t('admin:usersRoles.usersTable.columns.role'),
                  cellClassName: 'whitespace-nowrap',
                  render: (u) => (
                    <Badge variant={getRoleBadgeVariant(u.role_slug)}>
                      {getRoleLabel(u.role_slug, u.role_name)}
                    </Badge>
                  ),
                },
                {
                  key: 'status',
                  header: t('admin:usersRoles.usersTable.columns.status'),
                  cellClassName: 'whitespace-nowrap',
                  render: (u) => (
                    <Badge variant={u.is_active ? 'mastered' : 'again'} dot>
                      {u.is_active
                        ? t('admin:usersRoles.statusActiveShort')
                        : t('admin:usersRoles.statusInactive')}
                    </Badge>
                  ),
                },
                {
                  key: 'activity',
                  header: t('admin:usersRoles.usersTable.columns.activity'),
                  cellClassName:
                    'text-xs text-slate-600 whitespace-nowrap tabular-nums',
                  render: (u) => {
                    const totalCreated =
                      (u.courses_count || 0) +
                      (u.cards_count || 0) +
                      (u.videos_count || 0);
                    return t('admin:usersRoles.usersTable.activitySummary', {
                      reviews: formatNumber(u.reviews_count || 0),
                      content: formatNumber(totalCreated),
                    });
                  },
                },
                {
                  key: 'date_joined',
                  header: t('admin:usersRoles.usersTable.columns.dateJoined'),
                  cellClassName:
                    'text-xs text-slate-500 whitespace-nowrap tabular-nums',
                  render: (u) => formatDateTimeVi(u.date_joined),
                },
                canAnyUserRowAction && {
                  key: 'actions',
                  header: t('admin:usersRoles.usersTable.columns.actions'),
                  align: 'right',
                  render: (u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isTargetProtectedAdmin =
                      u.role_slug === 'admin' && !canTouchAdminRole;
                    return (
                      <div className="inline-flex items-center justify-end gap-1">
                        {canEditUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isTargetProtectedAdmin}
                            onClick={() =>
                              setUserModalState({ open: true, user: u })
                            }
                            aria-label={t('admin:usersRoles.usersTable.editAria', {
                              username: u.username,
                            })}
                          >
                            <PencilSquareIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                        {canResetPassword && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isTargetProtectedAdmin}
                            onClick={() => setResetPwdTarget(u)}
                            aria-label={t(
                              'admin:usersRoles.usersTable.resetPwdAria',
                              { username: u.username }
                            )}
                          >
                            <KeyIcon className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        )}
                        {canLockUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              isSelf || isTargetProtectedAdmin || actionBusy
                            }
                            onClick={() => handleToggleLock(u)}
                            aria-label={
                              u.is_active
                                ? t('admin:usersRoles.usersTable.lockAria', {
                                    username: u.username,
                                  })
                                : t('admin:usersRoles.usersTable.unlockAria', {
                                    username: u.username,
                                  })
                            }
                          >
                            {u.is_active ? (
                              <LockClosedIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <LockOpenIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        )}
                        {canDeleteUser && (
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={isSelf || isTargetProtectedAdmin}
                            onClick={() => setDeleteUserTarget(u)}
                            aria-label={t('admin:usersRoles.usersTable.deleteAria', {
                              username: u.username,
                            })}
                          >
                            <TrashIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={users}
              getRowKey={(u) => u.id}
              mobileRowClassName="flex flex-col gap-3"
              renderMobileRow={(u) => {
                const isSelf = u.id === currentUser?.id;
                const isTargetProtectedAdmin =
                  u.role_slug === 'admin' && !canTouchAdminRole;
                const totalCreated =
                  (u.courses_count || 0) +
                  (u.cards_count || 0) +
                  (u.videos_count || 0);

                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-control bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                          {getUserInitials(u)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {u.username}
                            </span>
                            {isSelf && (
                              <Badge size="sm" variant="learned">
                                {t('admin:usersRoles.usersTable.selfBadge')}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 block truncate">
                            {u.email || t('admin:usersRoles.usersTable.noEmail')}
                          </span>
                        </div>
                      </div>

                      <Badge variant={u.is_active ? 'mastered' : 'again'} dot>
                        {u.is_active
                          ? t('admin:usersRoles.statusActiveShort')
                          : t('admin:usersRoles.statusInactive')}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                      <Badge variant={getRoleBadgeVariant(u.role_slug)}>
                        {getRoleLabel(u.role_slug, u.role_name)}
                      </Badge>
                      <span>
                        {t('admin:usersRoles.usersTable.activitySummary', {
                          reviews: formatNumber(u.reviews_count || 0),
                          content: formatNumber(totalCreated),
                        })}
                      </span>
                    </div>

                    {canAnyUserRowAction && !isTargetProtectedAdmin && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        {canEditUser && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setUserModalState({ open: true, user: u })
                            }
                          >
                            <PencilSquareIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                            <span>
                              {t('admin:usersRoles.usersTable.mobileEdit')}
                            </span>
                          </Button>
                        )}
                        {canResetPassword && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setResetPwdTarget(u)}
                          >
                            <KeyIcon className="w-4 h-4" aria-hidden="true" />
                            <span>
                              {t('admin:usersRoles.usersTable.mobilePassword')}
                            </span>
                          </Button>
                        )}
                        {!isSelf && canLockUser && (
                          <Button
                            variant="secondary"
                            size="icon"
                            disabled={actionBusy}
                            onClick={() => handleToggleLock(u)}
                            aria-label={
                              u.is_active
                                ? t('admin:usersRoles.usersTable.lockAria', {
                                    username: u.username,
                                  })
                                : t('admin:usersRoles.usersTable.unlockAria', {
                                    username: u.username,
                                  })
                            }
                          >
                            {u.is_active ? (
                              <LockClosedIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <LockOpenIcon
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        )}
                        {!isSelf && canDeleteUser && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteUserTarget(u)}
                            aria-label={t('admin:usersRoles.usersTable.deleteAria', {
                              username: u.username,
                            })}
                          >
                            <TrashIcon className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                );
              }}
              emptyState={
                <EmptyState
                  icon={UsersIcon}
                  title={t('admin:usersRoles.usersTable.emptyTitle')}
                />
              }
              footer={
                <AdminPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={(nextPage) => {
                    setUsersLoading(true);
                    setPage(nextPage);
                  }}
                />
              }
              ariaLabel={t('admin:usersRoles.usersTable.ariaLabel')}
            />
          )}
        </Card>
      )}

      {/* SUB-TAB 2: COHESIVE SAAS DATA TABLE FOR ROLES & PERMISSIONS */}
      {activeSubTab === 'roles' && canAccessRoles && (
        <Card className="flex flex-col">
          {/* Integrated Toolbar */}
          <div className="p-2.5 sm:p-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {segmentedNav}

            <div className="flex items-center gap-2 flex-1 lg:max-w-xl lg:justify-end">
              <AdminSearchInput
                value={roleSearchInput}
                onChange={(val) => {
                  setRoleSearchInput(val);
                  setRolePage(1);
                }}
                placeholder={t('admin:usersRoles.rolesTable.searchPlaceholder')}
                ariaLabel={t('admin:usersRoles.rolesTable.searchAria')}
              />

              <AdminFilterPopover
                title={t('admin:usersRoles.rolesTable.filterTitle')}
                sections={[
                  {
                    key: 'type',
                    label: t('admin:usersRoles.rolesTable.filterTypeSection'),
                    options: roleTypeOptions,
                  },
                  ...(roleScopedModules.length > 0
                    ? [
                        {
                          key: 'module',
                          label: t(
                            'admin:usersRoles.rolesTable.filterModuleSection'
                          ),
                          options: roleModuleFilterOptions,
                        },
                      ]
                    : []),
                  ...(permissionCatalog.length > 0
                    ? [
                        {
                          key: 'perm',
                          label: t(
                            'admin:usersRoles.rolesTable.filterPermSection'
                          ),
                          options: rolePermFilterOptions,
                        },
                      ]
                    : []),
                ]}
                values={{
                  type: roleTypeFilter,
                  module: roleModuleFilter,
                  perm: rolePermFilter,
                }}
                onApply={(vals) => {
                  setRoleTypeFilter(vals.type || '');
                  setRoleModuleFilter(vals.module || '');
                  setRolePermFilter(vals.perm || '');
                  setRolePage(1);
                }}
                onReset={() => {
                  setRoleTypeFilter('');
                  setRoleModuleFilter('');
                  setRolePermFilter('');
                  setRolePage(1);
                }}
              />

              {canCreateRole && (
                <Button
                  variant="primary"
                  size="md"
                  className="shrink-0"
                  onClick={() => setRoleModalState({ open: true, role: null })}
                >
                  <PlusIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t('admin:usersRoles.rolesTable.createButton')}
                  </span>
                  <span className="sm:hidden">
                    {t('admin:usersRoles.rolesTable.createButtonShort')}
                  </span>
                </Button>
              )}
            </div>
          </div>

          <AdminFilterChips
            chips={activeRoleChips}
            onClearAll={() => {
              setRoleTypeFilter('');
              setRoleModuleFilter('');
              setRolePermFilter('');
              setRolePage(1);
            }}
          />

          {rolesLoading && roles.length === 0 ? (
            <Skeleton variant="admin-list" count={6} embedded />
          ) : rolesError && roles.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ExclamationCircleIcon}
                title={t('admin:usersRoles.rolesTable.loadErrorTitle')}
                description={rolesError}
                actionLabel={t('common:actions.retry')}
                onAction={() => {
                  setRolesLoading(true);
                  setRolesReloadTick((prev) => prev + 1);
                }}
              />
            </div>
          ) : (
            <CommonTable
              embedded
              columns={[
                {
                  key: 'role',
                  header: t('admin:usersRoles.rolesTable.columns.role'),
                  cellClassName: 'max-w-72',
                  render: (role) => (
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-slate-900 truncate">
                          {getRoleLabel(role.slug, role.name)}
                        </span>
                        {role.is_system && (
                          <Badge size="sm" variant="lesson">
                            {t('admin:usersRoles.rolesTable.systemBadge')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 truncate">
                        {role.slug}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'users',
                  header: t('admin:usersRoles.rolesTable.columns.users'),
                  cellClassName: 'whitespace-nowrap',
                  render: (role) => {
                    const userCount = role.user_count || 0;
                    const countLabel = t(
                      'admin:usersRoles.rolesTable.usersCount',
                      { count: formatNumber(userCount) }
                    );
                    return canAccessUsers && userCount > 0 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="tabular-nums"
                        onClick={() => handleJumpToUsersOfRole(role.slug)}
                      >
                        {countLabel}
                      </Button>
                    ) : (
                      <Badge variant="default" className="tabular-nums">
                        {countLabel}
                      </Badge>
                    );
                  },
                },
                {
                  key: 'visible_modules',
                  header: t(
                    'admin:usersRoles.rolesTable.columns.visibleModules'
                  ),
                  render: (role) => {
                    const totalModuleCount = roleScopedModules.length;
                    const visibleMods = Array.isArray(role.visible_modules)
                      ? role.visible_modules
                      : roleScopedModules.map((m) => m.key);
                    const previewMods = visibleMods.slice(0, 2);
                    const hiddenModCount = Math.max(0, visibleMods.length - 2);
                    const seesAllModules =
                      totalModuleCount > 0 &&
                      visibleMods.length >= totalModuleCount;

                    if (totalModuleCount === 0) {
                      return <span className="text-xs text-slate-400">—</span>;
                    }
                    if (seesAllModules) {
                      return (
                        <Badge variant="mastered" dot className="tabular-nums">
                          {t('admin:usersRoles.rolesTable.allModulesCount', {
                            count: formatNumber(totalModuleCount),
                          })}
                        </Badge>
                      );
                    }
                    if (visibleMods.length === 0) {
                      return (
                        <Badge variant="again" dot>
                          {t('admin:usersRoles.rolesTable.allHidden')}
                        </Badge>
                      );
                    }
                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="learned" className="tabular-nums">
                          {formatNumber(visibleMods.length)}/
                          {formatNumber(totalModuleCount)}
                        </Badge>
                        {previewMods.map((mKey) => (
                          <Badge key={mKey} variant="default">
                            {moduleLabelMap[mKey] || mKey}
                          </Badge>
                        ))}
                        {hiddenModCount > 0 && (
                          <Badge variant="default" className="tabular-nums">
                            +{formatNumber(hiddenModCount)}
                          </Badge>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'permissions',
                  header: t('admin:usersRoles.rolesTable.columns.permissions'),
                  render: (role) => {
                    const perms = Array.isArray(role.permissions)
                      ? role.permissions
                      : [];
                    const previewPerms = perms.slice(0, 2);
                    const hiddenPermCount = Math.max(0, perms.length - 2);
                    const hasAllPerms =
                      permissionCatalog.length > 0 &&
                      perms.length >= permissionCatalog.length;

                    if (perms.length === 0) {
                      return (
                        <Badge variant="unseen">
                          {t('admin:usersRoles.rolesTable.viewAndLearnOnly')}
                        </Badge>
                      );
                    }
                    if (hasAllPerms) {
                      return (
                        <Badge variant="level" className="tabular-nums">
                          {t('admin:usersRoles.rolesTable.fullAccessCount', {
                            count: formatNumber(perms.length),
                          })}
                        </Badge>
                      );
                    }
                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="learned" className="tabular-nums">
                          {t('admin:usersRoles.rolesTable.actionsCount', {
                            count: formatNumber(perms.length),
                          })}
                        </Badge>
                        {previewPerms.map((code) => (
                          <Badge key={code} variant="default">
                            {permissionLabelMap[code] || code}
                          </Badge>
                        ))}
                        {hiddenPermCount > 0 && (
                          <Badge variant="default" className="tabular-nums">
                            +{formatNumber(hiddenPermCount)}
                          </Badge>
                        )}
                      </div>
                    );
                  },
                },
                canAnyRoleRowAction && {
                  key: 'actions',
                  header: t('admin:usersRoles.rolesTable.columns.actions'),
                  align: 'right',
                  render: (role) => {
                    const roleDisplayName = getRoleLabel(role.slug, role.name);
                    return (
                      <div className="inline-flex items-center justify-end gap-1">
                        {canEditRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setRoleModalState({ open: true, role })
                            }
                            aria-label={t('admin:usersRoles.rolesTable.editAria', {
                              name: roleDisplayName,
                            })}
                          >
                            <PencilSquareIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                        {canDeleteRole && !role.is_system && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteRoleTarget(role)}
                            aria-label={t(
                              'admin:usersRoles.rolesTable.deleteAria',
                              { name: roleDisplayName }
                            )}
                          >
                            <TrashIcon
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={paginatedRoles}
              getRowKey={(role) => role.id}
              mobileRowClassName="flex flex-col gap-3"
              renderMobileRow={(role) => {
                const perms = Array.isArray(role.permissions)
                  ? role.permissions
                  : [];
                const totalModuleCount = roleScopedModules.length;
                const visibleMods = Array.isArray(role.visible_modules)
                  ? role.visible_modules
                  : roleScopedModules.map((m) => m.key);
                const seesAllModules =
                  totalModuleCount > 0 &&
                  visibleMods.length >= totalModuleCount;
                const userCount = role.user_count || 0;
                const roleDisplayName = getRoleLabel(role.slug, role.name);

                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {roleDisplayName}
                          </span>
                          {role.is_system && (
                            <Badge size="sm" variant="lesson">
                              {t('admin:usersRoles.rolesTable.systemBadge')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block truncate">
                          {role.slug}
                        </span>
                      </div>

                      <Badge variant="default" className="tabular-nums">
                        {t('admin:usersRoles.rolesTable.usersCount', {
                          count: formatNumber(userCount),
                        })}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {totalModuleCount > 0 && (
                        <Badge
                          variant={
                            seesAllModules
                              ? 'mastered'
                              : visibleMods.length === 0
                                ? 'again'
                                : 'learned'
                          }
                          dot={seesAllModules || visibleMods.length === 0}
                          className="tabular-nums"
                        >
                          {seesAllModules
                            ? t('admin:usersRoles.rolesTable.allModulesCount', {
                                count: formatNumber(totalModuleCount),
                              })
                            : visibleMods.length === 0
                              ? t('admin:usersRoles.rolesTable.allHidden')
                              : t('admin:usersRoles.rolesTable.modulesRatio', {
                                  visible: formatNumber(visibleMods.length),
                                  total: formatNumber(totalModuleCount),
                                })}
                        </Badge>
                      )}
                      <Badge variant="default" className="tabular-nums">
                        {t('admin:usersRoles.rolesTable.actionsCount', {
                          count: formatNumber(perms.length),
                        })}
                      </Badge>
                    </div>

                    {canAnyRoleRowAction && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        {canEditRole && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setRoleModalState({ open: true, role })
                            }
                          >
                            {t('admin:usersRoles.rolesTable.mobileManageButton')}
                          </Button>
                        )}
                        {canDeleteRole && !role.is_system && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteRoleTarget(role)}
                            aria-label={t(
                              'admin:usersRoles.rolesTable.deleteAria',
                              { name: roleDisplayName }
                            )}
                          >
                            <TrashIcon className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                );
              }}
              emptyState={
                <EmptyState
                  icon={ShieldCheckIcon}
                  title={t('admin:usersRoles.rolesTable.emptyTitle')}
                />
              }
              footer={
                <AdminPagination
                  page={safeRolePage}
                  totalPages={roleTotalPages}
                  total={filteredRoles.length}
                  onPageChange={setRolePage}
                />
              }
              ariaLabel={t('admin:usersRoles.rolesTable.ariaLabel')}
            />
          )}
        </Card>
      )}

      {/* Modals */}
      {userModalState.open && (
        <UserFormModal
          key={
            userModalState.user
              ? `edit-user-${userModalState.user.id}`
              : 'create-user'
          }
          isOpen={userModalState.open}
          onClose={() => setUserModalState({ open: false, user: null })}
          editingUser={userModalState.user}
          roles={roles}
          currentUserId={currentUser?.id}
          canTouchAdminRole={canTouchAdminRole}
          canLockUser={canLockUser}
          canResetPassword={canResetPassword}
          onSaved={(saved, wasEdit) => {
            showToast(
              wasEdit
                ? t('admin:usersRoles.usersTable.updatedToast', {
                    username: saved.username,
                  })
                : t('admin:usersRoles.usersTable.createdToast', {
                    username: saved.username,
                  }),
              'success'
            );
            setUsersLoading(true);
            setUsersReloadTick((prev) => prev + 1);
            setRolesReloadTick((prev) => prev + 1);
            if (saved.id === currentUser?.id) {
              refreshCurrentUser?.();
            }
          }}
        />
      )}

      {resetPwdTarget && (
        <ResetPasswordModal
          key={`reset-pwd-${resetPwdTarget.id}`}
          isOpen={Boolean(resetPwdTarget)}
          onClose={() => setResetPwdTarget(null)}
          targetUser={resetPwdTarget}
          onSuccess={(u) =>
            showToast(
              t('admin:usersRoles.usersTable.resetPwdToast', {
                username: u.username,
              }),
              'success'
            )
          }
        />
      )}

      <AdminConfirmDialog
        isOpen={Boolean(deleteUserTarget)}
        onClose={() => setDeleteUserTarget(null)}
        onConfirm={handleConfirmDeleteUser}
        title={t('admin:usersRoles.usersTable.deleteConfirmTitle')}
        message={t('admin:usersRoles.usersTable.deleteConfirmMessage', {
          username: deleteUserTarget?.username || '',
        })}
        confirmLabel={t('admin:usersRoles.usersTable.deleteConfirmButton')}
        submitting={actionBusy}
      />

      {roleModalState.open && (
        <RoleFormModal
          key={
            roleModalState.role
              ? `edit-role-${roleModalState.role.id}`
              : 'create-role'
          }
          isOpen={roleModalState.open}
          onClose={() => setRoleModalState({ open: false, role: null })}
          editingRole={roleModalState.role}
          permissionGroups={permissionGroups}
          permissionCatalog={permissionCatalog}
          roleScopedModules={roleScopedModules}
          onSaved={(saved, wasEdit) => {
            const roleName = getRoleLabel(saved.slug, saved.name);
            showToast(
              wasEdit
                ? t('admin:usersRoles.rolesTable.updatedToast', {
                    name: roleName,
                  })
                : t('admin:usersRoles.rolesTable.createdToast', {
                    name: roleName,
                  }),
              'success'
            );
            setRolesLoading(true);
            setRolesReloadTick((prev) => prev + 1);
            setUsersReloadTick((prev) => prev + 1);
            refreshCurrentUser?.();
            refreshSystemConfig?.();
          }}
        />
      )}

      <AdminConfirmDialog
        isOpen={Boolean(deleteRoleTarget)}
        onClose={() => setDeleteRoleTarget(null)}
        onConfirm={handleConfirmDeleteRole}
        title={t('admin:usersRoles.rolesTable.deleteConfirmTitle')}
        message={t('admin:usersRoles.rolesTable.deleteConfirmMessage', {
          name: deleteRoleTarget
            ? getRoleLabel(deleteRoleTarget.slug, deleteRoleTarget.name)
            : '',
        })}
        confirmLabel={t('admin:usersRoles.rolesTable.deleteConfirmButton')}
        submitting={actionBusy}
      />
    </div>
  );
}

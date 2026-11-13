import i18n from '../../i18n';
import { formatDateTime, formatNumber } from '../../utils/formatters';
import { getAuditActionLabel, getRoleLabel } from '../../utils/rbacLabels';

export function getShadowingTopicOptions() {
  return [
    { value: 'life', label: i18n.t('shadowing:topics.life') },
    { value: 'conversation', label: i18n.t('shadowing:topics.conversation') },
    { value: 'business', label: i18n.t('shadowing:topics.business') },
    { value: 'news', label: i18n.t('shadowing:topics.news') },
    { value: 'culture', label: i18n.t('shadowing:topics.culture') },
  ];
}

export function getActionLabel(action) {
  return getAuditActionLabel(
    action,
    action || i18n.t('admin:audit.defaultAction')
  );
}

export function getTargetTypeLabel(targetType) {
  if (!targetType) {
    return i18n.t('admin:audit.defaultTarget');
  }
  return i18n.t(`admin:audit.targetTypes.${targetType}`, {
    defaultValue: targetType,
  });
}

export function normalizeSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function formatDateTimeVi(isoStr, emptyLabel = '—') {
  if (!isoStr) return emptyLabel;
  return formatDateTime(isoStr) || emptyLabel;
}

export function summarizeAuditDetails(log) {
  const details = log?.details;
  if (!details || typeof details !== 'object') return '';

  const parts = [];
  if (log.action === 'system.theme_update') {
    if (details.prev_primary_color && details.primary_color) {
      parts.push(
        i18n.t('admin:audit.summary.themeTransition', {
          prev: details.prev_primary_color,
          next: details.primary_color,
        })
      );
    } else if (details.primary_color) {
      parts.push(details.primary_color);
    }
    return parts.join(' • ');
  }

  if (log.action === 'module.toggle') {
    parts.push(
      details.is_enabled
        ? i18n.t('admin:audit.summary.statusEnabled')
        : i18n.t('admin:audit.summary.statusDisabled')
    );
    if (Array.isArray(details.allowed_roles)) {
      const roleLabels = details.allowed_roles.map((slug) =>
        getRoleLabel(slug, slug)
      );
      const preview = roleLabels.slice(0, 3).join(', ');
      const extra = roleLabels.length - 3;
      parts.push(
        extra > 0
          ? i18n.t('admin:audit.summary.allowedRolesExtra', {
              preview,
              count: formatNumber(extra),
            })
          : i18n.t('admin:audit.summary.allowedRolesPreview', { preview })
      );
    } else if ('allowed_roles' in details) {
      parts.push(i18n.t('admin:audit.summary.allowedAllRoles'));
    }
    if (details.role_permissions && typeof details.role_permissions === 'object') {
      const roleCount = Object.keys(details.role_permissions).length;
      if (roleCount > 0) {
        parts.push(
          i18n.t('admin:audit.summary.moduleRolePerms', {
            count: formatNumber(roleCount),
          })
        );
      }
    }
    if (details.maintenance_note) {
      parts.push(
        i18n.t('admin:audit.summary.note', { note: details.maintenance_note })
      );
    }
    return parts.join(' • ');
  }

  if (
    details.prev_role &&
    details.new_role &&
    details.prev_role !== details.new_role
  ) {
    const prevName = getRoleLabel(details.prev_role, details.prev_role);
    const nextName = getRoleLabel(details.new_role, details.new_role);
    parts.push(
      i18n.t('admin:audit.summary.roleTransition', {
        prev: prevName,
        next: nextName,
      })
    );
  } else if (details.role) {
    parts.push(
      i18n.t('admin:audit.summary.role', {
        role: getRoleLabel(details.role, details.role),
      })
    );
  }

  if (typeof details.reassigned_users === 'number') {
    parts.push(
      i18n.t('admin:audit.summary.reassignedUsers', {
        count: formatNumber(details.reassigned_users),
        role: getRoleLabel('learner'),
      })
    );
  }

  if (Array.isArray(details.new_visible_modules)) {
    parts.push(
      i18n.t('admin:audit.summary.visibleModuleCount', {
        count: formatNumber(details.new_visible_modules.length),
      })
    );
  } else if (Array.isArray(details.visible_modules)) {
    parts.push(
      i18n.t('admin:audit.summary.visibleModuleCount', {
        count: formatNumber(details.visible_modules.length),
      })
    );
  }

  if (Array.isArray(details.new_permissions)) {
    parts.push(
      i18n.t('admin:audit.summary.actionPermCount', {
        count: formatNumber(details.new_permissions.length),
      })
    );
  } else if (Array.isArray(details.permissions)) {
    parts.push(
      i18n.t('admin:audit.summary.actionPermCount', {
        count: formatNumber(details.permissions.length),
      })
    );
  }

  if (typeof details.as_system === 'boolean') {
    parts.push(
      details.as_system
        ? i18n.t('admin:audit.summary.sourceSystem')
        : i18n.t('admin:audit.summary.sourcePersonal')
    );
  }

  if (typeof details.is_public === 'boolean') {
    parts.push(
      details.is_public
        ? i18n.t('admin:audit.summary.visibilityPublic')
        : i18n.t('admin:audit.summary.visibilityPrivate')
    );
  }

  if (details.source === 'cli') {
    parts.push(i18n.t('admin:audit.summary.cliSource'));
  }

  return parts.join(' • ');
}

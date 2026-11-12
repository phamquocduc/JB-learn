import i18n from '../i18n';

/**
 * Normalize dot-separated RBAC identifiers (e.g. `study.cards`, `courses.create_own`)
 * to underscore keys so i18next does not parse dots as nested path separators.
 */
function normalizeRbacKey(key) {
  return String(key || '').trim().replace(/\./g, '_');
}

export function getModuleLabel(key, fallbackLabel = '') {
  const safeKey = normalizeRbacKey(key);
  if (!safeKey) return fallbackLabel;
  return i18n.t(`rbac:modules.${safeKey}.label`, { defaultValue: fallbackLabel || key });
}

export function getModuleDescription(key, fallbackDescription = '') {
  const safeKey = normalizeRbacKey(key);
  if (!safeKey) return fallbackDescription;
  return i18n.t(`rbac:modules.${safeKey}.description`, {
    defaultValue: fallbackDescription || '',
  });
}

export function getModuleGroupLabel(groupKey, fallbackLabel = '') {
  const safeKey = normalizeRbacKey(groupKey);
  if (!safeKey) return fallbackLabel;
  return i18n.t(`rbac:moduleGroups.${safeKey}`, { defaultValue: fallbackLabel || groupKey });
}

export function getPermissionGroupLabel(groupKey, fallbackLabel = '') {
  const safeKey = normalizeRbacKey(groupKey);
  if (!safeKey) return fallbackLabel;
  return i18n.t(`rbac:permissionGroups.${safeKey}`, { defaultValue: fallbackLabel || groupKey });
}

export function getPermissionLabel(code, fallbackLabel = '') {
  const safeKey = normalizeRbacKey(code);
  if (!safeKey) return fallbackLabel;
  return i18n.t(`rbac:permissions.${safeKey}`, { defaultValue: fallbackLabel || code });
}

export function getRoleLabel(slug, fallbackName = '') {
  const safeSlug = normalizeRbacKey(slug);
  if (!safeSlug) return fallbackName;
  // Built-in system roles map via slug; custom user-created roles keep their entered name
  return i18n.t(`rbac:roles.${safeSlug}`, { defaultValue: fallbackName || slug });
}

export function getAuditActionLabel(action, fallbackLabel = '') {
  const safeAction = normalizeRbacKey(action);
  if (!safeAction) return fallbackLabel;
  return i18n.t(`rbac:auditActions.${safeAction}`, { defaultValue: fallbackLabel || action });
}

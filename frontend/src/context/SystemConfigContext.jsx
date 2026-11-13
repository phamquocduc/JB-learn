import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchPublicSystemConfig } from '../services/adminApi';
import {
  applyPrimaryColorTheme,
  getCachedPrimaryColor,
} from '../utils/themeColor';
import { useAuth } from './useAuth';
import { SystemConfigContext } from './useSystemConfig';

export function SystemConfigProvider({ children }) {
  const { user, isGuest, hasPermission } = useAuth();
  const [modules, setModules] = useState({});
  const [moduleGroups, setModuleGroups] = useState([]);
  const [primaryColor, setPrimaryColor] = useState(() => getCachedPrimaryColor());
  const [configLoaded, setConfigLoaded] = useState(false);

  const subjectRole = !isGuest && user ? user.role_slug || 'learner' : 'guest';
  const isAdminRole = Boolean(
    !isGuest && user && (user.role_slug === 'admin' || user.is_superuser)
  );
  const canBypassMaintenance = Boolean(
    isAdminRole || (!isGuest && user && hasPermission('modules.toggle'))
  );

  const applyPublicConfigPayload = useCallback((data) => {
    if (data?.modules && typeof data.modules === 'object') {
      setModules(data.modules);
    }
    if (Array.isArray(data?.module_groups)) {
      setModuleGroups(data.module_groups);
    }
    const serverColor = data?.appearance?.primary_color;
    if (serverColor) {
      const normalized = applyPrimaryColorTheme(serverColor);
      setPrimaryColor(normalized);
    }
  }, []);

  const refreshSystemConfig = useCallback(async () => {
    try {
      const data = await fetchPublicSystemConfig();
      applyPublicConfigPayload(data);
    } catch {
      // Keep default enabled behavior if server is temporarily unreachable
    } finally {
      setConfigLoaded(true);
    }
  }, [applyPublicConfigPayload]);

  useEffect(() => {
    let ignore = false;
    fetchPublicSystemConfig()
      .then((data) => {
        if (ignore) return;
        applyPublicConfigPayload(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setConfigLoaded(true);
      });
    return () => {
      ignore = true;
    };
  }, [applyPublicConfigPayload]);

  const updateModulesSnapshot = useCallback((nextModulesMap) => {
    if (nextModulesMap && typeof nextModulesMap === 'object') {
      setModules(nextModulesMap);
    }
  }, []);

  const updatePrimaryColorSnapshot = useCallback((nextColor) => {
    const normalized = applyPrimaryColorTheme(nextColor);
    setPrimaryColor(normalized);
  }, []);

  const getModuleBlockReason = useCallback(
    (key) => {
      const entry = modules?.[key];
      if (!entry || isAdminRole) return null;
      if (
        entry.role_scoped &&
        Array.isArray(entry.allowed_roles) &&
        !entry.allowed_roles.includes(subjectRole)
      ) {
        return 'role_restricted';
      }
      if (!canBypassMaintenance && !entry.is_enabled) {
        return 'disabled';
      }
      return null;
    },
    [modules, isAdminRole, subjectRole, canBypassMaintenance]
  );

  const isModuleEnabled = useCallback(
    (key) => getModuleBlockReason(key) === null,
    [getModuleBlockReason]
  );

  const getModuleInfo = useCallback(
    (key) => modules?.[key] || null,
    [modules]
  );

  const value = useMemo(
    () => ({
      modules,
      moduleGroups,
      primaryColor,
      configLoaded,
      isModuleEnabled,
      getModuleBlockReason,
      getModuleInfo,
      refreshSystemConfig,
      updateModulesSnapshot,
      updatePrimaryColorSnapshot,
    }),
    [
      modules,
      moduleGroups,
      primaryColor,
      configLoaded,
      isModuleEnabled,
      getModuleBlockReason,
      getModuleInfo,
      refreshSystemConfig,
      updateModulesSnapshot,
      updatePrimaryColorSnapshot,
    ]
  );

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
}

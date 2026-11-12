import React, { useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  clearStoredToken,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  fetchCurrentUser,
  updatePreferredLanguage,
} from '../services/api';
import i18n, { LANGUAGE_STORAGE_KEY, normalizeLanguage } from '../i18n';
import { AuthContext } from './useAuth';

function hasExplicitStoredLanguage() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken() || null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(() => !getStoredToken());
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState('login');

  useEffect(() => {
    const initialToken = getStoredToken();
    if (!initialToken) {
      return;
    }

    let isMounted = true;
    fetchCurrentUser()
      .then((userData) => {
        if (!isMounted) return;
        setUser(userData);
        setToken(initialToken);
        setIsGuest(false);
        if (!hasExplicitStoredLanguage() && userData?.preferred_language) {
          i18n.changeLanguage(normalizeLanguage(userData.preferred_language));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        clearStoredToken();
        setUser(null);
        setToken(null);
        setIsGuest(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (usernameOrEmail, password) => {
    const data = await apiLogin({ username: usernameOrEmail, password });
    setUser(data.user);
    setToken(data.token);
    setIsGuest(false);
    setIsAuthModalOpen(false);
    if (data?.user?.preferred_language) {
      await i18n.changeLanguage(normalizeLanguage(data.user.preferred_language));
    }
    return data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const activeLang = normalizeLanguage(i18n.language);
    const data = await apiRegister({ username, email, password });
    let nextUser = data.user;
    if (activeLang !== 'vi' && data?.user?.preferred_language !== activeLang) {
      try {
        nextUser = await updatePreferredLanguage(activeLang);
      } catch {
        // Keep new account active even if preference sync fails
      }
    }
    setUser(nextUser);
    setToken(data.token);
    setIsGuest(false);
    setIsAuthModalOpen(false);
    return { ...data, user: nextUser };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Proceed with local logout regardless of server errors
    } finally {
      clearStoredToken();
      setUser(null);
      setToken(null);
      setIsGuest(true);
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setIsAuthModalOpen(false);
  }, []);

  const openAuthModal = useCallback((initialTab = 'login') => {
    setAuthModalInitialTab(initialTab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) return null;
    try {
      const userData = await fetchCurrentUser();
      setUser(userData);
      setToken(activeToken);
      setIsGuest(false);
      return userData;
    } catch {
      return null;
    }
  }, []);

  const hasPermission = useCallback(
    (code) => {
      if (!user || isGuest) return false;
      if (user.role_slug === 'admin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(code);
    },
    [user, isGuest]
  );

  const hasAnyPermission = useCallback(
    (codes) => {
      if (!user || isGuest || !Array.isArray(codes)) return false;
      if (user.role_slug === 'admin') return true;
      return (
        Array.isArray(user.permissions) &&
        codes.some((code) => user.permissions.includes(code))
      );
    },
    [user, isGuest]
  );

  const changeLanguage = useCallback(
    async (nextLang) => {
      const normalized = normalizeLanguage(nextLang);
      await i18n.changeLanguage(normalized);
      if (!getStoredToken() || isGuest) {
        return { synced: true, language: normalized };
      }
      try {
        const updatedUser = await updatePreferredLanguage(normalized);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                ...updatedUser,
                preferred_language: updatedUser?.preferred_language || normalized,
              }
            : updatedUser
        );
        return { synced: true, language: normalized };
      } catch {
        return { synced: false, language: normalized };
      }
    },
    [isGuest]
  );

  const canAccessAdmin = Boolean(
    !isGuest &&
      user &&
      (user.can_access_admin ||
        user.role_slug === 'admin' ||
        (Array.isArray(user.permissions) &&
          user.permissions.includes('admin.access')))
  );

  const value = {
    user,
    token,
    isGuest,
    loading,
    login,
    register,
    logout,
    refreshUser,
    changeLanguage,
    hasPermission,
    hasAnyPermission,
    canAccessAdmin,
    continueAsGuest,
    isAuthModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

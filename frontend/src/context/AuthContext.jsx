import React, { useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  clearStoredToken,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  fetchCurrentUser,
} from '../services/api';
import { AuthContext } from './useAuth';

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
    return data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await apiRegister({ username, email, password });
    setUser(data.user);
    setToken(data.token);
    setIsGuest(false);
    setIsAuthModalOpen(false);
    return data;
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

  const value = {
    user,
    token,
    isGuest,
    loading,
    login,
    register,
    logout,
    continueAsGuest,
    isAuthModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

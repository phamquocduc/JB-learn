import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import {
  AuthBrandPanel,
  AuthFormTopBar,
  AuthOAuthSection,
} from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { useToast } from '../context/useToast';

export default function LoginPage() {
  const { t, i18n } = useTranslation('auth');
  const { user, isGuest, loading: authLoading, login } = useAuth();
  const { isModuleEnabled } = useSystemConfig();
  const { showToast } = useToast();
  const registrationEnabled = isModuleEnabled('auth.registration');
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = t('login.pageTitle');
  }, [i18n.language, t]);

  if (!authLoading && !isGuest && user) {
    const redirectTo = location.state?.from || '/';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      const redirectTo = location.state?.from || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || t('login.failedFallback'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthClick = (provider) => {
    showToast(
      t('oauth.comingSoon', { action: t('oauth.loginAction'), provider }),
      'info'
    );
  };

  const inputClass =
    'w-full h-10 px-3.5 rounded-control border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 hover:border-slate-300 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700';

  return (
    <div className="w-full max-w-4xl md:h-[80vh] mx-auto overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-white border border-slate-200 rounded-surface">
      <AuthBrandPanel mode="login" />

      <div className="md:col-span-7 h-full overflow-y-auto p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between gap-4">
        <AuthFormTopBar showBackLink />

        <div className="flex flex-col gap-5 max-w-md w-full mx-auto my-auto">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {t('login.heading')}
          </h1>

          {errorMessage && (
            <div
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-control p-3"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="page-login-identifier"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('login.identifierLabel')}
              </label>
              <input
                id="page-login-identifier"
                type="text"
                required
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('login.identifierPlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="page-login-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('login.passwordLabel')}
              </label>
              <div className="relative flex items-center">
                <input
                  id="page-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? t('login.hidePassword') : t('login.showPassword')
                  }
                  className="absolute right-2 w-7 h-7 inline-flex items-center justify-center rounded-control text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                >
                  {showPassword ? (
                    <EyeIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <EyeSlashIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-control border-slate-300 accent-sky-700 cursor-pointer"
                />
                <span>{t('login.rememberMe')}</span>
              </label>

              <button
                type="button"
                onClick={() => showToast(t('login.forgotPasswordSoon'), 'info')}
                className="text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          <AuthOAuthSection mode="login" onOAuthClick={handleOAuthClick} />

          {registrationEnabled && (
            <p className="text-center text-xs sm:text-sm text-slate-500 pt-1">
              {t('login.noAccount')}{' '}
              <Link
                to="/register"
                className="font-semibold text-sky-700 hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
              >
                {t('login.registerLink')}
              </Link>
            </p>
          )}
        </div>

        <div className="hidden md:block" aria-hidden="true" />
      </div>
    </div>
  );
}

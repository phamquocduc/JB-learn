import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  AuthBrandPanel,
  AuthFormTopBar,
  AuthOAuthSection,
} from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { useToast } from '../context/useToast';

export default function RegisterPage() {
  const { t, i18n } = useTranslation('auth');
  const { user, isGuest, loading: authLoading, register } = useAuth();
  const { isModuleEnabled, getModuleInfo } = useSystemConfig();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const registrationEnabled = isModuleEnabled('auth.registration');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = t('register.pageTitle');
  }, [i18n.language, t]);

  if (!authLoading && !isGuest && user) {
    return <Navigate to="/" replace />;
  }

  if (!registrationEnabled) {
    const note = getModuleInfo('auth.registration')?.maintenance_note;
    return (
      <div className="w-full max-w-xl mx-auto">
        <EmptyState
          title={t('register.disabledTitle')}
          description={note || t('register.disabledDesc')}
          actionLabel={t('register.switchToLogin')}
          onAction={() => navigate('/login')}
        />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      const normalizedUsername = username.trim().replace(/\s+/g, '_');
      await register(normalizedUsername, email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || t('register.failedFallback'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthClick = (provider) => {
    showToast(
      t('oauth.comingSoon', { action: t('oauth.registerAction'), provider }),
      'info'
    );
  };

  const inputClass =
    'w-full h-10 px-3.5 rounded-control border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 hover:border-slate-300 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700';

  return (
    <div className="w-full max-w-4xl md:h-[80vh] mx-auto overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-white border border-slate-200 rounded-surface">
      <AuthBrandPanel mode="register" />

      <div className="md:col-span-7 h-full overflow-y-auto p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between gap-3">
        <AuthFormTopBar showBackLink />

        <div className="flex flex-col gap-4 max-w-md w-full mx-auto my-auto">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {t('register.heading')}
          </h1>

          {errorMessage && (
            <div
              className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-control p-3"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label
                htmlFor="page-register-username"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('register.fullNameLabel')}
              </label>
              <input
                id="page-register-username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('register.fullNamePlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="page-register-email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('register.emailLabel')}
              </label>
              <input
                id="page-register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('register.emailPlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="page-register-phone"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('register.phoneLabel')}{' '}
                <span className="font-normal text-slate-400">
                  {t('register.optionalSuffix')}
                </span>
              </label>
              <input
                id="page-register-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('register.phonePlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="page-register-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t('register.passwordLabel')}
              </label>
              <div className="relative flex items-center">
                <input
                  id="page-register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('register.passwordPlaceholder')}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? t('login.hidePassword')
                      : t('login.showPassword')
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full mt-0.5"
            >
              {submitting ? t('register.submitting') : t('register.submit')}
            </Button>
          </form>

          <AuthOAuthSection mode="register" onOAuthClick={handleOAuthClick} />

          <div className="text-center flex flex-col gap-1.5 pt-0.5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('register.agreePrefix')}{' '}
              <button
                type="button"
                onClick={() => showToast(t('register.termsSoon'), 'info')}
                className="font-medium text-sky-700 hover:underline cursor-pointer"
              >
                {t('register.termsLink')}
              </button>{' '}
              {t('register.and')}{' '}
              <button
                type="button"
                onClick={() => showToast(t('register.privacySoon'), 'info')}
                className="font-medium text-sky-700 hover:underline cursor-pointer"
              >
                {t('register.privacyLink')}
              </button>
            </p>
            <p className="text-xs sm:text-sm text-slate-500">
              {t('register.hasAccount')}{' '}
              <Link
                to="/login"
                className="font-semibold text-sky-700 hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
              >
                {t('register.loginLink')}
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden md:block" aria-hidden="true" />
      </div>
    </div>
  );
}

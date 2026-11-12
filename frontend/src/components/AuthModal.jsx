import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import {
  AuthBrandPanel,
  AuthFormTopBar,
  AuthOAuthSection,
} from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { useToast } from '../context/useToast';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { t } = useTranslation('auth');
  const { login, register } = useAuth();
  const { isModuleEnabled } = useSystemConfig();
  const { showToast } = useToast();
  const registrationEnabled = isModuleEnabled('auth.registration');
  const [tab, setTab] = useState(
    initialTab === 'register' && registrationEnabled ? 'register' : 'login'
  );
  const effectiveTab = !registrationEnabled ? 'login' : tab;

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || t('login.failedFallback'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const normalizedUsername = registerUsername.trim().replace(/\s+/g, '_');
      await register(
        normalizedUsername,
        registerEmail.trim(),
        registerPassword
      );
      onClose();
    } catch (err) {
      setErrorMessage(err.message || t('register.failedFallback'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = (provider) => {
    const actionLabel =
      effectiveTab === 'login' ? t('oauth.loginAction') : t('oauth.registerAction');
    showToast(
      t('oauth.comingSoon', { action: actionLabel, provider }),
      'info'
    );
  };

  const inputClass =
    'w-full h-10 px-3.5 rounded-control border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 hover:border-slate-300 focus:border-sky-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700';

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-3 sm:p-4 animate-backdrop-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-surface shadow-sm max-w-4xl w-full max-h-[90vh] md:h-[80vh] overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthBrandPanel mode={effectiveTab} />

        <div className="md:col-span-7 h-full overflow-y-auto p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between gap-3">
          <AuthFormTopBar onClose={onClose} />

          <div className="flex flex-col gap-4 max-w-md w-full mx-auto my-auto">
            <h2
              id="auth-modal-title"
              className="text-xl font-semibold text-slate-900 tracking-tight"
            >
              {effectiveTab === 'login'
                ? t('login.heading')
                : t('register.heading')}
            </h2>

            {errorMessage && (
              <div
                className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-control p-3"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {effectiveTab === 'login' ? (
              <>
                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="modal-login-identifier"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t('login.identifierLabel')}
                    </label>
                    <input
                      id="modal-login-identifier"
                      type="text"
                      required
                      autoFocus
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder={t('login.identifierPlaceholder')}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-login-password"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t('login.passwordLabel')}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="modal-login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={t('login.passwordPlaceholder')}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={
                          showLoginPassword
                            ? t('login.hidePassword')
                            : t('login.showPassword')
                        }
                        className="absolute right-2 w-7 h-7 inline-flex items-center justify-center rounded-control text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                      >
                        {showLoginPassword ? (
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
                      onClick={() =>
                        showToast(t('login.forgotPasswordSoon'), 'info')
                      }
                      className="text-xs font-medium text-sky-700 hover:text-sky-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? t('login.processing') : t('login.submit')}
                  </Button>
                </form>

                <AuthOAuthSection mode="login" onOAuthClick={handleOAuthClick} />

                {registrationEnabled && (
                  <p className="text-center text-xs sm:text-sm text-slate-500 pt-1">
                    {t('login.noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setErrorMessage('');
                      }}
                      className="font-semibold text-sky-700 hover:text-sky-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
                    >
                      {t('login.registerLink')}
                    </button>
                  </p>
                )}
              </>
            ) : (
              <>
                <form
                  onSubmit={handleRegisterSubmit}
                  className="flex flex-col gap-3.5"
                >
                  <div>
                    <label
                      htmlFor="modal-register-username"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t('register.fullNameLabel')}
                    </label>
                    <input
                      id="modal-register-username"
                      type="text"
                      required
                      autoFocus
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      placeholder={t('register.fullNamePlaceholder')}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-register-email"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t('register.emailLabel')}
                    </label>
                    <input
                      id="modal-register-email"
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder={t('register.emailPlaceholder')}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-register-phone"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t('register.phoneLabel')}{' '}
                      <span className="font-normal text-slate-400">
                        {t('register.optionalSuffix')}
                      </span>
                    </label>
                    <input
                      id="modal-register-phone"
                      type="tel"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder={t('register.phonePlaceholder')}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modal-register-password"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {t('register.passwordLabel')}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="modal-register-password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder={t('register.passwordPlaceholder')}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword((prev) => !prev)
                        }
                        aria-label={
                          showRegisterPassword
                            ? t('login.hidePassword')
                            : t('login.showPassword')
                        }
                        className="absolute right-2 w-7 h-7 inline-flex items-center justify-center rounded-control text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
                      >
                        {showRegisterPassword ? (
                          <EyeIcon className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    type="submit"
                    disabled={loading}
                    className="w-full mt-0.5"
                  >
                    {loading ? t('register.processing') : t('register.submit')}
                  </Button>
                </form>

                <AuthOAuthSection
                  mode="register"
                  onOAuthClick={handleOAuthClick}
                />

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
                      onClick={() =>
                        showToast(t('register.privacySoon'), 'info')
                      }
                      className="font-medium text-sky-700 hover:underline cursor-pointer"
                    >
                      {t('register.privacyLink')}
                    </button>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {t('register.hasAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login');
                        setErrorMessage('');
                      }}
                      className="font-semibold text-sky-700 hover:text-sky-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
                    >
                      {t('register.loginLink')}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="hidden md:block" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

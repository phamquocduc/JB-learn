import React, { useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PhoneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import {
  AuthBrandPanel,
  AuthFormTopBar,
  AuthOAuthSection,
} from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState(initialTab);

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
      setErrorMessage(
        err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      );
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
      setErrorMessage(
        err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = (provider) => {
    const actionLabel = tab === 'login' ? 'Đăng nhập' : 'Đăng ký';
    showToast(
      `${actionLabel} bằng ${provider} (OAuth2) sẽ sớm được tích hợp.`,
      'info'
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-3 sm:p-4 animate-backdrop-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-[0_16px_44px_rgba(15,23,42,0.16),0_0_16px_rgba(15,23,42,0.08)] max-w-4xl w-full max-h-[90vh] md:h-[80vh] overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthBrandPanel mode={tab} />

        <div className="md:col-span-7 h-full overflow-y-auto p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between gap-3">
          <AuthFormTopBar onClose={onClose} />

          <div className="flex flex-col gap-4 max-w-md w-full mx-auto my-auto">
            <div>
              <h2
                id="auth-modal-title"
                className="text-2xl font-bold text-slate-900"
              >
                {tab === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {tab === 'login'
                  ? 'Chào mừng bạn quay trở lại!'
                  : 'Tạo tài khoản miễn phí để bắt đầu học ngay.'}
              </p>
            </div>

            {errorMessage && (
              <div
                className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm rounded-lg p-3"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {tab === 'login' ? (
              <>
                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="modal-login-identifier"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email hoặc tên đăng nhập
                    </label>
                    <div className="relative flex items-center">
                      <EnvelopeIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="modal-login-identifier"
                        type="text"
                        required
                        autoFocus
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Nhập email hoặc tên đăng nhập"
                        className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-login-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mật khẩu
                    </label>
                    <div className="relative flex items-center">
                      <LockClosedIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="modal-login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="w-full min-h-10 pl-10 pr-10 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={
                          showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                        }
                        className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
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
                        className="w-4 h-4 rounded border-slate-300 accent-sky-600 cursor-pointer"
                      />
                      <span>Nhớ tôi</span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          'Tính năng khôi phục mật khẩu sẽ sớm được cập nhật.',
                          'info'
                        )
                      }
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    <span>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</span>
                    <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </form>

                <AuthOAuthSection mode="login" onOAuthClick={handleOAuthClick} />

                <p className="text-center text-xs sm:text-sm text-slate-500 pt-1">
                  Chưa có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setErrorMessage('');
                    }}
                    className="font-semibold text-sky-600 hover:text-sky-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded"
                  >
                    Đăng ký ngay
                  </button>
                </p>
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
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Họ và tên
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="modal-register-username"
                        type="text"
                        required
                        autoFocus
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        placeholder="Nhập họ và tên"
                        className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-register-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email
                    </label>
                    <div className="relative flex items-center">
                      <EnvelopeIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="modal-register-email"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="Nhập email của bạn"
                        className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-register-phone"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Số điện thoại{' '}
                      <span className="font-normal text-slate-400">
                        (tùy chọn)
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <PhoneIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="modal-register-phone"
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="Nhập số điện thoại"
                        className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-register-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mật khẩu
                    </label>
                    <div className="relative flex items-center">
                      <LockClosedIcon
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="modal-register-password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full min-h-10 pl-10 pr-10 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword((prev) => !prev)
                        }
                        aria-label={
                          showRegisterPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                        }
                        className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
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
                    <span>{loading ? 'Đang xử lý...' : 'Đăng ký'}</span>
                    <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </form>

                <AuthOAuthSection
                  mode="register"
                  onOAuthClick={handleOAuthClick}
                />

                <div className="text-center flex flex-col gap-1.5 pt-0.5">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Bằng cách đăng ký, bạn đồng ý với{' '}
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          'Điều khoản dịch vụ đang được cập nhật.',
                          'info'
                        )
                      }
                      className="font-medium text-sky-600 hover:underline cursor-pointer"
                    >
                      Điều khoản dịch vụ
                    </button>{' '}
                    và{' '}
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          'Chính sách bảo mật đang được cập nhật.',
                          'info'
                        )
                      }
                      className="font-medium text-sky-600 hover:underline cursor-pointer"
                    >
                      Chính sách bảo mật
                    </button>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login');
                        setErrorMessage('');
                      }}
                      className="font-semibold text-sky-600 hover:text-sky-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded"
                    >
                      Đăng nhập ngay
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

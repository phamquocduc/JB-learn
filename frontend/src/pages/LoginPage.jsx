import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRightIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import {
  AuthBrandPanel,
  AuthFormTopBar,
  AuthOAuthSection,
} from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

export default function LoginPage() {
  const { user, isGuest, loading: authLoading, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      setErrorMessage(
        err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthClick = (provider) => {
    showToast(
      `Đăng nhập bằng ${provider} (OAuth2) sẽ sớm được tích hợp.`,
      'info'
    );
  };

  return (
    <div className="w-full max-w-4xl md:h-[80vh] mx-auto overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.10),0_0_14px_rgba(15,23,42,0.06)]">
      <AuthBrandPanel mode="login" />

      <div className="md:col-span-7 h-full overflow-y-auto p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between gap-4">
        <AuthFormTopBar showBackLink />

        <div className="flex flex-col gap-5 max-w-md w-full mx-auto my-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Đăng nhập
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Chào mừng bạn quay trở lại!
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="page-login-identifier"
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
                  id="page-login-identifier"
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Nhập email hoặc tên đăng nhập"
                  className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="page-login-password"
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
                  id="page-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full min-h-10 pl-10 pr-10 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
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
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
            </Button>
          </form>

          <AuthOAuthSection mode="login" onOAuthClick={handleOAuthClick} />

          <p className="text-center text-xs sm:text-sm text-slate-500 pt-1">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="font-semibold text-sky-600 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>

        <div className="hidden md:block" aria-hidden="true" />
      </div>
    </div>
  );
}

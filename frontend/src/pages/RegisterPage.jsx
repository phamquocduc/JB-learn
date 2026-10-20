import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PhoneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import {
  AuthBrandPanel,
  AuthFormTopBar,
  AuthOAuthSection,
} from '../layouts/AuthLayout';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

export default function RegisterPage() {
  const { user, isGuest, loading: authLoading, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!authLoading && !isGuest && user) {
    return <Navigate to="/" replace />;
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
      setErrorMessage(
        err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthClick = (provider) => {
    showToast(
      `Đăng ký bằng ${provider} (OAuth2) sẽ sớm được tích hợp.`,
      'info'
    );
  };

  return (
    <div className="w-full max-w-4xl md:h-[80vh] mx-auto overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.10),0_0_14px_rgba(15,23,42,0.06)]">
      <AuthBrandPanel mode="register" />

      <div className="md:col-span-7 h-full overflow-y-auto p-5 sm:p-7 lg:p-8 bg-white flex flex-col justify-between gap-3">
        <AuthFormTopBar showBackLink />

        <div className="flex flex-col gap-4 max-w-md w-full mx-auto my-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Đăng ký tài khoản
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Tạo tài khoản miễn phí để bắt đầu học ngay.
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label
                htmlFor="page-register-username"
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
                  id="page-register-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập họ và tên"
                  className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="page-register-email"
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
                  id="page-register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="page-register-phone"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Số điện thoại{' '}
                <span className="font-normal text-slate-400">(tùy chọn)</span>
              </label>
              <div className="relative flex items-center">
                <PhoneIcon
                  className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="page-register-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className="w-full min-h-10 pl-10 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-colors duration-150 focus:border-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="page-register-password"
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
                  id="page-register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full mt-0.5"
            >
              <span>{submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
              <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
            </Button>
          </form>

          <AuthOAuthSection mode="register" onOAuthClick={handleOAuthClick} />

          <div className="text-center flex flex-col gap-1.5 pt-0.5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bằng cách đăng ký, bạn đồng ý với{' '}
              <button
                type="button"
                onClick={() =>
                  showToast('Điều khoản dịch vụ đang được cập nhật.', 'info')
                }
                className="font-medium text-sky-600 hover:underline cursor-pointer"
              >
                Điều khoản dịch vụ
              </button>{' '}
              và{' '}
              <button
                type="button"
                onClick={() =>
                  showToast('Chính sách bảo mật đang được cập nhật.', 'info')
                }
                className="font-medium text-sky-600 hover:underline cursor-pointer"
              >
                Chính sách bảo mật
              </button>
            </p>
            <p className="text-xs sm:text-sm text-slate-500">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="font-semibold text-sky-600 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden md:block" aria-hidden="true" />
      </div>
    </div>
  );
}

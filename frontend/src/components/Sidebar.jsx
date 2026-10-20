import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  BookOpenIcon,
  HomeIcon,
  FolderIcon,
  RectangleStackIcon,
  FilmIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import { useAuth } from '../context/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: HomeIcon, end: true },
  { to: '/courses', label: 'Khoá học', icon: FolderIcon, end: false },
  { to: '/my-cards', label: 'Bộ thẻ của tôi', icon: RectangleStackIcon, end: false },
  { to: '/shadowing', label: 'Luyện Shadowing', icon: FilmIcon, end: false },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, isGuest, logout, openAuthModal } = useAuth();

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Logo */}
      <div className="px-4 py-5 flex items-center justify-between">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded-lg"
        >
          <div className="w-8 h-8 rounded-full bg-sky-700 flex items-center justify-center text-white">
            <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            JB Learn App
          </span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Đóng thanh điều hướng"
          className="lg:hidden"
        >
          <XMarkIcon className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1" aria-label="Điều hướng chính">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 min-h-10 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Account Footer (No guest status badge) */}
      <div className="p-3 border-t border-slate-100 flex flex-col gap-1">
        {!isGuest && user ? (
          <>
            {user.email && (
              <div className="px-3 py-1 text-xs text-slate-500 truncate">
                {user.email}
              </div>
            )}
            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700">
              <UserIcon className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              <span className="truncate">{user.username}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                onClose?.();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors duration-150"
            >
              <ArrowLeftOnRectangleIcon
                className="w-4 h-4 text-slate-500 shrink-0"
                aria-hidden="true"
              />
              <span>Đăng xuất</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onClose?.();
                openAuthModal('login');
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-sky-700 hover:bg-sky-50 cursor-pointer transition-colors duration-150"
            >
              <ArrowRightOnRectangleIcon
                className="w-4 h-4 shrink-0"
                aria-hidden="true"
              />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose?.();
                openAuthModal('register');
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors duration-150"
            >
              <UserPlusIcon
                className="w-4 h-4 text-slate-500 shrink-0"
                aria-hidden="true"
              />
              <span>Đăng ký</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative w-60 max-w-[80vw] h-full z-10 shadow-lg">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}

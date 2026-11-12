import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  BookOpenIcon,
  HomeIcon,
  RectangleStackIcon,
  FilmIcon,
  ShieldCheckIcon,
  UserIcon,
  ChevronUpDownIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import LanguageSwitcher from './ui/LanguageSwitcher';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';
import { formatDate } from '../utils/formatters';
import { getRoleLabel } from '../utils/rbacLabels';

const NAV_ITEMS = [
  {
    to: '/',
    labelKey: 'nav.courses',
    icon: HomeIcon,
    end: true,
    moduleKey: 'courses',
    viewPerms: ['courses.view', 'courses.view_all', 'courses.edit', 'courses.delete'],
  },
  {
    to: '/study',
    labelKey: 'nav.study',
    icon: BookOpenIcon,
    end: false,
    moduleKey: 'study.cards',
    viewPerms: ['cards.view', 'cards.view_all', 'cards.edit', 'cards.delete'],
  },
  {
    to: '/my-cards',
    labelKey: 'nav.myDeck',
    icon: RectangleStackIcon,
    end: false,
    moduleKey: 'study.personal_cards',
    viewPerms: [
      'personal_cards.view',
      'cards.view_all',
      'cards.edit',
      'cards.delete',
    ],
  },
  {
    to: '/shadowing',
    labelKey: 'nav.shadowing',
    icon: FilmIcon,
    end: false,
    moduleKey: 'shadowing',
    viewPerms: [
      'shadowing.view',
      'shadowing.view_all',
      'shadowing.edit',
      'shadowing.delete',
    ],
  },
];

function getAccountDisplayMeta(user, defaultName = 'Account') {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const displayName = fullName || user?.username || defaultName;
  const subText = user?.email || (user?.username ? `@${user.username}` : '');

  const words = (fullName || user?.username || '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  let initials = 'TK';
  if (words.length >= 2) {
    initials = `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  return { fullName, displayName, subText, initials };
}

function AccountIdentityRow({ displayName, subText, initials, boldName = false }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="w-8 h-8 rounded-control bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm ${boldName ? 'font-semibold' : 'font-medium'} text-slate-900 truncate leading-tight`}
        >
          {displayName}
        </div>
        {subText && (
          <div className="text-xs text-slate-500 truncate leading-tight mt-0.5">
            {subText}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarAccountMenu({
  user,
  isGuest,
  canAccessAdmin,
  registrationEnabled,
  onCloseDrawer,
  openAuthModal,
  onOpenProfile,
  onLogout,
}) {
  const { t } = useTranslation(['common', 'auth']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handlePointerDownOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, {
      passive: true,
    });
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isMenuOpen]);

  if (isGuest || !user) {
    return (
      <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
        <LanguageSwitcher variant="segmented" />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              onCloseDrawer?.();
              openAuthModal('login');
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-control text-sm font-semibold text-sky-700 hover:bg-sky-50 cursor-pointer transition-colors duration-150"
          >
            <ArrowRightOnRectangleIcon
              className="w-4 h-4 shrink-0"
              aria-hidden="true"
            />
            <span>{t('auth:login.submit')}</span>
          </button>
          {registrationEnabled && (
            <button
              type="button"
              onClick={() => {
                onCloseDrawer?.();
                openAuthModal('register');
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-control text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors duration-150"
            >
              <UserPlusIcon
                className="w-4 h-4 text-slate-500 shrink-0"
                aria-hidden="true"
              />
              <span>{t('auth:register.submit')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { displayName, subText, initials } = getAccountDisplayMeta(
    user,
    t('common:account.defaultName')
  );

  return (
    <div ref={containerRef} className="relative px-3 pb-3 pt-1">
      {isMenuOpen && (
        <div
          role="menu"
          aria-label={t('common:account.accountMenu')}
          className="absolute bottom-full left-3 right-3 mb-2 z-40 rounded-surface bg-white border border-slate-200 shadow-sm py-1.5 animate-popup-in"
        >
          {/* Identity Header */}
          <div className="px-3 py-2 flex items-center">
            <AccountIdentityRow
              displayName={displayName}
              subText={subText}
              initials={initials}
            />
          </div>

          <div className="my-1 border-t border-slate-200" />

          {/* Account Actions & Language */}
          <div className="px-1.5 flex flex-col gap-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onCloseDrawer?.();
                onOpenProfile?.();
              }}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-control text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-left cursor-pointer transition-colors duration-150"
            >
              <UserIcon
                className="w-4 h-4 text-slate-500 shrink-0"
                aria-hidden="true"
              />
              <span>{t('common:account.profile')}</span>
            </button>

            {canAccessAdmin && (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onCloseDrawer?.();
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-control text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
              >
                <ShieldCheckIcon
                  className="w-4 h-4 text-slate-500 shrink-0"
                  aria-hidden="true"
                />
                <span>{t('common:nav.adminSystem')}</span>
              </Link>
            )}

            <div className="px-2.5 py-1.5">
              <LanguageSwitcher variant="row" showIcon={false} />
            </div>
          </div>

          <div className="my-1 border-t border-slate-200" />

          <div className="px-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onLogout?.();
                onCloseDrawer?.();
              }}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-control text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-left cursor-pointer transition-colors duration-150"
            >
              <ArrowLeftOnRectangleIcon
                className="w-4 h-4 text-slate-500 shrink-0"
                aria-hidden="true"
              />
              <span>{t('auth:logout.button')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Compact Borderless Account Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={t('common:account.openMenuAria')}
        className={`w-full px-3 py-2 rounded-control flex items-center justify-between gap-2 text-left cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
          isMenuOpen ? 'bg-slate-100' : 'hover:bg-slate-100'
        }`}
      >
        <AccountIdentityRow
          displayName={displayName}
          subText={subText}
          initials={initials}
        />
        <ChevronUpDownIcon
          className="w-4 h-4 text-slate-400 shrink-0"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function AccountProfileModal({ isOpen, onClose, user }) {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const { fullName, displayName, subText, initials } = getAccountDisplayMeta(
    user,
    t('account.defaultName')
  );
  const joinedLabel = formatDate(user.date_joined) || '—';

  const infoRows = [
    { label: t('account.username'), value: user.username || '—' },
    { label: t('account.fullName'), value: fullName || t('account.notUpdated') },
    { label: t('account.email'), value: user.email || t('account.notUpdated') },
    {
      label: t('account.role'),
      value: getRoleLabel(
        user.role_slug,
        user.role_name || t('account.defaultLearnerRole')
      ),
    },
    { label: t('account.joinedDate'), value: joinedLabel },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('account.profile')}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-in"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-md max-h-[90dvh] bg-white rounded-t-surface sm:rounded-surface border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-popup-in">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">
            {t('account.profile')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('actions.closeDialog')}
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 flex-1 min-h-0 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-surface bg-slate-50 border border-slate-200 flex items-center">
            <AccountIdentityRow
              displayName={displayName}
              subText={subText}
              initials={initials}
              boldName
            />
          </div>

          <div className="rounded-surface border border-slate-200 divide-y divide-slate-200 bg-white">
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-xs font-medium text-slate-500 shrink-0">
                  {row.label}
                </span>
                <span className="text-sm font-medium text-slate-900 truncate text-right tabular-nums">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="px-3.5 py-2.5 rounded-surface border border-slate-200 bg-white">
            <LanguageSwitcher variant="row" />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <Button variant="secondary" onClick={onClose}>
              {t('actions.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation('common');
  const { user, isGuest, logout, openAuthModal, canAccessAdmin, hasAnyPermission } =
    useAuth();
  const { isModuleEnabled } = useSystemConfig();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) =>
      isModuleEnabled(item.moduleKey) &&
      (isGuest || !item.viewPerms || hasAnyPermission(item.viewPerms))
  );
  const registrationEnabled = isModuleEnabled('auth.registration');

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Logo */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 rounded-control"
        >
          <div className="w-8 h-8 rounded-control bg-primary flex items-center justify-center text-white">
            <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            {t('app.name')}
          </span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('nav.closeSidebar')}
          className="lg:hidden"
        >
          <XMarkIcon className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Primary Navigation */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2 flex flex-col gap-2"
        aria-label={t('nav.sidebarNavigation')}
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 min-h-10 px-3 py-2 rounded-control text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Account Trigger & Floating Menu */}
      <SidebarAccountMenu
        user={user}
        isGuest={isGuest}
        canAccessAdmin={canAccessAdmin}
        registrationEnabled={registrationEnabled}
        onCloseDrawer={onClose}
        openAuthModal={openAuthModal}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={logout}
      />
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
          aria-label={t('nav.navigationMenu')}
        >
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative w-60 max-w-[80vw] h-full z-10 shadow-sm">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      <AccountProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />
    </>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import AuthModal from '../components/AuthModal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/useAuth';
import { useSystemConfig } from '../context/useSystemConfig';

export default function MainLayout() {
  const { t, i18n } = useTranslation('common');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    isGuest,
    loading: authLoading,
    isAuthModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
  } = useAuth();
  const { configLoaded, isModuleEnabled, getModuleInfo } = useSystemConfig();

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.title) {
      document.title = t('app.defaultTitle');
    }
  }, [i18n.language, t]);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const guestBlocked =
    !authLoading &&
    configLoaded &&
    isGuest &&
    !isModuleEnabled('auth.guest_mode');
  const guestNote = getModuleInfo('auth.guest_mode')?.maintenance_note;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="lg:pl-60 flex-1 flex flex-col min-w-0">
        {guestBlocked ? (
          <main className="w-full mx-auto px-3 sm:px-5 pt-3 pb-16 flex-1 flex flex-col gap-3.5">
            <div className="flex lg:hidden items-center justify-end">
              <button
                type="button"
                onClick={openSidebar}
                aria-label={t('nav.openMenu')}
                className="w-9 h-9 rounded-control border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center cursor-pointer transition-colors duration-150"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="my-auto">
              <EmptyState
                title={t('guestBlocked.title')}
                description={guestNote || t('guestBlocked.description')}
                actionLabel={t('guestBlocked.actionLabel')}
                onAction={() => openAuthModal('login')}
              />
            </div>
          </main>
        ) : (
          <Outlet context={{ openSidebar }} />
        )}
      </div>

      {isAuthModalOpen && (
        <AuthModal
          key={authModalInitialTab}
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          initialTab={authModalInitialTab}
        />
      )}
    </div>
  );
}

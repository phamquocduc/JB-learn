import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/useAuth';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthModalOpen, authModalInitialTab, closeAuthModal } = useAuth();

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="lg:pl-60 flex-1 flex flex-col min-w-0">
        <Outlet context={{ openSidebar }} />
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

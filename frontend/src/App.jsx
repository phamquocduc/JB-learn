import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { ToastProvider } from './components/ui/Toast';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SystemConfigProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </SystemConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

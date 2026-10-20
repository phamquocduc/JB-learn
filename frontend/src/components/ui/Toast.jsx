import React, { useState, useCallback } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ToastContext } from '../../context/useToast';

const TOAST_STYLES = {
  success: {
    icon: CheckCircleIcon,
    box: 'bg-white border-emerald-300 text-slate-900',
    iconCls: 'text-emerald-600',
  },
  error: {
    icon: ExclamationCircleIcon,
    box: 'bg-white border-red-300 text-slate-900',
    iconCls: 'text-red-600',
  },
  info: {
    icon: InformationCircleIcon,
    box: 'bg-white border-sky-300 text-slate-900',
    iconCls: 'text-sky-700',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
          aria-live="polite"
        >
          {toasts.map((t) => {
            const cfg = TOAST_STYLES[t.type] || TOAST_STYLES.info;
            const Icon = cfg.icon;
            return (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg transition-colors duration-150 ${cfg.box}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${cfg.iconCls}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{t.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Đóng thông báo"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

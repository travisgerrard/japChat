'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from './Toast';

export type ToastType = 'success' | 'error';
export interface ToastState {
  message: string;
  type: ToastType;
  retryFn?: (() => void) | null;
}

interface ToastContextValue {
  toast: ToastState | null;
  showToast: (toast: ToastState) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((toast: ToastState) => {
    setToast(toast);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          retryFn={toast.retryFn}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within a ToastProvider');
  return ctx;
} 
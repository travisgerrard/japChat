import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error';
export interface ToastState {
  message: string;
  type: ToastType;
  retryFn?: (() => void) | null;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((toast: ToastState) => {
    setToast(toast);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
} 
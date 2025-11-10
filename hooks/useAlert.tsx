'use client';

import { useState } from 'react';

interface AlertConfig {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export function useAlert() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    message: '',
    type: 'alert'
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showAlert = (message: string, title?: string, confirmText?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        message,
        title,
        type: 'alert',
        confirmText
      });
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const showConfirm = (
    message: string,
    title?: string,
    confirmText?: string,
    cancelText?: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        message,
        title,
        type: 'confirm',
        confirmText,
        cancelText
      });
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise(true);
    }
    setIsOpen(false);
    setResolvePromise(null);
  };

  const handleCancel = () => {
    if (resolvePromise) {
      resolvePromise(false);
    }
    setIsOpen(false);
    setResolvePromise(null);
  };

  return {
    isOpen,
    config,
    showAlert,
    showConfirm,
    handleConfirm,
    handleCancel
  };
}


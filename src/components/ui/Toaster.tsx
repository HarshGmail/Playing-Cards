'use client';

import { useUIStore } from '@/lib/store/uiStore';
import { X } from 'lucide-react';

export default function Toaster() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-lg shadow-lg text-white animate-slide-up ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'error'
                ? 'bg-red-500'
                : toast.type === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

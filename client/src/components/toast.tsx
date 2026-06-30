import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { IconCheck, IconAlert } from './icons';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ToastCtx = createContext<(message: string, tone?: 'success' | 'error') => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg
              ${t.tone === 'success' ? 'bg-slate-900' : 'bg-rose-600'}`}>
            {t.tone === 'success'
              ? <IconCheck className="w-4 h-4 text-emerald-400" />
              : <IconAlert className="w-4 h-4" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

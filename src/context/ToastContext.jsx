import React, { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/UI/Icon';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, dur) => addToast('success', msg, dur), [addToast]);
  const error = useCallback((msg, dur) => addToast('error', msg, dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast('warning', msg, dur), [addToast]);
  const info = useCallback((msg, dur) => addToast('info', msg, dur), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-200',
              iconName: 'circlecheck',
              iconColor: 'text-emerald-600',
              textColor: 'text-emerald-950',
            },
            error: {
              border: 'border-rose-200',
              iconName: 'circlealert',
              iconColor: 'text-rose-600',
              textColor: 'text-rose-950',
            },
            warning: {
              border: 'border-amber-200',
              iconName: 'warning',
              iconColor: 'text-amber-600',
              textColor: 'text-amber-950',
            },
            info: {
              border: 'border-slate-200',
              iconName: 'info',
              iconColor: 'text-slate-600',
              textColor: 'text-slate-900',
            },
          };

          const cfg = typeConfig[toast.type] || typeConfig.info;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border bg-white backdrop-blur-md transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${cfg.border} ${cfg.textColor}`}
            >
              <div className="shrink-0 mt-0.5">
                <Icon name={cfg.iconName} size="md" className={cfg.iconColor} ariaHidden={true} />
              </div>
              <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon name="close" size="xs" ariaHidden={true} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

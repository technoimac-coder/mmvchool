'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let Icon = CheckCircle2;
        let colorClasses = 'bg-slate-900/95 text-white border-slate-800 shadow-2xl';
        let iconColor = 'text-emerald-400';

        if (toast.type === 'error') {
          colorClasses = 'bg-rose-950/95 text-white border-rose-900 shadow-2xl';
          Icon = XCircle;
          iconColor = 'text-rose-400';
        } else if (toast.type === 'warning') {
          colorClasses = 'bg-amber-950/95 text-white border-amber-900 shadow-2xl';
          Icon = AlertCircle;
          iconColor = 'text-amber-400';
        } else if (toast.type === 'info') {
          colorClasses = 'bg-indigo-950/95 text-white border-indigo-900 shadow-2xl';
          Icon = Info;
          iconColor = 'text-indigo-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3 shadow-xl animate-in slide-in-from-bottom-5 duration-200 transition-all ${colorClasses}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && <div className="text-xs font-bold leading-tight mb-0.5">{toast.title}</div>}
              <div className="text-xs leading-relaxed opacity-95">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white p-1 rounded-lg transition-colors shrink-0 -mr-1 -mt-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

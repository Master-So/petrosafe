import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => onClose(), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-md">
      <div className={`
        glass-card p-4 flex items-start space-x-3 shadow-2xl
        border-l-4 ${isSuccess ? 'border-l-emerald-400' : 'border-l-rose-400'}
      `}>
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white">{toast.title}</h4>
          {toast.message && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

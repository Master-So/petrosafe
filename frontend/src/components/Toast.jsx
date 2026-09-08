import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className={`p-4 rounded-lg border shadow-lg flex items-start space-x-3 bg-white ${
        isSuccess ? 'border-emerald-300 ring-1 ring-emerald-100' :
        isError ? 'border-red-300 ring-1 ring-red-100' :
        'border-slate-300'
      }`}>
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-[#0B4F6C] mt-0.5 flex-shrink-0" />}

        <div className="flex-1">
          <h4 className="text-xs font-bold text-[#0F172A]">
            {toast.title}
          </h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

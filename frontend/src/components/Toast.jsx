import React, { useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => onClose(), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white border border-gray-200 rounded shadow-sm">
      <div className="p-4 flex items-start space-x-3">
        {isSuccess ? (
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-green-600" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-3 h-3 text-red-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest leading-none">{toast.title}</h4>
          {toast.message && (
            <p className="text-[10px] text-gray-500 mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

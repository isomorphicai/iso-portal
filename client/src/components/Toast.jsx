import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded border shadow-md tracking-tight transition-all duration-300 transform translate-y-0 ${
      toast.type === 'error' 
        ? 'bg-iso-errorBg border-iso-error text-iso-error' 
        : 'bg-iso-successBg border-iso-success text-iso-success'
    }`}>
      {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
      <span className="text-xs font-semibold">{toast.message}</span>
    </div>
  );
}

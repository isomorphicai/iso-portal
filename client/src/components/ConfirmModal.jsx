import React from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  confirmVariant = "danger", // "danger" | "primary"
  isLoading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
              confirmVariant === "danger" 
                ? "bg-red-50 border border-red-200 text-red-600" 
                : "bg-iso-primary/10 border border-iso-primary/20 text-iso-primary"
            }`}>
              {confirmVariant === "danger" ? <Trash2 size={16} /> : <AlertTriangle size={16} />}
            </div>
            <h3 className="text-sm font-serif font-bold text-iso-primary">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-iso-textMuted hover:text-iso-primary rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-iso-text leading-relaxed">
          <p>{message}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-iso-border flex items-center justify-end gap-2 bg-iso-bgSecondary/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-iso-bgSecondary hover:bg-iso-border/40 text-iso-text border border-iso-border rounded-sm text-xs font-semibold transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-sm text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-70 ${
              confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-700 text-white border border-red-700"
                : "bg-iso-primary hover:bg-iso-primaryLight text-white border border-iso-primary"
            }`}
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            <span>{isLoading ? "Deleting..." : confirmText}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

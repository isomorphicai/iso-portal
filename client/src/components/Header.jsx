import React from 'react';
import { RefreshCw, LogOut } from 'lucide-react';

export default function Header({ selectedTenant, selectedBot, selectedPortal, currentUser, onLogout }) {
  return (
    <header className="h-14 border-b border-iso-border flex items-center justify-between px-8 bg-iso-cardBg sticky top-0 z-40 select-none">
      
      {/* Left: Status Indicators */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-iso-textMuted">
        {selectedBot?.ingestionSources?.some(s => s.status === 'pending') && (
          <div className="flex items-center gap-1 text-[9px] text-iso-primary uppercase font-mono tracking-wider bg-iso-accentLight border border-iso-accent/40 px-2 py-0.5 rounded-sm animate-pulse">
            <RefreshCw size={8} className="animate-spin" /> Indexing Corpus
          </div>
        )}
      </div>

      {/* Center: Dynamic Portal Title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold tracking-wide text-iso-primary uppercase font-mono">
        {selectedPortal ? `${selectedPortal.charAt(0).toUpperCase() + selectedPortal.slice(1)} Portal` : 'Portal'}
      </div>
      
      {/* Right: Logout Only */}
      <div className="flex items-center">
        {currentUser && (
          <button 
            onClick={onLogout}
            className="p-1.5 text-iso-textMuted hover:text-iso-error hover:bg-iso-errorBg rounded-sm border border-transparent hover:border-iso-error/20 transition-all"
            title="Log Out"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  );
}

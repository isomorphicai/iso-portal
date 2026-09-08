import React from 'react';
import { RefreshCw, LogOut } from 'lucide-react';

export default function Header({ selectedTenant, selectedBot, selectedPortal, activeRoute, currentUser, onLogout }) {
  const tenantDisplayName = selectedTenant?.tenantConfig?.instituteName 
    || selectedTenant?.tenantName 
    || selectedTenant?.name 
    || currentUser?.tenantName 
    || currentUser?.tenantId 
    || 'isomorphic AI';

  return (
    <header className="h-14 border-b border-iso-border flex items-center justify-between px-8 bg-iso-cardBg sticky top-0 z-40 select-none shrink-0 relative">
      
      {/* Left: Job Queue / Status Notification Indicator */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-iso-textMuted min-w-[100px]">
        {selectedTenant?.tenantConfig?.showJobQueueNotificationIcon !== false && selectedBot?.ingestionSources?.some(s => s.status === 'pending') && (
          <div className="flex items-center gap-1 text-[9px] text-iso-primary uppercase font-mono tracking-wider bg-iso-accentLight border border-iso-accent/40 px-2 py-0.5 rounded-sm animate-pulse">
            <RefreshCw size={8} className="animate-spin" /> Indexing Corpus
          </div>
        )}
      </div>

      {/* Center: Tenant Name */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-bold tracking-wide text-iso-primary uppercase font-mono whitespace-nowrap">
        <span>{tenantDisplayName}</span>
      </div>
      
      {/* Right: Logout Only */}
      <div className="flex items-center min-w-[100px] justify-end">
        {currentUser && (
          <button 
            onClick={onLogout}
            className="p-1.5 text-iso-textMuted hover:text-iso-error hover:bg-iso-errorBg rounded-sm border border-transparent hover:border-iso-error/20 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  );
}

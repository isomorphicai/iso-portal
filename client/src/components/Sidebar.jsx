import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Sidebar({
  activeRoutePath,
  setActiveRoutePath,
  portalRoutes,
  currentUser
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  // Close profile popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfile]);

  return (
    <aside className={`bg-iso-bgSecondary border-r border-iso-border flex flex-col z-10 select-none relative transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      
      {/* Brand Header */}
      <div className="p-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/20 overflow-hidden h-16 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="text-xl font-bold font-serif text-iso-primary leading-none shrink-0 select-none">🌐</span>
          <div className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[150px]'
          }`}>
            <span className="text-xl font-bold tracking-tight font-serif text-iso-primary whitespace-nowrap">isomorphic</span>
            <span className="text-[9px] bg-iso-primary text-white font-mono uppercase px-1 py-0.5 rounded-sm tracking-wider leading-none shrink-0 whitespace-nowrap">
              Portal
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary border border-iso-border/30 transition-colors shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Pages Navigation Links */}
      <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
        {portalRoutes.map(route => {
          const Icon = route.icon;
          const isActive = activeRoutePath === route.path;
          return (
            <button
              key={route.path}
              onClick={() => setActiveRoutePath(route.path)}
              className={`flex items-center rounded-sm text-xs font-semibold transition-all duration-300 ease-in-out overflow-hidden ${
                isCollapsed 
                  ? 'px-3 py-2.5 justify-center' 
                  : 'w-full px-3 py-2.5 gap-0'
              } ${
                isActive 
                  ? 'bg-iso-primary text-white shadow-sm' 
                  : 'text-iso-textMuted hover:text-iso-primary hover:bg-iso-cardBg border border-transparent hover:border-iso-border'
              }`}
              title={isCollapsed ? route.label : ''}
            >
              <Icon size={15} className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-white' : 'text-iso-textMuted'}`} />
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[150px] ml-3'
              }`}>
                {route.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      {currentUser && (
        <div ref={profileRef} className="relative p-3 border-t border-iso-border bg-iso-bgSecondary/30 shrink-0">
          
          {/* Profile Popover Card */}
          {showProfile && (
            <div className={`absolute bottom-full mb-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-lg z-50 overflow-hidden ${
              isCollapsed ? 'left-2 w-56' : 'left-3 right-3'
            }`}>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-iso-accent">Account Profile</span>
                  <button 
                    onClick={() => setShowProfile(false)} 
                    className="p-0.5 text-iso-textMuted hover:text-iso-primary transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm bg-iso-accent/15 border border-iso-accent/30 flex items-center justify-center text-iso-primary font-bold font-mono text-sm shrink-0 select-none shadow-sm">
                    {currentUser.photo || currentUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-iso-primary text-sm leading-tight">{currentUser.fullName}</span>
                    <span className="text-[9px] text-iso-accent font-mono font-bold uppercase tracking-wider mt-0.5">{currentUser.role}</span>
                  </div>
                </div>

                <div className="border-t border-iso-border pt-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-iso-textMuted font-mono uppercase tracking-wider">Email</span>
                    <span className="text-iso-text font-medium">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-iso-textMuted font-mono uppercase tracking-wider">Phone</span>
                    <span className="text-iso-text font-medium">{currentUser.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-iso-textMuted font-mono uppercase tracking-wider">Username</span>
                    <span className="text-iso-text font-mono font-bold">{currentUser.username}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clickable Profile Trigger */}
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-full flex items-center gap-3 px-1 py-1 rounded-sm hover:bg-iso-cardBg transition-all duration-200 cursor-pointer overflow-hidden"
            title={isCollapsed ? `${currentUser.fullName} — ${currentUser.role}` : ''}
          >
            <div className="w-9 h-9 rounded-sm bg-iso-accent/15 border border-iso-accent/30 flex items-center justify-center text-iso-primary font-bold font-mono text-[10px] shrink-0 select-none shadow-sm">
              {currentUser.photo || currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            
            <div className={`flex flex-col items-start transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[170px]'
            }`}>
              <span className="font-bold text-iso-primary text-xs leading-tight whitespace-nowrap">{currentUser.fullName}</span>
              <span className="text-[9px] text-iso-textMuted leading-none whitespace-nowrap mt-0.5">{currentUser.email}</span>
            </div>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-iso-border flex items-center justify-between text-[10px] text-iso-textMuted font-mono bg-iso-bgSecondary/20 overflow-hidden h-11 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
          <div className="w-1.5 h-1.5 bg-iso-accent shrink-0 rounded-full" />
          <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[100px]'
          }`}>
            Operational
          </span>
        </div>
        <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
          isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[80px]'
        }`}>
          ISO-M-V1.2
        </span>
      </div>

    </aside>
  );
}

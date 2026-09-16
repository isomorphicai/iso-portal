import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Camera, Loader2, X, Bell, LogOut, 
  Activity, RefreshCw, Layers, Compass, Clock, User
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { apiUrl } from '../config/api';

export default function Sidebar({
  selectedPortal,
  setSelectedPortal,
  activeRoutePath,
  setActiveRoutePath,
  portalRoutes,
  currentUser,
  setCurrentUser,
  selectedTenant,
  showToast,
  onLogout,
  onNavigate
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Profile State
  const [showProfile, setShowProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileDetails, setProfileDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  // Background Operations / Notifications Modal State
  const [showNotifications, setShowNotifications] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Logout Confirmation State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isGlobalAdmin = Boolean(
    currentUser?.role === 'global_admin' || 
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'admin' || 
    currentUser?.isGlobalAdmin || 
    currentUser?.tenantId === 'admin'
  );

  const activeTenantId = selectedTenant?.tenantId || selectedTenant?.code || currentUser?.tenantId || '';

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

  // Fetch full profile from MongoDB when popover opens
  useEffect(() => {
    if (showProfile && currentUser?.username) {
      fetchFullProfile();
    }
  }, [showProfile, currentUser?.username]);

  const fetchFullProfile = async () => {
    setLoadingDetails(true);
    try {
      const sessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id');
      const res = await fetch(apiUrl(`/api/auth/profile?username=${encodeURIComponent(currentUser.username)}&sessionId=${encodeURIComponent(sessionId || '')}`), {
        headers: {
          'x-session-id': sessionId || ''
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setProfileDetails(data.user);
      }
    } catch (err) {
      // silently fallback to currentUser
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch active and recent jobs for the current tenant / user
  const fetchJobs = useCallback(async (isManual = false) => {
    if (!currentUser) return;
    if (isManual) setLoadingJobs(true);
    try {
      const sessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id') || '';
      const queryParam = isGlobalAdmin
        ? ''
        : `tenantId=${encodeURIComponent(currentUser?.tenantId || activeTenantId || 'default')}`;

      const res = await fetch(apiUrl(`/api/ingestion/jobs/active${queryParam ? `?${queryParam}` : ''}`), {
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        }
      });
      const data = await res.json();
      if (data && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        const runningJobs = data.jobs.filter(j => j.status === 'running' || j.status === 'pending');
        setActiveCount(runningJobs.length);
      }
    } catch (err) {
      // Ignore background fetch errors
    } finally {
      if (isManual) setLoadingJobs(false);
    }
  }, [currentUser, activeTenantId, isGlobalAdmin]);

  // Listen for job updates triggered across app
  useEffect(() => {
    fetchJobs();

    const handleCustomUpdate = () => fetchJobs();
    window.addEventListener('iso_job_updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('iso_job_updated', handleCustomUpdate);
    };
  }, [fetchJobs]);

  const handleCancelJob = async (jobId, e) => {
    if (e) e.stopPropagation();
    try {
      const sessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id') || '';
      const res = await fetch(apiUrl(`/api/ingestion/jobs/${encodeURIComponent(jobId)}/cancel`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (showToast) showToast('Task cancelled successfully.');
        fetchJobs();
      } else {
        if (showToast) showToast(data.error || 'Failed to cancel task.', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Error cancelling task.', 'error');
    }
  };

  const handleOpenJobIngest = (job, e) => {
    if (e) e.stopPropagation();
    setShowNotifications(false);
    try {
      sessionStorage.setItem('iso_pending_crawl_inspect', JSON.stringify(job));
    } catch (err) {}
    if (onNavigate) {
      onNavigate('ingestion');
    } else if (setActiveRoutePath) {
      setActiveRoutePath('ingestion');
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('iso_open_crawl_ingest', { detail: job }));
    }, 50);
  };

  const userInitials = (currentUser?.fullName || currentUser?.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isPhotoValid = Boolean(currentUser?.photo && currentUser.photo.length > 5);

  // Directly upload selected image after client-side resizing
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast('Image file must be under 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const TARGET_SIZE = 256;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext('2d');

        let resizedBase64 = event.target?.result;
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
          resizedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        }

        setUploadingPhoto(true);
        try {
          const sessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id');
          const res = await fetch(apiUrl('/api/auth/profile'), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': sessionId || ''
            },
            body: JSON.stringify({
              username: currentUser.username,
              sessionId: sessionId || '',
              photo: resizedBase64
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            const updatedUser = {
              ...currentUser,
              ...data.user,
              photo: resizedBase64
            };
            localStorage.setItem('iso_user', JSON.stringify(updatedUser));
            if (setCurrentUser) {
              setCurrentUser(updatedUser);
            }
            setProfileDetails(prev => ({ ...(prev || {}), ...data.user, photo: resizedBase64 }));
            if (showToast) showToast('Profile photo updated successfully!', 'success');
          } else {
            if (showToast) showToast(data.error || 'Failed to upload photo.', 'error');
          }
        } catch (err) {
          if (showToast) showToast('Network error uploading profile photo.', 'error');
        } finally {
          setUploadingPhoto(false);
        }
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activeData = profileDetails || currentUser || {};
  const tenantConfig = selectedTenant?.tenantConfig || currentUser?.tenantConfig || {};
  const logoBig = tenantConfig.logoBigUrl;
  const logoSmall = tenantConfig.logoSmallUrl;
  const tenantDisplayName = tenantConfig.instituteName 
    || selectedTenant?.tenantName 
    || selectedTenant?.name 
    || currentUser?.tenantName 
    || currentUser?.tenantId 
    || 'isomorphic AI';

  return (
    <>
      <aside className={`h-full shrink-0 bg-iso-bgSecondary border-r border-iso-border flex flex-col z-20 select-none relative transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Brand Header with Tenant Name in big font on the right of Logo taking full width */}
        <div className="px-3.5 py-3 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30 overflow-hidden h-[76px] shrink-0 w-full">
          <div className="flex items-center overflow-hidden min-w-0 flex-1">
            {isCollapsed ? (
              /* Collapsed view: Clean unboxed square icon centered */
              <div className="flex items-center justify-center w-full shrink-0">
                <img 
                  src={logoSmall || '/isomorphic-icon.png'} 
                  alt={tenantDisplayName} 
                  className="w-9 h-9 object-contain select-none" 
                  onError={(e) => { e.target.src = '/isomorphic-icon.png'; }} 
                />
              </div>
            ) : (
              /* Expanded view: Logo on Left + Big Tenant Name on Right taking full header width */
              <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 pr-1">
                <img 
                  src={logoSmall || logoBig || '/isomorphic-icon.png'} 
                  alt={tenantDisplayName} 
                  className="w-9 h-9 object-contain shrink-0 select-none" 
                  onError={(e) => { e.target.src = '/isomorphic-icon.png'; }} 
                />
                
                <span className="font-bold text-lg font-serif text-iso-primary leading-tight truncate flex-1 min-w-0 tracking-tight" title={tenantDisplayName}>
                  {tenantDisplayName}
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bg border border-iso-border/30 transition-colors shrink-0 cursor-pointer ml-1"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                className={`flex items-center rounded-sm text-xs font-semibold transition-all duration-300 ease-in-out overflow-hidden cursor-pointer ${
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
                <Icon size={16} className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-white' : 'text-iso-textMuted'}`} />
                <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[150px] ml-3'
                }`}>
                  {route.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Hidden File Input for Direct Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileSelect}
          className="hidden"
        />

        {/* Bottom Section: Profile with Bell & Logout */}
        {currentUser && (
          <div className="p-2.5 border-t border-iso-border bg-iso-bgSecondary/40 shrink-0 flex flex-col gap-2 relative">
            
            {/* Profile Details Popover */}
            {showProfile && (
              <div 
                ref={profileRef}
                className={`absolute bg-iso-cardBg border border-iso-border rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                  isCollapsed 
                    ? 'left-full ml-3 bottom-0 w-76' 
                    : 'bottom-full mb-2 left-2 right-2'
                }`}
              >
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-iso-border">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-iso-accent">
                        User Account
                      </span>
                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-mono rounded-xs font-semibold">
                        {activeData.status || 'ACTIVE'}
                      </span>
                    </div>
                    <button 
                      onClick={() => setShowProfile(false)} 
                      className="p-0.5 text-iso-textMuted hover:text-iso-primary transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-12 h-12 rounded-sm bg-iso-accent/15 border-2 border-iso-accent/30 hover:border-iso-accent flex items-center justify-center text-iso-primary font-bold font-mono text-sm shrink-0 select-none shadow-xs cursor-pointer group overflow-hidden transition-colors"
                      title="Click to change profile picture"
                    >
                      {uploadingPhoto ? (
                        <Loader2 size={16} className="animate-spin text-iso-primary" />
                      ) : isPhotoValid ? (
                        <img 
                          src={currentUser.photo} 
                          alt={currentUser.fullName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span>{userInitials}</span>
                      )}

                      {!uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-0.5">
                          <Camera size={13} />
                          <span className="text-[7px] font-mono uppercase tracking-wider">Change</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-iso-primary text-xs leading-tight truncate">
                        {activeData.fullName || activeData.username}
                      </span>
                      <span className="text-[9px] text-iso-accent font-mono font-bold uppercase tracking-wider mt-0.5">
                        {activeData.role}
                      </span>
                      {activeData.title && (
                        <span className="text-[9px] text-iso-textMuted truncate leading-tight mt-0.5">
                          {activeData.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-iso-border pt-2 flex flex-col gap-1.5 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Email</span>
                      <span className="text-iso-text font-medium truncate max-w-[150px]" title={activeData.email}>
                        {activeData.email || `${activeData.username}@isomorphic.com`}
                      </span>
                    </div>

                    {activeData.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Phone</span>
                        <span className="text-iso-text font-medium">{activeData.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Username</span>
                      <span className="text-iso-text font-mono font-bold">{activeData.username}</span>
                    </div>

                    {activeData.tenantId && (
                      <div className="flex items-center justify-between">
                        <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Workspace</span>
                        <span className="text-iso-accent font-mono font-bold">{activeData.tenantId}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full mt-0.5 py-1.5 bg-iso-bg hover:bg-iso-bgSecondary border border-iso-border hover:border-iso-accent text-iso-primary rounded-sm text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-iso-accent" />
                        <span>Uploading Photo...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={12} className="text-iso-accent" />
                        <span>Upload Profile Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* COLLAPSED VIEW: All 3 icons aligned vertically in center (Bell, Logout, then Profile below) */}
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2.5 py-1 w-full">
                
                {/* 1. Bell Notification Icon Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(true);
                      setShowProfile(false);
                      fetchJobs();
                    }}
                    className={`w-9 h-9 rounded-sm border flex items-center justify-center transition-all cursor-pointer relative ${
                      showNotifications
                        ? 'bg-iso-bgSecondary text-iso-primary border-iso-border'
                        : 'text-iso-textMuted hover:text-iso-primary hover:bg-iso-cardBg border-transparent hover:border-iso-border'
                    }`}
                    title={activeCount > 0 ? `${activeCount} active processes running` : 'Background Operations & Tasks'}
                  >
                    <Bell size={16} className={activeCount > 0 ? 'text-emerald-600 animate-pulse' : ''} />
                    
                    {activeCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 bg-emerald-600 text-white text-[8px] font-mono font-bold rounded-full flex items-center justify-center animate-pulse border border-iso-cardBg">
                        {activeCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* 2. Logout Icon Button */}
                <button 
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-9 h-9 rounded-sm border border-transparent hover:border-rose-200 flex items-center justify-center text-iso-textMuted hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  title="Log Out"
                >
                  <LogOut size={16} />
                </button>

                {/* 3. Profile Avatar Button (Placed at the bottom) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(!showProfile);
                    setShowNotifications(false);
                  }}
                  className="w-10 h-10 rounded-sm bg-iso-accent/15 border-2 border-iso-accent/30 hover:border-iso-accent flex items-center justify-center text-iso-primary font-bold font-mono text-xs shrink-0 select-none shadow-xs overflow-hidden transition-colors cursor-pointer mt-0.5"
                  title={`${currentUser.fullName || currentUser.username} — ${currentUser.role}`}
                >
                  {isPhotoValid ? (
                    <img 
                      src={currentUser.photo} 
                      alt={currentUser.fullName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </button>

              </div>
            ) : (
              /* EXPANDED VIEW: Horizontal Row (Profile on Left, Bell & Logout on Right) */
              <div className="flex items-center justify-between gap-1">
                
                {/* User Profile Trigger */}
                <button
                  type="button"
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2.5 p-1 rounded-sm hover:bg-iso-cardBg transition-colors cursor-pointer overflow-hidden text-left flex-1 min-w-0 group"
                  title="Click to view profile & upload photo"
                >
                  <div className="w-9 h-9 rounded-sm bg-iso-accent/15 border border-iso-accent/30 group-hover:border-iso-accent flex items-center justify-center text-iso-primary font-bold font-mono text-[11px] shrink-0 select-none shadow-xs overflow-hidden transition-colors">
                    {isPhotoValid ? (
                      <img 
                        src={currentUser.photo} 
                        alt={currentUser.fullName} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span>{userInitials}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="font-bold text-iso-primary text-xs leading-tight whitespace-nowrap truncate w-full">
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <span className="text-[9px] text-iso-textMuted leading-none whitespace-nowrap truncate w-full mt-0.5 font-mono">
                      {currentUser.role}
                    </span>
                  </div>
                </button>

                {/* Notification Bell & Logout Buttons (Grouped on Right) */}
                <div className="flex items-center gap-1 shrink-0">
                  
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(true);
                        setShowProfile(false);
                        fetchJobs();
                      }}
                      className={`p-1.5 rounded-sm border transition-all cursor-pointer relative ${
                        showNotifications
                          ? 'bg-iso-bgSecondary text-iso-primary border-iso-border'
                          : 'text-iso-textMuted hover:text-iso-primary hover:bg-iso-cardBg border-transparent hover:border-iso-border'
                      }`}
                      title={activeCount > 0 ? `${activeCount} active processes running` : 'Background Operations & Tasks'}
                    >
                      <Bell size={15} className={activeCount > 0 ? 'text-emerald-600 animate-pulse' : ''} />
                      
                      {activeCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-emerald-600 text-white text-[8px] font-mono font-bold rounded-full flex items-center justify-center animate-pulse border border-iso-cardBg">
                          {activeCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Logout Button */}
                  <button 
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="p-1.5 text-iso-textMuted hover:text-rose-600 hover:bg-rose-50 rounded-sm border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut size={15} />
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

        {/* Footer Separator Divider */}
        <div className="w-full h-px bg-iso-border shrink-0" />

        {/* Application Version Footer */}
        <div className="px-3 py-2 flex items-center justify-between text-[11px] text-iso-textMuted font-mono bg-iso-bgSecondary/30 overflow-hidden h-9 shrink-0">
          <div className={`flex items-center gap-1.5 overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}>
            <div className="w-1.5 h-1.5 bg-emerald-500 shrink-0 rounded-full animate-pulse" title="System Operational" />
            <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap text-[10px] ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none hidden' : 'opacity-100 max-w-[100px]'
            }`}>
              Operational
            </span>
            {isCollapsed && (
              <span className="text-[10px] font-mono text-iso-textMuted font-semibold">v1.2</span>
            )}
          </div>
          
          {!isCollapsed && (
            <span className="text-[10px] font-mono text-iso-textMuted bg-iso-cardBg px-1.5 py-0.5 rounded border border-iso-border/60">
              v1.2.0
            </span>
          )}
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* MODAL: BACKGROUND OPERATIONS & TASKS (Centered & Spacious) */}
      {/* ========================================================================= */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-iso-bgSecondary border-b border-iso-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Activity size={18} className={activeCount > 0 ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif text-iso-primary">Background Operations &amp; Tasks</h3>
                  <p className="text-[11px] font-mono text-iso-textMuted">
                    {activeCount > 0 ? `${activeCount} process${activeCount > 1 ? 'es' : ''} running in background` : 'All background processes idle'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchJobs(true)}
                  className="p-1.5 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bg border border-iso-border/40 transition-colors cursor-pointer"
                  title="Refresh tasks"
                >
                  <RefreshCw size={13} className={loadingJobs ? 'animate-spin text-iso-primary' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 text-iso-textMuted hover:text-iso-text rounded hover:bg-iso-bg border border-iso-border/40 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body: Jobs List */}
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-iso-border p-3 bg-iso-bg flex flex-col gap-2">
              {jobs.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-iso-textMuted text-xs font-mono">
                  <Clock size={28} className="text-iso-textMuted/40" />
                  <span className="font-semibold text-iso-primary">No background tasks recorded yet</span>
                  <span className="text-[11px] text-iso-textMuted">Web crawls, document indexings, and batch ingestions will appear here in real-time.</span>
                </div>
              ) : (
                jobs.map((job) => {
                  const jobId = job.id || job.jobId;
                  const isRunning = job.status === 'running' || job.status === 'pending';
                  const isCompleted = job.status === 'completed';
                  const isFailed = job.status === 'failed';
                  const isCancelled = job.status === 'cancelled';
                  const percent = job.progress?.percentage !== undefined ? job.progress.percentage : (job.progress?.percent !== undefined ? job.progress.percent : (isCompleted ? 100 : 0));
                  const canCancel = Boolean(job.canCancel || job.createdBy === currentUser?.username || isGlobalAdmin);

                  return (
                    <div key={jobId} className="p-3.5 bg-iso-cardBg border border-iso-border hover:border-iso-primary/30 transition-all flex flex-col gap-2 rounded-sm shadow-2xs">
                      {/* Title & Status Row */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {job.type === 'crawl' || job.type === 'website_crawl' ? (
                            <div className="p-1 rounded bg-amber-50 border border-amber-200 text-amber-700">
                              <Compass size={14} className="shrink-0" />
                            </div>
                          ) : (
                            <div className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-700">
                              <Layers size={14} className="shrink-0" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-iso-primary truncate text-xs">
                              {job.title}
                            </span>
                            <span className="text-[10px] font-mono text-iso-textMuted truncate">
                              ID: {jobId}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 text-[9px] font-mono rounded font-bold uppercase tracking-wider border shrink-0 ${
                          isRunning 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse' 
                            : isCompleted 
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {job.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px] font-mono text-iso-textMuted">
                          <span className="truncate max-w-sm">
                            {job.progress?.currentUrl ? job.progress.currentUrl : (isRunning ? 'Processing...' : 'Finished')}
                          </span>
                          <span className="font-bold text-iso-primary">{percent}%</span>
                        </div>
                        <div className="w-full bg-iso-bgSecondary h-2 rounded-full overflow-hidden border border-iso-border">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              isFailed ? 'bg-rose-500' : isCompleted ? 'bg-blue-600' : isCancelled ? 'bg-slate-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(3, Math.min(100, percent))}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer: User & Actions */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-iso-textMuted pt-1 border-t border-iso-border/50">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-iso-textMuted">
                            <User size={10} />
                            <span>by: <strong className="text-iso-primary">{job.createdBy || 'user'}</strong></span>
                          </span>
                          <span>•</span>
                          <span>{job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : ''}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isRunning && canCancel && (
                            <button
                              type="button"
                              onClick={(e) => handleCancelJob(jobId, e)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              Cancel Operation
                            </button>
                          )}

                          {isCompleted && (job.type === 'crawl' || job.type === 'website_crawl') && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenJobIngest(job, e)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Layers size={11} />
                              <span>Ingest Discovered Pages</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-iso-bgSecondary border-t border-iso-border flex items-center justify-between text-xs">
              <span className="text-[10px] font-mono text-iso-textMuted">
                Auto-synced with MongoDB
              </span>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="px-4 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOGOUT CONFIRMATION */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          if (onLogout) onLogout();
        }}
        title="Confirm Sign Out"
        message="Are you sure you want to end your active session and log out of the portal?"
        confirmText="Sign Out"
        confirmVariant="danger"
      />

    </>
  );
}

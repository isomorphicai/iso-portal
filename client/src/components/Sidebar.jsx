import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Camera, Loader2, X, User, Mail, Phone, Briefcase, FileText, Shield, Database, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Sidebar({
  activeRoutePath,
  setActiveRoutePath,
  portalRoutes,
  currentUser,
  setCurrentUser,
  showToast
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileDetails, setProfileDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const fileInputRef = useRef(null);
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

  // Fetch complete real user profile from MongoDB when popover opens
  useEffect(() => {
    if (showProfile && currentUser?.username) {
      fetchFullProfile();
    }
  }, [showProfile, currentUser?.username]);

  const fetchFullProfile = async () => {
    setLoadingDetails(true);
    try {
      const sessionId = currentUser.sessionId || localStorage.getItem('iso_session_id');
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
        // Resize & center-crop to 256x256
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

        // Directly upload and persist to tenant MongoDB
        setUploadingPhoto(true);
        try {
          const sessionId = currentUser.sessionId || localStorage.getItem('iso_session_id');
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

  return (
    <aside className={`h-full shrink-0 bg-iso-bgSecondary border-r border-iso-border flex flex-col z-10 select-none relative transition-all duration-300 ease-in-out ${
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
          className="p-1 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary border border-iso-border/30 transition-colors shrink-0 cursor-pointer"
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

      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* User Profile Section with Popover */}
      {currentUser && (
        <div ref={profileRef} className="relative p-3 border-t border-iso-border bg-iso-bgSecondary/30 shrink-0">
          
          {/* Small User Info Popover with Full MongoDB Data */}
          {showProfile && (
            <div className={`absolute bottom-full mb-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              isCollapsed ? 'left-2 w-72' : 'left-2 right-2'
            }`}>
              <div className="p-4 flex flex-col gap-3">
                
                {/* Popover Header */}
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

                {/* Avatar with Direct Upload Trigger & Core Identity */}
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

                    {/* Camera Upload Badge Overlay on Hover */}
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

                {/* Full MongoDB User Info Meta Fields */}
                <div className="border-t border-iso-border pt-2 flex flex-col gap-1.5 text-[10px]">
                  
                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Email</span>
                    <span className="text-iso-text font-medium truncate max-w-[150px]" title={activeData.email}>
                      {activeData.email || `${activeData.username}@isomorphic.com`}
                    </span>
                  </div>

                  {/* Phone */}
                  {activeData.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Phone</span>
                      <span className="text-iso-text font-medium">{activeData.phone}</span>
                    </div>
                  )}

                  {/* Username */}
                  <div className="flex items-center justify-between">
                    <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Username</span>
                    <span className="text-iso-text font-mono font-bold">{activeData.username}</span>
                  </div>

                  {/* Tenant Workspace */}
                  {activeData.tenantId && (
                    <div className="flex items-center justify-between">
                      <span className="text-iso-textMuted font-mono uppercase tracking-wider text-[9px]">Workspace</span>
                      <span className="text-iso-accent font-mono font-bold">{activeData.tenantId}</span>
                    </div>
                  )}

                  {/* Bio (if present in MongoDB) */}
                  {activeData.bio && (
                    <div className="mt-1 pt-1.5 border-t border-iso-border/50">
                      <p className="text-[9px] text-iso-textMuted italic leading-relaxed line-clamp-2">
                        "{activeData.bio}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Direct Upload Action Button */}
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

          {/* Clickable Profile Trigger in Sidebar Bottom */}
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-full flex items-center gap-2.5 px-1 py-1 rounded-sm hover:bg-iso-cardBg transition-all duration-200 cursor-pointer overflow-hidden text-left group"
            title={isCollapsed ? `${currentUser.fullName} — ${currentUser.role}` : 'Click to view profile & upload photo'}
          >
            <div className="w-9 h-9 rounded-sm bg-iso-accent/15 border border-iso-accent/30 group-hover:border-iso-accent flex items-center justify-center text-iso-primary font-bold font-mono text-[10px] shrink-0 select-none shadow-sm overflow-hidden transition-colors">
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
            
            <div className={`flex flex-col items-start transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[170px]'
            }`}>
              <span className="font-bold text-iso-primary text-xs leading-tight whitespace-nowrap truncate w-full">
                {currentUser.fullName || currentUser.username}
              </span>
              <span className="text-[9px] text-iso-textMuted leading-none whitespace-nowrap truncate w-full mt-0.5 font-mono">
                {currentUser.role}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-iso-border flex items-center justify-between text-[11px] text-iso-textMuted font-mono bg-iso-bgSecondary/20 overflow-hidden h-11 shrink-0">
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
  );
}

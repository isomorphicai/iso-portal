import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Camera, Loader2, X, User, Mail, Phone, 
  Briefcase, FileText, Shield, Database, CheckCircle2, Activity, Globe, 
  Terminal, RefreshCw, AlertCircle, ExternalLink, Play, Square, Radio, 
  Layers, Sparkles, ChevronDown, ChevronUp, Clock, Ban, ArrowUpRight,
  Trash2, ArrowRight, Compass
} from 'lucide-react';
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
  showToast
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileDetails, setProfileDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Background Tasks / Operations Monitor State
  const [showOperations, setShowOperations] = useState(false);
  const [jobsData, setJobsData] = useState({ activeCount: 0, jobs: [] });
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [cancellingJobId, setCancellingJobId] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'active' | 'crawl' | 'ingest'
  const operationsRef = useRef(null);

  const fileInputRef = useRef(null);
  const profileRef = useRef(null);

  // Polling for background tasks (Crawler / Ingestion / Scraper jobs)
  useEffect(() => {
    let isMounted = true;

    const fetchJobs = async () => {
      try {
        const tId = selectedTenant?.tenantId || selectedTenant?.code || currentUser?.tenantId || '';
        const res = await fetch(apiUrl(`/api/ingestion/jobs/active?tenantId=${encodeURIComponent(tId)}`));
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setJobsData(data);
          if (data.jobs && data.jobs.length > 0) {
            setSelectedJobId(prev => {
              if (!prev || !data.jobs.find(j => j.jobId === prev)) {
                return data.jobs[0].jobId;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // silent polling error
      }
    };

    fetchJobs();

    // Dynamically poll every 2s when active jobs exist or panel is open; otherwise every 8s
    const intervalTime = (jobsData.activeCount > 0 || showOperations) ? 2000 : 8000;
    const interval = setInterval(fetchJobs, intervalTime);

    const handleCustomUpdate = () => fetchJobs();
    const handleOpenPanel = () => {
      setShowOperations(true);
      fetchJobs();
    };

    window.addEventListener('iso_job_updated', handleCustomUpdate);
    window.addEventListener('iso_open_operations_panel', handleOpenPanel);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('iso_job_updated', handleCustomUpdate);
      window.removeEventListener('iso_open_operations_panel', handleOpenPanel);
    };
  }, [selectedTenant, currentUser?.tenantId, jobsData.activeCount, showOperations]);

  // Close operations popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (operationsRef.current && !operationsRef.current.contains(e.target)) {
        setShowOperations(false);
      }
    };
    if (showOperations) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOperations]);

  const handleCancelJob = async (jobId) => {
    setCancellingJobId(jobId);
    try {
      const res = await fetch(apiUrl(`/api/ingestion/jobs/${encodeURIComponent(jobId)}/cancel`), {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast('Job cancelled successfully.', 'info');
      } else {
        if (showToast) showToast(data.message || 'Could not cancel job.', 'error');
      }
      const tId = selectedTenant?.tenantId || selectedTenant?.code || currentUser?.tenantId || '';
      const refreshRes = await fetch(apiUrl(`/api/ingestion/jobs/active?tenantId=${encodeURIComponent(tId)}`));
      if (refreshRes.ok) {
        const freshData = await refreshRes.json();
        setJobsData(freshData);
      }
    } catch (err) {
      if (showToast) showToast('Failed to cancel job.', 'error');
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const res = await fetch(apiUrl(`/api/ingestion/jobs/${encodeURIComponent(jobId)}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        setJobsData(prev => ({
          ...prev,
          jobs: prev.jobs.filter(j => j.jobId !== jobId),
          totalTracked: Math.max(0, (prev.totalTracked || 1) - 1)
        }));
        if (selectedJobId === jobId) {
          setSelectedJobId(null);
        }
      }
    } catch (e) {}
  };

  const handleClearCompletedJobs = async () => {
    try {
      const tId = selectedTenant?.tenantId || selectedTenant?.code || currentUser?.tenantId || '';
      const res = await fetch(apiUrl('/api/ingestion/jobs/clear-completed'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tId })
      });
      if (res.ok) {
        setJobsData(prev => ({
          ...prev,
          jobs: prev.jobs.filter(j => j.status === 'running' || j.status === 'pending'),
          totalTracked: prev.activeCount
        }));
        if (showToast) showToast('Cleared completed tasks from history.');
      }
    } catch (e) {}
  };

  const handleContinueCrawlJob = (job) => {
    if (setSelectedPortal) {
      setSelectedPortal('admin');
    }
    if (setActiveRoutePath) {
      setActiveRoutePath('ingestion');
    }
    setShowOperations(false);

    window.__pendingContinueCrawlJob = job;
    try {
      sessionStorage.setItem('iso_pending_crawl_job', JSON.stringify(job));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('iso_continue_crawl_job', { detail: { job } }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('iso_continue_crawl_job', { detail: { job } }));
    }, 150);
  };

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
  const tenantConfig = selectedTenant?.tenantConfig || currentUser?.tenantConfig || {};
  const logoBig = tenantConfig.logoBigUrl;
  const logoSmall = tenantConfig.logoSmallUrl;
  const brandName = tenantConfig.instituteName || selectedTenant?.tenantName || selectedTenant?.name || 'isomorphic';

  return (
    <aside className={`h-full shrink-0 bg-iso-bgSecondary border-r border-iso-border flex flex-col z-10 select-none relative transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      
      {/* Brand Header */}
      <div className="px-3 py-2.5 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/20 overflow-hidden h-[72px] shrink-0">
        <div className="flex items-center overflow-hidden min-w-0 flex-1">
          {isCollapsed ? (
            /* Collapsed view: Small Logo Only */
            <div className="flex items-center justify-center w-full shrink-0">
              {logoSmall ? (
                <img 
                  src={logoSmall} 
                  alt={brandName} 
                  className="w-9 h-9 object-contain rounded-xs shrink-0 select-none shadow-xs" 
                />
              ) : (
                <img 
                  src="/isomorphic-icon.png" 
                  alt={brandName} 
                  className="w-9 h-9 object-contain rounded-xs shrink-0 select-none" 
                  onError={(e) => { e.target.src = '/isomorphic-icon.png'; }} 
                />
              )}
            </div>
          ) : (
            /* Expanded view: Big Logo Only (Prominently Sized) */
            <div className="flex items-center overflow-hidden min-w-0 pr-1 flex-1">
              {logoBig ? (
                <img 
                  src={logoBig} 
                  alt={brandName} 
                  className="h-13 max-h-14 max-w-[200px] object-contain object-left shrink-0 select-none" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/isomorphic-logo.png';
                  }} 
                />
              ) : (
                <img 
                  src="/isomorphic-logo.png" 
                  alt={brandName} 
                  className="h-13 max-h-14 max-w-[200px] object-contain object-left shrink-0 select-none" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                  }} 
                />
              )}
              <span 
                style={{ display: 'none' }} 
                className="text-lg font-bold tracking-tight font-serif text-iso-primary whitespace-nowrap truncate"
              >
                {brandName}
              </span>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary border border-iso-border/30 transition-colors shrink-0 cursor-pointer ml-1"
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

      {/* Background Tasks & Ingestion Operations Monitor (Directly above User Profile) */}
      <div ref={operationsRef} className="relative px-2 py-1.5 border-t border-iso-border bg-iso-bgSecondary/20 shrink-0">
        
        {/* Operations Telemetry Flyout / Slideout Drawer */}
        {showOperations && (
          <div className={`absolute mb-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isCollapsed ? 'left-14 bottom-0 w-84 sm:w-[410px]' : 'left-2 right-2 sm:w-[410px] bottom-full'
          }`}>
            <div className="p-3.5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-iso-border">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${jobsData.activeCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-xs font-bold text-iso-primary uppercase font-mono tracking-wider">
                    Task Monitor
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                    jobsData.activeCount > 0 
                      ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                      : 'bg-iso-bgSecondary text-iso-textMuted border border-iso-border'
                  }`}>
                    {jobsData.activeCount > 0 ? `${jobsData.activeCount} Active` : 'Idle'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {jobsData.jobs && jobsData.jobs.some(j => j.status !== 'running' && j.status !== 'pending') && (
                    <button
                      type="button"
                      onClick={handleClearCompletedJobs}
                      title="Clear completed & cancelled tasks"
                      className="px-2 py-0.5 bg-iso-bg hover:bg-iso-bgSecondary border border-iso-border rounded text-[9px] font-mono text-iso-textMuted hover:text-iso-primary flex items-center gap-1 transition-colors cursor-pointer mr-1"
                    >
                      <Trash2 size={10} />
                      <span>Clear Finished</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const tId = selectedTenant?.tenantId || selectedTenant?.code || currentUser?.tenantId || '';
                      fetch(apiUrl(`/api/ingestion/jobs/active?tenantId=${encodeURIComponent(tId)}`))
                        .then(r => r.json())
                        .then(d => setJobsData(d))
                        .catch(() => {});
                    }}
                    title="Refresh status"
                    className="p-1 hover:bg-iso-bg rounded text-iso-textMuted hover:text-iso-primary transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button 
                    onClick={() => setShowOperations(false)} 
                    className="p-1 hover:bg-iso-bg rounded text-iso-textMuted hover:text-iso-primary transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Consolidated Menu Filter Chips (All, Active, Crawlers, Ingestion) */}
              {jobsData.jobs && jobsData.jobs.length > 0 && (
                <div className="flex items-center gap-1 pb-1 border-b border-iso-border/50 text-[10px] font-mono">
                  {[
                    { id: 'all', label: `All (${jobsData.jobs.length})` },
                    { id: 'active', label: `Active (${jobsData.activeCount})` },
                    { id: 'crawl', label: `Crawlers (${jobsData.jobs.filter(j => j.type === 'crawl').length})` },
                    { id: 'ingest', label: `Ingest (${jobsData.jobs.filter(j => j.type !== 'crawl').length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTaskFilter(tab.id)}
                      className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                        taskFilter === tab.id
                          ? 'bg-iso-primary text-white font-bold'
                          : 'bg-iso-bg hover:bg-iso-bgSecondary text-iso-textMuted border border-iso-border'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Filtered Jobs List */}
              {(() => {
                const filtered = (jobsData.jobs || []).filter(j => {
                  if (taskFilter === 'active') return j.status === 'running' || j.status === 'pending';
                  if (taskFilter === 'crawl') return j.type === 'crawl';
                  if (taskFilter === 'ingest') return j.type !== 'crawl';
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-5 text-center text-iso-textMuted font-mono text-xs bg-iso-bg/40 rounded border border-iso-border/60">
                      No tasks found for this filter.
                    </div>
                  );
                }

                // Selected job
                const currentJob = filtered.find(j => j.jobId === (selectedJobId || filtered[0].jobId)) || filtered[0];
                const isRunning = currentJob.status === 'running' || currentJob.status === 'pending';
                const progressPercent = currentJob.progress?.percentage || 0;
                const stats = currentJob.stats || {};

                return (
                  <div className="flex flex-col gap-3">
                    
                    {/* Job Selection Tabs if multiple */}
                    {filtered.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        {filtered.map(j => {
                          const isSelected = (selectedJobId || filtered[0].jobId) === j.jobId;
                          const jRunning = j.status === 'running' || j.status === 'pending';
                          return (
                            <button
                              key={j.jobId}
                              onClick={() => setSelectedJobId(j.jobId)}
                              className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isSelected
                                  ? 'bg-iso-accent text-white font-bold shadow-xs'
                                  : 'bg-iso-bg hover:bg-iso-bgSecondary border border-iso-border text-iso-textMuted'
                              }`}
                            >
                              {jRunning ? (
                                <Loader2 size={10} className="animate-spin text-amber-300" />
                              ) : j.status === 'completed' ? (
                                <CheckCircle2 size={10} className="text-emerald-400" />
                              ) : j.status === 'cancelled' ? (
                                <Ban size={10} className="text-slate-400" />
                              ) : (
                                <AlertCircle size={10} className="text-red-400" />
                              )}
                              <span>{j.type.toUpperCase()}</span>
                              <span className="opacity-75">#{j.jobId.slice(-4)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* ACTIVE TASK VIEW (Running) */}
                    {isRunning ? (
                      <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                        {/* Title & Status */}
                        <div className="bg-iso-bg/60 p-2.5 rounded border border-iso-border/70 flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 bg-iso-accent/15 text-iso-accent border border-iso-accent/30 text-[8px] font-mono uppercase font-bold rounded">
                                  {currentJob.type}
                                </span>
                                <span className="text-[11px] font-bold text-iso-primary truncate">
                                  {currentJob.title}
                                </span>
                              </div>
                              <span className="text-[9px] text-iso-textMuted font-mono mt-0.5">
                                Started: {new Date(currentJob.startTime).toLocaleTimeString()}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              <Loader2 size={10} className="animate-spin" />
                              Running
                            </span>
                          </div>

                          {/* Active URL */}
                          {stats.activeUrl && (
                            <div className="flex items-center gap-1 text-[10px] text-iso-text font-mono truncate bg-iso-cardBg px-2 py-1 rounded border border-iso-border/50 mt-1">
                              <Globe size={11} className="text-iso-accent shrink-0" />
                              <span className="text-iso-textMuted shrink-0">Processing:</span>
                              <span className="truncate text-iso-primary font-medium" title={stats.activeUrl}>
                                {stats.activeUrl}
                              </span>
                            </div>
                          )}

                          {/* Progress Bar */}
                          <div className="mt-1 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-iso-textMuted">Progress</span>
                              <span className="font-bold text-iso-primary">
                                {currentJob.progress?.current || 0} / {currentJob.progress?.total || 0} ({progressPercent}%)
                              </span>
                            </div>
                            <div className="w-full bg-iso-border/60 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-iso-accent rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Live Telemetry Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-iso-bg/40 p-2 rounded border border-iso-border/60 flex flex-col">
                            <span className="text-[8px] font-mono uppercase text-iso-textMuted">Discovered</span>
                            <span className="text-sm font-bold text-iso-primary font-mono mt-0.5">
                              {stats.discoveredCount || 0}
                            </span>
                            {stats.currentDepth && (
                              <span className="text-[8px] text-iso-textMuted font-mono">Depth {stats.currentDepth}/{stats.maxDepth || 2}</span>
                            )}
                          </div>

                          <div className="bg-iso-bg/40 p-2 rounded border border-iso-border/60 flex flex-col">
                            <span className="text-[8px] font-mono uppercase text-iso-textMuted">Ingested</span>
                            <span className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                              {stats.ingestedCount || 0}
                            </span>
                            <span className="text-[8px] text-emerald-600/70 font-mono">Vectors Indexed</span>
                          </div>

                          <div className="bg-iso-bg/40 p-2 rounded border border-iso-border/60 flex flex-col">
                            <span className="text-[8px] font-mono uppercase text-iso-textMuted">Failed</span>
                            <span className="text-sm font-bold text-red-500 font-mono mt-0.5">
                              {stats.failedCount || 0}
                            </span>
                            <span className="text-[8px] text-red-500/70 font-mono">Errors</span>
                          </div>
                        </div>

                        {/* Live Console Logs Stream */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-iso-textMuted">
                            <span className="flex items-center gap-1">
                              <Terminal size={10} /> Live Log Console
                            </span>
                            <span>{currentJob.logs?.length || 0} events</span>
                          </div>
                          
                          <div className="bg-zinc-950 text-zinc-300 font-mono text-[10px] p-2 rounded border border-zinc-800 max-h-28 overflow-y-auto space-y-1 scrollbar-thin">
                            {currentJob.logs && currentJob.logs.length > 0 ? (
                              currentJob.logs.slice(-30).map((log, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 leading-tight">
                                  <span className="text-zinc-500 shrink-0">
                                    {new Date(log.time).toLocaleTimeString()}
                                  </span>
                                  <span className={
                                    log.level === 'error' ? 'text-red-400' :
                                    log.level === 'warn' ? 'text-amber-400' :
                                    log.level === 'success' ? 'text-emerald-400' :
                                    'text-zinc-300'
                                  }>
                                    {log.message}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-zinc-500 italic">Processing task...</div>
                            )}
                          </div>
                        </div>

                        {/* Cancel Action */}
                        <div className="pt-1 border-t border-iso-border flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCancelJob(currentJob.jobId)}
                            disabled={cancellingJobId === currentJob.jobId}
                            className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {cancellingJobId === currentJob.jobId ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Ban size={12} />
                            )}
                            <span>Cancel Task</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* COMPLETED / FINISHED / CANCELLED TASK VIEW (Clean Consolidated Summary - No Heavy Logs) */
                      <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
                        <div className="bg-iso-bg/60 p-3 rounded border border-iso-border/70 flex flex-col gap-2">
                          
                          {/* Title & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 bg-iso-primary/10 text-iso-primary border border-iso-primary/20 text-[8px] font-mono uppercase font-bold rounded">
                                  {currentJob.type}
                                </span>
                                <span className="text-[11px] font-bold text-iso-primary truncate">
                                  {currentJob.title}
                                </span>
                              </div>
                              <span className="text-[9px] text-iso-textMuted font-mono mt-0.5">
                                {new Date(currentJob.startTime).toLocaleTimeString()} → {currentJob.endTime ? new Date(currentJob.endTime).toLocaleTimeString() : 'Finished'}
                              </span>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                              currentJob.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                                : currentJob.status === 'cancelled'
                                ? 'bg-slate-500/15 text-slate-500 border border-slate-500/30'
                                : 'bg-red-500/15 text-red-600 border border-red-500/30'
                            }`}>
                              {currentJob.status === 'completed' && <CheckCircle2 size={10} />}
                              {currentJob.status === 'cancelled' && <Ban size={10} />}
                              {currentJob.status === 'failed' && <AlertCircle size={10} />}
                              {currentJob.status}
                            </span>
                          </div>

                          {/* Concise Summary Callout */}
                          <div className={`p-2 rounded text-[10px] font-mono leading-relaxed border ${
                            currentJob.status === 'completed'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                              : currentJob.status === 'cancelled'
                              ? 'bg-slate-500/10 border-slate-500/20 text-slate-700'
                              : 'bg-red-500/10 border-red-500/20 text-red-700'
                          }`}>
                            {currentJob.type === 'crawl' && currentJob.status === 'completed' && (
                              <span>✅ Discovered <strong>{stats.discoveredCount || currentJob.result?.totalDiscovered || 0}</strong> pages (Depth {stats.currentDepth || stats.maxDepth || 2}).</span>
                            )}
                            {currentJob.type === 'batch_ingest' && currentJob.status === 'completed' && (
                              <span>✅ Batch Ingest: <strong>{stats.ingestedCount || currentJob.result?.successful || 0}</strong> vectors indexed ({stats.failedCount || currentJob.result?.failed || 0} failed).</span>
                            )}
                            {currentJob.type === 'scrape' && currentJob.status === 'completed' && (
                              <span>✅ URL successfully scraped &amp; vectorized.</span>
                            )}
                            {currentJob.status === 'cancelled' && (
                              <span>⛔ Task was cancelled by user request.</span>
                            )}
                            {currentJob.status === 'failed' && (
                              <span>❌ Task failed: {currentJob.error || 'Pipeline stopped.'}</span>
                            )}
                          </div>

                          {/* Metrics Pill Grid */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono text-[10px]">
                            <div className="bg-iso-cardBg p-1.5 rounded border border-iso-border/50">
                              <span className="text-[8px] text-iso-textMuted uppercase block">Discovered</span>
                              <span className="font-bold text-iso-primary">{stats.discoveredCount || 0}</span>
                            </div>
                            <div className="bg-iso-cardBg p-1.5 rounded border border-iso-border/50">
                              <span className="text-[8px] text-iso-textMuted uppercase block">Ingested</span>
                              <span className="font-bold text-emerald-600">{stats.ingestedCount || 0}</span>
                            </div>
                            <div className="bg-iso-cardBg p-1.5 rounded border border-iso-border/50">
                              <span className="text-[8px] text-iso-textMuted uppercase block">Failed</span>
                              <span className="font-bold text-red-500">{stats.failedCount || 0}</span>
                            </div>
                          </div>

                        </div>

                        {/* NEXT STEP: Continue to Ingest Discovered URLs if Crawl was Completed */}
                        {currentJob.type === 'crawl' && currentJob.status === 'completed' && (currentJob.result?.discoveredUrls?.length > 0 || stats.discoveredCount > 0) && (
                          <button
                            type="button"
                            onClick={() => handleContinueCrawlJob(currentJob)}
                            className="w-full py-2 bg-iso-primary hover:bg-iso-primaryLight text-white rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                          >
                            <Sparkles size={13} />
                            <span>Review Discovered URLs &amp; Ingest ({currentJob.result?.discoveredUrls?.length || stats.discoveredCount || 0} URLs) →</span>
                          </button>
                        )}

                        {/* Entry Action Toolbar */}
                        <div className="flex items-center gap-2 pt-1 border-t border-iso-border">
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(currentJob.jobId)}
                            className="flex-1 py-1.5 bg-iso-bg hover:bg-iso-bgSecondary text-iso-textMuted hover:text-red-600 border border-iso-border rounded text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 size={11} />
                            <span>Dismiss Task</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (setSelectedPortal) setSelectedPortal('admin');
                              if (setActiveRoutePath) setActiveRoutePath('ingestion');
                              setShowOperations(false);
                            }}
                            className="flex-1 py-1.5 bg-iso-bg hover:bg-iso-bgSecondary text-iso-primary border border-iso-border rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink size={11} />
                            <span>Open Ingestion</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* Trigger Button Just Above User Profile */}
        <button
          type="button"
          onClick={() => setShowOperations(!showOperations)}
          className={`w-full flex items-center rounded-sm transition-all duration-200 cursor-pointer overflow-hidden text-left group ${
            jobsData.activeCount > 0
              ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 p-1.5'
              : 'hover:bg-iso-cardBg p-1.5 border border-transparent'
          }`}
          title={isCollapsed ? `Tasks & Ingestion Monitor (${jobsData.activeCount} Active)` : 'Click to open Operations Monitor'}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <div className={`w-7 h-7 rounded-sm flex items-center justify-center transition-colors ${
              jobsData.activeCount > 0
                ? 'bg-amber-500/20 text-amber-600 font-bold'
                : 'bg-iso-cardBg text-iso-textMuted group-hover:text-iso-primary'
            }`}>
              {jobsData.activeCount > 0 ? (
                <Loader2 size={14} className="animate-spin text-amber-500" />
              ) : (
                <Activity size={14} />
              )}
            </div>

            {/* Glowing active badge dot */}
            {jobsData.activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
            )}
          </div>

          <div className={`flex flex-col items-start min-w-0 transition-all duration-300 ease-in-out overflow-hidden ml-2 ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 flex-1'
          }`}>
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-iso-primary leading-tight truncate">
                {jobsData.activeCount > 0 
                  ? (jobsData.jobs.find(j => j.status === 'running')?.title?.slice(0, 20) || 'Operation Active')
                  : 'Tasks & Operations'}
              </span>
              <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                jobsData.activeCount > 0 
                  ? 'bg-amber-500 text-white font-bold' 
                  : 'bg-iso-border/70 text-iso-textMuted'
              }`}>
                {jobsData.activeCount > 0 ? `${jobsData.activeCount}` : 'Idle'}
              </span>
            </div>

            {/* Mini Progress Bar if Active */}
            {jobsData.activeCount > 0 && jobsData.jobs.length > 0 && (
              <div className="w-full mt-1">
                <div className="w-full bg-amber-500/20 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${jobsData.jobs.find(j => j.status === 'running')?.progress?.percentage || 30}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </button>

      </div>

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

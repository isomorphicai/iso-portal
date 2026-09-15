import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, LogOut, Loader2, CheckCircle, AlertCircle, Ban, Clock, 
  Activity, ExternalLink, ArrowRight, RefreshCw, Layers, Compass, X, User
} from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Header({ 
  selectedTenant, 
  selectedBot, 
  selectedPortal, 
  activeRoute, 
  currentUser, 
  onLogout,
  onNavigate,
  showToast 
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  const tenantDisplayName = selectedTenant?.tenantConfig?.instituteName 
    || selectedTenant?.tenantName 
    || selectedTenant?.name 
    || currentUser?.tenantName 
    || currentUser?.tenantId 
    || 'isomorphic AI';

  const isGlobalAdmin = Boolean(
    currentUser?.role === 'global_admin' || 
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'admin' || 
    currentUser?.isGlobalAdmin || 
    currentUser?.tenantId === 'admin'
  );

  const activeTenantId = selectedTenant?.tenantId || selectedTenant?.code || currentUser?.tenantId || '';

  // Close notifications popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Fetch active and recent jobs for the current tenant / user
  const fetchJobs = useCallback(async (isManual = false) => {
    if (!currentUser) return;
    if (isManual) setLoading(true);
    try {
      const sessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id') || '';
      // Global admin sees all jobs across all tenants; Tenant user sees jobs for their tenant
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
      if (isManual) setLoading(false);
    }
  }, [currentUser, activeTenantId, isGlobalAdmin]);

  // Initial load and listen for job updates triggered on actions (No background polling interval)
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
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('iso_open_crawl_ingest', { detail: job }));
    }, 50);
  };

  return (
    <header className="h-14 border-b border-iso-border flex items-center justify-between px-8 bg-iso-cardBg sticky top-0 z-40 select-none shrink-0 relative">
      
      {/* Left: Dynamic Live Task indicator */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-iso-textMuted min-w-[120px]">
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              fetchJobs();
            }}
            className="flex items-center gap-1.5 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-bold animate-pulse hover:bg-emerald-100 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={9} className="animate-spin text-emerald-600" />
            <span>{activeCount} Process{activeCount > 1 ? 'es' : ''} Active</span>
          </button>
        )}
      </div>

      {/* Center: Tenant Name */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-bold tracking-wide text-iso-primary uppercase font-mono whitespace-nowrap">
        <span>{tenantDisplayName}</span>
      </div>
      
      {/* Right: Notifications Bell Icon & Logout */}
      <div className="flex items-center min-w-[120px] justify-end gap-2 relative" ref={popoverRef}>
        
        {/* Process Notification Bell Button */}
        {currentUser && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const nextState = !showNotifications;
                setShowNotifications(nextState);
                if (nextState) fetchJobs();
              }}
              className={`p-1.5 rounded-sm border transition-all cursor-pointer relative ${
                showNotifications
                  ? 'bg-iso-bgSecondary text-iso-primary border-iso-border'
                  : 'text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary border-transparent hover:border-iso-border'
              }`}
              title={activeCount > 0 ? `${activeCount} active background processes running` : 'Background Operations & Tasks'}
            >
              <Bell size={15} className={activeCount > 0 ? 'text-iso-primary' : ''} />
              
              {/* Dynamic Badge Counter (Shows exact count, clears when finished) */}
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-emerald-600 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm border border-iso-cardBg">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-9 w-84 sm:w-96 bg-iso-cardBg border border-iso-border rounded-sm shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                
                {/* Popover Header */}
                <div className="p-3 bg-iso-bgSecondary border-b border-iso-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className={activeCount > 0 ? 'text-emerald-600 animate-pulse' : 'text-iso-accent'} />
                    <div>
                      <h4 className="text-xs font-bold text-iso-primary">Operations &amp; Tasks</h4>
                      <p className="text-[10px] font-mono text-iso-textMuted">
                        {activeCount > 0 ? `${activeCount} running in background` : 'All background processes idle'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fetchJobs(true)}
                      className="p-1 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bg transition-colors cursor-pointer"
                      title="Refresh tasks"
                    >
                      <RefreshCw size={11} className={loading ? 'animate-spin text-iso-primary' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-iso-textMuted hover:text-iso-text rounded hover:bg-iso-bg transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Popover Jobs List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-iso-border p-1 bg-iso-bg">
                  {jobs.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-iso-textMuted text-xs font-mono">
                      <Clock size={20} className="text-iso-textMuted/60" />
                      <span>No background tasks recorded yet.</span>
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
                        <div key={jobId} className="p-2.5 bg-iso-cardBg hover:bg-iso-bgSecondary/60 transition-colors flex flex-col gap-1.5 rounded-xs">
                          {/* Title & Status Row */}
                          <div className="flex items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {job.type === 'crawl' || job.type === 'website_crawl' ? (
                                <Compass size={12} className="text-iso-accent shrink-0" />
                              ) : (
                                <Layers size={12} className="text-iso-primary shrink-0" />
                              )}
                              <span className="font-bold text-iso-primary truncate text-[11px]">
                                {job.title}
                              </span>
                            </div>

                            <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded font-bold uppercase tracking-wider border shrink-0 ${
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

                          {/* Progress Bar (Always shows for active tasks) */}
                          <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center text-[9px] font-mono text-iso-textMuted">
                              <span className="truncate max-w-[200px]">
                                {job.progress?.currentUrl ? job.progress.currentUrl : (isRunning ? 'Processing...' : 'Completed')}
                              </span>
                              <span className="font-bold text-iso-primary">{percent}%</span>
                            </div>
                            <div className="w-full bg-iso-bgSecondary h-1.5 rounded-full overflow-hidden border border-iso-border">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  isFailed ? 'bg-rose-500' : isCompleted ? 'bg-blue-600' : isCancelled ? 'bg-slate-400' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
                              />
                            </div>
                          </div>

                          {/* Footer details & Creator/Cancel */}
                          <div className="flex items-center justify-between text-[9px] font-mono text-iso-textMuted pt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-0.5 text-iso-textMuted">
                                <User size={9} />
                                <span>by: <strong className="text-iso-primary">{job.createdBy || 'user'}</strong></span>
                              </span>
                              <span>•</span>
                              <span>{job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : ''}</span>
                            </div>

                            {isRunning && (
                              canCancel ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleCancelJob(jobId, e)}
                                  className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 rounded text-[9px] font-bold cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              ) : (
                                <span className="text-[8px] italic text-iso-textMuted">
                                  creator only
                                </span>
                              )
                            )}

                            {isCompleted && (job.type === 'crawl' || job.type === 'website_crawl') && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenJobIngest(job, e)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Open ingestion popup to ingest discovered URLs"
                              >
                                <Layers size={9} />
                                <span>Ingest{job.result?.discoveredUrls?.length ? ` (${job.result.discoveredUrls.length})` : ''}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-2 bg-iso-bgSecondary border-t border-iso-border flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-iso-textMuted">
                    Auto-synced with MongoDB
                  </span>
                  <span className="text-[10px] font-mono text-iso-textMuted">
                    {jobs.length} task{jobs.length === 1 ? '' : 's'} recorded
                  </span>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Log Out Button */}
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

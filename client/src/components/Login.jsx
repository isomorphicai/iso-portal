import React, { useState, useEffect } from 'react';
import { Key, User, Loader2, Building2, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Login({ onLoginSuccess, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tenant branding states
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isTenantsLoading, setIsTenantsLoading] = useState(true);

  // Fetch tenants on mount to dynamically retrieve custom branding (logo, background, theme colors)
  useEffect(() => {
    let isMounted = true;
    const loadTenants = async () => {
      try {
        const res = await fetch(apiUrl('/api/admin/tenants'));
        const data = await res.json();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTenants(data);
          
          // Determine initial tenant: from URL query (?tenant=...), localStorage, or first tenant
          const urlParams = new URLSearchParams(window.location.search);
          const tenantParam = urlParams.get('tenant');
          const lastTenantId = localStorage.getItem('iso_last_tenant');
          
          const match = data.find(t => 
            (tenantParam && (t.tenantId === tenantParam || t.code === tenantParam)) ||
            (lastTenantId && (t.tenantId === lastTenantId || t._id === lastTenantId || t.code === lastTenantId))
          );
          
          setSelectedTenant(match || data[0]);
        }
      } catch (err) {
        console.warn('Could not load tenant branding for login screen:', err);
      } finally {
        if (isMounted) setIsTenantsLoading(false);
      }
    };

    loadTenants();
    return () => { isMounted = false; };
  }, []);

  const handleTenantChange = (tenantId) => {
    const found = tenants.find(t => t.tenantId === tenantId || t._id === tenantId || t.code === tenantId);
    if (found) {
      setSelectedTenant(found);
      localStorage.setItem('iso_last_tenant', found.tenantId || found.code);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        username: username.trim(),
        password: password.trim(),
        tenantId: selectedTenant?.tenantId || selectedTenant?.code || undefined
      };

      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        if (selectedTenant) {
          localStorage.setItem('iso_last_tenant', selectedTenant.tenantId || selectedTenant.code);
        }
        onLoginSuccess(data);
        showToast(`Welcome back, ${data.username}! Access level: ${data.role}`);
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Network error connecting to auth server.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = selectedTenant?.tenantConfig || {};
  const hasBgImage = Boolean(cfg.backgroudImageUrl);
  const brandName = cfg.instituteName || selectedTenant?.tenantName || selectedTenant?.name || 'isomorphic';
  const themeColor = cfg.ButtonandLeftBarColor || '#00306D';
  const buttonTextColor = cfg.buttonFontColor || '#ffffff';
  const borderColor = cfg.BordersColor || themeColor;
  const subtitleColor = cfg.forgotFontColor || '#64748b';
  const logoUrl = cfg.logoBigUrl || cfg.logoSmallUrl;

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        backgroundColor: cfg.loginBackgroundColor || '#fdf7f7',
        backgroundImage: hasBgImage ? `url(${cfg.backgroudImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dynamic Backdrop Overlay for contrast and readability */}
      <div 
        className={`absolute inset-0 transition-opacity duration-500 ${
          hasBgImage ? 'bg-black/45 backdrop-blur-[2px]' : 'bg-transparent'
        }`} 
      />

      {/* Top Organization Selector (if multiple tenants exist) */}
      {tenants.length > 1 && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-sm px-3 py-1.5 shadow-sm text-xs">
          <Building2 size={13} className="text-iso-accent shrink-0" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">Workspace:</span>
          <select
            value={selectedTenant?.tenantId || selectedTenant?.code || ''}
            onChange={(e) => handleTenantChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
          >
            {tenants.map(t => (
              <option key={t._id || t.tenantId} value={t.tenantId || t.code} className="text-slate-900 bg-white">
                {t.tenantConfig?.instituteName || t.tenantName || t.name || t.tenantId}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-sm p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Custom Logo & Brand Header */}
        <div className="flex flex-col items-center text-center">
          {logoUrl ? (
            <div className="mb-2 max-h-16 flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt={`${brandName} Logo`}
                className="max-h-14 max-w-[220px] object-contain transition-all duration-300"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl font-bold tracking-tight font-serif text-iso-primary">
                {brandName}
              </span>
            </div>
          )}

          <span 
            className="text-[10px] font-mono uppercase tracking-widest block font-bold transition-colors"
            style={{ color: subtitleColor }}
          >
            {cfg.instituteName ? `${cfg.instituteName} Console` : 'Tenant Administration Console'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-sm text-center font-medium animate-in fade-in duration-150">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 block mb-1 font-semibold">
              Username
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none transition-colors"
                required
                autoFocus
              />
              <User size={13} className="absolute left-2.5 top-3 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 block mb-1 font-semibold">
              Password
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none transition-colors"
                required
              />
              <Key size={13} className="absolute left-2.5 top-3 text-slate-400" />
            </div>
          </div>

          {/* Active Tenant Tag */}
          {selectedTenant && (
            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-sm">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Signing into:</span>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                {brandName}
              </span>
            </div>
          )}

          {/* Submit Button with Custom Theme Colors */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: themeColor,
              color: buttonTextColor,
              borderColor: borderColor
            }}
            className="w-full py-2.5 disabled:opacity-50 rounded-sm text-xs font-bold border transition-all mt-1 cursor-pointer shadow-md hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin inline" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Log In</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald-500" /> Secure Gateway
          </span>
          <span>ISO-Auth-v1.2</span>
        </div>

      </div>
    </div>
  );
}

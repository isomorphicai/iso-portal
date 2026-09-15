import React, { useState, useEffect, useCallback } from 'react';
import { Key, User, Loader2, ShieldCheck, Lock, X, Eye, EyeOff, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiUrl } from '../config/api';
import { applyTenantTheme, resetTenantTheme } from '../utils/theme';

export default function Login({ onLoginSuccess, showToast }) {
  // Mode: 'login' | 'forgot' | 'reset'
  const [viewMode, setViewMode] = useState('login');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotResetLink, setForgotResetLink] = useState(null);

  // Reset Password State
  const [resetToken, setResetToken] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Multi-tenant Branding States
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantData, setTenantData] = useState(null);
  const [isFetchingBranding, setIsFetchingBranding] = useState(false);
  const [tenantFetchError, setTenantFetchError] = useState(null);

  // Extract Tenant Identifier from Path (/login/:tenant), Query (?tenant=), or Subdomain
  const resolveTenantSlug = useCallback(() => {
    if (typeof window === 'undefined') return '';

    // 1. Path format: /login/:tenant or /tenant/:tenant
    const path = window.location.pathname;
    const loginMatch = path.match(/^\/login\/([a-zA-Z0-9_\-\.]+)/i);
    if (loginMatch && loginMatch[1]) {
      return loginMatch[1].trim();
    }
    const tenantMatch = path.match(/^\/tenant\/([a-zA-Z0-9_\-\.]+)/i);
    if (tenantMatch && tenantMatch[1]) {
      return tenantMatch[1].trim();
    }

    // 2. Query parameter format: ?tenant=acme or ?tenantId=acme or ?org=acme
    const searchParams = new URLSearchParams(window.location.search);
    const qTenant = searchParams.get('tenant') || searchParams.get('tenantId') || searchParams.get('org') || searchParams.get('code');
    if (qTenant) {
      return qTenant.trim();
    }

    // 3. Subdomain format: acme.portal.domain.com
    const host = window.location.hostname;
    if (host && !['localhost', '127.0.0.1'].includes(host) && !host.includes('.onrender.com')) {
      const parts = host.split('.');
      if (parts.length > 2) {
        const sub = parts[0].toLowerCase();
        if (!['www', 'portal', 'app', 'admin', 'api', 'stage', 'dev'].includes(sub)) {
          return sub;
        }
      }
    }

    // 4. Stored fallback from previous tenant session
    try {
      const storedLast = localStorage.getItem('iso_last_tenant');
      if (storedLast && storedLast.trim()) {
        return storedLast.trim();
      }
    } catch (e) {}

    return '';
  }, []);

  // Fetch Public Tenant Branding with Cache-Busting
  const fetchTenantBranding = useCallback(async (slug) => {
    if (!slug) {
      setTenantData(null);
      setTenantFetchError(null);
      resetTenantTheme();
      return;
    }

    setIsFetchingBranding(true);
    setTenantFetchError(null);

    try {
      const res = await fetch(apiUrl(`/api/tenant/branding/${encodeURIComponent(slug)}?_t=${Date.now()}`));
      const data = await res.json();

      if (res.ok && data && (data.tenantConfig || data.tenantName)) {
        setTenantData(data);
        setTenantFetchError(null);
        try {
          localStorage.setItem('iso_last_tenant', slug);
        } catch (e) {}
        applyTenantTheme(data.tenantConfig || {}, data);
      } else {
        setTenantData(null);
        setTenantFetchError(data.error || `Organization "${slug}" not found.`);
        resetTenantTheme();
      }
    } catch (err) {
      console.warn('[Login] Error fetching tenant branding:', err);
      setTenantFetchError(`Unable to connect to organization "${slug}".`);
      setTenantData(null);
      resetTenantTheme();
    } finally {
      setIsFetchingBranding(false);
    }
  }, []);

  // Initial load, Reset Token check, and URL listener
  useEffect(() => {
    const currentSlug = resolveTenantSlug();
    setTenantSlug(currentSlug);
    if (currentSlug) {
      fetchTenantBranding(currentSlug);
    } else {
      resetTenantTheme();
    }

    // Check for password reset token in URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('resetToken') || searchParams.get('token');
    const userParam = searchParams.get('username') || searchParams.get('user');
    if (tokenParam) {
      setResetToken(tokenParam);
      if (userParam) setResetUsername(decodeURIComponent(userParam));
      setViewMode('reset');
    }

    const handlePopState = () => {
      const slug = resolveTenantSlug();
      setTenantSlug(slug);
      fetchTenantBranding(slug);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolveTenantSlug, fetchTenantBranding]);

  // Submit Login credentials
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        username: username.trim(),
        password: password.trim()
      };

      // If tenant branding is loaded or slug is active, attach tenant scope
      if (tenantData?.tenantId || tenantSlug) {
        payload.tenant = tenantData?.tenantId || tenantSlug;
        payload.tenantId = tenantData?.tenantId || tenantSlug;
      }

      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        if (tenantSlug) {
          try {
            localStorage.setItem('iso_last_tenant', tenantSlug);
          } catch (e) {}
        }
        onLoginSuccess(data);
        showToast?.(`Welcome back, ${data.username}! Access level: ${data.role}`);
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Network error connecting to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Forgot Password request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered username or email.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const payload = {
        identifier: forgotIdentifier.trim(),
        tenant: tenantData?.tenantId || tenantSlug || '',
        baseUrl: window.location.origin
      };

      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setForgotSuccess(data.message || 'Password reset link has been sent to your email.');
        setForgotResetLink(data.resetLink || null);
      } else {
        setForgotError(data.error || 'Failed to process password reset request.');
      }
    } catch (err) {
      setForgotError('Network error connecting to password reset service.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Submit Reset Password request
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setResetError('Please enter and confirm your new password.');
      return;
    }
    if (newPassword.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const payload = {
        token: resetToken,
        newPassword: newPassword.trim(),
        username: resetUsername,
        tenant: tenantData?.tenantId || tenantSlug || ''
      };

      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setResetSuccess(true);
        showToast?.('Password updated successfully! You can now log in.');
        
        // Remove token params from URL without reloading
        try {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {}

        // Pre-fill username for smooth sign-in
        if (resetUsername) {
          setUsername(resetUsername);
        }
        setPassword('');
        
        // Return to login mode after brief confirmation
        setTimeout(() => {
          setViewMode('login');
          setResetSuccess(false);
          setResetToken('');
          setNewPassword('');
          setConfirmPassword('');
        }, 1800);
      } else {
        setResetError(data.error || 'Failed to reset password. The link may have expired.');
      }
    } catch (err) {
      setResetError('Network error connecting to authentication service.');
    } finally {
      setResetLoading(false);
    }
  };

  const cfg = tenantData?.tenantConfig || {};
  const hasCustomLogo = Boolean(cfg.logoBigUrl && cfg.logoBigUrl.trim() !== '');
  const logoUrl = hasCustomLogo ? cfg.logoBigUrl.trim() : (cfg.logoSmallUrl ? cfg.logoSmallUrl.trim() : null);
  const hasBgImage = Boolean(cfg.backgroudImageUrl && cfg.backgroudImageUrl.trim() !== '');
  const bgImage = hasBgImage ? cfg.backgroudImageUrl.trim() : null;
  const brandTitle = cfg.instituteName || tenantData?.tenantName || 'Enterprise AI Administration';
  const primaryBrandColor = cfg.ButtonandLeftBarColor || '#0A2240';
  const buttonFontColor = cfg.buttonFontColor || '#ffffff';
  const bordersColor = cfg.BordersColor || '#578b96';
  const forgotFontColor = cfg.forgotFontColor || '#6B7280';
  const loginBgColor = cfg.loginBackgroundColor || '#FAF9F6';
  const headerFontSize = cfg.allHeaderFontSize || '1.6rem';
  const titleFontSize = cfg.allTitleFontSize || '0.75rem';
  const disableBtnColor = cfg.disableButtonColor || '#c1c1c1';

  // Full-page loader while resolving and loading organization branding
  if (isFetchingBranding) {
    return (
      <div className="min-h-screen w-full bg-iso-bg flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-200">
          <span className="text-3xl font-bold tracking-tight font-serif text-iso-primary">isomorphic</span>
          <div className="flex items-center gap-2 text-xs text-iso-textMuted font-mono">
            <span className="w-3.5 h-3.5 border-2 border-iso-primary border-t-transparent rounded-full animate-spin"></span>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-all duration-300"
      style={{
        backgroundColor: loginBgColor,
        backgroundImage: bgImage ? `url('${bgImage}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background image overlay only rendered when custom backdrop image is present */}
      {hasBgImage && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-all duration-300" />
      )}

      {/* Main Container Card */}
      <div 
        className="relative z-10 w-full max-w-md border rounded-sm p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: loginBgColor || '#FFFFFF',
          borderColor: bordersColor ? (bordersColor.length === 7 ? `${bordersColor}50` : bordersColor) : '#E2DFD6',
          boxShadow: `0 20px 25px -5px ${bordersColor ? `${bordersColor}20` : 'rgba(0, 0, 0, 0.1)'}, 0 8px 10px -6px ${bordersColor ? `${bordersColor}10` : 'rgba(0, 0, 0, 0.1)'}`
        }}
      >
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={brandTitle} 
              className="h-14 md:h-16 max-w-[290px] object-contain mb-3 select-none transition-all duration-200" 
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = e.target.nextSibling;
                if (fallback) fallback.style.display = 'block';
              }} 
            />
          ) : null}

          <h1 
            style={{ 
              display: logoUrl ? 'none' : 'block',
              color: primaryBrandColor,
              fontSize: headerFontSize
            }} 
            className="font-bold tracking-tight font-serif mb-1"
          >
            {brandTitle}
          </h1>

          <span 
            className="font-mono uppercase tracking-widest block font-medium mt-1"
            style={{ 
              color: forgotFontColor,
              fontSize: titleFontSize
            }}
          >
            {viewMode === 'forgot' ? 'Account Recovery' : 
             viewMode === 'reset' ? 'Password Reset' : 
             (cfg.instituteName ? `${cfg.instituteName} Portal` : (tenantData?.tenantName || 'Enterprise Console'))}
          </span>
        </div>

        {/* Tenant Fetch Warning (if slug was invalid) */}
        {tenantFetchError && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-sm flex items-start justify-between gap-2">
            <div>
              <span className="font-bold block">Notice</span>
              <span>{tenantFetchError} Showing default login.</span>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setTenantFetchError(null);
                setTenantSlug('');
                try {
                  localStorage.removeItem('iso_last_tenant');
                } catch (e) {}
                fetchTenantBranding('');
              }}
              className="text-amber-800 hover:text-amber-950 font-bold text-xs cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 1: LOGIN FORM */}
        {/* ========================================================= */}
        {viewMode === 'login' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm text-center font-medium animate-in fade-in duration-150">
                {error}
              </div>
            )}

            <div>
              <label 
                className="text-[10px] uppercase font-mono tracking-wider block mb-1 font-bold"
                style={{ color: forgotFontColor }}
              >
                Username or Email
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-white/80 border rounded-sm pl-8 pr-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all"
                  style={{
                    borderColor: bordersColor ? `${bordersColor}60` : '#E2DFD6'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = primaryBrandColor;
                    e.target.style.boxShadow = `0 0 0 1px ${primaryBrandColor}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = bordersColor ? `${bordersColor}60` : '#E2DFD6';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                  autoFocus
                />
                <User size={14} className="absolute left-2.5 top-3.5" style={{ color: forgotFontColor }} />
              </div>
            </div>

            <div>
              <label 
                className="text-[10px] uppercase font-mono tracking-wider block mb-1 font-bold"
                style={{ color: forgotFontColor }}
              >
                Password
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-white/80 border rounded-sm pl-8 pr-9 py-2.5 text-xs text-slate-800 outline-none transition-all"
                  style={{
                    borderColor: bordersColor ? `${bordersColor}60` : '#E2DFD6'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = primaryBrandColor;
                    e.target.style.boxShadow = `0 0 0 1px ${primaryBrandColor}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = bordersColor ? `${bordersColor}60` : '#E2DFD6';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
                <Key size={14} className="absolute left-2.5 top-3.5 pointer-events-none" style={{ color: forgotFontColor }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 p-1 transition-colors cursor-pointer rounded hover:opacity-80"
                  style={{ color: forgotFontColor }}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('forgot');
                    setError(null);
                    setForgotError(null);
                    setForgotSuccess(null);
                    if (username.trim()) setForgotIdentifier(username.trim());
                  }}
                  className="text-[11px] font-medium transition-all hover:underline cursor-pointer select-none"
                  style={{ color: forgotFontColor }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isFetchingBranding}
              className="w-full py-2.5 rounded-sm text-xs font-bold border transition-all mt-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{
                backgroundColor: loading ? disableBtnColor : primaryBrandColor,
                borderColor: bordersColor || primaryBrandColor,
                color: buttonFontColor
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin inline" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE 2: FORGOT PASSWORD FORM */}
        {/* ========================================================= */}
        {viewMode === 'forgot' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-sm flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold block text-emerald-800 text-[13px] mb-1">
                      {forgotResetLink ? 'Reset Link Ready!' : 'Reset Link Sent!'}
                    </span>
                    <span>{forgotSuccess}</span>
                  </div>
                </div>

                {forgotResetLink && (
                  <div className="mt-1 p-3 bg-white border border-emerald-200 rounded text-xs flex flex-col gap-2 shadow-xs">
                    <span className="text-[11px] text-slate-600">
                      Cloud host blocked direct outbound SMTP socket. You can click below to reset your password directly:
                    </span>
                    <a
                      href={forgotResetLink}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs text-center transition-colors shadow-xs"
                    >
                      Reset Password Now &rarr;
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setForgotSuccess(null);
                    setForgotResetLink(null);
                  }}
                  className="mt-2 w-full py-2 rounded-sm text-xs font-bold border text-center transition-all cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: primaryBrandColor,
                    color: buttonFontColor,
                    borderColor: bordersColor || primaryBrandColor
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div className="text-center text-xs" style={{ color: forgotFontColor }}>
                  Enter your registered username or email address below. We'll send you a secure link to reset your password.
                </div>

                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm text-center font-medium animate-in fade-in duration-150">
                    {forgotError}
                  </div>
                )}

                <div>
                  <label 
                    className="text-[10px] uppercase font-mono tracking-wider block mb-1 font-bold"
                    style={{ color: forgotFontColor }}
                  >
                    Registered Username or Email
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. admin or user@domain.com"
                      className="w-full bg-white/80 border rounded-sm pl-8 pr-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all"
                      style={{
                        borderColor: bordersColor ? `${bordersColor}60` : '#E2DFD6'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = primaryBrandColor;
                        e.target.style.boxShadow = `0 0 0 1px ${primaryBrandColor}40`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = bordersColor ? `${bordersColor}60` : '#E2DFD6';
                        e.target.style.boxShadow = 'none';
                      }}
                      required
                      autoFocus
                    />
                    <Mail size={14} className="absolute left-2.5 top-3.5" style={{ color: forgotFontColor }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-sm text-xs font-bold border transition-all mt-1 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{
                    backgroundColor: forgotLoading ? disableBtnColor : primaryBrandColor,
                    borderColor: bordersColor || primaryBrandColor,
                    color: buttonFontColor
                  }}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin inline" />
                      <span>Sending Reset Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={13} />
                      <span>Send Password Reset Link</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setForgotError(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:underline cursor-pointer"
                    style={{ color: forgotFontColor }}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Log In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 3: RESET PASSWORD FORM */}
        {/* ========================================================= */}
        {viewMode === 'reset' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-sm flex flex-col items-center text-center gap-2">
                <CheckCircle2 size={32} className="text-emerald-600 animate-bounce" />
                <span className="font-bold text-sm text-emerald-800">Password Updated Successfully!</span>
                <span className="text-xs text-emerald-700">Redirecting you to the login screen...</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div className="text-center text-xs" style={{ color: forgotFontColor }}>
                  {resetUsername ? (
                    <span>Create a new password for account <strong className="text-slate-800">{resetUsername}</strong></span>
                  ) : (
                    <span>Please enter your new password below.</span>
                  )}
                </div>

                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm text-center font-medium animate-in fade-in duration-150">
                    {resetError}
                  </div>
                )}

                <div>
                  <label 
                    className="text-[10px] uppercase font-mono tracking-wider block mb-1 font-bold"
                    style={{ color: forgotFontColor }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 4 chars)"
                      className="w-full bg-white/80 border rounded-sm pl-8 pr-9 py-2.5 text-xs text-slate-800 outline-none transition-all"
                      style={{
                        borderColor: bordersColor ? `${bordersColor}60` : '#E2DFD6'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = primaryBrandColor;
                        e.target.style.boxShadow = `0 0 0 1px ${primaryBrandColor}40`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = bordersColor ? `${bordersColor}60` : '#E2DFD6';
                        e.target.style.boxShadow = 'none';
                      }}
                      required
                      autoFocus
                    />
                    <Key size={14} className="absolute left-2.5 top-3.5 pointer-events-none" style={{ color: forgotFontColor }} />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2.5 p-1 transition-colors cursor-pointer rounded hover:opacity-80"
                      style={{ color: forgotFontColor }}
                      title={showNewPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label 
                    className="text-[10px] uppercase font-mono tracking-wider block mb-1 font-bold"
                    style={{ color: forgotFontColor }}
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-white/80 border rounded-sm pl-8 pr-9 py-2.5 text-xs text-slate-800 outline-none transition-all"
                      style={{
                        borderColor: bordersColor ? `${bordersColor}60` : '#E2DFD6'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = primaryBrandColor;
                        e.target.style.boxShadow = `0 0 0 1px ${primaryBrandColor}40`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = bordersColor ? `${bordersColor}60` : '#E2DFD6';
                        e.target.style.boxShadow = 'none';
                      }}
                      required
                    />
                    <Key size={14} className="absolute left-2.5 top-3.5 pointer-events-none" style={{ color: forgotFontColor }} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 p-1 transition-colors cursor-pointer rounded hover:opacity-80"
                      style={{ color: forgotFontColor }}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-sm text-xs font-bold border transition-all mt-1 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{
                    backgroundColor: resetLoading ? disableBtnColor : primaryBrandColor,
                    borderColor: bordersColor || primaryBrandColor,
                    color: buttonFontColor
                  }}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin inline" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={13} />
                      <span>Save & Update Password</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setResetError(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:underline cursor-pointer"
                    style={{ color: forgotFontColor }}
                  >
                    <ArrowLeft size={13} />
                    <span>Cancel & Back to Log In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>

      {/* Powered by Isomorphic Signature */}
      <div className="relative z-10 mt-6 flex items-center justify-center select-none animate-in fade-in duration-300">
        <a 
          href="https://isomorphic.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono tracking-wide transition-all shadow-2xs backdrop-blur-xs border hover:scale-105 active:scale-95 cursor-pointer group no-underline"
          style={{
            backgroundColor: hasBgImage ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.65)',
            borderColor: hasBgImage ? 'rgba(255, 255, 255, 0.15)' : (bordersColor ? `${bordersColor}30` : 'rgba(0, 0, 0, 0.08)'),
            color: hasBgImage ? 'rgba(255, 255, 255, 0.75)' : (forgotFontColor || '#64748B')
          }}
          title="Visit Isomorphic"
        >
          <span className="text-[10px] uppercase tracking-wider opacity-80">Powered by</span>
          <img 
            src="/isomorphic-icon.png" 
            alt="Isomorphic" 
            className="w-3.5 h-3.5 object-contain inline-block rounded-xs group-hover:rotate-6 transition-transform duration-200"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span 
            className="font-bold tracking-tight font-sans text-[11px] group-hover:underline"
            style={{ color: hasBgImage ? '#ffffff' : (primaryBrandColor || '#0A2240') }}
          >
            isomorphic
          </span>
        </a>
      </div>

    </div>
  );
}

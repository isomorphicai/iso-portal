import React, { useState } from 'react';
import { Key, User, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Login({ onLoginSuccess, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        })
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data);
        showToast(`Welcome back, ${data.username}! Access level: ${data.role}`);
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Network error connecting to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-iso-primary"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark Navy & Gold Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0A2240]/90 via-[#0A2240]/80 to-[#16365C]/85 backdrop-blur-[2px]" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md border border-[#E2DFD6] rounded-sm p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-sm bg-iso-bgSecondary border border-iso-border flex items-center justify-center text-2xl mb-3 shadow-xs select-none">
            🌐
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight font-serif text-iso-primary">
              isomorphic
            </span>
            <span className="text-[10px] bg-iso-primary text-white font-mono uppercase px-1.5 py-0.5 rounded-sm tracking-wider font-semibold">
              Portal
            </span>
          </div>

          <span className="text-[11px] text-iso-textMuted font-mono uppercase tracking-widest block mt-1.5">
            Enterprise AI Administration
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-iso-errorBg border border-iso-error/30 text-iso-error text-xs rounded-sm text-center font-medium animate-in fade-in duration-150">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
              Username
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2.5 text-xs text-iso-text outline-none transition-colors"
                required
                autoFocus
              />
              <User size={14} className="absolute left-2.5 top-3.5 text-iso-textMuted" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
              Password
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2.5 text-xs text-iso-text outline-none transition-colors"
                required
              />
              <Key size={14} className="absolute left-2.5 top-3.5 text-iso-textMuted" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold border border-iso-primary transition-all mt-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-1.5"
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

        {/* Footer */}
        <div className="border-t border-iso-border pt-3.5 flex items-center justify-between text-[10px] text-iso-textMuted font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>Secure Authentication</span>
          </span>
          <span>ISO-M-V1.2</span>
        </div>

      </div>
    </div>
  );
}

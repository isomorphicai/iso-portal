import React, { useState } from 'react';
import { Key, User, Loader2 } from 'lucide-react';
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
      setError('Network error connecting to auth server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-iso-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-iso-cardBg border border-iso-border rounded-sm p-8 shadow-sm flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-3xl font-bold tracking-tight font-serif text-iso-primary block">isomorphic</span>
          <span className="text-[10px] text-iso-textMuted font-mono uppercase tracking-widest block mt-1">Tenant Administration Console</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-iso-errorBg border border-iso-error/30 text-iso-error text-xs rounded-sm text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Username</label>
            <div className="relative">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs text-iso-text outline-none"
                required
                autoFocus
              />
              <User size={13} className="absolute left-2.5 top-3 text-iso-textMuted" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs text-iso-text outline-none"
                required
              />
              <Key size={13} className="absolute left-2.5 top-3 text-iso-textMuted" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold border border-iso-primary transition-all mt-2 cursor-pointer shadow-sm"
          >
            {loading ? <Loader2 size={12} className="animate-spin inline mr-1" /> : 'Log In'}
          </button>
        </form>

      </div>
    </div>
  );
}

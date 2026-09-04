import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import Login from './components/Login';
import { apiUrl } from './config/api';

// Import Modular Portal routes configurations
import { adminRoutes } from './routes/admin/routes';
import { clientRoutes } from './routes/client/routes';

// 2 Hours inactivity timeout in milliseconds (2 * 60 * 60 * 1000)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
// Heartbeat interval: send heartbeat every 2 minutes while active
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  // Global Navigation & Tenant States
  const [selectedPortal, setSelectedPortal] = useState('admin'); // admin | client
  const [activeRoutePath, setActiveRoutePath] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [toast, setToast] = useState(null);

  // Inactivity & Activity Tracking
  const lastActivityRef = useRef(Date.now());
  const hasRecentActivityRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Auth Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.sessionId) {
      localStorage.setItem('iso_session_id', user.sessionId);
    }
    localStorage.setItem('iso_user', JSON.stringify(user));
    lastActivityRef.current = Date.now();
    hasRecentActivityRef.current = true;
  };

  const handleLogout = async (reason = 'manual') => {
    const activeSessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id');
    
    // Clear local storage and state immediately
    setCurrentUser(null);
    localStorage.removeItem('iso_user');
    localStorage.removeItem('iso_session_id');
    setSelectedTenant(null);
    setSelectedBot(null);
    setBots([]);

    // Inform backend to end session in master > sessionManagement collection
    if (activeSessionId) {
      try {
        await fetch(apiUrl('/api/logout'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-session-id': activeSessionId
          },
          body: JSON.stringify({ sessionId: activeSessionId, reason })
        });
      } catch (e) {
        // network or server error on logout
      }
    }

    if (reason === 'inactivity') {
      showToast('You have been logged out due to 2 hours of inactivity.', 'warning');
    } else if (reason === 'manual') {
      showToast('Logged out successfully.', 'info');
    }
  };

  // Check initial session validity on portal startup
  useEffect(() => {
    const verifyInitialSession = async () => {
      try {
        let savedSessionId = localStorage.getItem('iso_session_id');
        if (!savedSessionId) {
          const savedUser = localStorage.getItem('iso_user');
          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              savedSessionId = parsed?.sessionId;
            } catch (e) {}
          }
        }

        if (!savedSessionId) {
          // No session found -> display login screen directly
          setIsVerifyingSession(false);
          return;
        }

        // Verify session against MongoDB Atlas master > sessionManagement
        const res = await fetch(apiUrl('/api/auth/verify-session'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': savedSessionId
          },
          body: JSON.stringify({ sessionId: savedSessionId })
        });

        const data = await res.json();

        if (res.ok && data.active && data.user) {
          // Active session confirmed -> automatically proceed into portal
          setCurrentUser(data.user);
          localStorage.setItem('iso_user', JSON.stringify(data.user));
          localStorage.setItem('iso_session_id', data.sessionId);
          lastActivityRef.current = Date.now();
        } else {
          // Session expired or invalid -> clear storage and present login screen
          localStorage.removeItem('iso_user');
          localStorage.removeItem('iso_session_id');
          setCurrentUser(null);
          if (data?.reason === 'inactivity' || data?.error?.includes('inactivity')) {
            showToast('Previous session expired due to 2 hours of inactivity. Please log in again.', 'warning');
          }
        }
      } catch (err) {
        console.error('Session verification network error:', err);
        // On network failure fallback to clean login state for security
        localStorage.removeItem('iso_user');
        localStorage.removeItem('iso_session_id');
        setCurrentUser(null);
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifyInitialSession();
  }, []);

  // Inactivity & Activity Tracking Listeners (2 hours inactivity logout)
  useEffect(() => {
    if (!currentUser) return;

    const recordUserActivity = () => {
      lastActivityRef.current = Date.now();
      hasRecentActivityRef.current = true;
    };

    // User activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, recordUserActivity, { passive: true }));

    // Periodic client-side inactivity check (every 30 seconds)
    const inactivityTimer = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        console.warn('Inactivity threshold exceeded (2 hours). Logging out...');
        handleLogout('inactivity');
      }
    }, 30000);

    // Periodic backend heartbeat / touch (every 2 minutes when recently active)
    const heartbeatTimer = setInterval(async () => {
      if (hasRecentActivityRef.current && currentUser?.sessionId) {
        try {
          const res = await fetch(apiUrl('/api/auth/heartbeat'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': currentUser.sessionId
            },
            body: JSON.stringify({ sessionId: currentUser.sessionId })
          });
          const data = await res.json();
          if (!res.ok || !data.active) {
            handleLogout('inactivity');
          } else {
            hasRecentActivityRef.current = false;
          }
        } catch (e) {
          // Ignore transient heartbeat failures
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, recordUserActivity));
      clearInterval(inactivityTimer);
      clearInterval(heartbeatTimer);
    };
  }, [currentUser]);

  // Load Tenants on mount when authenticated
  useEffect(() => {
    if (currentUser) {
      fetchTenants(currentUser.tenantId);
    }
  }, [currentUser]);

  // Fetch Bots when selectedTenant changes
  useEffect(() => {
    if (selectedTenant) {
      const tId = selectedTenant._id || selectedTenant.tenantId || selectedTenant.code;
      fetchBots(tId);
    } else {
      setBots([]);
      setSelectedBot(null);
    }
  }, [selectedTenant]);

  // Filter routes based on user permissions (Global Admin gets full access)
  const isGlobalAdmin = currentUser?.role === 'global_admin' || currentUser?.role === 'super_admin' || currentUser?.isGlobalAdmin;
  const allowed = currentUser?.allowedMenus || [];

  const isPathAllowed = (path) => {
    const allRoutes = [...adminRoutes, ...clientRoutes];
    const routeObj = allRoutes.find(r => r.path === path);
    if (routeObj?.superAdminOnly && !isGlobalAdmin) return false;
    if (isGlobalAdmin) return true;
    if (allowed.includes(path)) return true;
    if (path === 'conversations' && (allowed.includes('conversations') || allowed.includes('conversationHistory') || isGlobalAdmin)) return true;
    if (path === 'chat' && (allowed.includes('playground') || allowed.includes('chat'))) return true;
    if (path === 'playground' && (allowed.includes('chat') || allowed.includes('playground'))) return true;
    return false;
  };

  const filteredAdminRoutes = adminRoutes.filter(r => isPathAllowed(r.path));
  const filteredClientRoutes = clientRoutes.filter(r => isPathAllowed(r.path));
  const portalRoutes = selectedPortal === 'admin' ? filteredAdminRoutes : filteredClientRoutes;

  // Align active route path on user login or route mismatch
  useEffect(() => {
    if (currentUser) {
      if (!isPathAllowed(activeRoutePath)) {
        const routes = selectedPortal === 'admin' ? filteredAdminRoutes : filteredClientRoutes;
        if (routes.length > 0) {
          setActiveRoutePath(routes[0].path);
        } else if (filteredAdminRoutes.length > 0) {
          setSelectedPortal('admin');
          setActiveRoutePath(filteredAdminRoutes[0].path);
        }
      }
    }
  }, [currentUser, activeRoutePath, selectedPortal]);

  // Safe portal switcher that falls back to first allowed route inside selected portal
  const handlePortalSwitch = (portal) => {
    setSelectedPortal(portal);
    const routes = portal === 'admin' ? filteredAdminRoutes : filteredClientRoutes;
    if (routes.length > 0) {
      setActiveRoutePath(routes[0].path);
    } else {
      setActiveRoutePath('');
    }
  };

  // Safety check: clear invalid session if user permissions array is missing
  useEffect(() => {
    if (currentUser && (!currentUser.allowedMenus || !Array.isArray(currentUser.allowedMenus))) {
      handleLogout('manual');
    }
  }, [currentUser]);

  // API Call: Fetch all tenants
  const fetchTenants = async (selectId = null) => {
    try {
      const res = await fetch(apiUrl('/api/admin/tenants'));
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length > 0) {
        const targetId = selectId || currentUser?.tenantId;
        if (targetId) {
          const t = list.find(item => item._id === targetId || item.tenantId === targetId || item.code === targetId);
          setSelectedTenant(t || list[0]);
        } else if (!selectedTenant) {
          setSelectedTenant(list[0]);
        }
      } else {
        setSelectedTenant(null);
      }
    } catch (err) {
      showToast('Error loading organizations. Please check your connection.', 'error');
    }
  };

  // API Call: Fetch bots for active tenant
  const fetchBots = async (tenantId, selectId = null) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/bots?tenantId=${tenantId}`));
      const data = await res.json();
      setBots(data);
      if (data.length > 0) {
        if (selectId) {
          const b = data.find(item => item._id === selectId);
          setSelectedBot(b || data[0]);
        } else if (selectedTenant?._id === tenantId && !selectedBot) {
          setSelectedBot(data[0]);
        }
      } else {
        setSelectedBot(null);
      }
    } catch (err) {
      showToast('Failed to fetch chatbot configurations.', 'error');
    }
  };

  // Splash Loading Screen during initial session verification
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-iso-bg flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl font-bold tracking-tight font-serif text-iso-primary">isomorphic</span>
          <div className="flex items-center gap-2 text-xs text-iso-textMuted font-mono">
            <span className="w-3.5 h-3.5 border-2 border-iso-primary border-t-transparent rounded-full animate-spin"></span>
            Verifying secure session...
          </div>
        </div>
      </div>
    );
  }

  // Renders login screen if user is not authenticated
  if (!currentUser) {
    return (
      <>
        <Toast toast={toast} />
        <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      </>
    );
  }

  // Locate the active route configuration
  const activeRoute = portalRoutes.find(r => r.path === activeRoutePath);

  return (
    <div className="h-screen w-screen bg-iso-bg text-iso-text font-sans flex overflow-hidden">
      
      {/* Toast Alert */}
      <Toast toast={toast} />

      {/* Dynamic Sidebar */}
      <Sidebar
        selectedPortal={selectedPortal}
        setSelectedPortal={handlePortalSwitch}
        activeRoutePath={activeRoutePath}
        setActiveRoutePath={setActiveRoutePath}
        portalRoutes={portalRoutes}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        showToast={showToast}
        onLogout={() => handleLogout('manual')}
      />

      {/* Content Viewport */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header 
          selectedTenant={selectedTenant} 
          selectedBot={selectedBot} 
          selectedPortal={selectedPortal}
          activeRoute={activeRoute}
          currentUser={currentUser}
          onLogout={() => handleLogout('manual')}
        />
        
        <div className="flex-1 p-6 md:p-8 min-h-0 flex flex-col overflow-y-auto">
          {activeRoute ? (
            React.createElement(activeRoute.component, {
              currentUser,
              selectedTenant,
              setSelectedTenant,
              selectedBot,
              setSelectedBot,
              tenants,
              bots,
              fetchTenants,
              fetchBots,
              showToast,
              setCurrentMenu: setActiveRoutePath
            })
          ) : (
            <div className="text-center py-12 border border-dashed border-iso-border bg-iso-cardBg flex flex-col items-center justify-center gap-4">
              <p className="text-xs text-iso-textMuted font-mono">
                No menus assigned for your active role dashboard. Contact database administrator to assign menus.
              </p>
              
              {/* Diagnostic Panel */}
              <div className="p-4 bg-iso-bgSecondary border border-iso-border rounded-sm text-left max-w-md w-full text-[10px] font-mono flex flex-col gap-1.5">
                <span className="font-bold text-iso-primary border-b border-iso-border pb-1 block">DIAGNOSTIC TELEMETRY:</span>
                <div><strong>Selected Portal:</strong> {selectedPortal}</div>
                <div><strong>Active Route Path:</strong> {activeRoutePath}</div>
                <div><strong>Session ID:</strong> {currentUser?.sessionId || 'None'}</div>
                <div><strong>Logged In User:</strong> {currentUser ? currentUser.username : 'null'}</div>
                <div><strong>Role Group:</strong> {currentUser ? currentUser.role : 'null'}</div>
                <div><strong>Allowed Menus (API):</strong> {currentUser?.allowedMenus ? JSON.stringify(currentUser.allowedMenus) : 'null'}</div>
                <div><strong>Portal Routes (Loaded):</strong> {JSON.stringify(portalRoutes.map(r => r.path))}</div>
              </div>

              <button
                onClick={() => handleLogout('manual')}
                className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary transition-all shadow-sm cursor-pointer"
              >
                Clear Cache & Log Out
              </button>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

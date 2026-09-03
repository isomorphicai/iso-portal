import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import Login from './components/Login';

// Import Modular Portal routes configurations
import { adminRoutes } from './routes/admin/routes';
import { clientRoutes } from './routes/client/routes';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('iso_user');
        return saved ? JSON.parse(saved) : null;
      } catch (err) {
        console.error('Invalid user session cache:', err);
        localStorage.removeItem('iso_user');
        return null;
      }
    }
    return null;
  });

  // Global States
  const [selectedPortal, setSelectedPortal] = useState('admin'); // admin | client
  const [activeRoutePath, setActiveRoutePath] = useState('tenants'); // tenants, overview, analytics, ingestion, chat
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [toast, setToast] = useState(null);

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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('iso_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('iso_user');
    setSelectedTenant(null);
    setSelectedBot(null);
    setBots([]);
  };

  // Safety check: clear localStorage if user cache is stale or missing permissions array
  useEffect(() => {
    if (currentUser && (!currentUser.allowedMenus || !Array.isArray(currentUser.allowedMenus))) {
      handleLogout();
    }
  }, [currentUser]);

  // API Call: Fetch all tenants
  const fetchTenants = async (selectId = null) => {
    try {
      const res = await fetch('/api/admin/tenants');
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
      const res = await fetch(`/api/admin/bots?tenantId=${tenantId}`);
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
    <div className="min-h-screen bg-iso-bg text-iso-text font-sans flex overflow-hidden">
      
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
        onLogout={handleLogout}
      />

      {/* Content Viewport */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        <Header 
          selectedTenant={selectedTenant} 
          selectedBot={selectedBot} 
          selectedPortal={selectedPortal}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        <div className="flex-1 p-8">
          {activeRoute ? (
            React.createElement(activeRoute.component, {
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
                <div><strong>Logged In User:</strong> {currentUser ? currentUser.username : 'null'}</div>
                <div><strong>Role Group:</strong> {currentUser ? currentUser.role : 'null'}</div>
                <div><strong>Allowed Menus (API):</strong> {currentUser?.allowedMenus ? JSON.stringify(currentUser.allowedMenus) : 'null'}</div>
                <div><strong>Portal Routes (Loaded):</strong> {JSON.stringify(portalRoutes.map(r => r.path))}</div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary transition-all shadow-sm"
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

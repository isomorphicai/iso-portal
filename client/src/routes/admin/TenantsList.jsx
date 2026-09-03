import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Bot as BotIcon, Shield, Users, 
  Plus, Trash2, Edit3, ArrowLeft,
  Sparkles, Loader2, Database, Menu as MenuIcon,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Palette, Globe, Clock, X
} from "lucide-react";

import TenantModal from "./components/TenantModal";
import ChatClientModal from "./components/ChatClientModal";
import GenAISettingsModal from "./components/GenAISettingsModal";
import GlobalRolesTab from "./components/GlobalRolesTab";
import NavigationMenusTab from "./components/NavigationMenusTab";
import TenantUsersModal from "./components/TenantUsersModal";
import ConfirmModal from "../../components/ConfirmModal";

export default function TenantsList({
  tenants,
  selectedTenant,
  setSelectedTenant,
  selectedBot,
  setSelectedBot,
  fetchTenants,
  showToast,
  setCurrentMenu
}) {
  // Top-level Admin Tabs: "tenants" | "roles" | "menus"
  const [adminTab, setAdminTab] = useState("tenants");

  // Subview within "tenants" tab: "list" | "bots"
  const [subView, setSubView] = useState("list");
  const [activeTenant, setActiveTenant] = useState(null);

  // Search & Sorting for Tenants Table
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantSortField, setTenantSortField] = useState("name");
  const [tenantSortAsc, setTenantSortAsc] = useState(true);

  // Search & Sorting for Chatbots Table
  const [botSearch, setBotSearch] = useState("");
  const [botSortField, setBotSortField] = useState("botName");
  const [botSortAsc, setBotSortAsc] = useState(true);

  // Chatbots List for active tenant
  const [tenantBots, setTenantBots] = useState([]);
  const [isBotsLoading, setIsBotsLoading] = useState(false);
  const [togglingBotId, setTogglingBotId] = useState(null);

  // Modal States
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  const [showBotModal, setShowBotModal] = useState(false);
  const [editingBot, setEditingBot] = useState(null);

  const [showGenAIModal, setShowGenAIModal] = useState(false);
  const [genAIBot, setGenAIBot] = useState(null);

  const [showTenantUsersModal, setShowTenantUsersModal] = useState(false);
  const [tenantForUsers, setTenantForUsers] = useState(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "Confirm Deletion",
    message: "",
    confirmText: "Delete",
    onConfirm: null,
    isLoading: false
  });

  // Fetch Bots when opening bots subview
  useEffect(() => {
    if (activeTenant && subView === "bots") {
      fetchTenantBots();
    }
  }, [activeTenant, subView]);

  const fetchTenantBots = async () => {
    setIsBotsLoading(true);
    try {
      const targetId = activeTenant._id || activeTenant.tenantId || activeTenant.code;
      const targetDb = activeTenant.tenantDbName || (activeTenant.tenantId ? `iso_${activeTenant.tenantId}` : "");
      const res = await fetch(`/api/admin/bots?tenantId=${encodeURIComponent(targetId)}&tenantDbName=${encodeURIComponent(targetDb)}`);
      const data = await res.json();
      setTenantBots(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast("Error loading chatbots.", "error");
    } finally {
      setIsBotsLoading(false);
    }
  };

  // Tenants Sort & Filter
  const handleTenantSort = (field) => {
    if (tenantSortField === field) {
      setTenantSortAsc(!tenantSortAsc);
    } else {
      setTenantSortField(field);
      setTenantSortAsc(true);
    }
  };

  const filteredAndSortedTenants = useMemo(() => {
    let result = [...tenants];

    if (tenantSearch.trim()) {
      const q = tenantSearch.toLowerCase();
      result = result.filter(t => 
        (t.name || t.tenantName || "").toLowerCase().includes(q) ||
        (t.code || t.tenantId || "").toLowerCase().includes(q) ||
        (t.tenantDbName || "").toLowerCase().includes(q) ||
        (t.tenantConfig?.instituteName || "").toLowerCase().includes(q) ||
        (t.tenantConfig?.timeZone || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[tenantSortField];
      let valB = b[tenantSortField];

      if (tenantSortField === "name") {
        valA = (a.name || a.tenantName || "").toLowerCase();
        valB = (b.name || b.tenantName || "").toLowerCase();
      } else if (tenantSortField === "code") {
        valA = (a.code || a.tenantId || "").toLowerCase();
        valB = (b.code || b.tenantId || "").toLowerCase();
      } else if (tenantSortField === "instituteName") {
        valA = (a.tenantConfig?.instituteName || "").toLowerCase();
        valB = (b.tenantConfig?.instituteName || "").toLowerCase();
      } else if (tenantSortField === "timeZone") {
        valA = (a.tenantConfig?.timeZone || "").toLowerCase();
        valB = (b.tenantConfig?.timeZone || "").toLowerCase();
      } else if (tenantSortField === "botsCount") {
        valA = (a.Bots || []).length;
        valB = (b.Bots || []).length;
        return tenantSortAsc ? valA - valB : valB - valA;
      } else if (tenantSortField === "createdAt") {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tenantSortAsc ? valA - valB : valB - valA;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return tenantSortAsc ? -1 : 1;
      if (valA > valB) return tenantSortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [tenants, tenantSearch, tenantSortField, tenantSortAsc]);

  // Bots Sort & Filter
  const handleBotSort = (field) => {
    if (botSortField === field) {
      setBotSortAsc(!botSortAsc);
    } else {
      setBotSortField(field);
      setBotSortAsc(true);
    }
  };

  const filteredAndSortedBots = useMemo(() => {
    let result = [...tenantBots];

    if (botSearch.trim()) {
      const q = botSearch.toLowerCase();
      result = result.filter(b => 
        (b.botName || b.name || "").toLowerCase().includes(q) ||
        (b.botId || b.code || "").toLowerCase().includes(q) ||
        (b.botUIConfigs?.botHeaderText || "").toLowerCase().includes(q) ||
        (b.status || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[botSortField];
      let valB = b[botSortField];

      if (botSortField === "botName") {
        valA = (a.botName || a.name || "").toLowerCase();
        valB = (b.botName || b.name || "").toLowerCase();
      } else if (botSortField === "botId") {
        valA = (a.botId || a.code || "").toLowerCase();
        valB = (b.botId || b.code || "").toLowerCase();
      } else if (botSortField === "botHeaderText") {
        valA = (a.botUIConfigs?.botHeaderText || "").toLowerCase();
        valB = (b.botUIConfigs?.botHeaderText || "").toLowerCase();
      } else if (botSortField === "formsCount") {
        valA = (a.customForms || []).length;
        valB = (b.customForms || []).length;
        return botSortAsc ? valA - valB : valB - valA;
      } else if (botSortField === "botActive") {
        valA = a.status === "active" || a.botActive !== false ? 1 : 0;
        valB = b.status === "active" || b.botActive !== false ? 1 : 0;
        return botSortAsc ? valA - valB : valB - valA;
      } else if (botSortField === "createdAt") {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : (a.updatedSince ? new Date(a.updatedSince).getTime() : 0);
        valB = b.createdAt ? new Date(b.createdAt).getTime() : (b.updatedSince ? new Date(b.updatedSince).getTime() : 0);
        return botSortAsc ? valA - valB : valB - valA;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return botSortAsc ? -1 : 1;
      if (valA > valB) return botSortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [tenantBots, botSearch, botSortField, botSortAsc]);

  const renderSortIcon = (activeField, field, asc) => {
    if (activeField !== field) return <ArrowUpDown size={11} className="text-iso-textMuted/40" />;
    return asc ? <ArrowUp size={11} className="text-iso-primary" /> : <ArrowDown size={11} className="text-iso-primary" />;
  };

  // Tenant Handlers
  const handleOpenCreateTenant = () => {
    setEditingTenant(null);
    setShowTenantModal(true);
  };

  const handleOpenEditTenant = (t) => {
    setEditingTenant(t);
    setShowTenantModal(true);
  };

  const handleOpenTenantUsers = (t) => {
    setTenantForUsers(t);
    setShowTenantUsersModal(true);
  };

  const handleDeleteTenantClick = (t) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Tenant: ${t.name || t.tenantName}`,
      message: `Warning: Permanently deleting the organization "${t.name || t.tenantName}" will remove all associated workspace settings and configurations. Are you sure you want to proceed?`,
      confirmText: "Delete Tenant",
      isLoading: false,
      onConfirm: () => performDeleteTenant(t._id)
    });
  };

  const performDeleteTenant = async (tenantId) => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Tenant organization deleted successfully.");
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        fetchTenants();
      } else {
        showToast("Failed to delete tenant organization.", "error");
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast("Network error deleting organization.", "error");
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Bot Handlers
  const handleOpenCreateBot = () => {
    setEditingBot(null);
    setShowBotModal(true);
  };

  const handleOpenEditBot = (bot) => {
    setEditingBot(bot);
    setShowBotModal(true);
  };

  const handleOpenGenAISettings = (bot) => {
    setGenAIBot(bot);
    setShowGenAIModal(true);
  };

  const handleToggleBotStatus = async (bot) => {
    const nextActive = bot.status !== "active" && bot.botActive === false;
    const targetId = activeTenant?._id || bot.tenantId;
    const targetDb = activeTenant?.tenantDbName || bot.tenantDbName || "";
    setTogglingBotId(bot._id);
    try {
      const res = await fetch(`/api/admin/bots/${bot._id}?tenantId=${encodeURIComponent(targetId)}&tenantDbName=${encodeURIComponent(targetDb)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextActive ? "active" : "inactive",
          botActive: nextActive
        })
      });
      if (res.ok) {
        showToast(`Chatbot "${bot.name || bot.botName}" is now ${nextActive ? "Active" : "Inactive"}.`);
        fetchTenantBots();
      }
    } catch (err) {
      showToast("Failed to update bot status.", "error");
    } finally {
      setTogglingBotId(null);
    }
  };

  const handleDeleteBotClick = (bot) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Chatbot: ${bot.botName || bot.name || bot.botId}`,
      message: `Warning: Are you sure you want to permanently delete the chatbot "${bot.botName || bot.name || bot.botId}"? This action cannot be undone.`,
      confirmText: "Delete Chatbot",
      isLoading: false,
      onConfirm: () => performDeleteBot(bot._id)
    });
  };

  const performDeleteBot = async (botId) => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    const targetId = activeTenant?._id;
    const targetDb = activeTenant?.tenantDbName || "";
    try {
      const res = await fetch(`/api/admin/bots/${botId}?tenantId=${encodeURIComponent(targetId)}&tenantDbName=${encodeURIComponent(targetDb)}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Chatbot deleted successfully.");
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        fetchTenantBots();
        fetchTenants();
      } else {
        showToast("Failed to delete chatbot.", "error");
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast("Network error deleting chatbot.", "error");
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-iso-border pb-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setAdminTab("tenants");
              setSubView("list");
            }}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              adminTab === "tenants"
                ? "border-iso-primary text-iso-primary"
                : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Building2 size={16} /> Tenants &amp; Workspaces
          </button>
          <button
            type="button"
            onClick={() => setAdminTab("roles")}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              adminTab === "roles"
                ? "border-iso-primary text-iso-primary"
                : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Shield size={16} /> Global Roles
          </button>
          <button
            type="button"
            onClick={() => setAdminTab("menus")}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              adminTab === "menus"
                ? "border-iso-primary text-iso-primary"
                : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <MenuIcon size={16} /> Navigation Menus
          </button>
        </div>
      </div>

      {/* TAB 1: TENANTS & WORKSPACES */}
      {adminTab === "tenants" && subView === "list" && (
        <div className="flex flex-col gap-5">
          
          <div className="border-b border-iso-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif tracking-tight text-iso-primary mb-1">Tenants &amp; Workspaces</h1>
              <p className="text-xs text-iso-textMuted">Onboard corporate environments, manage chatbot instances, and configure tenant organization profiles.</p>
            </div>
            <button
              onClick={handleOpenCreateTenant}
              className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white text-xs font-bold rounded-sm border border-iso-primary flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <Plus size={14} /> Onboard Tenant
            </button>
          </div>

          {/* Search & Statistics Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Search tenants by name, slug, workspace, brand, or timezone..."
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-7 py-1.5 text-xs text-iso-text outline-none"
              />
              {tenantSearch && (
                <button
                  type="button"
                  onClick={() => setTenantSearch("")}
                  className="absolute right-2 top-2 text-iso-textMuted hover:text-iso-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-iso-textMuted">
                Showing <strong className="text-iso-primary">{filteredAndSortedTenants.length}</strong> of {tenants.length} tenants
              </span>
            </div>
          </div>

          {/* Rich Tenants Table */}
          <div className="bg-iso-cardBg border border-iso-border rounded-sm shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1 bg-iso-bgSecondary/20">
                  
                  <th 
                    onClick={() => handleTenantSort("name")}
                    className="py-2.5 px-3 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tenant Organization</span>
                      {renderSortIcon(tenantSortField, "name", tenantSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleTenantSort("code")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Slug</span>
                      {renderSortIcon(tenantSortField, "code", tenantSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleTenantSort("tenantDbName")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Workspace DB</span>
                      {renderSortIcon(tenantSortField, "tenantDbName", tenantSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleTenantSort("instituteName")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Brand / Institute</span>
                      {renderSortIcon(tenantSortField, "instituteName", tenantSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleTenantSort("timeZone")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Timezone</span>
                      {renderSortIcon(tenantSortField, "timeZone", tenantSortAsc)}
                    </div>
                  </th>

                  <th className="py-2.5 text-center">Theme</th>

                  <th 
                    onClick={() => handleTenantSort("botsCount")}
                    className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Bots</span>
                      {renderSortIcon(tenantSortField, "botsCount", tenantSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleTenantSort("createdAt")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created</span>
                      {renderSortIcon(tenantSortField, "createdAt", tenantSortAsc)}
                    </div>
                  </th>

                  <th className="py-2.5 text-right px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTenants.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-10 text-center text-iso-textMuted italic bg-iso-bgSecondary/10">
                      {tenantSearch ? "No tenants match your search query." : "No tenants found."}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedTenants.map(t => {
                    const themeColor = t.tenantConfig?.ButtonandLeftBarColor || "#00306D";
                    return (
                      <tr key={t._id} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20 transition-colors">
                        
                        <td className="py-3 px-3 font-bold text-iso-primary flex items-center gap-2">
                          <Building2 size={14} className="text-iso-accent shrink-0" />
                          <div>
                            <span>{t.name || t.tenantName}</span>
                            <span className={`ml-2 px-1.5 py-0.2 text-[8px] font-mono rounded border ${
                              t.tenantActive !== false 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                                : "bg-slate-100 text-slate-500 border-slate-300"
                            }`}>
                              {t.tenantActive !== false ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 font-mono text-iso-textMuted text-xs">{t.code || t.tenantId}</td>
                        <td className="py-3 font-mono text-xs text-iso-accent font-semibold">{t.tenantDbName || `iso_${t.code || t.tenantId}`}</td>
                        <td className="py-3 text-iso-text text-xs max-w-[140px] truncate">{t.tenantConfig?.instituteName || "-"}</td>

                        <td className="py-3 font-mono text-[11px] text-iso-textMuted flex items-center gap-1">
                          <Globe size={11} className="text-iso-textMuted/60" />
                          <span>{t.tenantConfig?.timeZone || "UTC"}</span>
                        </td>

                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full border border-iso-border shadow-2xs inline-block" style={{ backgroundColor: themeColor }} />
                            <span className="font-mono text-[9px] text-iso-textMuted">{themeColor}</span>
                          </div>
                        </td>

                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-iso-bgSecondary border border-iso-border text-iso-primary">
                            {Array.isArray(t.Bots) ? t.Bots.length : 0}
                          </span>
                        </td>

                        <td className="py-3 font-mono text-iso-textMuted text-[11px]">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "-"}
                        </td>

                        <td className="py-3 text-right px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setActiveTenant(t);
                                setSubView("bots");
                              }}
                              className="px-2.5 py-1 bg-iso-primary hover:bg-iso-primaryLight text-white font-semibold text-[10px] rounded-sm transition-all shadow-sm shrink-0"
                              title="Open Chatbots under this Tenant"
                            >
                              Open Bots
                            </button>
                            <button
                              onClick={() => handleOpenTenantUsers(t)}
                              className="px-2.5 py-1 bg-iso-bgSecondary hover:bg-iso-accent/15 border border-iso-border hover:border-iso-accent text-iso-primary font-semibold text-[10px] rounded-sm transition-all flex items-center gap-1 shrink-0"
                              title="Manage Users in tenant database"
                            >
                              <Users size={11} />
                              <span>Users</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditTenant(t)}
                              className="p-1.5 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary border border-transparent transition-colors"
                              title="Edit Organization Profile & Brand Settings"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteTenantClick(t)}
                              className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg border border-transparent transition-colors"
                              title="Delete Organization Profile"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW: CHATBOTS MANAGEMENT UNDER ACTIVE TENANT */}
      {adminTab === "tenants" && subView === "bots" && activeTenant && (
        <div className="flex flex-col gap-5">
          
          <div className="border-b border-iso-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSubView("list")} 
                className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary border border-iso-border rounded-sm transition-all"
                title="Back to Tenants List"
              >
                <ArrowLeft size={14} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-iso-textMuted font-mono uppercase tracking-wider">
                  <span>Tenants</span>
                  <span>/</span>
                  <span className="font-bold text-iso-primary">{activeTenant.name || activeTenant.tenantName}</span>
                </div>
                <h1 className="text-2xl font-serif text-iso-primary font-bold">Chatbots &amp; AI Assistants</h1>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleOpenCreateBot}
              className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white text-xs font-bold rounded-sm border border-iso-primary flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <Plus size={14} /> Create Chatbot
            </button>
          </div>

          {/* Search & Statistics Bar for Bots */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              <input
                type="text"
                value={botSearch}
                onChange={(e) => setBotSearch(e.target.value)}
                placeholder="Search chatbots by name, identifier, header text, or status..."
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-7 py-1.5 text-xs text-iso-text outline-none"
              />
              {botSearch && (
                <button
                  type="button"
                  onClick={() => setBotSearch("")}
                  className="absolute right-2 top-2 text-iso-textMuted hover:text-iso-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-iso-textMuted">
                Showing <strong className="text-iso-primary">{filteredAndSortedBots.length}</strong> of {tenantBots.length} chatbots
              </span>
            </div>
          </div>

          {/* Rich Chatbots Table */}
          <div className="bg-iso-cardBg border border-iso-border rounded-sm shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1 bg-iso-bgSecondary/20">
                  
                  <th 
                    onClick={() => handleBotSort("botName")}
                    className="py-2.5 px-3 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Bot Name</span>
                      {renderSortIcon(botSortField, "botName", botSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleBotSort("botId")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Identifier (Slug)</span>
                      {renderSortIcon(botSortField, "botId", botSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleBotSort("botHeaderText")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Header Title</span>
                      {renderSortIcon(botSortField, "botHeaderText", botSortAsc)}
                    </div>
                  </th>

                  <th className="py-2.5 text-center">Theme</th>

                  <th 
                    onClick={() => handleBotSort("formsCount")}
                    className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Forms</span>
                      {renderSortIcon(botSortField, "formsCount", botSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleBotSort("createdAt")}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created / Updated</span>
                      {renderSortIcon(botSortField, "createdAt", botSortAsc)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleBotSort("botActive")}
                    className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Status</span>
                      {renderSortIcon(botSortField, "botActive", botSortAsc)}
                    </div>
                  </th>

                  <th className="py-2.5 text-right px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isBotsLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-iso-textMuted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin text-iso-accent" />
                        <span className="font-mono text-xs">Loading chatbots...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedBots.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-iso-textMuted italic bg-iso-bgSecondary/10">
                      {botSearch ? "No chatbots match your search query." : "No chatbots configured for this tenant. Click 'Create Chatbot' to add one."}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedBots.map(b => {
                    const botTheme = b.botUIConfigs?.botThemeColor || "#00306D";
                    const formsCount = (b.customForms || []).length;
                    return (
                      <tr key={b._id} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20 transition-colors">
                        
                        <td className="py-3 px-3 font-bold text-iso-primary flex items-center gap-2.5">
                          <div 
                            className="w-7 h-7 rounded-sm flex items-center justify-center text-white text-[10px] font-bold shadow-xs shrink-0"
                            style={{ backgroundColor: botTheme }}
                          >
                            <BotIcon size={14} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-iso-primary">{b.botName || b.name}</span>
                          </div>
                        </td>

                        <td className="py-3 font-mono text-xs text-iso-accent font-semibold">{b.botId || b.code}</td>
                        <td className="py-3 text-iso-text text-xs max-w-[150px] truncate">{b.botUIConfigs?.botHeaderText || "-"}</td>

                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full border border-iso-border shadow-2xs inline-block" style={{ backgroundColor: botTheme }} />
                            <span className="font-mono text-[9px] text-iso-textMuted">{botTheme}</span>
                          </div>
                        </td>

                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-iso-bgSecondary border border-iso-border text-iso-primary">
                            {formsCount} {formsCount === 1 ? "form" : "forms"}
                          </span>
                        </td>

                        <td className="py-3 font-mono text-iso-textMuted text-[11px]">
                          {b.createdAt 
                            ? new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                            : (b.updatedSince ? new Date(b.updatedSince).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Recently")}
                        </td>

                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleBotStatus(b)}
                            disabled={togglingBotId === b._id}
                            title="Click to toggle Active / Inactive status"
                            className={`px-2.5 py-1 rounded-sm text-[9px] font-mono font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              b.status === "active" || b.botActive !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" 
                                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                            }`}
                          >
                            {togglingBotId === b._id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${b.status === "active" || b.botActive !== false ? "bg-emerald-500" : "bg-slate-400"}`} />
                            )}
                            <span>{b.status === "active" || b.botActive !== false ? "ACTIVE" : "INACTIVE"}</span>
                          </button>
                        </td>

                        <td className="py-3 text-right px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenGenAISettings(b)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:border-purple-300 font-bold text-[10px] rounded-sm transition-all shadow-xs flex items-center gap-1"
                              title="Configure Gen AI LLM & RAG settings for this bot"
                            >
                              <Sparkles size={12} className="text-purple-600" />
                              <span>Gen AI Settings</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditBot(b)}
                              className="px-2.5 py-1 bg-iso-primary hover:bg-iso-primaryLight text-white font-semibold text-[10px] rounded-sm transition-all shadow-xs flex items-center gap-1"
                              title="Edit Chatbot UI & Configuration"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBotClick(b)}
                              className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg border border-transparent transition-colors"
                              title="Delete Chatbot"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL ROLES */}
      {adminTab === "roles" && (
        <GlobalRolesTab showToast={showToast} />
      )}

      {/* TAB 3: NAVIGATION MENUS */}
      {adminTab === "menus" && (
        <NavigationMenusTab showToast={showToast} />
      )}

      {/* MODALS */}
      <TenantModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        tenantData={editingTenant}
        onSaved={fetchTenants}
        showToast={showToast}
      />

      <ChatClientModal
        isOpen={showBotModal}
        onClose={() => setShowBotModal(false)}
        activeTenant={activeTenant}
        editingBot={editingBot}
        onSaved={() => {
          fetchTenantBots();
          fetchTenants();
        }}
        showToast={showToast}
      />

      <GenAISettingsModal
        isOpen={showGenAIModal}
        onClose={() => setShowGenAIModal(false)}
        activeTenant={activeTenant}
        selectedBot={genAIBot}
        showToast={showToast}
      />

      <TenantUsersModal
        isOpen={showTenantUsersModal}
        onClose={() => setShowTenantUsersModal(false)}
        activeTenant={tenantForUsers}
        showToast={showToast}
      />

      {/* CONFIRMATION POPUP MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isLoading={confirmModal.isLoading}
      />

    </div>
  );
}

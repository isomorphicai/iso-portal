import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, Plus, Trash2, Edit3, Check, X, Loader2, Save,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Sliders, LayoutGrid, Menu
} from "lucide-react";
import ConfirmModal from "../../../components/ConfirmModal";
import TablePagination from "../../../components/TablePagination";
import { apiUrl } from "../../../config/api";

const ALL_AVAILABLE_WIDGETS = [
  { id: 'total_questions', title: 'Total Questions', category: 'KPI Card', description: 'Total volume of user queries processed' },
  { id: 'total_sessions', title: 'Total Sessions', category: 'KPI Card', description: 'Unique conversation sessions initiated' },
  { id: 'avg_questions_day', title: 'Avg. Questions / Day', category: 'KPI Card', description: 'Daily question processing rate' },
  { id: 'avg_questions_session', title: 'Avg. Questions / Session', category: 'KPI Card', description: 'Average turns per conversation' },
  { id: 'avg_session_length', title: 'Avg. Session Length', category: 'KPI Card', description: 'Mean duration of chat sessions' },
  { id: 'csat_score', title: 'CSAT (Satisfaction)', category: 'KPI Card', description: 'Customer satisfaction score (4-5 stars)' },
  { id: 'thumbs_up_score', title: 'Thumbs Up Ratio', category: 'KPI Card', description: 'Positive feedback ratio from ratings' },
  { id: 'avg_latency', title: 'Avg. Response Latency', category: 'KPI Card', description: 'Model retrieval and response latency in ms' },
  { id: 'token_usage', title: 'Token Consumption', category: 'KPI Card', description: 'LLM prompt and completion tokens' },
  { id: 'daily_trend_chart', title: 'Daily Trend Graph', category: 'Graph / Chart', description: 'Interactive area/line trend chart' },
  { id: 'top_intents_chart', title: 'Top Intents Breakdown', category: 'Graph / Chart', description: 'Ranked query intent distribution bars' },
  { id: 'sentiment_donut_chart', title: 'Sentiment Donut Chart', category: 'Graph / Chart', description: 'Circular sentiment and rating breakdown' },
  { id: 'hourly_heatmap_chart', title: '24-Hour Peak Activity', category: 'Graph / Chart', description: 'Hourly inquiry load histogram' },
  { id: 'csat_breakdown_chart', title: 'Star Rating Distribution', category: 'Graph / Chart', description: '1-star to 5-star breakdown' },
  { id: 'top_queries_table', title: 'Top Inquiries Table', category: 'Data Table', description: 'Searchable top asked questions table' },
  { id: 'recent_sessions_table', title: 'Recent Sessions Table', category: 'Data Table', description: 'Live session durations and status log' }
];

export default function GlobalRolesTab({ showToast }) {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("roleName");
  const [sortAsc, setSortAsc] = useState(true);
  const [rolesPage, setRolesPage] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("menus"); // "menus" | "widgets"
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    roleId: "",
    roleName: "",
    description: "",
    allowedMenus: [],
    allowedWidgets: ALL_AVAILABLE_WIDGETS.map(w => w.id),
    isSystemRole: false
  });
  const [saving, setSaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isLoading: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, menusRes] = await Promise.all([
        fetch(apiUrl("/api/admin/roles")),
        fetch(apiUrl("/api/admin/menus"))
      ]);
      const rolesData = await rolesRes.json();
      const menusData = await menusRes.json();
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setMenus(Array.isArray(menusData) ? menusData : []);
    } catch (err) {
      showToast("Error loading roles and menus.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedRoles = useMemo(() => {
    let result = [...roles];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.roleName || "").toLowerCase().includes(q) ||
        (r.roleId || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.allowedMenus || []).some(m => m.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (sortField === "allowedMenus") {
        valA = (a.allowedMenus || []).length;
        valB = (b.allowedMenus || []).length;
        return sortAsc ? valA - valB : valB - valA;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [roles, searchQuery, sortField, sortAsc]);

  // Reset page on search or sort change
  useEffect(() => {
    setRolesPage(1);
  }, [searchQuery, sortField, sortAsc]);

  const paginatedRoles = useMemo(() => {
    const start = (rolesPage - 1) * 10;
    return filteredAndSortedRoles.slice(start, start + 10);
  }, [filteredAndSortedRoles, rolesPage]);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setModalTab("menus");
    setFormData({
      roleId: "",
      roleName: "",
      description: "",
      allowedMenus: menus.map(m => m.menuId),
      allowedWidgets: ALL_AVAILABLE_WIDGETS.map(w => w.id),
      isSystemRole: false
    });
    setShowModal(true);
  };

  const handleOpenEdit = (r) => {
    setEditingRole(r);
    setModalTab("menus");
    setFormData({
      roleId: r.roleId,
      roleName: r.roleName,
      description: r.description || "",
      allowedMenus: Array.isArray(r.allowedMenus) ? [...r.allowedMenus] : [],
      allowedWidgets: Array.isArray(r.allowedWidgets) && r.allowedWidgets.length > 0 
        ? [...r.allowedWidgets] 
        : ALL_AVAILABLE_WIDGETS.map(w => w.id),
      isSystemRole: Boolean(r.isSystemRole)
    });
    setShowModal(true);
  };

  const handleToggleMenuInModal = (menuId) => {
    setFormData(prev => {
      const current = prev.allowedMenus || [];
      const updated = current.includes(menuId)
        ? current.filter(m => m !== menuId)
        : [...current, menuId];
      return { ...prev, allowedMenus: updated };
    });
  };

  const handleToggleWidgetInModal = (widgetId) => {
    setFormData(prev => {
      const current = prev.allowedWidgets || [];
      const updated = current.includes(widgetId)
        ? current.filter(w => w !== widgetId)
        : [...current, widgetId];
      return { ...prev, allowedWidgets: updated };
    });
  };

  const handleSelectAllWidgets = (select) => {
    setFormData(prev => ({
      ...prev,
      allowedWidgets: select ? ALL_AVAILABLE_WIDGETS.map(w => w.id) : []
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.roleId.trim() || !formData.roleName.trim()) {
      showToast("Role ID and Role Name are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const method = editingRole ? "PUT" : "POST";
      const url = editingRole ? apiUrl(`/api/admin/roles/${editingRole._id || editingRole.roleId}`) : apiUrl("/api/admin/roles");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingRole ? "Role and Widget permissions updated successfully." : `Role "${data.roleName}" created.`);
        setShowModal(false);
        fetchData();
      } else {
        showToast(data.error || "Failed to save role.", "error");
      }
    } catch (err) {
      showToast("Network error saving role.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (r) => {
    if (r.isSystemRole) {
      showToast("Cannot delete a built-in system role.", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete Role: ${r.roleName}`,
      message: `Warning: Deleting role "${r.roleName}" will remove access for any users holding this role. Are you sure you want to proceed?`,
      confirmText: "Delete Role",
      isLoading: false,
      onConfirm: () => performDelete(r._id || r.roleId)
    });
  };

  const performDelete = async (id) => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(apiUrl(`/api/admin/roles/${id}`), { method: "DELETE" });
      if (res.ok) {
        showToast("Role deleted successfully.");
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        fetchData();
      } else {
        showToast("Failed to delete role.", "error");
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast("Network error deleting role.", "error");
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-iso-textMuted/40" />;
    return sortAsc ? <ArrowUp size={11} className="text-iso-primary" /> : <ArrowDown size={11} className="text-iso-primary" />;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="border-b border-iso-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-iso-primary font-bold">Global Roles &amp; Widget Permissions</h2>
          <p className="text-xs text-iso-textMuted">
            Configure sidebar menu access and <span className="font-bold text-iso-accent">Bot Analytics widget visibility permissions</span> per role in <span className="font-mono font-bold text-iso-accent">master &gt; roles</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white text-xs font-bold rounded-sm border border-iso-primary flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
        >
          <Plus size={14} /> Create Global Role
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles by title, slug, or description..."
            className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-7 py-1.5 text-xs text-iso-text outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-iso-textMuted hover:text-iso-text"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-iso-textMuted">
            Showing <strong className="text-iso-primary">{filteredAndSortedRoles.length}</strong> of {roles.length} roles
          </span>
        </div>
      </div>

      {/* Roles Matrix Table */}
      <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1 bg-iso-bgSecondary/20">
              
              <th 
                onClick={() => handleSort("roleName")}
                className="py-2.5 px-3 cursor-pointer hover:text-iso-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Role Group</span>
                  {renderSortIcon("roleName")}
                </div>
              </th>

              <th 
                onClick={() => handleSort("roleId")}
                className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Role Slug</span>
                  {renderSortIcon("roleId")}
                </div>
              </th>

              <th className="py-2.5 px-3">
                <span>Allowed Menus</span>
              </th>

              <th className="py-2.5 px-3">
                <span>Analytics Widgets Access</span>
              </th>

              <th className="py-2.5 text-right px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-iso-textMuted">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-iso-accent" />
                    <span>Loading master roles...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedRoles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-iso-textMuted italic bg-iso-bgSecondary/10 rounded-sm">
                  {searchQuery ? "No roles match your search query." : "No roles configured in master > roles."}
                </td>
              </tr>
            ) : (
              paginatedRoles.map(r => {
                const widgetsCount = Array.isArray(r.allowedWidgets) && r.allowedWidgets.length > 0 
                  ? r.allowedWidgets.length 
                  : (r.isSystemRole || r.roleId === 'super_admin' ? ALL_AVAILABLE_WIDGETS.length : ALL_AVAILABLE_WIDGETS.length);

                return (
                  <tr key={r._id || r.roleId} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20 transition-colors">
                    <td className="py-3 px-3 font-bold text-iso-primary flex items-center gap-2">
                      <Shield size={14} className="text-iso-accent" />
                      <div>
                        <span>{r.roleName}</span>
                        {r.isSystemRole && (
                          <span className="ml-2 px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 text-[8px] font-mono rounded">
                            SYSTEM
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-3 font-mono text-xs text-iso-textMuted">{r.roleId}</td>
                    
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(r.allowedMenus || []).map(m => (
                          <span key={m} className="px-1.5 py-0.2 bg-iso-bgSecondary border border-iso-border text-[9px] font-mono text-iso-primary rounded">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono font-bold">
                          {widgetsCount} of {ALL_AVAILABLE_WIDGETS.length} Widgets
                        </span>
                        <button
                          type="button"
                          onClick={() => { handleOpenEdit(r); setModalTab("widgets"); }}
                          className="text-[10px] font-mono text-iso-accent hover:underline cursor-pointer"
                        >
                          Configure
                        </button>
                      </div>
                    </td>

                    <td className="py-3 text-right px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary transition-colors"
                          title="Edit Role & Widget Permissions"
                        >
                          <Edit3 size={13} />
                        </button>
                        {!r.isSystemRole && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(r)}
                            className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Roles Table Pagination */}
        <TablePagination
          currentPage={rolesPage}
          totalItems={filteredAndSortedRoles.length}
          pageSize={10}
          onPageChange={setRolesPage}
        />
      </div>

      {/* CREATE / EDIT ROLE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-iso-primary/10 border border-iso-primary/20 flex items-center justify-center text-iso-primary">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-iso-primary">
                    {editingRole ? `Edit Role & Permissions: ${editingRole.roleName}` : "Create Global Role"}
                  </h3>
                  <p className="text-[11px] text-iso-textMuted font-mono">master &gt; roles collection</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-iso-textMuted hover:text-iso-primary rounded">
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-iso-border flex gap-1 bg-iso-bg text-xs">
              <button
                type="button"
                onClick={() => setModalTab("menus")}
                className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === "menus" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
                }`}
              >
                <Menu size={13} /> Allowed Navigation Menus ({formData.allowedMenus?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setModalTab("widgets")}
                className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === "widgets" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
                }`}
              >
                <LayoutGrid size={13} /> Allowed Analytics Widgets ({formData.allowedWidgets?.length || 0})
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4 text-xs overflow-y-auto max-h-[calc(90vh-160px)] flex-1">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Role Name <span className="text-iso-error">*</span></label>
                  <input
                    type="text"
                    value={formData.roleName}
                    onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                    placeholder="e.g. Ingestion Specialist"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Role Slug (ID) <span className="text-iso-error">*</span></label>
                  <input
                    type="text"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    placeholder="e.g. ingestion_specialist"
                    disabled={Boolean(editingRole)}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs outline-none font-mono disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Role description..."
                  className="w-full bg-iso-bg border border-iso-border rounded-sm px-3 py-2 text-xs outline-none"
                />
              </div>

              {/* TAB 1: ALLOWED MENUS */}
              {modalTab === "menus" && (
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">
                    Allowed Navigation Sidebar Menus
                  </label>
                  <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2">
                    {menus.map(m => {
                      const isChecked = (formData.allowedMenus || []).includes(m.menuId);
                      return (
                        <label key={m.menuId} className="flex items-center justify-between p-2.5 bg-iso-cardBg border border-iso-border rounded cursor-pointer hover:bg-iso-bgSecondary/30">
                          <div>
                            <span className="font-bold text-iso-primary">{m.label}</span>
                            <span className="ml-2 text-[10px] font-mono text-iso-accent">({m.menuId})</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMenuInModal(m.menuId)}
                            className="w-4 h-4 accent-iso-primary cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: ALLOWED ANALYTICS WIDGETS */}
              {modalTab === "widgets" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted font-semibold">
                      Allowed Bot Analytics Dashboard Widgets
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAllWidgets(true)}
                        className="text-[10px] font-mono text-iso-accent hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-iso-border">|</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAllWidgets(false)}
                        className="text-[10px] font-mono text-iso-textMuted hover:text-iso-primary cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {ALL_AVAILABLE_WIDGETS.map(w => {
                      const isChecked = (formData.allowedWidgets || []).includes(w.id);
                      return (
                        <label key={w.id} className="flex items-center justify-between p-2.5 bg-iso-cardBg border border-iso-border rounded cursor-pointer hover:bg-iso-bgSecondary/30">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-iso-primary text-xs">{w.title}</span>
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-iso-bg border border-iso-border rounded text-iso-textMuted">
                                {w.category}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-iso-textMuted mt-0.5">{w.description}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleWidgetInModal(w.id)}
                            className="w-4 h-4 accent-iso-primary cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-iso-border mt-auto">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-1.5 bg-iso-bgSecondary border border-iso-border rounded-sm text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{saving ? "Saving..." : (editingRole ? "Save Role Permissions" : "Create Role")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
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

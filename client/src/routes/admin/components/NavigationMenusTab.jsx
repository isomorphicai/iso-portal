import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Bot, BarChart3, Database, Shield, Settings, 
  Plus, Trash2, Edit3, Check, X, Loader2, Save, Eye, EyeOff,
  Search, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import ConfirmModal from "../../../components/ConfirmModal";
import TablePagination from "../../../components/TablePagination";

export default function NavigationMenusTab({ showToast }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("sortOrder");
  const [sortAsc, setSortAsc] = useState(true);
  const [menusPage, setMenusPage] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    menuId: "",
    label: "",
    icon: "Building2",
    path: "",
    sortOrder: 1,
    active: true,
    description: ""
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
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/menus");
      const data = await res.json();
      setMenus(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast("Error loading navigation menus.", "error");
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

  const filteredAndSortedMenus = useMemo(() => {
    let result = [...menus];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        (m.label || "").toLowerCase().includes(q) ||
        (m.menuId || "").toLowerCase().includes(q) ||
        (m.path || "").toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "sortOrder") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortAsc ? valA - valB : valB - valA;
      }

      if (sortField === "active") {
        valA = a.active !== false ? 1 : 0;
        valB = b.active !== false ? 1 : 0;
        return sortAsc ? valA - valB : valB - valA;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [menus, searchQuery, sortField, sortAsc]);

  // Reset page on search or sort change
  useEffect(() => {
    setMenusPage(1);
  }, [searchQuery, sortField, sortAsc]);

  const paginatedMenus = useMemo(() => {
    const start = (menusPage - 1) * 10;
    return filteredAndSortedMenus.slice(start, start + 10);
  }, [filteredAndSortedMenus, menusPage]);

  const handleOpenCreate = () => {
    setEditingMenu(null);
    setFormData({
      menuId: "",
      label: "",
      icon: "Building2",
      path: "",
      sortOrder: menus.length + 1,
      active: true,
      description: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMenu(m);
    setFormData({
      menuId: m.menuId,
      label: m.label,
      icon: m.icon || "Building2",
      path: m.path || m.menuId,
      sortOrder: m.sortOrder || 1,
      active: m.active !== false,
      description: m.description || ""
    });
    setShowModal(true);
  };

  const handleToggleActive = async (m) => {
    try {
      const nextActive = !m.active;
      const res = await fetch(`/api/admin/menus/${m._id || m.menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive })
      });
      if (res.ok) {
        showToast(`Menu "${m.label}" is now ${nextActive ? "Active" : "Inactive"}.`);
        fetchMenus();
      }
    } catch (err) {
      showToast("Error updating menu status.", "error");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.menuId.trim() || !formData.label.trim()) {
      showToast("Menu ID and Label are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const method = editingMenu ? "PUT" : "POST";
      const url = editingMenu ? `/api/admin/menus/${editingMenu._id || editingMenu.menuId}` : "/api/admin/menus";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingMenu ? "Menu updated successfully." : `Menu "${data.label}" created.`);
        setShowModal(false);
        fetchMenus();
      } else {
        showToast(data.error || "Failed to save menu.", "error");
      }
    } catch (err) {
      showToast("Network error saving menu.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (m) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Menu: ${m.label}`,
      message: `Warning: Deleting the navigation menu "${m.label}" will remove it from all roles in master > roles. Are you sure you want to proceed?`,
      confirmText: "Delete Menu",
      isLoading: false,
      onConfirm: () => performDelete(m._id || m.menuId)
    });
  };

  const performDelete = async (id) => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Menu deleted successfully.");
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        fetchMenus();
      } else {
        showToast("Failed to delete menu.", "error");
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast("Network error deleting menu.", "error");
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-iso-textMuted/40" />;
    return sortAsc ? <ArrowUp size={11} className="text-iso-primary" /> : <ArrowDown size={11} className="text-iso-primary" />;
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case "Building2": return <Building2 size={15} className="text-iso-primary" />;
      case "BarChart3": return <BarChart3 size={15} className="text-emerald-600" />;
      case "Database": return <Database size={15} className="text-indigo-600" />;
      case "Bot": return <Bot size={15} className="text-purple-600" />;
      case "Shield": return <Shield size={15} className="text-blue-600" />;
      default: return <Settings size={15} className="text-slate-600" />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="border-b border-iso-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-iso-primary font-bold">Navigation Menus Manager</h2>
          <p className="text-xs text-iso-textMuted">Centralized collection in <span className="font-mono font-bold text-iso-accent">master &gt; menus</span> controlling all sidebar navigation options.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white text-xs font-bold rounded-sm border border-iso-primary flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
        >
          <Plus size={14} /> Add Menu Item
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
            placeholder="Search menus by label, slug, path, or description..."
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
            Showing <strong className="text-iso-primary">{filteredAndSortedMenus.length}</strong> of {menus.length} menus
          </span>
        </div>
      </div>

      {/* Menus Table */}
      <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1 bg-iso-bgSecondary/20">
              
              <th 
                onClick={() => handleSort("sortOrder")}
                className="py-2.5 px-3 cursor-pointer hover:text-iso-primary transition-colors select-none w-20"
              >
                <div className="flex items-center gap-1">
                  <span>Order</span>
                  {renderSortIcon("sortOrder")}
                </div>
              </th>

              <th 
                onClick={() => handleSort("label")}
                className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Menu Label</span>
                  {renderSortIcon("label")}
                </div>
              </th>

              <th 
                onClick={() => handleSort("menuId")}
                className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Menu ID (Slug)</span>
                  {renderSortIcon("menuId")}
                </div>
              </th>

              <th 
                onClick={() => handleSort("path")}
                className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Route Path</span>
                  {renderSortIcon("path")}
                </div>
              </th>

              <th 
                onClick={() => handleSort("active")}
                className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status</span>
                  {renderSortIcon("active")}
                </div>
              </th>

              <th className="py-2.5 text-right px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-iso-textMuted">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-iso-accent" />
                    <span>Loading master menus...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedMenus.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-iso-textMuted italic bg-iso-bgSecondary/10 rounded-sm">
                  {searchQuery ? "No menus match your search query." : "No menus configured in master > menus."}
                </td>
              </tr>
            ) : (
              paginatedMenus.map(m => (
                <tr key={m._id || m.menuId} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-iso-textMuted">#{m.sortOrder}</td>
                  <td className="py-3 font-bold text-iso-primary flex items-center gap-2">
                    <div className="w-7 h-7 rounded-sm bg-iso-bgSecondary border border-iso-border flex items-center justify-center">
                      {getIcon(m.icon)}
                    </div>
                    <div>
                      <span>{m.label}</span>
                      {m.description && <p className="text-[10px] text-iso-textMuted font-normal">{m.description}</p>}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-iso-accent font-semibold">{m.menuId}</td>
                  <td className="py-3 font-mono text-iso-textMuted">{m.path || `/${m.menuId}`}</td>
                  <td className="py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m)}
                      className={`px-2.5 py-0.5 rounded-sm text-[9px] font-mono font-bold border transition-all ${
                        m.active !== false
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-slate-100 text-slate-500 border-slate-300"
                      }`}
                    >
                      {m.active !== false ? "ACTIVE" : "HIDDEN"}
                    </button>
                  </td>
                  <td className="py-3 text-right px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary transition-colors"
                        title="Edit Menu"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(m)}
                        className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg transition-colors"
                        title="Delete Menu"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Menus Table Pagination */}
        <TablePagination
          currentPage={menusPage}
          totalItems={filteredAndSortedMenus.length}
          pageSize={10}
          onPageChange={setMenusPage}
        />
      </div>

      {/* CREATE / EDIT MENU MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-iso-primary/10 border border-iso-primary/20 flex items-center justify-center text-iso-primary">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-iso-primary">
                    {editingMenu ? `Edit Menu: ${editingMenu.label}` : "Create Navigation Menu"}
                  </h3>
                  <p className="text-[11px] text-iso-textMuted font-mono">master &gt; menus collection</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-iso-textMuted hover:text-iso-primary rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Menu Label <span className="text-iso-error">*</span></label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g. Bot Analytics"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Menu ID (Slug) <span className="text-iso-error">*</span></label>
                  <input
                    type="text"
                    value={formData.menuId}
                    onChange={(e) => setFormData({ ...formData, menuId: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    placeholder="e.g. analytics"
                    disabled={Boolean(editingMenu)}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs outline-none font-mono disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Icon Identifier</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs outline-none cursor-pointer"
                  >
                    <option value="Building2">Building2 (Tenants)</option>
                    <option value="BarChart3">BarChart3 (Analytics)</option>
                    <option value="Database">Database (Ingestion)</option>
                    <option value="Bot">Bot (Chatbots)</option>
                    <option value="Shield">Shield (Security/Roles)</option>
                    <option value="Settings">Settings (Config)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                    className="w-full bg-iso-bg border border-iso-border rounded-sm px-3 py-2 text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Module summary..."
                  className="w-full bg-iso-bg border border-iso-border rounded-sm px-3 py-2 text-xs outline-none"
                />
              </div>

              <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-iso-primary">Active Navigation Visibility</h4>
                  <p className="text-[11px] text-iso-textMuted font-mono">Render in sidebar when permitted by user role</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.active)}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 accent-iso-primary cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-iso-border mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-1.5 bg-iso-bgSecondary border border-iso-border rounded-sm text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{saving ? "Saving..." : (editingMenu ? "Save Changes" : "Create Menu")}</span>
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

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, Users, Plus, Trash2, Edit3, Save, Loader2, KeyRound,
  Search, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import ConfirmModal from "../../../components/ConfirmModal";
import TablePagination from "../../../components/TablePagination";

export default function TenantUsersModal({
  isOpen,
  onClose,
  activeTenant,
  showToast
}) {
  const [globalRoles, setGlobalRoles] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("username");
  const [sortAsc, setSortAsc] = useState(true);
  const [userPage, setUserPage] = useState(1);

  // User form states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    role: "tenant_admin",
    fullName: "",
    email: "",
    status: "active"
  });
  const [savingUser, setSavingUser] = useState(false);

  // Confirm delete modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isLoading: false
  });

  const targetTenantId = activeTenant?._id || activeTenant?.tenantId || "";
  const targetDb = activeTenant?.tenantDbName || (activeTenant?.tenantId ? `iso_${activeTenant.tenantId}` : "");

  useEffect(() => {
    if (isOpen && activeTenant) {
      loadData();
    }
  }, [isOpen, activeTenant]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch(`/api/admin/tenant-users?tenantId=${encodeURIComponent(targetTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`)
      ]);
      const rolesData = await rolesRes.json();
      const usersData = await usersRes.json();
      
      const rolesList = Array.isArray(rolesData) ? rolesData : [];
      setGlobalRoles(rolesList);
      setTenantUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      showToast("Error loading tenant users.", "error");
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

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...tenantUsers];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.username || "").toLowerCase().includes(q) ||
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q) ||
        (u.status || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [tenantUsers, searchQuery, sortField, sortAsc]);

  // Reset page on search, sort, or modal open
  useEffect(() => {
    setUserPage(1);
  }, [searchQuery, sortField, sortAsc, isOpen, activeTenant]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * 10;
    return filteredAndSortedUsers.slice(start, start + 10);
  }, [filteredAndSortedUsers, userPage]);

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      username: "",
      password: "",
      role: globalRoles[0]?.roleId || "tenant_admin",
      fullName: "",
      email: "",
      status: "active"
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserFormData({
      username: u.username,
      password: "",
      role: u.role || globalRoles[0]?.roleId || "tenant_admin",
      fullName: u.fullName || "",
      email: u.email || "",
      status: u.status || "active"
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormData.username.trim()) {
      showToast("Username is required.", "error");
      return;
    }
    if (!editingUser && !userFormData.password.trim()) {
      showToast("Password is required for new user account.", "error");
      return;
    }

    setSavingUser(true);
    try {
      const method = editingUser ? "PUT" : "POST";
      const url = editingUser
        ? `/api/admin/tenant-users/${editingUser._id || editingUser.username}?tenantId=${encodeURIComponent(targetTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`
        : `/api/admin/tenant-users?tenantId=${encodeURIComponent(targetTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userFormData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingUser ? "User updated successfully." : `User "${data.username}" created.`);
        setShowUserModal(false);
        loadData();
      } else {
        showToast(data.error || "Failed to save user account.", "error");
      }
    } catch (err) {
      showToast("Network error saving user.", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUserClick = (u) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete User: ${u.username}`,
      message: `Warning: Are you sure you want to delete user account "${u.username}" from database "${targetDb}"?`,
      confirmText: "Delete User",
      isLoading: false,
      onConfirm: () => performDeleteUser(u._id || u.username)
    });
  };

  const performDeleteUser = async (id) => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`/api/admin/tenant-users/${id}?tenantId=${encodeURIComponent(targetTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("User deleted successfully.");
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        loadData();
      } else {
        showToast("Failed to delete user.", "error");
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast("Network error deleting user.", "error");
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-iso-textMuted/40" />;
    return sortAsc ? <ArrowUp size={11} className="text-iso-primary" /> : <ArrowDown size={11} className="text-iso-primary" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-iso-primary">
                Tenant Users: <span className="text-iso-accent">{activeTenant?.name || activeTenant?.tenantName}</span>
              </h2>
              <p className="text-[11px] text-iso-textMuted font-mono">
                Workspace Database: <span className="font-bold text-iso-accent">{targetDb}</span> &gt; users
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded-sm transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] flex-1 text-xs">
          {loading ? (
            <div className="py-16 text-center text-iso-textMuted flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-iso-accent" />
              <span>Loading tenant users...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by username, email, role, or status..."
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

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-iso-textMuted">
                    Showing <strong className="text-iso-primary">{filteredAndSortedUsers.length}</strong> of {tenantUsers.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenAddUser}
                    className="px-3 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  >
                    <Plus size={13} /> Add User
                  </button>
                </div>
              </div>

              {/* Table with Column Sorting */}
              <div className="bg-iso-cardBg border border-iso-border rounded-sm overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1 bg-iso-bgSecondary/20">
                      
                      <th 
                        onClick={() => handleSort("username")}
                        className="py-2.5 px-3 cursor-pointer hover:text-iso-primary transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Username</span>
                          {renderSortIcon("username")}
                        </div>
                      </th>

                      <th 
                        onClick={() => handleSort("fullName")}
                        className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Full Name &amp; Email</span>
                          {renderSortIcon("fullName")}
                        </div>
                      </th>

                      <th 
                        onClick={() => handleSort("role")}
                        className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Assigned Role</span>
                          {renderSortIcon("role")}
                        </div>
                      </th>

                      <th 
                        onClick={() => handleSort("status")}
                        className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Status</span>
                          {renderSortIcon("status")}
                        </div>
                      </th>

                      <th className="py-2.5 text-right px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-iso-textMuted italic bg-iso-bgSecondary/10 rounded-sm">
                          {searchQuery ? "No user accounts match your search query." : "No users registered in this tenant database yet."}
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map(u => (
                        <tr key={u._id || u.username} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20 transition-colors">
                          <td className="py-3 px-3 font-bold text-iso-primary flex items-center gap-2">
                            <KeyRound size={13} className="text-iso-accent" />
                            <span>{u.username}</span>
                          </td>
                          <td className="py-3">
                            <span className="font-semibold text-iso-text">{u.fullName || u.username}</span>
                            <p className="text-[10px] text-iso-textMuted font-mono">{u.email || "-"}</p>
                          </td>
                          <td className="py-3 font-mono text-xs">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold">
                              {u.role || "tenant_admin"}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                              u.status !== "inactive" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"
                            }`}>
                              {u.status !== "inactive" ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="py-3 text-right px-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary transition-colors"
                                title="Edit User"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUserClick(u)}
                                className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg transition-colors"
                                title="Delete User"
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

                {/* Tenant Users Pagination */}
                <TablePagination
                  currentPage={userPage}
                  totalItems={filteredAndSortedUsers.length}
                  pageSize={10}
                  onPageChange={setUserPage}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-iso-border flex items-center justify-between bg-iso-bgSecondary/20">
          <span className="text-[10px] font-mono text-iso-textMuted">Tenant: {activeTenant?.code || activeTenant?.tenantId}</span>
          <button type="button" onClick={onClose} className="px-4 py-1.5 bg-iso-bgSecondary hover:bg-iso-border/40 text-iso-text border border-iso-border rounded-sm text-xs font-semibold transition-all">
            Close
          </button>
        </div>

      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-iso-border pb-3">
              <h3 className="font-bold font-serif text-iso-primary text-sm">
                {editingUser ? `Edit User: ${editingUser.username}` : "Create Tenant User Account"}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 text-iso-textMuted hover:text-iso-primary"><X size={16} /></button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Username <span className="text-iso-error">*</span></label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="e.g. jsmith"
                  disabled={Boolean(editingUser)}
                  className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs outline-none font-mono disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                  Password {editingUser ? "(Leave blank to keep unchanged)" : <span className="text-iso-error">*</span>}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Enter password"}
                  className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs outline-none"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Assigned Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs outline-none cursor-pointer font-mono"
                  >
                    {globalRoles.map(r => (
                      <option key={r.roleId} value={r.roleId}>{r.roleName} ({r.roleId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs outline-none cursor-pointer font-mono"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Full Name</label>
                  <input
                    type="text"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    placeholder="John Smith"
                    className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Email</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="john@company.com"
                    className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-iso-border mt-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-3 py-1 bg-iso-bgSecondary border border-iso-border rounded text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={savingUser} className="px-4 py-1 bg-iso-primary hover:bg-iso-primaryLight text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs">
                  {savingUser ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>{savingUser ? "Saving..." : (editingUser ? "Save User" : "Create User")}</span>
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

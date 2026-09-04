import React, { useState, useEffect } from "react";
import { 
  X, Shield, Users, Plus, Trash2, Edit3, Save, Loader2, KeyRound
} from "lucide-react";
import ConfirmModal from "../../../components/ConfirmModal";
import TablePagination from "../../../components/TablePagination";

export default function TenantRolesAndUsersModal({
  isOpen,
  onClose,
  activeTenant,
  onSaved,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("users"); // "users" | "roles"
  const [globalRoles, setGlobalRoles] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
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
      setUserPage(1);
    }
  }, [isOpen, activeTenant]);

  const paginatedUsers = React.useMemo(() => {
    const start = (userPage - 1) * 10;
    return tenantUsers.slice(start, start + 10);
  }, [tenantUsers, userPage]);

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

      // If tenant has assignedRoles, use them; otherwise default to all global roles
      const tenantAssigned = Array.isArray(activeTenant.assignedRoles) && activeTenant.assignedRoles.length > 0
        ? activeTenant.assignedRoles
        : rolesList.map(r => r.roleId);
      setAssignedRoles(tenantAssigned);
    } catch (err) {
      showToast("Error loading tenant roles and users.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAssignedRole = (roleId) => {
    setAssignedRoles(prev => 
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSaveAssignedRoles = async () => {
    setSavingRoles(true);
    try {
      const res = await fetch(`/api/admin/tenants/${activeTenant._id || activeTenant.tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeTenant,
          assignedRoles
        })
      });
      if (res.ok) {
        showToast("Assigned roles updated for tenant.");
        if (onSaved) onSaved();
      } else {
        showToast("Failed to update assigned roles.", "error");
      }
    } catch (err) {
      showToast("Network error saving assigned roles.", "error");
    } finally {
      setSavingRoles(false);
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      username: "",
      password: "",
      role: assignedRoles[0] || "tenant_admin",
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
      password: "", // Leave blank if unchanged
      role: u.role || assignedRoles[0] || "tenant_admin",
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
      showToast("Password is required for new user.", "error");
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
        showToast(editingUser ? "User updated." : `User "${data.username}" created.`);
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
        showToast("User deleted.");
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
                Tenant Roles &amp; Users: <span className="text-iso-accent">{activeTenant?.name || activeTenant?.tenantName}</span>
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

        {/* Tabs */}
        <div className="px-6 border-b border-iso-border flex gap-1 bg-iso-bg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "users" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Users size={13} /> Tenant User Accounts ({tenantUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "roles" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Shield size={13} /> Assigned Global Roles ({assignedRoles.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] flex-1 text-xs">
          {loading ? (
            <div className="py-16 text-center text-iso-textMuted flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-iso-accent" />
              <span>Loading tenant users and roles...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: USERS IN TENANT DB */}
              {activeTab === "users" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-iso-textMuted">
                      User accounts stored in dedicated database <span className="font-mono font-bold text-iso-accent">{targetDb} &gt; users</span>.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddUser}
                      className="px-3 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={13} /> Add User
                    </button>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1">
                        <th className="py-2.5 px-3">Username</th>
                        <th className="py-2.5">Full Name &amp; Email</th>
                        <th className="py-2.5">Assigned Role</th>
                        <th className="py-2.5 text-center">Status</th>
                        <th className="py-2.5 text-right px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-iso-textMuted italic bg-iso-bgSecondary/10 rounded-sm">
                            No users registered in this tenant database yet.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map(u => (
                          <tr key={u._id || u.username} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20">
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
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserClick(u)}
                                  className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg transition-colors"
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
                    totalItems={tenantUsers.length}
                    pageSize={10}
                    onPageChange={setUserPage}
                  />
                </div>
              )}

              {/* TAB 2: ASSIGNED ROLES FOR THIS TENANT */}
              {activeTab === "roles" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-iso-textMuted">
                      Select which global roles from <span className="font-mono font-bold text-iso-accent">master &gt; roles</span> are available to users within this tenant.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveAssignedRoles}
                      disabled={savingRoles}
                      className="px-4 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-xs"
                    >
                      {savingRoles ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Save Assigned Roles</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {globalRoles.map(role => {
                      const isAssigned = assignedRoles.includes(role.roleId);
                      return (
                        <div
                          key={role.roleId}
                          onClick={() => handleToggleAssignedRole(role.roleId)}
                          className={`p-3.5 border rounded-sm cursor-pointer transition-all flex items-start justify-between ${
                            isAssigned
                              ? "bg-iso-primary/5 border-iso-primary"
                              : "bg-iso-bg border-iso-border hover:bg-iso-bgSecondary/30"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Shield size={16} className={isAssigned ? "text-iso-primary mt-0.5" : "text-iso-textMuted mt-0.5"} />
                            <div>
                              <h4 className="font-bold text-iso-primary text-xs">{role.roleName}</h4>
                              <span className="text-[10px] font-mono text-iso-accent font-semibold">{role.roleId}</span>
                              <p className="text-[10px] text-iso-textMuted mt-1">{role.description || "Global role definition"}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(role.allowedMenus || []).map(m => (
                                  <span key={m} className="px-1.5 py-0.2 bg-iso-bgSecondary border border-iso-border text-[8px] font-mono text-iso-text">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => {}} // Handled by container onClick
                            className="w-4 h-4 accent-iso-primary cursor-pointer mt-0.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-iso-border flex items-center justify-between bg-iso-bgSecondary/20">
          <span className="text-[10px] font-mono text-iso-textMuted">Tenant: {activeTenant?.code || activeTenant?.tenantId}</span>
          <button type="button" onClick={onClose} className="px-4 py-1.5 bg-iso-bgSecondary hover:bg-iso-border/40 text-iso-text border border-iso-border rounded-sm text-xs font-semibold">
            Close
          </button>
        </div>

      </div>

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-iso-border pb-3">
              <h3 className="font-bold font-serif text-iso-primary text-sm">
                {editingUser ? `Edit User: ${editingUser.username}` : "Create Tenant User"}
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
                  Password {editingUser ? "(Leave blank to keep current)" : <span className="text-iso-error">*</span>}
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
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Role</label>
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
                <button type="button" onClick={() => setShowUserModal(false)} className="px-3 py-1 bg-iso-bgSecondary border border-iso-border rounded text-xs">Cancel</button>
                <button type="submit" disabled={savingUser} className="px-4 py-1 bg-iso-primary text-white rounded text-xs font-bold flex items-center gap-1">
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

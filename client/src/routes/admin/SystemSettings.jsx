import React, { useState } from "react";
import { Shield, Menu as MenuIcon } from "lucide-react";
import GlobalRolesTab from "./components/GlobalRolesTab";
import NavigationMenusTab from "./components/NavigationMenusTab";

export default function SystemSettings({ showToast }) {
  const [activeTab, setActiveTab] = useState("roles"); // "roles" | "menus"

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* HEADER */}
      <div className="border-b border-iso-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-iso-primary mb-1">
            System &amp; Roles Settings
          </h1>
          <p className="text-xs text-iso-textMuted">
            Configure global role-based access control, analytics widget permissions, and portal navigation menus.
          </p>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-iso-border pb-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "roles"
                ? "border-iso-primary text-iso-primary"
                : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Shield size={16} /> Global Roles &amp; Permissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("menus")}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "menus"
                ? "border-iso-primary text-iso-primary"
                : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <MenuIcon size={16} /> Page Navigation Menus
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "roles" && (
        <GlobalRolesTab showToast={showToast} />
      )}

      {activeTab === "menus" && (
        <NavigationMenusTab showToast={showToast} />
      )}
    </div>
  );
}

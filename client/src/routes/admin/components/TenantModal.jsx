import React, { useState, useEffect } from "react";
import { 
  X, Building2, Sliders, Palette, Image as ImageIcon, 
  CheckCircle, Code, Save, Loader2, Bot as BotIcon, Eye,
  Sparkles, Globe, RefreshCw
} from "lucide-react";

const TIMEZONE_OPTIONS = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "UTC"
];

const DEFAULT_TENANT_CONFIG = {
  instituteName: "",
  timeZone: "America/New_York",
  loginBackgroundColor: "#fdf7f7",
  ButtonandLeftBarColor: "#00306D",
  buttonFontColor: "#ffffff",
  BordersColor: "#578b96",
  disableButtonColor: "#c1c1c1",
  forgotFontColor: "#373737",
  allHeaderFontSize: "1.2rem",
  allTitleFontSize: "1rem",
  backgroudImageUrl: "",
  logoBigUrl: "",
  logoSmallUrl: "",
  faviconUrl: "",
  showIntegrationTypeInChatHistory: true,
  showJobQueueNotificationIcon: true
};

export default function TenantModal({
  isOpen,
  onClose,
  tenantData,
  onSaved,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [newBotTag, setNewBotTag] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (tenantData) {
        setFormData({
          id: tenantData._id,
          name: tenantData.name || tenantData.tenantName || "",
          tenantName: tenantData.tenantName || tenantData.name || "",
          code: tenantData.code || tenantData.tenantId || "",
          tenantId: tenantData.tenantId || tenantData.code || "",
          tenantDbName: tenantData.tenantDbName || (tenantData.tenantId ? `iso_${tenantData.tenantId}` : ""),
          tenantActive: tenantData.tenantActive !== false,
          Bots: Array.isArray(tenantData.Bots) ? [...tenantData.Bots] : [],
          tenantConfig: {
            ...DEFAULT_TENANT_CONFIG,
            ...(tenantData.tenantConfig || {})
          }
        });
      } else {
        setFormData({
          id: null,
          name: "",
          tenantName: "",
          code: "",
          tenantId: "",
          tenantDbName: "",
          tenantActive: true,
          Bots: [],
          tenantConfig: { ...DEFAULT_TENANT_CONFIG }
        });
      }
      setActiveTab("general");
      setJsonError(null);
    }
  }, [isOpen, tenantData]);

  useEffect(() => {
    if (activeTab === "json") {
      setRawJson(JSON.stringify(formData, null, 2));
      setJsonError(null);
    }
  }, [activeTab]);

  const updateConfigField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      tenantConfig: {
        ...(prev.tenantConfig || {}),
        [field]: value
      }
    }));
  };

  const addBotTag = () => {
    if (!newBotTag.trim()) return;
    const tag = newBotTag.trim();
    if (!formData.Bots?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        Bots: [...(prev.Bots || []), tag]
      }));
    }
    setNewBotTag("");
  };

  const removeBotTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      Bots: (prev.Bots || []).filter(b => b !== tag)
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    let payload = { ...formData };

    if (activeTab === "json") {
      try {
        payload = JSON.parse(rawJson);
        setFormData(payload);
        setJsonError(null);
      } catch (err) {
        setJsonError("Invalid JSON: " + err.message);
        showToast("Cannot save invalid JSON schema.", "error");
        return;
      }
    }

    const finalName = (payload.tenantName || payload.name || "").trim();
    const finalCode = (payload.tenantId || payload.code || "").trim();

    if (!finalName || !finalCode) {
      showToast("Corporate Name and Tenant Identifier are required.", "error");
      return;
    }

    const method = payload.id ? "PUT" : "POST";
    const url = payload.id ? `/api/admin/tenants/${payload.id}` : "/api/admin/tenants";

    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          tenantName: finalName,
          code: finalCode.toLowerCase(),
          tenantId: finalCode.toLowerCase(),
          tenantDbName: payload.tenantDbName?.trim() || `iso_${finalCode.toLowerCase()}`,
          tenantActive: payload.tenantActive !== false,
          Bots: Array.isArray(payload.Bots) ? payload.Bots : [],
          tenantConfig: payload.tenantConfig || {}
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(payload.id ? "Organization profile updated successfully." : `Organization "${data.name || data.tenantName}" onboarded.`);
        onSaved();
        onClose();
      } else {
        showToast(data.error || "Failed to save organization profile.", "error");
      }
    } catch (err) {
      showToast("Network error submitting organization configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const cfg = formData.tenantConfig || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-iso-primary/10 border border-iso-primary/20 flex items-center justify-center text-iso-primary">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-iso-primary">
                {formData.id ? `Edit Tenant: ${formData.tenantName || formData.name}` : "Onboard New Tenant Environment"}
              </h2>
              <p className="text-[11px] text-iso-textMuted font-mono">Organization Profile, Branding & Login Customization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded-sm transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-iso-border flex gap-1 bg-iso-bg text-xs overflow-x-auto">
          <button type="button" onClick={() => setActiveTab("general")} className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "general" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"}`}>
            <Sliders size={13} /> General &amp; Profile
          </button>
          <button type="button" onClick={() => setActiveTab("branding")} className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "branding" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"}`}>
            <ImageIcon size={13} /> Logos &amp; Background
          </button>
          <button type="button" onClick={() => setActiveTab("theme")} className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "theme" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"}`}>
            <Palette size={13} /> Theme Colors &amp; Preview
          </button>
          <button type="button" onClick={() => setActiveTab("behavior")} className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "behavior" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"}`}>
            <CheckCircle size={13} /> Features &amp; Flags
          </button>
          <button type="button" onClick={() => setActiveTab("json")} className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "json" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"}`}>
            <Code size={13} /> Advanced Schema (JSON)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] flex-1 text-xs">
          
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Corporate Name <span className="text-iso-error">*</span></label>
                  <input type="text" value={formData.tenantName || formData.name || ""} onChange={(e) => setFormData({ ...formData, tenantName: e.target.value, name: e.target.value })} placeholder="e.g. Onestop Enterprise" className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Tenant Identifier (Slug) <span className="text-iso-error">*</span></label>
                  <input type="text" value={formData.tenantId || formData.code || ""} onChange={(e) => setFormData({ ...formData, tenantId: e.target.value, code: e.target.value })} placeholder="e.g. onestop" disabled={formData.id !== null} className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono disabled:opacity-60" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Workspace Identifier</label>
                  <input type="text" value={formData.tenantDbName || (formData.tenantId ? `iso_${formData.tenantId.toLowerCase()}` : "")} onChange={(e) => setFormData({ ...formData, tenantDbName: e.target.value })} placeholder="e.g. iso_onestop" className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono font-semibold text-iso-accent" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Operational Status</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button type="button" onClick={() => setFormData({ ...formData, tenantActive: !formData.tenantActive })} className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.tenantActive ? "bg-emerald-600" : "bg-slate-300"}`}>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.tenantActive ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                    <span className="text-xs font-bold font-mono">{formData.tenantActive ? <span className="text-emerald-700">ACTIVE ENVIRONMENT</span> : <span className="text-slate-500">INACTIVE / DISABLED</span>}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Institute / Brand Display Name</label>
                  <input type="text" value={formData.tenantConfig?.instituteName || ""} onChange={(e) => updateConfigField("instituteName", e.target.value)} placeholder="e.g. Onestop Academy" className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Timezone</label>
                  <select value={formData.tenantConfig?.timeZone || "America/New_York"} onChange={(e) => updateConfigField("timeZone", e.target.value)} className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none cursor-pointer">
                    {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>

              {/* Assigned Chatbots */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Assigned Chatbot Slugs (Bots Array)</label>
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(formData.Bots || []).map(b => (
                      <span key={b} className="px-2.5 py-1 bg-iso-bgSecondary border border-iso-border rounded-sm text-xs font-mono font-semibold text-iso-primary flex items-center gap-1.5">
                        <BotIcon size={12} className="text-iso-accent" />
                        <span>{b}</span>
                        <button type="button" onClick={() => removeBotTag(b)} className="text-iso-textMuted hover:text-iso-error cursor-pointer"><X size={12} /></button>
                      </span>
                    ))}
                    {(formData.Bots || []).length === 0 && <span className="text-xs text-iso-textMuted italic">No chatbots assigned yet.</span>}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <input type="text" value={newBotTag} onChange={(e) => setNewBotTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBotTag(); } }} placeholder="Add chatbot slug (e.g. support-desk)" className="flex-1 bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono" />
                    <button type="button" onClick={addBotTag} className="px-3 py-1.5 bg-iso-bgSecondary hover:bg-iso-accent hover:text-white border border-iso-border text-xs font-bold rounded-sm transition-all cursor-pointer">Add Bot Slug</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING & ASSETS */}
          {activeTab === "branding" && (
            <div className="flex flex-col gap-5">
              
              {/* Login Big Logo */}
              <div className="p-4 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-iso-primary block">Header &amp; Login Screen Logo (Big Logo)</label>
                    <p className="text-[11px] text-iso-textMuted">Displayed prominently on the tenant's login screen and portal header.</p>
                  </div>
                  {cfg.logoBigUrl && (
                    <button 
                      type="button" 
                      onClick={() => updateConfigField("logoBigUrl", "")} 
                      className="text-[10px] text-iso-error hover:underline cursor-pointer"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 w-full">
                    <input 
                      type="url" 
                      value={cfg.logoBigUrl || ""} 
                      onChange={(e) => updateConfigField("logoBigUrl", e.target.value)} 
                      placeholder="https://example.com/branding/tenant-logo.png" 
                      className="w-full bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded px-3 py-2 text-xs text-iso-text outline-none font-mono" 
                    />
                  </div>
                  <div className="w-48 h-16 border border-dashed border-iso-border rounded flex items-center justify-center p-2 bg-iso-cardBg shrink-0 overflow-hidden">
                    {cfg.logoBigUrl ? (
                      <img 
                        src={cfg.logoBigUrl} 
                        alt="Logo Preview" 
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-[10px] text-iso-textMuted font-mono italic">No logo provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Login Screen Background Image */}
              <div className="p-4 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-iso-primary block">Login Screen Background Image URL</label>
                    <p className="text-[11px] text-iso-textMuted">Full-resolution backdrop image rendered behind the tenant login screen.</p>
                  </div>
                  {cfg.backgroudImageUrl && (
                    <button 
                      type="button" 
                      onClick={() => updateConfigField("backgroudImageUrl", "")} 
                      className="text-[10px] text-iso-error hover:underline cursor-pointer"
                    >
                      Clear Background Image
                    </button>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 w-full">
                    <input 
                      type="url" 
                      value={cfg.backgroudImageUrl || ""} 
                      onChange={(e) => updateConfigField("backgroudImageUrl", e.target.value)} 
                      placeholder="https://example.com/branding/login-backdrop.jpg" 
                      className="w-full bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded px-3 py-2 text-xs text-iso-text outline-none font-mono" 
                    />
                  </div>
                  <div className="w-48 h-20 border border-dashed border-iso-border rounded flex items-center justify-center p-1 bg-iso-cardBg shrink-0 overflow-hidden relative">
                    {cfg.backgroudImageUrl ? (
                      <img 
                        src={cfg.backgroudImageUrl} 
                        alt="Background Preview" 
                        className="w-full h-full object-cover rounded"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-[10px] text-iso-textMuted font-mono italic text-center">No backdrop URL<br />(uses bg color)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Small Logo & Favicon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted font-semibold">Sidebar / Small Logo URL</label>
                  <input type="url" value={cfg.logoSmallUrl || ""} onChange={(e) => updateConfigField("logoSmallUrl", e.target.value)} placeholder="https://.../small-logo.png" className="w-full bg-iso-cardBg border border-iso-border rounded px-3 py-1.5 text-xs text-iso-text outline-none font-mono" />
                  {cfg.logoSmallUrl && (
                    <div className="h-8 flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-iso-textMuted font-mono">Preview:</span>
                      <img src={cfg.logoSmallUrl} alt="Small logo preview" className="h-6 object-contain" />
                    </div>
                  )}
                </div>

                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted font-semibold">Favicon URL (.ico / .png)</label>
                  <input type="url" value={cfg.faviconUrl || ""} onChange={(e) => updateConfigField("faviconUrl", e.target.value)} placeholder="https://.../favicon.ico" className="w-full bg-iso-cardBg border border-iso-border rounded px-3 py-1.5 text-xs text-iso-text outline-none font-mono" />
                  {cfg.faviconUrl && (
                    <div className="h-8 flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-iso-textMuted font-mono">Preview:</span>
                      <img src={cfg.faviconUrl} alt="Favicon preview" className="w-4 h-4 object-contain" />
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: THEME & LIVE LOGIN PREVIEW */}
          {activeTab === "theme" && (
            <div className="flex flex-col gap-5">
              
              {/* Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Primary Button & Brand Color */}
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Primary Theme / Button Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.ButtonandLeftBarColor || "#00306D"} onChange={(e) => updateConfigField("ButtonandLeftBarColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={cfg.ButtonandLeftBarColor || "#00306D"} onChange={(e) => updateConfigField("ButtonandLeftBarColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>

                {/* Login Background Color */}
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Login Background Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.loginBackgroundColor || "#fdf7f7"} onChange={(e) => updateConfigField("loginBackgroundColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={cfg.loginBackgroundColor || "#fdf7f7"} onChange={(e) => updateConfigField("loginBackgroundColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>

                {/* Button Font Color */}
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Button Text / Font Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.buttonFontColor || "#ffffff"} onChange={(e) => updateConfigField("buttonFontColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={cfg.buttonFontColor || "#ffffff"} onChange={(e) => updateConfigField("buttonFontColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>

                {/* Borders Color */}
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Border &amp; Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.BordersColor || "#578b96"} onChange={(e) => updateConfigField("BordersColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={cfg.BordersColor || "#578b96"} onChange={(e) => updateConfigField("BordersColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>

                {/* Subtext / Link Color */}
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Subtext &amp; Link Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.forgotFontColor || "#373737"} onChange={(e) => updateConfigField("forgotFontColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={cfg.forgotFontColor || "#373737"} onChange={(e) => updateConfigField("forgotFontColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>

              </div>

              {/* LIVE LOGIN SCREEN PREVIEW CARD */}
              <div className="border border-iso-border rounded-sm p-4 bg-iso-bg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-iso-primary flex items-center gap-1.5">
                    <Eye size={13} className="text-iso-accent" /> Live Login Screen Mockup Preview
                  </span>
                  <span className="text-[10px] font-mono text-iso-textMuted">Updates in real-time</span>
                </div>

                {/* Mockup Canvas */}
                <div 
                  className="w-full h-72 rounded-sm border border-iso-border relative overflow-hidden flex items-center justify-center p-4 transition-all duration-300"
                  style={{
                    backgroundColor: cfg.loginBackgroundColor || '#fdf7f7',
                    backgroundImage: cfg.backgroudImageUrl ? `url(${cfg.backgroudImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Subtle dark backdrop overlay if background image exists */}
                  {cfg.backgroudImageUrl && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                  )}

                  {/* Mockup Login Dialog Card */}
                  <div className="relative z-10 w-full max-w-xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-md p-5 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                    {/* Mock Logo */}
                    <div className="flex flex-col items-center text-center">
                      {cfg.logoBigUrl ? (
                        <img 
                          src={cfg.logoBigUrl} 
                          alt="Logo" 
                          className="max-h-10 max-w-[160px] object-contain mb-1"
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      ) : (
                        <span className="text-base font-serif font-bold text-slate-800 dark:text-slate-100">
                          {cfg.instituteName || formData.tenantName || 'isomorphic'}
                        </span>
                      )}
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500" style={{ color: cfg.forgotFontColor || '#64748b' }}>
                        {cfg.instituteName ? `${cfg.instituteName} Portal` : 'Tenant Administration Console'}
                      </span>
                    </div>

                    {/* Mock Inputs */}
                    <div className="flex flex-col gap-2">
                      <div className="h-7 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 flex items-center text-[10px] text-slate-400 font-mono">
                        username
                      </div>
                      <div className="h-7 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 flex items-center text-[10px] text-slate-400 font-mono">
                        ••••••••
                      </div>
                    </div>

                    {/* Mock Button */}
                    <button
                      type="button"
                      className="w-full py-1.5 rounded text-xs font-bold shadow-sm transition-transform cursor-default"
                      style={{
                        backgroundColor: cfg.ButtonandLeftBarColor || '#00306D',
                        color: cfg.buttonFontColor || '#ffffff',
                        borderColor: cfg.BordersColor || cfg.ButtonandLeftBarColor || '#00306D'
                      }}
                    >
                      Log In
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: BEHAVIOR */}
          {activeTab === "behavior" && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-iso-bg border border-iso-border rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-iso-primary">Show Integration Type in Chat History</h4>
                  <p className="text-[11px] text-iso-textMuted font-mono">Enables origin badges on session transcripts.</p>
                </div>
                <input type="checkbox" checked={Boolean(cfg.showIntegrationTypeInChatHistory)} onChange={(e) => updateConfigField("showIntegrationTypeInChatHistory", e.target.checked)} className="w-4 h-4 accent-iso-primary cursor-pointer" />
              </div>
              <div className="p-4 bg-iso-bg border border-iso-border rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-iso-primary">Show Job Queue Notification Icon</h4>
                  <p className="text-[11px] text-iso-textMuted font-mono">Displays ingestion processing icon in navbar.</p>
                </div>
                <input type="checkbox" checked={Boolean(cfg.showJobQueueNotificationIcon)} onChange={(e) => updateConfigField("showJobQueueNotificationIcon", e.target.checked)} className="w-4 h-4 accent-iso-primary cursor-pointer" />
              </div>
            </div>
          )}

          {/* TAB 5: ADVANCED JSON */}
          {activeTab === "json" && (
            <div className="flex flex-col gap-2">
              {jsonError && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded">{jsonError}</div>}
              <textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)} rows={16} className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs p-3 rounded-sm border border-iso-border outline-none focus:border-iso-accent" spellCheck={false} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-iso-border flex items-center justify-between bg-iso-bgSecondary/20">
          <span className="text-[10px] font-mono text-iso-textMuted">{formData.id ? `Tenant: ${formData.id}` : "New Organization"}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 bg-iso-bgSecondary hover:bg-iso-border/40 text-iso-text border border-iso-border rounded-sm text-xs font-semibold transition-all cursor-pointer">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-70 cursor-pointer">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? "Saving..." : (formData.id ? "Save Changes" : "Onboard Organization")}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

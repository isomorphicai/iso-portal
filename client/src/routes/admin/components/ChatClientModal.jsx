import React, { useState, useEffect } from "react";
import { X, Sliders, Palette, MessageSquare, FormInput, Code, Save, Loader2, Bot as BotIcon } from "lucide-react";

const DEFAULT_BOT_UI_CONFIGS = {
  botThemeColor: "#00306D",
  botChatStartImage: "https://bbh-product-bucket.s3.us-east-2.amazonaws.com/a04ac944-0efc-4f92-84cd-9463c94f0505.png",
  botResponseBackgroundColor: "#EFEFEF",
  userQueryBackgroundColor: "#EFEFEF",
  botResponseFontColor: "",
  userQueryFontColor: "",
  bgColor: "#ffffff",
  logoUrl: "https://bbh-product-bucket.s3.us-east-2.amazonaws.com/a04ac944-0efc-4f92-84cd-9463c94f0505.png",
  botHeaderText: "AI Assistant",
  DefaultEmptyMessage: "",
  helpNotificationRenderTime: 10000,
  helpNotificationRenderMsg: "Hi! I am an AI Assistant. How can I help you today?",
  idleStatMessages: [
    { message: "I’m waiting for your next question", time: 180 },
    { message: "Since there was no response from your end, we are concluding this session.", time: 240 }
  ],
  chatPosition: "fixed",
  chatPositionLeft: "auto",
  chatAlignmentLeft: false,
  chatPositionRight: "30px",
  chatPositionTop: "auto",
  chatPositionBottom: "20px",
  chatIconWidth: "90",
  chatIconHeight: "90",
  chatMobileIconWidth: "70",
  chatMobileIconHeight: "70",
  chatMobileVerticalIconWidth: "90",
  chatMobileVerticalIconHeight: "90",
  chatIconAltText: "Chat with Us",
  chatIconTitleText: "Chat with Us",
  allowMultiLangSupport: false,
  demoBackgroundUrl: "",
  likeIcon: "https://bbh-product-bucket.s3.us-east-2.amazonaws.com/dba2acac-c841-47b7-be3f-106ed4b66fef.png",
  dislikeIcon: "https://bbh-product-bucket.s3.us-east-2.amazonaws.com/a91652f3-c1f1-4396-8aab-45793777ef09.png",
  botChatSubmitButton: false,
  isChatOpened: false,
  transferFormDelay: 5,
  showThumbUpDownFeedbackform: true,
  showHelpButton: true,
  helpButtonUrl: "https://vsc.blackbelthelp.com/help",
  poweredBy: "AI powered by <span>Isomorphic</span>"
};

export default function ChatClientModal({
  isOpen,
  onClose,
  activeTenant,
  editingBot,
  onSaved,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [newGreeting, setNewGreeting] = useState("");
  const [newIdleMsg, setNewIdleMsg] = useState({ message: "", time: 180 });
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (editingBot) {
        setFormData({
          _id: editingBot._id,
          botId: editingBot.botId || editingBot.code || "",
          botName: editingBot.botName || editingBot.name || "",
          name: editingBot.name || editingBot.botName || "",
          code: editingBot.code || editingBot.botId || "",
          description: editingBot.description || "",
          botActive: editingBot.botActive !== false,
          greetingMessage: Array.isArray(editingBot.greetingMessage) ? [...editingBot.greetingMessage] : ["Hi! How can I assist you today?"],
          customForms: Array.isArray(editingBot.customForms) ? [...editingBot.customForms] : [],
          botUIConfigs: {
            ...DEFAULT_BOT_UI_CONFIGS,
            ...(editingBot.botUIConfigs || {})
          }
        });
      } else {
        const brandColor = activeTenant?.tenantConfig?.ButtonandLeftBarColor || "#00306D";
        setFormData({
          _id: null,
          botId: "",
          botName: "",
          name: "",
          code: "",
          description: "",
          botActive: true,
          greetingMessage: [`Hi! I am ${activeTenant?.name || "AI"} Assistant. How can I help you today?`],
          customForms: [],
          botUIConfigs: {
            ...DEFAULT_BOT_UI_CONFIGS,
            botThemeColor: brandColor,
            botHeaderText: `${activeTenant?.name || "ISO"} AI`
          }
        });
      }
      setActiveTab("general");
      setJsonError(null);
    }
  }, [isOpen, editingBot, activeTenant]);

  useEffect(() => {
    if (activeTab === "json") {
      setRawJson(JSON.stringify(formData, null, 2));
      setJsonError(null);
    }
  }, [activeTab]);

  const updateUIField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      botUIConfigs: {
        ...(prev.botUIConfigs || {}),
        [field]: value
      }
    }));
  };

  const addGreeting = () => {
    if (!newGreeting.trim()) return;
    setFormData(prev => ({
      ...prev,
      greetingMessage: [...(prev.greetingMessage || []), newGreeting.trim()]
    }));
    setNewGreeting("");
  };

  const removeGreeting = (idx) => {
    setFormData(prev => ({
      ...prev,
      greetingMessage: (prev.greetingMessage || []).filter((_, i) => i !== idx)
    }));
  };

  const addIdleMsg = () => {
    if (!newIdleMsg.message.trim()) return;
    setFormData(prev => ({
      ...prev,
      botUIConfigs: {
        ...prev.botUIConfigs,
        idleStatMessages: [
          ...(prev.botUIConfigs?.idleStatMessages || []),
          { message: newIdleMsg.message.trim(), time: Number(newIdleMsg.time) || 180 }
        ]
      }
    }));
    setNewIdleMsg({ message: "", time: 180 });
  };

  const removeIdleMsg = (idx) => {
    setFormData(prev => ({
      ...prev,
      botUIConfigs: {
        ...prev.botUIConfigs,
        idleStatMessages: (prev.botUIConfigs?.idleStatMessages || []).filter((_, i) => i !== idx)
      }
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
        setJsonError("Invalid JSON format: " + err.message);
        showToast("Cannot save invalid JSON schema.", "error");
        return;
      }
    }

    const finalName = (payload.botName || payload.name || "").trim();
    const finalCode = (payload.botId || payload.code || "").trim();

    if (!finalName || !finalCode) {
      showToast("Bot Name and Bot ID are required.", "error");
      return;
    }

    const targetId = activeTenant?._id || activeTenant?.tenantId || "";
    const targetDb = activeTenant?.tenantDbName || (activeTenant?.tenantId ? `iso_${activeTenant.tenantId}` : "");
    const method = payload._id ? "PUT" : "POST";
    const url = payload._id
      ? `/api/admin/bots/${payload._id}?tenantId=${encodeURIComponent(targetId)}&tenantDbName=${encodeURIComponent(targetDb)}`
      : `/api/admin/bots?tenantId=${encodeURIComponent(targetId)}&tenantDbName=${encodeURIComponent(targetDb)}`;

    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          name: finalName,
          botName: finalName,
          code: finalCode,
          botId: finalCode,
          status: payload.botActive !== false ? "active" : "inactive"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(payload._id ? "Chatbot settings updated successfully." : `Chatbot "${data.name || data.botName}" created.`);
        onSaved();
        onClose();
      } else {
        showToast(data.error || "Failed to save chatbot settings.", "error");
      }
    } catch (err) {
      showToast("Network error saving chatbot configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-sm flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: formData.botUIConfigs?.botThemeColor || "#00306D" }}
            >
              <BotIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-iso-primary">
                {formData._id ? `Edit Chatbot: ${formData.botName || formData.name}` : "Create New Chatbot Assistant"}
              </h2>
              <p className="text-[11px] text-iso-textMuted font-mono">
                Workspace: <span className="font-bold text-iso-accent">{activeTenant?.tenantDbName || `iso_${activeTenant?.tenantId}`}</span> &gt; chatClientSettings
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded-sm transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="px-6 border-b border-iso-border flex gap-1 bg-iso-bg text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "general" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Sliders size={13} /> General & Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ui_theme")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "ui_theme" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Palette size={13} /> Widget UI & Colors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("messages")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "messages" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <MessageSquare size={13} /> Greetings & Idle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("forms")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "forms" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <FormInput size={13} /> Custom Forms ({formData.customForms?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "json" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Code size={13} /> Advanced Schema (JSON)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] flex-1 text-xs">
          
          {/* TAB 1: GENERAL & STATUS */}
          {activeTab === "general" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                    Bot Display Name (botName) <span className="text-iso-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.botName || formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, botName: e.target.value, name: e.target.value })}
                    placeholder="e.g. ISO Bot"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                    Bot Identifier (botId) <span className="text-iso-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.botId || formData.code || ""}
                    onChange={(e) => setFormData({ ...formData, botId: e.target.value, code: e.target.value })}
                    placeholder="e.g. ISOBot"
                    disabled={formData._id !== null}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of bot functions..."
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                    Operational Status (botActive)
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, botActive: !formData.botActive })}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.botActive ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.botActive ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                    <span className="text-xs font-bold font-mono">
                      {formData.botActive ? <span className="text-emerald-700">ACTIVE BOT</span> : <span className="text-slate-500">INACTIVE</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WIDGET UI & THEME */}
          {activeTab === "ui_theme" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Primary Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.botUIConfigs?.botThemeColor || "#00306D"} onChange={(e) => updateUIField("botThemeColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={formData.botUIConfigs?.botThemeColor || "#00306D"} onChange={(e) => updateUIField("botThemeColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Header Title Text</label>
                  <input type="text" value={formData.botUIConfigs?.botHeaderText || ""} onChange={(e) => updateUIField("botHeaderText", e.target.value)} placeholder="ISO AI" className="w-full bg-iso-cardBg border border-iso-border rounded px-2.5 py-1 text-xs text-iso-text outline-none" />
                </div>
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Widget Background</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.botUIConfigs?.bgColor || "#ffffff"} onChange={(e) => updateUIField("bgColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={formData.botUIConfigs?.bgColor || "#ffffff"} onChange={(e) => updateUIField("bgColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">Bot Bubble Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.botUIConfigs?.botResponseBackgroundColor || "#EFEFEF"} onChange={(e) => updateUIField("botResponseBackgroundColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={formData.botUIConfigs?.botResponseBackgroundColor || "#EFEFEF"} onChange={(e) => updateUIField("botResponseBackgroundColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1.5 font-semibold">User Bubble Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.botUIConfigs?.userQueryBackgroundColor || "#EFEFEF"} onChange={(e) => updateUIField("userQueryBackgroundColor", e.target.value)} className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0" />
                    <input type="text" value={formData.botUIConfigs?.userQueryBackgroundColor || "#EFEFEF"} onChange={(e) => updateUIField("userQueryBackgroundColor", e.target.value)} className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Logo Avatar URL (logoUrl)</label>
                  <input type="url" value={formData.botUIConfigs?.logoUrl || ""} onChange={(e) => updateUIField("logoUrl", e.target.value)} placeholder="https://.../logo.png" className="w-full bg-iso-cardBg border border-iso-border rounded px-3 py-1.5 text-xs text-iso-text outline-none font-mono" />
                </div>
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Start Screen Graphic URL (botChatStartImage)</label>
                  <input type="url" value={formData.botUIConfigs?.botChatStartImage || ""} onChange={(e) => updateUIField("botChatStartImage", e.target.value)} placeholder="https://.../start.png" className="w-full bg-iso-cardBg border border-iso-border rounded px-3 py-1.5 text-xs text-iso-text outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-iso-border">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-iso-bg rounded border border-iso-border">
                  <input type="checkbox" checked={Boolean(formData.botUIConfigs?.showHelpButton)} onChange={(e) => updateUIField("showHelpButton", e.target.checked)} className="w-4 h-4 accent-iso-primary" />
                  <span className="font-semibold text-xs">Show Help Link</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-iso-bg rounded border border-iso-border">
                  <input type="checkbox" checked={Boolean(formData.botUIConfigs?.showThumbUpDownFeedbackform)} onChange={(e) => updateUIField("showThumbUpDownFeedbackform", e.target.checked)} className="w-4 h-4 accent-iso-primary" />
                  <span className="font-semibold text-xs">Thumbs Rating Form</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-iso-bg rounded border border-iso-border">
                  <input type="checkbox" checked={Boolean(formData.botUIConfigs?.botChatSubmitButton)} onChange={(e) => updateUIField("botChatSubmitButton", e.target.checked)} className="w-4 h-4 accent-iso-primary" />
                  <span className="font-semibold text-xs">Send Button Visible</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: GREETINGS & IDLE */}
          {activeTab === "messages" && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Greeting Messages (greetingMessage)</label>
                <div className="flex flex-col gap-2 p-3 bg-iso-bg border border-iso-border rounded-sm">
                  {(formData.greetingMessage || []).map((msg, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-iso-cardBg border border-iso-border rounded px-3 py-1.5">
                      <span className="text-xs text-iso-text">{msg}</span>
                      <button type="button" onClick={() => removeGreeting(idx)} className="text-iso-textMuted hover:text-iso-error"><X size={13} /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <input type="text" value={newGreeting} onChange={(e) => setNewGreeting(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGreeting(); } }} placeholder="Add greeting message..." className="flex-1 bg-iso-cardBg border border-iso-border rounded px-3 py-1 text-xs outline-none" />
                    <button type="button" onClick={addGreeting} className="px-3 py-1 bg-iso-bgSecondary hover:bg-iso-accent hover:text-white border border-iso-border rounded text-xs font-bold">Add</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">Idle Timeout Messages (idleStatMessages)</label>
                <div className="flex flex-col gap-2 p-3 bg-iso-bg border border-iso-border rounded-sm">
                  {(formData.botUIConfigs?.idleStatMessages || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-iso-cardBg border border-iso-border rounded px-3 py-1.5">
                      <div>
                        <span className="text-xs text-iso-text">{item.message}</span>
                        <span className="ml-2 px-1.5 py-0.5 bg-iso-bgSecondary border border-iso-border rounded text-[9px] font-mono text-iso-accent font-bold">{item.time}s</span>
                      </div>
                      <button type="button" onClick={() => removeIdleMsg(idx)} className="text-iso-textMuted hover:text-iso-error"><X size={13} /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <input type="text" value={newIdleMsg.message} onChange={(e) => setNewIdleMsg({ ...newIdleMsg, message: e.target.value })} placeholder="Idle notice..." className="flex-1 bg-iso-cardBg border border-iso-border rounded px-3 py-1 text-xs outline-none" />
                    <input type="number" value={newIdleMsg.time} onChange={(e) => setNewIdleMsg({ ...newIdleMsg, time: e.target.value })} placeholder="180" className="w-20 bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono outline-none" />
                    <button type="button" onClick={addIdleMsg} className="px-3 py-1 bg-iso-bgSecondary hover:bg-iso-accent hover:text-white border border-iso-border rounded text-xs font-bold">Add</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM FORMS */}
          {activeTab === "forms" && (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block font-semibold">Registered Custom Forms ({formData.customForms?.length || 0})</label>
              {(formData.customForms || []).map((form, idx) => (
                <div key={idx} className="p-3 bg-iso-cardBg border border-iso-border rounded-sm flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-iso-primary text-xs">{form.title || form.name}</span>
                    <span className="font-mono text-[9px] text-iso-accent bg-iso-bgSecondary px-1.5 py-0.5 rounded border border-iso-border">{form.name}</span>
                  </div>
                  <p className="text-[10px] text-iso-textMuted font-mono">
                    Intent: {(form.intent || []).join(", ") || "none"} | Fields: {(form.payload?.fields || form.fields || []).length}
                  </p>
                </div>
              ))}
              {(formData.customForms || []).length === 0 && (
                <p className="text-xs text-iso-textMuted italic bg-iso-bgSecondary/20 p-4 rounded text-center">No interactive forms registered.</p>
              )}
            </div>
          )}

          {/* TAB 5: ADVANCED JSON SCHEMA */}
          {activeTab === "json" && (
            <div className="flex flex-col gap-2">
              {jsonError && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded">{jsonError}</div>}
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                rows={16}
                className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs p-3 rounded-sm border border-iso-border outline-none focus:border-iso-accent"
                spellCheck={false}
              />
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-iso-border flex items-center justify-between bg-iso-bgSecondary/20">
          <span className="text-[10px] font-mono text-iso-textMuted">{formData._id ? `Bot: ${formData.botId}` : "New Chatbot Instance"}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 bg-iso-bgSecondary hover:bg-iso-border/40 text-iso-text border border-iso-border rounded-sm text-xs font-semibold transition-all">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-70">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? "Saving..." : (formData._id ? "Save Changes" : "Create Chatbot")}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

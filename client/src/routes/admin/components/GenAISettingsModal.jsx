import React, { useState, useEffect } from "react";
import { X, Sliders, MessageSquare, Code, Sparkles, Save, Loader2 } from "lucide-react";

export default function GenAISettingsModal({
  isOpen,
  onClose,
  activeTenant,
  selectedBot,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("models");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [newFallback, setNewFallback] = useState("");
  const [newIntent, setNewIntent] = useState("");

  const targetBotId = selectedBot?.code || selectedBot?.botId || selectedBot?.name || "ISOBot";
  const targetDb = activeTenant?.tenantDbName || (activeTenant?.tenantId ? `iso_${activeTenant.tenantId}` : "");
  const targetTenantId = activeTenant?._id || activeTenant?.tenantId || "";

  useEffect(() => {
    if (isOpen && activeTenant) {
      loadSettings();
    }
  }, [isOpen, activeTenant, selectedBot]);

  useEffect(() => {
    if (activeTab === "json") {
      setRawJson(JSON.stringify(formData, null, 2));
      setJsonError(null);
    }
  }, [activeTab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/genai-settings?tenantId=${encodeURIComponent(targetTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}&botId=${encodeURIComponent(targetBotId)}`);
      const data = await res.json();
      if (res.ok) {
        setFormData({
          botId: targetBotId,
          tenantFullName: data.tenantFullName || activeTenant?.name || "",
          genAiEnabled: data.genAiEnabled !== undefined ? data.genAiEnabled : true,
          intentEnabled: Array.isArray(data.intentEnabled) ? data.intentEnabled : ["transfer_call", "smalltalk.greetings.bye"],
          chatBotFlag: data.chatBotFlag !== undefined ? data.chatBotFlag : true,
          conversationHistoryLimit: data.conversationHistoryLimit || 5,
          includeConversationHistoryInAnswerGeneration: data.includeConversationHistoryInAnswerGeneration !== undefined ? data.includeConversationHistoryInAnswerGeneration : true,
          includeConversationHistoryInQueryRewriter: data.includeConversationHistoryInQueryRewriter !== undefined ? data.includeConversationHistoryInQueryRewriter : true,
          textGenerationModel: data.textGenerationModel || "us.meta.llama3-3-70b-instruct-v1:0",
          embeddingsGenerationModel: data.embeddingsGenerationModel || "amazon.titan-embed-text-v2:0",
          embeddingsModelDimentions: data.embeddingsModelDimentions || 1024,
          chunkSize: data.chunkSize || 3000,
          chunkOverlapSize: data.chunkOverlapSize || 1000,
          maxTokens: data.maxTokens || 300,
          systemPrompt: data.systemPrompt || "You are $$tenantFullName virtual assistant. Answer the user query using only the provided context.",
          answerGenerationPrompt: data.answerGenerationPrompt || "<context>\n$$context\n</context>\n\nUsers Original Question: $$userQuery\n\nAnswer:",
          queryRewritePrompt: data.queryRewritePrompt || "You are an expert at rewriting questions for an enterprise chatbot.",
          improvedQueryRewriter: data.improvedQueryRewriter !== undefined ? data.improvedQueryRewriter : true,
          improvedQueryRewriterPrompt: data.improvedQueryRewriterPrompt || "You are a query planning assistant for a Retrieval Augmented Generation system.",
          fallbackTexts: Array.isArray(data.fallbackTexts) ? data.fallbackTexts : ["I do not understand", "I cannot answer", "try rephrasing"],
          defaultFallbackAnswer: data.defaultFallbackAnswer || "<p class=\"msgcontent\">I am sorry; I do not understand your question. Can you try rephrasing it?</p>",
          searchConfig: data.searchConfig || { type: "hybrid", weights: { knn: 0.7, multiMatch: 0.3 } },
          firecrawlConfigs: data.firecrawlConfigs || { proxy: "basic" },
          ...data
        });
      }
    } catch (err) {
      showToast("Error loading Gen AI settings.", "error");
    } finally {
      setLoading(false);
    }
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
        showToast("Cannot save invalid JSON.", "error");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/genai-settings?tenantId=${encodeURIComponent(targetTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}&botId=${encodeURIComponent(targetBotId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Gen AI settings for "${targetBotId}" saved successfully.`);
        onClose();
      } else {
        showToast("Failed to save Gen AI settings.", "error");
      }
    } catch (err) {
      showToast("Network error saving Gen AI settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const addFallback = () => {
    if (!newFallback.trim()) return;
    setFormData(prev => ({
      ...prev,
      fallbackTexts: [...(prev.fallbackTexts || []), newFallback.trim()]
    }));
    setNewFallback("");
  };

  const removeFallback = (idx) => {
    setFormData(prev => ({
      ...prev,
      fallbackTexts: (prev.fallbackTexts || []).filter((_, i) => i !== idx)
    }));
  };

  const addIntent = () => {
    if (!newIntent.trim()) return;
    setFormData(prev => ({
      ...prev,
      intentEnabled: [...(prev.intentEnabled || []), newIntent.trim()]
    }));
    setNewIntent("");
  };

  const removeIntent = (idx) => {
    setFormData(prev => ({
      ...prev,
      intentEnabled: (prev.intentEnabled || []).filter((_, i) => i !== idx)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-iso-primary">
                Gen AI Settings: <span className="text-iso-accent">{selectedBot?.name || selectedBot?.botName || targetBotId}</span>
              </h2>
              <p className="text-[11px] text-iso-textMuted font-mono">
                Bot ID: <span className="font-bold text-iso-primary">{targetBotId}</span> | Workspace: <span className="font-bold text-iso-accent">{targetDb}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded-sm transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-iso-border flex gap-1 bg-iso-bg text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("models")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "models" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Sliders size={13} /> LLM & RAG Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prompts")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "prompts" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <MessageSquare size={13} /> Prompts & Context
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fallbacks")}
            className={`px-3.5 py-2.5 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "fallbacks" ? "border-iso-primary text-iso-primary font-bold" : "border-transparent text-iso-textMuted hover:text-iso-text"
            }`}
          >
            <Sparkles size={13} /> Fallbacks & Intents
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
          {loading ? (
            <div className="py-16 text-center text-iso-textMuted flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-iso-accent" />
              <span>Loading Gen AI settings for {targetBotId}...</span>
            </div>
          ) : (
            <>
              {activeTab === "models" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-iso-primary">Generative AI Engine</h4>
                        <p className="text-[11px] text-iso-textMuted font-mono">genAiEnabled</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.genAiEnabled)}
                        onChange={(e) => setFormData({ ...formData, genAiEnabled: e.target.checked })}
                        className="w-4 h-4 accent-iso-primary cursor-pointer"
                      />
                    </div>
                    <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-iso-primary">Improved Query Rewriter</h4>
                        <p className="text-[11px] text-iso-textMuted font-mono">improvedQueryRewriter</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.improvedQueryRewriter)}
                        onChange={(e) => setFormData({ ...formData, improvedQueryRewriter: e.target.checked })}
                        className="w-4 h-4 accent-iso-primary cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        Text Generation Model (textGenerationModel)
                      </label>
                      <input
                        type="text"
                        value={formData.textGenerationModel || ""}
                        onChange={(e) => setFormData({ ...formData, textGenerationModel: e.target.value })}
                        placeholder="us.meta.llama3-3-70b-instruct-v1:0"
                        className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        Embeddings Model (embeddingsGenerationModel)
                      </label>
                      <input
                        type="text"
                        value={formData.embeddingsGenerationModel || ""}
                        onChange={(e) => setFormData({ ...formData, embeddingsGenerationModel: e.target.value })}
                        placeholder="amazon.titan-embed-text-v2:0"
                        className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        Dimensions
                      </label>
                      <input
                        type="number"
                        value={formData.embeddingsModelDimentions || 1024}
                        onChange={(e) => setFormData({ ...formData, embeddingsModelDimentions: parseInt(e.target.value) || 1024 })}
                        className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        Chunk Size
                      </label>
                      <input
                        type="number"
                        value={formData.chunkSize || 3000}
                        onChange={(e) => setFormData({ ...formData, chunkSize: parseInt(e.target.value) || 3000 })}
                        className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        Chunk Overlap
                      </label>
                      <input
                        type="number"
                        value={formData.chunkOverlapSize || 1000}
                        onChange={(e) => setFormData({ ...formData, chunkOverlapSize: parseInt(e.target.value) || 1000 })}
                        className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={formData.maxTokens || 300}
                        onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 300 })}
                        className="w-full bg-iso-bg border border-iso-border rounded px-3 py-1.5 text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-iso-border">
                    <div className="p-3 bg-iso-bg border border-iso-border rounded-sm">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                        History Turns Limit
                      </label>
                      <input
                        type="number"
                        value={formData.conversationHistoryLimit || 5}
                        onChange={(e) => setFormData({ ...formData, conversationHistoryLimit: parseInt(e.target.value) || 5 })}
                        className="w-full bg-iso-cardBg border border-iso-border rounded px-2.5 py-1 text-xs font-mono outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-iso-bg rounded border border-iso-border">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.includeConversationHistoryInAnswerGeneration)}
                        onChange={(e) => setFormData({ ...formData, includeConversationHistoryInAnswerGeneration: e.target.checked })}
                        className="w-4 h-4 accent-iso-primary"
                      />
                      <span className="font-semibold text-xs">Include History in Answer</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-iso-bg rounded border border-iso-border">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.includeConversationHistoryInQueryRewriter)}
                        onChange={(e) => setFormData({ ...formData, includeConversationHistoryInQueryRewriter: e.target.checked })}
                        className="w-4 h-4 accent-iso-primary"
                      />
                      <span className="font-semibold text-xs">Include History in Rewriter</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "prompts" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                      System Prompt / Persona Definition (systemPrompt)
                    </label>
                    <textarea
                      value={formData.systemPrompt || ""}
                      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                      rows={5}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-3 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                      Answer Generation Prompt Template (answerGenerationPrompt)
                    </label>
                    <textarea
                      value={formData.answerGenerationPrompt || ""}
                      onChange={(e) => setFormData({ ...formData, answerGenerationPrompt: e.target.value })}
                      rows={6}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-3 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                      Query Rewrite Prompt (queryRewritePrompt)
                    </label>
                    <textarea
                      value={formData.queryRewritePrompt || ""}
                      onChange={(e) => setFormData({ ...formData, queryRewritePrompt: e.target.value })}
                      rows={6}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-3 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {activeTab === "fallbacks" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                      Fallback Trigger Phrases (fallbackTexts)
                    </label>
                    <div className="flex flex-col gap-2 p-3 bg-iso-bg border border-iso-border rounded-sm">
                      <div className="flex flex-wrap gap-1.5">
                        {(formData.fallbackTexts || []).map((fb, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-iso-bgSecondary border border-iso-border rounded text-xs font-semibold text-iso-primary flex items-center gap-1.5">
                            <span>{fb}</span>
                            <button type="button" onClick={() => removeFallback(idx)} className="text-iso-textMuted hover:text-iso-error"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={newFallback}
                          onChange={(e) => setNewFallback(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFallback(); } }}
                          placeholder="Add fallback phrase..."
                          className="flex-1 bg-iso-cardBg border border-iso-border rounded px-3 py-1 text-xs outline-none"
                        />
                        <button type="button" onClick={addFallback} className="px-3 py-1 bg-iso-bgSecondary hover:bg-iso-accent hover:text-white border border-iso-border rounded text-xs font-bold">Add</button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                      Enabled Intents (intentEnabled)
                    </label>
                    <div className="flex flex-col gap-2 p-3 bg-iso-bg border border-iso-border rounded-sm">
                      <div className="flex flex-wrap gap-1.5">
                        {(formData.intentEnabled || []).map((intent, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-iso-bgSecondary border border-iso-border rounded text-xs font-mono text-iso-accent font-bold flex items-center gap-1.5">
                            <span>{intent}</span>
                            <button type="button" onClick={() => removeIntent(idx)} className="text-iso-textMuted hover:text-iso-error"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={newIntent}
                          onChange={(e) => setNewIntent(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIntent(); } }}
                          placeholder="Add intent tag (e.g. transfer_call)..."
                          className="flex-1 bg-iso-cardBg border border-iso-border rounded px-3 py-1 text-xs outline-none font-mono"
                        />
                        <button type="button" onClick={addIntent} className="px-3 py-1 bg-iso-bgSecondary hover:bg-iso-accent hover:text-white border border-iso-border rounded text-xs font-bold">Add</button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                      Default Fallback Answer HTML (defaultFallbackAnswer)
                    </label>
                    <textarea
                      value={formData.defaultFallbackAnswer || ""}
                      onChange={(e) => setFormData({ ...formData, defaultFallbackAnswer: e.target.value })}
                      rows={5}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-3 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>
                </div>
              )}

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
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-iso-border flex items-center justify-between bg-iso-bgSecondary/20">
          <span className="text-[10px] font-mono text-iso-textMuted">Target Collection: {targetDb} &gt; genAISettings</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 bg-iso-bgSecondary hover:bg-iso-border/40 text-iso-text border border-iso-border rounded-sm text-xs font-semibold transition-all">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-70">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? "Saving..." : "Save AI Settings"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

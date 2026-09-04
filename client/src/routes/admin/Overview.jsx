import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, Send, Loader2, Palette, MessageSquare, 
  HelpCircle, FormInput, Code2, Save, Trash2, 
  Copy, RefreshCw, Plus, X, Eye, CheckCircle2, 
  Sparkles, Layers, ArrowUpRight
} from 'lucide-react';

const DEFAULT_UI_CONFIGS = {
  botThemeColor: '#00306D',
  botChatStartImage: 'https://bbh-product-bucket.s3.us-east-2.amazonaws.com/a04ac944-0efc-4f92-84cd-9463c94f0505.png',
  botResponseBackgroundColor: '#EFEFEF',
  userQueryBackgroundColor: '#EFEFEF',
  botResponseFontColor: '#1F2937',
  userQueryFontColor: '#1F2937',
  bgColor: '#ffffff',
  logoUrl: 'https://bbh-product-bucket.s3.us-east-2.amazonaws.com/a04ac944-0efc-4f92-84cd-9463c94f0505.png',
  botHeaderText: 'ISO AI Assistant',
  DefaultEmptyMessage: 'Type your message...',
  helpNotificationRenderTime: 10000,
  helpNotificationRenderMsg: 'Hi! I am ISO AI Assistant. I can help answer your questions and resolve common issues.',
  idleStatMessages: [
    { message: 'I’m waiting for your next question', time: 180 },
    { message: 'Since there was no response from your end, we are concluding this session. Feel free to re-initiate anytime!', time: 240 }
  ],
  chatPosition: 'fixed',
  chatPositionLeft: 'auto',
  chatAlignmentLeft: false,
  chatPositionRight: '30px',
  chatPositionTop: 'auto',
  chatPositionBottom: '20px',
  chatIconWidth: '90',
  chatIconHeight: '90',
  botChatSubmitButton: true,
  showHelpButton: true,
  helpButtonUrl: 'https://vsc.blackbelthelp.com/help',
  showThumbUpDownFeedbackform: true
};

export default function Overview({ selectedTenant, selectedBot, setSelectedBot, fetchBots, showToast }) {
  // Tab Navigation: 'ai' | 'theme' | 'messages' | 'forms' | 'raw_json'
  const [activeTab, setActiveTab] = useState('ai');
  const [rightPanelTab, setRightPanelTab] = useState('chat'); // 'chat' | 'preview'

  // Full Configuration State
  const [botForm, setBotForm] = useState({
    name: '',
    code: '',
    description: '',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    systemPrompt: '',
    status: 'active',
    botActive: true,
    chatApiUrl: '',
    greetingMessage: ['Hi! I’m your AI assistant. How can I assist you today?'],
    quickReplies: ['What can you do?', 'Technology Support', 'Transfer to Live Agent', 'End Chat Session'],
    customForms: [],
    botUIConfigs: { ...DEFAULT_UI_CONFIGS }
  });

  // Raw JSON state
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);

  // Quick Reply & Greeting Form Input helpers
  const [newGreeting, setNewGreeting] = useState('');
  const [newQuickReply, setNewQuickReply] = useState('');
  const [newIdleMsg, setNewIdleMsg] = useState({ message: '', time: 180 });

  // Sandbox Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Sync form state when selectedBot changes
  useEffect(() => {
    if (selectedBot) {
      const greetings = Array.isArray(selectedBot.greetingMessage)
        ? selectedBot.greetingMessage
        : (selectedBot.greetingMessage ? [selectedBot.greetingMessage] : ['Hi! How can I assist you today?']);

      const quickReplies = Array.isArray(selectedBot.quickReplies)
        ? selectedBot.quickReplies
        : ['Academic Assistance', 'Technology Support', 'Transfer to Live Agent', 'End Chat Session'];

      const initialUI = {
        ...DEFAULT_UI_CONFIGS,
        botHeaderText: selectedBot.name || 'ISO AI Assistant',
        ...(selectedBot.botUIConfigs || {})
      };

      const initialFormData = {
        _id: selectedBot._id,
        name: selectedBot.name || '',
        botName: selectedBot.name || '',
        code: selectedBot.code || '',
        botId: selectedBot.code || '',
        description: selectedBot.description || '',
        model: selectedBot.model || 'gpt-4-turbo',
        temperature: selectedBot.temperature !== undefined ? selectedBot.temperature : 0.7,
        systemPrompt: selectedBot.systemPrompt || '',
        status: selectedBot.status || 'active',
        botActive: selectedBot.botActive !== undefined ? selectedBot.botActive : (selectedBot.status === 'active'),
        chatApiUrl: selectedBot.chatApiUrl || selectedBot.apiEndpoint || '',
        greetingMessage: greetings,
        quickReplies: quickReplies,
        customForms: selectedBot.customForms || [],
        botUIConfigs: initialUI
      };

      setBotForm(initialFormData);
      setRawJsonText(JSON.stringify({ ...selectedBot, ...initialFormData }, null, 2));
      setJsonError(null);

      setChatMessages([
        { 
          id: 'welcome', 
          role: 'assistant', 
          content: greetings[0] || `Connection established. I am running as "${selectedBot.name}" with the ${selectedBot.model} engine. Ask me anything to test my settings!`, 
          timestamp: new Date() 
        }
      ]);
    }
  }, [selectedBot]);

  // Scroll chat sandbox
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  if (!selectedBot) {
    return (
      <div className="border border-dashed border-iso-border rounded-sm p-16 text-center bg-iso-cardBg">
        <Layers size={36} className="mx-auto text-iso-accent mb-3 opacity-80" />
        <h3 className="text-sm font-bold text-iso-primary mb-1">No Chatbot Instance Selected</h3>
        <p className="text-xs text-iso-textMuted font-mono">
          Select an existing chatbot from the Tenants list or create a new one to edit its configuration & parameters.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // Form Field Update Handlers
  // ----------------------------------------------------
  const updateUIConfig = (key, value) => {
    setBotForm(prev => ({
      ...prev,
      botUIConfigs: {
        ...prev.botUIConfigs,
        [key]: value
      }
    }));
  };

  const addGreeting = () => {
    if (!newGreeting.trim()) return;
    setBotForm(prev => ({
      ...prev,
      greetingMessage: [...prev.greetingMessage, newGreeting.trim()]
    }));
    setNewGreeting('');
  };

  const removeGreeting = (idx) => {
    setBotForm(prev => ({
      ...prev,
      greetingMessage: prev.greetingMessage.filter((_, i) => i !== idx)
    }));
  };

  const addQuickReply = () => {
    if (!newQuickReply.trim()) return;
    setBotForm(prev => ({
      ...prev,
      quickReplies: [...prev.quickReplies, newQuickReply.trim()]
    }));
    setNewQuickReply('');
  };

  const removeQuickReply = (idx) => {
    setBotForm(prev => ({
      ...prev,
      quickReplies: prev.quickReplies.filter((_, i) => i !== idx)
    }));
  };

  const addIdleMessage = () => {
    if (!newIdleMsg.message.trim()) return;
    setBotForm(prev => ({
      ...prev,
      botUIConfigs: {
        ...prev.botUIConfigs,
        idleStatMessages: [
          ...(prev.botUIConfigs.idleStatMessages || []),
          { message: newIdleMsg.message.trim(), time: Number(newIdleMsg.time) || 180 }
        ]
      }
    }));
    setNewIdleMsg({ message: '', time: 180 });
  };

  const removeIdleMessage = (idx) => {
    setBotForm(prev => ({
      ...prev,
      botUIConfigs: {
        ...prev.botUIConfigs,
        idleStatMessages: (prev.botUIConfigs.idleStatMessages || []).filter((_, i) => i !== idx)
      }
    }));
  };

  // ----------------------------------------------------
  // Save Full Config
  // ----------------------------------------------------
  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    setSaveLoading(true);

    try {
      let payload = { ...botForm };

      // If currently on raw_json tab, parse the raw JSON first
      if (activeTab === 'raw_json') {
        try {
          const parsed = JSON.parse(rawJsonText);
          payload = parsed;
        } catch (err) {
          setJsonError('Invalid JSON format: ' + err.message);
          showToast('Cannot save invalid JSON schema.', 'error');
          setSaveLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/admin/bots/${selectedBot._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Chatbot configuration saved successfully.');
        setSelectedBot(data);
        setRawJsonText(JSON.stringify(data, null, 2));
        if (fetchBots && selectedTenant) fetchBots(selectedTenant._id, data._id);
      } else {
        showToast(data.error || 'Failed to update chatbot configuration.', 'error');
      }
    } catch (err) {
      showToast('Network error updating chatbot configuration.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // ----------------------------------------------------
  // Duplicate / Clone Bot
  // ----------------------------------------------------
  const handleDuplicateBot = async () => {
    if (!confirm(`Duplicate chatbot "${selectedBot.name}"?`)) return;
    setDuplicateLoading(true);
    try {
      const res = await fetch(`/api/admin/bots/${selectedBot._id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Chatbot cloned successfully as "${data.name}".`);
        if (fetchBots && selectedTenant) fetchBots(selectedTenant._id, data._id);
      } else {
        showToast(data.error || 'Failed to duplicate bot.', 'error');
      }
    } catch (err) {
      showToast('Error duplicating chatbot.', 'error');
    } finally {
      setDuplicateLoading(false);
    }
  };

  // ----------------------------------------------------
  // Delete Bot
  // ----------------------------------------------------
  const handleDeleteBot = async () => {
    if (!confirm(`Warning: Permanently delete chatbot "${selectedBot.name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/bots/${selectedBot._id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Chatbot removed successfully.');
        if (fetchBots && selectedTenant) fetchBots(selectedTenant._id);
      } else {
        showToast('Failed to delete chatbot.', 'error');
      }
    } catch (err) {
      showToast('Network error deleting chatbot.', 'error');
    }
  };

  // ----------------------------------------------------
  // Sandbox Chat
  // ----------------------------------------------------
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`/api/client/bots/${selectedBot._id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString() + '-reply',
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(data.timestamp)
        }]);
      } else {
        showToast('Chat endpoint returned an error.', 'error');
      }
    } catch (err) {
      showToast('Network timeout connecting to chat backend.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const ui = botForm.botUIConfigs || {};

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Header & Fast Action Toolbar */}
      <div className="border-b border-iso-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-iso-textMuted uppercase tracking-wider mb-1">
            <span>{selectedTenant?.name || 'Tenant'}</span>
            <span>/</span>
            <span className="text-iso-accent font-bold">{selectedBot.code || selectedBot.botId}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-iso-primary flex items-center gap-2.5">
            <span>{botForm.name || selectedBot.name}</span>
            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-sm border ${
              botForm.status === 'active' 
                ? 'bg-iso-successBg border-iso-success text-iso-success' 
                : 'bg-iso-bgSecondary border-iso-border text-iso-textMuted'
            }`}>
              {botForm.status ? botForm.status.toUpperCase() : 'ACTIVE'}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDuplicateBot}
            disabled={duplicateLoading}
            className="px-3 py-1.5 bg-iso-bgSecondary hover:bg-iso-accent/15 text-iso-primary border border-iso-border hover:border-iso-accent rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Duplicate this chatbot"
          >
            {duplicateLoading ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
            <span>{duplicateLoading ? 'Cloning...' : 'Clone'}</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteBot}
            className="px-3 py-1.5 bg-iso-errorBg hover:bg-red-100 text-iso-error border border-red-200 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Delete this chatbot"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saveLoading}
            className="px-4 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-70"
          >
            {saveLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saveLoading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Config Tabs (3 cols) + Right Sandbox/Preview (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Left Side: Multi-Tab Configuration Studio */}
        <div className="lg:col-span-3 bg-iso-cardBg border border-iso-border rounded-sm flex flex-col shadow-sm overflow-hidden">
          
          {/* Studio Navigation Tabs */}
          <div className="flex border-b border-iso-border bg-iso-bgSecondary/40 text-xs font-mono overflow-x-auto">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'ai' 
                  ? 'border-iso-primary text-iso-primary bg-iso-cardBg' 
                  : 'border-transparent text-iso-textMuted hover:text-iso-text'
              }`}
            >
              <Sliders size={13} />
              <span>AI Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('theme')}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'theme' 
                  ? 'border-iso-primary text-iso-primary bg-iso-cardBg' 
                  : 'border-transparent text-iso-textMuted hover:text-iso-text'
              }`}
            >
              <Palette size={13} />
              <span>Widget UI & Theme</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'messages' 
                  ? 'border-iso-primary text-iso-primary bg-iso-cardBg' 
                  : 'border-transparent text-iso-textMuted hover:text-iso-text'
              }`}
            >
              <MessageSquare size={13} />
              <span>Greetings & Idle</span>
            </button>

            <button
              onClick={() => setActiveTab('forms')}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'forms' 
                  ? 'border-iso-primary text-iso-primary bg-iso-cardBg' 
                  : 'border-transparent text-iso-textMuted hover:text-iso-text'
              }`}
            >
              <FormInput size={13} />
              <span>Quick Replies & Forms</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('raw_json');
                setRawJsonText(JSON.stringify(botForm, null, 2));
              }}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
                activeTab === 'raw_json' 
                  ? 'border-iso-primary text-iso-primary bg-iso-cardBg' 
                  : 'border-transparent text-iso-textMuted hover:text-iso-text'
              }`}
            >
              <Code2 size={13} />
              <span>Advanced Schema (JSON)</span>
            </button>
          </div>

          {/* Tab 1: AI Engine & Parameters */}
          {activeTab === 'ai' && (
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Bot Name</label>
                  <input 
                    type="text" 
                    value={botForm.name}
                    onChange={(e) => setBotForm({...botForm, name: e.target.value, botName: e.target.value})}
                    placeholder="e.g. ISO Support Agent"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Slug / Identifier</label>
                  <input 
                    type="text" 
                    value={botForm.code}
                    onChange={(e) => setBotForm({...botForm, code: e.target.value.toLowerCase(), botId: e.target.value.toLowerCase()})}
                    placeholder="e.g. iso-support"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Description</label>
                <input 
                  type="text" 
                  value={botForm.description}
                  onChange={(e) => setBotForm({...botForm, description: e.target.value})}
                  placeholder="Primary objective and persona description"
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">AI Model Engine</label>
                  <select 
                    value={botForm.model}
                    onChange={(e) => setBotForm({...botForm, model: e.target.value})}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none cursor-pointer"
                  >
                    <option value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (OpenAI)</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                    <option value="claude-3-opus">Claude 3 Opus (Anthropic)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</option>
                    <option value="custom-llama-3">Llama 3 70B (Self-hosted)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted">Temperature</label>
                    <span className="text-[10px] font-mono text-iso-primary bg-iso-bgSecondary px-1.5 py-0.5 rounded-sm border border-iso-border">{botForm.temperature}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1.2" 
                    step="0.1"
                    value={botForm.temperature}
                    onChange={(e) => setBotForm({...botForm, temperature: parseFloat(e.target.value)})}
                    className="w-full h-1 bg-iso-border appearance-none cursor-pointer accent-iso-primary"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-iso-textMuted mt-1">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.2)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">System Instructions & Prompt Guardrails</label>
                <textarea 
                  rows="5"
                  value={botForm.systemPrompt}
                  onChange={(e) => setBotForm({...botForm, systemPrompt: e.target.value})}
                  placeholder="Define role boundaries, capabilities, tone of voice, knowledge scope, and safety directives."
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-3 text-xs text-iso-text outline-none resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Chat API Endpoint (Optional Override)</label>
                  <input 
                    type="text" 
                    value={botForm.chatApiUrl}
                    onChange={(e) => setBotForm({...botForm, chatApiUrl: e.target.value})}
                    placeholder="http://localhost:5001/api/chat"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-between border border-iso-border p-3 rounded-sm bg-iso-bgSecondary/20">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-iso-text block font-bold">Bot Status</span>
                    <span className="text-[9px] text-iso-textMuted font-mono">Enable or disable live interactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !botForm.botActive;
                        setBotForm({
                          ...botForm,
                          botActive: next,
                          status: next ? 'active' : 'inactive'
                        });
                      }}
                      className={`w-10 h-5.5 rounded-sm transition-all relative outline-none flex items-center border ${
                        botForm.botActive ? 'bg-iso-primary border-iso-primary' : 'bg-iso-bgSecondary border-iso-border'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm bg-white shadow absolute transition-all transform ${
                        botForm.botActive ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <span className="text-[10px] font-bold font-mono text-iso-text">
                      {botForm.botActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Widget UI & Theme Customization */}
          {activeTab === 'theme' && (
            <div className="p-6 flex flex-col gap-4">
              <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                Visual Branding & Color Scheme
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Primary Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={ui.botThemeColor || '#00306D'}
                      onChange={(e) => updateUIConfig('botThemeColor', e.target.value)}
                      className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0.5 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={ui.botThemeColor || '#00306D'}
                      onChange={(e) => updateUIConfig('botThemeColor', e.target.value)}
                      className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Window Background</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={ui.bgColor || '#ffffff'}
                      onChange={(e) => updateUIConfig('bgColor', e.target.value)}
                      className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0.5 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={ui.bgColor || '#ffffff'}
                      onChange={(e) => updateUIConfig('bgColor', e.target.value)}
                      className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Bot Bubble Background</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={ui.botResponseBackgroundColor || '#EFEFEF'}
                      onChange={(e) => updateUIConfig('botResponseBackgroundColor', e.target.value)}
                      className="w-8 h-8 rounded border border-iso-border cursor-pointer p-0.5 bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={ui.botResponseBackgroundColor || '#EFEFEF'}
                      onChange={(e) => updateUIConfig('botResponseBackgroundColor', e.target.value)}
                      className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Header Display Title</label>
                  <input 
                    type="text" 
                    value={ui.botHeaderText || ''}
                    onChange={(e) => updateUIConfig('botHeaderText', e.target.value)}
                    placeholder="e.g. ISO AI Assistant"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Header Logo Avatar URL</label>
                  <input 
                    type="text" 
                    value={ui.logoUrl || ''}
                    onChange={(e) => updateUIConfig('logoUrl', e.target.value)}
                    placeholder="https://.../logo.png"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Launcher Floating Image URL</label>
                  <input 
                    type="text" 
                    value={ui.botChatStartImage || ''}
                    onChange={(e) => updateUIConfig('botChatStartImage', e.target.value)}
                    placeholder="https://.../icon.png"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Help Button URL</label>
                  <input 
                    type="text" 
                    value={ui.helpButtonUrl || ''}
                    onChange={(e) => updateUIConfig('helpButtonUrl', e.target.value)}
                    placeholder="https://domain.com/help"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider pt-2">
                Widget Positioning & Sizing
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Alignment</label>
                  <select 
                    value={ui.chatAlignmentLeft ? 'left' : 'right'}
                    onChange={(e) => updateUIConfig('chatAlignmentLeft', e.target.value === 'left')}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none cursor-pointer"
                  >
                    <option value="right">Bottom Right (Standard)</option>
                    <option value="left">Bottom Left</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Bottom Offset</label>
                  <input 
                    type="text" 
                    value={ui.chatPositionBottom || '20px'}
                    onChange={(e) => updateUIConfig('chatPositionBottom', e.target.value)}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Side Offset</label>
                  <input 
                    type="text" 
                    value={ui.chatPositionRight || '30px'}
                    onChange={(e) => updateUIConfig('chatPositionRight', e.target.value)}
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-iso-border">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={ui.botChatSubmitButton !== false}
                    onChange={(e) => updateUIConfig('botChatSubmitButton', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-iso-primary"
                  />
                  <span>Show Send Button</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={ui.showHelpButton !== false}
                    onChange={(e) => updateUIConfig('showHelpButton', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-iso-primary"
                  />
                  <span>Show Help Header Icon</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={ui.showThumbUpDownFeedbackform !== false}
                    onChange={(e) => updateUIConfig('showThumbUpDownFeedbackform', e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm accent-iso-primary"
                  />
                  <span>Thumb Up/Down Feedback</span>
                </label>
              </div>
            </div>
          )}

          {/* Tab 3: Greetings & Idle Behaviors */}
          {activeTab === 'messages' && (
            <div className="p-6 flex flex-col gap-5">
              
              {/* Greeting Messages List */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                  Initial Greeting Messages
                </span>
                <p className="text-[11px] text-iso-textMuted">These welcome messages are delivered when the user opens the chatbot widget.</p>

                <div className="flex flex-col gap-2 mt-1">
                  {botForm.greetingMessage.map((msg, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-iso-bg border border-iso-border p-2.5 rounded-sm">
                      <span className="text-[10px] font-mono text-iso-textMuted bg-iso-bgSecondary px-1.5 py-0.5 rounded-sm shrink-0">#{idx + 1}</span>
                      <p className="text-xs text-iso-text flex-1">{msg}</p>
                      <button
                        type="button"
                        onClick={() => removeGreeting(idx)}
                        className="text-iso-textMuted hover:text-iso-error p-1 rounded transition-colors shrink-0"
                        title="Delete greeting message"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-2">
                  <input 
                    type="text" 
                    value={newGreeting}
                    onChange={(e) => setNewGreeting(e.target.value)}
                    placeholder="Add greeting message line..."
                    className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGreeting(); } }}
                  />
                  <button
                    type="button"
                    onClick={addGreeting}
                    className="px-3 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>

              {/* Help Callout Notification */}
              <div className="flex flex-col gap-2 border-t border-iso-border pt-4">
                <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                  Help Callout Bubble
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[9px] uppercase font-mono tracking-wider text-iso-textMuted block mb-0.5">Callout Bubble Text</label>
                    <input 
                      type="text" 
                      value={ui.helpNotificationRenderMsg || ''}
                      onChange={(e) => updateUIConfig('helpNotificationRenderMsg', e.target.value)}
                      placeholder="Hi! I am your AI assistant..."
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-mono tracking-wider text-iso-textMuted block mb-0.5">Trigger Delay (ms)</label>
                    <input 
                      type="number" 
                      value={ui.helpNotificationRenderTime || 10000}
                      onChange={(e) => updateUIConfig('helpNotificationRenderTime', parseInt(e.target.value, 10))}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Idle Reminder Messages */}
              <div className="flex flex-col gap-2 border-t border-iso-border pt-4">
                <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                  Idle Inactivity Prompts
                </span>
                <div className="flex flex-col gap-2">
                  {(ui.idleStatMessages || []).map((idle, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-iso-bg border border-iso-border p-2.5 rounded-sm text-xs">
                      <span className="text-[10px] font-mono text-iso-primary bg-iso-bgSecondary px-1.5 py-0.5 rounded-sm border border-iso-border shrink-0">
                        {idle.time}s
                      </span>
                      <span className="flex-1 text-iso-text">{idle.message}</span>
                      <button
                        type="button"
                        onClick={() => removeIdleMessage(idx)}
                        className="text-iso-textMuted hover:text-iso-error p-1 rounded transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-1">
                  <input 
                    type="text" 
                    value={newIdleMsg.message}
                    onChange={(e) => setNewIdleMsg({ ...newIdleMsg, message: e.target.value })}
                    placeholder="Idle prompt message..."
                    className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                  />
                  <input 
                    type="number" 
                    value={newIdleMsg.time}
                    onChange={(e) => setNewIdleMsg({ ...newIdleMsg, time: parseInt(e.target.value, 10) })}
                    placeholder="Secs"
                    className="w-20 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2 py-1.5 text-xs text-iso-text outline-none font-mono text-center shrink-0"
                  />
                  <button
                    type="button"
                    onClick={addIdleMessage}
                    className="px-3 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Tab 4: Quick Replies & Custom Forms */}
          {activeTab === 'forms' && (
            <div className="p-6 flex flex-col gap-5">
              
              {/* Quick Replies */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                  Quick Reply Action Buttons
                </span>
                <p className="text-[11px] text-iso-textMuted">Clickable suggestion chips displayed to users for one-tap questions.</p>

                <div className="flex flex-wrap gap-2 mt-1">
                  {botForm.quickReplies.map((pill, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-iso-bgSecondary border border-iso-border px-2.5 py-1 rounded-full text-xs text-iso-primary">
                      <span>{pill}</span>
                      <button
                        type="button"
                        onClick={() => removeQuickReply(idx)}
                        className="text-iso-textMuted hover:text-iso-error rounded-full p-0.5"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-2">
                  <input 
                    type="text" 
                    value={newQuickReply}
                    onChange={(e) => setNewQuickReply(e.target.value)}
                    placeholder="New quick reply suggestion (e.g. 'Reset My Password')..."
                    className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuickReply(); } }}
                  />
                  <button
                    type="button"
                    onClick={addQuickReply}
                    className="px-3 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Plus size={13} /> Add Pill
                  </button>
                </div>
              </div>

              {/* Custom Forms Schema */}
              <div className="flex flex-col gap-2 border-t border-iso-border pt-4">
                <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                  Integrated Custom Forms & Session End Form
                </span>
                <p className="text-[11px] text-iso-textMuted">Forms triggered by specific intents (e.g., Live Agent Escalation or Post-Chat Survey).</p>

                {/* Session End Form Styling */}
                <div className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-3">
                  <span className="text-xs font-bold text-iso-primary">Session End / Feedback Form Button</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Submit Button Text</label>
                      <input 
                        type="text" 
                        value={ui.surveySubmitButtonText || ''} 
                        onChange={(e) => updateUIConfig('surveySubmitButtonText', e.target.value)} 
                        placeholder="e.g. Submit Feedback" 
                        className="w-full bg-iso-cardBg border border-iso-border rounded px-2.5 py-1.5 text-xs text-iso-text outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Button Background Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={ui.surveySubmitButtonColor || ui.botThemeColor || '#00306D'} 
                          onChange={(e) => updateUIConfig('surveySubmitButtonColor', e.target.value)} 
                          className="w-7 h-7 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input 
                          type="text" 
                          value={ui.surveySubmitButtonColor || ''} 
                          onChange={(e) => updateUIConfig('surveySubmitButtonColor', e.target.value)} 
                          placeholder="#00306D" 
                          className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1">Button Text Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={ui.surveySubmitButtonTextColor || '#FFFFFF'} 
                          onChange={(e) => updateUIConfig('surveySubmitButtonTextColor', e.target.value)} 
                          className="w-7 h-7 rounded border border-iso-border cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input 
                          type="text" 
                          value={ui.surveySubmitButtonTextColor || ''} 
                          onChange={(e) => updateUIConfig('surveySubmitButtonTextColor', e.target.value)} 
                          placeholder="#FFFFFF" 
                          className="w-full bg-iso-cardBg border border-iso-border rounded px-2 py-1 text-xs font-mono text-iso-text outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-1">
                  {botForm.customForms.length === 0 ? (
                    <div className="p-4 bg-iso-bg border border-iso-border rounded-sm text-center text-xs text-iso-textMuted">
                      No custom forms currently attached. Default widget handlers will be used.
                    </div>
                  ) : (
                    botForm.customForms.map((form, idx) => (
                      <div key={idx} className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-iso-primary">{form.title || form.name}</span>
                          <span className="text-[9px] font-mono text-iso-accent bg-iso-bgSecondary px-1.5 py-0.5 rounded-sm border border-iso-border">{form.name}</span>
                        </div>
                        <span className="text-[10px] text-iso-textMuted font-mono">
                          Fields: {(form.payload?.fields || form.fields || []).map(f => f.name || f.title).join(', ') || 'None'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Tab 5: Advanced JSON Configuration Editor */}
          {activeTab === 'raw_json' && (
            <div className="p-6 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono font-bold text-iso-accent uppercase tracking-wider">
                    Advanced JSON Configuration Schema
                  </span>
                  <p className="text-[11px] text-iso-textMuted">View and edit the complete configuration JSON. Validated before saving.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(JSON.parse(rawJsonText), null, 2);
                      setRawJsonText(formatted);
                      setJsonError(null);
                      showToast('JSON formatted cleanly.');
                    } catch (err) {
                      setJsonError('Invalid JSON: ' + err.message);
                    }
                  }}
                  className="px-2.5 py-1 bg-iso-bgSecondary hover:bg-iso-cardBg border border-iso-border text-iso-primary text-[10px] font-mono rounded-sm"
                >
                  Format JSON
                </button>
              </div>

              {jsonError && (
                <div className="p-2.5 bg-iso-errorBg border border-red-200 text-iso-error text-xs rounded-sm font-mono">
                  ⚠️ {jsonError}
                </div>
              )}

              <textarea 
                rows="18"
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setJsonError(null);
                    setBotForm(parsed);
                  } catch (err) {
                    setJsonError(err.message);
                  }
                }}
                className="w-full bg-[#0F172A] text-[#38BDF8] border border-iso-border rounded-sm p-4 text-xs font-mono leading-relaxed outline-none resize-none shadow-inner"
                spellCheck="false"
              />
            </div>
          )}

        </div>

        {/* Right Side: Live Sandbox Chat & Visual Preview */}
        <div className="lg:col-span-2 bg-iso-cardBg border border-iso-border rounded-sm flex flex-col h-[560px] shadow-sm overflow-hidden">
          
          {/* Header Switcher */}
          <div className="p-3 border-b border-iso-border bg-iso-bgSecondary/40 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRightPanelTab('chat')}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-bold transition-all ${
                  rightPanelTab === 'chat' 
                    ? 'bg-iso-primary text-white shadow-sm' 
                    : 'text-iso-textMuted hover:text-iso-text'
                }`}
              >
                TEST SANDBOX
              </button>
              <button
                onClick={() => setRightPanelTab('preview')}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-bold transition-all ${
                  rightPanelTab === 'preview' 
                    ? 'bg-iso-primary text-white shadow-sm' 
                    : 'text-iso-textMuted hover:text-iso-text'
                }`}
              >
                WIDGET PREVIEW
              </button>
            </div>
            <span className="text-[10px] text-iso-textMuted">{botForm.model}</span>
          </div>

          {/* Sandbox Chat Tab */}
          {rightPanelTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 font-mono text-[11px] leading-relaxed">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col max-w-[90%] ${
                    msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}>
                    <div 
                      className="p-3 border rounded-sm"
                      style={{
                        backgroundColor: msg.role === 'user' 
                          ? (ui.userQueryBackgroundColor || '#EFEFEF')
                          : (ui.botResponseBackgroundColor || '#EFEFEF'),
                        color: msg.role === 'user'
                          ? (ui.userQueryFontColor || '#1F2937')
                          : (ui.botResponseFontColor || '#1F2937'),
                        borderColor: '#E2E8F0'
                      }}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[8px] text-iso-textMuted mt-1 px-1">
                      {msg.role === 'user' ? 'USER' : 'AGENT'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="mr-auto max-w-[90%] flex items-center gap-2 bg-iso-bgSecondary/20 border border-iso-border/60 p-3 rounded-sm">
                    <Loader2 size={11} className="animate-spin text-iso-accent" />
                    <span className="text-[9px] text-iso-textMuted italic">Analyzing prompt with {botForm.model}...</span>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="p-3 border-t border-iso-border bg-iso-bgSecondary/20 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={botForm.botActive ? "Type test query..." : "Bot is inactive. Enable to chat."}
                  disabled={!botForm.botActive || chatLoading}
                  className="flex-1 bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none"
                />
                <button
                  type="submit"
                  disabled={!botForm.botActive || chatLoading || !chatInput.trim()}
                  className="p-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white disabled:opacity-40 rounded-sm border border-iso-primary transition-all shrink-0"
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          )}

          {/* Visual Widget Preview Tab */}
          {rightPanelTab === 'preview' && (
            <div className="flex-1 p-6 bg-gradient-to-br from-[#0A2240] to-[#16365C] flex flex-col items-center justify-center relative overflow-hidden">
              
              {/* Simulated Chatbot Modal */}
              <div 
                className="w-full max-w-[320px] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
                style={{ backgroundColor: ui.bgColor || '#ffffff', height: '400px' }}
              >
                {/* Header */}
                <div 
                  className="p-3 flex items-center justify-between text-white shadow-sm"
                  style={{ backgroundColor: ui.botThemeColor || '#00306D' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold overflow-hidden">
                      {ui.logoUrl ? (
                        <img src={ui.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        botForm.name?.slice(0, 1) || 'B'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-none">{ui.botHeaderText || botForm.name}</h4>
                      <span className="text-[9px] text-white/70">Online</span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-slate-50">
                  <div 
                    className="p-2.5 rounded-lg text-xs self-start max-w-[85%] shadow-sm border border-slate-200"
                    style={{
                      backgroundColor: ui.botResponseBackgroundColor || '#EFEFEF',
                      color: ui.botResponseFontColor || '#1F2937'
                    }}
                  >
                    {botForm.greetingMessage[0] || 'Hi! How can I help you today?'}
                  </div>

                  {botForm.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {botForm.quickReplies.slice(0, 3).map((pill, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 rounded-full text-[9px] font-medium border cursor-pointer hover:opacity-90"
                          style={{
                            borderColor: ui.botThemeColor || '#00306D',
                            color: ui.botThemeColor || '#00306D',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Input */}
                <div className="p-2 border-t border-slate-200 bg-white flex items-center gap-1.5">
                  <input 
                    type="text" 
                    placeholder={ui.DefaultEmptyMessage || "Type message..."}
                    disabled
                    className="flex-1 text-[11px] px-2 py-1 bg-slate-100 rounded border border-slate-200 outline-none"
                  />
                  {ui.botChatSubmitButton !== false && (
                    <button 
                      type="button" 
                      className="p-1 rounded text-white"
                      style={{ backgroundColor: ui.botThemeColor || '#00306D' }}
                    >
                      <Send size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Floating Help Callout Simulation */}
              {ui.helpNotificationRenderMsg && (
                <div className="absolute bottom-2 right-4 bg-white text-slate-800 text-[10px] p-2 rounded shadow-lg border border-slate-200 max-w-[200px]">
                  {ui.helpNotificationRenderMsg}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Sparkles, ExternalLink, Bot, Building2,
  RefreshCw, MessageSquare, User, Copy, Check, Volume2, Mic, Download, Search, X
} from 'lucide-react';
import CustomDropdown from '../../components/CustomDropdown';

function escapeHTML(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderFormattedMarkdown(text) {
  if (!text) return "";
  let str = String(text);

  // Normalize multi-line cells inside tables
  const lines = str.split("\n");
  const normalizedLines = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = /^\|.*\|$/.test(line.trim());
    const isTableSeparator = /^\|[\s\-:\|]+\|$/.test(line.trim());

    if (isTableRow || isTableSeparator) {
      inTable = true;
      normalizedLines.push(line);
    } else if (inTable && (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*") || (line.trim() && !line.includes("|")))) {
      if (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1].startsWith("|")) {
        const lastIdx = normalizedLines.length - 1;
        const lastLine = normalizedLines[lastIdx];
        if (lastLine.endsWith("|")) {
          normalizedLines[lastIdx] = lastLine.slice(0, -1) + "<br/>• " + line.replace(/^[•\-*]\s*/, "").trim() + " |";
        } else {
          normalizedLines[lastIdx] += "<br/>" + line.trim();
        }
      } else {
        normalizedLines.push(line);
        inTable = false;
      }
    } else {
      inTable = false;
      normalizedLines.push(line);
    }
  }
  str = normalizedLines.join("\n");

  // 1. Code blocks
  const codeBlocks = [];
  str = str.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, codeContent) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<div class="my-2 rounded border border-slate-700 bg-slate-900 overflow-hidden"><div class="bg-slate-800 px-3 py-1 text-[10px] font-mono text-slate-400"><span>${lang || 'code'}</span></div><pre class="text-slate-100 text-[11px] p-2.5 overflow-x-auto font-mono"><code class="language-${lang}">${escapeHTML(codeContent.trim())}</code></pre></div>`);
    return `%%CODEBLOCK_${idx}%%`;
  });

  // 2. Inline code
  const inlineCodes = [];
  str = str.replace(/`([^`]+)`/g, (match, codeContent) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px] font-mono border border-slate-200">${escapeHTML(codeContent)}</code>`);
    return `%%INLINECODE_${idx}%%`;
  });

  function parseInline(txt) {
    let t = txt;
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong class='font-semibold text-slate-900'>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em class='italic'>$1</em>");
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-600 underline font-medium hover:text-sky-800">$1</a>');
    return t;
  }

  // 3. Markdown Tables
  str = str.replace(/(?:(?:^|\n)\|[^\n]+\|\r?\n\|[\s\-:\|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g, (tableBlock) => {
    const rows = tableBlock.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) return tableBlock;

    const headerLine = rows[0];
    const bodyLines = rows.slice(2);

    const parseRow = (line, isHeader = false) => {
      const cells = line.split("|").map(c => c.trim()).slice(1, -1);
      const tag = isHeader ? "th" : "td";
      const cls = isHeader 
        ? "bg-slate-100 text-slate-900 font-semibold px-2.5 py-1.5 text-left border border-slate-300 text-xs"
        : "px-2.5 py-1.5 border border-slate-200 text-xs leading-relaxed text-slate-700 align-top";
      return "<tr>" + cells.map(c => `<${tag} class="${cls}">${parseInline(c)}</${tag}>`).join("") + "</tr>";
    };

    const thead = "<thead>" + parseRow(headerLine, true) + "</thead>";
    const tbody = "<tbody>" + bodyLines.map((l) => parseRow(l, false)).join("") + "</tbody>";

    return `\n<div class="my-2 overflow-x-auto rounded border border-slate-200"><table class="min-w-full divide-y divide-slate-200 bg-white text-xs">${thead}${tbody}</table></div>\n`;
  });

  // 4. Headings & Lists
  str = str.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-slate-900 mt-2.5 mb-1">$1</h4>');
  str = str.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-slate-900 mt-3 mb-1.5 pb-0.5 border-b border-slate-200">$1</h3>');
  str = str.replace(/^# (.*$)/gim, '<h2 class="text-sm font-bold text-slate-900 mt-3.5 mb-1.5 pb-0.5 border-b border-slate-300">$1</h2>');

  str = str.replace(/(?:^|\n)(?:[*\-•]\s+[^\n]+(?:\n[*\-•]\s+[^\n]+)*)/g, (listBlock) => {
    const items = listBlock.trim().split("\n").map(l => l.replace(/^[*\-•]\s+/, "").trim());
    return "\n<ul class=\"list-disc list-inside my-1.5 space-y-0.5 text-xs text-slate-700 pl-1\">" + items.map(it => `<li>${parseInline(it)}</li>`).join("") + "</ul>\n";
  });

  str = parseInline(str);
  str = str.replace(/\n\n+/g, "<br/><br/>").replace(/\n/g, "<br/>");
  str = str.replace(/<br\/><br\/>(<div|<ul|<h2|<h3|<h4)/gi, "$1");
  str = str.replace(/(<\/div>|<\/ul>|<\/h2>|<\/h3>|<\/h4>)<br\/><br\/>/gi, "$1");

  str = str.replace(/%%CODEBLOCK_(\d+)%%/g, (m, idx) => codeBlocks[parseInt(idx)] || "");
  str = str.replace(/%%INLINECODE_(\d+)%%/g, (m, idx) => inlineCodes[parseInt(idx)] || "");

  return str.trim();
}

const STARTER_PROMPTS = [
  { title: "Academic Programs", query: "What academic majors, degrees, and programs are offered?" },
  { title: "Financial Aid", query: "How do I apply for financial aid, FAFSA, and scholarships?" },
  { title: "Campus Tech & Wi-Fi", query: "How do I connect to campus Wi-Fi and reset my portal password?" },
  { title: "Contact Support", query: "Connect me with a live academic advisor or support specialist." }
];

export default function ChatPlayground({ 
  tenants = [], 
  selectedTenant, 
  setSelectedTenant, 
  selectedBot, 
  setSelectedBot, 
  bots = [], 
  showToast 
}) {
  const [tenantList, setTenantList] = useState(tenants || []);
  const [activeTenantId, setActiveTenantId] = useState('');
  const [activeBotId, setActiveBotId] = useState('');
  const [availableBots, setAvailableBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'voice'
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const chatEndRef = useRef(null);

  const currentBot = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId)) || selectedBot;
  const currentTenant = tenantList.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId)) || selectedTenant;

  const isVoiceBotConfigured = currentBot?.voicebot === true || currentBot?.isVoicebot === true || currentBot?.botType === 'voicebot' || currentBot?.botUIConfigs?.botMode === 'voice' || currentTenant?.tenantConfig?.voicebot === true;

  // Auto-sync viewMode based on bot's configured modality
  useEffect(() => {
    if (isVoiceBotConfigured) {
      setViewMode('voice');
    } else {
      setViewMode('chat');
    }
  }, [activeBotId, isVoiceBotConfigured]);

  // Fetch tenants
  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setTenantList(tenants);
      if (!activeTenantId) {
        const first = tenants[0].tenantId || tenants[0].code;
        if (first) setActiveTenantId(first);
      }
    } else {
      fetch('/api/admin/tenants')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setTenantList(data);
            if (!activeTenantId) {
              const first = data[0].tenantId || data[0].code;
              if (first) setActiveTenantId(first);
            }
          }
        })
        .catch(() => {});
    }
  }, [tenants]);

  useEffect(() => {
    if (selectedTenant) {
      const tId = selectedTenant.tenantId || selectedTenant.code;
      if (tId) setActiveTenantId(tId);
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (activeTenantId) {
      fetchBotsForTenant(activeTenantId);
    } else {
      setAvailableBots([]);
      setActiveBotId('');
    }
  }, [activeTenantId]);

  const fetchBotsForTenant = async (tenantId) => {
    setLoadingBots(true);
    try {
      const currentTenantObj = tenantList.find(t => (t.tenantId === tenantId || t.code === tenantId));
      const targetDb = currentTenantObj?.tenantDbName || `iso_${tenantId}`;
      const res = await fetch(`/api/admin/bots?tenantId=${encodeURIComponent(tenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`);
      const data = await res.json();
      const botList = Array.isArray(data) ? data : [];
      setAvailableBots(botList);

      if (botList.length > 0) {
        const defaultBot = botList[0];
        const bId = defaultBot.botId || defaultBot.code;
        setActiveBotId(bId);
      } else {
        setActiveBotId('');
      }
    } catch (err) {
      if (showToast) showToast('Error loading chatbots for tenant.', 'error');
    } finally {
      setLoadingBots(false);
    }
  };

  useEffect(() => {
    if (activeBotId && activeTenantId) {
      const curBot = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));
      const greetings = Array.isArray(curBot?.greetingMessage) ? curBot.greetingMessage[0] : (curBot?.greetingMessage || `Hello! I am ${curBot?.botName || curBot?.name || 'the AI Assistant'}. How can I help you today?`);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: greetings,
          timestamp: new Date()
        }
      ]);
    }
  }, [activeBotId, activeTenantId, availableBots]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSpeak = (text, id) => {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
    }
    const clean = text.replace(/<[^>]*>?/gm, '').replace(/[*_#`~]/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.0;
    u.pitch = 1.0;
    setSpeakingId(id);
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(u);
  };

  const streamResponse = (fullText, messageId, onComplete) => {
    const words = fullText.split(' ');
    let currentIdx = 0;
    
    // Initialize empty message
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '', isStreaming: true } : m));

    const interval = setInterval(() => {
      currentIdx++;
      const partial = words.slice(0, currentIdx).join(' ');
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: partial } : m));
      
      if (currentIdx >= words.length) {
        clearInterval(interval);
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: fullText, isStreaming: false } : m));
        if (onComplete) onComplete();
      }
    }, 28);
  };

  const executeQuery = async (queryText) => {
    if (!queryText.trim() || loading || !activeBotId || !activeTenantId) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText.trim(),
      timestamp: new Date()
    };

    const currentHistory = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setVoiceTranscript('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          tenantId: activeTenantId,
          botId: activeBotId,
          history: currentHistory.slice(-6)
        })
      });
      const data = await res.json();

      if (res.ok) {
        const replyText = data.response || data.reply || data.message || 'No response';
        const replyId = Date.now().toString() + '-reply';
        
        // Add placeholder message for streaming
        setMessages(prev => [...prev, {
          id: replyId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          intent: data.intent,
          sources: data.sources || [],
          retrievedChunksCount: data.retrievedChunksCount || 0,
          latencyMs: data.latencyMs,
          timestamp: new Date(data.timestamp || Date.now())
        }]);

        // If voicebot or in voice view, speak response automatically
        if (viewMode === 'voice' || isVoiceBotConfigured) {
          handleSpeak(replyText, replyId);
        }

        // Stream the text response word-by-word
        streamResponse(replyText, replyId);
      } else {
        if (showToast) showToast('System response failed.', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Network error connecting to chat pipeline.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeQuery(input);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleVoiceInput = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (showToast) showToast('Voice speech recognition is not supported in this browser.', 'warning');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // Stop speech synthesis if speaking
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceTranscript('Listening...');
      };

      rec.onresult = (e) => {
        const current = Array.from(e.results)
          .map(result => result[0].transcript)
          .join('');
        setVoiceTranscript(current);
        setInput(current);

        if (e.results[0].isFinal) {
          setIsListening(false);
          executeQuery(current);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (err) => {
        setIsListening(false);
        if (showToast && err.error !== 'no-speech') {
          showToast(`Microphone error: ${err.error}`, 'warning');
        }
      };

      rec.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const downloadTranscript = () => {
    let md = `# Conversation Transcript\n\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Tenant:** ${activeTenantId}\n`;
    md += `**Bot:** ${activeBotId} (${isVoiceBotConfigured ? 'Voicebot' : 'Chatbot'})\n\n---\n\n`;

    messages.forEach(m => {
      md += `**[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role === 'user' ? 'User' : 'Assistant'}:**\n${m.content}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playground-transcript-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activeIndexName = `${(activeTenantId || '').toLowerCase().replace(/\s+/g, '_')}_${(activeBotId || '').toLowerCase().replace(/\s+/g, '_')}`;

  const displayedMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    return m.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  // Extract all MongoDB botUIConfigs theming settings
  const uiConfigs = currentBot?.botUIConfigs || {};
  const themeColor = uiConfigs.botThemeColor || '#00306D';
  const bgColor = uiConfigs.bgColor || '#FFFFFF';
  const botMsgBg = uiConfigs.botResponseBackgroundColor || '#FFFFFF';
  const botMsgColor = uiConfigs.botResponseFontColor || '#1E293B';
  const userMsgBg = uiConfigs.userQueryBackgroundColor || themeColor || '#00306D';
  const userMsgColor = uiConfigs.userQueryFontColor || '#FFFFFF';
  const botHeader = uiConfigs.botHeaderText || currentBot?.botName || currentBot?.name || 'ISO AI Assistant';
  const botStatus = uiConfigs.botStatusText || (currentBot?.botActive !== false ? 'Online' : 'Offline');
  const botLogo = uiConfigs.logoUrl || uiConfigs.botChatStartImage || currentBot?.botChatStartImage || currentBot?.botLogo;
  const poweredBy = uiConfigs.poweredBy || 'AI powered by <span>Isomorphic</span>';
  const quickOptions = uiConfigs.starterQuestions || uiConfigs.quickReplies || currentBot?.quickReplies || STARTER_PROMPTS.map(p => p.query);

  return (
    <div className="w-full h-full flex flex-col gap-3 min-h-0 overflow-hidden">
      
      {/* Context Selectors Header */}
      <div className="border-b border-iso-border pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-iso-primary">
              {isVoiceBotConfigured ? 'Voicebot Playground' : 'Chatbot Playground'}
            </h1>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-mono font-medium">
              RAG Pipeline
            </span>
          </div>
          <p className="text-xs text-iso-textMuted mt-0.5">
            Test and inspect vector retrieval, prompt grounding, and streaming voice generation.
          </p>
        </div>

        {/* Tenant & Bot Selectors */}
        <div className="flex items-center gap-2">
          <CustomDropdown
            value={activeTenantId}
            onChange={(newTId) => {
              setActiveTenantId(newTId);
              const tObj = tenantList.find(t => (t.tenantId === newTId || t.code === newTId));
              if (setSelectedTenant && tObj) setSelectedTenant(tObj);
            }}
            options={tenantList.map(t => ({
              value: t.tenantId || t.code || '',
              label: t.tenantName || t.name || t.tenantId,
              badge: t.tenantId || t.code
            }))}
            icon={Building2}
            placeholder="Organization..."
          />

          <CustomDropdown
            value={activeBotId}
            onChange={(newBId) => {
              setActiveBotId(newBId);
              const bObj = availableBots.find(b => (b.botId === newBId || b.code === newBId));
              if (setSelectedBot && bObj) setSelectedBot(bObj);
            }}
            options={availableBots.map(b => ({
              value: b.botId || b.code || '',
              label: b.botName || b.name || b.botId,
              badge: b.botId || b.code
            }))}
            disabled={loadingBots || availableBots.length === 0}
            icon={Bot}
            placeholder={availableBots.length === 0 ? "No bots" : "Chatbot..."}
          />
        </div>
      </div>

      {/* Main Container - Themed with Mongo Atlas configs */}
      <div 
        className="border border-iso-border rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden shadow-2xs"
        style={{ backgroundColor: bgColor }}
      >
        
        {/* Chat Toolbar Header - Themed with botThemeColor */}
        <div 
          className="px-4 py-2.5 border-b border-iso-border flex items-center justify-between shrink-0"
          style={{ backgroundColor: themeColor, color: '#FFFFFF' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {botLogo ? (
                <img src={botLogo} alt="Logo" className="w-6 h-6 rounded-full object-cover border border-white/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {viewMode === 'voice' ? '🎙️' : '💬'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {botHeader}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-400 animate-ping' : speakingId ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} />
                </div>
                <div className="text-[10px] text-white/75 font-mono">
                  {isListening ? 'Listening...' : speakingId ? 'Speaking AI voice...' : botStatus} • {activeBotId}
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-black/25 p-0.5 rounded-lg text-[11px] font-medium ml-2">
              <button
                type="button"
                onClick={() => setViewMode('chat')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <MessageSquare size={12} />
                <span>Chat UI</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('voice')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'voice'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Mic size={12} />
                <span>Voice UI</span>
                {isVoiceBotConfigured && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 text-white">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-1.5 rounded text-xs text-white/80 hover:text-white hover:bg-white/15 cursor-pointer ${searchOpen ? 'bg-white/20 text-white' : ''}`}
              title="Search conversation"
            >
              <Search size={13} />
            </button>
            <button
              onClick={downloadTranscript}
              className="p-1.5 rounded text-xs text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              title="Download transcript"
            >
              <Download size={13} />
            </button>
            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                setSpeakingId(null);
                setIsListening(false);
                setVoiceTranscript('');
                setMessages([{
                  id: 'welcome',
                  role: 'assistant',
                  content: `Session reset. Hello! How can I assist you?`,
                  timestamp: new Date()
                }]);
              }}
              className="p-1.5 rounded text-xs text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              title="Reset conversation"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="px-4 py-1.5 bg-slate-100 border-b border-iso-border flex items-center gap-2 shrink-0">
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter messages..."
              className="flex-1 bg-transparent text-xs outline-none text-slate-800"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Voice Assistant Visualizer Banner (Shown in Voice Mode) */}
        {viewMode === 'voice' && (
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700/60 flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center gap-3">
              {/* Voice Orb Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={loading}
                title={isListening ? "Stop listening" : "Tap to speak"}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all transform active:scale-95 cursor-pointer shadow-md border-2 ${
                  isListening
                    ? 'bg-rose-600 border-rose-300 text-white animate-pulse shadow-rose-600/50'
                    : speakingId
                      ? 'bg-emerald-600 border-emerald-300 text-white animate-bounce shadow-emerald-600/50'
                      : loading
                        ? 'bg-amber-600 border-amber-300 text-white animate-spin'
                        : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-indigo-600/40'
                }`}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isListening ? (
                  <Mic size={18} className="text-white" />
                ) : speakingId ? (
                  <Volume2 size={18} className="text-white" />
                ) : (
                  <Mic size={18} />
                )}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    {isListening 
                      ? 'Listening to your voice...' 
                      : loading 
                        ? 'Analyzing knowledge base...' 
                        : speakingId 
                          ? 'Streaming AI voice answer...' 
                          : 'Voice Assistant Ready'}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                    isListening ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : speakingId ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {isListening ? '● LIVE REC' : speakingId ? '🔊 SPEAKING' : 'IDLE'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  {voiceTranscript ? `"${voiceTranscript}"` : 'Tap mic or click quick questions to speak'}
                </div>
              </div>
            </div>

            {/* Dynamic Equalizer Audio Waveform Bars */}
            <div className="flex items-center gap-1 h-5">
              {[35, 60, 90, 50, 80, 100, 45, 75, 40].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isListening
                      ? 'bg-rose-400'
                      : speakingId
                        ? 'bg-emerald-400'
                        : loading
                          ? 'bg-amber-400'
                          : 'bg-slate-600 h-1'
                  }`}
                  style={{
                    height: (isListening || speakingId) 
                      ? `${Math.max(4, Math.sin(Date.now() / 150 + i) * h * 0.2)}px` 
                      : '4px'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unified Messages Stream - Themed from MongoDB Atlas */}
        <div 
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs min-h-0"
          style={{ backgroundColor: bgColor }}
        >
          {displayedMessages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div 
                className="p-3.5 leading-relaxed text-xs rounded-xl shadow-2xs transition-all border"
                style={{
                  backgroundColor: msg.role === 'user' ? userMsgBg : botMsgBg,
                  color: msg.role === 'user' ? userMsgColor : botMsgColor,
                  borderColor: msg.role === 'user' ? 'transparent' : '#E2E8F0',
                  borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '12px'
                }}
              >
                {/* Streaming with AI Voice Badge */}
                {msg.role === 'assistant' && (msg.isStreaming || (speakingId === msg.id && viewMode === 'voice')) && (
                  <div className="mb-2 pb-1.5 border-b border-slate-200/60 flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Volume2 size={13} className="animate-pulse text-indigo-600" />
                      <span>Streaming with AI Voice...</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-indigo-600 rounded-full animate-bounce" />
                      <span className="w-1 h-2 bg-indigo-400 rounded-full animate-pulse" />
                    </div>
                  </div>
                )}

                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                ) : (
                  <div>
                    <div 
                      className="prose prose-sm max-w-none text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderFormattedMarkdown(msg.content) }}
                    />
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-600 animate-pulse align-middle" />
                    )}
                  </div>
                )}

                {/* Intent & Citations */}
                {msg.role === 'assistant' && !msg.isStreaming && (msg.intent || (msg.sources && msg.sources.length > 0)) && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[10px] font-mono opacity-90">
                    {msg.intent && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Intent: {msg.intent}
                      </span>
                    )}
                    {msg.retrievedChunksCount > 0 && (
                      <span className="text-slate-500">
                        {msg.retrievedChunksCount} chunk(s) • {msg.latencyMs}ms
                      </span>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Sources:</span>
                        {msg.sources.map((src, i) => (
                          <a 
                            key={i} 
                            href={src} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:underline flex items-center gap-0.5 truncate max-w-[130px]"
                          >
                            <span>{src.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink size={8} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Footer Actions */}
              <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === 'assistant' && !msg.isStreaming && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="hover:text-slate-700 cursor-pointer p-0.5"
                      title="Copy"
                    >
                      {copiedId === msg.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    </button>
                    <button 
                      onClick={() => handleSpeak(msg.content, msg.id)}
                      className={`hover:text-slate-700 cursor-pointer p-0.5 ${speakingId === msg.id ? 'text-indigo-600 font-semibold' : ''}`}
                      title="Read aloud"
                    >
                      <Volume2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
              <Loader2 size={13} className="animate-spin text-iso-primary" />
              <span className="text-[11px] font-medium">
                {viewMode === 'voice' ? 'Synthesizing knowledge & AI voice...' : 'Searching knowledge base...'}
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Starter Prompts - Themed */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-slate-50/80 border-t border-iso-border flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              Suggested:
            </span>
            {quickOptions.map((opt, idx) => {
              const label = typeof opt === 'string' ? opt : (opt.title || opt.query);
              const val = typeof opt === 'string' ? opt : (opt.query || opt.title);
              return (
                <button
                  key={idx}
                  onClick={() => executeQuery(val)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-[11px] text-slate-700 whitespace-nowrap transition-colors cursor-pointer shadow-2xs font-medium"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Composer - Themed */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-iso-border flex items-center gap-2 bg-white shrink-0">
          <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-iso-primary focus-within:bg-white rounded-md px-3 py-1.5 flex items-center gap-2 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={uiConfigs.DefaultEmptyMessage || "Type your question or use microphone..."}
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
              disabled={loading || !activeBotId}
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-1.5 rounded-full cursor-pointer transition-all ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
              title="Voice Input"
            >
              <Mic size={15} />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim() || !activeBotId}
            className="px-4 py-2 disabled:opacity-40 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            <Send size={12} />
            <span>Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}

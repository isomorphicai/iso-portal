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
  const chatEndRef = useRef(null);

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
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I am ${curBot?.botName || curBot?.name || 'the AI Assistant'}. How can I help you today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [activeBotId, activeTenantId, availableBots]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-reply',
          role: 'assistant',
          content: data.response || data.reply || data.message || 'No response',
          intent: data.intent,
          sources: data.sources || [],
          retrievedChunksCount: data.retrievedChunksCount || 0,
          latencyMs: data.latencyMs,
          timestamp: new Date(data.timestamp || Date.now())
        }]);
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
    setSpeakingId(id);
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(u);
  };

  const toggleVoiceInput = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (showToast) showToast('Voice recognition is not supported in this browser.', 'warning');
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      setInput(e.results[0][0].transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start();
  };

  const downloadTranscript = () => {
    let md = `# Conversation Transcript\n\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Tenant:** ${activeTenantId}\n`;
    md += `**Bot:** ${activeBotId}\n\n---\n\n`;

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

  return (
    <div className="w-full h-full flex flex-col gap-3 min-h-0 overflow-hidden">
      
      {/* Context Selectors Header */}
      <div className="border-b border-iso-border pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-iso-primary">Chatbot Playground</h1>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-mono font-medium">
              RAG Engine
            </span>
          </div>
          <p className="text-xs text-iso-textMuted mt-0.5">
            Test and inspect vector retrieval, prompt grounding, and generated answers.
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

      {/* Main Chat Interface */}
      <div className="bg-white border border-iso-border rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden shadow-2xs">
        
        {/* Chat Toolbar Header */}
        <div className="px-4 py-2 border-b border-iso-border bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-iso-primary">
              {activeBotId || 'Assistant'}
            </span>
            <span className="text-[11px] text-iso-textMuted">• {activeIndexName}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-1.5 rounded text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 cursor-pointer ${searchOpen ? 'bg-slate-200/70 text-slate-900' : ''}`}
              title="Search conversation"
            >
              <Search size={13} />
            </button>
            <button
              onClick={downloadTranscript}
              className="p-1.5 rounded text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 cursor-pointer"
              title="Download transcript"
            >
              <Download size={13} />
            </button>
            <button
              onClick={() => {
                setMessages([{
                  id: 'welcome',
                  role: 'assistant',
                  content: `Session reset. Hello! How can I assist you?`,
                  timestamp: new Date()
                }]);
              }}
              className="p-1.5 rounded text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 cursor-pointer"
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

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs bg-slate-50/40 min-h-0">
          {displayedMessages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div 
                className={`p-3 leading-relaxed text-xs ${
                  msg.role === 'user' 
                    ? 'bg-iso-primary text-white rounded-xl rounded-tr-xs' 
                    : 'bg-white border border-iso-border text-slate-800 rounded-xl rounded-tl-xs shadow-2xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div 
                    className="prose prose-sm max-w-none text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderFormattedMarkdown(msg.content) }}
                  />
                )}

                {/* Intent & Citations */}
                {msg.role === 'assistant' && (msg.intent || (msg.sources && msg.sources.length > 0)) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    {msg.intent && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Intent: {msg.intent}
                      </span>
                    )}
                    {msg.retrievedChunksCount > 0 && (
                      <span className="text-slate-400">
                        {msg.retrievedChunksCount} chunk(s) • {msg.latencyMs}ms
                      </span>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Sources:</span>
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
                {msg.role === 'assistant' && (
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
                      className={`hover:text-slate-700 cursor-pointer p-0.5 ${speakingId === msg.id ? 'text-sky-600' : ''}`}
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
            <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
              <Loader2 size={13} className="animate-spin text-iso-primary" />
              <span className="text-[11px]">Searching knowledge base...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-white border-t border-iso-border/70 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[10px] font-mono text-slate-400 shrink-0">Try:</span>
            {STARTER_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => executeQuery(p.query)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
              >
                {p.title}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-iso-border flex items-center gap-2 bg-white shrink-0">
          <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-iso-primary focus-within:bg-white rounded-md px-3 py-1.5 flex items-center gap-2 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
              disabled={loading || !activeBotId}
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer transition-colors ${isListening ? 'text-red-500' : ''}`}
              title="Voice Input"
            >
              <Mic size={14} />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim() || !activeBotId}
            className="px-3.5 py-2 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-40 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send size={12} />
            <span>Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}

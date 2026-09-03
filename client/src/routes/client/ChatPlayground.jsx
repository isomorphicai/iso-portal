import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Info, Sparkles, ExternalLink, Bot, Building2,
  RefreshCw, MessageSquare, ShieldCheck
} from 'lucide-react';

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
    codeBlocks.push(`<pre class="bg-slate-900 text-slate-100 text-[11px] p-3 rounded my-2 overflow-x-auto font-mono"><code class="language-${lang}">${escapeHTML(codeContent.trim())}</code></pre>`);
    return `%%CODEBLOCK_${idx}%%`;
  });

  // 2. Inline code
  const inlineCodes = [];
  str = str.replace(/`([^`]+)`/g, (match, codeContent) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="bg-slate-100 text-iso-primary px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-200">${escapeHTML(codeContent)}</code>`);
    return `%%INLINECODE_${idx}%%`;
  });

  function parseInline(txt) {
    let t = txt;
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong class='font-bold text-iso-primary'>$1</strong>");
    t = t.replace(/__([^_]+)__/g, "<strong class='font-bold text-iso-primary'>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em class='italic'>$1</em>");
    t = t.replace(/_([^_]+)_/g, "<em class='italic'>$1</em>");
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-iso-accent underline font-medium hover:text-iso-primary">$1</a>');
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
        ? "bg-iso-primary text-white font-semibold px-3 py-2 text-left border-b-2 border-iso-accent text-xs whitespace-nowrap"
        : "px-3 py-2 border-b border-iso-border/70 text-xs leading-relaxed text-iso-text align-top";
      return "<tr>" + cells.map(c => `<${tag} class="${cls}">${parseInline(c)}</${tag}>`).join("") + "</tr>";
    };

    const thead = "<thead>" + parseRow(headerLine, true) + "</thead>";
    const tbody = "<tbody>" + bodyLines.map((l) => parseRow(l, false)).join("") + "</tbody>";

    return `\n<div class="my-3 overflow-x-auto rounded border border-iso-border shadow-xs"><table class="min-w-full divide-y divide-iso-border bg-white text-xs">${thead}${tbody}</table></div>\n`;
  });

  // 4. Headings
  str = str.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-iso-primary mt-3 mb-1.5">$1</h4>');
  str = str.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-iso-primary mt-4 mb-2 pb-1 border-b border-iso-border/50">$1</h3>');
  str = str.replace(/^# (.*$)/gim, '<h2 class="text-base font-bold text-iso-primary mt-5 mb-2.5 pb-1 border-b border-iso-border">$1</h2>');

  // 5. Horizontal rules
  str = str.replace(/^(?:---|___|\*\*\*)\s*$/gim, '<hr class="border-none border-t border-iso-border my-3.5" />');

  // 6. Bullet lists
  str = str.replace(/(?:^|\n)(?:[*\-•]\s+[^\n]+(?:\n[*\-•]\s+[^\n]+)*)/g, (listBlock) => {
    const items = listBlock.trim().split("\n").map(l => l.replace(/^[*\-•]\s+/, "").trim());
    return "\n<ul class=\"list-disc list-inside my-2 space-y-1 text-xs leading-relaxed pl-1\">" + items.map(it => `<li>${parseInline(it)}</li>`).join("") + "</ul>\n";
  });

  // 7. Numbered lists
  str = str.replace(/(?:^|\n)(?:\d+\.\s+[^\n]+(?:\n\d+\.\s+[^\n]+)*)/g, (listBlock) => {
    const items = listBlock.trim().split("\n").map(l => l.replace(/^\d+\.\s+/, "").trim());
    return "\n<ol class=\"list-decimal list-inside my-2 space-y-1 text-xs leading-relaxed pl-1\">" + items.map(it => `<li>${parseInline(it)}</li>`).join("") + "</ol>\n";
  });

  // 8. General inline formatting
  str = parseInline(str);

  // 9. Convert remaining line breaks into <br/>
  str = str.replace(/\n\n+/g, "<br/><br/>").replace(/\n/g, "<br/>");
  str = str.replace(/<br\/><br\/>(<div|<ul|<ol|<h2|<h3|<h4|<hr)/gi, "$1");
  str = str.replace(/(<\/div>|<\/ul>|<\/ol>|<\/h2>|<\/h3>|<\/h4>|<hr \/>)<br\/><br\/>/gi, "$1");
  str = str.replace(/<br\/>(<div|<ul|<ol|<h2|<h3|<h4|<hr)/gi, "$1");
  str = str.replace(/(<\/div>|<\/ul>|<\/ol>|<\/h2>|<\/h3>|<\/h4>|<hr \/>)<br\/>/gi, "$1");

  // 10. Restore code blocks & inline codes
  str = str.replace(/%%CODEBLOCK_(\d+)%%/g, (m, idx) => codeBlocks[parseInt(idx)] || "");
  str = str.replace(/%%INLINECODE_(\d+)%%/g, (m, idx) => inlineCodes[parseInt(idx)] || "");

  return str.trim();
}

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
  const chatEndRef = useRef(null);

  // 1. Fetch tenants list if not passed from props
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

  // Sync with prop selectedTenant
  useEffect(() => {
    if (selectedTenant) {
      const tId = selectedTenant.tenantId || selectedTenant.code;
      if (tId) setActiveTenantId(tId);
    }
  }, [selectedTenant]);

  // 2. Fetch Bots when activeTenantId changes
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

  // Welcome message when bot changes
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeBotId || !activeTenantId) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
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

  const activeIndexName = `${(activeTenantId || '').toLowerCase().replace(/\s+/g, '_')}_${(activeBotId || '').toLowerCase().replace(/\s+/g, '_')}`;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      
      {/* Top Header & Context Selectors */}
      <div className="border-b border-iso-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif tracking-tight text-iso-primary font-bold">Chatbot Playground</h1>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono font-bold">
              LIVE RAG PIPELINE
            </span>
          </div>
          <p className="text-xs text-iso-textMuted mt-1">
            Test real-time Intent Classification, Query Rewriting, KNN Vector Retrieval, and Groq/LLM generation.
          </p>
        </div>

        {/* Tenant & Bot Selector Dropdowns strictly using tenantId & botId */}
        <div className="flex items-center gap-3 p-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-xs">
          
          {/* Tenant Selector */}
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-iso-textMuted" />
            <select
              value={activeTenantId}
              onChange={(e) => {
                const newTId = e.target.value;
                setActiveTenantId(newTId);
                const tObj = tenantList.find(t => (t.tenantId === newTId || t.code === newTId));
                if (setSelectedTenant && tObj) setSelectedTenant(tObj);
              }}
              className="bg-iso-bg border border-iso-border rounded px-2 py-1 text-xs text-iso-text font-medium outline-none focus:border-iso-accent"
            >
              {tenantList.map(t => {
                const val = t.tenantId || t.code || '';
                return (
                  <option key={val} value={val}>
                    {t.tenantName || t.name || val} ({val})
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-iso-border">|</span>

          {/* Bot Selector */}
          <div className="flex items-center gap-1.5">
            <Bot size={14} className="text-iso-textMuted" />
            <select
              value={activeBotId}
              onChange={(e) => {
                const newBId = e.target.value;
                setActiveBotId(newBId);
                const bObj = availableBots.find(b => (b.botId === newBId || b.code === newBId));
                if (setSelectedBot && bObj) setSelectedBot(bObj);
              }}
              disabled={loadingBots || availableBots.length === 0}
              className="bg-iso-bg border border-iso-border rounded px-2 py-1 text-xs text-iso-text font-medium outline-none focus:border-iso-accent disabled:opacity-50"
            >
              {availableBots.map(b => {
                const val = b.botId || b.code || '';
                return (
                  <option key={val} value={val}>
                    {b.botName || b.name || val} ({val})
                  </option>
                );
              })}
            </select>
          </div>

        </div>
      </div>

      {/* RAG Context Banner */}
      <div className="bg-iso-bgSecondary border border-iso-border/70 rounded-md p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-iso-accent shrink-0" />
          <span className="text-iso-text">
            Active Vector Partition: <strong className="font-mono text-iso-primary">{activeIndexName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-iso-textMuted text-[11px] font-mono">
          <span>Provider: <strong>Groq / OpenAI</strong></span>
          <span>•</span>
          <span>KNN Embeddings: <strong>1024-dim</strong></span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-iso-cardBg border border-iso-border rounded-lg shadow-sm flex flex-col h-[560px] overflow-hidden">
        
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-iso-border bg-iso-bgSecondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-iso-primary">
              Live Pipeline Session ({activeBotId || 'Select a Bot'})
            </span>
          </div>

          <button
            onClick={() => {
              const curBot = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));
              setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Chat session reset. Hello! How can I assist you?`,
                timestamp: new Date()
              }]);
            }}
            className="p-1 text-iso-textMuted hover:text-iso-primary rounded text-xs flex items-center gap-1 cursor-pointer"
            title="Reset Chat"
          >
            <RefreshCw size={12} />
            <span className="text-[10px] font-mono">Reset</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs bg-iso-bg/40">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-md p-3.5 leading-relaxed shadow-2xs ${
                  msg.role === 'user' 
                    ? 'bg-iso-primary text-white font-medium' 
                    : 'bg-iso-cardBg border border-iso-border text-iso-text'
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

                {/* Intent & Citations Pill */}
                {msg.role === 'assistant' && (msg.intent || (msg.sources && msg.sources.length > 0)) && (
                  <div className="mt-2.5 pt-2 border-t border-iso-border/50 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    {msg.intent && (
                      <span className={`px-1.5 py-0.5 rounded border ${
                        msg.intent === 'smalltalk' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        msg.intent === 'ambiguous' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        Intent: {msg.intent}
                      </span>
                    )}

                    {msg.retrievedChunksCount > 0 && (
                      <span className="text-iso-textMuted">
                        {msg.retrievedChunksCount} chunk(s) retrieved ({msg.latencyMs}ms)
                      </span>
                    )}

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-iso-textMuted">Sources:</span>
                        {msg.sources.map((src, i) => (
                          <a 
                            key={i} 
                            href={src} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-iso-accent hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                          >
                            <span>{src.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink size={9} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-iso-textMuted mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-iso-textMuted text-xs p-2">
              <Loader2 size={14} className="animate-spin text-iso-accent" />
              <span className="font-mono text-[11px]">Classifying intent &amp; searching vector knowledge...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-iso-border flex items-center gap-2 bg-iso-cardBg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message (e.g. greetings, questions from ingested documents)..."
            className="flex-1 bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none"
            disabled={loading || !activeBotId}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !activeBotId}
            className="px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}

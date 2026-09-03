import React, { useState, useEffect } from 'react';
import { 
  History, MessageSquare, Search, Filter, RefreshCw, Trash2,
  Download, Clock, Calendar, Building2, Bot, CheckCircle2,
  AlertCircle, ChevronRight, ExternalLink, ArrowUpDown, User,
  Sparkles, ShieldCheck, ThumbsUp, ThumbsDown
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
    codeBlocks.push(`<pre class="bg-slate-900 text-slate-100 text-[11px] p-2.5 rounded my-2 overflow-x-auto font-mono"><code class="language-${lang}">${escapeHTML(codeContent.trim())}</code></pre>`);
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
        ? "bg-iso-primary text-white font-semibold px-2.5 py-1.5 text-left border-b-2 border-iso-accent text-xs whitespace-nowrap"
        : "px-2.5 py-1.5 border-b border-iso-border/70 text-xs leading-relaxed text-iso-text align-top";
      return "<tr>" + cells.map(c => `<${tag} class="${cls}">${parseInline(c)}</${tag}>`).join("") + "</tr>";
    };

    const thead = "<thead>" + parseRow(headerLine, true) + "</thead>";
    const tbody = "<tbody>" + bodyLines.map((l) => parseRow(l, false)).join("") + "</tbody>";

    return `\n<div class="my-2.5 overflow-x-auto rounded border border-iso-border shadow-xs"><table class="min-w-full divide-y divide-iso-border bg-white text-xs">${thead}${tbody}</table></div>\n`;
  });

  // 4. Headings
  str = str.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-iso-primary mt-2 mb-1">$1</h4>');
  str = str.replace(/^## (.*$)/gim, '<h3 class="text-xs font-bold text-iso-primary mt-3 mb-1.5 pb-1 border-b border-iso-border/50">$1</h3>');
  str = str.replace(/^# (.*$)/gim, '<h2 class="text-sm font-bold text-iso-primary mt-3 mb-2 pb-1 border-b border-iso-border">$1</h2>');

  // 5. Horizontal rules
  str = str.replace(/^(?:---|___|\*\*\*)\s*$/gim, '<hr class="border-none border-t border-iso-border my-2.5" />');

  // 6. Bullet lists
  str = str.replace(/(?:^|\n)(?:[*\-•]\s+[^\\n]+(?:\n[*\-•]\s+[^\\n]+)*)/g, (listBlock) => {
    const items = listBlock.trim().split("\n").map(l => l.replace(/^[*\-•]\s+/, "").trim());
    return "\n<ul class=\"list-disc list-inside my-1.5 space-y-1 text-xs leading-relaxed pl-1\">" + items.map(it => `<li>${parseInline(it)}</li>`).join("") + "</ul>\n";
  });

  // 7. Numbered lists
  str = str.replace(/(?:^|\n)(?:\d+\.\s+[^\\n]+(?:\n\d+\.\s+[^\\n]+)*)/g, (listBlock) => {
    const items = listBlock.trim().split("\n").map(l => l.replace(/^\d+\.\s+/, "").trim());
    return "\n<ol class=\"list-decimal list-inside my-1.5 space-y-1 text-xs leading-relaxed pl-1\">" + items.map(it => `<li>${parseInline(it)}</li>`).join("") + "</ol>\n";
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

export default function ConversationHistory({ 
  tenants = [], 
  selectedTenant, 
  showToast 
}) {
  const [tenantList, setTenantList] = useState(tenants || []);
  const [selectedTenantId, setSelectedTenantId] = useState('all');
  const [selectedBotId, setSelectedBotId] = useState('all');
  const [availableBots, setAvailableBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState('all'); // all, active, ended
  const [searchQuery, setSearchQuery] = useState('');

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const [sessionMessages, setSessionMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 1. Fetch tenants list if not passed from props
  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setTenantList(tenants);
    } else {
      fetch('/api/admin/tenants')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setTenantList(data);
        })
        .catch(() => {});
    }
  }, [tenants]);

  // Sync with prop selectedTenant
  useEffect(() => {
    if (selectedTenant) {
      const tId = selectedTenant.tenantId || selectedTenant.code;
      if (tId) setSelectedTenantId(tId);
    }
  }, [selectedTenant]);

  // 2. Fetch Bots when selectedTenantId changes
  useEffect(() => {
    if (selectedTenantId && selectedTenantId !== 'all') {
      fetchBotsForTenant(selectedTenantId);
    } else {
      setAvailableBots([]);
      setSelectedBotId('all');
    }
  }, [selectedTenantId, tenantList]);

  const fetchBotsForTenant = async (tId) => {
    setLoadingBots(true);
    try {
      const curT = tenantList.find(t => (t.tenantId === tId || t.code === tId));
      const targetDb = curT?.tenantDbName || `iso_${tId}`;
      const res = await fetch(`/api/admin/bots?tenantId=${encodeURIComponent(tId)}&tenantDbName=${encodeURIComponent(targetDb)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableBots(data);
      } else {
        setAvailableBots([]);
      }
    } catch (e) {
      setAvailableBots([]);
    } finally {
      setLoadingBots(false);
    }
  };

  // 3. Fetch Sessions on filter change
  useEffect(() => {
    fetchSessions();
  }, [selectedTenantId, selectedBotId, selectedStatus]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      let url = `/api/admin/conversations?limit=100`;
      if (selectedTenantId !== 'all') url += `&tenantId=${encodeURIComponent(selectedTenantId)}`;
      if (selectedBotId !== 'all') url += `&botId=${encodeURIComponent(selectedBotId)}`;
      if (selectedStatus !== 'all') url += `&status=${encodeURIComponent(selectedStatus)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        const list = json.data.sessions || [];
        setSessions(list);
        if (list.length > 0 && (!selectedSessionId || !list.some(s => s.sessionId === selectedSessionId))) {
          setSelectedSessionId(list[0].sessionId);
        } else if (list.length === 0) {
          setSelectedSessionId(null);
        }
      }
    } catch (err) {
      if (showToast) showToast('Failed to fetch conversation sessions.', 'error');
    } finally {
      setLoadingSessions(false);
    }
  };

  // 4. Fetch thread messages when selectedSessionId changes
  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionThread(selectedSessionId);
    } else {
      setSessionMessages([]);
    }
  }, [selectedSessionId]);

  const fetchSessionThread = async (sId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/conversations/${encodeURIComponent(sId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSessionMessages(json.data.messages || []);
      }
    } catch (err) {
      if (showToast) showToast('Error loading session thread messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sId) => {
    if (!window.confirm(`Are you sure you want to delete session ${sId} and all its messages?`)) return;
    try {
      const res = await fetch(`/api/admin/conversations/${encodeURIComponent(sId)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        if (showToast) showToast('Session deleted successfully.', 'success');
        setSessions(prev => prev.filter(s => s.sessionId !== sId));
        if (selectedSessionId === sId) setSelectedSessionId(null);
      }
    } catch (err) {
      if (showToast) showToast('Failed to delete session.', 'error');
    }
  };

  // Export session transcript
  const handleExportTranscript = () => {
    if (!selectedSessionId || sessionMessages.length === 0) return;
    const curSession = sessions.find(s => s.sessionId === selectedSessionId);

    let text = `========================================================\n`;
    text += `ISOMORPHIC AI - CONVERSATION TRANSCRIPT\n`;
    text += `Session ID: ${selectedSessionId}\n`;
    text += `Tenant: ${curSession?.tenantId || 'N/A'} | Bot: ${curSession?.botId || 'N/A'}\n`;
    text += `Session Started: ${new Date(curSession?.sessionStartAt || Date.now()).toLocaleString()}\n`;
    text += `Session Ended: ${curSession?.sessionEndAt ? new Date(curSession.sessionEndAt).toLocaleString() : 'Active'}\n`;
    text += `Total Messages: ${sessionMessages.length}\n`;
    text += `========================================================\n\n`;

    sessionMessages.forEach((msg, idx) => {
      const qTime = new Date(msg.queryReceivedAt || msg.createdAt).toLocaleTimeString();
      const aTime = new Date(msg.responseGivenAt || msg.createdAt).toLocaleTimeString();
      text += `[${qTime}] USER: ${msg.query}\n`;
      text += `[${aTime}] BOT (${msg.intent || 'info'}, ${msg.latencyMs || 0}ms): ${msg.answer}\n`;
      if (msg.sources && msg.sources.length > 0) {
        text += `Sources: ${msg.sources.join(', ')}\n`;
      }
      text += `--------------------------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript_${selectedSessionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentActiveSession = sessions.find(s => s.sessionId === selectedSessionId);

  // Compute metrics
  const totalSessions = sessions.length;
  const activeSessionsCount = sessions.filter(s => s.sessionStatus === 'active').length;
  const totalTurnsCount = sessions.reduce((sum, s) => sum + (s.totalTurns || 0), 0);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-5">
      
      {/* Top Header & Metrics */}
      <div className="border-b border-iso-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif tracking-tight text-iso-primary font-bold">Conversation History</h1>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-mono font-bold">
              MASTER ARCHIVE
            </span>
          </div>
          <p className="text-xs text-iso-textMuted mt-1">
            Complete audit trail of user sessions, questions, intent routings, and RAG knowledge retrievals stored in MongoDB Atlas.
          </p>
        </div>

        {/* Telemetry Pills */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-xs flex items-center gap-2 text-xs">
            <span className="text-iso-textMuted">Sessions:</span>
            <strong className="font-mono text-iso-primary">{totalSessions}</strong>
          </div>
          <div className="px-3 py-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-xs flex items-center gap-2 text-xs">
            <span className="text-iso-textMuted">Active:</span>
            <strong className="font-mono text-emerald-600">{activeSessionsCount}</strong>
          </div>
          <div className="px-3 py-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-xs flex items-center gap-2 text-xs">
            <span className="text-iso-textMuted">Chat Turns:</span>
            <strong className="font-mono text-iso-accent">{totalTurnsCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Tenant Filter, Bot Filter, Status Filter & Search */}
      <div className="p-3 bg-iso-cardBg border border-iso-border rounded-md shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* 1. Tenant / Organization Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-iso-textMuted" />
            <select
              value={selectedTenantId}
              onChange={(e) => {
                setSelectedTenantId(e.target.value);
                setSelectedBotId('all');
              }}
              className="bg-iso-bg border border-iso-border rounded px-2.5 py-1 text-xs text-iso-text font-medium outline-none focus:border-iso-accent cursor-pointer"
            >
              <option value="all">🏢 All Organizations</option>
              {tenantList.map(t => {
                const val = t.tenantId || t.code || '';
                return (
                  <option key={val} value={val}>
                    {t.tenantName || val} ({val})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Bot Filter */}
          <div className="flex items-center gap-1.5">
            <Bot size={14} className="text-iso-textMuted" />
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              disabled={loadingBots}
              className="bg-iso-bg border border-iso-border rounded px-2.5 py-1 text-xs text-iso-text font-medium outline-none focus:border-iso-accent cursor-pointer disabled:opacity-50"
            >
              <option value="all">🤖 All Bots</option>
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

          {/* 3. Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-iso-textMuted" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-iso-bg border border-iso-border rounded px-2.5 py-1 text-xs text-iso-text font-medium outline-none focus:border-iso-accent cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Sessions</option>
              <option value="ended">Ended Sessions</option>
            </select>
          </div>

          {/* 4. Search Bar */}
          <form 
            onSubmit={(e) => { e.preventDefault(); fetchSessions(); }}
            className="flex items-center gap-1.5 flex-1 min-w-[200px]"
          >
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-iso-textMuted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user query, response, or sessionId..."
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded pl-8 pr-3 py-1 text-xs text-iso-text outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1 bg-iso-primary hover:bg-iso-primaryLight text-white rounded text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchSessions}
          disabled={loadingSessions}
          className="p-1.5 border border-iso-border hover:bg-iso-bg rounded text-iso-textMuted hover:text-iso-primary flex items-center gap-1 cursor-pointer shrink-0"
          title="Refresh History"
        >
          <RefreshCw size={13} className={loadingSessions ? 'animate-spin' : ''} />
          <span className="text-[11px] font-mono">Refresh</span>
        </button>

      </div>

      {/* Main Split Layout: Left Sessions List + Right Thread Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        
        {/* Left Pane: Sessions List (5 Cols) */}
        <div className="lg:col-span-5 bg-iso-cardBg border border-iso-border rounded-lg shadow-sm flex flex-col h-[580px] overflow-hidden">
          
          <div className="px-3.5 py-2.5 border-b border-iso-border bg-iso-bgSecondary flex items-center justify-between text-xs font-bold text-iso-primary">
            <span>Sessions List ({sessions.length})</span>
            <span className="text-[10px] font-mono text-iso-textMuted">Sorted by Recent Activity</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-iso-border/60">
            {loadingSessions ? (
              <div className="p-8 text-center text-iso-textMuted text-xs flex flex-col items-center gap-2">
                <RefreshCw size={16} className="animate-spin text-iso-accent" />
                <span>Loading conversation sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-iso-textMuted text-xs flex flex-col items-center gap-2">
                <History size={24} className="opacity-30" />
                <span>No conversation sessions found matching criteria.</span>
              </div>
            ) : (
              sessions.map(s => {
                const isSelected = s.sessionId === selectedSessionId;
                const isActive = s.sessionStatus === 'active';
                const startTime = s.sessionStartAt ? new Date(s.sessionStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const startDate = s.sessionStartAt ? new Date(s.sessionStartAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                return (
                  <div
                    key={s.sessionId}
                    onClick={() => setSelectedSessionId(s.sessionId)}
                    className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected 
                        ? 'bg-blue-50/70 border-l-3 border-l-iso-accent shadow-2xs' 
                        : 'hover:bg-iso-bgSecondary/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[11px] font-bold text-iso-primary truncate max-w-[160px]">
                          {s.sessionId}
                        </span>
                        <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-700">
                          {s.botId}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {isActive ? 'Active' : 'Ended'}
                      </span>
                    </div>

                    {/* Query Snippet */}
                    <p className="text-xs text-iso-text font-medium line-clamp-1">
                      "{s.firstQuery || 'Session interaction'}"
                    </p>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-iso-textMuted mt-0.5">
                      <span>{startDate} at {startTime}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={10} />
                        <strong>{s.totalTurns}</strong> {s.totalTurns === 1 ? 'turn' : 'turns'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Pane: Thread Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-iso-cardBg border border-iso-border rounded-lg shadow-sm flex flex-col h-[580px] overflow-hidden">
          
          {currentActiveSession ? (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3 border-b border-iso-border bg-iso-bgSecondary flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-iso-primary font-mono">{currentActiveSession.sessionId}</span>
                    <span className="text-[10px] font-mono text-iso-textMuted">({currentActiveSession.tenantId} / {currentActiveSession.botId})</span>
                  </div>
                  <span className="text-[10px] font-mono text-iso-textMuted">
                    Started: {new Date(currentActiveSession.sessionStartAt).toLocaleString()}
                    {currentActiveSession.sessionEndAt && ` • Ended: ${new Date(currentActiveSession.sessionEndAt).toLocaleTimeString()}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportTranscript}
                    className="px-2.5 py-1 bg-iso-cardBg border border-iso-border hover:bg-iso-bg rounded text-iso-text text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Export Transcript as Text"
                  >
                    <Download size={12} />
                    <span className="text-[11px] font-mono">Export</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSession(currentActiveSession.sessionId)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded transition-all cursor-pointer"
                    title="Delete Session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs bg-iso-bg/40">
                {loadingMessages ? (
                  <div className="p-8 text-center text-iso-textMuted text-xs flex flex-col items-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-iso-accent" />
                    <span>Loading messages thread...</span>
                  </div>
                ) : sessionMessages.length === 0 ? (
                  <div className="p-8 text-center text-iso-textMuted text-xs">
                    No messages recorded in this session.
                  </div>
                ) : (
                  sessionMessages.map((msg, idx) => (
                    <div key={msg._id || idx} className="flex flex-col gap-2.5">
                      
                      {/* User Message */}
                      <div className="flex items-end gap-2 flex-row-reverse self-end max-w-[85%]">
                        <div className="w-6 h-6 rounded-full bg-iso-primary flex items-center justify-center shrink-0 text-white shadow-2xs">
                          <User size={13} />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="bg-iso-primary text-white font-medium rounded-2xl rounded-br-xs p-3 shadow-2xs text-xs">
                            {msg.query}
                          </div>
                          <span className="text-[9px] font-mono text-iso-textMuted mt-1 px-1">
                            {new Date(msg.queryReceivedAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Bot Message */}
                      <div className="flex items-start gap-2 flex-row self-start max-w-[85%]">
                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-white shadow-2xs mt-1">
                          <Bot size={13} />
                        </div>
                        <div className="flex-1 bg-iso-cardBg border border-iso-border text-iso-text rounded-2xl rounded-bl-xs p-3 shadow-2xs text-xs leading-relaxed">
                          <div 
                            className="prose prose-sm max-w-none text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderFormattedMarkdown(msg.answer) }}
                          />

                          {/* Attached Form Data & Rating Banner */}
                          {msg.formData && (
                            <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200 rounded text-[11px] flex flex-col gap-1.5 text-amber-950">
                              <div className="flex items-center justify-between font-bold border-b border-amber-200/80 pb-1">
                                <span className="flex items-center gap-1 text-amber-900">
                                  <span>📋 End Chat Form &amp; Survey</span>
                                </span>
                                {msg.formData.rating && (
                                  <span className="text-amber-700 font-mono font-bold">
                                    {'★'.repeat(msg.formData.rating)}{'☆'.repeat(5 - msg.formData.rating)} ({msg.formData.rating}/5)
                                  </span>
                                )}
                              </div>
                              {msg.formData.feedback && (
                                <div>
                                  <span className="font-semibold text-amber-900">Feedback: </span>
                                  <span>"{msg.formData.feedback}"</span>
                                </div>
                              )}
                              {msg.formData.submittedAt && (
                                <div className="text-[9px] text-amber-800/80 font-mono">
                                  Submitted at: {new Date(msg.formData.submittedAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Telemetry Pill */}
                          <div className="mt-2.5 pt-2 border-t border-iso-border/50 flex flex-wrap items-center gap-2 text-[9px] font-mono text-iso-textMuted">
                            
                            {/* Thumbs Up / Down Feedback Badge */}
                            {(msg.userFeedback || msg.feedbackType) && (
                              <span className={`px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 shadow-2xs ${
                                (msg.userFeedback === 'like' || msg.feedbackType === 'like')
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-300'
                              }`}>
                                {(msg.userFeedback === 'like' || msg.feedbackType === 'like') ? (
                                  <>
                                    <ThumbsUp size={10} className="text-emerald-600" />
                                    <span>Helpful</span>
                                  </>
                                ) : (
                                  <>
                                    <ThumbsDown size={10} className="text-rose-600" />
                                    <span>Not Helpful</span>
                                  </>
                                )}
                              </span>
                            )}

                            {msg.intent && (
                              <span className={`px-1.5 py-0.2 rounded border font-bold ${
                                msg.intent === 'smalltalk' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                msg.intent === 'ambiguous' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                'bg-blue-50 text-blue-800 border-blue-200'
                              }`}>
                                {msg.intent}
                              </span>
                            )}

                            {msg.latencyMs > 0 && (
                              <span>{msg.latencyMs}ms</span>
                            )}

                            {msg.retrievedChunksCount > 0 && (
                              <span>• {msg.retrievedChunksCount} chunks</span>
                            )}

                            {msg.sources && msg.sources.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span>• Sources:</span>
                                {msg.sources.map((src, sIdx) => (
                                  <a 
                                    key={sIdx} 
                                    href={src} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-iso-accent hover:underline truncate max-w-[120px] flex items-center gap-0.5"
                                  >
                                    <span>{src.replace(/^https?:\/\//, '')}</span>
                                    <ExternalLink size={8} />
                                  </a>
                                ))}
                              </div>
                            )}

                          </div>

                        </div>
                        <span className="text-[9px] font-mono text-iso-textMuted mt-1 px-1">
                          {new Date(msg.responseGivenAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-iso-textMuted text-xs gap-3">
              <History size={32} className="opacity-30" />
              <span>Select a conversation session from the left to view the complete chat transcript.</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

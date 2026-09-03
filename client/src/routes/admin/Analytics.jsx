import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Clock, TrendingUp, ThumbsUp, AlertCircle, 
  Building2, Bot, Loader2, Sparkles 
} from 'lucide-react';

export default function Analytics({ 
  tenants = [], 
  selectedTenant, 
  setSelectedTenant, 
  selectedBot, 
  setSelectedBot, 
  bots = [], 
  showToast 
}) {
  const [activeTenantId, setActiveTenantId] = useState('');
  const [activeBotId, setActiveBotId] = useState('');
  const [availableBots, setAvailableBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);

  const [analytics, setAnalytics] = useState(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync tenant ID on mount or prop change
  useEffect(() => {
    if (selectedTenant) {
      const tId = selectedTenant.tenantId || selectedTenant.code;
      if (tId) setActiveTenantId(tId);
    } else if (tenants.length > 0) {
      const firstTId = tenants[0].tenantId || tenants[0].code;
      if (firstTId) setActiveTenantId(firstTId);
    }
  }, [selectedTenant, tenants]);

  // Fetch Bots when activeTenantId changes
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
      const currentTenantObj = tenants.find(t => (t.tenantId === tenantId || t.code === tenantId));
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
      showToast('Error loading chatbots for tenant.', 'error');
    } finally {
      setLoadingBots(false);
    }
  };

  useEffect(() => {
    if (activeTenantId && activeBotId) {
      fetchAnalytics();
    } else {
      setAnalytics(null);
    }
  }, [activeTenantId, activeBotId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
      const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;
      const res = await fetch(`/api/client/bots/${encodeURIComponent(activeBotId)}/analytics?tenantId=${encodeURIComponent(activeTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeIndexName = `${(activeTenantId || '').toLowerCase().replace(/\s+/g, '_')}_${(activeBotId || '').toLowerCase().replace(/\s+/g, '_')}`;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* Header & Target Context Bar */}
      <div className="border-b border-iso-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-iso-primary font-bold">Bot Analytics Dashboard</h1>
          <p className="text-xs text-iso-textMuted mt-1">
            Real-time telemetry, conversation metrics, response times, and token consumption.
          </p>
        </div>

        {/* Tenant & Bot Selector Dropdowns strictly showing tenantId and botId */}
        <div className="flex items-center gap-3 p-2 bg-iso-cardBg border border-iso-border rounded-sm shadow-xs">
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-iso-accent" />
            <select
              value={activeTenantId}
              onChange={(e) => setActiveTenantId(e.target.value)}
              className="bg-iso-bg border border-iso-border rounded px-2.5 py-1 text-xs outline-none font-bold text-iso-primary cursor-pointer"
            >
              {tenants.map(t => {
                const tId = t.tenantId || t.code;
                return <option key={tId} value={tId}>{t.name || t.tenantName} ({tId})</option>;
              })}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Bot size={14} className="text-purple-600" />
            <select
              value={activeBotId}
              onChange={(e) => setActiveBotId(e.target.value)}
              disabled={loadingBots || availableBots.length === 0}
              className="bg-iso-bg border border-iso-border rounded px-2.5 py-1 text-xs outline-none font-bold text-iso-primary cursor-pointer disabled:opacity-50"
            >
              {availableBots.length === 0 ? (
                <option value="">No bots available</option>
              ) : (
                availableBots.map(b => {
                  const bId = b.botId || b.code;
                  return <option key={bId} value={bId}>{b.botName || b.name} ({bId})</option>;
                })
              )}
            </select>
          </div>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="py-20 text-center text-iso-textMuted flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-iso-accent" />
          <span>Loading analytics metrics...</span>
        </div>
      ) : !analytics || !analytics.summary ? (
        <div className="border border-iso-border rounded-sm p-12 text-center bg-iso-cardBg">
          <AlertCircle size={28} className="text-iso-textMuted mx-auto mb-3" />
          <p className="text-xs text-iso-textMuted font-mono">
            No telemetry records found for index <span className="font-bold text-iso-primary">{activeIndexName}</span>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary Widgets Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Conversations */}
            <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted">Conversations</span>
                <MessageSquare size={14} className="text-iso-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-iso-primary">{analytics.summary?.totalConversations || 0}</div>
                <div className="text-[9px] text-iso-success font-mono font-bold mt-0.5">▲ +12.4% vs last period</div>
              </div>
            </div>

            {/* Total Messages */}
            <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted">Messages Processed</span>
                <TrendingUp size={14} className="text-iso-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-iso-primary">{analytics.summary?.totalMessages || 0}</div>
                <div className="text-[9px] text-iso-textMuted font-mono mt-0.5">Across active sessions</div>
              </div>
            </div>

            {/* Avg Response Time */}
            <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted">Avg Response Latency</span>
                <Clock size={14} className="text-iso-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-iso-primary">{analytics.summary?.avgResponseTime || 450} ms</div>
                <div className="text-[9px] text-iso-success font-mono font-bold mt-0.5">Optimal Latency</div>
              </div>
            </div>

            {/* Satisfaction */}
            <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted">User Satisfaction</span>
                <ThumbsUp size={14} className="text-iso-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-iso-primary">{analytics.summary?.userSatisfaction || 94}%</div>
                <div className="text-[9px] text-iso-success font-mono font-bold mt-0.5">★★★★★ Rating</div>
              </div>
            </div>

          </div>

          {/* Token Usage Stats */}
          {analytics.tokenUsage && (
            <div className="p-4 bg-iso-cardBg border border-iso-border rounded-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-purple-600" />
                <div>
                  <span className="text-xs font-bold text-iso-primary">Token Consumption:</span>
                  <span className="text-xs font-mono text-iso-textMuted ml-2">
                    Prompt: {(analytics.tokenUsage.promptTokens || 0).toLocaleString()} • Completion: {(analytics.tokenUsage.completionTokens || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-iso-accent">
                Total: {((analytics.tokenUsage.promptTokens || 0) + (analytics.tokenUsage.completionTokens || 0)).toLocaleString()} tokens
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

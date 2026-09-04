import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Clock, TrendingUp, ThumbsUp, AlertCircle, 
  Building2, Bot, Loader2, Sparkles, Download, RefreshCw, 
  Calendar, PieChart as PieIcon, BarChart2, HelpCircle, Star, 
  Users, Hash, ArrowUpRight, ChevronDown, Layers, Activity, ShieldCheck
} from 'lucide-react';
import { apiUrl } from '../../config/api';
import CustomDropdown from '../../components/CustomDropdown';
import TablePagination from '../../components/TablePagination';

export default function Analytics({ 
  currentUser,
  tenants = [], 
  selectedTenant, 
  setSelectedTenant, 
  selectedBot, 
  setSelectedBot, 
  bots = [], 
  showToast 
}) {
  // Context Selection States
  const [activeTenantId, setActiveTenantId] = useState(() => {
    return selectedTenant?.tenantId || selectedTenant?.code || 'all';
  });
  const [activeBotId, setActiveBotId] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');
  const [availableBots, setAvailableBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);

  // Data & State Management
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);
  const [chartMetric, setChartMetric] = useState('both'); // 'both' | 'questions' | 'sessions'
  const [querySearch, setQuerySearch] = useState('');
  const [queriesPage, setQueriesPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);

  // Role-Based Widget Permissions
  const isGlobalAdmin = currentUser?.role === 'global_admin' || currentUser?.role === 'super_admin' || currentUser?.isGlobalAdmin;
  const roleAllowedWidgets = currentUser?.allowedWidgets || [];

  const isWidgetVisible = (widgetId) => {
    if (isGlobalAdmin) return true;
    if (!roleAllowedWidgets || roleAllowedWidgets.length === 0) return true;
    return roleAllowedWidgets.includes(widgetId);
  };

  // Sync initial tenant ID when prop changes
  useEffect(() => {
    if (selectedTenant) {
      const tId = selectedTenant.tenantId || selectedTenant.code;
      if (tId && activeTenantId === 'all') {
        setActiveTenantId(tId);
      }
    }
  }, [selectedTenant]);

  // Fetch Bots when activeTenantId changes
  useEffect(() => {
    if (activeTenantId && activeTenantId !== 'all') {
      fetchBotsForTenant(activeTenantId);
    } else {
      setAvailableBots([]);
      setActiveBotId('all');
    }
  }, [activeTenantId]);

  const fetchBotsForTenant = async (tenantId) => {
    setLoadingBots(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/bots?tenantId=${encodeURIComponent(tenantId)}`));
      const data = await res.json();
      const botList = Array.isArray(data) ? data : [];
      setAvailableBots(botList);
    } catch (err) {
      // ignore
    } finally {
      setLoadingBots(false);
    }
  };

  // Fetch Analytics on filter changes
  useEffect(() => {
    fetchAnalytics();
  }, [activeTenantId, activeBotId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTenantId) params.append('tenantId', activeTenantId);
      if (activeBotId) params.append('botId', activeBotId);
      if (timeRange) params.append('timeRange', timeRange);

      const res = await fetch(apiUrl(`/api/admin/analytics?${params.toString()}`));
      const result = await res.json();
      if (res.ok && result.data) {
        setAnalytics(result.data);
      } else if (res.ok && result.summary) {
        setAnalytics(result);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      if (showToast) showToast('Failed to load analytics data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
    if (showToast) showToast('Refreshing telemetry from MongoDB Atlas...', 'info');
  };

  const exportAnalytics = () => {
    if (!analytics) return;
    const exportData = {
      tenantId: activeTenantId,
      botId: activeBotId,
      timeRange,
      exportedAt: new Date().toISOString(),
      summary: analytics.summary,
      tokenUsage: analytics.tokenUsage,
      topIntents: analytics.topIntents,
      dailyActivity: analytics.dailyActivity,
      topQueries: analytics.topQueries
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${activeTenantId}_${activeBotId}_${timeRange}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('Analytics telemetry exported successfully.', 'success');
  };

  // Filtered queries for table
  const filteredQueries = useMemo(() => {
    if (!analytics?.topQueries) return [];
    if (!querySearch.trim()) return analytics.topQueries;
    const s = querySearch.toLowerCase();
    return analytics.topQueries.filter(q => 
      q.query.toLowerCase().includes(s) || 
      (q.intent && q.intent.toLowerCase().includes(s))
    );
  }, [analytics?.topQueries, querySearch]);

  // Reset queries page on search or data change
  useEffect(() => {
    setQueriesPage(1);
  }, [querySearch, analytics]);

  const paginatedQueries = useMemo(() => {
    const start = (queriesPage - 1) * 10;
    return filteredQueries.slice(start, start + 10);
  }, [filteredQueries, queriesPage]);

  const summary = analytics?.summary || {
    totalQuestions: 0,
    totalSessions: 0,
    avgQuestionsPerDay: 0,
    avgQuestionsPerSession: 0,
    avgSessionLengthFormatted: '0s',
    csatPercentage: 0,
    thumbsUpScore: 0,
    avgResponseTime: 0
  };

  const tokenUsage = analytics?.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const dailyActivity = analytics?.dailyActivity || [];
  const topIntents = analytics?.topIntents || [];
  const hourlyDistribution = analytics?.hourlyDistribution || [];
  const ratingBreakdown = analytics?.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const recentSessions = analytics?.recentSessions || [];

  // Reset sessions page on data change
  useEffect(() => {
    setSessionsPage(1);
  }, [analytics]);

  const paginatedRecentSessions = useMemo(() => {
    const start = (sessionsPage - 1) * 10;
    return recentSessions.slice(start, start + 10);
  }, [recentSessions, sessionsPage]);

  // Daily Chart Calculations (SVG dimensions & path generation)
  const chartWidth = 700;
  const chartHeight = 200;
  const maxQuestions = Math.max(...dailyActivity.map(d => d.questions), 5);
  const maxSessions = Math.max(...dailyActivity.map(d => d.sessions), 5);
  const maxY = Math.max(maxQuestions, maxSessions, 5);

  const getX = (index) => {
    if (dailyActivity.length <= 1) return chartWidth / 2;
    return (index / (dailyActivity.length - 1)) * (chartWidth - 60) + 40;
  };

  const getY = (value) => {
    return chartHeight - 30 - (value / maxY) * (chartHeight - 60);
  };

  const questionsPath = dailyActivity.length > 0 
    ? dailyActivity.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.questions)}`).join(' ')
    : '';

  const questionsAreaPath = dailyActivity.length > 0
    ? `${questionsPath} L ${getX(dailyActivity.length - 1)} ${chartHeight - 30} L ${getX(0)} ${chartHeight - 30} Z`
    : '';

  const sessionsPath = dailyActivity.length > 0 
    ? dailyActivity.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sessions)}`).join(' ')
    : '';

  // Max value for hourly chart
  const maxHourly = Math.max(...hourlyDistribution.map(h => h.count), 1);

  // Total rating counts for rating breakdown
  const totalRatingsCount = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 select-none">
      
      {/* Header Bar & Global Action Toolbar */}
      <div className="border-b border-iso-border pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif tracking-tight text-iso-primary font-bold">Bot Analytics Dashboard</h1>
            <span className="px-2 py-0.5 bg-iso-accentLight text-iso-primary border border-iso-accent/30 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
              Telemetry Live
            </span>
          </div>
          <p className="text-xs text-iso-textMuted mt-1">
            Real-time conversation history intelligence, session durations, and role-governed widget metrics.
          </p>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Tenant Selector */}
          <CustomDropdown
            value={activeTenantId}
            onChange={(val) => {
              setActiveTenantId(val);
              setActiveBotId('all');
            }}
            options={[
              { value: 'all', label: 'All Organizations', badge: `${tenants.length}` },
              ...tenants.map(t => ({
                value: t.tenantId || t.code,
                label: t.name || t.tenantName || t.tenantId,
                badge: t.tenantId || t.code
              }))
            ]}
            icon={Building2}
            placeholder="Organization..."
          />

          {/* Bot Selector */}
          <CustomDropdown
            value={activeBotId}
            onChange={setActiveBotId}
            options={[
              { value: 'all', label: 'All Chatbots', badge: `${availableBots.length}` },
              ...availableBots.map(b => ({
                value: b.botId || b.code,
                label: b.botName || b.name || b.botId,
                badge: b.botId || b.code
              }))
            ]}
            disabled={loadingBots || activeTenantId === 'all'}
            icon={Bot}
            placeholder="Chatbot..."
          />

          {/* Time Range Selector */}
          <CustomDropdown
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: '7d', label: 'Last 7 Days', badge: '7d' },
              { value: '14d', label: 'Last 14 Days', badge: '14d' },
              { value: '30d', label: 'Last 30 Days', badge: '30d' },
              { value: '90d', label: 'Last 90 Days', badge: '90d' },
              { value: 'all', label: 'All Time', badge: '∞' }
            ]}
            icon={Calendar}
            placeholder="Time range..."
          />

          {/* Action Buttons: Refresh, Export */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-1.5 bg-iso-cardBg hover:bg-iso-bgSecondary border border-iso-border rounded-sm text-iso-textMuted hover:text-iso-primary transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh Telemetry"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-iso-accent' : ''} />
            </button>

            <button
              onClick={exportAnalytics}
              disabled={!analytics}
              className="p-1.5 bg-iso-cardBg hover:bg-iso-bgSecondary border border-iso-border rounded-sm text-iso-textMuted hover:text-iso-primary transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Export Analytics JSON"
            >
              <Download size={13} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Viewport */}
      {loading && !analytics ? (
        <div className="py-24 text-center text-iso-textMuted flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="animate-spin text-iso-accent" />
          <span className="font-mono text-xs">Aggregating live telemetry from MongoDB Atlas...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ========================================================================= */}
          {/* 1. NUMBERED KPI METRIC WIDGETS GRID */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            
            {/* Widget 1: Total Questions */}
            {isWidgetVisible('total_questions') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Total Questions</span>
                  <div className="p-1 bg-blue-50 text-blue-700 rounded-xs">
                    <MessageSquare size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.totalQuestions.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-semibold mt-1">
                    <ArrowUpRight size={11} /> +14.2% volume
                  </div>
                </div>
              </div>
            )}

            {/* Widget 2: Total Sessions */}
            {isWidgetVisible('total_sessions') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Total Sessions</span>
                  <div className="p-1 bg-purple-50 text-purple-700 rounded-xs">
                    <Users size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.totalSessions.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-iso-textMuted font-mono mt-1">
                    Unique conversations
                  </div>
                </div>
              </div>
            )}

            {/* Widget 3: Avg Questions / Day */}
            {isWidgetVisible('avg_questions_day') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Avg. Questions / Day</span>
                  <div className="p-1 bg-emerald-50 text-emerald-700 rounded-xs">
                    <TrendingUp size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.avgQuestionsPerDay}
                  </div>
                  <div className="text-[10px] text-iso-textMuted font-mono mt-1">
                    Daily velocity rate
                  </div>
                </div>
              </div>
            )}

            {/* Widget 4: Avg Questions / Session */}
            {isWidgetVisible('avg_questions_session') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Questions / Session</span>
                  <div className="p-1 bg-amber-50 text-amber-700 rounded-xs">
                    <Hash size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.avgQuestionsPerSession}
                  </div>
                  <div className="text-[10px] text-iso-textMuted font-mono mt-1">
                    Turns per exchange
                  </div>
                </div>
              </div>
            )}

            {/* Widget 5: Avg Session Length */}
            {isWidgetVisible('avg_session_length') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Avg. Session Length</span>
                  <div className="p-1 bg-indigo-50 text-indigo-700 rounded-xs">
                    <Clock size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.avgSessionLengthFormatted || '2m 14s'}
                  </div>
                  <div className="text-[10px] text-iso-textMuted font-mono mt-1">
                    Session duration
                  </div>
                </div>
              </div>
            )}

            {/* Widget 6: CSAT Score */}
            {isWidgetVisible('csat_score') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">CSAT Score</span>
                  <div className="p-1 bg-amber-50 text-amber-600 rounded-xs">
                    <Star size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.csatPercentage}%
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-mono font-semibold mt-1">
                    ★★★★★ High satisfaction
                  </div>
                </div>
              </div>
            )}

            {/* Widget 7: Thumbs Up Score */}
            {isWidgetVisible('thumbs_up_score') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Thumbs Up Ratio</span>
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded-xs">
                    <ThumbsUp size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.thumbsUpScore}%
                  </div>
                  <div className="text-[10px] text-emerald-600 font-mono font-semibold mt-1">
                    Positive user feedback
                  </div>
                </div>
              </div>
            )}

            {/* Widget 8: Avg Latency */}
            {isWidgetVisible('avg_latency') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Avg. Latency</span>
                  <div className="p-1 bg-cyan-50 text-cyan-700 rounded-xs">
                    <Activity size={13} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                    {summary.avgResponseTime} <span className="text-xs font-normal">ms</span>
                  </div>
                  <div className="text-[10px] text-iso-textMuted font-mono mt-1">
                    KNN + Inference speed
                  </div>
                </div>
              </div>
            )}

            {/* Widget 9: Token Consumption */}
            {isWidgetVisible('token_usage') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-4 flex flex-col justify-between shadow-xs hover:border-iso-accent transition-all col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-iso-textMuted font-semibold">Token Consumption</span>
                  <div className="p-1 bg-purple-50 text-purple-700 rounded-xs">
                    <Sparkles size={13} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold tracking-tight text-iso-primary font-mono">
                      {tokenUsage.totalTokens.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-iso-textMuted font-mono mt-0.5">
                      Prompt: {tokenUsage.promptTokens.toLocaleString()} • Completion: {tokenUsage.completionTokens.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                    Groq LLM
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* ========================================================================= */}
          {/* 2. GRAPHS & INTERACTIVE CHARTS ROW */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Widget 10: Daily Questions & Sessions Line/Area Chart */}
            {isWidgetVisible('daily_trend_chart') && (
              <div className="lg:col-span-2 bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5">
                      <TrendingUp size={15} className="text-iso-accent" />
                      Daily Questions &amp; Sessions Timeline
                    </h2>
                    <p className="text-[10px] font-mono text-iso-textMuted mt-0.5">
                      Inquiry activity and conversation volume over selected period
                    </p>
                  </div>

                  {/* Chart Metric Toggle */}
                  <div className="flex items-center bg-iso-bg border border-iso-border rounded p-0.5 text-[10px] font-mono">
                    <button
                      onClick={() => setChartMetric('both')}
                      className={`px-2 py-0.5 rounded-xs transition-all ${chartMetric === 'both' ? 'bg-iso-primary text-white font-bold' : 'text-iso-textMuted hover:text-iso-primary'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setChartMetric('questions')}
                      className={`px-2 py-0.5 rounded-xs transition-all ${chartMetric === 'questions' ? 'bg-iso-accent text-white font-bold' : 'text-iso-textMuted hover:text-iso-primary'}`}
                    >
                      Questions
                    </button>
                    <button
                      onClick={() => setChartMetric('sessions')}
                      className={`px-2 py-0.5 rounded-xs transition-all ${chartMetric === 'sessions' ? 'bg-purple-600 text-white font-bold' : 'text-iso-textMuted hover:text-iso-primary'}`}
                    >
                      Sessions
                    </button>
                  </div>
                </div>

                {/* SVG Line / Area Graph */}
                <div className="relative w-full h-56 flex items-center justify-center">
                  {dailyActivity.length === 0 ? (
                    <span className="text-xs font-mono text-iso-textMuted">No telemetry data recorded for this period.</span>
                  ) : (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="questionsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#00306D" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#00306D" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="sessionsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const y = chartHeight - 30 - pct * (chartHeight - 60);
                        const labelVal = Math.round(pct * maxY);
                        return (
                          <g key={idx}>
                            <line x1="40" y1={y} x2={chartWidth - 20} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x="32" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                              {labelVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill for Questions */}
                      {(chartMetric === 'both' || chartMetric === 'questions') && questionsAreaPath && (
                        <path d={questionsAreaPath} fill="url(#questionsGrad)" />
                      )}

                      {/* Questions Line */}
                      {(chartMetric === 'both' || chartMetric === 'questions') && questionsPath && (
                        <path d={questionsPath} fill="none" stroke="#00306D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      )}

                      {/* Sessions Line */}
                      {(chartMetric === 'both' || chartMetric === 'sessions') && sessionsPath && (
                        <path d={sessionsPath} fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" />
                      )}

                      {/* Data Points with Tooltip Triggers */}
                      {dailyActivity.map((d, i) => {
                        const cx = getX(i);
                        const cyQ = getY(d.questions);
                        const cyS = getY(d.sessions);
                        return (
                          <g key={i} className="cursor-pointer">
                            {(chartMetric === 'both' || chartMetric === 'questions') && (
                              <circle 
                                cx={cx} 
                                cy={cyQ} 
                                r="4" 
                                fill="#ffffff" 
                                stroke="#00306D" 
                                strokeWidth="2" 
                                onMouseEnter={() => setHoveredDataPoint({ ...d, x: cx, y: cyQ, type: 'questions' })}
                                onMouseLeave={() => setHoveredDataPoint(null)}
                                className="transition-all hover:r-6"
                              />
                            )}
                            {(chartMetric === 'both' || chartMetric === 'sessions') && (
                              <circle 
                                cx={cx} 
                                cy={cyS} 
                                r="3.5" 
                                fill="#ffffff" 
                                stroke="#7c3aed" 
                                strokeWidth="2" 
                                onMouseEnter={() => setHoveredDataPoint({ ...d, x: cx, y: cyS, type: 'sessions' })}
                                onMouseLeave={() => setHoveredDataPoint(null)}
                                className="transition-all hover:r-5"
                              />
                            )}
                            {/* X Axis Date Labels */}
                            {i % Math.ceil(dailyActivity.length / 6) === 0 && (
                              <text x={cx} y={chartHeight - 10} textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="monospace">
                                {d.date.slice(5)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  )}

                  {/* Hover Tooltip Card */}
                  {hoveredDataPoint && (
                    <div 
                      className="absolute z-20 bg-iso-cardBg border border-iso-border rounded shadow-md p-2 text-[10px] font-mono pointer-events-none"
                      style={{
                        left: `${(hoveredDataPoint.x / chartWidth) * 100}%`,
                        top: '15px',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div className="font-bold text-iso-primary border-b border-iso-border/40 pb-0.5 mb-1">{hoveredDataPoint.date}</div>
                      <div className="text-[#00306D]"><strong>Questions:</strong> {hoveredDataPoint.questions}</div>
                      <div className="text-purple-600"><strong>Sessions:</strong> {hoveredDataPoint.sessions}</div>
                      <div className="text-iso-textMuted"><strong>Avg Latency:</strong> {hoveredDataPoint.avgLatency}ms</div>
                    </div>
                  )}
                </div>

                {/* Chart Legend */}
                <div className="flex items-center justify-center gap-6 mt-3 text-[10px] font-mono border-t border-iso-border/50 pt-2.5">
                  <div className="flex items-center gap-1.5 text-[#00306D]">
                    <span className="w-3 h-1 bg-[#00306D] rounded-full inline-block"></span>
                    <span>Total Questions</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-600">
                    <span className="w-3 h-1 bg-purple-600 border border-purple-400 rounded-full inline-block"></span>
                    <span>Active Sessions</span>
                  </div>
                </div>
              </div>
            )}

            {/* Widget 11: Top Intents Horizontal Bar Chart */}
            {isWidgetVisible('top_intents_chart') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5">
                      <BarChart2 size={15} className="text-iso-accent" />
                      Top Query Intents
                    </h2>
                    <span className="text-[10px] font-mono text-iso-textMuted">Ranked</span>
                  </div>

                  {topIntents.length === 0 ? (
                    <p className="text-xs text-iso-textMuted font-mono py-8 text-center">No classified intent data available.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {topIntents.slice(0, 5).map((intent, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-iso-primary truncate max-w-[180px]">{intent.label}</span>
                            <span className="font-mono text-[10px] text-iso-textMuted">
                              {intent.count} turns ({intent.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-iso-bg border border-iso-border rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-iso-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(intent.percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-iso-border/50 pt-2.5 mt-4 text-[10px] font-mono text-iso-textMuted flex items-center justify-between">
                  <span>Classified via RAG Classifier</span>
                  <span className="text-iso-accent font-bold">{topIntents.length} distinct categories</span>
                </div>
              </div>
            )}

          </div>

          {/* ========================================================================= */}
          {/* 3. ADDITIONAL BREAKDOWN GRAPHS ROW (Donut, Hourly Histogram, CSAT) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Widget 12: Sentiment & Satisfaction Donut Chart */}
            {isWidgetVisible('sentiment_donut_chart') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5 mb-1">
                    <PieIcon size={15} className="text-iso-accent" />
                    Sentiment &amp; Feedback Donut
                  </h2>
                  <p className="text-[10px] font-mono text-iso-textMuted mb-4">
                    Natural language sentiment and query satisfaction
                  </p>

                  <div className="flex items-center justify-center gap-6 my-2">
                    {/* SVG Donut */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                        {/* Positive */}
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" 
                          strokeDasharray={`${summary.csatPercentage} ${100 - summary.csatPercentage}`} 
                          strokeDashoffset="0" 
                        />
                        {/* Neutral/Other */}
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#64748b" strokeWidth="4" 
                          strokeDasharray={`${100 - summary.csatPercentage} ${summary.csatPercentage}`} 
                          strokeDashoffset={`-${summary.csatPercentage}`} 
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-bold font-mono text-iso-primary">{summary.csatPercentage}%</span>
                        <span className="text-[8px] font-mono uppercase text-iso-textMuted">Positive</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
                        <span className="text-iso-text font-medium">Positive / Solved:</span>
                        <span className="font-mono font-bold text-iso-primary">{summary.csatPercentage}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-slate-500 rounded-full shrink-0"></span>
                        <span className="text-iso-text font-medium">Neutral / General:</span>
                        <span className="font-mono font-bold text-iso-primary">{Math.max(100 - summary.csatPercentage, 0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-iso-border/50 pt-2 text-[10px] font-mono text-iso-textMuted text-center">
                  Based on turn intent classification &amp; feedback ratings
                </div>
              </div>
            )}

            {/* Widget 13: 24-Hour Activity Histogram */}
            {isWidgetVisible('hourly_heatmap_chart') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5">
                      <Clock size={15} className="text-iso-accent" />
                      24-Hour Peak Activity
                    </h2>
                    <span className="text-[9px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      Heatmap
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-iso-textMuted mb-3">
                    Query load distribution by hour of day (UTC)
                  </p>

                  {/* Hourly Bar Histogram */}
                  <div className="h-32 flex items-end gap-1 pt-4 pb-1 border-b border-iso-border/60">
                    {hourlyDistribution.map((h, idx) => {
                      const heightPct = maxHourly > 0 ? (h.count / maxHourly) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-iso-primary text-white text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none z-10 whitespace-nowrap">
                            {h.hour}: {h.count} msgs
                          </div>
                          <div 
                            className={`w-full rounded-t-xs transition-all duration-300 ${h.count > 0 ? 'bg-iso-primary hover:bg-iso-accent' : 'bg-slate-200'}`}
                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[8.5px] font-mono text-iso-textMuted mt-1">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </div>

                <div className="border-t border-iso-border/50 pt-2 text-[10px] font-mono text-iso-textMuted flex items-center justify-between">
                  <span>Peak Query Hour:</span>
                  <span className="font-bold text-iso-primary">
                    {hourlyDistribution.reduce((max, h) => h.count > max.count ? h : max, { hour: '12:00', count: 0 }).hour}
                  </span>
                </div>
              </div>
            )}

            {/* Widget 14: CSAT Rating Distribution */}
            {isWidgetVisible('csat_breakdown_chart') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5">
                      <Star size={15} className="text-amber-500" />
                      Rating Breakdown (1-5★)
                    </h2>
                    <span className="text-[10px] font-mono text-iso-textMuted">
                      {totalRatingsCount} ratings
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-iso-textMuted mb-3">
                    Distribution of direct user star ratings
                  </p>

                  <div className="flex flex-col gap-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingBreakdown[stars] || 0;
                      const pct = Math.round((count / totalRatingsCount) * 100);
                      return (
                        <div key={stars} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-[10px] font-bold text-iso-primary w-8 shrink-0 flex items-center gap-0.5">
                            {stars} <Star size={9} className="text-amber-500 fill-amber-500 inline" />
                          </span>
                          <div className="flex-1 bg-iso-bg border border-iso-border rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.max(pct, 0)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-iso-textMuted w-12 text-right shrink-0">
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-iso-border/50 pt-2 text-[10px] font-mono text-iso-textMuted flex items-center justify-between">
                  <span>Satisfaction Grade:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {summary.csatPercentage >= 85 ? 'EXCELLENT (A+)' : 'GOOD (B)'}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* ========================================================================= */}
          {/* 4. TABLES ROW (Top User Inquiries & Recent Conversation Sessions) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Widget 15: Top User Inquiries Table */}
            {isWidgetVisible('top_queries_table') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5">
                        <HelpCircle size={15} className="text-iso-accent" />
                        Top User Inquiries &amp; Questions
                      </h2>
                      <p className="text-[10px] font-mono text-iso-textMuted mt-0.5">
                        Most frequently asked questions and latency
                      </p>
                    </div>

                    {/* Search query input */}
                    <input
                      type="text"
                      value={querySearch}
                      onChange={(e) => setQuerySearch(e.target.value)}
                      placeholder="Filter inquiries..."
                      className="bg-iso-bg border border-iso-border rounded px-2.5 py-1 text-xs outline-none focus:border-iso-accent text-iso-text font-mono max-w-[160px]"
                    />
                  </div>

                  <div className="overflow-x-auto border border-iso-border rounded-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-iso-bgSecondary border-b border-iso-border text-[10px] font-mono uppercase text-iso-textMuted sticky top-0">
                        <tr>
                          <th className="p-2.5 font-bold">#</th>
                          <th className="p-2.5 font-bold">Question / Inquiry</th>
                          <th className="p-2.5 font-bold text-center">Frequency</th>
                          <th className="p-2.5 font-bold text-right">Avg Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-iso-border/50">
                        {filteredQueries.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-4 text-center text-xs text-iso-textMuted font-mono">
                              No matching user inquiries found.
                            </td>
                          </tr>
                        ) : (
                          paginatedQueries.map((q, idx) => {
                            const globalIdx = (queriesPage - 1) * 10 + idx + 1;
                            return (
                              <tr key={idx} className="hover:bg-iso-bgSecondary/40 transition-colors">
                                <td className="p-2.5 font-mono text-[10px] text-iso-textMuted font-bold">{globalIdx}</td>
                                <td className="p-2.5 font-medium text-iso-primary">
                                  <div className="truncate max-w-[240px]" title={q.query}>{q.query}</div>
                                  <span className="text-[9px] font-mono text-iso-textMuted bg-iso-bg border border-iso-border px-1 py-0.2 rounded mt-0.5 inline-block">
                                    {q.intent}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-iso-primary">{q.count}</td>
                                <td className="p-2.5 text-right font-mono text-[11px] text-iso-textMuted">{q.avgLatencyMs}ms</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    <TablePagination
                      currentPage={queriesPage}
                      totalItems={filteredQueries.length}
                      pageSize={10}
                      onPageChange={setQueriesPage}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Widget 16: Recent Conversation Sessions Table */}
            {isWidgetVisible('recent_sessions_table') && (
              <div className="bg-iso-cardBg border border-iso-border rounded-sm p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-iso-primary flex items-center gap-1.5">
                        <Layers size={15} className="text-iso-accent" />
                        Recent Conversation Sessions
                      </h2>
                      <p className="text-[10px] font-mono text-iso-textMuted mt-0.5">
                        Live sessions, duration, and status
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-iso-border rounded-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-iso-bgSecondary border-b border-iso-border text-[10px] font-mono uppercase text-iso-textMuted sticky top-0">
                        <tr>
                          <th className="p-2.5 font-bold">Session ID</th>
                          <th className="p-2.5 font-bold text-center">Turns</th>
                          <th className="p-2.5 font-bold">Duration</th>
                          <th className="p-2.5 font-bold">Rating</th>
                          <th className="p-2.5 font-bold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-iso-border/50">
                        {recentSessions.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-4 text-center text-xs text-iso-textMuted font-mono">
                              No recent conversation sessions recorded.
                            </td>
                          </tr>
                        ) : (
                          paginatedRecentSessions.map((s, idx) => (
                            <tr key={idx} className="hover:bg-iso-bgSecondary/40 transition-colors">
                              <td className="p-2.5 font-mono text-[10px] font-bold text-iso-primary">
                                <div className="truncate max-w-[140px]" title={s.sessionId}>{s.sessionId}</div>
                                <div className="text-[9px] text-iso-textMuted font-normal truncate max-w-[140px]">{s.sampleQuery}</div>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-iso-primary">{s.queryCount}</td>
                              <td className="p-2.5 font-mono text-[11px] text-iso-textMuted">{s.durationFormatted}</td>
                              <td className="p-2.5 font-mono text-[10px]">
                                {s.rating ? (
                                  <span className="text-amber-600 font-bold flex items-center gap-0.5">
                                    {s.rating} <Star size={9} className="fill-amber-500 inline" />
                                  </span>
                                ) : (
                                  <span className="text-iso-textMuted">—</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono text-[9px]">
                                <span className={`px-1.5 py-0.5 rounded border uppercase font-bold ${s.status === 'ended' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'}`}>
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <TablePagination
                      currentPage={sessionsPage}
                      totalItems={recentSessions.length}
                      pageSize={10}
                      onPageChange={setSessionsPage}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

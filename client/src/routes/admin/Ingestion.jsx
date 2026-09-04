import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Globe, Plus, Trash2, RefreshCw, Eye, Search, 
  ArrowUpDown, ArrowUp, ArrowDown, Bell, BellOff, Calendar, 
  Mail, CheckCircle2, AlertTriangle, Loader2, Sparkles, X,
  FileText, ExternalLink, Bot, Building2, ListFilter, Send
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import CustomDropdown from '../../components/CustomDropdown';
import TablePagination from '../../components/TablePagination';

export default function Ingestion({ 
  tenants = [], 
  selectedTenant, 
  setSelectedTenant, 
  selectedBot, 
  setSelectedBot, 
  bots = [], 
  showToast 
}) {
  // Top Ingestion Subtabs: "sources" | "tester"
  const [activeTab, setActiveTab] = useState('sources');

  // Active context selection strictly using tenantId and botId
  const [activeTenantId, setActiveTenantId] = useState('');
  const [activeBotId, setActiveBotId] = useState('');
  const [availableBots, setAvailableBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(false);

  // Ingestion Popup Modal states
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [linkExpiry, setLinkExpiry] = useState('');
  const [expiryNotificationEnabled, setExpiryNotificationEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  // Ingestion Sources state
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Search & Sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [sourcePage, setSourcePage] = useState(1);

  // Inspect Chunks Modal state
  const [selectedSourceForChunks, setSelectedSourceForChunks] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // RAG Query Test state
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [testingQuery, setTestingQuery] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false
  });

  // Sync tenant ID on mount or prop change (strictly using tenantId or code)
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

  // Fetch sources when activeTenantId or activeBotId changes
  useEffect(() => {
    if (activeTenantId && activeBotId) {
      loadSources();
    } else {
      setSources([]);
    }
  }, [activeTenantId, activeBotId]);

  const loadSources = async () => {
    if (!activeTenantId || !activeBotId) return;
    setLoadingSources(true);
    try {
      const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
      const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;
      const res = await fetch(`/api/ingestion/sources?tenantId=${encodeURIComponent(activeTenantId)}&botId=${encodeURIComponent(activeBotId)}&tenantDbName=${encodeURIComponent(targetDb)}`);
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Error loading knowledge sources.', 'error');
    } finally {
      setLoadingSources(false);
    }
  };

  const handleOpenIngestModal = () => {
    setUrlInput('');
    setLinkExpiry('');
    setExpiryNotificationEnabled(false);
    setNotificationEmail('');
    setShowIngestModal(true);
  };

  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      showToast('Please enter a valid webpage URL.', 'error');
      return;
    }
    if (!activeTenantId || !activeBotId) {
      showToast('Please select a Tenant and Chatbot first.', 'error');
      return;
    }

    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const currentBotObj = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));

    setIsScraping(true);
    try {
      const payload = {
        url: urlInput.trim(),
        tenantId: activeTenantId,
        tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
        botId: activeBotId,
        botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
        linkExpiry: linkExpiry || null,
        expiryNotificationEnabled,
        notificationEmail: expiryNotificationEnabled ? notificationEmail.trim() : '',
        tenantDbName: currentTenantObj?.tenantDbName || `iso_${activeTenantId}`
      };

      const res = await fetch('/api/ingestion/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Indexed "${data.title}" successfully into ${data.totalChunks} chunks!`);
        setShowIngestModal(false);
        loadSources();
      } else {
        showToast(data.error || 'Failed to scrape and index URL.', 'error');
      }
    } catch (err) {
      showToast('Network error during ingestion pipeline.', 'error');
    } finally {
      setIsScraping(false);
    }
  };

  const handleInspectChunks = async (source) => {
    setSelectedSourceForChunks(source);
    setLoadingChunks(true);
    setChunks([]);
    try {
      const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
      const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;
      const res = await fetch(`/api/ingestion/chunks/${source._id}?tenantId=${encodeURIComponent(activeTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`);
      const data = await res.json();
      setChunks(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Error loading chunk records.', 'error');
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleRescrape = async (source) => {
    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;

    showToast(`Re-scraping "${source.title}"...`, 'info');
    try {
      const res = await fetch(`/api/ingestion/rescrape/${source._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeTenantId,
          tenantDbName: targetDb
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Re-indexed "${data.title}" (${data.totalChunks} chunks).`);
        loadSources();
      } else {
        showToast(data.error || 'Failed to re-scrape source.', 'error');
      }
    } catch (err) {
      showToast('Network error re-scraping source.', 'error');
    }
  };

  const handleDeleteSourceClick = (source) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Knowledge Source: ${source.title}`,
      message: `Are you sure you want to permanently delete "${source.title}" and remove all ${source.totalChunks || 0} chunks from vector partition "${source.vectorIndexName}"?`,
      confirmText: 'Delete Source',
      isLoading: false,
      onConfirm: () => performDeleteSource(source._id)
    });
  };

  const performDeleteSource = async (sourceId) => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;

    try {
      const res = await fetch(`/api/ingestion/sources/${sourceId}?tenantId=${encodeURIComponent(activeTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Source and associated vector chunks deleted.');
        setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        loadSources();
      } else {
        showToast('Failed to delete source.', 'error');
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast('Network error deleting source.', 'error');
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleTestRagSearch = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setTestingQuery(true);
    setTestResults(null);
    try {
      const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
      const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;

      const res = await fetch('/api/ingestion/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery.trim(),
          tenantId: activeTenantId,
          botId: activeBotId,
          topK: 6,
          tenantDbName: targetDb
        })
      });
      const data = await res.json();
      setTestResults(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Error performing test query.', 'error');
    } finally {
      setTestingQuery(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedSources = useMemo(() => {
    let result = [...sources];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.title || '').toLowerCase().includes(q) ||
        (s.sourceUrl || '').toLowerCase().includes(q) ||
        (s.vectorIndexName || '').toLowerCase().includes(q) ||
        (s.notificationEmail || '').toLowerCase().includes(q) ||
        (s.status || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'totalChunks' || sortField === 'charCount') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortAsc ? valA - valB : valB - valA;
      }

      if (sortField === 'createdAt' || sortField === 'linkExpiry') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
        return sortAsc ? valA - valB : valB - valA;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = (valB || '').toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [sources, searchQuery, sortField, sortAsc]);

  // Reset source page on search, sort, or active bot change
  useEffect(() => {
    setSourcePage(1);
  }, [searchQuery, sortField, sortAsc, activeTenantId, activeBotId]);

  const paginatedSources = useMemo(() => {
    const start = (sourcePage - 1) * 10;
    return filteredAndSortedSources.slice(start, start + 10);
  }, [filteredAndSortedSources, sourcePage]);

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-iso-textMuted/40" />;
    return sortAsc ? <ArrowUp size={11} className="text-iso-primary" /> : <ArrowDown size={11} className="text-iso-primary" />;
  };

  const activeIndexName = `${(activeTenantId || '').toLowerCase().replace(/\s+/g, '_')}_${(activeBotId || '').toLowerCase().replace(/\s+/g, '_')}`;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Header & Target Context Bar */}
      <div className="border-b border-iso-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif tracking-tight text-iso-primary font-bold">Ingestion Manager</h1>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-mono font-bold">
              VECTOR PIPELINE
            </span>
          </div>
          <p className="text-xs text-iso-textMuted mt-1">
            Scrape web URLs, manage ingested knowledge sources, and test vector similarity retrieval.
          </p>
        </div>

        {/* Tenant & Bot Selector Dropdowns strictly showing tenantId and botId */}
        <div className="flex items-center gap-2.5">
          <CustomDropdown
            value={activeTenantId}
            onChange={(val) => {
              setActiveTenantId(val);
              setActiveBotId('');
            }}
            options={tenants.map(t => ({
              value: t.tenantId || t.code,
              label: t.name || t.tenantName || t.tenantId,
              badge: t.tenantId || t.code
            }))}
            icon={Building2}
            placeholder="Organization..."
          />

          <CustomDropdown
            value={activeBotId}
            onChange={setActiveBotId}
            options={availableBots.map(b => ({
              value: b.botId || b.code,
              label: b.botName || b.name || b.botId,
              badge: b.botId || b.code
            }))}
            disabled={loadingBots || availableBots.length === 0}
            icon={Bot}
            placeholder={availableBots.length === 0 ? "No bots" : "Chatbot..."}
          />
        </div>
      </div>

      {/* Vector Index Banner */}
      <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Database size={15} className="text-blue-700" />
          <span className="text-blue-900 font-semibold">Active Vector Index Partition:</span>
          <span className="font-mono font-bold text-blue-800 px-2 py-0.5 bg-blue-100/70 border border-blue-300 rounded">
            {activeIndexName || 'Select Tenant & Bot'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-blue-700">Multi-Tenant Isolated</span>
      </div>

      {/* SUB-TABS NAVIGATION (Ingested URLs | RAG Search Verification Tester) */}
      <div className="flex items-center justify-between border-b border-iso-border pb-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sources'
                ? 'border-iso-primary text-iso-primary'
                : 'border-transparent text-iso-textMuted hover:text-iso-text'
            }`}
          >
            <ListFilter size={16} /> Ingested URLs ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tester')}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tester'
                ? 'border-iso-primary text-iso-primary'
                : 'border-transparent text-iso-textMuted hover:text-iso-text'
            }`}
          >
            <Sparkles size={16} className="text-purple-600" /> RAG Search Verification Tester
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: INGESTED KNOWLEDGE URLS TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'sources' && (
        <div className="flex flex-col gap-4">
          
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge sources by title, URL, or status..."
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-7 py-1.5 text-xs text-iso-text outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-iso-textMuted hover:text-iso-text"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-iso-textMuted">
                Showing <strong className="text-iso-primary">{filteredAndSortedSources.length}</strong> of {sources.length} sources
              </span>
              <button
                type="button"
                onClick={loadSources}
                className="p-1.5 text-iso-textMuted hover:text-iso-primary border border-iso-border rounded-sm hover:bg-iso-bgSecondary transition-all cursor-pointer"
                title="Refresh Sources"
              >
                <RefreshCw size={13} className={loadingSources ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={handleOpenIngestModal}
                className="px-3.5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} /> Ingest New URL
              </button>
            </div>
          </div>

          {/* Sources Table */}
          <div className="bg-iso-cardBg border border-iso-border rounded-sm shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-iso-border text-iso-textMuted font-mono uppercase tracking-wider text-[9px] pb-1 bg-iso-bgSecondary/20">
                  
                  <th 
                    onClick={() => handleSort('title')}
                    className="py-2.5 px-3 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Document Title &amp; Source URL</span>
                      {renderSortIcon('title')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('totalChunks')}
                    className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Chunks</span>
                      {renderSortIcon('totalChunks')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('charCount')}
                    className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Length</span>
                      {renderSortIcon('charCount')}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('linkExpiry')}
                    className="py-2.5 cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Link Expiry</span>
                      {renderSortIcon('linkExpiry')}
                    </div>
                  </th>

                  <th className="py-2.5">Alert Email</th>

                  <th 
                    onClick={() => handleSort('status')}
                    className="py-2.5 text-center cursor-pointer hover:text-iso-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>

                  <th className="py-2.5 text-right px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingSources ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-iso-textMuted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin text-iso-accent" />
                        <span>Loading knowledge sources...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedSources.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-iso-textMuted italic bg-iso-bgSecondary/10">
                      <p className="mb-2">{searchQuery ? 'No sources match your search query.' : 'No knowledge sources ingested for this bot yet.'}</p>
                      <button
                        onClick={handleOpenIngestModal}
                        className="px-3.5 py-1.5 bg-iso-primary text-white text-xs font-bold rounded-sm inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus size={13} /> Ingest Your First Webpage
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedSources.map(s => {
                    const isExpired = s.linkExpiry && new Date(s.linkExpiry) < new Date();
                    return (
                      <tr key={s._id} className="border-b border-iso-border/40 hover:bg-iso-bgSecondary/20 transition-colors">
                        
                        {/* Document Title & URL */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-iso-primary">{s.title || 'Untitled Webpage'}</span>
                            <a
                              href={s.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-iso-accent hover:underline flex items-center gap-1 max-w-sm truncate"
                            >
                              <span>{s.sourceUrl}</span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          </div>
                        </td>

                        {/* Chunks */}
                        <td className="py-3 text-center font-mono">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold text-[10px]">
                            {s.totalChunks || 0} chunks
                          </span>
                        </td>

                        {/* Length */}
                        <td className="py-3 text-center font-mono text-[11px] text-iso-textMuted">
                          {(s.charCount || 0).toLocaleString()} chars
                        </td>

                        {/* Link Expiry */}
                        <td className="py-3 font-mono text-[11px]">
                          {s.linkExpiry ? (
                            <span className={isExpired ? 'text-iso-error font-bold' : 'text-iso-textMuted'}>
                              {new Date(s.linkExpiry).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {isExpired && ' (EXPIRED)'}
                            </span>
                          ) : (
                            <span className="text-iso-textMuted/60">No Expiry</span>
                          )}
                        </td>

                        {/* Alert Email */}
                        <td className="py-3 font-mono text-[11px] text-iso-textMuted">
                          {s.expiryNotificationEnabled && s.notificationEmail ? (
                            <div className="flex items-center gap-1 text-emerald-700">
                              <Bell size={11} />
                              <span>{s.notificationEmail}</span>
                            </div>
                          ) : (
                            <span className="text-iso-textMuted/40 flex items-center gap-1">
                              <BellOff size={11} /> Off
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                            isExpired 
                              ? 'bg-rose-50 text-rose-700 border-rose-300' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          }`}>
                            {isExpired ? 'EXPIRED' : 'INDEXED'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 text-right px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInspectChunks(s)}
                              className="px-2.5 py-1 bg-iso-bgSecondary hover:bg-iso-accent/15 border border-iso-border hover:border-iso-accent text-iso-primary font-semibold text-[10px] rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                              title="Inspect Text Chunks & Embeddings"
                            >
                              <Eye size={12} />
                              <span>Chunks</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRescrape(s)}
                              className="p-1.5 text-iso-textMuted hover:text-iso-primary rounded hover:bg-iso-bgSecondary border border-transparent transition-colors cursor-pointer"
                              title="Re-scrape and update chunks"
                            >
                              <RefreshCw size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSourceClick(s)}
                              className="p-1.5 text-iso-textMuted hover:text-iso-error rounded hover:bg-iso-errorBg border border-transparent transition-colors cursor-pointer"
                              title="Delete Source and Vector Chunks"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Sources Pagination */}
            <TablePagination
              currentPage={sourcePage}
              totalItems={filteredAndSortedSources.length}
              pageSize={10}
              onPageChange={setSourcePage}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: RAG SEARCH VERIFICATION TESTER */}
      {/* ========================================================================= */}
      {activeTab === 'tester' && (
        <div className="bg-iso-cardBg border border-iso-border rounded-sm p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-iso-border pb-3">
            <Sparkles size={18} className="text-purple-600" />
            <div>
              <h2 className="text-base font-serif font-bold text-iso-primary">RAG Search Verification Tester</h2>
              <p className="text-[11px] text-iso-textMuted font-mono">
                Querying Vector Index Partition: <strong className="text-iso-primary">{activeIndexName}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleTestRagSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Type a test query to verify vector similarity retrieval..."
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs outline-none"
                required
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
            </div>
            <button
              type="submit"
              disabled={testingQuery || !testQuery.trim()}
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              {testingQuery ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Test Query</span>
            </button>
          </form>

          {testResults && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-iso-border pb-2">
                <span className="text-xs font-bold text-iso-primary">
                  Retrieved {testResults.length} Matching Knowledge Chunk(s):
                </span>
                <span className="text-[10px] font-mono text-iso-textMuted">Ranked by Vector Cosine Similarity</span>
              </div>

              {testResults.length === 0 ? (
                <p className="text-xs text-iso-textMuted italic p-6 bg-iso-bg rounded text-center">
                  No relevant knowledge chunks found in index "{activeIndexName}" matching this query.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testResults.map((res, i) => (
                    <div key={res._id || i} className="p-4 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2 text-xs shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] font-mono border-b border-iso-border/40 pb-1">
                        <span className="font-bold text-purple-700">Result #{i + 1} (Chunk #{res.chunkIndex + 1})</span>
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded font-bold">
                          Score: {res.score}%
                        </span>
                      </div>
                      <p className="text-iso-text text-[11px] leading-relaxed line-clamp-4 font-sans bg-iso-cardBg p-2.5 border border-iso-border/40 rounded">
                        {res.text}
                      </p>
                      <div className="flex items-center justify-between text-[9px] font-mono text-iso-textMuted pt-1">
                        <span className="truncate max-w-[200px]">{res.metadata?.title}</span>
                        <a href={res.metadata?.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-iso-accent hover:underline flex items-center gap-0.5">
                          <span>Source</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INGEST NEW URL POPUP MODAL */}
      {/* ========================================================================= */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-iso-primary/10 border border-iso-primary/20 flex items-center justify-center text-iso-primary">
                  <Globe size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-iso-primary">Ingest Web Page (URL)</h3>
                  <p className="text-[11px] text-iso-textMuted font-mono">
                    Target Vector Index: <strong className="text-iso-primary">{activeIndexName}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowIngestModal(false)} 
                className="p-1 text-iso-textMuted hover:text-iso-primary rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleIngestSubmit} className="p-6 flex flex-col gap-4 text-xs">
              
              {/* Target URL */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold">
                  Target Webpage URL <span className="text-iso-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://docs.company.com/help/faq"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs text-iso-text outline-none font-mono"
                    required
                    autoFocus
                  />
                  <Globe size={14} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
                </div>
                <p className="text-[10px] text-iso-textMuted mt-1">
                  The engine will scrape the webpage, generate semantic text chunks, create vector embeddings, and store them in MongoDB Atlas.
                </p>
              </div>

              {/* Expiry & Email Notification Settings */}
              <div className="flex flex-col gap-3 p-3.5 bg-iso-bg border border-iso-border rounded-sm">
                
                {/* Link Expiry Date */}
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Link Expiry Date (Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={linkExpiry}
                    onChange={(e) => setLinkExpiry(e.target.value)}
                    className="w-full bg-iso-cardBg border border-iso-border rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>

                {/* Expiry Notification & Email */}
                <div className="flex flex-col gap-2 pt-1 border-t border-iso-border/40">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted font-semibold flex items-center gap-1">
                      <Bell size={12} />
                      <span>Send Expiry Notification</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={expiryNotificationEnabled}
                      onChange={(e) => setExpiryNotificationEnabled(e.target.checked)}
                      className="w-4 h-4 accent-iso-primary cursor-pointer rounded"
                    />
                  </div>

                  {expiryNotificationEnabled && (
                    <div className="relative animate-in fade-in duration-150 mt-1">
                      <input
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="alerts@company.com"
                        className="w-full bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                        required={expiryNotificationEnabled}
                      />
                      <Mail size={13} className="absolute left-2.5 top-2 text-iso-textMuted" />
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-iso-border mt-1">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-1.5 bg-iso-bgSecondary border border-iso-border rounded-sm text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScraping || !urlInput.trim() || !activeBotId}
                  className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isScraping ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isScraping ? 'Scraping & Indexing...' : 'Scrape & Index Document'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHUNKS INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedSourceForChunks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
              <div>
                <h3 className="text-base font-serif font-bold text-iso-primary">
                  Knowledge Chunks: <span className="text-iso-accent">{selectedSourceForChunks.title}</span>
                </h3>
                <p className="text-[11px] text-iso-textMuted font-mono">
                  Vector Partition: <span className="font-bold text-iso-primary">{selectedSourceForChunks.vectorIndexName}</span> • Total Chunks: {chunks.length}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSourceForChunks(null)} 
                className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] flex-1 text-xs flex flex-col gap-4">
              {loadingChunks ? (
                <div className="py-16 text-center text-iso-textMuted flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-iso-accent" />
                  <span>Loading chunks from vector storage...</span>
                </div>
              ) : chunks.length === 0 ? (
                <p className="py-8 text-center text-iso-textMuted italic">No chunks found for this source.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {chunks.map(c => (
                    <div key={c._id} className="p-4 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] font-mono border-b border-iso-border/60 pb-1.5">
                        <span className="font-bold text-iso-primary">Chunk #{c.chunkIndex + 1} of {c.totalChunks}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold">{c.embeddingDimensions || 1024}-dim vector stored</span>
                          <span className="text-iso-textMuted">•</span>
                          <span className="text-iso-textMuted">{c.charCount} characters</span>
                        </div>
                      </div>
                      <p className="text-iso-text leading-relaxed whitespace-pre-wrap font-sans text-xs bg-iso-cardBg p-3 border border-iso-border/40 rounded">
                        {c.text}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] font-mono text-iso-textMuted">
                        <span>Chunk ID: {c._id}</span>
                        <span>•</span>
                        <span>Status: {c.metadata?.status || 'active'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-iso-border flex items-center justify-end bg-iso-bgSecondary/20">
              <button
                type="button"
                onClick={() => setSelectedSourceForChunks(null)}
                className="px-4 py-1.5 bg-iso-primary text-white rounded-sm text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isLoading={confirmModal.isLoading}
      />

    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, Globe, Plus, Trash2, RefreshCw, Eye, Search, 
  ArrowUpDown, ArrowUp, ArrowDown, Bell, BellOff, Calendar, 
  Mail, CheckCircle2, AlertTriangle, Loader2, Sparkles, X,
  FileText, ExternalLink, Bot, Building2, ListFilter, Send,
  Compass, Layers, Filter, Check, CheckSquare, Square, Shield,
  Radio, CornerDownRight, Link2, Sliders, ArrowRight, Server,
  CheckCircle, AlertCircle, Clock, Terminal, Play, Ban,
  ChevronDown, ChevronUp, Activity, User, UserCheck
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import CustomDropdown from '../../components/CustomDropdown';
import TablePagination from '../../components/TablePagination';
import { apiUrl } from '../../config/api';

export default function Ingestion({ 
  tenants = [], 
  selectedTenant, 
  setSelectedTenant, 
  selectedBot, 
  setSelectedBot, 
  bots = [], 
  currentUser,
  showToast 
}) {
  // Top Ingestion Subtabs: "sources" | "tester"
  const [activeTab, setActiveTab] = useState('sources');

  // Active Live Operations / Crawler Tasks
  const [operations, setOperations] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [activeOperationsCount, setActiveOperationsCount] = useState(0);
  const [expandedLogJobId, setExpandedLogJobId] = useState(null);

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

  // Web Crawler Modal states
  const [showCrawlerModal, setShowCrawlerModal] = useState(false);
  const [crawlerStep, setCrawlerStep] = useState('config'); // 'config' | 'results' | 'ingesting' | 'done'
  const [crawlStartUrl, setCrawlStartUrl] = useState('');
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [crawlMaxPages, setCrawlMaxPages] = useState(30);
  const [crawlIncludePatterns, setCrawlIncludePatterns] = useState('');
  const [crawlExcludePatterns, setCrawlExcludePatterns] = useState('');
  const [crawlProxy, setCrawlProxy] = useState('');
  const [crawlAllowSubdomains, setCrawlAllowSubdomains] = useState(false);
  const [crawlLinkExpiry, setCrawlLinkExpiry] = useState('');
  const [crawlExpiryNotificationEnabled, setCrawlExpiryNotificationEnabled] = useState(false);
  const [crawlNotificationEmail, setCrawlNotificationEmail] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [discoveredUrls, setDiscoveredUrls] = useState([]);
  const [crawlerSearchFilter, setCrawlerSearchFilter] = useState('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [crawledJobId, setCrawledJobId] = useState(null);

  // Ingestion Sources state
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Search & Sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [sourcePage, setSourcePage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const isGlobalAdmin = Boolean(
    currentUser?.role === 'global_admin' || 
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'admin' || 
    currentUser?.isGlobalAdmin || 
    currentUser?.tenantId === 'admin'
  );

  const getAuthHeaders = useCallback(() => {
    const sessionId = currentUser?.sessionId || localStorage.getItem('iso_session_id') || '';
    return {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    };
  }, [currentUser]);

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
      const res = await fetch(apiUrl(`/api/admin/bots?tenantId=${encodeURIComponent(tenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`), {
        headers: getAuthHeaders()
      });
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
      const res = await fetch(apiUrl(`/api/ingestion/sources?tenantId=${encodeURIComponent(activeTenantId)}&botId=${encodeURIComponent(activeBotId)}&tenantDbName=${encodeURIComponent(targetDb)}`), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Error loading knowledge sources.', 'error');
    } finally {
      setLoadingSources(false);
    }
  };

  // Poll active & recent crawler/ingestion jobs from persistent MongoDB/Redis
  const fetchOperations = useCallback(async () => {
    if (!activeTenantId && !isGlobalAdmin) return;
    try {
      const queryParam = isGlobalAdmin && !activeTenantId ? '' : `tenantId=${encodeURIComponent(activeTenantId || 'admin')}&botId=${encodeURIComponent(activeBotId || '')}`;
      const res = await fetch(apiUrl(`/api/ingestion/jobs/active?${queryParam}`), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data && Array.isArray(data.jobs)) {
        setOperations(data.jobs);
        setActiveOperationsCount(data.activeCount || 0);
      }
    } catch (e) {}
  }, [activeTenantId, activeBotId, isGlobalAdmin, getAuthHeaders]);

  // Initial fetch operations when tenant/bot changes (no polling interval)
  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const handleCancelJob = async (jobId) => {
    try {
      const res = await fetch(apiUrl(`/api/ingestion/jobs/${encodeURIComponent(jobId)}/cancel`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Operation cancelled successfully.');
        fetchOperations();
      } else {
        showToast(data.error || 'Failed to cancel operation.', 'error');
      }
    } catch (e) {
      showToast('Error cancelling operation.', 'error');
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const res = await fetch(apiUrl(`/api/ingestion/jobs/${encodeURIComponent(jobId)}`), { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setOperations(prev => prev.filter(j => (j.id !== jobId && j.jobId !== jobId)));
        showToast('Task removed from history.');
      }
    } catch (e) {
      showToast('Error deleting task.', 'error');
    }
  };

  const handleClearCompletedJobs = async () => {
    try {
      const res = await fetch(apiUrl('/api/ingestion/jobs/clear-completed'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tenantId: activeTenantId, botId: activeBotId })
      });
      if (res.ok) {
        fetchOperations();
        showToast('Cleared completed tasks.');
      }
    } catch (e) {
      showToast('Error clearing tasks.', 'error');
    }
  };

  const handleInspectDiscoveredUrls = (job) => {
    if (!job) return;
    let list = [];
    if (job?.result?.discoveredUrls && Array.isArray(job.result.discoveredUrls) && job.result.discoveredUrls.length > 0) {
      list = job.result.discoveredUrls.map((u, idx) => ({ ...u, id: idx, selected: u.status !== 'error' }));
    } else if (job?.discoveredUrls && Array.isArray(job.discoveredUrls) && job.discoveredUrls.length > 0) {
      list = job.discoveredUrls.map((u, idx) => ({ ...u, id: idx, selected: u.status !== 'error' }));
    }
    if (job?.params?.startUrl) setCrawlStartUrl(job.params.startUrl);
    else if (job?.result?.startUrl) setCrawlStartUrl(job.result.startUrl);
    if (job?.params?.maxDepth) setCrawlDepth(job.params.maxDepth);
    else if (job?.result?.maxDepth) setCrawlDepth(job.result.maxDepth);
    if (job?.params?.maxPages) setCrawlMaxPages(job.params.maxPages);
    else if (job?.result?.maxPages) setCrawlMaxPages(job.result.maxPages);

    setDiscoveredUrls(list);
    setCrawledJobId(job?.id || job?.jobId || null);
    setCrawlerStep('results');
    setShowCrawlerModal(true);
  };

  // Listen for crawl inspection requests triggered from the notification bell
  useEffect(() => {
    // 1. Check if there was a pending inspect request before mount/navigation
    try {
      const pending = sessionStorage.getItem('iso_pending_crawl_inspect');
      if (pending) {
        sessionStorage.removeItem('iso_pending_crawl_inspect');
        const job = JSON.parse(pending);
        if (job) {
          if (job.tenantId && job.tenantId !== 'default') setActiveTenantId(job.tenantId);
          if (job.botId && job.botId !== 'default') setActiveBotId(job.botId);
          handleInspectDiscoveredUrls(job);
        }
      }
    } catch (e) {}

    // 2. Handle real-time event when already on Ingestion page
    const handleOpenCrawlIngest = (e) => {
      const job = e.detail;
      if (job) {
        if (job.tenantId && job.tenantId !== 'default') setActiveTenantId(job.tenantId);
        if (job.botId && job.botId !== 'default') setActiveBotId(job.botId);
        handleInspectDiscoveredUrls(job);
      }
    };
    window.addEventListener('iso_open_crawl_ingest', handleOpenCrawlIngest);
    return () => window.removeEventListener('iso_open_crawl_ingest', handleOpenCrawlIngest);
  }, []);

  const handleOpenIngestModal = () => {
    setUrlInput('');
    setLinkExpiry('');
    setExpiryNotificationEnabled(false);
    setNotificationEmail('');
    setShowIngestModal(true);
  };

  // Submit Single or Batch Ingestion directly to the background job manager
  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    const rawInput = urlInput.trim();
    if (!rawInput) {
      showToast('Please enter at least one valid webpage URL.', 'error');
      return;
    }
    if (!activeTenantId || !activeBotId) {
      showToast('Please select a Tenant and Chatbot first.', 'error');
      return;
    }

    // Split by comma, semicolon, or newline
    const urlsList = rawInput
      .split(/[\n,;]+/)
      .map(u => u.trim())
      .filter(Boolean);

    if (urlsList.length === 0) {
      showToast('Please enter valid webpage URLs.', 'error');
      return;
    }

    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const currentBotObj = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));

    setIsScraping(true);
    setShowIngestModal(false);

    try {
      if (urlsList.length === 1) {
        const payload = {
          url: urlsList[0],
          tenantId: activeTenantId,
          tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
          botId: activeBotId,
          botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
          linkExpiry: linkExpiry || null,
          expiryNotificationEnabled,
          notificationEmail: expiryNotificationEnabled ? notificationEmail.trim() : '',
          tenantDbName: currentTenantObj?.tenantDbName || `iso_${activeTenantId}`,
          createdBy: currentUser?.username || 'admin'
        };

        const res = await fetch(apiUrl('/api/ingestion/scrape'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
          showToast(`Indexed "${data.title}" successfully into ${data.totalChunks} chunks!`);
          window.dispatchEvent(new CustomEvent('iso_job_updated'));
          loadSources();
          fetchOperations();
        } else {
          showToast(data.error || 'Failed to scrape and index URL.', 'error');
        }
      } else {
        // Batch ingestion for multiple URLs dispatched in background
        const payload = {
          urls: urlsList,
          tenantId: activeTenantId,
          tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
          botId: activeBotId,
          botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
          linkExpiry: linkExpiry || null,
          expiryNotificationEnabled,
          notificationEmail: expiryNotificationEnabled ? notificationEmail.trim() : '',
          tenantDbName: currentTenantObj?.tenantDbName || `iso_${activeTenantId}`,
          createdBy: currentUser?.username || 'admin',
          userRole: currentUser?.role || 'admin'
        };

        const res = await fetch(apiUrl('/api/ingestion/batch-ingest'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
          showToast(`Batch ingestion for ${urlsList.length} URLs launched in background. Track progress in the notification bell.`);
          window.dispatchEvent(new CustomEvent('iso_job_updated'));
          fetchOperations();
        } else {
          showToast(data.error || 'Failed to start batch ingestion.', 'error');
        }
      }
    } catch (err) {
      showToast('Network error during ingestion request.', 'error');
    } finally {
      setIsScraping(false);
    }
  };

  // Open Web Crawler Modal
  const handleOpenCrawlerModal = () => {
    setCrawlStartUrl('');
    setCrawlDepth(2);
    setCrawlMaxPages(100);
    setCrawlIncludePatterns('');
    setCrawlExcludePatterns('');
    setCrawlProxy('');
    setCrawlAllowSubdomains(false);
    setCrawlLinkExpiry('');
    setCrawlExpiryNotificationEnabled(false);
    setCrawlNotificationEmail('');
    setDiscoveredUrls([]);
    setCrawlerSearchFilter('');
    setCrawlerStep('config');
    setCrawledJobId(null);
    setShowCrawlerModal(true);
  };

  // Start Recursive Web Crawling in Background
  const handleStartCrawl = async (e) => {
    if (e) e.preventDefault();
    if (!crawlStartUrl.trim()) {
      showToast('Please enter a valid starting URL.', 'error');
      return;
    }
    if (!activeTenantId || !activeBotId) {
      showToast('Please select an Organization and Chatbot first.', 'error');
      return;
    }

    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const currentBotObj = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));

    setIsCrawling(true);
    setShowCrawlerModal(false);

    try {
      const payload = {
        startUrl: crawlStartUrl.trim(),
        maxDepth: parseInt(crawlDepth) || 2,
        maxPages: parseInt(crawlMaxPages) || 100,
        includePatterns: crawlIncludePatterns.split(',').map(s => s.trim()).filter(Boolean),
        excludePatterns: crawlExcludePatterns.split(',').map(s => s.trim()).filter(Boolean),
        proxy: crawlProxy.trim(),
        allowSubdomains: crawlAllowSubdomains,
        tenantId: activeTenantId,
        tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
        botId: activeBotId,
        botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
        createdBy: currentUser?.username || 'admin',
        userRole: currentUser?.role || 'admin'
      };

      const res = await fetch(apiUrl('/api/ingestion/crawl'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Web crawl launched in background for ${crawlStartUrl.trim()}. Track progress in the notification bell.`);
        window.dispatchEvent(new CustomEvent('iso_job_updated'));
        fetchOperations();
      } else {
        showToast(data.error || 'Failed to crawl website.', 'error');
      }
    } catch (err) {
      showToast('Network error starting web crawl.', 'error');
    } finally {
      setIsCrawling(false);
    }
  };

  const toggleSelectAllDiscovered = (checked) => {
    setDiscoveredUrls(prev => prev.map(u => ({
      ...u,
      selected: u.status !== 'error' ? checked : false
    })));
  };

  const toggleDiscoveredUrl = (urlStr) => {
    setDiscoveredUrls(prev => prev.map(u => (u.url === urlStr ? { ...u, selected: !u.selected } : u)));
  };

  // Batch Ingestion for selected discovered URLs (Dispatched to backend background worker)
  const handleBatchIngestSubmit = async () => {
    const selectedList = discoveredUrls.filter(u => u.selected);
    if (selectedList.length === 0) {
      showToast('Please select at least one discovered URL to ingest.', 'warning');
      return;
    }

    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const currentBotObj = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));

    setIsBatchSubmitting(true);
    setShowCrawlerModal(false);

    try {
      const payload = {
        urls: selectedList.map(u => u.url),
        tenantId: activeTenantId,
        tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
        botId: activeBotId,
        botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
        linkExpiry: crawlLinkExpiry || null,
        expiryNotificationEnabled: crawlExpiryNotificationEnabled,
        notificationEmail: crawlExpiryNotificationEnabled ? crawlNotificationEmail.trim() : '',
        tenantDbName: currentTenantObj?.tenantDbName || `iso_${activeTenantId}`,
        createdBy: currentUser?.username || 'admin',
        userRole: currentUser?.role || 'admin',
        crawledJobId
      };

      const res = await fetch(apiUrl('/api/ingestion/batch-ingest'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Batch ingestion for ${selectedList.length} URLs launched in background. Track progress in the notification bell.`);
        setCrawledJobId(null);
        window.dispatchEvent(new CustomEvent('iso_job_updated'));
        fetchOperations();
      }
    } catch (err) {
      showToast('Network error launching batch ingestion.', 'error');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const filteredDiscoveredUrls = useMemo(() => {
    if (!crawlerSearchFilter.trim()) return discoveredUrls;
    const q = crawlerSearchFilter.toLowerCase().trim();
    return discoveredUrls.filter(u => 
      u.url.toLowerCase().includes(q) || (u.title && u.title.toLowerCase().includes(q))
    );
  }, [discoveredUrls, crawlerSearchFilter]);

  const selectedDiscoveredCount = useMemo(() => {
    return discoveredUrls.filter(u => u.selected).length;
  }, [discoveredUrls]);

  const handleInspectChunks = async (source) => {
    setSelectedSourceForChunks(source);
    setLoadingChunks(true);
    setChunks([]);
    try {
      const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
      const targetDb = currentTenantObj?.tenantDbName || `iso_${activeTenantId}`;
      const res = await fetch(apiUrl(`/api/ingestion/chunks/${source._id}?tenantId=${encodeURIComponent(activeTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`), {
        headers: getAuthHeaders()
      });
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

    showToast(`Re-indexing "${source.title}"...`, 'info');
    try {
      const res = await fetch(apiUrl(`/api/ingestion/rescrape/${source._id}`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenantId: activeTenantId,
          tenantDbName: targetDb
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Re-indexed "${data.title}" (${data.totalChunks} chunks).`);
        loadSources();
        fetchOperations();
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
      const res = await fetch(apiUrl(`/api/ingestion/sources/${sourceId}?tenantId=${encodeURIComponent(activeTenantId)}&tenantDbName=${encodeURIComponent(targetDb)}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
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

      const res = await fetch(apiUrl('/api/ingestion/search'), {
        method: 'POST',
        headers: getAuthHeaders(),
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

      if (sortField === 'createdAt' || sortField === 'lastScrapedAt' || sortField === 'linkExpiry') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
        return sortAsc ? valA - valB : valB - valA;
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [sources, searchQuery, sortField, sortAsc]);

  // Reset page to 1 when search query, sort, or active bot/tenant changes
  useEffect(() => {
    setSourcePage(1);
  }, [searchQuery, sortField, sortAsc, activeTenantId, activeBotId]);

  // Adjust sourcePage if filtered results length shrinks below current page
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredAndSortedSources.length / pageSize));
    if (sourcePage > maxPage) {
      setSourcePage(maxPage);
    }
  }, [filteredAndSortedSources.length, pageSize, sourcePage]);

  // Paginated subset of sources
  const paginatedSources = useMemo(() => {
    const start = (sourcePage - 1) * pageSize;
    return filteredAndSortedSources.slice(start, start + pageSize);
  }, [filteredAndSortedSources, sourcePage, pageSize]);

  const activeIndexName = activeTenantId && activeBotId ? `${activeTenantId}_${activeBotId}` : '';

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Header & Tenant Selector */}
      <div className="border-b border-iso-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-iso-primary mb-1">
            Knowledge Base &amp; Document Ingestion
          </h1>
          <p className="text-xs text-iso-textMuted">
            Manage multi-tenant knowledge sources, recursive web crawling, vector partitioning, and background batch ingestion.
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

      {/* Vector Index Partition Banner */}
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
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-iso-textMuted">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setSourcePage(1);
                  }}
                  className="bg-iso-bg border border-iso-border rounded px-1.5 py-1 text-xs text-iso-text outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <span className="text-[11px] font-mono text-iso-textMuted">
                Showing <strong className="text-iso-primary">{filteredAndSortedSources.length === 0 ? 0 : (sourcePage - 1) * pageSize + 1}-{Math.min(sourcePage * pageSize, filteredAndSortedSources.length)}</strong> of {filteredAndSortedSources.length}
              </span>
              <button
                type="button"
                onClick={loadSources}
                className="p-1.5 text-iso-textMuted hover:text-iso-primary border border-iso-border rounded-sm hover:bg-iso-bgSecondary transition-all cursor-pointer shadow-2xs"
                title="Refresh Sources"
              >
                <RefreshCw size={13} className={loadingSources ? 'animate-spin' : ''} />
              </button>
              
              {/* Web Crawler Button */}
              <button
                type="button"
                onClick={handleOpenCrawlerModal}
                className="px-3 py-1.5 bg-iso-bgSecondary hover:bg-iso-bg border border-iso-border hover:border-iso-primary rounded-sm text-xs font-bold text-iso-primary flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
                title="Deep website crawler with depth, proxy, and include/exclude filtering"
              >
                <Compass size={13} className="text-iso-accent" />
                <span>Web Crawler</span>
              </button>

              {/* Single/Batch URL Ingest Button */}
              <button
                type="button"
                onClick={handleOpenIngestModal}
                className="px-3.5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Ingest URL(s)</span>
              </button>
            </div>
          </div>

          {/* Sources Table */}
          <div className="border border-iso-border rounded-sm overflow-hidden bg-iso-cardBg shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-iso-bgSecondary border-b border-iso-border text-[10px] font-mono uppercase tracking-wider text-iso-textMuted">
                    <th className="p-3">Title &amp; Source URL</th>
                    <th className="p-3 cursor-pointer hover:text-iso-primary" onClick={() => handleSort('totalChunks')}>
                      <div className="flex items-center gap-1">
                        <span>Chunks</span>
                        {sortField === 'totalChunks' && (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                      </div>
                    </th>
                    <th className="p-3">Status</th>
                    <th className="p-3 cursor-pointer hover:text-iso-primary" onClick={() => handleSort('linkExpiry')}>
                      <div className="flex items-center gap-1">
                        <span>Expiry Date</span>
                        {sortField === 'linkExpiry' && (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                      </div>
                    </th>
                    <th className="p-3 cursor-pointer hover:text-iso-primary" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1">
                        <span>Indexed At</span>
                        {sortField === 'createdAt' && (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                      </div>
                    </th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-iso-border">
                  {loadingSources ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-iso-textMuted">
                        <div className="flex items-center justify-center gap-2 font-mono text-xs">
                          <Loader2 size={16} className="animate-spin text-iso-primary" />
                          <span>Loading partitioned vector knowledge sources...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAndSortedSources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-iso-textMuted">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Globe size={28} className="text-iso-border" />
                          <span className="font-semibold text-iso-primary">No knowledge sources found</span>
                          <span className="text-[11px]">
                            {searchQuery ? 'No records match your filter query.' : 'Click "+ Ingest URL(s)" or "Web Crawler" to populate this chatbot index.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSources.map((source) => {
                      const isExpired = source.isExpired || (source.linkExpiry && new Date(source.linkExpiry) < new Date());
                      return (
                        <tr key={source._id} className="hover:bg-iso-bgSecondary/60 transition-colors">
                          <td className="p-3 min-w-[240px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-iso-primary hover:underline cursor-pointer truncate max-w-sm" onClick={() => handleInspectChunks(source)}>
                                {source.title || 'Untitled Document'}
                              </span>
                              <a
                                href={source.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-mono text-iso-textMuted hover:text-iso-accent flex items-center gap-1 truncate max-w-sm"
                              >
                                <span>{source.sourceUrl}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-xs">
                            <button
                              type="button"
                              onClick={() => handleInspectChunks(source)}
                              className="px-2 py-0.5 bg-iso-bgSecondary border border-iso-border hover:border-iso-primary rounded text-[11px] font-bold text-iso-primary hover:underline cursor-pointer"
                              title="Inspect vector chunks"
                            >
                              {source.totalChunks || 0} chunks
                            </button>
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold uppercase tracking-wider border ${
                              isExpired 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : source.status === 'indexed' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {isExpired ? 'Expired' : source.status || 'Indexed'}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-[11px]">
                            {source.linkExpiry ? (
                              <div className="flex items-center gap-1 text-iso-textMuted">
                                <Calendar size={11} />
                                <span>{new Date(source.linkExpiry).toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <span className="text-iso-textMuted/60">Never</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[11px] text-iso-textMuted">
                            {source.createdAt ? new Date(source.createdAt).toLocaleDateString() : '-'}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleInspectChunks(source)}
                                className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded border border-transparent hover:border-iso-border transition-all cursor-pointer"
                                title="Inspect Vector Chunks"
                              >
                                <Eye size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRescrape(source)}
                                className="p-1.5 text-iso-textMuted hover:text-emerald-700 hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                                title="Re-scrape & Re-index"
                              >
                                <RefreshCw size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSourceClick(source)}
                                className="p-1.5 text-iso-textMuted hover:text-rose-700 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                                title="Delete Knowledge Source"
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
            </div>

            {/* Ingested URLs Table Pagination */}
            {filteredAndSortedSources.length > 0 && (
              <TablePagination
                currentPage={sourcePage}
                totalItems={filteredAndSortedSources.length}
                pageSize={pageSize}
                onPageChange={setSourcePage}
              />
            )}
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
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={testingQuery || !testQuery.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
            >
              {testingQuery ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Test Vector Retrieval</span>
            </button>
          </form>

          {/* Test Results Output */}
          {testResults && (
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-xs font-mono font-bold text-iso-primary">
                Top Retrievable Knowledge Chunks ({testResults.length} matches):
              </span>

              {testResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-iso-textMuted border border-dashed border-iso-border rounded-sm font-mono">
                  No matching vector chunks found with sufficient cosine similarity.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.map((res, idx) => (
                    <div key={idx} className="p-3 bg-iso-bgSecondary border border-iso-border rounded-sm flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between border-b border-iso-border/60 pb-1 text-[10px] font-mono">
                        <span className="font-bold text-purple-700">Match #{idx + 1}</span>
                        {res.score !== undefined && (
                          <span className="text-iso-textMuted">Similarity: {(res.score * 100).toFixed(1)}%</span>
                        )}
                      </div>
                      <p className="text-iso-text font-serif leading-relaxed line-clamp-4">
                        {res.content || res.text}
                      </p>
                      {res.sourceUrl && (
                        <a href={res.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-iso-accent hover:underline font-mono truncate">
                          {res.sourceUrl}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INGEST URL(S) POPUP */}
      {/* ========================================================================= */}
      {showIngestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-iso-cardBg border border-iso-border rounded-sm max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-iso-border pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-iso-accent" />
                <h3 className="font-serif font-bold text-sm text-iso-primary">Ingest Webpage URL(s)</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowIngestModal(false)}
                className="text-iso-textMuted hover:text-iso-text cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                  Webpage URL(s) (One per line or comma-separated)
                </label>
                <textarea
                  rows={4}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/docs&#10;https://example.com/pricing&#10;https://example.com/faq"
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-2 text-xs text-iso-text outline-none font-mono"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                  Link Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={linkExpiry}
                  onChange={(e) => setLinkExpiry(e.target.value)}
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyExpiry"
                  checked={expiryNotificationEnabled}
                  onChange={(e) => setExpiryNotificationEnabled(e.target.checked)}
                  className="rounded text-iso-primary cursor-pointer"
                />
                <label htmlFor="notifyExpiry" className="text-xs text-iso-text cursor-pointer select-none">
                  Email reminder 2 days before expiration
                </label>
              </div>

              {expiryNotificationEnabled && (
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                    Notification Email Address
                  </label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="admin@organization.com"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-iso-border">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-3 py-1.5 text-xs text-iso-textMuted hover:text-iso-text border border-iso-border rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScraping}
                  className="px-4 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isScraping ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Start Background Ingestion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEEP WEB CRAWLER POPUP (Config & Results Review) */}
      {/* ========================================================================= */}
      {showCrawlerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-iso-cardBg border border-iso-border rounded-sm max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-iso-border pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-iso-accent" />
                <h3 className="font-serif font-bold text-sm text-iso-primary">
                  {crawlerStep === 'config' ? 'Recursive Website Crawler' : `Discovered Pages (${discoveredUrls.length})`}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCrawlerModal(false)}
                className="text-iso-textMuted hover:text-iso-text cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {crawlerStep === 'config' ? (
              <form onSubmit={handleStartCrawl} className="flex flex-col gap-3 overflow-y-auto pr-1">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                    Starting Root URL *
                  </label>
                  <input
                    type="url"
                    value={crawlStartUrl}
                    onChange={(e) => setCrawlStartUrl(e.target.value)}
                    placeholder="https://docs.organization.com"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                      Crawl Depth (1-5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={crawlDepth}
                      onChange={(e) => setCrawlDepth(e.target.value)}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                      Max Pages Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={crawlMaxPages}
                      onChange={(e) => setCrawlMaxPages(e.target.value)}
                      className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                    Include Patterns (Comma-separated keywords or /path/*)
                  </label>
                  <input
                    type="text"
                    value={crawlIncludePatterns}
                    onChange={(e) => setCrawlIncludePatterns(e.target.value)}
                    placeholder="e.g. /docs/*, /help/*"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold text-iso-textMuted">
                    Exclude Patterns (e.g. /blog/*, login, tag)
                  </label>
                  <input
                    type="text"
                    value={crawlExcludePatterns}
                    onChange={(e) => setCrawlExcludePatterns(e.target.value)}
                    placeholder="e.g. /wp-admin/*, /tag/*, /author/*"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-2.5 py-1.5 text-xs text-iso-text outline-none font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="allowSubdomains"
                    checked={crawlAllowSubdomains}
                    onChange={(e) => setCrawlAllowSubdomains(e.target.checked)}
                    className="rounded text-iso-primary cursor-pointer"
                  />
                  <label htmlFor="allowSubdomains" className="text-xs text-iso-text cursor-pointer select-none">
                    Allow crawling across subdomains (e.g. api.domain.com, docs.domain.com)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-iso-border">
                  <button
                    type="button"
                    onClick={() => setShowCrawlerModal(false)}
                    className="px-3 py-1.5 text-xs text-iso-textMuted hover:text-iso-text border border-iso-border rounded-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCrawling}
                    className="px-4 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isCrawling ? <Loader2 size={13} className="animate-spin" /> : <Compass size={13} />}
                    <span>Launch Background Crawl</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 overflow-hidden flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
                    <input
                      type="text"
                      value={crawlerSearchFilter}
                      onChange={(e) => setCrawlerSearchFilter(e.target.value)}
                      placeholder="Filter discovered links..."
                      className="w-full bg-iso-bg border border-iso-border rounded-sm pl-8 pr-3 py-1.5 text-xs outline-none font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => toggleSelectAllDiscovered(true)}
                      className="text-iso-accent hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllDiscovered(false)}
                      className="text-iso-textMuted hover:underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-80 border border-iso-border rounded divide-y divide-iso-border bg-iso-bg">
                  {filteredDiscoveredUrls.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-2.5 p-2 hover:bg-iso-bgSecondary cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleDiscoveredUrl(item.url)}
                        className="rounded text-iso-primary cursor-pointer"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-iso-primary truncate">{item.title || item.url}</span>
                        <span className="text-[10px] font-mono text-iso-textMuted truncate">{item.url}</span>
                      </div>
                      {item.depth !== undefined && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-iso-bgSecondary border border-iso-border rounded text-iso-textMuted">
                          D:{item.depth}
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-iso-border text-xs font-mono">
                  <span className="text-iso-textMuted">
                    Selected: <strong className="text-iso-primary">{selectedDiscoveredCount}</strong> of {discoveredUrls.length}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCrawlerStep('config')}
                      className="px-3 py-1.5 text-iso-textMuted hover:text-iso-text border border-iso-border rounded cursor-pointer"
                    >
                      Back to Config
                    </button>

                    <button
                      type="button"
                      onClick={handleBatchIngestSubmit}
                      disabled={selectedDiscoveredCount === 0 || isBatchSubmitting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isBatchSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                      <span>Batch Ingest Selected ({selectedDiscoveredCount})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHUNK INSPECTION VIEWER */}
      {/* ========================================================================= */}
      {selectedSourceForChunks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-iso-cardBg border border-iso-border rounded-sm max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-iso-border pb-3">
              <div>
                <h3 className="font-serif font-bold text-sm text-iso-primary">
                  Vector Chunks: {selectedSourceForChunks.title}
                </h3>
                <p className="text-[10px] font-mono text-iso-textMuted truncate max-w-xl">
                  {selectedSourceForChunks.sourceUrl}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSourceForChunks(null)}
                className="text-iso-textMuted hover:text-iso-text cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-96 flex flex-col gap-3 pr-1">
              {loadingChunks ? (
                <div className="p-8 text-center text-iso-textMuted font-mono text-xs flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-iso-primary" />
                  <span>Loading partitioned vector chunks...</span>
                </div>
              ) : chunks.length === 0 ? (
                <div className="p-8 text-center text-xs text-iso-textMuted font-mono">
                  No individual vector chunks found for this document.
                </div>
              ) : (
                chunks.map((chunk, idx) => (
                  <div key={idx} className="p-3 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-mono text-iso-textMuted border-b border-iso-border/40 pb-1">
                      <span className="font-bold text-iso-primary">Chunk #{chunk.chunkIndex !== undefined ? chunk.chunkIndex + 1 : idx + 1}</span>
                      <span>{chunk.charCount || chunk.content?.length || 0} characters</span>
                    </div>
                    <p className="text-iso-text font-serif leading-relaxed whitespace-pre-wrap mt-1">
                      {chunk.content || chunk.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-iso-border">
              <button
                type="button"
                onClick={() => setSelectedSourceForChunks(null)}
                className="px-4 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}

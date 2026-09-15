import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Globe, Plus, Trash2, RefreshCw, Eye, Search, 
  ArrowUpDown, ArrowUp, ArrowDown, Bell, BellOff, Calendar, 
  Mail, CheckCircle2, AlertTriangle, Loader2, Sparkles, X,
  FileText, ExternalLink, Bot, Building2, ListFilter, Send,
  Compass, Layers, Filter, Check, CheckSquare, Square, Shield,
  Radio, CornerDownRight, Link2, Sliders, ArrowRight, Server,
  CheckCircle, AlertCircle, Clock, Terminal, Play, Ban,
  ChevronDown, ChevronUp, Activity
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
  // Top Ingestion Subtabs: "sources" | "operations" | "tester"
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
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    currentUrl: '',
    successful: 0,
    failed: 0,
    inProgress: false,
    errors: []
  });

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

  // Poll active & recent crawler/ingestion jobs
  const fetchOperations = async () => {
    if (!activeTenantId) return;
    try {
      const res = await fetch(`/api/ingestion/jobs/active?tenantId=${encodeURIComponent(activeTenantId)}&botId=${encodeURIComponent(activeBotId || '')}`);
      const data = await res.json();
      if (data && Array.isArray(data.jobs)) {
        setOperations(data.jobs);
        setActiveOperationsCount(data.activeCount || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchOperations();
    const interval = setInterval(fetchOperations, 3500);
    return () => clearInterval(interval);
  }, [activeTenantId, activeBotId]);

  const handleCancelJob = async (jobId) => {
    try {
      const res = await fetch(`/api/ingestion/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Operation cancelled.');
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
      const res = await fetch(`/api/ingestion/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
      if (res.ok) {
        setOperations(prev => prev.filter(j => j.id !== jobId));
        showToast('Task removed from history.');
      }
    } catch (e) {
      showToast('Error deleting task.', 'error');
    }
  };

  const handleClearCompletedJobs = async () => {
    try {
      const res = await fetch('/api/ingestion/jobs/clear-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    setCrawlerStep('results');
    setShowCrawlerModal(true);
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
    // Auto-minimize modal immediately and open Tasks Monitor in sidebar
    setShowIngestModal(false);
    window.dispatchEvent(new CustomEvent('iso_open_operations_panel'));
    window.dispatchEvent(new CustomEvent('iso_job_updated'));
    showToast(
      urlsList.length === 1
        ? 'Document ingestion started in background. Live telemetry active in Tasks Monitor.'
        : `Batch ingestion of ${urlsList.length} URLs started in background. Live telemetry active in Tasks Monitor.`,
      'info'
    );

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
          loadSources();
        } else {
          showToast(data.error || 'Failed to scrape and index URL.', 'error');
        }
      } else {
        // Batch ingestion for multiple comma-separated URLs
        const payload = {
          urls: urlsList,
          tenantId: activeTenantId,
          tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
          botId: activeBotId,
          botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
          linkExpiry: linkExpiry || null,
          expiryNotificationEnabled,
          notificationEmail: expiryNotificationEnabled ? notificationEmail.trim() : '',
          tenantDbName: currentTenantObj?.tenantDbName || `iso_${activeTenantId}`
        };

        const res = await fetch('/api/ingestion/batch-ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
          showToast(`Batch ingestion finished: ${data.successful} successful, ${data.failed} failed.`);
          loadSources();
        } else {
          showToast(data.error || 'Failed batch ingestion.', 'error');
        }
      }
    } catch (err) {
      showToast('Network error during ingestion pipeline.', 'error');
    } finally {
      setIsScraping(false);
      window.dispatchEvent(new CustomEvent('iso_job_updated'));
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
    setShowCrawlerModal(true);
  };

  // Listen for request to open crawler popup at Step 2 (Discovered URLs) from Tasks monitor
  useEffect(() => {
    const processCrawlJob = (job) => {
      if (!job) return;
      let list = [];
      if (job?.result?.discoveredUrls && Array.isArray(job.result.discoveredUrls) && job.result.discoveredUrls.length > 0) {
        list = job.result.discoveredUrls.map((u, idx) => ({
          ...u,
          id: idx,
          selected: u.status !== 'error'
        }));
      } else if (job?.discoveredUrls && Array.isArray(job.discoveredUrls) && job.discoveredUrls.length > 0) {
        list = job.discoveredUrls.map((u, idx) => ({
          ...u,
          id: idx,
          selected: u.status !== 'error'
        }));
      } else if (discoveredUrls.length > 0) {
        list = discoveredUrls;
      }

      if (job?.params?.startUrl) setCrawlStartUrl(job.params.startUrl);
      else if (job?.result?.startUrl) setCrawlStartUrl(job.result.startUrl);
      if (job?.params?.maxDepth) setCrawlDepth(job.params.maxDepth);
      else if (job?.result?.maxDepth) setCrawlDepth(job.result.maxDepth);
      if (job?.params?.maxPages) setCrawlMaxPages(job.params.maxPages);
      else if (job?.result?.maxPages) setCrawlMaxPages(job.result.maxPages);

      if (list.length > 0) {
        setDiscoveredUrls(list);
        setCrawlerStep('results');
        setShowCrawlerModal(true);
        showToast(`Loaded ${list.length} discovered URLs ready for ingestion.`);
      } else {
        setCrawlerStep('results');
        setShowCrawlerModal(true);
        showToast('No discovered URLs found for this job.', 'warning');
      }
    };

    // Check if there is a pending crawl job on mount
    let pending = window.__pendingContinueCrawlJob;
    if (!pending) {
      try {
        const stored = sessionStorage.getItem('iso_pending_crawl_job');
        if (stored) pending = JSON.parse(stored);
      } catch (e) {}
    }
    if (pending) {
      window.__pendingContinueCrawlJob = null;
      try { sessionStorage.removeItem('iso_pending_crawl_job'); } catch (e) {}
      processCrawlJob(pending);
    }

    const handleContinueCrawl = (e) => {
      const job = e.detail?.job || window.__pendingContinueCrawlJob;
      window.__pendingContinueCrawlJob = null;
      try { sessionStorage.removeItem('iso_pending_crawl_job'); } catch (err) {}
      processCrawlJob(job);
    };

    window.addEventListener('iso_continue_crawl_job', handleContinueCrawl);
    return () => window.removeEventListener('iso_continue_crawl_job', handleContinueCrawl);
  }, []);

  // Start Recursive Web Crawling
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

    setIsCrawling(true);
    // Minimize the popup and open the sidebar tasks menu
    setShowCrawlerModal(false);
    window.dispatchEvent(new CustomEvent('iso_open_operations_panel'));
    showToast('Crawl launched in background. Live progress is visible in Tasks Monitor.', 'info');

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
        botId: activeBotId
      };

      // Notify Sidebar operations monitor
      window.dispatchEvent(new CustomEvent('iso_job_updated'));

      const res = await fetch('/api/ingestion/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      window.dispatchEvent(new CustomEvent('iso_job_updated'));

      if (res.ok && Array.isArray(data.discoveredUrls)) {
        const list = data.discoveredUrls.map((u, idx) => ({
          ...u,
          id: idx,
          selected: u.status !== 'error'
        }));
        setDiscoveredUrls(list);
        setCrawlerStep('results');
        showToast(`Crawl finished: ${list.length} URLs discovered. Review in Tasks Monitor to ingest.`, 'info');
      } else {
        showToast(data.error || 'Failed to crawl website.', 'error');
      }
    } catch (err) {
      showToast('Network error during web crawl.', 'error');
    } finally {
      setIsCrawling(false);
      window.dispatchEvent(new CustomEvent('iso_job_updated'));
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

  // Batch Ingestion for selected discovered URLs
  const handleBatchIngestSubmit = async () => {
    const selectedList = discoveredUrls.filter(u => u.selected);
    if (selectedList.length === 0) {
      showToast('Please select at least one discovered URL to ingest.', 'warning');
      return;
    }

    const currentTenantObj = tenants.find(t => (t.tenantId === activeTenantId || t.code === activeTenantId));
    const currentBotObj = availableBots.find(b => (b.botId === activeBotId || b.code === activeBotId));

    setCrawlerStep('ingesting');
    setShowCrawlerModal(false);
    window.dispatchEvent(new CustomEvent('iso_open_operations_panel'));
    window.dispatchEvent(new CustomEvent('iso_job_updated'));
    showToast(`Batch ingestion of ${selectedList.length} URLs started in background. Live telemetry active in Tasks Monitor.`, 'info');

    setBatchProgress({
      current: 0,
      total: selectedList.length,
      currentUrl: '',
      successful: 0,
      failed: 0,
      inProgress: true,
      errors: []
    });

    for (let i = 0; i < selectedList.length; i++) {
      const item = selectedList[i];
      setBatchProgress(prev => ({
        ...prev,
        current: i + 1,
        currentUrl: item.url
      }));

      try {
        const res = await fetch('/api/ingestion/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: item.url,
            tenantId: activeTenantId,
            tenantName: currentTenantObj?.name || currentTenantObj?.tenantName || activeTenantId,
            botId: activeBotId,
            botName: currentBotObj?.botName || currentBotObj?.name || activeBotId,
            linkExpiry: crawlLinkExpiry || null,
            expiryNotificationEnabled: crawlExpiryNotificationEnabled,
            notificationEmail: crawlExpiryNotificationEnabled ? crawlNotificationEmail.trim() : '',
            tenantDbName: currentTenantObj?.tenantDbName || `iso_${activeTenantId}`
          })
        });

        if (res.ok) {
          setBatchProgress(prev => ({ ...prev, successful: prev.successful + 1 }));
        } else {
          const errData = await res.json().catch(() => ({}));
          setBatchProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
            errors: [...prev.errors, { url: item.url, error: errData.error || 'Failed' }]
          }));
        }
      } catch (err) {
        setBatchProgress(prev => ({
          ...prev,
          failed: prev.failed + 1,
          errors: [...prev.errors, { url: item.url, error: err.message }]
        }));
      }
      window.dispatchEvent(new CustomEvent('iso_job_updated'));
    }

    setBatchProgress(prev => ({ ...prev, inProgress: false }));
    setCrawlerStep('done');
    loadSources();
    window.dispatchEvent(new CustomEvent('iso_job_updated'));
    showToast(`Batch ingestion finished: ${selectedList.length} processed.`);
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

      {/* SUB-TABS NAVIGATION (Ingested URLs | Live Operations & Crawler Tasks | RAG Search Verification Tester) */}
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
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 font-serif text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'operations'
                ? 'border-iso-primary text-iso-primary'
                : 'border-transparent text-iso-textMuted hover:text-iso-text'
            }`}
          >
            <Activity size={16} className={activeOperationsCount > 0 ? 'text-emerald-600 animate-pulse' : 'text-iso-accent'} />
            <span>Live Operations &amp; Crawled URLs ({operations.length})</span>
            {activeOperationsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-mono rounded-full font-bold animate-pulse">
                {activeOperationsCount} RUNNING
              </span>
            )}
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

              {/* Single URL Ingest Button */}
              <button
                type="button"
                onClick={handleOpenIngestModal}
                className="px-3.5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Ingest Single URL</span>
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
      {/* SUBTAB 2: LIVE OPERATIONS & CRAWLER TASKS */}
      {/* ========================================================================= */}
      {activeTab === 'operations' && (
        <div className="flex flex-col gap-4">
          
          {/* Operations Controls Header */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-iso-cardBg p-3 border border-iso-border rounded-sm shadow-xs">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-iso-accent" />
              <div>
                <h3 className="text-xs font-bold text-iso-primary">Crawler &amp; Ingestion Job Queue</h3>
                <p className="text-[10px] text-iso-textMuted font-mono">
                  {operations.length} tracked task(s) • Auto-polling every 3.5s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {operations.some(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled') && (
                <button
                  type="button"
                  onClick={handleClearCompletedJobs}
                  className="px-2.5 py-1.5 text-xs text-iso-textMuted hover:text-iso-error border border-iso-border hover:border-iso-error/30 rounded-sm hover:bg-iso-errorBg/20 transition-all cursor-pointer font-mono"
                >
                  Clear Completed
                </button>
              )}

              <button
                type="button"
                onClick={fetchOperations}
                className="p-1.5 text-iso-textMuted hover:text-iso-primary border border-iso-border rounded-sm hover:bg-iso-bgSecondary transition-all cursor-pointer shadow-2xs"
                title="Refresh Tasks"
              >
                <RefreshCw size={13} className={loadingOperations ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={handleOpenCrawlerModal}
                className="px-3.5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Compass size={14} />
                <span>Launch Web Crawler</span>
              </button>
            </div>
          </div>

          {/* Operations List */}
          {operations.length === 0 ? (
            <div className="bg-iso-cardBg border border-iso-border rounded-sm p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-iso-bgSecondary border border-iso-border flex items-center justify-center text-iso-textMuted">
                <Activity size={22} />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-iso-primary">No Active Crawler Tasks or Operations</h4>
                <p className="text-xs text-iso-textMuted mt-1">
                  When you run a recursive website crawl or batch ingestion, live progress, discovered links, and logs will appear here in real time.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCrawlerModal}
                className="mt-2 px-4 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Compass size={14} />
                <span>Start Website Crawl</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {operations.map((job) => {
                const isRunning = job.status === 'running' || job.status === 'pending';
                const isCompleted = job.status === 'completed';
                const isFailed = job.status === 'failed';
                const isCancelled = job.status === 'cancelled';
                const percent = job.progress?.percent !== undefined ? job.progress.percent : (isCompleted ? 100 : 0);
                
                const discoveredList = job?.result?.discoveredUrls || job?.discoveredUrls || [];
                const discoveredCount = discoveredList.length || (job.result?.totalDiscovered || 0);
                const hasDiscoveredUrls = discoveredCount > 0;
                const startUrl = job.params?.startUrl || job.result?.startUrl || job.targetUrl || '';

                return (
                  <div 
                    key={job.id} 
                    className="bg-iso-cardBg border border-iso-border rounded-sm p-4 shadow-sm flex flex-col gap-3 transition-all hover:border-iso-accent/60"
                  >
                    {/* Job Card Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-iso-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-iso-bgSecondary border border-iso-border rounded text-[10px] font-mono font-bold uppercase tracking-wider text-iso-primary flex items-center gap-1">
                          {job.type === 'website_crawl' ? <Compass size={11} className="text-iso-accent" /> : <Layers size={11} className="text-iso-primary" />}
                          <span>{job.type?.replace('_', ' ') || 'Operation'}</span>
                        </span>

                        <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold uppercase tracking-wider border flex items-center gap-1 ${
                          isRunning 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : isCompleted 
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {isRunning && <Loader2 size={10} className="animate-spin" />}
                          {isCompleted && <CheckCircle size={10} />}
                          {isFailed && <AlertCircle size={10} />}
                          {isCancelled && <Ban size={10} />}
                          <span>{job.status}</span>
                        </span>

                        <span className="text-[10px] font-mono text-iso-textMuted">
                          ID: {job.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-iso-textMuted">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>{job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : 'Just now'}</span>
                        </span>

                        {isRunning && (
                          <button
                            type="button"
                            onClick={() => handleCancelJob(job.id)}
                            className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        {!isRunning && (
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1 text-iso-textMuted hover:text-rose-600 cursor-pointer"
                            title="Remove task from history"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Job Details & Start URL */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        {startUrl && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] font-mono uppercase text-iso-textMuted font-bold">Target:</span>
                            <a 
                              href={startUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-iso-primary hover:underline font-mono truncate text-xs font-semibold flex items-center gap-1"
                            >
                              <span>{startUrl}</span>
                              <ExternalLink size={10} className="shrink-0 text-iso-textMuted" />
                            </a>
                          </div>
                        )}

                        <div className="text-[11px] text-iso-textMuted font-mono">
                          {job.progress?.currentUrl ? (
                            <span className="truncate block">Current page: {job.progress.currentUrl}</span>
                          ) : job.result?.message ? (
                            <span>{job.result.message}</span>
                          ) : (
                            <span>Processed {job.progress?.current || 0} of {job.progress?.total || 0} pages</span>
                          )}
                        </div>
                      </div>

                      {/* Discovered URLs Action Button */}
                      {hasDiscoveredUrls && (
                        <button
                          type="button"
                          onClick={() => handleInspectDiscoveredUrls(job)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                        >
                          <Compass size={13} />
                          <span>View Discovered URLs ({discoveredCount})</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-iso-textMuted">
                        <span>{isRunning ? 'Crawling & extracting internal links...' : isCompleted ? 'Execution finished' : 'Stopped'}</span>
                        <span className="font-bold text-iso-primary">{percent}%</span>
                      </div>
                      <div className="w-full bg-iso-bgSecondary h-2 rounded-full overflow-hidden border border-iso-border">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isFailed ? 'bg-rose-500' : isCompleted ? 'bg-blue-600' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Collapsible Log Stream */}
                    {job.logs && job.logs.length > 0 && (
                      <div className="border-t border-iso-border/40 pt-2 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setExpandedLogJobId(expandedLogJobId === job.id ? null : job.id)}
                          className="flex items-center gap-1.5 text-[10px] font-mono text-iso-textMuted hover:text-iso-primary cursor-pointer w-fit"
                        >
                          <Terminal size={11} />
                          <span>{expandedLogJobId === job.id ? 'Hide Execution Logs' : `View Logs (${job.logs.length} entries)`}</span>
                          {expandedLogJobId === job.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>

                        {expandedLogJobId === job.id && (
                          <pre className="bg-slate-900 text-emerald-400 p-3 rounded text-[10px] font-mono max-h-40 overflow-y-auto leading-relaxed border border-slate-800">
                            {job.logs.map((l, idx) => (
                              <div key={idx}>{typeof l === 'string' ? l : `[${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ''}] ${l.message || JSON.stringify(l)}`}</div>
                            ))}
                          </pre>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: RAG SEARCH VERIFICATION TESTER */}
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
              
              {/* Target URL(s) */}
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-semibold flex items-center justify-between">
                  <span>Target Webpage URL(s) <span className="text-iso-error">*</span></span>
                  <span className="text-[9px] text-iso-accent font-normal lowercase">single URL or comma-separated</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={urlInput}
                    disabled={isScraping}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://docs.company.com/faq, https://docs.company.com/api, https://docs.company.com/guide"
                    className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2 text-xs text-iso-text outline-none font-mono disabled:opacity-50 disabled:bg-iso-bgSecondary resize-none"
                    required
                    autoFocus
                  />
                  <Globe size={14} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
                </div>
                <p className="text-[10px] text-iso-textMuted mt-1">
                  You can enter a single URL or paste multiple URLs separated by commas, semicolons, or newlines. Each page will be scraped, chunked, and embedded into vector storage.
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
                    disabled={isScraping}
                    onChange={(e) => setLinkExpiry(e.target.value)}
                    className="w-full bg-iso-cardBg border border-iso-border rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
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
                      disabled={isScraping}
                      onChange={(e) => setExpiryNotificationEnabled(e.target.checked)}
                      className="w-4 h-4 accent-iso-primary cursor-pointer rounded disabled:opacity-50"
                    />
                  </div>

                  {expiryNotificationEnabled && (
                    <div className="relative animate-in fade-in duration-150 mt-1">
                      <input
                        type="email"
                        value={notificationEmail}
                        disabled={isScraping}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="alerts@company.com"
                        className="w-full bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-1.5 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
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
                  disabled={isScraping}
                  className="px-4 py-1.5 bg-iso-bgSecondary border border-iso-border rounded-sm text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScraping || !urlInput.trim() || !activeBotId}
                  className="px-5 py-1.5 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isScraping ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isScraping ? 'Scraping & Indexing...' : 'Scrape & Index Document(s)'}</span>
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

      {/* ========================================================================= */}
      {/* WEB CRAWLER MODAL (POPUP WITH DEPTH, PROXY, INCLUDE/EXCLUDE & BATCH INGEST) */}
      {/* ========================================================================= */}
      {showCrawlerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-4xl h-[90vh] max-h-[760px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header (Fixed Top) */}
            <div className="px-6 py-3.5 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-iso-accent/15 border border-iso-accent/30 flex items-center justify-center text-iso-primary">
                  <Compass size={18} className="text-iso-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-iso-primary">Web Crawler &amp; Deep Link Discovery</h3>
                    <span className="px-1.5 py-0.2 bg-iso-primary text-white text-[9px] font-mono rounded uppercase font-bold tracking-wider">
                      Recursive Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-iso-textMuted font-mono">
                    Vector Partition: <strong className="text-iso-primary">{activeIndexName}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCrawlerModal(false)} 
                disabled={isCrawling || batchProgress.inProgress}
                className="p-1 text-iso-textMuted hover:text-iso-primary rounded cursor-pointer disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Navigation (Fixed Below Header) */}
            <div className="px-6 py-2 border-b border-iso-border bg-iso-bg flex items-center justify-between text-xs shrink-0 select-none">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  disabled={isCrawling || batchProgress.inProgress}
                  onClick={() => setCrawlerStep('config')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-colors disabled:opacity-50 ${
                    crawlerStep === 'config'
                      ? 'bg-iso-primary text-white font-bold'
                      : 'text-iso-textMuted hover:text-iso-primary'
                  }`}
                >
                  <span>1. Crawler Settings</span>
                </button>

                <ArrowRight size={12} className="text-iso-textMuted/60" />

                <button
                  type="button"
                  disabled={discoveredUrls.length === 0 || isCrawling || batchProgress.inProgress}
                  onClick={() => setCrawlerStep('results')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-colors disabled:opacity-40 ${
                    crawlerStep === 'results'
                      ? 'bg-iso-primary text-white font-bold'
                      : 'text-iso-textMuted hover:text-iso-primary'
                  }`}
                >
                  <span>2. Discovered URLs ({discoveredUrls.length})</span>
                </button>

                <ArrowRight size={12} className="text-iso-textMuted/60" />

                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm ${
                  crawlerStep === 'ingesting' || crawlerStep === 'done'
                    ? 'bg-iso-primary text-white font-bold'
                    : 'text-iso-textMuted opacity-50'
                }`}>
                  <span>3. Ingesting &amp; Vectorization</span>
                </span>
              </div>

              {crawlerStep === 'results' && (
                <div className="text-[11px] font-mono">
                  <span className="text-iso-accent font-bold">{selectedDiscoveredCount}</span> of <strong>{discoveredUrls.length}</strong> URLs selected
                </div>
              )}
            </div>

            {/* Modal Body Container (The ONLY Scrolling Element) */}
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
              
              {/* STEP 1: CONFIGURATION FORM */}
              {crawlerStep === 'config' && (
                <div className="flex flex-col gap-5">
                  
                  {/* Target Starting URL */}
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                      Starting Root URL <span className="text-iso-error">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={crawlStartUrl}
                        disabled={isCrawling || batchProgress.inProgress}
                        onChange={(e) => setCrawlStartUrl(e.target.value)}
                        placeholder="https://docs.company.com or https://company.com/knowledge-base"
                        className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3.5 py-2.5 text-xs text-iso-text outline-none font-mono disabled:opacity-50 disabled:bg-iso-bgSecondary"
                        required
                        autoFocus
                      />
                      <Globe size={14} className="absolute left-2.5 top-3 text-iso-textMuted" />
                    </div>
                    <p className="text-[10px] text-iso-textMuted mt-1">
                      The crawler starts at this URL and recursively traverses internal pages up to the selected depth.
                    </p>
                  </div>

                  {/* Grid: Crawl Depth & Max Pages Limit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Depth Selector */}
                    <div className="p-3.5 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-primary font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Layers size={13} className="text-iso-accent" />
                          <span>Crawl Depth (Levels)</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-iso-primary text-white rounded text-[9px]">
                          Depth: {crawlDepth}
                        </span>
                      </label>
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((d) => (
                          <button
                            key={d}
                            type="button"
                            disabled={isCrawling || batchProgress.inProgress}
                            onClick={() => setCrawlDepth(d)}
                            className={`py-1.5 rounded-sm text-xs font-mono font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                              crawlDepth === d
                                ? 'bg-iso-primary text-white border-iso-primary shadow-xs'
                                : 'bg-iso-cardBg text-iso-text border-iso-border hover:border-iso-primary'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] font-mono text-iso-textMuted mt-0.5">
                        {crawlDepth === 1 && 'Level 1: Root start page only.'}
                        {crawlDepth === 2 && 'Level 2: Root page + direct links (Recommended for docs).'}
                        {crawlDepth === 3 && 'Level 3: Traverse 2 clicks deep into site tree.'}
                        {crawlDepth >= 4 && `Level ${crawlDepth}: Deep recursive crawl across entire domain.`}
                      </p>
                    </div>

                    {/* Max Pages Limit (Up to 10,000) */}
                    <div className="p-3.5 bg-iso-bg border border-iso-border rounded-sm flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-primary font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sliders size={13} className="text-iso-accent" />
                          <span>Max Discovered Pages Limit</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-iso-primary text-white rounded text-[9px] font-mono font-bold">
                          Cap: {crawlMaxPages}
                        </span>
                      </label>

                      {/* Quick Presets up to 10,000 */}
                      <div className="grid grid-cols-6 gap-1 pt-1">
                        {[50, 100, 500, 1000, 5000, 10000].map((p) => (
                          <button
                            key={p}
                            type="button"
                            disabled={isCrawling || batchProgress.inProgress}
                            onClick={() => setCrawlMaxPages(p)}
                            className={`py-1 rounded-sm text-[10px] font-mono font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                              crawlMaxPages === p
                                ? 'bg-iso-primary text-white border-iso-primary shadow-xs'
                                : 'bg-iso-cardBg text-iso-text border-iso-border hover:border-iso-primary'
                            }`}
                          >
                            {p >= 1000 ? `${p / 1000}k` : p}
                          </button>
                        ))}
                      </div>

                      {/* Custom input allows up to 10000 */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-iso-textMuted uppercase">Custom:</span>
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={crawlMaxPages}
                          disabled={isCrawling || batchProgress.inProgress}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setCrawlMaxPages(Math.min(10000, Math.max(1, val)));
                            }
                          }}
                          className="w-24 bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm px-2 py-1 text-xs font-mono text-iso-text outline-none disabled:opacity-50"
                        />
                        <span className="text-[9px] font-mono text-iso-textMuted">pages max (1 - 10,000)</span>
                      </div>
                    </div>

                  </div>

                  {/* Grid: Include Paths & Exclude Paths */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Include Paths */}
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                        Include Paths / Wildcards (Optional)
                      </label>
                      <input
                        type="text"
                        value={crawlIncludePatterns}
                        disabled={isCrawling || batchProgress.inProgress}
                        onChange={(e) => setCrawlIncludePatterns(e.target.value)}
                        placeholder="/docs/*, /help/*, /kb/*, /faq"
                        className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
                      />
                      <span className="text-[9px] text-iso-textMuted mt-1 block">
                        Comma-separated paths. Only URLs matching these patterns will be crawled.
                      </span>
                    </div>

                    {/* Exclude Paths */}
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                        Exclude Paths / Wildcards (Optional)
                      </label>
                      <input
                        type="text"
                        value={crawlExcludePatterns}
                        disabled={isCrawling || batchProgress.inProgress}
                        onChange={(e) => setCrawlExcludePatterns(e.target.value)}
                        placeholder="/login, /cart, /admin/*, /tag/*"
                        className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-2 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
                      />
                      <span className="text-[9px] text-iso-textMuted mt-1 block">
                        Comma-separated paths to ignore (e.g. login pages, checkout carts).
                      </span>
                    </div>

                  </div>

                  {/* Proxy Server & Subdomains */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-iso-bg border border-iso-border rounded-sm">
                    
                    {/* Proxy Server */}
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold flex items-center gap-1.5">
                        <Server size={12} className="text-iso-accent" />
                        <span>HTTP / HTTPS Proxy Server (Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={crawlProxy}
                        disabled={isCrawling || batchProgress.inProgress}
                        onChange={(e) => setCrawlProxy(e.target.value)}
                        placeholder="http://user:pass@proxy.corp.com:8080"
                        className="w-full bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm px-3 py-1.5 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
                      />
                      <span className="text-[9px] text-iso-textMuted mt-0.5 block">
                        Supports authenticated or unauthenticated HTTP/HTTPS proxies.
                      </span>
                    </div>

                    {/* Subdomains Toggle & Expiry Settings */}
                    <div className="flex flex-col gap-2.5 justify-center">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted font-bold">
                          Allow Subdomains (e.g. blog.site.com)
                        </label>
                        <input
                          type="checkbox"
                          checked={crawlAllowSubdomains}
                          disabled={isCrawling || batchProgress.inProgress}
                          onChange={(e) => setCrawlAllowSubdomains(e.target.checked)}
                          className="w-4 h-4 accent-iso-primary cursor-pointer rounded disabled:opacity-50"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-iso-border/40">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted font-bold">
                          Batch Link Expiry Date
                        </label>
                        <input
                          type="date"
                          value={crawlLinkExpiry}
                          disabled={isCrawling || batchProgress.inProgress}
                          onChange={(e) => setCrawlLinkExpiry(e.target.value)}
                          className="bg-iso-cardBg border border-iso-border rounded-sm px-2 py-0.5 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
                        />
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* STEP 2: DISCOVERED URLS LIST */}
              {crawlerStep === 'results' && (
                <div className="flex flex-col gap-4">
                  
                  {/* Results Filter & Selection Control Bar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-iso-bg border border-iso-border rounded-sm">
                    
                    {/* Live Search in Results */}
                    <div className="relative flex-1 max-w-sm">
                      <Search size={13} className="absolute left-2.5 top-2 text-iso-textMuted" />
                      <input
                        type="text"
                        value={crawlerSearchFilter}
                        disabled={isCrawling || batchProgress.inProgress}
                        onChange={(e) => setCrawlerSearchFilter(e.target.value)}
                        placeholder="Filter discovered URLs..."
                        className="w-full bg-iso-cardBg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-7 py-1 text-xs text-iso-text outline-none font-mono disabled:opacity-50"
                      />
                      {crawlerSearchFilter && (
                        <button
                          type="button"
                          onClick={() => setCrawlerSearchFilter('')}
                          className="absolute right-2 top-1.5 text-iso-textMuted hover:text-iso-text"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isCrawling || batchProgress.inProgress}
                        onClick={() => toggleSelectAllDiscovered(true)}
                        className="px-2.5 py-1 bg-iso-cardBg hover:bg-iso-bg border border-iso-border rounded-sm text-[11px] font-mono text-iso-primary font-bold cursor-pointer disabled:opacity-50"
                      >
                        Select All ({discoveredUrls.length})
                      </button>
                      <button
                        type="button"
                        disabled={isCrawling || batchProgress.inProgress}
                        onClick={() => toggleSelectAllDiscovered(false)}
                        className="px-2.5 py-1 bg-iso-cardBg hover:bg-iso-bg border border-iso-border rounded-sm text-[11px] font-mono text-iso-textMuted cursor-pointer disabled:opacity-50"
                      >
                        Deselect All
                      </button>
                    </div>

                  </div>

                  {/* Discovered URLs List */}
                  <div className="border border-iso-border rounded-sm overflow-hidden divide-y divide-iso-border/60 bg-iso-cardBg max-h-[380px] overflow-y-auto">
                    {filteredDiscoveredUrls.length === 0 ? (
                      <div className="p-8 text-center text-iso-textMuted font-mono text-xs">
                        No discovered URLs match your search filter.
                      </div>
                    ) : (
                      filteredDiscoveredUrls.map((item, idx) => {
                        const isSelected = item.selected;
                        const isError = item.status === 'error';

                        return (
                          <div
                            key={idx}
                            onClick={() => !isError && !isCrawling && !batchProgress.inProgress && toggleDiscoveredUrl(item.url)}
                            className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-iso-primary/5 hover:bg-iso-primary/10'
                                : 'hover:bg-iso-bgSecondary/30 opacity-70'
                            } ${isError ? 'opacity-50 cursor-not-allowed bg-rose-50/20' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(isSelected)}
                              disabled={isError || isCrawling || batchProgress.inProgress}
                              onChange={() => toggleDiscoveredUrl(item.url)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 w-4 h-4 accent-iso-primary cursor-pointer rounded shrink-0 disabled:opacity-50"
                            />

                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-iso-primary text-xs truncate max-w-md">
                                  {item.title || 'Untitled Page'}
                                </span>
                                <span className="px-1.5 py-0.2 bg-iso-bgSecondary border border-iso-border rounded-xs text-[9px] font-mono text-iso-primary font-semibold shrink-0">
                                  Depth {item.depth}
                                </span>
                                {isError && (
                                  <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xs text-[9px] font-mono font-bold">
                                    Fetch Failed
                                  </span>
                                )}
                              </div>

                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-mono text-iso-accent hover:underline truncate max-w-xl flex items-center gap-1"
                              >
                                <span>{item.url}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>

                              {item.foundOn && item.foundOn !== 'Root Entry' && (
                                <span className="text-[9px] font-mono text-iso-textMuted flex items-center gap-1 truncate mt-0.5">
                                  <CornerDownRight size={9} className="shrink-0" />
                                  <span>Found on: {item.foundOn}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              )}

              {/* STEP 3: LIVE BATCH INGESTION PROGRESS */}
              {(crawlerStep === 'ingesting' || crawlerStep === 'done') && (
                <div className="flex flex-col items-center justify-center p-6 text-center gap-5 animate-in fade-in duration-200">
                  
                  {crawlerStep === 'ingesting' ? (
                    <div className="w-14 h-14 rounded-full bg-iso-accent/15 border-2 border-iso-accent/30 flex items-center justify-center text-iso-primary shadow-xs">
                      <Loader2 size={28} className="animate-spin text-iso-accent" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-xs">
                      <CheckCircle2 size={28} />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-lg">
                    <h3 className="text-base font-serif font-bold text-iso-primary">
                      {crawlerStep === 'ingesting' ? 'Batch Ingestion in Progress' : 'Batch Ingestion Completed!'}
                    </h3>
                    <p className="text-xs text-iso-textMuted font-mono">
                      {crawlerStep === 'ingesting'
                        ? `Scraping, chunking, and embedding: ${batchProgress.current} of ${batchProgress.total} URLs`
                        : `Successfully vectorized and ingested ${batchProgress.successful} pages into vector index "${activeIndexName}".`}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-lg flex flex-col gap-1.5">
                    <div className="w-full h-3 bg-iso-bg border border-iso-border rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-iso-primary rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-iso-textMuted">
                      <span>{batchProgress.total > 0 ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0}% Completed</span>
                      <span>Success: <strong className="text-emerald-600">{batchProgress.successful}</strong> • Failed: <strong className="text-rose-600">{batchProgress.failed}</strong></span>
                    </div>
                  </div>

                  {/* Active URL Snippet */}
                  {batchProgress.inProgress && batchProgress.currentUrl && (
                    <div className="p-2.5 bg-iso-bg border border-iso-border rounded-sm text-[10px] font-mono text-iso-primary truncate max-w-lg w-full flex items-center gap-2">
                      <Loader2 size={11} className="animate-spin shrink-0 text-iso-accent" />
                      <span className="truncate">Ingesting: {batchProgress.currentUrl}</span>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* FIXED BOTTOM ACTIONS FOOTER (Pinned to Bottom of Dialog) */}
            <div className="px-6 py-3 border-t border-iso-border bg-iso-bgSecondary/30 flex items-center justify-between shrink-0">
              {crawlerStep === 'config' && (
                <>
                  <div className="text-[11px] font-mono text-iso-textMuted flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-iso-accent" />
                    <span>Recursive crawl cap: up to 10,000 pages</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCrawlerModal(false)}
                      disabled={isCrawling}
                      className="px-4 py-2 bg-iso-bgSecondary hover:bg-iso-bg border border-iso-border rounded-sm text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCrawl}
                      disabled={isCrawling || !crawlStartUrl.trim() || !activeBotId}
                      className="px-6 py-2 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      {isCrawling ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Crawling &amp; Discovering Links...</span>
                        </>
                      ) : (
                        <>
                          <Compass size={14} />
                          <span>Start Crawler &amp; Discover URLs</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {crawlerStep === 'results' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCrawlerStep('config')}
                    disabled={isCrawling || batchProgress.inProgress}
                    className="px-3.5 py-1.5 bg-iso-bgSecondary hover:bg-iso-bg border border-iso-border rounded-sm text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    ← Back to Crawler Config
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCrawlerModal(false)}
                      disabled={isCrawling || batchProgress.inProgress}
                      className="px-3.5 py-1.5 bg-iso-bgSecondary hover:bg-iso-bg border border-iso-border rounded-sm text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchIngestSubmit}
                      disabled={selectedDiscoveredCount === 0 || isCrawling || batchProgress.inProgress}
                      className="px-6 py-2 bg-iso-primary hover:bg-iso-primaryLight disabled:opacity-50 text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>Scrape &amp; Ingest Selected ({selectedDiscoveredCount} URLs)</span>
                    </button>
                  </div>
                </>
              )}

              {(crawlerStep === 'ingesting' || crawlerStep === 'done') && (
                <>
                  <div className="text-[11px] font-mono text-iso-textMuted">
                    {crawlerStep === 'ingesting' ? 'Task running • View live telemetry in Sidebar Monitor' : 'All URLs processed successfully'}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {crawlerStep === 'ingesting' ? (
                      <button
                        type="button"
                        onClick={() => setShowCrawlerModal(false)}
                        className="px-4 py-2 bg-iso-bgSecondary hover:bg-iso-bg border border-iso-border rounded-sm text-xs font-semibold cursor-pointer"
                      >
                        Run in Background
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCrawlerModal(false)}
                        className="px-6 py-2 bg-iso-primary text-white text-xs font-bold rounded-sm shadow-md hover:bg-iso-primaryLight transition-all cursor-pointer"
                      >
                        Done &amp; View Ingested Sources
                      </button>
                    )}
                  </div>
                </>
              )}
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

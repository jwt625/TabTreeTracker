// =============================================================================
// Imports
// =============================================================================
import {
  TIMING,
  DATA,
  ERROR_MESSAGES,
  CONTENT_ANALYSIS
} from './src/constants.js';

// =============================================================================
// State Management
// =============================================================================
const State = {
  tabTree: {},
  tabHistory: {},
  excludedDomains: [],
  userTimeZone: 'UTC',
  isTracking: false,
  enableContentAnalysis: false,
  extensionInitialized: false,
  trackingCheckInterval: null,
  viewerPort: null,
  contentAnalysisCache: new Map(),
  lastCleanup: Date.now(),

  // Update node in both tree and history
  updateNode: function(node, updates) {
    // Find node in tree
    const treeNode = this.findNodeInTree(node.id);
    if (treeNode) {
      Object.assign(treeNode, updates);
    }

    // Find and update in history
    const historyArr = this.tabHistory[node.tabId];
    if (historyArr) {
      const historyNode = historyArr.find(n => n.id === node.id);
      if (historyNode) {
        Object.assign(historyNode, updates);
      }
    }

    // Save changes
    this.saveState();
  },

  // Find node in tree structure
  findNodeInTree: function(nodeId) {
    const searchNode = (node) => {
      if (node.id === nodeId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = searchNode(child);
          if (found) return found;
        }
      }
      return null;
    };

    for (const rootId in this.tabTree) {
      const found = searchNode(this.tabTree[rootId]);
      if (found) return found;
    }
    return null;
  },

  // Save state to storage (immediate)
  saveState: function() {
    chrome.storage.local.set({
      tabTree: this.tabTree,
      isTracking: this.isTracking
    });
  },

  // Debounced save to reduce storage operations
  debouncedSave: (function() {
    let timeoutId = null;
    return function() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        this.saveState();
        timeoutId = null;
      }, TIMING.STORAGE_DEBOUNCE_DELAY);
    };
  })(),

  // Clear all state
  clearState: function() {
    this.tabTree = {};
    this.tabHistory = {};
    this.saveState();
  },

  // Prune old data based on retention period
  pruneOldData: function() {
    const retentionPeriod = DATA.DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const cutoffTime = Date.now() - retentionPeriod;
    let prunedCount = 0;

    // Helper function to recursively prune nodes
    const pruneNode = (node) => {
      if (!node) return null;

      // Remove old children first
      if (node.children) {
        node.children = node.children
          .map(child => pruneNode(child))
          .filter(child => child !== null);
      }

      // Remove node if it's too old and closed
      if (node.closedAt && node.closedAt < cutoffTime) {
        prunedCount++;
        return null;
      }

      return node;
    };

    // Prune tree structure
    const newTree = {};
    for (const [rootId, rootNode] of Object.entries(this.tabTree)) {
      const prunedRoot = pruneNode(rootNode);
      if (prunedRoot) {
        newTree[rootId] = prunedRoot;
      } else {
        prunedCount++;
      }
    }

    this.tabTree = newTree;

    // Prune tab history
    for (const [tabId, history] of Object.entries(this.tabHistory)) {
      const filteredHistory = history.filter(node =>
        !node.closedAt || node.closedAt >= cutoffTime
      );

      if (filteredHistory.length === 0) {
        delete this.tabHistory[tabId];
      } else {
        this.tabHistory[tabId] = filteredHistory;
      }
    }

    if (prunedCount > 0) {
      console.log(`Pruned ${prunedCount} old nodes`);
      this.saveState();
    }

    return prunedCount;
  },

  // Check if tree size exceeds limits
  checkTreeSize: function() {
    const nodeCount = this.countNodes();
    if (nodeCount > DATA.MAX_TREE_SIZE) {
      console.warn(`Tree size (${nodeCount}) exceeds maximum (${DATA.MAX_TREE_SIZE})`);
      // Prune oldest nodes first
      this.pruneOldData();

      // If still too large, prune more aggressively
      const newNodeCount = this.countNodes();
      if (newNodeCount > DATA.MAX_TREE_SIZE) {
        this.pruneExcessNodes(newNodeCount - DATA.MAX_TREE_SIZE);
      }
    }
  },

  // Count total nodes in tree
  countNodes: function() {
    let count = 0;
    const countInNode = (node) => {
      count++;
      if (node.children) {
        node.children.forEach(countInNode);
      }
    };

    Object.values(this.tabTree).forEach(countInNode);
    return count;
  },

  // Prune excess nodes (oldest first)
  pruneExcessNodes: function(excessCount) {
    const allNodes = [];

    // Collect all nodes with timestamps
    const collectNodes = (node, path = []) => {
      allNodes.push({ node, path });
      if (node.children) {
        node.children.forEach((child, index) =>
          collectNodes(child, [...path, 'children', index])
        );
      }
    };

    Object.entries(this.tabTree).forEach(([rootId, rootNode]) =>
      collectNodes(rootNode, [rootId])
    );

    // Sort by creation time (oldest first)
    allNodes.sort((a, b) => a.node.createdAt - b.node.createdAt);

    // Remove oldest nodes
    let removedCount = 0;
    for (let i = 0; i < allNodes.length && removedCount < excessCount; i++) {
      const { path } = allNodes[i];

      if (path.length === 1) {
        // Root node
        delete this.tabTree[path[0]];
      } else {
        // Child node - remove from parent's children array
        const parentPath = path.slice(0, -2);
        const childIndex = path[path.length - 1];

        let parent = this.tabTree;
        for (const segment of parentPath) {
          parent = parent[segment];
        }

        if (parent.children && parent.children[childIndex]) {
          parent.children.splice(childIndex, 1);
        }
      }

      removedCount++;
    }

    console.log(`Pruned ${removedCount} excess nodes`);
    this.saveState();
  },

  
  viewerTabs: new Map(), // Change to Map to store more info
  
  registerViewerTab(tabId, layout = 'vertical') {
    this.viewerTabs.set(tabId, { layout });
  },

  unregisterViewerTab(tabId) {
    this.viewerTabs.delete(tabId);
  },

  isViewerTab(tabId) {
    return this.viewerTabs.has(tabId);
  },

  getViewerLayout(tabId) {
    return this.viewerTabs.get(tabId)?.layout || 'vertical';
  },

  updateViewerLayout(tabId, layout) {
    if (this.viewerTabs.has(tabId)) {
      this.viewerTabs.set(tabId, { layout });
    }
  },


  // Modify getTabTree to handle viewer connection
  getTabTree() {
    return this.tabTree || {};
  },

  // Modify getTabTree response handler
  handleGetTabTree() {
    // Ensure we always return a valid object even if empty
    return {
      tabTree: this.tabTree || {}
    };
  }
};


// Update message handling in background.js
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'viewer') {
    console.log('Viewer connected'); // For debugging
    // Store the viewer port in State
    State.viewerPort = port;
    port.onMessage.addListener((msg) => {
      if (msg.action === 'layoutChanged') {
        State.updateViewerLayout(port.sender.tab.id, msg.layout);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Viewer disconnected'); // For debugging
      State.unregisterViewerTab(port.sender.tab.id);
    });
  }
});

// =============================================================================
// Tab Management
// =============================================================================
const TabManager = {
  async createNode(tab, _parentId = null) {
    const timestamp = Date.now();
    const node = {
      id: `${tab.id}-${timestamp}`,
      tabId: tab.id,
      url: sanitizeUrl(tab.url),
      title: tab.title,
      createdAt: timestamp,
      createdAtHuman: getHumanReadableTime(timestamp),
      closedAt: null,
      closedAtHuman: null,
      children: [],
      topWords: null
    };

    // Analyze content if possible
    try {
      node.topWords = await analyzePageContent(tab.id);
    } catch (error) {
      console.error('Content analysis failed:', error);
    }

    return node;
  },

  async addTab(tab, parentId = null) {
    if (!State.isTracking || isExcluded(tab.url)) return;

    const newNode = await this.createNode(tab);
    
    if (parentId) {
      // Add as child
      const parentNode = State.findNodeInTree(parentId);
      if (parentNode) {
        if (!parentNode.children) parentNode.children = [];
        if (!this.isDuplicateNode(newNode, parentNode.children)) {
          parentNode.children.push(newNode);
        }
      }
    } else {
      // Add as root
      if (!this.isDuplicateNode(newNode, Object.values(State.tabTree))) {
        State.tabTree[newNode.id] = newNode;
      }
    }

    // Update history
    if (!State.tabHistory[tab.id]) {
      State.tabHistory[tab.id] = [];
    }
    if (!this.isDuplicateNode(newNode, State.tabHistory[tab.id])) {
      State.tabHistory[tab.id].push(newNode);
    }

    State.debouncedSave();
    State.checkTreeSize();
    return newNode;
  },

  isDuplicateNode(newNode, nodes) {
    return nodes.some(existing =>
      existing.url === newNode.url &&
      Math.abs(existing.createdAt - newNode.createdAt) < TIMING.DUPLICATE_NODE_THRESHOLD
    );
  },

  updateTabTitle(tab) {
    const history = State.tabHistory[tab.id];
    if (history?.length > 0) {
      const currentNode = history[history.length - 1];
      if (currentNode.title !== tab.title) {
        State.updateNode(currentNode, { title: tab.title });
      }
    }
  },

  handleTabClose(tabId) {
    const timestamp = Date.now();
    const closeNode = (node) => {
      if (node.tabId === tabId && !node.closedAt) {
        State.updateNode(node, {
          closedAt: timestamp,
          closedAtHuman: getHumanReadableTime(timestamp)
        });
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (closeNode(child)) return true;
        }
      }
      return false;
    };

    Object.values(State.tabTree).forEach(closeNode);
    delete State.tabHistory[tabId];
  }
};

// =============================================================================
// Event Handlers
// =============================================================================
const EventHandlers = {
  async onTabCreated(tab) {
    if (!State.isTracking || State.isViewerTab(tab.id)) return;

    const openerKey = `opener_${tab.id}`;
    await chrome.storage.local.set({ [openerKey]: tab.openerTabId });

    // Add listener for when tab finishes loading
    const updateListener = async (tabId, info, updatedTab) => {
      if (tabId === tab.id && info.status === 'complete') {
        const result = await chrome.storage.local.get(openerKey);
        const openerTabId = result[openerKey];

        if (openerTabId) {
          const parentHistory = State.tabHistory[openerTabId];
          if (parentHistory?.length > 0) {
            await TabManager.addTab(updatedTab, parentHistory[parentHistory.length - 1].id);
          } else {
            await TabManager.addTab(updatedTab);
          }
          chrome.storage.local.remove(openerKey);
        } else {
          await TabManager.addTab(updatedTab);
        }

        chrome.tabs.onUpdated.removeListener(updateListener);
      }
    };

    chrome.tabs.onUpdated.addListener(updateListener);
  },

  async onTabUpdated(tabId, changeInfo, tab) {
    if (!State.isTracking || State.isViewerTab(tabId) ||
        changeInfo.status !== 'complete' || isExcluded(tab.url)) return;
    // Always update title if it has changed
    if (changeInfo.title) {
      TabManager.updateTabTitle(tab);
    }

    const history = State.tabHistory[tabId];
    if (!history?.length) {
      await TabManager.addTab(tab);
      return;
    }

    const currentNode = history[history.length - 1];
    if (currentNode.url !== tab.url) {
      // Check if we're navigating back
      const existingIndex = history.findIndex(node => node.url === tab.url);
      if (existingIndex !== -1) {
        // Mark nodes after this point as closed
        const timestamp = Date.now();
        for (let i = existingIndex + 1; i < history.length; i++) {
          State.updateNode(history[i], {
            closedAt: timestamp,
            closedAtHuman: getHumanReadableTime(timestamp)
          });
        }
        State.tabHistory[tabId] = history.slice(0, existingIndex + 1);
        TabManager.updateTabTitle(tab);
      } else {
        // New navigation
        await TabManager.addTab(tab, currentNode.id);
      }
    }
  },

  onTabRemoved(tabId) {
    if (!State.isTracking) return;
    if (State.isViewerTab(tabId)) {
      State.unregisterViewerTab(tabId);
      return;
    }
    TabManager.handleTabClose(tabId);
  }
};

// =============================================================================
// Initialization and Setup
// =============================================================================
async function initializeExtension() {
  try {
    const result = await chrome.storage.local.get([
      'config', 'tabTree', 'userTimeZone', 'isTracking'
    ]);

    // Initialize state
    State.excludedDomains = result.config?.excludedDomains || [];
    State.enableContentAnalysis = result.config?.enableContentAnalysis || false;
    State.tabTree = result.tabTree || {};
    State.userTimeZone = result.userTimeZone || 'UTC';
    State.isTracking = result.isTracking || false;

    // Setup icon and tracking check
    updateIcon(State.isTracking);
    initTrackingCheck();

    // Schedule periodic cleanup
    schedulePeriodicCleanup();

    // Perform initial cleanup if needed
    const timeSinceLastCleanup = Date.now() - (State.lastCleanup || 0);
    if (timeSinceLastCleanup > 24 * 60 * 60 * 1000) { // 24 hours
      performMaintenanceCleanup();
    }

    State.extensionInitialized = true;

    console.log('Extension initialized:', {
      isTracking: State.isTracking,
      domainsCount: State.excludedDomains.length,
      treeSize: Object.keys(State.tabTree).length
    });
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Initialize event listeners
function initializeEventListeners() {
  chrome.tabs.onCreated.addListener(EventHandlers.onTabCreated);
  chrome.tabs.onUpdated.addListener(EventHandlers.onTabUpdated);
  chrome.tabs.onRemoved.addListener(EventHandlers.onTabRemoved);
  
  // Set up message handling
  chrome.runtime.onMessage.addListener(handleMessages);
}

// Start initialization
initializeExtension().then(() => {
  initializeEventListeners();
});

// =============================================================================
// Utility Functions
// =============================================================================
function sanitizeUrl(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);

    // List of sensitive query parameters to remove
    const sensitiveParams = [
      'token', 'access_token', 'auth_token', 'api_key', 'apikey',
      'password', 'pwd', 'pass', 'secret', 'key',
      'session', 'sessionid', 'session_id', 'sid',
      'csrf', 'csrf_token', 'xsrf', 'xsrf_token',
      'oauth', 'oauth_token', 'oauth_signature',
      'jwt', 'bearer', 'authorization',
      'email', 'phone', 'ssn', 'credit_card',
      'user_id', 'userid', 'uid'
    ];

    // Remove sensitive parameters
    sensitiveParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    // Remove parameters that look like tokens (long random strings)
    for (const [key, value] of urlObj.searchParams.entries()) {
      // Remove parameters with long random-looking values (likely tokens)
      if (value.length > 20 && /^[a-zA-Z0-9+/=_-]+$/.test(value)) {
        urlObj.searchParams.delete(key);
      }
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn('Failed to sanitize URL:', url, error);
    return url;
  }
}

function isExcluded(url) {
  if (!url) return true;
  if (url.startsWith(chrome.runtime.getURL('viewer/'))) return true;
  return State.excludedDomains.some(domain => url.includes(domain));
}

function getHumanReadableTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    timeZone: State.userTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/[/,:]/g, '-');
}


// =============================================================================
// Icon and UI Management
// =============================================================================
function updateIcon(tracking) {
  const iconPath = tracking ? {
    16: 'icons/active_16.png',
    32: 'icons/active_32.png',
    48: 'icons/active_48.png',
    128: 'icons/active_128.png'
  } : {
    16: 'icons/inactive_16.png',
    32: 'icons/inactive_32.png',
    48: 'icons/inactive_48.png',
    128: 'icons/inactive_128.png'
  };
    
  chrome.action.setIcon({ path: iconPath });
}
  
function initTrackingCheck() {
  if (State.trackingCheckInterval) {
    clearInterval(State.trackingCheckInterval);
  }

  State.trackingCheckInterval = setInterval(() => {
    if (State.isTracking) {
      chrome.storage.local.get(['isTracking'], (result) => {
        if (result.isTracking !== State.isTracking) {
          console.log('Tracking state mismatch detected, reinitializing...');
          initializeExtension();
        }
      });
    }
  }, TIMING.TRACKING_CHECK_INTERVAL);
}

// Schedule periodic cleanup using chrome.alarms
function schedulePeriodicCleanup() {
  chrome.alarms.create('periodicCleanup', {
    delayInMinutes: 60, // First cleanup in 1 hour
    periodInMinutes: 24 * 60 // Then every 24 hours
  });
}

// Perform maintenance cleanup
function performMaintenanceCleanup() {
  console.log('Performing maintenance cleanup...');

  // Prune old data
  const prunedCount = State.pruneOldData();

  // Clean content analysis cache
  cleanContentAnalysisCache();

  // Clean throttle map
  const now = Date.now();
  for (const [tabId, timestamp] of contentAnalysisThrottle.entries()) {
    if (now - timestamp > 60 * 60 * 1000) { // 1 hour old
      contentAnalysisThrottle.delete(tabId);
    }
  }

  // Update last cleanup time
  State.lastCleanup = now;
  chrome.storage.local.set({ lastCleanup: now });

  console.log(`Maintenance cleanup completed. Pruned ${prunedCount} nodes.`);
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicCleanup') {
    performMaintenanceCleanup();
  }
});


// =============================================================================
// Message Handling
// =============================================================================
function handleMessages(request, _sender, sendResponse) {
  console.log('Message received:', request); // For debugging

  switch (request.action) {
    case 'getTabTree':
      sendResponse({ tabTree: State.tabTree || {} });
      return false;

    case 'registerViewer':
      State.registerViewerTab(request.tabId);
      sendResponse({ success: true });
      return false; // Synchronous response

    case 'unregisterViewer':
      State.unregisterViewerTab(request.tabId);
      sendResponse({ success: true });
      return false; // Synchronous response

    case 'toggleTracking':
      State.isTracking = !State.isTracking;
      updateIcon(State.isTracking);
      chrome.storage.local.set({ isTracking: State.isTracking });
      console.log('Tracking toggled:', State.isTracking);
      sendResponse({ isTracking: State.isTracking });
      return false;

    case 'getTrackingStatus':
      sendResponse({ isTracking: State.isTracking });
      return false; // Changed to false since we're sending synchronously
    case 'clearTabTree':
      State.clearState();
      sendResponse({ success: true });
      return false; // Synchronous response

    case 'importTabTree':
      try {
        if (!request.tabTree || typeof request.tabTree !== 'object') {
          throw new Error('Invalid tree data provided');
        }

        // Clear existing data first
        State.tabTree = {};
        State.tabHistory = {};

        // Import the new tree data
        State.tabTree = request.tabTree;

        // Rebuild tab history from tree data
        const rebuildHistory = (node) => {
          if (node.tabId) {
            if (!State.tabHistory[node.tabId]) {
              State.tabHistory[node.tabId] = [];
            }
            State.tabHistory[node.tabId].push(node);
          }
          if (node.children) {
            node.children.forEach(rebuildHistory);
          }
        };

        Object.values(State.tabTree).forEach(rebuildHistory);

        // Save the imported data
        State.saveState();

        console.log('Successfully imported tree data');
        sendResponse({ success: true });
      } catch (error) {
        console.error('Failed to import tree data:', error);
        sendResponse({ error: error.message });
      }
      return false; // Synchronous response

    case 'updateConfig':
      chrome.storage.local.set({ config: request.config })
        .then(() => {
          State.excludedDomains = request.config.excludedDomains || [];
          State.enableContentAnalysis = request.config.enableContentAnalysis || false;
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error updating config:', error);
          sendResponse({ error: error.message });
        });
      return true; // Asynchronous response

    case 'updateTimeZone':
      chrome.storage.local.set({ userTimeZone: request.timeZone })
        .then(() => {
          State.userTimeZone = request.timeZone;
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error updating timezone:', error);
          sendResponse({ error: error.message });
        });
      return true; // Asynchronous response

    default:
      sendResponse({ error: 'Unknown action' });
      return false; // Synchronous response for unknown actions
  }
}

//
// Content analysis throttling and caching
const contentAnalysisThrottle = new Map(); // tabId -> timestamp

// Add functions for word frequency analysis
async function analyzePageContent(tabId) {
  if (!State.isTracking || !State.enableContentAnalysis) return null;

  // Throttle analysis - don't analyze the same tab too frequently
  const now = Date.now();
  const lastAnalysis = contentAnalysisThrottle.get(tabId);
  if (lastAnalysis && (now - lastAnalysis) < TIMING.CONTENT_ANALYSIS_DEBOUNCE) {
    return null; // Skip analysis if too recent
  }

  // Get tab info to check if we should analyze this domain
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return null;

    // Skip analysis for excluded domains
    if (isExcluded(tab.url)) return null;

    // Skip analysis for non-http(s) URLs
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) return null;

    // Check cache first (based on URL)
    const cacheKey = sanitizeUrl(tab.url);
    if (State.contentAnalysisCache.has(cacheKey)) {
      const cached = State.contentAnalysisCache.get(cacheKey);
      // Use cached result if it's less than 1 hour old
      if (now - cached.timestamp < 60 * 60 * 1000) {
        return cached.result;
      } else {
        State.contentAnalysisCache.delete(cacheKey);
      }
    }

    // Update throttle timestamp
    contentAnalysisThrottle.set(tabId, now);

    // Inject content script to analyze the page
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: getWordFrequency,
      args: [Array.from(CONTENT_ANALYSIS.STOP_WORDS), DATA.TOP_WORDS_COUNT, CONTENT_ANALYSIS.MIN_WORD_LENGTH]
    });

    // Cache the result
    if (result && result.length > 0) {
      State.contentAnalysisCache.set(cacheKey, {
        result: result,
        timestamp: now
      });

      // Clean cache if it gets too large
      if (State.contentAnalysisCache.size > 1000) {
        cleanContentAnalysisCache();
      }
    }

    return result;
  } catch (error) {
    console.error(ERROR_MESSAGES.CONTENT_ANALYSIS_FAILED, error);
    return null;
  }
}

// Clean old entries from content analysis cache
function cleanContentAnalysisCache() {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, value] of State.contentAnalysisCache.entries()) {
    if (now - value.timestamp > maxAge) {
      State.contentAnalysisCache.delete(key);
    }
  }
}
  
  
  
// Function to be injected into the page
function getWordFrequency(stopWordsArray, topWordsCount = 5, minWordLength = 3) {
  // Convert array back to Set for performance
  const stopWords = new Set(stopWordsArray);
  
  // Get all text content from the page
  const text = document.body.innerText;
    
  // Split into words, convert to lowercase, and filter
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove punctuation and special characters
    .split(/\s+/) // Split on whitespace
    .filter(word =>
      word.length >= minWordLength && // Skip very short words
        !stopWords.has(word) && // Skip stop words
        !/^\d+$/.test(word) // Skip pure numbers
    );
  
  // Count word frequencies
  const frequencyMap = {};
  words.forEach(word => {
    frequencyMap[word] = (frequencyMap[word] || 0) + 1;
  });
  
  // Get top words by frequency
  return Object.entries(frequencyMap)
    .sort(([,a], [,b]) => b - a)
    .slice(0, topWordsCount)
    .map(([word, count]) => ({ word, count }));
}
  
  
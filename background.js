// =============================================================================
// State Management
// =============================================================================
const State = {
  tabTree: {},
  tabHistory: {},
  excludedDomains: [],
  userTimeZone: 'UTC',
  isTracking: false,
  extensionInitialized: false,
  trackingCheckInterval: null,
  viewerPort: null,

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

  // Save state to storage
  saveState: function() {
    chrome.storage.local.set({
      tabTree: this.tabTree,
      isTracking: this.isTracking
    });
  },

  // Clear all state
  clearState: function() {
    this.tabTree = {};
    this.tabHistory = {};
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
  async createNode(tab, parentId = null) {
    const timestamp = Date.now();
    const node = {
      id: `${tab.id}-${timestamp}`,
      tabId: tab.id,
      url: tab.url,
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

    State.saveState();
    return newNode;
  },

  isDuplicateNode(newNode, nodes) {
    return nodes.some(existing => 
      existing.url === newNode.url && 
      Math.abs(existing.createdAt - newNode.createdAt) < 1000
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
    State.tabTree = result.tabTree || {};
    State.userTimeZone = result.userTimeZone || 'UTC';
    State.isTracking = result.isTracking || false;

    // Setup icon and tracking check
    updateIcon(State.isTracking);
    initTrackingCheck();
    
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
    }, 60000); // Check every minute
  }


// =============================================================================
// Message Handling
// =============================================================================
function handleMessages(request, sender, sendResponse) {
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
        return false; // Synchronous response

      case 'clearTabTree':
        State.clearState();
        sendResponse({ success: true });
        return false; // Synchronous response

      case 'updateConfig':
        chrome.storage.local.set({ config: request.config })
          .then(() => {
            State.excludedDomains = request.config.excludedDomains || [];
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
// Add functions for word frequency analysis
async function analyzePageContent(tabId) {
    if (!State.isTracking) return null;  // Change from isTracking to State.isTracking
    
    // Inject content script to analyze the page
    try {
        const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: getWordFrequency,
        });
        return result;
    } catch (error) {
        console.error('Error analyzing page content:', error);
        return null;
    }
    }
  
  
  
  // Function to be injected into the page
  function getWordFrequency() {
    // Comprehensive list of English stop words
    const stopWords = new Set([
      // Articles and basic prepositions
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
      'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'to', 'from', 'up', 'down', 'of', 'off',
      
      // Pronouns and their variants
      'i', 'me', 'my', 'mine', 'myself',
      'you', 'your', 'yours', 'yourself', 'yourselves',
      'he', 'him', 'his', 'himself',
      'she', 'her', 'hers', 'herself',
      'it', 'its', 'itself',
      'we', 'us', 'our', 'ours', 'ourselves',
      'they', 'them', 'their', 'theirs', 'themselves',
      'this', 'that', 'these', 'those',
      'who', 'whom', 'whose', 'which', 'what',
      
      // Verbs and verb forms
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
      'would', 'should', 'could', 'might', 'must', 'can', 'will',
      'shall', 'may', 'ought',
      
      // Common contractions
      "i'm", "i've", "i'll", "i'd",
      "you're", "you've", "you'll", "you'd",
      "he's", "he'll", "he'd",
      "she's", "she'll", "she'd",
      "it's", "it'll", "it'd",
      "we're", "we've", "we'll", "we'd",
      "they're", "they've", "they'll", "they'd",
      "that's", "that'll", "that'd",
      "who's", "who'll", "who'd",
      "what's", "what're", "what'll", "what'd",
      "where's", "where'll", "where'd",
      "when's", "when'll", "when'd",
      "why's", "why'll", "why'd",
      "how's", "how'll", "how'd",
      "ain't", "isn't", "aren't", "wasn't", "weren't",
      "hasn't", "haven't", "hadn't",
      "doesn't", "don't", "didn't",
      "won't", "wouldn't", "shan't", "shouldn't",
      "can't", "cannot", "couldn't",
      "mustn't", "mightn't",
      
      // Common adverbs and adjectives
      'just', 'very', 'quite', 'rather', 'somewhat',
      'more', 'most', 'much', 'many', 'some', 'few', 'all', 'any', 'enough',
      'such', 'same', 'different', 'other', 'another', 'each', 'every', 'either',
      'neither', 'several', 'both', 'else',
      'here', 'there', 'where', 'when', 'why', 'how',
      'again', 'ever', 'never', 'always', 'sometimes', 'often', 'usually',
      'already', 'still', 'now', 'then', 'once', 'twice',
      'only', 'even', 'also', 'too', 'instead', 'rather',
      
      // Miscellaneous common words
      'like', 'well', 'back', 'there', 'still', 'yet', 'else', 'further',
      'since', 'while', 'whether', 'though', 'although', 'unless',
      'however', 'moreover', 'therefore', 'hence', 'furthermore',
      'otherwise', 'nevertheless', 'meanwhile', 'afterward', 'afterwards',
      'yes', 'no', 'not', 'nor', 'none', 'nothing', 'nobody',
      'anywhere', 'everywhere', 'somewhere', 'nowhere',
      'among', 'beside', 'besides', 'beyond', 'within', 'without'
    ]);
  
    // Get all text content from the page
    const text = document.body.innerText;
    
    // Split into words, convert to lowercase, and filter
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove punctuation and special characters
      .split(/\s+/) // Split on whitespace
      .filter(word => 
        word.length > 2 && // Skip very short words
        !stopWords.has(word) && // Skip stop words
        !/^\d+$/.test(word) // Skip pure numbers
      );
  
    // Count word frequencies
    const frequencyMap = {};
    words.forEach(word => {
      frequencyMap[word] = (frequencyMap[word] || 0) + 1;
    });
  
    // Get top 5 words by frequency
    return Object.entries(frequencyMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
  }
  
  
import { TreeVisualizer } from './components/tree.js';
import { ViewerControls } from './components/controls.js';
import { FileLoader } from './components/file-loader.js';
import { ZoomControls } from './components/zoom-controls.js';
import { ViewModeController } from './components/view-mode-controller.js';
import { ClusterControls } from './components/cluster-controls.js';

class TabTreeViewer {
  constructor() {
    this.treeVisualizer = null;
    this.controls = null;
    this.currentLayout = 'vertical';
    this.isViewerTab = true;
    this.port = null;
    this.tabId = null;  // Add tabId as class property

    // New: Domain clustering components
    this.viewModeController = null; // Handles both tree and cluster views
    this.clusterControls = null; // Cluster-specific controls
    this.currentViewMode = 'tree'; // 'tree' or 'cluster'

    this.init();
  }


  async getTabId() {
    return new Promise((resolve) => {
      if (window.chrome && chrome.tabs) {
        chrome.tabs.getCurrent(tab => resolve(tab?.id));
      } else {
        resolve(null);
      }
    });
  }

  // Cleanup without async
  cleanup() {
    try {
      if (this.port) {
        this.port.disconnect();
        this.port = null;
      }

      if (this.tabId && window.chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ 
          action: 'unregisterViewer',
          tabId: this.tabId
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  async init() {
    try {
      this.showLoading(true);

      // Get tab ID first
      this.tabId = await this.getTabId();
      if (!this.tabId) {
        throw new Error('Failed to get tab ID');
      }

      // Establish persistent connection
      if (window.chrome && chrome.runtime) {
        this.port = chrome.runtime.connect({ name: 'viewer' });
        this.port.onDisconnect.addListener(() => {
          console.log('Viewer disconnected');
          this.cleanup();
        });

        // Register viewer tab
        await chrome.runtime.sendMessage({ 
          action: 'registerViewer',
          tabId: this.tabId
        });
      }

      this.controls = new ViewerControls(this);
      const { tabTree } = await this.requestData();

      // Store both raw and processed data for different visualizers
      this.rawTabTree = tabTree;
      this.processedTreeData = this.processTreeData(tabTree);

      // Initialize ViewModeController for both tree and cluster views
      this.viewModeController = new ViewModeController(
        document.getElementById('tree-container'),
        {
          raw: this.rawTabTree,
          processed: this.processedTreeData
        },
        {
          defaultMode: 'tree',
          layout: this.currentLayout,
          onNodeClick: this.handleNodeClick.bind(this),
          onModeChange: (mode) => {
            this.currentViewMode = mode;
            if (this.controls) {
              this.controls.updateViewModeButton();
            }
          }
        }
      );

      // Initialize cluster controls (disable mode toggle since we have one in main controls)
      this.clusterControls = new ClusterControls(
        document.getElementById('tree-container'),
        this.viewModeController,
        {
          showModeToggle: false,
          showClusterControls: true,
          showDomainFilters: true,
          showLayoutOptions: true
        }
      );

      // Keep reference to tree visualizer for backward compatibility
      this.treeVisualizer = this.viewModeController.getCurrentVisualizer();

      this.setupMessageListener();
      this.showLoading(false);

      // Initialize file loader
      this.fileLoader = new FileLoader(this);

      // Initialize zoom controls after visualizer
      this.zoomControls = new ZoomControls(this);

      // Add cleanup event listeners
      const cleanupHandler = () => this.cleanup();
      window.addEventListener('unload', cleanupHandler);
      window.addEventListener('beforeunload', cleanupHandler);

    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize viewer');
    }
  }

  async requestData() {
    return new Promise((resolve) => {
      // Check if we're running in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ action: 'getTabTree' }, response => {
            resolve(response || { tabTree: {} });
          });
        } catch (error) {
          console.warn('Failed to get data from extension:', error);
          resolve({ tabTree: this.getFallbackData() });
        }
      } else {
        // Running standalone, provide fallback data
        console.log('Running in standalone mode, using fallback data');
        resolve({ tabTree: this.getFallbackData() });
      }
    });
  }

  getFallbackData() {
    // Provide some sample data for testing
    return {
      'tab1': {
        title: 'Sample Tab 1',
        url: 'https://example.com',
        children: [
          {
            title: 'Child Tab 1',
            url: 'https://example.com/page1',
            children: []
          }
        ]
      },
      'tab2': {
        title: 'Sample Tab 2',
        url: 'https://google.com',
        children: []
      }
    };
  }

  processTreeData(rawTree) {
    // Convert the raw tree data into D3-friendly format
    const root = {
      name: 'Root',
      children: []
    };

    // Safety check for rawTree
    if (!rawTree || typeof rawTree !== 'object') {
      console.warn('processTreeData: Invalid rawTree data:', rawTree);
      return root; // Return empty root with children array
    }

    Object.values(rawTree).forEach(node => {
      if (node) {
        root.children.push(this.processNode(node));
      }
    });

    return root;
  }

  processNode(node) {
    // Safety check for node
    if (!node) {
      return {
        name: 'Unknown',
        url: '',
        data: {},
        children: []
      };
    }

    return {
      name: node.title || node.url || 'Untitled',
      url: node.url || '',
      data: node,
      children: node.children ? node.children.map(child => this.processNode(child)) : []
    };
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'treeUpdated') {
        this.handleTreeUpdate(message.data);
      }
      sendResponse({ received: true });
      return true;
    });
  }

  async handleTreeUpdate(newTree) {
    // Update stored data
    this.rawTabTree = newTree;
    this.processedTreeData = this.processTreeData(newTree);

    if (this.viewModeController) {
      this.viewModeController.updateData({
        raw: this.rawTabTree,
        processed: this.processedTreeData
      });
    }
    // Legacy support
    if (this.treeVisualizer) {
      this.treeVisualizer.updateData(this.processedTreeData);
    }
  }

  // New method: Switch between tree and cluster views
  switchViewMode(mode) {
    if (this.viewModeController && ['tree', 'cluster'].includes(mode)) {
      this.viewModeController.switchMode(mode, true); // true = animate transition
      this.currentViewMode = mode;
    }
  }

  // New method: Get current view mode
  getCurrentViewMode() {
    return this.currentViewMode;
  }

  // New method: Toggle between tree and cluster views
  toggleViewMode() {
    const newMode = this.currentViewMode === 'tree' ? 'cluster' : 'tree';
    this.switchViewMode(newMode);
  }

  toggleLayout() {
    this.currentLayout = this.currentLayout === 'vertical' ? 'horizontal' : 'vertical';
    if (this.treeVisualizer) {
      this.treeVisualizer.setLayout(this.currentLayout);
    }
  }

  handleNodeClick(node) {
    console.log('Node clicked:', node);

    if (node.data && node.data.url) {
      const url = node.data.url;

      // Don't open viewer URLs or invalid URLs
      if (url.startsWith(chrome.runtime.getURL('viewer/'))) {
        console.log('Skipping viewer URL');
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.log('Skipping non-http URL:', url);
        return;
      }

      // Ask user for confirmation before opening URL
      const confirmMessage = `Open URL in new tab?\n\n${url}`;
      if (confirm(confirmMessage)) {
        chrome.tabs.create({ url: url, active: false });
      }
    } else {
      console.log('No URL found for node:', node);
    }
  }

  showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.display = show ? 'block' : 'none';
    }
  }

  showError(message) {
    // Basic error handling for now
    alert(message);
  }
}

// Initialize the viewer when the page loads
window.addEventListener('DOMContentLoaded', () => {
  window.viewer = new TabTreeViewer();
});
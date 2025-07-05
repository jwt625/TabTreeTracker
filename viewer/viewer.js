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
          action: "unregisterViewer",
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
          action: "registerViewer",
          tabId: this.tabId
        });
      }

      this.controls = new ViewerControls(this);
      const { tabTree } = await this.requestData();

      // Initialize new view mode controller (replaces direct TreeVisualizer)
      this.viewModeController = new ViewModeController(
        document.getElementById('tree-container'),
        this.processTreeData(tabTree),
        {
          defaultMode: this.currentViewMode,
          onModeChange: (mode) => {
            this.currentViewMode = mode;
            console.log('View mode changed to:', mode);
          },
          onNodeClick: this.handleNodeClick.bind(this)
        }
      );

      // Initialize cluster controls
      this.clusterControls = new ClusterControls(
        document.getElementById('tree-container'),
        this.viewModeController,
        {
          position: 'top-left'
        }
      );

      // Keep legacy tree visualizer reference for compatibility
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
      chrome.runtime.sendMessage({ action: "getTabTree" }, response => {
        resolve(response || { tabTree: {} });
      });
    });
  }

  processTreeData(rawTree) {
    // Convert the raw tree data into D3-friendly format
    const root = {
      name: 'Root',
      children: []
    };

    Object.values(rawTree).forEach(node => {
      root.children.push(this.processNode(node));
    });

    return root;
  }

  processNode(node) {
    return {
      name: node.title || node.url,
      url: node.url,
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
    if (this.viewModeController) {
      this.viewModeController.updateData(this.processTreeData(newTree));
    }
    // Legacy support
    if (this.treeVisualizer) {
      this.treeVisualizer.updateData(this.processTreeData(newTree));
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
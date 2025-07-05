import { TreeVisualizer } from './components/tree.js';
import { ViewerControls } from './components/controls.js';
import { FileLoader } from './components/file-loader.js';// In viewer.js, update the imports
import { ZoomControls } from './components/zoom-controls.js';

class TabTreeViewer {
  constructor() {
    this.treeVisualizer = null;
    this.controls = null;
    this.currentLayout = 'vertical';
    this.isViewerTab = true;
    this.port = null;
    this.tabId = null;  // Add tabId as class property
    this.init();
  }

  // Get tab ID - keep as separate async method
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
      
      this.treeVisualizer = new TreeVisualizer(
        document.getElementById('tree-container'),
        this.processTreeData(tabTree),
        {
          layout: this.currentLayout,
          onNodeClick: this.handleNodeClick.bind(this)
        }
      );

      this.setupMessageListener();
      this.showLoading(false);

      // Initialize file loader
      this.fileLoader = new FileLoader(this);

      // Initialize zoom controls after tree visualizer
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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'treeUpdated') {
        this.handleTreeUpdate(message.data);
      }
      sendResponse({ received: true });
      return true;
    });
  }

  async handleTreeUpdate(newTree) {
    if (this.treeVisualizer) {
      this.treeVisualizer.updateData(this.processTreeData(newTree));
    }
  }

  toggleLayout() {
    this.currentLayout = this.currentLayout === 'vertical' ? 'horizontal' : 'vertical';
    if (this.treeVisualizer) {
      this.treeVisualizer.setLayout(this.currentLayout);
    }
  }

  handleNodeClick(node) {
    console.log('Node clicked:', node);
    // We can expand this later with more functionality
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
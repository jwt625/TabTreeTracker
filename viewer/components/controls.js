export class ViewerControls {
  constructor(viewer) {
    this.viewer = viewer;
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  setupEventListeners() {
    
    document.getElementById('decreaseNodes')?.addEventListener('click', () => {
      this.viewer.treeVisualizer.updateNodeSize(-this.viewer.treeVisualizer.options.nodeSizeStep);
    });

    document.getElementById('resetNodes')?.addEventListener('click', () => {
      this.viewer.treeVisualizer.resetNodeSize();
    });

    document.getElementById('increaseNodes')?.addEventListener('click', () => {
      this.viewer.treeVisualizer.updateNodeSize(this.viewer.treeVisualizer.options.nodeSizeStep);
    });

    document.getElementById('toggleText')?.addEventListener('click', () => {
      this.viewer.treeVisualizer.toggleTextVisibility();
      const button = document.getElementById('toggleText');
      if (button) {
        button.textContent = `${this.viewer.treeVisualizer.options.showText ? 'Hide' : 'Show'} Text (T)`;
      }
    });
    // Toggle layout button
    document.getElementById('toggleLayout')?.addEventListener('click', () => {
      this.viewer.toggleLayout();
    });

    // Zoom controls
    document.getElementById('zoomIn')?.addEventListener('click', () => {
      this.handleZoom('in');
    });

    document.getElementById('zoomOut')?.addEventListener('click', () => {
      this.handleZoom('out');
    });

    document.getElementById('resetZoom')?.addEventListener('click', () => {
      this.handleZoom('reset');
    });

    // Add save/load functionality to viewer
    this.setupSaveLoadControls();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.code) {
        case 'KeyT':
          event.preventDefault();
          document.getElementById('toggleText')?.click();
          break;
        case 'KeyL':
          event.preventDefault();
          document.getElementById('toggleLayout')?.click();
          break;
        case 'Equal': // + key
          if (event.shiftKey) {
            event.preventDefault();
            this.handleZoom('in');
          }
          break;
        case 'Minus': // - key
          event.preventDefault();
          this.handleZoom('out');
          break;
        case 'Digit0':
          event.preventDefault();
          this.handleZoom('reset');
          break;
        case 'KeyS':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.saveCurrentTree();
          }
          break;
        case 'KeyO':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            this.loadTreeFile();
          }
          break;
        case 'Escape':
          // Close any open dialogs or reset view
          this.handleZoom('reset');
          break;
      }
    });
  }

  setupSaveLoadControls() {
    // Add save/load buttons to the controls if they don't exist
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv && !document.getElementById('saveTree')) {
      const saveButton = document.createElement('button');
      saveButton.id = 'saveTree';
      saveButton.textContent = 'Save (Ctrl+S)';
      saveButton.addEventListener('click', () => this.saveCurrentTree());

      const loadButton = document.createElement('button');
      loadButton.id = 'loadTree';
      loadButton.textContent = 'Load (Ctrl+O)';
      loadButton.addEventListener('click', () => this.loadTreeFile());

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      fileInput.id = 'treeFileInput';
      fileInput.addEventListener('change', (e) => this.handleFileLoad(e));

      controlsDiv.appendChild(saveButton);
      controlsDiv.appendChild(loadButton);
      controlsDiv.appendChild(fileInput);
    }
  }

  async saveCurrentTree() {
    try {
      // Get current tree data from the viewer
      const treeData = this.viewer.data;

      // Create enhanced export data
      const exportData = {
        metadata: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          exportTimestamp: Date.now(),
          exportedFrom: 'viewer',
          layout: this.viewer.currentLayout,
          extensionVersion: chrome.runtime.getManifest().version
        },
        tabTree: treeData,
        exportedBy: 'TabTreeTracker'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tab-tree-viewer-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Tree saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save tree:', error);
      this.showNotification('Failed to save tree', 'error');
    }
  }

  loadTreeFile() {
    document.getElementById('treeFileInput')?.click();
  }

  async handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let treeData;
      if (data.tabTree && data.metadata) {
        treeData = data.tabTree;
        this.showNotification(`Loaded tree from ${new Date(data.metadata.exportDate).toLocaleDateString()}`, 'success');
      } else if (typeof data === 'object') {
        treeData = data;
        this.showNotification('Loaded tree data', 'success');
      } else {
        throw new Error('Invalid file format');
      }

      // Update the viewer with new data
      this.viewer.handleTreeUpdate(treeData);

    } catch (error) {
      console.error('Failed to load tree:', error);
      this.showNotification(`Failed to load tree: ${error.message}`, 'error');
    }

    // Reset file input
    event.target.value = '';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
      background-color: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  handleZoom(action) {
    const svg = d3.select('#tree-container svg');
    const zoom = d3.zoom().on('zoom', (event) => {
      d3.select('#tree-container svg g')
        .attr('transform', event.transform);
    });

    switch (action) {
      case 'in':
        svg.transition().call(zoom.scaleBy, 1.5);
        break;
      case 'out':
        svg.transition().call(zoom.scaleBy, 0.75);
        break;
      case 'reset':
        svg.transition().call(zoom.transform, d3.zoomIdentity);
        break;
    }
  }
}
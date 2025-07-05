// State management
let currentState = {
  isTracking: false,
  tree: null
};

// UI Elements
const elements = {
  toggleButton: null,
  statusIndicator: null,
  treeContainer: null,
  saveButton: null,
  clearButton: null,
  viewerButton: null
};

// Initialize popup
// Modify the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function() {
  // First close any open viewer tabs
  await closeViewerTab();

  // Then continue with original initialization
  elements.toggleButton = document.getElementById('toggleTracking');
  elements.statusIndicator = document.getElementById('trackingStatus');
  elements.treeContainer = document.getElementById('tabTree');
  elements.saveButton = document.getElementById('saveButton');
  elements.clearButton = document.getElementById('clearButton');
  elements.viewerButton = document.getElementById('openViewer');

  setupEventListeners();
  await initializeState();
});

// Set up event listeners
function setupEventListeners() {
  // Tracking toggle
  elements.toggleButton.addEventListener('click', async () => {
    try {
      const response = await sendMessage('toggleTracking');
      if (response.error) {
        throw new Error(response.error);
      }
      updateTrackingUI(response.isTracking);
    } catch (error) {
      console.error('Failed to toggle tracking:', error);
      showError('Failed to toggle tracking');
    }
  });

  // Save button
  elements.saveButton.addEventListener('click', async () => {
    try {
      const treeData = await sendMessage('getTabTree');
      if (treeData.error) throw new Error(treeData.error);
      
      const blob = new Blob([JSON.stringify(treeData.tabTree, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tab-tree-${getTimestamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save tree:', error);
      showError('Failed to save tree');
    }
  });

  // Clear button
  elements.clearButton.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear the tree?')) return;
    
    try {
      const response = await sendMessage('clearTabTree');
      if (response.error) throw new Error(response.error);
      updateTreeDisplay({});
    } catch (error) {
      console.error('Failed to clear tree:', error);
      showError('Failed to clear tree');
    }
  });

  // Viewer button
  elements.viewerButton.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('viewer/viewer.html')
    });
  });
}

// Initialize state from background 
// In popup.js, update the initializeState function:
async function initializeState() {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Get tree data with validation
      console.log('Requesting tab tree...'); // For debugging
      const treeResponse = await sendMessage('getTabTree');
      
      console.log('Received tree response:', treeResponse); // For debugging
      
      if (!treeResponse || !treeResponse.tabTree) {
        throw new Error('Invalid or missing tree data');
      }

      updateTreeDisplay(treeResponse.tabTree);
      
      // Get tracking status
      const trackingResponse = await sendMessage('getTrackingStatus');
      if (!trackingResponse) {
        throw new Error('Invalid tracking status response');
      }
      
      updateTrackingUI(trackingResponse.isTracking);
      break;

    } catch (error) {
      console.error('Attempt', retryCount + 1, 'failed:', error);
      retryCount++;
      
      if (retryCount === maxRetries) {
        console.error('Failed to initialize popup after', maxRetries, 'attempts');
        showError(`Failed to initialize popup: ${error.message}`);
        return;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }
}

// Update UI based on tracking state
function updateTrackingUI(isTracking) {
  currentState.isTracking = isTracking;
  elements.toggleButton.textContent = isTracking ? 'Stop Tracking' : 'Start Tracking';
  elements.statusIndicator.textContent = isTracking ? 'Tracking Active' : 'Not Tracking';
  elements.statusIndicator.className = `status ${isTracking ? 'active' : 'inactive'}`;
}

// Update tree display
function updateTreeDisplay(tree) {
  elements.treeContainer.innerHTML = '';

  if (!tree || Object.keys(tree).length === 0) {
    const message = document.createElement('div');
    message.textContent = 'No tab data available';
    message.className = 'empty-state';
    elements.treeContainer.appendChild(message);
    return;
  }
  
  function createNodeElement(node) {
    const div = document.createElement('div');
    div.className = `node ${node.closedAt ? 'closed' : ''}`;

    const title = document.createElement('div');
    title.className = 'node-title';
    title.textContent = node.title || 'Untitled';
    div.appendChild(title);

    const url = document.createElement('div');
    url.className = 'node-url';
    url.textContent = node.url;
    div.appendChild(url);

    if (node.topWords?.length > 0) {
      const words = document.createElement('div');
      words.className = 'node-words';
      words.textContent = 'Top words: ' + 
        node.topWords.map(w => `${w.word}(${w.count})`).join(', ');
      div.appendChild(words);
    }

    return div;
  }

  function buildTree(nodes, container) {
    if (!nodes) {
      console.warn('No tree data available');
      return;
    }

    Object.values(nodes).forEach(node => {
      const nodeElement = createNodeElement(node);
      container.appendChild(nodeElement);

      if (node.children?.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.style.marginLeft = '20px';
        nodeElement.appendChild(childContainer);
        buildTree(node.children, childContainer);
      }
    });
  }

  buildTree(tree, elements.treeContainer);
}

// Helper function to send messages to background script
function sendMessage(action, data = {}) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ action, ...data }, response => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (response === undefined) {
          console.error('No response received for action:', action);
          reject(new Error('No response received'));
          return;
        }

        console.log('Received response for', action, ':', response); // For debugging
        resolve(response);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      reject(error);
    }
  });
}

// Helper function to get timestamp for filename
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Show error message
function showError(message) {
  // Create error notification element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-notification';
  errorDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: #f44336;
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 1000;
    max-width: 300px;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  errorDiv.textContent = message;

  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    float: right;
    margin-left: 10px;
    cursor: pointer;
    font-weight: bold;
  `;
  closeBtn.onclick = () => errorDiv.remove();
  errorDiv.appendChild(closeBtn);

  document.body.appendChild(errorDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

// Add CSS animation for error notifications
if (!document.getElementById('error-styles')) {
  const style = document.createElement('style');
  style.id = 'error-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// In popup.js, add this function after the other functions
async function closeViewerTab() {
  try {
    const tabs = await chrome.tabs.query({
      url: chrome.runtime.getURL('viewer/viewer.html')
    });
    
    if (tabs.length > 0) {
      // Close all viewer tabs
      for (const tab of tabs) {
        await chrome.tabs.remove(tab.id);
      }
    }
  } catch (error) {
    console.error('Error closing viewer tab:', error);
  }
}

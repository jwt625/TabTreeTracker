export class FileLoader {
  constructor(viewer) {
    this.viewer = viewer;
    this.setupFileLoader();
  }

  setupFileLoader() {
    // Create load button container
    const loadContainer = document.createElement('div');
    loadContainer.className = 'load-container';
    loadContainer.style.cssText = 'display: inline-block; margin-right: 10px;';

    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.id = 'jsonFileInput';

    // Create visible button
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load JSON';
    loadButton.className = 'control-button';
    loadButton.onclick = () => fileInput.click();

    // Handle file selection
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.loadJsonFile(file);
      }
    });

    // Add elements to container
    loadContainer.appendChild(fileInput);
    loadContainer.appendChild(loadButton);

    // Add container to controls
    const controls = document.getElementById('controls');
    if (controls) {
      controls.insertBefore(loadContainer, controls.firstChild);
    }
  }

  loadJsonFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        // Validate the data structure
        if (this.validateTreeData(jsonData)) {
          // Process the data into D3-friendly format
          const processedData = this.viewer.processTreeData(jsonData);
          // Update the visualization
          this.viewer.treeVisualizer.updateData(processedData);
        } else {
          throw new Error('Invalid tree data structure');
        }
      } catch (error) {
        console.error('Error loading JSON:', error);
        alert('Error loading JSON file. Please ensure it matches the expected format.');
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
    };

    reader.readAsText(file);
  }

  validateTreeData(data) {
    // Basic validation of tree data structure
    if (!data || typeof data !== 'object') return false;

    const validateNode = (node) => {
      if (!node || typeof node !== 'object') return false;
      if (!('title' in node || 'url' in node)) return false;
      
      if (node.children) {
        if (!Array.isArray(node.children)) return false;
        return node.children.every(child => validateNode(child));
      }
      
      return true;
    };

    // If it's the format from the save function (with tabTree property)
    if ('tabTree' in data) {
      return Object.values(data.tabTree).every(node => validateNode(node));
    }
    
    // If it's a direct tree structure
    return Object.values(data).every(node => validateNode(node));
  }
}
// =============================================================================
// Cluster Controls - Enhanced UI Controls for Domain Clustering
// =============================================================================

export class ClusterControls {
  constructor(container, viewModeController, options = {}) {
    this.container = container;
    this.viewModeController = viewModeController;
    this.options = {
      showModeToggle: true,
      showClusterControls: true,
      showDomainFilters: true,
      showLayoutOptions: true,
      position: 'top-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
      ...options
    };

    this.controlsContainer = null;
    this.isInitialized = false;

    this.init();
  }

  init() {
    this.createControlsContainer();
    this.createControls();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  createControlsContainer() {
    // Remove existing controls if any
    const existing = this.container.querySelector('.cluster-controls');
    if (existing) {
      existing.remove();
    }

    // Create controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'cluster-controls';
    this.controlsContainer.style.cssText = `
      position: absolute;
      ${this.getPositionStyles()}
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 16px;
      z-index: 100;
      font-family: Arial, sans-serif;
      font-size: 14px;
      min-width: 250px;
      max-width: 350px;
    `;

    this.container.appendChild(this.controlsContainer);
  }

  getPositionStyles() {
    switch (this.options.position) {
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-right':
        return 'bottom: 20px; right: 20px;';
      default:
        return 'top: 20px; left: 20px;';
    }
  }

  createControls() {
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Visualization Controls';
    title.style.cssText = 'margin: 0 0 16px 0; font-size: 16px; color: #333;';
    this.controlsContainer.appendChild(title);

    // Mode toggle
    if (this.options.showModeToggle) {
      this.createModeToggle();
    }

    // Cluster-specific controls
    if (this.options.showClusterControls) {
      this.createClusterControls();
    }

    // Domain filters
    if (this.options.showDomainFilters) {
      this.createDomainFilters();
    }

    // Layout options
    if (this.options.showLayoutOptions) {
      this.createLayoutOptions();
    }
  }

  createModeToggle() {
    const section = this.createSection('Visualization Mode');
    
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px;';

    // Tree mode button
    const treeBtn = this.createButton('Tree View', 'tree-mode-btn');
    treeBtn.addEventListener('click', () => this.switchMode('tree'));

    // Cluster mode button
    const clusterBtn = this.createButton('Cluster View', 'cluster-mode-btn');
    clusterBtn.addEventListener('click', () => this.switchMode('cluster'));

    toggleContainer.appendChild(treeBtn);
    toggleContainer.appendChild(clusterBtn);
    section.appendChild(toggleContainer);

    // Update active button
    this.updateModeButtons();
  }

  createClusterControls() {
    const section = this.createSection('Cluster Settings');

    // Cluster strength slider
    const strengthControl = this.createSliderControl(
      'Cluster Strength',
      'cluster-strength',
      0, 1, 0.1, 0.1
    );
    strengthControl.addEventListener('input', (e) => {
      this.updateClusterStrength(parseFloat(e.target.value));
    });
    section.appendChild(strengthControl);

    // Show boundaries toggle
    const boundariesToggle = this.createCheckboxControl(
      'Show Domain Boundaries',
      'show-boundaries',
      true
    );
    boundariesToggle.addEventListener('change', (e) => {
      this.toggleDomainBoundaries(e.target.checked);
    });
    section.appendChild(boundariesToggle);

    // Show labels toggle
    const labelsToggle = this.createCheckboxControl(
      'Show Domain Labels',
      'show-labels',
      true
    );
    labelsToggle.addEventListener('change', (e) => {
      this.toggleDomainLabels(e.target.checked);
    });
    section.appendChild(labelsToggle);
  }

  createDomainFilters() {
    const section = this.createSection('Domain Filters');

    // Get available domains
    const visualizer = this.viewModeController.getCurrentVisualizer();
    if (visualizer && visualizer.domainGroups) {
      const domains = Array.from(visualizer.domainGroups.keys()).sort();
      
      const filterContainer = document.createElement('div');
      filterContainer.style.cssText = 'max-height: 150px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px;';

      domains.forEach(domain => {
        const domainFilter = this.createCheckboxControl(
          domain,
          `domain-${domain}`,
          true
        );
        domainFilter.style.marginBottom = '4px';
        domainFilter.addEventListener('change', (e) => {
          this.toggleDomainVisibility(domain, e.target.checked);
        });
        filterContainer.appendChild(domainFilter);
      });

      section.appendChild(filterContainer);
    }
  }

  createLayoutOptions() {
    const section = this.createSection('Layout Options');

    // Layout algorithm selector
    const layoutSelect = this.createSelectControl(
      'Layout Algorithm',
      'layout-algorithm',
      [
        { value: 'force', label: 'Force-Directed' },
        { value: 'circular', label: 'Circular' },
        { value: 'hierarchical', label: 'Hierarchical' }
      ],
      'force'
    );
    layoutSelect.addEventListener('change', (e) => {
      this.changeLayoutAlgorithm(e.target.value);
    });
    section.appendChild(layoutSelect);

    // Animation speed slider
    const speedControl = this.createSliderControl(
      'Animation Speed',
      'animation-speed',
      0.1, 2, 0.1, 1
    );
    speedControl.addEventListener('input', (e) => {
      this.updateAnimationSpeed(parseFloat(e.target.value));
    });
    section.appendChild(speedControl);
  }

  createSection(title) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = title;
    sectionTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px; color: #555; font-weight: bold;';
    section.appendChild(sectionTitle);

    this.controlsContainer.appendChild(section);
    return section;
  }

  createButton(text, id) {
    const button = document.createElement('button');
    button.textContent = text;
    button.id = id;
    button.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      flex: 1;
      transition: all 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#f5f5f5';
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.background = 'white';
      }
    });

    return button;
  }

  createSliderControl(label, id, min, max, step, value) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 12px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #666;';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.style.cssText = 'width: 100%; margin-bottom: 4px;';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value;
    valueDisplay.style.cssText = 'font-size: 11px; color: #888;';

    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
    });

    container.appendChild(labelEl);
    container.appendChild(slider);
    container.appendChild(valueDisplay);

    return container;
  }

  createCheckboxControl(label, id, checked) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;
    checkbox.style.cssText = 'margin-right: 8px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = id;
    labelEl.style.cssText = 'font-size: 12px; color: #666; cursor: pointer;';

    container.appendChild(checkbox);
    container.appendChild(labelEl);

    return container;
  }

  createSelectControl(label, id, options, value) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 12px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #666;';

    const select = document.createElement('select');
    select.id = id;
    select.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px;';

    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      if (option.value === value) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    container.appendChild(labelEl);
    container.appendChild(select);

    return container;
  }

  setupEventListeners() {
    // Listen for mode changes
    this.viewModeController.onModeChange = (mode) => {
      this.updateModeButtons();
      this.updateControlsVisibility(mode);
    };
  }

  // Control actions
  switchMode(mode) {
    this.viewModeController.switchMode(mode);
  }

  updateClusterStrength(strength) {
    const visualizer = this.viewModeController.getCurrentVisualizer();
    if (visualizer && visualizer.updateClusterStrength) {
      visualizer.updateClusterStrength(strength);
    }
  }

  toggleDomainBoundaries(show) {
    const visualizer = this.viewModeController.getCurrentVisualizer();
    if (visualizer && visualizer.toggleDomainBoundaries) {
      visualizer.toggleDomainBoundaries(show);
    }
  }

  toggleDomainLabels(show) {
    const visualizer = this.viewModeController.getCurrentVisualizer();
    if (visualizer && visualizer.boundaryManager) {
      visualizer.boundaryManager.toggleLabels(show);
    }
  }

  toggleDomainVisibility(domain, visible) {
    // Implementation would depend on filtering system
    console.log(`Toggle domain ${domain}: ${visible}`);
  }

  changeLayoutAlgorithm(algorithm) {
    // Implementation would depend on layout system
    console.log(`Change layout to: ${algorithm}`);
  }

  updateAnimationSpeed(speed) {
    // Implementation would depend on animation system
    console.log(`Update animation speed: ${speed}`);
  }

  updateModeButtons() {
    const currentMode = this.viewModeController.getCurrentMode();
    
    const treeBtn = this.controlsContainer.querySelector('#tree-mode-btn');
    const clusterBtn = this.controlsContainer.querySelector('#cluster-mode-btn');

    if (treeBtn && clusterBtn) {
      treeBtn.classList.toggle('active', currentMode === 'tree');
      clusterBtn.classList.toggle('active', currentMode === 'cluster');

      treeBtn.style.background = currentMode === 'tree' ? '#007bff' : 'white';
      treeBtn.style.color = currentMode === 'tree' ? 'white' : '#333';
      
      clusterBtn.style.background = currentMode === 'cluster' ? '#007bff' : 'white';
      clusterBtn.style.color = currentMode === 'cluster' ? 'white' : '#333';
    }
  }

  updateControlsVisibility(mode) {
    // Show/hide controls based on current mode
    const clusterControls = this.controlsContainer.querySelectorAll('.cluster-specific');
    clusterControls.forEach(control => {
      control.style.display = mode === 'cluster' ? 'block' : 'none';
    });
  }

  destroy() {
    if (this.controlsContainer) {
      this.controlsContainer.remove();
    }
  }
}

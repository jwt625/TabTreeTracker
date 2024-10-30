export class ZoomControls {
  constructor(viewer) {
    this.viewer = viewer;
    this.zoomSpeed = 0.02;
    this.zoomIntervals = new Map();
    // Track separate scales for x and y
    this.scales = {
      x: 1,
      y: 1
    };
    this.setupZoomControls();
  }

  setupZoomControls() {
    const zoomContainer = document.createElement('div');
    zoomContainer.className = 'zoom-controls';
    zoomContainer.style.cssText = 'display: inline-flex; align-items: center; margin-right: 10px; gap: 8px;';

    // Create axis-specific zoom controls
    const axes = [
      { label: 'X', axis: 'x' },
      { label: 'Y', axis: 'y' }
    ];

    axes.forEach(({ label, axis }) => {
      const axisContainer = document.createElement('div');
      axisContainer.className = 'axis-zoom-controls';
      axisContainer.style.cssText = 'display: flex; align-items: center; gap: 4px;';

      const axisLabel = document.createElement('span');
      axisLabel.textContent = label;
      axisLabel.style.cssText = 'margin: 0 4px; font-weight: bold;';

      const zoomInBtn = this.createZoomButton(`${label}+`, () => this.startAxisZoom(axis, 1));
      const zoomOutBtn = this.createZoomButton(`${label}-`, () => this.startAxisZoom(axis, -1));

      axisContainer.appendChild(zoomOutBtn);
      axisContainer.appendChild(axisLabel);
      axisContainer.appendChild(zoomInBtn);
      
      zoomContainer.appendChild(axisContainer);
    });

    // Reset button
    const resetBtn = this.createZoomButton('Reset', () => this.resetZoom());
    resetBtn.style.marginLeft = '8px';
    zoomContainer.appendChild(resetBtn);

    // Add to controls
    const controls = document.getElementById('controls');
    if (controls) {
      const fileLoader = controls.querySelector('.load-container');
      if (fileLoader) {
        fileLoader.after(zoomContainer);
      } else {
        controls.insertBefore(zoomContainer, controls.firstChild);
      }
    }

    document.addEventListener('mouseup', () => this.stopAllZoom());
    document.addEventListener('mouseleave', () => this.stopAllZoom());
  }

  createZoomButton(text, onPress) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'control-button zoom-button';
    button.style.cssText = `
      min-width: 32px;
      height: 32px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    `;

    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onPress();
    });
    button.addEventListener('mouseup', () => this.stopAllZoom());
    button.addEventListener('mouseleave', () => this.stopAllZoom());

    return button;
  }

  startAxisZoom(axis, direction) {
    this.stopAllZoom();
    
    const intervalId = setInterval(() => {
      const scale = Math.exp(this.zoomSpeed * direction);
      this.scales[axis] *= scale;
      
      // Constrain scales to reasonable limits
      this.scales[axis] = Math.max(0.1, Math.min(10, this.scales[axis]));
      
      this.applyAxisZoom();
    }, 16);

    this.zoomIntervals.set(axis, intervalId);
  }

  applyAxisZoom() {
    if (!this.viewer.treeVisualizer) return;

    const treeVis = this.viewer.treeVisualizer;
    const container = document.getElementById('tree-container');
    const baseWidth = container.clientWidth;
    const baseHeight = container.clientHeight;

    // Update tree layout size based on current scales
    const isVertical = treeVis.options.layout === 'vertical';
    const newSize = isVertical ? 
      [baseWidth * this.scales.x, baseHeight * this.scales.y] : 
      [baseHeight * this.scales.y, baseWidth * this.scales.x];

    // Update the layout with new dimensions
    treeVis.treeLayout.size(newSize);

    // Re-render the tree with scaled dimensions but maintain node sizes
    treeVis.render(true);
  }

  stopAllZoom() {
    this.zoomIntervals.forEach(intervalId => clearInterval(intervalId));
    this.zoomIntervals.clear();
  }

  resetZoom() {
    this.scales.x = 1;
    this.scales.y = 1;
    this.applyAxisZoom();
  }
}
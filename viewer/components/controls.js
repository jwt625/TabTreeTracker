export class ViewerControls {
  constructor(viewer) {
    this.viewer = viewer;
    this.setupEventListeners();
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
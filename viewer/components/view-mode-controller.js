// =============================================================================
// View Mode Controller - Switch between Tree and Cluster Visualizations
// =============================================================================

import { TreeVisualizer } from './tree.js';
import { ClusterVisualizer } from './cluster-visualizer.js';

export class ViewModeController {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      defaultMode: 'tree', // 'tree' or 'cluster'
      transitionDuration: 1000,
      preserveZoom: true,
      preserveSelection: true,
      ...options
    };

    // Visualizers
    this.treeVisualizer = null;
    this.clusterVisualizer = null;
    this.currentMode = null;
    this.currentVisualizer = null;

    // State preservation
    this.savedState = {
      zoom: null,
      selectedNodes: new Set(),
      highlightedDomain: null
    };

    // Event callbacks
    this.onModeChange = options.onModeChange || (() => {});
    this.onTransitionStart = options.onTransitionStart || (() => {});
    this.onTransitionEnd = options.onTransitionEnd || (() => {});

    this.init();
  }

  init() {
    // Initialize with default mode
    this.switchMode(this.options.defaultMode, false); // No animation on init
  }

  /**
   * Switch between visualization modes
   * @param {string} mode - 'tree' or 'cluster'
   * @param {boolean} animate - Whether to animate the transition
   */
  switchMode(mode, animate = true) {
    if (mode === this.currentMode) return;

    const previousMode = this.currentMode;
    
    if (animate && previousMode) {
      this.onTransitionStart(previousMode, mode);
      this.animatedTransition(previousMode, mode);
    } else {
      this.immediateTransition(mode);
    }
  }

  /**
   * Perform immediate transition without animation
   * @param {string} mode - Target mode
   */
  immediateTransition(mode) {
    // Destroy current visualizer
    if (this.currentVisualizer) {
      this.saveCurrentState();
      this.currentVisualizer.destroy();
    }

    // Create new visualizer
    this.createVisualizer(mode);
    this.currentMode = mode;
    
    // Restore state if applicable
    this.restoreState();

    this.onModeChange(mode);
  }

  /**
   * Perform animated transition between modes
   * @param {string} fromMode - Source mode
   * @param {string} toMode - Target mode
   */
  animatedTransition(fromMode, toMode) {
    // Save current state
    this.saveCurrentState();

    // Create transition overlay
    const overlay = this.createTransitionOverlay();
    
    // Fade out current visualizer
    this.fadeOut(this.currentVisualizer, this.options.transitionDuration / 2)
      .then(() => {
        // Destroy old visualizer
        this.currentVisualizer.destroy();
        
        // Create new visualizer
        this.createVisualizer(toMode);
        this.currentMode = toMode;
        
        // Fade in new visualizer
        return this.fadeIn(this.currentVisualizer, this.options.transitionDuration / 2);
      })
      .then(() => {
        // Remove overlay
        overlay.remove();
        
        // Restore state
        this.restoreState();
        
        this.onTransitionEnd(fromMode, toMode);
        this.onModeChange(toMode);
      });
  }

  /**
   * Create visualizer for specified mode
   * @param {string} mode - Mode to create visualizer for
   */
  createVisualizer(mode) {
    const visualizerOptions = {
      ...this.options,
      onNodeClick: this.handleNodeClick.bind(this),
      onNodeHover: this.handleNodeHover.bind(this)
    };

    if (mode === 'tree') {
      this.treeVisualizer = new TreeVisualizer(
        this.container, 
        this.data, 
        visualizerOptions
      );
      this.currentVisualizer = this.treeVisualizer;
    } else if (mode === 'cluster') {
      this.clusterVisualizer = new ClusterVisualizer(
        this.container, 
        this.data, 
        visualizerOptions
      );
      this.currentVisualizer = this.clusterVisualizer;
    } else {
      throw new Error(`Unknown visualization mode: ${mode}`);
    }
  }

  /**
   * Save current state for restoration
   */
  saveCurrentState() {
    if (!this.currentVisualizer) return;

    // Save zoom state
    if (this.options.preserveZoom && this.currentVisualizer.currentZoom) {
      this.savedState.zoom = { ...this.currentVisualizer.currentZoom };
    }

    // Save selected nodes (if applicable)
    if (this.options.preserveSelection) {
      // This would depend on selection implementation in visualizers
      this.savedState.selectedNodes = new Set();
    }
  }

  /**
   * Restore saved state to current visualizer
   */
  restoreState() {
    if (!this.currentVisualizer) return;

    // Restore zoom state
    if (this.options.preserveZoom && this.savedState.zoom && this.currentVisualizer.svg) {
      setTimeout(() => {
        const zoom = d3.zoom();
        this.currentVisualizer.svg.call(
          zoom.transform,
          d3.zoomIdentity
            .translate(this.savedState.zoom.x || 0, this.savedState.zoom.y || 0)
            .scale(this.savedState.zoom.k || 1)
        );
      }, 100);
    }

    // Restore selections (if applicable)
    if (this.options.preserveSelection && this.savedState.selectedNodes.size > 0) {
      // Implementation would depend on selection system
    }
  }

  /**
   * Create transition overlay for smooth transitions
   */
  createTransitionOverlay() {
    const overlay = d3.select(this.container)
      .append('div')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('width', '100%')
      .style('height', '100%')
      .style('background', 'rgba(255, 255, 255, 0.8)')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('z-index', '1000')
      .style('opacity', '0');

    overlay.append('div')
      .style('padding', '20px')
      .style('background', 'white')
      .style('border-radius', '8px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.1)')
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '14px')
      .style('color', '#666')
      .text('Switching visualization mode...');

    // Fade in overlay
    overlay.transition()
      .duration(200)
      .style('opacity', '1');

    return overlay;
  }

  /**
   * Fade out visualizer
   * @param {Object} visualizer - Visualizer to fade out
   * @param {number} duration - Fade duration
   */
  fadeOut(visualizer, duration) {
    return new Promise(resolve => {
      if (visualizer && visualizer.svg) {
        visualizer.svg
          .transition()
          .duration(duration)
          .style('opacity', '0')
          .on('end', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Fade in visualizer
   * @param {Object} visualizer - Visualizer to fade in
   * @param {number} duration - Fade duration
   */
  fadeIn(visualizer, duration) {
    return new Promise(resolve => {
      if (visualizer && visualizer.svg) {
        visualizer.svg
          .style('opacity', '0')
          .transition()
          .duration(duration)
          .style('opacity', '1')
          .on('end', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle node click events
   * @param {Object} node - Clicked node
   * @param {Event} event - Click event
   */
  handleNodeClick(node, event) {
    // Delegate to current visualizer or handle globally
    console.log('Node clicked:', node.title);
    
    // Open URL if available
    if (node.url) {
      window.open(node.url, '_blank');
    }
  }

  /**
   * Handle node hover events
   * @param {Object} node - Hovered node
   * @param {Event} event - Hover event
   */
  handleNodeHover(node, event) {
    // Delegate to current visualizer or handle globally
    console.log('Node hovered:', node.title);
  }

  /**
   * Update data in current visualizer
   * @param {Object} newData - New data to display
   */
  updateData(newData) {
    this.data = newData;
    if (this.currentVisualizer && this.currentVisualizer.updateData) {
      this.currentVisualizer.updateData(newData);
    }
  }

  /**
   * Get current visualization mode
   * @returns {string} - Current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Get current visualizer instance
   * @returns {Object} - Current visualizer
   */
  getCurrentVisualizer() {
    return this.currentVisualizer;
  }

  /**
   * Check if mode is available
   * @param {string} mode - Mode to check
   * @returns {boolean} - Whether mode is available
   */
  isModeAvailable(mode) {
    return ['tree', 'cluster'].includes(mode);
  }

  /**
   * Get available modes
   * @returns {Array} - Array of available modes
   */
  getAvailableModes() {
    return ['tree', 'cluster'];
  }

  /**
   * Update controller options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    Object.assign(this.options, newOptions);
    
    // Update current visualizer options if applicable
    if (this.currentVisualizer && this.currentVisualizer.updateOptions) {
      this.currentVisualizer.updateOptions(newOptions);
    }
  }

  /**
   * Destroy controller and cleanup
   */
  destroy() {
    if (this.currentVisualizer) {
      this.currentVisualizer.destroy();
    }
    
    if (this.treeVisualizer) {
      this.treeVisualizer.destroy();
    }
    
    if (this.clusterVisualizer) {
      this.clusterVisualizer.destroy();
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

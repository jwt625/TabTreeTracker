// =============================================================================
// Cluster Visualizer - Force-Directed Layout for Domain Clustering
// =============================================================================

import { groupNodesByDomain } from '../../src/domain-utils.js';
import { buildDomainConnections } from '../../src/connection-mapper.js';
import { createEnhancedNodeCollection } from '../../src/enhanced-node.js';
import { ClusterBoundaryManager } from './cluster-boundaries.js';

export class ClusterVisualizer {
  constructor(container, data, options = {}) {
    this.container = container;
    this.originalData = data;
    this.options = {
      width: container.clientWidth,
      height: container.clientHeight,
      clusterStrength: 0.1,
      linkStrength: 0.3,
      chargeStrength: -300,
      collisionRadius: 30,
      centerStrength: 0.1,
      enableClustering: true,
      showDomainBoundaries: true,
      animationDuration: 750,
      ...options
    };

    // Data structures
    this.domainGroups = null;
    this.connections = null;
    this.enhancedNodes = null;
    this.simulation = null;
    this.nodes = [];
    this.links = [];

    // SVG elements
    this.svg = null;
    this.mainGroup = null;
    this.linksGroup = null;
    this.clustersGroup = null;
    this.nodesGroup = null;

    // Boundary manager
    this.boundaryManager = null;

    // State
    this.isInitialized = false;
    this.currentZoom = d3.zoomIdentity;

    // Add property for details panel (like tree view)
    this.detailsPanel = null;

    this.init();
  }

  init() {
    this.processData();
    this.setupSVG();
    this.initDetailsPanel(); // Create details panel after SVG setup
    this.setupSimulation();
    this.render();
    this.isInitialized = true;
  }

  processData() {
    console.log('Processing data for cluster visualization...');
    
    // Create domain groups
    this.domainGroups = groupNodesByDomain(this.originalData);
    console.log(`Found ${this.domainGroups.size} domain groups`);

    // Build connections
    this.connections = buildDomainConnections(this.domainGroups);
    console.log(`Found ${this.connections.length} domain connections`);

    // Create enhanced nodes
    this.enhancedNodes = createEnhancedNodeCollection(this.originalData);
    console.log(`Created ${this.enhancedNodes.size} enhanced nodes`);

    // Prepare nodes and links for D3 simulation
    this.prepareSimulationData();
  }

  prepareSimulationData() {
    // Convert enhanced nodes to array for simulation
    this.nodes = Array.from(this.enhancedNodes.values()).map(node => ({
      ...node,
      // Initialize positions randomly within bounds
      x: Math.random() * this.options.width,
      y: Math.random() * this.options.height,
      // Add simulation properties
      fx: null, // Fixed x position (null = not fixed)
      fy: null, // Fixed y position (null = not fixed)
      vx: 0,    // Velocity x
      vy: 0     // Velocity y
    }));

    // Create links from connections
    this.links = [];
    
    // Add inter-domain connections
    this.connections.forEach(connection => {
      connection.connections.forEach(conn => {
        this.links.push({
          source: conn.parentId,
          target: conn.childId,
          strength: connection.strength,
          type: 'inter-domain',
          sourceDomain: connection.source,
          targetDomain: connection.target
        });
      });
    });

    // Add intra-domain connections (parent-child relationships within same domain)
    this.domainGroups.forEach(group => {
      group.nodes.forEach(node => {
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(child => {
            if (child.domain === node.domain) {
              this.links.push({
                source: node.id,
                target: child.id,
                strength: 1.0,
                type: 'intra-domain',
                sourceDomain: node.domain,
                targetDomain: child.domain
              });
            }
          });
        }
      });
    });

    console.log(`Prepared ${this.nodes.length} nodes and ${this.links.length} links for simulation`);
  }

  setupSVG() {
    // Clear container but preserve cluster controls
    const clusterControls = this.container.querySelector('.cluster-controls');
    this.container.innerHTML = '';
    // Restore cluster controls
    if (clusterControls) {
      this.container.appendChild(clusterControls);
    }

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`);

    // Create main group for zooming
    this.mainGroup = this.svg.append('g')
      .attr('class', 'main-group');

    // Create groups for different elements (order matters for z-index)
    this.clustersGroup = this.mainGroup.append('g').attr('class', 'clusters');
    this.linksGroup = this.mainGroup.append('g').attr('class', 'links');
    this.nodesGroup = this.mainGroup.append('g').attr('class', 'nodes');

    // Setup zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        this.currentZoom = event.transform;
        this.mainGroup.attr('transform', event.transform);
        this.updateElementSizes(event.transform.k);
      });

    this.svg.call(zoom);

    // Initialize boundary manager
    this.boundaryManager = new ClusterBoundaryManager(this.clustersGroup, {
      padding: 25,
      smoothing: true,
      showLabels: true
    });
  }

  initDetailsPanel() {
    // Create details panel (same as tree view)
    this.detailsPanel = d3.select(this.container)
      .append('div')
      .attr('class', 'node-details')
      .style('display', 'none');
  }

  // Reuse tree view's text wrapping logic
  wrapText(text, maxLength = 30, maxLines = 2) {
    if (!text) return '';

    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      // Handle very long words
      if (word.length > maxLength) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        if (lines.length < maxLines) {
          lines.push(word.slice(0, maxLength - 3) + '...');
        }
        continue;
      }

      // Normal word processing
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine.length === 0 ? '' : ' ') + word;
      } else {
        if (lines.length < maxLines) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines[maxLines - 1] = lines[maxLines - 1].slice(0, -3) + '...';
          break;
        }
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  // Reuse tree view's updateDetailsPanel logic
  updateDetailsPanel(d, event) {
    console.log('updateDetailsPanel called with:', d ? d.title : 'null');

    if (!d) {
      this.detailsPanel.style('display', 'none');
      return;
    }

    // Wrap text for display
    const wrappedTitle = this.wrapText(d.title || 'Untitled', 30, 2);
    const wrappedUrl = this.wrapText(d.url || 'No URL', 40, 2);

    // Format dates - cluster nodes have different data structure than tree nodes
    const createdAt = d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Unknown';
    const closedAt = d.closedAt ? new Date(d.closedAt).toLocaleString() : 'Still open';

    // Update content (same structure as tree view)
    this.detailsPanel.html(`
      <h4 class="wrapped-text">${wrappedTitle}</h4>

      <div class="node-details-section">
        <strong>URL:</strong><br>
        <span class="wrapped-text url-text">${wrappedUrl}</span>
      </div>

      <div class="node-details-section">
        <strong>Domain:</strong> ${d.domain || 'Unknown'}<br>
        <strong>Created:</strong> ${createdAt}<br>
        <strong>Closed:</strong> ${closedAt}
      </div>

      ${d.topWords ? `
        <div class="node-details-section">
          <strong>Top Words:</strong>
          <div class="word-stats">
            ${d.topWords.map(w => `
              <div>${w.word}</div>
              <div class="word-count">${w.count}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `);

    // Position the panel near the cursor (same logic as tree view)
    const [x, y] = d3.pointer(event, this.container);
    const panelBox = this.detailsPanel.node().getBoundingClientRect();
    const containerBox = this.container.getBoundingClientRect();

    let left = x + 10; // 10px offset from cursor
    let top = y + 10;

    // Adjust if panel would overflow container
    if (left + panelBox.width > containerBox.width) {
      left = x - panelBox.width - 10;
    }
    if (top + panelBox.height > containerBox.height) {
      top = y - panelBox.height - 10;
    }

    this.detailsPanel
      .style('left', `${left}px`)
      .style('top', `${top}px`)
      .style('display', 'block');
  }

  setupSimulation() {
    // Create force simulation
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links)
        .id(d => d.id)
        .strength(d => d.strength * this.options.linkStrength)
        .distance(50))
      .force('charge', d3.forceManyBody()
        .strength(this.options.chargeStrength))
      .force('center', d3.forceCenter(
        this.options.width / 2, 
        this.options.height / 2)
        .strength(this.options.centerStrength))
      .force('collision', d3.forceCollide()
        .radius(this.options.collisionRadius))
      .force('cluster', this.clusterForce())
      .on('tick', () => this.onTick())
      .on('end', () => this.onSimulationEnd());

    // Start simulation
    this.simulation.alpha(1).restart();
  }

  clusterForce() {
    if (!this.options.enableClustering) return null;

    const strength = this.options.clusterStrength;
    
    return (alpha) => {
      // Calculate cluster centers
      const clusterCenters = new Map();
      
      this.domainGroups.forEach((group, domain) => {
        const domainNodes = this.nodes.filter(n => n.domain === domain);
        if (domainNodes.length === 0) return;

        // Calculate centroid
        const centroid = {
          x: d3.mean(domainNodes, d => d.x),
          y: d3.mean(domainNodes, d => d.y)
        };
        
        clusterCenters.set(domain, centroid);
      });

      // Apply clustering force
      this.nodes.forEach(node => {
        const center = clusterCenters.get(node.domain);
        if (!center) return;

        const dx = center.x - node.x;
        const dy = center.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const force = strength * alpha;
          node.vx += dx * force;
          node.vy += dy * force;
        }
      });
    };
  }

  onTick() {
    // Update link positions
    this.linksGroup.selectAll('.link')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    // Update node positions
    this.nodesGroup.selectAll('.node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Update cluster boundaries if enabled
    if (this.options.showDomainBoundaries) {
      this.updateClusterBoundaries();
    }
  }

  onSimulationEnd() {
    console.log('Force simulation completed');
    // Optionally trigger any post-simulation updates
  }

  render() {
    this.renderLinks();
    this.renderNodes();
    if (this.options.showDomainBoundaries) {
      this.renderClusterBoundaries();
    }
  }

  renderLinks() {
    const links = this.linksGroup
      .selectAll('.link')
      .data(this.links);

    links.exit().remove();

    const linksEnter = links.enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.type === 'inter-domain' ? '#999' : '#ccc')
      .attr('stroke-width', d => d.type === 'inter-domain' ? 2 : 1)
      .attr('stroke-opacity', 0.6);

    links.merge(linksEnter);
  }

  renderNodes() {
    console.log('CLUSTER renderNodes called, nodes count:', this.nodes.length);
    console.log('CLUSTER first few nodes:', this.nodes.slice(0, 3));
    const nodes = this.nodesGroup
      .selectAll('.node')
      .data(this.nodes);

    nodes.exit().remove();

    const nodesEnter = nodes.enter()
      .append('g')
      .attr('class', 'node');

    console.log('CLUSTER nodesEnter count:', nodesEnter.size());

    // Log the actual DOM elements created
    nodesEnter.each(function(d, i) {
      console.log('CLUSTER node', i, 'data:', d.title, 'element:', this);
    });

    // Add circles with events attached directly (like tree.js)
    nodesEnter.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.domainColor)
      .attr('stroke', d => d.url ? '#1a73e8' : '#fff') // Blue stroke for clickable nodes
      .attr('stroke-width', 2)
      .style('cursor', d => d.url ? 'pointer' : 'default') // Pointer cursor for clickable nodes
      .on('mouseover', (event, d) => {
        console.log('CLUSTER mouseover event fired for:', d.title);
        // Highlight domain
        if (this.boundaryManager) {
          this.boundaryManager.highlightDomain(d.domain);
        }
        // Enlarge node
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', 12);
        // Show tooltip
        this.showNodeTooltip(event, d);
      })
      .on('mousemove', (event, d) => {
        // Update tooltip position as mouse moves
        this.showNodeTooltip(event, d);
      })
      .on('mouseout', (event, d) => {
        console.log('CLUSTER mouseout event fired for:', d.title);
        // Clear domain highlight
        if (this.boundaryManager) {
          this.boundaryManager.clearHighlights();
        }
        // Reset node size
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', 8);
        // Hide tooltip
        this.hideNodeTooltip();
      })
      .on('click', (event, d) => {
        console.log('CLUSTER click event fired for:', d.title, 'URL:', d.url);
        event.stopPropagation();
        if (d.url) {
          console.log('CLUSTER opening URL:', d.url);
          window.open(d.url, '_blank');
        } else {
          console.log('CLUSTER no URL to open');
        }
      });

    // Add labels
    nodesEnter.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .text(d => d.title ? d.title.substring(0, 10) + '...' : '');

    // Merge new and existing nodes and add drag functionality to groups
    const allNodes = nodes.merge(nodesEnter);
    console.log('CLUSTER allNodes count after merge:', allNodes.size());

    // Add drag functionality to the group elements (not the circles)
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    allNodes.call(drag);
  }

  renderClusterBoundaries() {
    if (this.boundaryManager) {
      this.boundaryManager.updateBoundaries(this.domainGroups, this.nodes);
    }
  }

  updateClusterBoundaries() {
    if (this.boundaryManager && this.options.showDomainBoundaries) {
      this.boundaryManager.updateBoundaries(this.domainGroups, this.nodes);
    }
  }

  setupNodeInteractions() {
    console.log('CLUSTER setupNodeInteractions called');
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const self = this; // Capture 'this' context

    return function(selection) {
      console.log('CLUSTER setupNodeInteractions - attaching events to selection:', selection.size());
      selection.call(drag)
        .on('mouseover', (event, d) => {
          console.log('CLUSTER mouseover event fired for:', d.title);
          // Highlight domain
          if (self.boundaryManager) {
            self.boundaryManager.highlightDomain(d.domain);
          }

          // Enlarge node
          d3.select(event.currentTarget).select('circle')
            .transition()
            .duration(200)
            .attr('r', 12);

          // Show tooltip (if implemented)
          self.showNodeTooltip(event, d);
        })
        .on('mousemove', (event, d) => {
          // Update tooltip position as mouse moves (like tree view)
          self.showNodeTooltip(event, d);
        })
        .on('mouseout', (event, d) => {
          // Clear domain highlight
          if (self.boundaryManager) {
            self.boundaryManager.clearHighlights();
          }

          // Reset node size
          d3.select(event.currentTarget).select('circle')
            .transition()
            .duration(200)
            .attr('r', 8);

          // Hide tooltip
          self.hideNodeTooltip();
        })
        .on('click', (event, d) => {
          // Handle node click (e.g., open URL)
          console.log('CLUSTER click event fired for:', d.title, 'URL:', d.url);
          event.stopPropagation();
          if (d.url) {
            console.log('CLUSTER opening URL:', d.url);
            window.open(d.url, '_blank');
          } else {
            console.log('CLUSTER no URL to open');
          }
        });
    };
  }

  showNodeTooltip(event, d) {
    console.log('showNodeTooltip called for:', d.title);
    // Use the same updateDetailsPanel method as tree view
    this.updateDetailsPanel(d, event);
  }

  hideNodeTooltip() {
    console.log('hideNodeTooltip called');
    // Hide the details panel
    this.updateDetailsPanel(null);
  }

  updateElementSizes(scale) {
    // Adjust element sizes based on zoom level
    this.nodesGroup.selectAll('circle')
      .attr('stroke-width', 2 / scale);

    this.nodesGroup.selectAll('text')
      .attr('font-size', `${10 / scale}px`);

    this.linksGroup.selectAll('.link')
      .attr('stroke-width', d => (d.type === 'inter-domain' ? 2 : 1) / scale);
  }

  // Public methods for external control
  updateClusterStrength(strength) {
    this.options.clusterStrength = strength;
    this.simulation.force('cluster', this.clusterForce());
    this.simulation.alpha(0.3).restart();
  }

  toggleClustering(enabled) {
    this.options.enableClustering = enabled;
    this.simulation.force('cluster', enabled ? this.clusterForce() : null);
    this.simulation.alpha(0.3).restart();
  }

  toggleDomainBoundaries(show) {
    this.options.showDomainBoundaries = show;
    if (show) {
      this.renderClusterBoundaries();
    } else {
      if (this.boundaryManager) {
        this.boundaryManager.clear();
      }
    }
  }

  updateData(newData) {
    this.originalData = newData;
    this.processData();
    
    // Update simulation with new data
    this.simulation.nodes(this.nodes);
    this.simulation.force('link').links(this.links);
    
    // Re-render
    this.render();
    this.simulation.alpha(1).restart();
  }

  destroy() {
    console.log('CLUSTER destroy called');
    // Stop simulation
    if (this.simulation) {
      this.simulation.stop();
    }

    // Stop all ongoing transitions
    if (this.svg) {
      this.svg.selectAll('*').interrupt();
    }

    // Clear container but preserve cluster controls
    if (this.container) {
      // Save cluster controls before clearing
      const clusterControls = this.container.querySelector('.cluster-controls');
      this.container.innerHTML = '';
      // Restore cluster controls
      if (clusterControls) {
        console.log('CLUSTER restoring cluster controls');
        this.container.appendChild(clusterControls);
      }
    }

    // Clear references
    this.svg = null;
    this.simulation = null;
    this.nodes = null;
    this.links = null;
    this.boundaryManager = null;
  }
}

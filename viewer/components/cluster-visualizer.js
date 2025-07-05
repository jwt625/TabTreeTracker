// =============================================================================
// Cluster Visualizer - Force-Directed Layout for Domain Clustering
// =============================================================================

import { groupNodesByDomain, calculateDomainStats } from '../../src/domain-utils.js';
import { buildDomainConnections, analyzeConnectionPatterns } from '../../src/connection-mapper.js';
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

    this.init();
  }

  init() {
    this.processData();
    this.setupSVG();
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
    // Clear container
    this.container.innerHTML = '';

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
    const nodes = this.nodesGroup
      .selectAll('.node')
      .data(this.nodes);

    nodes.exit().remove();

    const nodesEnter = nodes.enter()
      .append('g')
      .attr('class', 'node')
      .call(this.setupNodeInteractions.bind(this));

    // Add circles
    nodesEnter.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.domainColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels
    nodesEnter.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .text(d => d.title ? d.title.substring(0, 10) + '...' : '');

    nodes.merge(nodesEnter);
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

    return function(selection) {
      selection.call(drag)
        .on('mouseover', (event, d) => {
          // Highlight domain
          if (this.boundaryManager) {
            this.boundaryManager.highlightDomain(d.domain);
          }

          // Enlarge node
          d3.select(event.currentTarget).select('circle')
            .transition()
            .duration(200)
            .attr('r', 12);

          // Show tooltip (if implemented)
          this.showNodeTooltip(event, d);
        }.bind(this))
        .on('mouseout', (event, d) => {
          // Clear domain highlight
          if (this.boundaryManager) {
            this.boundaryManager.clearHighlights();
          }

          // Reset node size
          d3.select(event.currentTarget).select('circle')
            .transition()
            .duration(200)
            .attr('r', 8);

          // Hide tooltip
          this.hideNodeTooltip();
        }.bind(this))
        .on('click', (event, d) => {
          // Handle node click (e.g., open URL)
          if (d.url) {
            window.open(d.url, '_blank');
          }
        });
    }.bind(this);
  }

  showNodeTooltip(event, d) {
    // Placeholder for tooltip implementation
    console.log('Show tooltip for:', d.title);
  }

  hideNodeTooltip() {
    // Placeholder for tooltip implementation
    console.log('Hide tooltip');
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
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

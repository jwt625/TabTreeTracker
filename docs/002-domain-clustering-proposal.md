# Domain-Based Cluster Visualization Proposal

## Overview

This document outlines a comprehensive proposal to transform TabTreeTracker's current hierarchical tree visualization into a flexible network visualization system that supports domain-based clustering while maintaining relationship integrity. The goal is to create an Obsidian-style graph view specifically tailored for web browsing patterns.

## Current State Analysis

### Existing Visualization System

TabTreeTracker currently uses a D3.js tree layout with the following characteristics:

- **Layout Engine**: `d3.tree()` with hierarchical positioning
- **Data Structure**: Parent-child relationships based on tab opener relationships
- **Visualization**: Traditional tree with nodes and links
- **Interaction**: Basic zoom, pan, and node clicking

### Current Data Structure

```javascript
const node = {
  id: `${tab.id}-${timestamp}`,
  tabId: tab.id,
  url: sanitizeUrl(tab.url),
  title: tab.title,
  createdAt: timestamp,
  children: [],
  topWords: null
};
```

### Limitations of Current Approach

1. **Poor scalability** for large datasets
2. **Limited organization** - no domain-based grouping
3. **Rigid hierarchy** - difficult to see cross-domain relationships
4. **Visual clutter** with many nodes
5. **No semantic grouping** of related content

## Proposed Solution: Domain-Based Clustering

### Core Concept

Transform the visualization into a force-directed graph where:
- **Nodes** represent individual tabs/pages
- **Clusters** group nodes by domain
- **Links** show navigation relationships (both within and across domains)
- **Visual boundaries** clearly delineate domain groups
- **Flexible layout** adapts to data patterns

### Key Benefits

1. **Better Organization**: Groups related content by domain
2. **Relationship Preservation**: Maintains parent-child connections across domains
3. **Scalability**: Handles large datasets more efficiently through clustering
4. **User Understanding**: More intuitive for users familiar with web domains
5. **Flexibility**: Allows switching between tree and cluster views

## Technical Implementation Plan

### Phase 1: Data Structure Enhancement

#### 1.1 Domain Extraction and Grouping

```javascript
// New utility functions needed
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

function groupNodesByDomain(tabTree) {
  const domainGroups = new Map();
  
  // Recursively collect all nodes and group by domain
  function collectNodes(node, path = []) {
    const domain = extractDomain(node.url);
    if (!domainGroups.has(domain)) {
      domainGroups.set(domain, {
        domain,
        nodes: [],
        connections: new Set(),
        color: generateDomainColor(domain)
      });
    }
    
    domainGroups.get(domain).nodes.push({
      ...node,
      domain,
      originalPath: path
    });
    
    if (node.children) {
      node.children.forEach((child, i) => 
        collectNodes(child, [...path, 'children', i])
      );
    }
  }
  
  Object.values(tabTree).forEach(root => collectNodes(root));
  return domainGroups;
}
```

#### 1.2 Connection Mapping System

```javascript
// Track relationships between domains
function buildDomainConnections(domainGroups) {
  const connections = [];
  
  domainGroups.forEach(group => {
    group.nodes.forEach(node => {
      if (node.children) {
        node.children.forEach(child => {
          const childDomain = extractDomain(child.url);
          if (childDomain !== group.domain) {
            connections.push({
              source: group.domain,
              target: childDomain,
              strength: 1, // Could be weighted by frequency
              originalRelation: { parent: node.id, child: child.id }
            });
          }
        });
      }
    });
  });
  
  return connections;
}
```

#### 1.3 Enhanced Node Properties

```javascript
// Enhanced node structure for clustering
const enhancedNode = {
  ...currentNode,
  domain: extractDomain(node.url),
  domainColor: generateDomainColor(domain),
  clusterPosition: { x: 0, y: 0 }, // Position within cluster
  globalPosition: { x: 0, y: 0 },  // Position in overall graph
  connections: [], // Direct connections to other nodes
  domainConnections: [], // Connections to other domains
  visitFrequency: calculateVisitFrequency(node),
  timeSpent: calculateTimeSpent(node)
};
```

### Phase 2: Visualization Engine

#### 2.1 Force-Directed Layout Engine

```javascript
// Replace tree layout with force simulation
class ClusterVisualizer {
  constructor(container, data, options = {}) {
    this.container = container;
    this.domainGroups = groupNodesByDomain(data);
    this.connections = buildDomainConnections(this.domainGroups);
    
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .force('cluster', this.clusterForce()); // Custom clustering force
  }
  
  clusterForce() {
    const strength = 0.1;
    return (alpha) => {
      this.domainGroups.forEach(group => {
        const centroid = this.calculateCentroid(group.nodes);
        group.nodes.forEach(node => {
          node.vx += (centroid.x - node.x) * strength * alpha;
          node.vy += (centroid.y - node.y) * strength * alpha;
        });
      });
    };
  }
}
```

#### 2.2 Domain Cluster Rendering

```javascript
// Render domain clusters with visual boundaries
renderDomainClusters() {
  const clusters = this.svg.selectAll('.domain-cluster')
    .data(Array.from(this.domainGroups.values()));
    
  clusters.enter()
    .append('g')
    .attr('class', 'domain-cluster')
    .each((d, i, nodes) => {
      const cluster = d3.select(nodes[i]);
      
      // Add cluster background/hull
      cluster.append('path')
        .attr('class', 'cluster-hull')
        .attr('fill', d.color)
        .attr('fill-opacity', 0.1)
        .attr('stroke', d.color)
        .attr('stroke-width', 2);
        
      // Add domain label
      cluster.append('text')
        .attr('class', 'domain-label')
        .text(d.domain)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold');
    });
}
```

### Phase 3: User Interface Enhancement

#### 3.1 Dual Visualization Modes

```javascript
// Toggle between tree and cluster views
class ViewModeController {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.currentMode = 'tree'; // 'tree' or 'cluster'
  }
  
  switchMode(newMode) {
    if (newMode === this.currentMode) return;
    
    this.animateTransition(this.currentMode, newMode);
    this.currentMode = newMode;
    this.updateControls();
  }
  
  animateTransition(fromMode, toMode) {
    // Smooth animated transition between layouts
    const duration = 1000;
    
    if (toMode === 'cluster') {
      this.transitionToCluster(duration);
    } else {
      this.transitionToTree(duration);
    }
  }
}
```

#### 3.2 Cluster Interaction Controls

```javascript
// New control panel for cluster visualization
class ClusterControls {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.createControls();
  }
  
  createControls() {
    // Toggle between tree and cluster view
    this.addToggle('viewMode', ['tree', 'cluster']);
    
    // Cluster strength adjustment
    this.addSlider('clusterStrength', 0, 1, 0.1);
    
    // Domain filtering
    this.addDomainFilter();
    
    // Layout algorithms
    this.addSelect('layout', ['force', 'circular', 'hierarchical']);
  }
  
  addClusterInteractions() {
    // Hover to highlight domain
    clusters.on('mouseover', (event, d) => {
      this.highlightDomain(d.domain);
      this.showDomainStats(d);
    });
    
    // Click to focus/expand domain
    clusters.on('click', (event, d) => {
      this.focusOnDomain(d.domain);
    });
    
    // Drag to reposition clusters
    clusters.call(d3.drag()
      .on('start', this.dragStarted)
      .on('drag', this.dragged)
      .on('end', this.dragEnded));
  }
}
```

### Phase 4: Performance Optimization

#### 4.1 Level-of-Detail Rendering

```javascript
// Implement level-of-detail rendering for large datasets
class LODRenderer {
  render(zoomLevel, visibleBounds) {
    if (zoomLevel < 0.5) {
      // Show only domain clusters
      this.renderDomainClusters();
    } else if (zoomLevel < 2) {
      // Show clusters + major nodes
      this.renderClustersWithMajorNodes();
    } else {
      // Show full detail
      this.renderFullDetail();
    }
  }
}
```

#### 4.2 Efficient Data Processing

```javascript
// Efficient data processing for large trees
class DataProcessor {
  processInChunks(tabTree, chunkSize = 1000) {
    return new Promise((resolve) => {
      const chunks = this.chunkify(tabTree, chunkSize);
      const processChunk = (index) => {
        if (index >= chunks.length) {
          resolve(this.mergeResults());
          return;
        }
        
        setTimeout(() => {
          this.processChunk(chunks[index]);
          processChunk(index + 1);
        }, 0);
      };
      
      processChunk(0);
    });
  }
}
```

## Advanced Features

### Intelligent Domain Grouping

```javascript
// Smart domain grouping with subdomain handling
function intelligentDomainGrouping(nodes) {
  const domainHierarchy = new Map();
  
  nodes.forEach(node => {
    const url = new URL(node.url);
    const parts = url.hostname.split('.').reverse();
    
    // Build domain hierarchy (e.g., com.github.user -> github.com)
    let current = domainHierarchy;
    parts.forEach(part => {
      if (!current.has(part)) {
        current.set(part, new Map());
      }
      current = current.get(part);
    });
  });
  
  return optimizeClusterSizes(domainHierarchy);
}
```

### Connection Strength Calculation

```javascript
// Calculate connection weights between domains
function calculateConnectionStrength(sourceDomain, targetDomain, allConnections) {
  const directConnections = allConnections.filter(c => 
    c.source === sourceDomain && c.target === targetDomain
  );
  
  return {
    frequency: directConnections.length,
    recency: calculateRecencyWeight(directConnections),
    bidirectional: hasBidirectionalFlow(sourceDomain, targetDomain, allConnections)
  };
}
```

## Implementation Timeline

### Week 1-2: Foundation ✅ COMPLETED
- [x] Implement domain extraction utilities
- [x] Create domain grouping algorithms
- [x] Build connection mapping system
- [x] Extend node data structures

**Progress Update (Current):**
- ✅ Created `src/domain-utils.js` with comprehensive domain extraction and grouping
- ✅ Created `src/connection-mapper.js` with relationship tracking and analysis
- ✅ Created `src/enhanced-node.js` with extended node data structures
- ✅ Created `test/domain-clustering-test.js` for validation
- 🔄 **Currently working on**: Phase 2 - Visualization Engine

### Week 3-4: Visualization Engine ✅ COMPLETED
- [x] Implement force-directed layout
- [x] Create cluster rendering system
- [x] Add domain boundary visualization
- [x] Implement basic interactions

### Week 5-6: User Interface ✅ COMPLETED
- [x] Add view mode toggle
- [x] Create cluster controls
- [x] Implement smooth transitions
- [x] Add domain filtering

**Progress Update:**
- ✅ Created `viewer/components/cluster-visualizer.js` with D3.js force simulation
- ✅ Created `viewer/components/cluster-boundaries.js` with convex hull boundaries
- ✅ Created `viewer/components/view-mode-controller.js` for seamless mode switching
- ✅ Created `viewer/components/cluster-controls.js` with comprehensive UI controls
- 🔄 **Currently working on**: Phase 4 - Performance Optimization

### Week 7-8: Optimization & Polish
- [ ] Implement LOD rendering
- [ ] Add performance optimizations
- [ ] Create smooth animations
- [ ] Add accessibility features

## Success Metrics

1. **Performance**: Handle 10,000+ nodes smoothly
2. **Usability**: Users can easily switch between views
3. **Clarity**: Domain relationships are clearly visible
4. **Scalability**: System performs well with large datasets
5. **Flexibility**: Supports various layout algorithms

## Conclusion

This domain-based clustering approach will transform TabTreeTracker into a more powerful and intuitive visualization tool. By combining the benefits of hierarchical tree structures with the organizational clarity of domain-based clustering, users will gain better insights into their browsing patterns while maintaining the ability to see detailed relationships between pages.

The implementation plan provides a clear roadmap for development, with each phase building upon the previous one to create a robust and scalable visualization system.

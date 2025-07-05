// =============================================================================
// Enhanced Node Data Structures for Domain Clustering
// =============================================================================

import { extractDomain, generateDomainColor } from './domain-utils.js';

/**
 * Create an enhanced node with domain clustering properties
 * @param {Object} originalNode - Original node from tab tree
 * @param {Object} options - Enhancement options
 * @returns {Object} - Enhanced node with clustering properties
 */
export function createEnhancedNode(originalNode, options = {}) {
  const {
    includeClusterPosition = true,
    includeGlobalPosition = true,
    includeDomainMetadata = true,
    includeConnectionData = true,
    calculateVisitMetrics = true
  } = options;

  if (!originalNode) {
    throw new Error('Original node is required');
  }

  const domain = extractDomain(originalNode.url);
  const enhancedNode = {
    // Original properties
    ...originalNode,
    
    // Domain-specific properties
    domain,
    domainColor: generateDomainColor(domain),
    
    // Clustering properties
    clusterData: {
      clusterId: null,
      clusterPosition: includeClusterPosition ? { x: 0, y: 0 } : null,
      clusterRadius: 0,
      clusterCenter: null
    },
    
    // Global positioning
    globalPosition: includeGlobalPosition ? { x: 0, y: 0, vx: 0, vy: 0 } : null,
    
    // Connection data
    connections: includeConnectionData ? {
      incoming: [],
      outgoing: [],
      intraDomain: [],
      interDomain: [],
      totalConnections: 0
    } : null,
    
    // Visit metrics
    visitMetrics: calculateVisitMetrics ? {
      visitCount: 1,
      totalTimeSpent: 0,
      averageTimeSpent: 0,
      lastVisitTime: originalNode.createdAt || Date.now(),
      firstVisitTime: originalNode.createdAt || Date.now(),
      visitFrequency: 0
    } : null,
    
    // Visualization properties
    visualization: {
      visible: true,
      highlighted: false,
      selected: false,
      opacity: 1.0,
      scale: 1.0,
      zIndex: 0
    },
    
    // Metadata for clustering
    metadata: includeDomainMetadata ? {
      originalPath: [],
      parentDomain: null,
      childDomains: new Set(),
      siblingNodes: [],
      depth: 0,
      isRoot: false,
      isLeaf: false
    } : null
  };

  return enhancedNode;
}

/**
 * Update node with cluster information
 * @param {Object} node - Enhanced node to update
 * @param {Object} clusterInfo - Cluster information
 * @returns {Object} - Updated node
 */
export function updateNodeClusterInfo(node, clusterInfo) {
  if (!node.clusterData) {
    node.clusterData = {
      clusterId: null,
      clusterPosition: { x: 0, y: 0 },
      clusterRadius: 0,
      clusterCenter: null
    };
  }

  Object.assign(node.clusterData, clusterInfo);
  return node;
}

/**
 * Update node connections
 * @param {Object} node - Enhanced node to update
 * @param {Array} connections - Array of connection objects
 * @returns {Object} - Updated node
 */
export function updateNodeConnections(node, connections) {
  if (!node.connections) {
    node.connections = {
      incoming: [],
      outgoing: [],
      intraDomain: [],
      interDomain: [],
      totalConnections: 0
    };
  }

  // Reset connections
  node.connections.incoming = [];
  node.connections.outgoing = [];
  node.connections.intraDomain = [];
  node.connections.interDomain = [];

  // Process connections
  connections.forEach(connection => {
    if (connection.source === node.id) {
      node.connections.outgoing.push(connection);
    }
    if (connection.target === node.id) {
      node.connections.incoming.push(connection);
    }

    // Categorize by domain
    const isIntraDomain = connection.sourceDomain === connection.targetDomain;
    if (isIntraDomain) {
      if (!node.connections.intraDomain.find(c => c.id === connection.id)) {
        node.connections.intraDomain.push(connection);
      }
    } else {
      if (!node.connections.interDomain.find(c => c.id === connection.id)) {
        node.connections.interDomain.push(connection);
      }
    }
  });

  node.connections.totalConnections = 
    node.connections.incoming.length + node.connections.outgoing.length;

  return node;
}

/**
 * Calculate visit metrics for a node
 * @param {Object} node - Enhanced node
 * @param {Array} visitHistory - Array of visit records
 * @returns {Object} - Updated node with visit metrics
 */
export function calculateVisitMetrics(node, visitHistory = []) {
  if (!node.visitMetrics) {
    node.visitMetrics = {
      visitCount: 1,
      totalTimeSpent: 0,
      averageTimeSpent: 0,
      lastVisitTime: node.createdAt || Date.now(),
      firstVisitTime: node.createdAt || Date.now(),
      visitFrequency: 0
    };
  }

  if (visitHistory.length === 0) {
    return node;
  }

  // Calculate metrics from visit history
  const visits = visitHistory.filter(visit => visit.nodeId === node.id);
  
  if (visits.length > 0) {
    node.visitMetrics.visitCount = visits.length;
    node.visitMetrics.totalTimeSpent = visits.reduce((total, visit) => 
      total + (visit.timeSpent || 0), 0);
    node.visitMetrics.averageTimeSpent = 
      node.visitMetrics.totalTimeSpent / node.visitMetrics.visitCount;
    
    const timestamps = visits.map(v => v.timestamp).sort((a, b) => a - b);
    node.visitMetrics.firstVisitTime = timestamps[0];
    node.visitMetrics.lastVisitTime = timestamps[timestamps.length - 1];
    
    // Calculate frequency (visits per day)
    const timeSpan = node.visitMetrics.lastVisitTime - node.visitMetrics.firstVisitTime;
    const days = Math.max(1, timeSpan / (24 * 60 * 60 * 1000));
    node.visitMetrics.visitFrequency = node.visitMetrics.visitCount / days;
  }

  return node;
}

/**
 * Update node metadata
 * @param {Object} node - Enhanced node
 * @param {Object} treeContext - Context from the tree structure
 * @returns {Object} - Updated node
 */
export function updateNodeMetadata(node, treeContext = {}) {
  if (!node.metadata) {
    node.metadata = {
      originalPath: [],
      parentDomain: null,
      childDomains: new Set(),
      siblingNodes: [],
      depth: 0,
      isRoot: false,
      isLeaf: false
    };
  }

  const {
    originalPath = [],
    parent = null,
    children = [],
    siblings = [],
    depth = 0
  } = treeContext;

  node.metadata.originalPath = originalPath;
  node.metadata.depth = depth;
  node.metadata.isRoot = !parent;
  node.metadata.isLeaf = children.length === 0;
  node.metadata.siblingNodes = siblings.map(s => s.id);

  // Update parent domain
  if (parent) {
    node.metadata.parentDomain = extractDomain(parent.url);
  }

  // Update child domains
  node.metadata.childDomains = new Set(
    children.map(child => extractDomain(child.url))
  );

  return node;
}

/**
 * Create a collection of enhanced nodes from a tree
 * @param {Object} tabTree - Original tab tree
 * @param {Object} options - Enhancement options
 * @returns {Map} - Map of enhanced nodes by ID
 */
export function createEnhancedNodeCollection(tabTree, options = {}) {
  const enhancedNodes = new Map();
  const {
    includeVisitHistory = false,
    visitHistory = []
  } = options;

  /**
   * Recursively process nodes
   * @param {Object} node - Current node
   * @param {Object} context - Tree context
   */
  function processNode(node, context = {}) {
    if (!node) return;

    // Create enhanced node
    const enhancedNode = createEnhancedNode(node, options);
    
    // Update metadata
    updateNodeMetadata(enhancedNode, context);
    
    // Calculate visit metrics if history is provided
    if (includeVisitHistory && visitHistory.length > 0) {
      calculateVisitMetrics(enhancedNode, visitHistory);
    }

    // Store enhanced node
    enhancedNodes.set(node.id, enhancedNode);

    // Process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child, index) => {
        const childContext = {
          originalPath: [...(context.originalPath || []), 'children', index],
          parent: node,
          children: child.children || [],
          siblings: node.children.filter((_, i) => i !== index),
          depth: (context.depth || 0) + 1
        };
        
        processNode(child, childContext);
      });
    }
  }

  // Process all root nodes
  if (tabTree && typeof tabTree === 'object') {
    Object.values(tabTree).forEach(rootNode => {
      const rootContext = {
        originalPath: [rootNode.id],
        parent: null,
        children: rootNode.children || [],
        siblings: Object.values(tabTree).filter(n => n.id !== rootNode.id),
        depth: 0
      };
      
      processNode(rootNode, rootContext);
    });
  }

  return enhancedNodes;
}

/**
 * Serialize enhanced node for storage
 * @param {Object} enhancedNode - Enhanced node to serialize
 * @returns {Object} - Serialized node
 */
export function serializeEnhancedNode(enhancedNode) {
  const serialized = { ...enhancedNode };
  
  // Convert Sets to Arrays for JSON serialization
  if (serialized.metadata && serialized.metadata.childDomains) {
    serialized.metadata.childDomains = Array.from(serialized.metadata.childDomains);
  }
  
  return serialized;
}

/**
 * Deserialize enhanced node from storage
 * @param {Object} serializedNode - Serialized node data
 * @returns {Object} - Enhanced node
 */
export function deserializeEnhancedNode(serializedNode) {
  const node = { ...serializedNode };
  
  // Convert Arrays back to Sets
  if (node.metadata && Array.isArray(node.metadata.childDomains)) {
    node.metadata.childDomains = new Set(node.metadata.childDomains);
  }
  
  return node;
}

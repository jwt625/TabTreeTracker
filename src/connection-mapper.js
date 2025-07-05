// =============================================================================
// Connection Mapping System for Domain Clustering
// =============================================================================

import { extractDomain } from './domain-utils.js';

/**
 * Build connections between domains based on navigation relationships
 * @param {Map} domainGroups - Domain groups from groupNodesByDomain
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of connection objects
 */
export function buildDomainConnections(domainGroups, options = {}) {
  const {
    includeIntraDomain = false,
    weightByFrequency = true,
    weightByRecency = true,
    minConnectionStrength = 0.1
  } = options;

  const connections = [];
  const connectionMap = new Map(); // Track connection frequencies

  // Process each domain group
  domainGroups.forEach(group => {
    group.nodes.forEach(node => {
      if (!node.children || !Array.isArray(node.children)) return;

      // Process each child relationship
      node.children.forEach(child => {
        const childDomain = extractDomain(child.url);
        
        // Skip intra-domain connections if not requested
        if (!includeIntraDomain && childDomain === group.domain) return;

        // Create connection key for tracking
        const connectionKey = `${group.domain}->${childDomain}`;
        
        if (!connectionMap.has(connectionKey)) {
          connectionMap.set(connectionKey, {
            source: group.domain,
            target: childDomain,
            connections: [],
            frequency: 0,
            totalStrength: 0
          });
        }

        const connection = connectionMap.get(connectionKey);
        connection.connections.push({
          parentNode: node,
          childNode: child,
          timestamp: child.createdAt || Date.now(),
          parentId: node.id,
          childId: child.id
        });
        connection.frequency++;
      });
    });
  });

  // Convert connection map to array with calculated strengths
  connectionMap.forEach(connection => {
    const strength = calculateConnectionStrength(connection, domainGroups, {
      weightByFrequency,
      weightByRecency
    });

    if (strength >= minConnectionStrength) {
      connections.push({
        ...connection,
        strength,
        bidirectional: checkBidirectional(connection, connectionMap)
      });
    }
  });

  return connections.sort((a, b) => b.strength - a.strength);
}

/**
 * Calculate connection strength between domains
 * @param {Object} connection - Connection object
 * @param {Map} domainGroups - Domain groups for context
 * @param {Object} options - Calculation options
 * @returns {number} - Connection strength (0-1)
 */
export function calculateConnectionStrength(connection, domainGroups, options = {}) {
  const {
    weightByFrequency = true,
    weightByRecency = true,
    frequencyWeight = 0.6,
    recencyWeight = 0.4
  } = options;

  let strength = 0;

  // Frequency-based strength
  if (weightByFrequency) {
    const sourceGroup = domainGroups.get(connection.source);
    const maxPossibleConnections = sourceGroup ? sourceGroup.nodes.length : 1;
    const frequencyScore = Math.min(connection.frequency / maxPossibleConnections, 1);
    strength += frequencyScore * frequencyWeight;
  }

  // Recency-based strength
  if (weightByRecency) {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Find most recent connection
    const mostRecentTimestamp = Math.max(
      ...connection.connections.map(c => c.timestamp || 0)
    );
    
    const daysSinceLastConnection = (now - mostRecentTimestamp) / dayInMs;
    const recencyScore = Math.max(0, 1 - (daysSinceLastConnection / 30)); // Decay over 30 days
    strength += recencyScore * recencyWeight;
  }

  // Ensure strength is between 0 and 1
  return Math.max(0, Math.min(1, strength));
}

/**
 * Check if connection is bidirectional
 * @param {Object} connection - Connection to check
 * @param {Map} connectionMap - All connections map
 * @returns {boolean} - Whether connection is bidirectional
 */
function checkBidirectional(connection, connectionMap) {
  const reverseKey = `${connection.target}->${connection.source}`;
  return connectionMap.has(reverseKey);
}

/**
 * Build intra-domain connections (within same domain)
 * @param {Map} domainGroups - Domain groups
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of intra-domain connections
 */
export function buildIntraDomainConnections(domainGroups, options = {}) {
  const {
    maxConnectionsPerNode = 10,
    includeAllRelationships = false
  } = options;

  const intraDomainConnections = [];

  domainGroups.forEach(group => {
    const domainConnections = [];

    // Build connections within this domain
    group.nodes.forEach(node => {
      if (!node.children || !Array.isArray(node.children)) return;

      node.children.forEach(child => {
        const childDomain = extractDomain(child.url);
        
        // Only process intra-domain connections
        if (childDomain === group.domain) {
          domainConnections.push({
            source: node.id,
            target: child.id,
            sourceNode: node,
            targetNode: child,
            domain: group.domain,
            strength: 1, // Full strength for direct parent-child relationships
            type: 'parent-child'
          });
        }
      });
    });

    // Add sibling connections if requested
    if (includeAllRelationships) {
      group.nodes.forEach(node => {
        if (!node.children || node.children.length < 2) return;

        // Connect siblings
        for (let i = 0; i < node.children.length; i++) {
          for (let j = i + 1; j < node.children.length; j++) {
            const child1 = node.children[i];
            const child2 = node.children[j];
            
            if (extractDomain(child1.url) === group.domain && 
                extractDomain(child2.url) === group.domain) {
              domainConnections.push({
                source: child1.id,
                target: child2.id,
                sourceNode: child1,
                targetNode: child2,
                domain: group.domain,
                strength: 0.5, // Lower strength for sibling relationships
                type: 'sibling'
              });
            }
          }
        }
      });
    }

    // Limit connections per node if specified
    if (maxConnectionsPerNode > 0) {
      const nodeConnectionCount = new Map();
      const filteredConnections = [];

      domainConnections.forEach(connection => {
        const sourceCount = nodeConnectionCount.get(connection.source) || 0;
        const targetCount = nodeConnectionCount.get(connection.target) || 0;

        if (sourceCount < maxConnectionsPerNode && targetCount < maxConnectionsPerNode) {
          filteredConnections.push(connection);
          nodeConnectionCount.set(connection.source, sourceCount + 1);
          nodeConnectionCount.set(connection.target, targetCount + 1);
        }
      });

      intraDomainConnections.push(...filteredConnections);
    } else {
      intraDomainConnections.push(...domainConnections);
    }
  });

  return intraDomainConnections;
}

/**
 * Analyze connection patterns between domains
 * @param {Array} connections - Array of domain connections
 * @param {Map} domainGroups - Domain groups for context
 * @returns {Object} - Analysis results
 */
export function analyzeConnectionPatterns(connections, domainGroups) {
  const analysis = {
    totalConnections: connections.length,
    bidirectionalConnections: 0,
    strongConnections: 0, // strength > 0.7
    weakConnections: 0,   // strength < 0.3
    hubDomains: [],       // domains with many outgoing connections
    sinkDomains: [],      // domains with many incoming connections
    isolatedDomains: [],  // domains with no connections
    connectionMatrix: new Map()
  };

  // Count bidirectional and strength-based connections
  connections.forEach(connection => {
    if (connection.bidirectional) {
      analysis.bidirectionalConnections++;
    }
    
    if (connection.strength > 0.7) {
      analysis.strongConnections++;
    } else if (connection.strength < 0.3) {
      analysis.weakConnections++;
    }
  });

  // Build connection matrix and identify hubs/sinks
  const outgoingCounts = new Map();
  const incomingCounts = new Map();

  connections.forEach(connection => {
    // Update outgoing counts
    const outgoing = outgoingCounts.get(connection.source) || 0;
    outgoingCounts.set(connection.source, outgoing + 1);

    // Update incoming counts
    const incoming = incomingCounts.get(connection.target) || 0;
    incomingCounts.set(connection.target, incoming + 1);

    // Update connection matrix
    const matrixKey = `${connection.source}->${connection.target}`;
    analysis.connectionMatrix.set(matrixKey, connection);
  });

  // Identify hub domains (high outgoing connections)
  const avgOutgoing = connections.length / domainGroups.size;
  outgoingCounts.forEach((count, domain) => {
    if (count > avgOutgoing * 1.5) {
      analysis.hubDomains.push({ domain, outgoingConnections: count });
    }
  });

  // Identify sink domains (high incoming connections)
  const avgIncoming = connections.length / domainGroups.size;
  incomingCounts.forEach((count, domain) => {
    if (count > avgIncoming * 1.5) {
      analysis.sinkDomains.push({ domain, incomingConnections: count });
    }
  });

  // Identify isolated domains
  domainGroups.forEach((group, domain) => {
    const hasOutgoing = outgoingCounts.has(domain);
    const hasIncoming = incomingCounts.has(domain);
    
    if (!hasOutgoing && !hasIncoming) {
      analysis.isolatedDomains.push(domain);
    }
  });

  // Sort hubs and sinks by connection count
  analysis.hubDomains.sort((a, b) => b.outgoingConnections - a.outgoingConnections);
  analysis.sinkDomains.sort((a, b) => b.incomingConnections - a.incomingConnections);

  return analysis;
}

/**
 * Filter connections based on criteria
 * @param {Array} connections - Array of connections to filter
 * @param {Object} criteria - Filter criteria
 * @returns {Array} - Filtered connections
 */
export function filterConnections(connections, criteria = {}) {
  const {
    minStrength = 0,
    maxStrength = 1,
    includeBidirectional = true,
    includeUnidirectional = true,
    sourceDomains = null,
    targetDomains = null,
    excludeDomains = null
  } = criteria;

  return connections.filter(connection => {
    // Strength filter
    if (connection.strength < minStrength || connection.strength > maxStrength) {
      return false;
    }

    // Bidirectional filter
    if (connection.bidirectional && !includeBidirectional) {
      return false;
    }
    if (!connection.bidirectional && !includeUnidirectional) {
      return false;
    }

    // Domain filters
    if (sourceDomains && !sourceDomains.includes(connection.source)) {
      return false;
    }
    if (targetDomains && !targetDomains.includes(connection.target)) {
      return false;
    }
    if (excludeDomains && 
        (excludeDomains.includes(connection.source) || excludeDomains.includes(connection.target))) {
      return false;
    }

    return true;
  });
}

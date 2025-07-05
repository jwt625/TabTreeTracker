// =============================================================================
// Domain Utilities for Cluster Visualization
// =============================================================================

/**
 * Extract domain from URL with intelligent handling of subdomains and edge cases
 * @param {string} url - The URL to extract domain from
 * @param {Object} options - Configuration options
 * @returns {string} - Extracted domain or 'unknown' for invalid URLs
 */
export function extractDomain(url, options = {}) {
  const {
    removeWww = true,
    groupSubdomains = false,
    fallback = 'unknown'
  } = options;

  if (!url || typeof url !== 'string') {
    return fallback;
  }

  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();

    // Handle special protocols
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:') {
      return urlObj.protocol.replace(':', '');
    }

    // Remove www prefix if requested
    if (removeWww && hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Group subdomains if requested (e.g., user.github.io -> github.io)
    if (groupSubdomains) {
      const parts = hostname.split('.');
      if (parts.length > 2) {
        // Keep only the last two parts for common TLDs
        const commonTLDs = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co'];
        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];
        
        if (commonTLDs.includes(lastPart)) {
          hostname = `${secondLastPart}.${lastPart}`;
        }
      }
    }

    return hostname;
  } catch (error) {
    console.warn('Failed to extract domain from URL:', url, error);
    return fallback;
  }
}

/**
 * Generate a consistent color for a domain
 * @param {string} domain - The domain to generate color for
 * @returns {string} - Hex color string
 */
export function generateDomainColor(domain) {
  if (!domain || domain === 'unknown') {
    return '#999999'; // Gray for unknown domains
  }

  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert hash to HSL color for better distribution
  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
  const lightness = 45 + (Math.abs(hash) % 20);  // 45-65%

  return hslToHex(hue, saturation, lightness);
}

/**
 * Convert HSL to Hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} - Hex color string
 */
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Group nodes by domain with intelligent clustering
 * @param {Object} tabTree - The tab tree data structure
 * @param {Object} options - Grouping options
 * @returns {Map} - Map of domain groups
 */
export function groupNodesByDomain(tabTree, options = {}) {
  const {
    removeWww = true,
    groupSubdomains = false,
    minClusterSize = 1
  } = options;

  const domainGroups = new Map();
  
  /**
   * Recursively collect all nodes and group by domain
   * @param {Object} node - Current node
   * @param {Array} path - Path to current node in tree
   */
  function collectNodes(node, path = []) {
    if (!node || !node.url) return;

    const domain = extractDomain(node.url, { removeWww, groupSubdomains });
    
    // Initialize domain group if it doesn't exist
    if (!domainGroups.has(domain)) {
      domainGroups.set(domain, {
        domain,
        nodes: [],
        connections: new Set(),
        color: generateDomainColor(domain),
        stats: {
          totalNodes: 0,
          totalVisits: 0,
          firstVisit: null,
          lastVisit: null
        }
      });
    }

    const group = domainGroups.get(domain);
    
    // Add node to group with enhanced metadata
    const enhancedNode = {
      ...node,
      domain,
      originalPath: path,
      clusterPosition: { x: 0, y: 0 },
      globalPosition: { x: 0, y: 0 }
    };

    group.nodes.push(enhancedNode);
    
    // Update group statistics
    group.stats.totalNodes++;
    if (node.createdAt) {
      if (!group.stats.firstVisit || node.createdAt < group.stats.firstVisit) {
        group.stats.firstVisit = node.createdAt;
      }
      if (!group.stats.lastVisit || node.createdAt > group.stats.lastVisit) {
        group.stats.lastVisit = node.createdAt;
      }
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child, index) => {
        collectNodes(child, [...path, 'children', index]);
      });
    }
  }

  // Process all root nodes in the tree
  if (tabTree && typeof tabTree === 'object') {
    Object.values(tabTree).forEach(rootNode => {
      collectNodes(rootNode, [rootNode.id]);
    });
  }

  // Filter out groups that are too small if specified
  if (minClusterSize > 1) {
    const filteredGroups = new Map();
    domainGroups.forEach((group, domain) => {
      if (group.nodes.length >= minClusterSize) {
        filteredGroups.set(domain, group);
      }
    });
    return filteredGroups;
  }

  return domainGroups;
}

/**
 * Calculate domain statistics for analysis
 * @param {Map} domainGroups - Domain groups map
 * @returns {Object} - Statistics object
 */
export function calculateDomainStats(domainGroups) {
  const stats = {
    totalDomains: domainGroups.size,
    totalNodes: 0,
    averageNodesPerDomain: 0,
    largestDomain: null,
    smallestDomain: null,
    domainDistribution: []
  };

  let maxNodes = 0;
  let minNodes = Infinity;

  domainGroups.forEach((group, domain) => {
    const nodeCount = group.nodes.length;
    stats.totalNodes += nodeCount;

    if (nodeCount > maxNodes) {
      maxNodes = nodeCount;
      stats.largestDomain = { domain, nodeCount };
    }

    if (nodeCount < minNodes) {
      minNodes = nodeCount;
      stats.smallestDomain = { domain, nodeCount };
    }

    stats.domainDistribution.push({
      domain,
      nodeCount,
      percentage: 0 // Will be calculated after total is known
    });
  });

  // Calculate percentages and average
  stats.averageNodesPerDomain = stats.totalNodes / stats.totalDomains;
  stats.domainDistribution.forEach(item => {
    item.percentage = (item.nodeCount / stats.totalNodes) * 100;
  });

  // Sort distribution by node count (descending)
  stats.domainDistribution.sort((a, b) => b.nodeCount - a.nodeCount);

  return stats;
}

/**
 * Validate domain extraction results
 * @param {string} url - Original URL
 * @param {string} domain - Extracted domain
 * @returns {boolean} - Whether extraction is valid
 */
export function validateDomainExtraction(url, domain) {
  if (!url || !domain) return false;
  if (domain === 'unknown') return true; // Valid fallback
  
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes(domain) || domain.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

/**
 * Get domain hierarchy for intelligent grouping
 * @param {string} domain - Domain to analyze
 * @returns {Array} - Array of domain parts from TLD to subdomain
 */
export function getDomainHierarchy(domain) {
  if (!domain || domain === 'unknown') return [];
  
  const parts = domain.split('.').reverse();
  const hierarchy = [];
  
  for (let i = 0; i < parts.length; i++) {
    const domainLevel = parts.slice(0, i + 1).reverse().join('.');
    hierarchy.push({
      level: i,
      domain: domainLevel,
      isTopLevel: i === 0,
      isSubdomain: i > 1
    });
  }
  
  return hierarchy;
}

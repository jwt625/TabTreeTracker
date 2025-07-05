// =============================================================================
// Test Suite for Domain Clustering Data Structures
// =============================================================================

import { 
  extractDomain, 
  generateDomainColor, 
  groupNodesByDomain,
  calculateDomainStats 
} from '../src/domain-utils.js';

import { 
  buildDomainConnections,
  calculateConnectionStrength,
  analyzeConnectionPatterns 
} from '../src/connection-mapper.js';

import { 
  createEnhancedNode,
  createEnhancedNodeCollection 
} from '../src/enhanced-node.js';

// Sample test data
const sampleTabTree = {
  "1-1640995200000": {
    id: "1-1640995200000",
    tabId: 1,
    url: "https://github.com/user/repo",
    title: "GitHub Repository",
    createdAt: 1640995200000,
    children: [
      {
        id: "2-1640995260000",
        tabId: 2,
        url: "https://github.com/user/repo/issues",
        title: "Issues",
        createdAt: 1640995260000,
        children: [
          {
            id: "3-1640995320000",
            tabId: 3,
            url: "https://stackoverflow.com/questions/12345",
            title: "Stack Overflow Question",
            createdAt: 1640995320000,
            children: []
          }
        ]
      },
      {
        id: "4-1640995380000",
        tabId: 4,
        url: "https://docs.github.com/en/issues",
        title: "GitHub Docs",
        createdAt: 1640995380000,
        children: []
      }
    ]
  },
  "5-1640995440000": {
    id: "5-1640995440000",
    tabId: 5,
    url: "https://www.google.com/search?q=javascript",
    title: "Google Search",
    createdAt: 1640995440000,
    children: [
      {
        id: "6-1640995500000",
        tabId: 6,
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        title: "MDN JavaScript",
        createdAt: 1640995500000,
        children: []
      }
    ]
  }
};

/**
 * Test domain extraction functionality
 */
function testDomainExtraction() {
  console.log('🧪 Testing Domain Extraction...');
  
  const testCases = [
    { url: "https://github.com/user/repo", expected: "github.com" },
    { url: "https://www.google.com/search", expected: "google.com" },
    { url: "https://docs.github.com/en/issues", expected: "docs.github.com" },
    { url: "https://stackoverflow.com/questions/12345", expected: "stackoverflow.com" },
    { url: "chrome://newtab/", expected: "chrome" },
    { url: "invalid-url", expected: "unknown" },
    { url: "", expected: "unknown" }
  ];

  let passed = 0;
  testCases.forEach(({ url, expected }, index) => {
    const result = extractDomain(url);
    const success = result === expected;
    console.log(`  Test ${index + 1}: ${success ? '✅' : '❌'} ${url} -> ${result} (expected: ${expected})`);
    if (success) passed++;
  });

  console.log(`  Results: ${passed}/${testCases.length} tests passed\n`);
  return passed === testCases.length;
}

/**
 * Test domain grouping functionality
 */
function testDomainGrouping() {
  console.log('🧪 Testing Domain Grouping...');
  
  const domainGroups = groupNodesByDomain(sampleTabTree);
  
  console.log(`  Found ${domainGroups.size} domain groups:`);
  domainGroups.forEach((group, domain) => {
    console.log(`    ${domain}: ${group.nodes.length} nodes`);
    group.nodes.forEach(node => {
      console.log(`      - ${node.title} (${node.url})`);
    });
  });

  // Validate expected domains
  const expectedDomains = ['github.com', 'docs.github.com', 'stackoverflow.com', 'google.com', 'developer.mozilla.org'];
  const foundDomains = Array.from(domainGroups.keys());
  
  let allDomainsFound = true;
  expectedDomains.forEach(domain => {
    if (!foundDomains.includes(domain)) {
      console.log(`  ❌ Missing expected domain: ${domain}`);
      allDomainsFound = false;
    }
  });

  if (allDomainsFound) {
    console.log('  ✅ All expected domains found');
  }

  console.log('');
  return allDomainsFound;
}

/**
 * Test connection mapping functionality
 */
function testConnectionMapping() {
  console.log('🧪 Testing Connection Mapping...');
  
  const domainGroups = groupNodesByDomain(sampleTabTree);
  const connections = buildDomainConnections(domainGroups);
  
  console.log(`  Found ${connections.length} domain connections:`);
  connections.forEach(connection => {
    console.log(`    ${connection.source} -> ${connection.target} (strength: ${connection.strength.toFixed(2)})`);
  });

  // Validate expected connections
  const expectedConnections = [
    'github.com -> stackoverflow.com',
    'github.com -> docs.github.com',
    'google.com -> developer.mozilla.org'
  ];

  let allConnectionsFound = true;
  expectedConnections.forEach(expectedConn => {
    const found = connections.some(conn => 
      `${conn.source} -> ${conn.target}` === expectedConn
    );
    if (!found) {
      console.log(`  ❌ Missing expected connection: ${expectedConn}`);
      allConnectionsFound = false;
    } else {
      console.log(`  ✅ Found expected connection: ${expectedConn}`);
    }
  });

  console.log('');
  return allConnectionsFound;
}

/**
 * Test enhanced node creation
 */
function testEnhancedNodes() {
  console.log('🧪 Testing Enhanced Node Creation...');
  
  const enhancedNodes = createEnhancedNodeCollection(sampleTabTree);
  
  console.log(`  Created ${enhancedNodes.size} enhanced nodes:`);
  enhancedNodes.forEach((node, id) => {
    console.log(`    ${id}: ${node.title} (domain: ${node.domain})`);
    console.log(`      - Cluster data: ${node.clusterData ? 'present' : 'missing'}`);
    console.log(`      - Global position: ${node.globalPosition ? 'present' : 'missing'}`);
    console.log(`      - Metadata: ${node.metadata ? 'present' : 'missing'}`);
  });

  // Validate that all nodes have required properties
  let allNodesValid = true;
  enhancedNodes.forEach((node, id) => {
    const requiredProps = ['domain', 'domainColor', 'clusterData', 'globalPosition', 'metadata'];
    requiredProps.forEach(prop => {
      if (!node[prop]) {
        console.log(`  ❌ Node ${id} missing property: ${prop}`);
        allNodesValid = false;
      }
    });
  });

  if (allNodesValid) {
    console.log('  ✅ All nodes have required properties');
  }

  console.log('');
  return allNodesValid;
}

/**
 * Test domain statistics calculation
 */
function testDomainStats() {
  console.log('🧪 Testing Domain Statistics...');
  
  const domainGroups = groupNodesByDomain(sampleTabTree);
  const stats = calculateDomainStats(domainGroups);
  
  console.log(`  Domain Statistics:`);
  console.log(`    Total domains: ${stats.totalDomains}`);
  console.log(`    Total nodes: ${stats.totalNodes}`);
  console.log(`    Average nodes per domain: ${stats.averageNodesPerDomain.toFixed(2)}`);
  console.log(`    Largest domain: ${stats.largestDomain?.domain} (${stats.largestDomain?.nodeCount} nodes)`);
  console.log(`    Smallest domain: ${stats.smallestDomain?.domain} (${stats.smallestDomain?.nodeCount} nodes)`);
  
  console.log(`    Domain distribution:`);
  stats.domainDistribution.forEach(item => {
    console.log(`      ${item.domain}: ${item.nodeCount} nodes (${item.percentage.toFixed(1)}%)`);
  });

  // Validate statistics
  const expectedTotalNodes = 6; // Based on sample data
  const statsValid = stats.totalNodes === expectedTotalNodes;
  
  if (statsValid) {
    console.log('  ✅ Statistics calculation correct');
  } else {
    console.log(`  ❌ Expected ${expectedTotalNodes} total nodes, got ${stats.totalNodes}`);
  }

  console.log('');
  return statsValid;
}

/**
 * Test connection pattern analysis
 */
function testConnectionAnalysis() {
  console.log('🧪 Testing Connection Pattern Analysis...');
  
  const domainGroups = groupNodesByDomain(sampleTabTree);
  const connections = buildDomainConnections(domainGroups);
  const analysis = analyzeConnectionPatterns(connections, domainGroups);
  
  console.log(`  Connection Analysis:`);
  console.log(`    Total connections: ${analysis.totalConnections}`);
  console.log(`    Bidirectional connections: ${analysis.bidirectionalConnections}`);
  console.log(`    Strong connections: ${analysis.strongConnections}`);
  console.log(`    Weak connections: ${analysis.weakConnections}`);
  console.log(`    Hub domains: ${analysis.hubDomains.length}`);
  console.log(`    Sink domains: ${analysis.sinkDomains.length}`);
  console.log(`    Isolated domains: ${analysis.isolatedDomains.length}`);

  if (analysis.hubDomains.length > 0) {
    console.log(`    Top hub domains:`);
    analysis.hubDomains.slice(0, 3).forEach(hub => {
      console.log(`      ${hub.domain}: ${hub.outgoingConnections} outgoing`);
    });
  }

  const analysisValid = analysis.totalConnections > 0;
  console.log(`  ${analysisValid ? '✅' : '❌'} Analysis completed`);
  
  console.log('');
  return analysisValid;
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🚀 Running Domain Clustering Data Structure Tests\n');
  
  const tests = [
    { name: 'Domain Extraction', fn: testDomainExtraction },
    { name: 'Domain Grouping', fn: testDomainGrouping },
    { name: 'Connection Mapping', fn: testConnectionMapping },
    { name: 'Enhanced Nodes', fn: testEnhancedNodes },
    { name: 'Domain Statistics', fn: testDomainStats },
    { name: 'Connection Analysis', fn: testConnectionAnalysis }
  ];

  let passed = 0;
  tests.forEach(test => {
    try {
      const result = test.fn();
      if (result) passed++;
    } catch (error) {
      console.log(`  ❌ Test ${test.name} failed with error:`, error.message);
    }
  });

  console.log(`\n📊 Test Results: ${passed}/${tests.length} test suites passed`);
  
  if (passed === tests.length) {
    console.log('🎉 All tests passed! Data structures are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  return passed === tests.length;
}

// Export for use in other modules
export { runAllTests, sampleTabTree };

// Run tests if this file is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

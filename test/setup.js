// =============================================================================
// Test Setup - Global test configuration and mocks
// =============================================================================

import { vi } from 'vitest';

// Mock Chrome Extension APIs
global.chrome = {
  runtime: {
    connect: vi.fn(() => ({
      postMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      onDisconnect: {
        addListener: vi.fn()
      }
    })),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    getURL: vi.fn(path => `chrome-extension://test/${path}`),
    id: 'test-extension-id'
  },
  
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    onCreated: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  }
};

// Mock D3.js for tests that don't need full D3 functionality
global.d3 = {
  select: vi.fn(() => ({
    append: vi.fn(() => global.d3.select()),
    attr: vi.fn(() => global.d3.select()),
    style: vi.fn(() => global.d3.select()),
    text: vi.fn(() => global.d3.select()),
    on: vi.fn(() => global.d3.select()),
    call: vi.fn(() => global.d3.select()),
    selectAll: vi.fn(() => global.d3.select()),
    data: vi.fn(() => global.d3.select()),
    enter: vi.fn(() => global.d3.select()),
    exit: vi.fn(() => global.d3.select()),
    merge: vi.fn(() => global.d3.select()),
    remove: vi.fn(() => global.d3.select()),
    transition: vi.fn(() => global.d3.select()),
    duration: vi.fn(() => global.d3.select()),
    node: vi.fn(() => ({ getBBox: () => ({ width: 100, height: 20 }) }))
  })),
  
  tree: vi.fn(() => ({
    size: vi.fn(() => global.d3.tree()),
    separation: vi.fn(() => global.d3.tree())
  })),
  
  forceSimulation: vi.fn(() => ({
    force: vi.fn(() => global.d3.forceSimulation()),
    on: vi.fn(() => global.d3.forceSimulation()),
    alpha: vi.fn(() => global.d3.forceSimulation()),
    restart: vi.fn(() => global.d3.forceSimulation()),
    stop: vi.fn(() => global.d3.forceSimulation()),
    alphaTarget: vi.fn(() => global.d3.forceSimulation()),
    nodes: vi.fn(() => global.d3.forceSimulation())
  })),
  
  forceLink: vi.fn(() => ({
    id: vi.fn(() => global.d3.forceLink()),
    strength: vi.fn(() => global.d3.forceLink()),
    distance: vi.fn(() => global.d3.forceLink()),
    links: vi.fn(() => global.d3.forceLink())
  })),
  
  forceManyBody: vi.fn(() => ({
    strength: vi.fn(() => global.d3.forceManyBody())
  })),
  
  forceCenter: vi.fn(() => ({
    strength: vi.fn(() => global.d3.forceCenter())
  })),
  
  forceCollide: vi.fn(() => ({
    radius: vi.fn(() => global.d3.forceCollide())
  })),
  
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn(() => global.d3.zoom()),
    on: vi.fn(() => global.d3.zoom()),
    transform: vi.fn()
  })),
  
  zoomIdentity: {
    translate: vi.fn(() => global.d3.zoomIdentity),
    scale: vi.fn(() => global.d3.zoomIdentity),
    x: 0,
    y: 0,
    k: 1
  },
  
  drag: vi.fn(() => ({
    on: vi.fn(() => global.d3.drag())
  })),
  
  line: vi.fn(() => ({
    x: vi.fn(() => global.d3.line()),
    y: vi.fn(() => global.d3.line()),
    curve: vi.fn(() => global.d3.line())
  })),
  
  curveCardinalClosed: {
    tension: vi.fn(() => ({}))
  },
  
  mean: vi.fn(arr => arr.reduce((a, b) => a + b, 0) / arr.length)
};

// Mock DOM APIs that might be missing in jsdom
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock URL constructor for older Node versions
if (!global.URL) {
  global.URL = class URL {
    constructor(url) {
      const match = url.match(/^https?:\/\/([^\/]+)/);
      this.hostname = match ? match[1] : 'localhost';
      this.protocol = url.startsWith('https') ? 'https:' : 'http:';
    }
  };
}

// Console setup for tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless explicitly needed
  log: vi.fn(),
  warn: vi.fn(),
  error: originalConsole.error // Keep errors visible
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

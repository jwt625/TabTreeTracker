// =============================================================================
// TabTreeTracker Constants
// =============================================================================

// Timing Constants
export const TIMING = {
  DUPLICATE_NODE_THRESHOLD: 1000, // ms - threshold for detecting duplicate nodes
  TRACKING_CHECK_INTERVAL: 60000, // ms - interval for tracking state checks
  STORAGE_DEBOUNCE_DELAY: 500, // ms - delay for batching storage operations
  CONTENT_ANALYSIS_DEBOUNCE: 1000, // ms - delay for content analysis
  TRANSITION_DURATION: 750, // ms - D3 transition duration
  POPUP_RETRY_DELAY_BASE: 100 // ms - base delay for exponential backoff
};

// Size and Layout Constants
export const LAYOUT = {
  DEFAULT_NODE_SIZE: 20,
  MIN_NODE_SIZE: 2,
  MAX_NODE_SIZE: 60,
  NODE_SIZE_STEP: 2,
  TREE_MARGIN: { top: 50, right: 50, bottom: 50, left: 50 },
  MAX_LINE_LENGTH: 20,
  MAX_LINES: 2,
  ZOOM_SCALE_EXTENT: [0.01, 30],
  NODE_SEPARATION_FACTOR: 1.5,
  DIFFERENT_PARENT_SEPARATION: 2
};

// Data Management Constants
export const DATA = {
  DEFAULT_RETENTION_DAYS: 30,
  MAX_TREE_SIZE: 10000, // maximum number of nodes
  MAX_CONTENT_ANALYSIS_LENGTH: 5000, // characters
  TOP_WORDS_COUNT: 5,
  MAX_RETRY_ATTEMPTS: 3,
  STORAGE_QUOTA_WARNING_THRESHOLD: 0.8 // 80% of quota
};

// UI Constants
export const UI = {
  POPUP_WIDTH: 400,
  TREE_CONTAINER_HEIGHT_OFFSET: 80,
  DETAILS_PANEL_MAX_WIDTH: 300,
  WORD_STATS_GRID_GAP: '4px 8px',
  ERROR_DISPLAY_DURATION: 5000 // ms
};

// Default Configuration
export const DEFAULT_CONFIG = {
  excludedDomains: [
    'mendeley.com',
    'google.com',
    'chrome://',
    'chrome-extension://',
    'chrome://newtab/'
  ],
  userTimeZone: 'UTC',
  isTracking: false,
  enableContentAnalysis: false, // opt-in for privacy
  enableDataEncryption: false,
  dataRetentionDays: DATA.DEFAULT_RETENTION_DAYS,
  maxTreeSize: DATA.MAX_TREE_SIZE
};

// Error Messages
export const ERROR_MESSAGES = {
  INITIALIZATION_FAILED: 'Failed to initialize extension',
  TREE_LOAD_FAILED: 'Failed to load tab tree data',
  TRACKING_TOGGLE_FAILED: 'Failed to toggle tracking',
  SAVE_FAILED: 'Failed to save tree data',
  CLEAR_FAILED: 'Failed to clear tree data',
  CONFIG_UPDATE_FAILED: 'Failed to update configuration',
  TIMEZONE_UPDATE_FAILED: 'Failed to update timezone',
  CONTENT_ANALYSIS_FAILED: 'Content analysis failed',
  VIEWER_INIT_FAILED: 'Failed to initialize viewer',
  INVALID_TREE_DATA: 'Invalid or missing tree data',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded',
  PERMISSION_DENIED: 'Permission denied',
  TAB_ID_NOT_FOUND: 'Failed to get tab ID',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ACTION: 'Unknown action requested'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  TRACKING_ENABLED: 'Tracking enabled successfully',
  TRACKING_DISABLED: 'Tracking disabled successfully',
  TREE_SAVED: 'Tree data saved successfully',
  TREE_CLEARED: 'Tree data cleared successfully',
  CONFIG_UPDATED: 'Configuration updated successfully',
  DATA_IMPORTED: 'Data imported successfully',
  DATA_EXPORTED: 'Data exported successfully'
};

// Storage Keys
export const STORAGE_KEYS = {
  TAB_TREE: 'tabTree',
  CONFIG: 'config',
  USER_TIMEZONE: 'userTimeZone',
  IS_TRACKING: 'isTracking',
  LAST_CLEANUP: 'lastCleanup',
  ENCRYPTION_KEY: 'encryptionKey',
  USER_PREFERENCES: 'userPreferences'
};

// Chrome Extension Specific
export const CHROME = {
  VIEWER_URL_PATH: 'viewer/viewer.html',
  OPTIONS_URL_PATH: 'options.html',
  POPUP_URL_PATH: 'popup/popup.html',
  CONTENT_SCRIPT_TIMEOUT: 5000, // ms
  MESSAGE_TIMEOUT: 10000 // ms
};

// Keyboard Shortcuts
export const KEYBOARD = {
  TOGGLE_TEXT: 'KeyT',
  ZOOM_IN: 'Equal', // + key
  ZOOM_OUT: 'Minus', // - key
  RESET_ZOOM: 'Digit0',
  TOGGLE_LAYOUT: 'KeyL',
  SAVE_TREE: 'KeyS',
  CLEAR_TREE: 'KeyC'
};

// Content Analysis
export const CONTENT_ANALYSIS = {
  MIN_WORD_LENGTH: 3,
  MAX_WORD_LENGTH: 50,
  STOP_WORDS: new Set([
    // Articles and basic prepositions
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'of', 'off',
    
    // Pronouns and their variants
    'i', 'me', 'my', 'mine', 'myself',
    'you', 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself',
    'it', 'its', 'itself',
    'we', 'us', 'our', 'ours', 'ourselves',
    'they', 'them', 'their', 'theirs', 'themselves',
    'this', 'that', 'these', 'those',
    'who', 'whom', 'whose', 'which', 'what',
    
    // Verbs and verb forms
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'would', 'should', 'could', 'might', 'must', 'can', 'will',
    'shall', 'may', 'ought',
    
    // Common words
    'just', 'very', 'quite', 'rather', 'somewhat',
    'more', 'most', 'much', 'many', 'some', 'few', 'all', 'any', 'enough',
    'such', 'same', 'different', 'other', 'another', 'each', 'every', 'either',
    'neither', 'several', 'both', 'else',
    'here', 'there', 'where', 'when', 'why', 'how',
    'again', 'ever', 'never', 'always', 'sometimes', 'often', 'usually',
    'already', 'still', 'now', 'then', 'once', 'twice',
    'only', 'even', 'also', 'too', 'instead', 'rather',
    'like', 'well', 'back', 'still', 'yet', 'else', 'further',
    'since', 'while', 'whether', 'though', 'although', 'unless',
    'however', 'moreover', 'therefore', 'hence', 'furthermore',
    'otherwise', 'nevertheless', 'meanwhile', 'afterward', 'afterwards',
    'yes', 'no', 'not', 'nor', 'none', 'nothing', 'nobody',
    'anywhere', 'everywhere', 'somewhere', 'nowhere',
    'among', 'beside', 'besides', 'beyond', 'within', 'without'
  ])
};

// Validation Patterns
export const VALIDATION = {
  DOMAIN_PATTERN: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  URL_PATTERN: /^https?:\/\/.+/,
  TIMEZONE_PATTERN: /^[A-Za-z_]+\/[A-Za-z_]+$/,
  NODE_ID_PATTERN: /^\d+-\d+$/
};

// Performance Monitoring
export const PERFORMANCE = {
  SLOW_OPERATION_THRESHOLD: 1000, // ms
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  LARGE_TREE_THRESHOLD: 1000, // nodes
  RENDER_BATCH_SIZE: 100 // nodes to render at once
};

// Feature Flags
export const FEATURES = {
  ENABLE_CONTENT_ANALYSIS: true,
  ENABLE_WORD_FREQUENCY: true,
  ENABLE_TREE_SEARCH: false, // TODO: implement
  ENABLE_NODE_HIDING: false, // TODO: implement
  ENABLE_AXIS_ZOOM: false, // TODO: implement
  ENABLE_DATA_ENCRYPTION: false, // TODO: implement
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_DEBUG_LOGGING: false
};

// Development/Debug Constants
export const DEBUG = {
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_PERFORMANCE_LOGS: false,
  MOCK_CHROME_APIS: false // for testing
};
